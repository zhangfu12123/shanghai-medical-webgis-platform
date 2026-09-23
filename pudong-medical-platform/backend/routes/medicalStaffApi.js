const express = require('express')
const router = express.Router()
const crypto = require('crypto')
const { getPool, sql } = require('../db/db')

/**
 * 医疗人员查询 / 排班 / 预约 / 账号 / 额度 / 留言 后端接口
 * 挂载前缀建议：app.use('/api/staff', require('./routes/medicalStaffApi'))
 */

// ============ 工具函数 ============
const DEFAULT_QUOTA = 5
const TIME_SLOTS = ['上午 08:30-11:30', '下午 13:30-16:30', '全天 08:00-16:30']

function hashPassword(password, salt) {
  return crypto.createHash('sha256').update(String(salt) + String(password)).digest('hex')
}
function randomSalt() {
  return crypto.randomBytes(16).toString('hex')
}

function isPastDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) return false
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return date < today
}

function isPastTimeSlot(date, slot) {
  if (!date || date !== getTodayString()) return false
  const endMinutes = String(slot || '').includes('上午') ? 11 * 60 + 30 : 16 * 60 + 30
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes() >= endMinutes
}

function getTodayString() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

// 把数据库层错误转成对用户友好的提示（尤其是指引先执行升级脚本建表）
function friendlyDbError(prefix, err) {
  const m = String((err && err.message) || err || '')
  if (/user_account|doctor_slot_config|Invalid object|invalid object/i.test(m)) {
    return prefix + '失败：相关数据表尚未创建，请先执行 staff_upgrade.sql 升级数据库表结构'
  }
  return prefix + '失败：' + m
}

// 获取医生某时段的额度（无配置则用默认值）
async function getSlotQuota(doctorId, slot) {
  const pool = getPool()
  const reqDb = pool.request()
  reqDb.input('doctor_id', sql.Int, doctorId)
  reqDb.input('slot', sql.NVarChar(50), slot)
  const rs = await reqDb.query(
    'SELECT quota FROM dbo.doctor_slot_config WHERE doctor_id = @doctor_id AND slot = @slot'
  )
  if (rs.recordset.length > 0 && rs.recordset[0].quota != null) {
    return parseInt(rs.recordset[0].quota)
  }
  return DEFAULT_QUOTA
}

// 统计某医生某日期某时段已预约（未取消）数量
async function countBooked(doctorId, date, slot, excludeId = null) {
  const pool = getPool()
  const reqDb = pool.request()
  reqDb.input('doctor_id', sql.Int, doctorId)
  reqDb.input('date', sql.NVarChar(20), date)
  reqDb.input('slot', sql.NVarChar(50), slot)
  let extra = ''
  if (excludeId) {
    reqDb.input('exclude_id', sql.Int, excludeId)
    extra = ' AND id <> @exclude_id'
  }
  const rs = await reqDb.query(`
    SELECT COUNT(*) AS cnt FROM dbo.appointment
    WHERE doctor_id = @doctor_id AND appoint_date = @date
      AND time_slot = @slot AND status <> N'已取消'${extra}
  `)
  return parseInt(rs.recordset[0].cnt)
}

// ============ 医院 / 医生 ============

// 医院列表
router.get('/hospitals', async (req, res) => {
  try {
    const pool = getPool()
    const rs = await pool.request().query('SELECT * FROM dbo.hospital ORDER BY id')
    res.json({ code: 200, data: rs.recordset })
  } catch (err) {
    console.error('【查询医院异常】', err)
    res.json({ code: 500, msg: '查询医院失败', error: err.message })
  }
})

// 下拉选项（医院 + 科室）
router.get('/options', async (req, res) => {
  try {
    const pool = getPool()
    const hospitals = await pool.request().query('SELECT id AS value, name AS label, level FROM dbo.hospital ORDER BY id')
    const departments = await pool.request().query('SELECT DISTINCT department AS value, department AS label FROM dbo.doctor ORDER BY department')
    res.json({ code: 200, data: { hospitals: hospitals.recordset, departments: departments.recordset } })
  } catch (err) {
    console.error('【查询选项异常】', err)
    res.json({ code: 500, msg: '查询选项失败', error: err.message })
  }
})

// 医生列表（模糊搜索 + 医院 + 科室筛选）
router.get('/doctors', async (req, res) => {
  try {
    const { keyword, hospitalId, department } = req.query
    const pool = getPool()
    const reqDb = pool.request()
    reqDb.input('keyword', sql.NVarChar(100), keyword || null)
    reqDb.input('hospitalId', sql.Int, hospitalId ? parseInt(hospitalId) : null)
    reqDb.input('department', sql.NVarChar(50), department || null)
    const rs = await reqDb.query(`
      SELECT * FROM dbo.doctor
      WHERE (@keyword IS NULL OR name LIKE '%' + @keyword + '%'
             OR department LIKE '%' + @keyword + '%'
             OR specialty LIKE '%' + @keyword + '%'
             OR hospital_name LIKE '%' + @keyword + '%')
        AND (@hospitalId IS NULL OR hospital_id = @hospitalId)
        AND (@department IS NULL OR department = @department)
      ORDER BY hospital_id, department, title
    `)
    res.json({ code: 200, data: rs.recordset })
  } catch (err) {
    console.error('【查询医生异常】', err)
    res.json({ code: 500, msg: '查询医生失败', error: err.message })
  }
})

// 医生详情
router.get('/doctor/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const pool = getPool()
    const reqDb = pool.request()
    reqDb.input('id', sql.Int, id)
    const rs = await reqDb.query('SELECT * FROM dbo.doctor WHERE id = @id')
    res.json({ code: 200, data: rs.recordset[0] || null })
  } catch (err) {
    console.error('【查询医生详情异常】', err)
    res.json({ code: 500, msg: '查询医生详情失败', error: err.message })
  }
})

// 医院排班（该院全体医生的出诊时间）
router.get('/schedule/:hospitalId', async (req, res) => {
  try {
    const hospitalId = parseInt(req.params.hospitalId)
    const pool = getPool()
    const reqDb = pool.request()
    reqDb.input('hospitalId', sql.Int, hospitalId)
    const rs = await reqDb.query(`
      SELECT id, name, gender, department, title, specialty, out_time
      FROM dbo.doctor WHERE hospital_id = @hospitalId
      ORDER BY department, title
    `)
    res.json({ code: 200, data: rs.recordset })
  } catch (err) {
    console.error('【查询排班异常】', err)
    res.json({ code: 500, msg: '查询排班失败', error: err.message })
  }
})

// ============ 预约（含额度校验） ============

// 提交预约（按每天每时段额度校验，超出额度则拒绝）
router.post('/appoint', async (req, res) => {
  try {
    const {
      doctor_id, doctor_name, hospital_id, hospital_name, department,
      patient_name, patient_gender, patient_age, patient_phone,
      appoint_date, time_slot, remark
    } = req.body
    if (!doctor_id || !patient_name || !patient_phone) {
      return res.json({ code: 500, msg: '参数不全：医生、姓名、手机号必填' })
    }
    if (isPastDate(appoint_date)) {
      return res.json({ code: 400, msg: '预约日期只能选择今天或今后的时间' })
    }
    if (isPastTimeSlot(appoint_date, time_slot)) {
      return res.json({ code: 400, msg: '所选时间段已结束，请选择其他时间段' })
    }
    const pool = getPool()

    // 额度校验：同医生 + 同日期 + 同时段，已约满则拒绝
    if (appoint_date && time_slot) {
      const quota = await getSlotQuota(doctor_id, time_slot)
      const booked = await countBooked(doctor_id, appoint_date, time_slot)
      if (booked >= quota) {
        return res.json({ code: 500, msg: `该医生在所选日期该时间段预约已满，请更换时间段` })
      }
    }

    const reqDb = pool.request()
    reqDb.input('doctor_id', sql.Int, doctor_id)
    reqDb.input('doctor_name', sql.NVarChar(50), doctor_name || '')
    reqDb.input('hospital_id', sql.Int, hospital_id || null)
    reqDb.input('hospital_name', sql.NVarChar(100), hospital_name || '')
    reqDb.input('department', sql.NVarChar(50), department || '')
    reqDb.input('patient_name', sql.NVarChar(50), patient_name)
    reqDb.input('patient_gender', sql.NVarChar(10), patient_gender || '')
    reqDb.input('patient_age', sql.Int, patient_age || null)
    reqDb.input('patient_phone', sql.NVarChar(20), patient_phone)
    reqDb.input('appoint_date', sql.NVarChar(20), appoint_date || '')
    reqDb.input('time_slot', sql.NVarChar(50), time_slot || '')
    reqDb.input('remark', sql.NVarChar(300), remark || '')
    await reqDb.query(`
      INSERT INTO dbo.appointment
        (doctor_id, doctor_name, hospital_id, hospital_name, department,
         patient_name, patient_gender, patient_age, patient_phone,
         appoint_date, time_slot, remark, status, created_at)
      VALUES
        (@doctor_id, @doctor_name, @hospital_id, @hospital_name, @department,
         @patient_name, @patient_gender, @patient_age, @patient_phone,
         @appoint_date, @time_slot, @remark, N'已预约', GETDATE())
    `)
    res.json({ code: 200, msg: '预约提交成功' })
  } catch (err) {
    console.error('【提交预约异常】', err)
    res.json({ code: 500, msg: '提交预约失败', error: err.message })
  }
})

// 实时校验：某医生某日期某时间段是否已约满（返回额度与剩余名额）
router.get('/appoint/check', async (req, res) => {
  try {
    const { doctor_id, date, slot } = req.query
    if (!doctor_id || !date || !slot) {
      return res.json({ code: 200, data: { busy: false } })
    }
    const did = parseInt(doctor_id)
    const quota = await getSlotQuota(did, slot)
    const booked = await countBooked(did, date, slot)
    const remaining = Math.max(0, quota - booked)
    res.json({ code: 200, data: { busy: booked >= quota, quota, booked, remaining } })
  } catch (err) {
    console.error('【校验预约占用异常】', err)
    res.json({ code: 500, msg: '校验失败', error: err.message })
  }
})

// 我的预约（按手机号查询）
router.get('/appointments', async (req, res) => {
  try {
    const { phone } = req.query
    if (!phone) return res.json({ code: 400, msg: '请输入手机号查询预约' })
    const pool = getPool()
    const reqDb = pool.request()
    reqDb.input('phone', sql.NVarChar(20), phone)
    const rs = await reqDb.query('SELECT * FROM dbo.appointment WHERE patient_phone = @phone ORDER BY id DESC')
    res.json({ code: 200, data: rs.recordset })
  } catch (err) {
    console.error('【查询预约异常】', err)
    res.json({ code: 500, msg: '查询预约失败', error: err.message })
  }
})

// 医生查看预约自己的患者
router.get('/appointments/doctor', async (req, res) => {
  try {
    const { doctor_id } = req.query
    if (!doctor_id) return res.json({ code: 400, msg: '缺少医生ID' })
    const pool = getPool()
    const reqDb = pool.request()
    reqDb.input('doctor_id', sql.Int, parseInt(doctor_id))
    const rs = await reqDb.query(
      'SELECT * FROM dbo.appointment WHERE doctor_id = @doctor_id ORDER BY appoint_date DESC, id DESC'
    )
    res.json({ code: 200, data: rs.recordset })
  } catch (err) {
    console.error('【查询医生预约异常】', err)
    res.json({ code: 500, msg: '查询预约失败', error: err.message })
  }
})

// 编辑预约（额度校验，排除自身记录 + 权限校验）
router.post('/appointment/edit', async (req, res) => {
  try {
    const id = parseInt(req.body.id)
    const login_phone = req.body.login_phone || ''
    const {
      patient_name, patient_gender, patient_age, patient_phone,
      appoint_date, time_slot, remark, doctor_id, doctor_name, hospital_name, department
    } = req.body
    if (!id) return res.json({ code: 400, msg: '缺少id参数' })
    if (!login_phone) return res.json({ code: 403, msg: '请先登录后再操作' })
    const pool = getPool()

    // 权限校验：登录手机号必须与预约手机号一致
    const chkDb = pool.request()
    chkDb.input('id', sql.Int, id)
    const chkRs = await chkDb.query('SELECT patient_phone FROM dbo.appointment WHERE id = @id')
    if (chkRs.recordset.length === 0) {
      return res.json({ code: 404, msg: '预约记录不存在' })
    }
    if (chkRs.recordset[0].patient_phone !== login_phone) {
      return res.json({ code: 403, msg: '无权操作：只能编辑本人预约' })
    }
    if (isPastDate(appoint_date)) {
      return res.json({ code: 400, msg: '预约日期只能选择今天或今后的时间' })
    }
    if (isPastTimeSlot(appoint_date, time_slot)) {
      return res.json({ code: 400, msg: '所选时间段已结束，请选择其他时间段' })
    }

    // 额度校验：排除当前这条记录自身
    if (appoint_date && time_slot && doctor_id) {
      const quota = await getSlotQuota(doctor_id, time_slot)
      const booked = await countBooked(doctor_id, appoint_date, time_slot, id)
      if (booked >= quota) {
        return res.json({ code: 500, msg: `该医生在所选日期该时间段预约已满（额度 ${quota}），请更换时间段` })
      }
    }

    const reqDb = pool.request()
    reqDb.input('id', sql.Int, id)
    reqDb.input('patient_name', sql.NVarChar(50), patient_name)
    reqDb.input('patient_gender', sql.NVarChar(10), patient_gender || '')
    reqDb.input('patient_age', sql.Int, patient_age || null)
    reqDb.input('patient_phone', sql.NVarChar(20), patient_phone)
    reqDb.input('appoint_date', sql.NVarChar(20), appoint_date || '')
    reqDb.input('time_slot', sql.NVarChar(50), time_slot || '')
    reqDb.input('remark', sql.NVarChar(300), remark || '')
    reqDb.input('doctor_id', sql.Int, doctor_id)
    reqDb.input('doctor_name', sql.NVarChar(50), doctor_name || '')
    reqDb.input('hospital_name', sql.NVarChar(100), hospital_name || '')
    reqDb.input('department', sql.NVarChar(50), department || '')
    await reqDb.query(`
      UPDATE dbo.appointment SET
        patient_name = @patient_name, patient_gender = @patient_gender, patient_age = @patient_age,
        patient_phone = @patient_phone, appoint_date = @appoint_date, time_slot = @time_slot,
        doctor_id = @doctor_id, doctor_name = @doctor_name, hospital_name = @hospital_name,
        department = @department, remark = @remark
      WHERE id = @id
    `)
    res.json({ code: 200, msg: '预约修改成功' })
  } catch (err) {
    console.error('【编辑预约异常】', err)
    res.json({ code: 500, msg: '编辑预约失败', error: err.message })
  }
})

// 删除预约（权限校验）
router.post('/appointment/delete', async (req, res) => {
  try {
    const id = parseInt(req.body.id)
    const login_phone = req.body.login_phone || ''
    if (!id) return res.json({ code: 400, msg: '缺少id参数' })
    if (!login_phone) return res.json({ code: 403, msg: '请先登录后再操作' })
    const pool = getPool()

    // 权限校验：登录手机号必须与预约手机号一致
    const chkDb = pool.request()
    chkDb.input('id', sql.Int, id)
    const chkRs = await chkDb.query('SELECT patient_phone FROM dbo.appointment WHERE id = @id')
    if (chkRs.recordset.length === 0) {
      return res.json({ code: 404, msg: '预约记录不存在' })
    }
    if (chkRs.recordset[0].patient_phone !== login_phone) {
      return res.json({ code: 403, msg: '无权操作：只能删除本人预约' })
    }

    const reqDb = pool.request()
    reqDb.input('id', sql.Int, id)
    await reqDb.query('DELETE FROM dbo.appointment WHERE id = @id')
    res.json({ code: 200, msg: '删除成功' })
  } catch (err) {
    console.error('【删除预约异常】', err)
    res.json({ code: 500, msg: '删除预约失败', error: err.message })
  }
})

// ============ 账号体系 ============

// 注册
router.post('/register', async (req, res) => {
  try {
    const { phone, password, real_name, role, doctor_id } = req.body
    if (!phone || !password) {
      return res.json({ code: 400, msg: '手机号与密码必填' })
    }
    const r = role === 'doctor' ? 'doctor' : 'patient'
    const did = (r === 'doctor' && doctor_id) ? parseInt(doctor_id) : null
    if (r === 'doctor' && !did) {
      return res.json({ code: 400, msg: '医生注册需选择对应的医生信息' })
    }
    const pool = getPool()

    // 查重
    const dupDb = pool.request()
    dupDb.input('phone', sql.NVarChar(20), phone)
    const dup = await dupDb.query('SELECT TOP 1 id FROM dbo.user_account WHERE phone = @phone')
    if (dup.recordset.length > 0) {
      return res.json({ code: 500, msg: '该手机号已注册，请直接登录' })
    }

    const salt = randomSalt()
    const pwdHash = hashPassword(password, salt)
    const reqDb = pool.request()
    reqDb.input('phone', sql.NVarChar(20), phone)
    reqDb.input('password_hash', sql.NVarChar(128), pwdHash)
    reqDb.input('salt', sql.NVarChar(64), salt)
    reqDb.input('real_name', sql.NVarChar(50), real_name || '')
    reqDb.input('role', sql.NVarChar(10), r)
    reqDb.input('doctor_id', sql.Int, did)
    await reqDb.query(`
      INSERT INTO dbo.user_account (phone, password_hash, salt, real_name, role, doctor_id)
      VALUES (@phone, @password_hash, @salt, @real_name, @role, @doctor_id)
    `)
    res.json({ code: 200, msg: '注册成功' })
  } catch (err) {
    console.error('【注册异常】', err)
    res.json({ code: 500, msg: friendlyDbError('注册', err), error: err.message })
  }
})

// 登录
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body
    if (!phone || !password) {
      return res.json({ code: 400, msg: '请输入手机号与密码' })
    }
    const pool = getPool()
    const reqDb = pool.request()
    reqDb.input('phone', sql.NVarChar(20), phone)
    const rs = await reqDb.query('SELECT * FROM dbo.user_account WHERE phone = @phone')
    if (rs.recordset.length === 0) {
      return res.json({ code: 500, msg: '该手机号尚未注册' })
    }
    const u = rs.recordset[0]
    if (u.password_hash !== hashPassword(password, u.salt)) {
      return res.json({ code: 500, msg: '密码错误' })
    }
    res.json({
      code: 200,
      msg: '登录成功',
      data: { id: u.id, phone: u.phone, real_name: u.real_name, role: u.role, doctor_id: u.doctor_id }
    })
  } catch (err) {
    console.error('【登录异常】', err)
    res.json({ code: 500, msg: friendlyDbError('登录', err), error: err.message })
  }
})

// ============ 医生额度配置 ============

// 查询医生各时段额度
router.get('/slot-config/:doctorId', async (req, res) => {
  try {
    const doctorId = parseInt(req.params.doctorId)
    const pool = getPool()
    const reqDb = pool.request()
    reqDb.input('doctor_id', sql.Int, doctorId)
    const rs = await reqDb.query('SELECT slot, quota FROM dbo.doctor_slot_config WHERE doctor_id = @doctor_id')
    const map = {}
    rs.recordset.forEach(row => { map[row.slot] = parseInt(row.quota) })
    const data = TIME_SLOTS.map(s => ({ slot: s, quota: (map[s] != null ? map[s] : DEFAULT_QUOTA) }))
    res.json({ code: 200, data })
  } catch (err) {
    console.error('【查询额度异常】', err)
    res.json({ code: 500, msg: '查询额度失败', error: err.message })
  }
})

// 保存医生各时段额度（批量 upsert）
router.post('/slot-config', async (req, res) => {
  try {
    const { doctor_id, configs } = req.body
    if (!doctor_id || !Array.isArray(configs)) {
      return res.json({ code: 400, msg: '参数不全' })
    }
    const did = parseInt(doctor_id)
    const pool = getPool()
    for (const c of configs) {
      const slotName = String(c.slot || '')
      const quota = Math.max(0, parseInt(c.quota) || 0)
      if (!slotName) continue
      const reqDb = pool.request()
      reqDb.input('doctor_id', sql.Int, did)
      reqDb.input('slot', sql.NVarChar(50), slotName)
      reqDb.input('quota', sql.Int, quota)
      await reqDb.query(`
        MERGE dbo.doctor_slot_config AS t
        USING (SELECT @doctor_id AS doctor_id, @slot AS slot, @quota AS quota) AS s
        ON (t.doctor_id = s.doctor_id AND t.slot = s.slot)
        WHEN MATCHED THEN UPDATE SET quota = s.quota, updated_at = GETDATE()
        WHEN NOT MATCHED THEN INSERT (doctor_id, slot, quota) VALUES (s.doctor_id, s.slot, s.quota);
      `)
    }
    res.json({ code: 200, msg: '额度已更新' })
  } catch (err) {
    console.error('【保存额度异常】', err)
    res.json({ code: 500, msg: '保存额度失败', error: err.message })
  }
})

// ============ 医生留言 ============

// 医生给某条预约留言
router.post('/appointment/msg', async (req, res) => {
  try {
    const id = parseInt(req.body.id)
    const doctor_msg = req.body.doctor_msg != null ? String(req.body.doctor_msg) : ''
    if (!id) return res.json({ code: 400, msg: '缺少id参数' })
    const pool = getPool()
    const reqDb = pool.request()
    reqDb.input('id', sql.Int, id)
    reqDb.input('doctor_msg', sql.NVarChar(500), doctor_msg)
    await reqDb.query(
      'UPDATE dbo.appointment SET doctor_msg = @doctor_msg, msg_time = GETDATE() WHERE id = @id'
    )
    res.json({ code: 200, msg: '留言成功' })
  } catch (err) {
    console.error('【留言异常】', err)
    res.json({ code: 500, msg: '留言失败', error: err.message })
  }
})

// 医生删除某条预约的留言（清空后患者端不再显示）
router.post('/appointment/msg-delete', async (req, res) => {
  try {
    const id = parseInt(req.body.id)
    if (!id) return res.json({ code: 400, msg: '缺少id参数' })
    const pool = getPool()
    const reqDb = pool.request()
    reqDb.input('id', sql.Int, id)
    await reqDb.query(
      'UPDATE dbo.appointment SET doctor_msg = NULL, msg_time = NULL WHERE id = @id'
    )
    res.json({ code: 200, msg: '留言已删除' })
  } catch (err) {
    console.error('【删除留言异常】', err)
    res.json({ code: 500, msg: '删除留言失败', error: err.message })
  }
})

module.exports = router