const express = require('express')
const router = express.Router()
const { getPool, sql } = require('../db/db')

/**
 * 健康管理 后端接口
 * 挂载前缀：app.use('/api/health', require('./routes/healthApi'))
 */

// 档案列表 / 或按手机号查询单个档案 GET /api/health/users[?phone=xxx]
router.get('/users', async (req, res) => {
  try {
    const { phone } = req.query
    const pool = getPool()
    if (phone) {
      const reqDb = pool.request()
      reqDb.input('phone', sql.NVarChar(20), phone)
      const rs = await reqDb.query('SELECT * FROM dbo.health_user WHERE phone = @phone')
      return res.json({ code: 200, data: rs.recordset[0] || null })
    }
    const rs = await pool.request().query('SELECT * FROM dbo.health_user ORDER BY id')
    res.json({ code: 200, data: rs.recordset })
  } catch (err) {
    console.error('【健康档案查询异常】', err)
    res.json({ code: 500, msg: '查询健康档案失败', error: err.message })
  }
})

// 创建或更新档案 POST /api/health/user
router.post('/user', async (req, res) => {
  try {
    const { id, phone, name, gender, age, height, weight, history } = req.body
    if (!name || !phone) {
      return res.json({ code: 500, msg: '参数不全：姓名、手机号必填' })
    }
    const pool = getPool()
    const reqDb = pool.request()
    let targetId = id ? parseInt(id) : null

    if (!targetId) {
      // 已存在则更新，否则新增
      const chk = pool.request()
      chk.input('phone', sql.NVarChar(20), phone)
      const exist = await chk.query('SELECT TOP 1 id FROM dbo.health_user WHERE phone = @phone')
      if (exist.recordset.length > 0) targetId = exist.recordset[0].id
    }

    reqDb.input('phone', sql.NVarChar(20), phone)
    reqDb.input('name', sql.NVarChar(50), name)
    reqDb.input('gender', sql.NVarChar(10), gender || '')
    reqDb.input('age', sql.Int, age != null && age !== '' ? parseInt(age) : null)
    reqDb.input('height', sql.Decimal(5, 2), height != null && height !== '' ? parseFloat(height) : null)
    reqDb.input('weight', sql.Decimal(5, 2), weight != null && weight !== '' ? parseFloat(weight) : null)
    reqDb.input('history', sql.NVarChar(500), history || '')

    if (targetId) {
      reqDb.input('id', sql.Int, targetId)
      await reqDb.query(`
        UPDATE dbo.health_user SET
          phone=@phone, name=@name, gender=@gender, age=@age,
          height=@height, weight=@weight, history=@history
        WHERE id=@id
      `)
      res.json({ code: 200, msg: '档案更新成功', data: { id: targetId } })
    } else {
      await reqDb.query(`
        INSERT INTO dbo.health_user (phone, name, gender, age, height, weight, history)
        VALUES (@phone, @name, @gender, @age, @height, @weight, @history)
      `)
      const rid = await pool.request().query('SELECT @@IDENTITY AS id')
      res.json({ code: 200, msg: '档案创建成功', data: { id: rid.recordset[0].id } })
    }
  } catch (err) {
    console.error('【健康档案保存异常】', err)
    res.json({ code: 500, msg: '保存健康档案失败', error: err.message })
  }
})

// 健康监测记录列表 GET /api/health/records?user_id=1
router.get('/records', async (req, res) => {
  try {
    const { user_id } = req.query
    if (!user_id) return res.json({ code: 200, data: [] })
    const pool = getPool()
    const reqDb = pool.request()
    reqDb.input('user_id', sql.Int, parseInt(user_id))
    const rs = await reqDb.query('SELECT * FROM dbo.health_record WHERE user_id=@user_id ORDER BY measure_date DESC, id DESC')
    res.json({ code: 200, data: rs.recordset })
  } catch (err) {
    console.error('【健康记录查询异常】', err)
    res.json({ code: 500, msg: '查询健康记录失败', error: err.message })
  }
})

// 新增监测记录 POST /api/health/record
router.post('/record', async (req, res) => {
  try {
    const { user_id, measure_date, measure_time, systolic, diastolic, blood_sugar, heart_rate, weight, remark } = req.body
    if (!user_id || !measure_date || !measure_time) {
      return res.json({ code: 500, msg: '参数不全：用户、测量日期和时间必填' })
    }
    const pool = getPool()
    const latestDb = pool.request()
    latestDb.input('user_id', sql.Int, parseInt(user_id))
    const latestRs = await latestDb.query(`
      SELECT TOP 1 measure_date, measure_time
      FROM dbo.health_record
      WHERE user_id = @user_id
      ORDER BY measure_date DESC, measure_time DESC, id DESC
    `)
    const latest = latestRs.recordset[0] || null
    const selectedValue = `${measure_date}T${measure_time}`
    const previousValue = latest ? `${latest.measure_date}T${latest.measure_time || '00:00'}` : ''
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    if (selectedValue > `${today}T${currentTime}`) {
      return res.json({ code: 400, msg: '测量时间不能超过当前时间' })
    }
    if (previousValue && selectedValue <= previousValue) {
      return res.json({ code: 400, msg: '测量时间必须晚于上次测量时间' })
    }
    const reqDb = pool.request()
    reqDb.input('user_id', sql.Int, parseInt(user_id))
    reqDb.input('measure_date', sql.NVarChar(20), measure_date)
    reqDb.input('measure_time', sql.NVarChar(10), measure_time || '')
    reqDb.input('systolic', sql.Int, systolic != null && systolic !== '' ? parseInt(systolic) : null)
    reqDb.input('diastolic', sql.Int, diastolic != null && diastolic !== '' ? parseInt(diastolic) : null)
    reqDb.input('blood_sugar', sql.Decimal(5, 2), blood_sugar != null && blood_sugar !== '' ? parseFloat(blood_sugar) : null)
    reqDb.input('heart_rate', sql.Int, heart_rate != null && heart_rate !== '' ? parseInt(heart_rate) : null)
    reqDb.input('weight', sql.Decimal(5, 2), weight != null && weight !== '' ? parseFloat(weight) : null)
    reqDb.input('remark', sql.NVarChar(300), remark || '')
    await reqDb.query(`
      INSERT INTO dbo.health_record
        (user_id, measure_date, measure_time, systolic, diastolic, blood_sugar, heart_rate, weight, remark)
      VALUES
        (@user_id, @measure_date, @measure_time, @systolic, @diastolic, @blood_sugar, @heart_rate, @weight, @remark)
    `)
    res.json({ code: 200, msg: '记录保存成功' })
  } catch (err) {
    console.error('【健康记录新增异常】', err)
    res.json({ code: 500, msg: '保存健康记录失败', error: err.message })
  }
})

// 删除监测记录 DELETE /api/health/record?id=1
router.delete('/record', async (req, res) => {
  try {
    const { id } = req.query
    if (!id) return res.json({ code: 400, msg: '缺少id参数' })
    const pool = getPool()
    const reqDb = pool.request()
    reqDb.input('id', sql.Int, id)
    await reqDb.query('DELETE FROM dbo.health_record WHERE id=@id')
    res.json({ code: 200, msg: '删除成功' })
  } catch (err) {
    console.error('【健康记录删除异常】', err)
    res.json({ code: 500, msg: '删除失败', error: err.message })
  }
})

// 保存风险评估 POST /api/health/risk
router.post('/risk', async (req, res) => {
  try {
    const { user_id, risk_date, risk_level, risk_items, suggestion } = req.body
    if (!user_id || !risk_date || !risk_level) {
      return res.json({ code: 500, msg: '参数不全：用户、日期、风险等级必填' })
    }
    const pool = getPool()
    const reqDb = pool.request()
    reqDb.input('user_id', sql.Int, parseInt(user_id))
    reqDb.input('risk_date', sql.NVarChar(20), risk_date)
    reqDb.input('risk_level', sql.NVarChar(20), risk_level)
    reqDb.input('risk_items', sql.NVarChar('MAX'), risk_items || '')
    reqDb.input('suggestion', sql.NVarChar('MAX'), suggestion || '')
    await reqDb.query(`
      INSERT INTO dbo.health_risk (user_id, risk_date, risk_level, risk_items, suggestion)
      VALUES (@user_id, @risk_date, @risk_level, @risk_items, @suggestion)
    `)
    res.json({ code: 200, msg: '评估保存成功' })
  } catch (err) {
    console.error('【风险评估保存异常】', err)
    res.json({ code: 500, msg: '保存评估失败', error: err.message })
  }
})

// 风险评估记录列表 GET /api/health/risks?user_id=1
router.get('/risks', async (req, res) => {
  try {
    const { user_id } = req.query
    if (!user_id) return res.json({ code: 200, data: [] })
    const pool = getPool()
    const reqDb = pool.request()
    reqDb.input('user_id', sql.Int, parseInt(user_id))
    const rs = await reqDb.query('SELECT * FROM dbo.health_risk WHERE user_id=@user_id ORDER BY id DESC')
    res.json({ code: 200, data: rs.recordset })
  } catch (err) {
    console.error('【风险评估查询异常】', err)
    res.json({ code: 500, msg: '查询评估记录失败', error: err.message })
  }
})

// 保存健康管理方案 POST /api/health/plan
router.post('/plan', async (req, res) => {
  try {
    const { user_id, plan_date, goal, diet, exercise, lifestyle } = req.body
    if (!user_id || !plan_date) {
      return res.json({ code: 500, msg: '参数不全：用户与日期必填' })
    }
    const pool = getPool()
    const reqDb = pool.request()
    reqDb.input('user_id', sql.Int, parseInt(user_id))
    reqDb.input('plan_date', sql.NVarChar(20), plan_date)
    reqDb.input('goal', sql.NVarChar(200), goal || '')
    reqDb.input('diet', sql.NVarChar('MAX'), diet || '')
    reqDb.input('exercise', sql.NVarChar('MAX'), exercise || '')
    reqDb.input('lifestyle', sql.NVarChar('MAX'), lifestyle || '')
    await reqDb.query(`
      INSERT INTO dbo.health_plan (user_id, plan_date, goal, diet, exercise, lifestyle)
      VALUES (@user_id, @plan_date, @goal, @diet, @exercise, @lifestyle)
    `)
    res.json({ code: 200, msg: '方案保存成功' })
  } catch (err) {
    console.error('【健康方案保存异常】', err)
    res.json({ code: 500, msg: '保存方案失败', error: err.message })
  }
})

// 方案列表 GET /api/health/plans?user_id=1
router.get('/plans', async (req, res) => {
  try {
    const { user_id } = req.query
    if (!user_id) return res.json({ code: 200, data: [] })
    const pool = getPool()
    const reqDb = pool.request()
    reqDb.input('user_id', sql.Int, parseInt(user_id))
    const rs = await reqDb.query('SELECT * FROM dbo.health_plan WHERE user_id=@user_id ORDER BY id DESC')
    res.json({ code: 200, data: rs.recordset })
  } catch (err) {
    console.error('【健康方案查询异常】', err)
    res.json({ code: 500, msg: '查询方案失败', error: err.message })
  }
})

// 慢性病列表 GET /api/health/chronic?user_id=1
router.get('/chronic', async (req, res) => {
  try {
    const { user_id } = req.query
    if (!user_id) return res.json({ code: 200, data: [] })
    const pool = getPool()
    const reqDb = pool.request()
    reqDb.input('user_id', sql.Int, parseInt(user_id))
    const rs = await reqDb.query('SELECT * FROM dbo.chronic_disease WHERE user_id=@user_id ORDER BY id DESC')
    res.json({ code: 200, data: rs.recordset })
  } catch (err) {
    console.error('【慢病查询异常】', err)
    res.json({ code: 500, msg: '查询慢病档案失败', error: err.message })
  }
})

// 新增/更新慢性病 POST /api/health/chronic
router.post('/chronic', async (req, res) => {
  try {
    const { id, user_id, disease_name, diagnose_date, stage, track_note, rehab_guide } = req.body
    if (!user_id || !disease_name) {
      return res.json({ code: 500, msg: '参数不全：用户与病名必填' })
    }
    const pool = getPool()
    const reqDb = pool.request()
    reqDb.input('user_id', sql.Int, parseInt(user_id))
    reqDb.input('disease_name', sql.NVarChar(50), disease_name)
    reqDb.input('diagnose_date', sql.NVarChar(20), diagnose_date || '')
    reqDb.input('stage', sql.NVarChar(50), stage || '')
    reqDb.input('track_note', sql.NVarChar('MAX'), track_note || '')
    reqDb.input('rehab_guide', sql.NVarChar('MAX'), rehab_guide || '')

    if (id) {
      reqDb.input('id', sql.Int, parseInt(id))
      await reqDb.query(`
        UPDATE dbo.chronic_disease SET
          disease_name=@disease_name, diagnose_date=@diagnose_date, stage=@stage,
          track_note=@track_note, rehab_guide=@rehab_guide
        WHERE id=@id
      `)
      res.json({ code: 200, msg: '慢病档案更新成功' })
    } else {
      await reqDb.query(`
        INSERT INTO dbo.chronic_disease (user_id, disease_name, diagnose_date, stage, track_note, rehab_guide)
        VALUES (@user_id, @disease_name, @diagnose_date, @stage, @track_note, @rehab_guide)
      `)
      res.json({ code: 200, msg: '慢病档案添加成功' })
    }
  } catch (err) {
    console.error('【慢病保存异常】', err)
    res.json({ code: 500, msg: '保存慢病档案失败', error: err.message })
  }
})

// 删除慢性病 DELETE /api/health/chronic?id=1
router.delete('/chronic', async (req, res) => {
  try {
    const { id } = req.query
    if (!id) return res.json({ code: 400, msg: '缺少id参数' })
    const pool = getPool()
    const reqDb = pool.request()
    reqDb.input('id', sql.Int, id)
    await reqDb.query('DELETE FROM dbo.chronic_disease WHERE id=@id')
    res.json({ code: 200, msg: '删除成功' })
  } catch (err) {
    console.error('【慢病删除异常】', err)
    res.json({ code: 500, msg: '删除失败', error: err.message })
  }
})

// 用药提醒列表 GET /api/health/reminders?user_id=1
router.get('/reminders', async (req, res) => {
  try {
    const { user_id } = req.query
    if (!user_id) return res.json({ code: 200, data: [] })
    const pool = getPool()
    const reqDb = pool.request()
    reqDb.input('user_id', sql.Int, parseInt(user_id))
    const rs = await reqDb.query('SELECT * FROM dbo.medication_reminder WHERE user_id=@user_id ORDER BY remind_time')
    res.json({ code: 200, data: rs.recordset })
  } catch (err) {
    console.error('【用药提醒查询异常】', err)
    res.json({ code: 500, msg: '查询用药提醒失败', error: err.message })
  }
})

// 新增/更新用药提醒 POST /api/health/reminder
router.post('/reminder', async (req, res) => {
  try {
    const { id, user_id, disease_name, medicine_name, dosage, frequency, remind_time, enabled } = req.body
    if (!user_id || !medicine_name) {
      return res.json({ code: 500, msg: '参数不全：用户与药名必填' })
    }
    const pool = getPool()
    const reqDb = pool.request()
    reqDb.input('user_id', sql.Int, parseInt(user_id))
    reqDb.input('disease_name', sql.NVarChar(50), disease_name || '')
    reqDb.input('medicine_name', sql.NVarChar(50), medicine_name)
    reqDb.input('dosage', sql.NVarChar(50), dosage || '')
    reqDb.input('frequency', sql.NVarChar(50), frequency || '')
    reqDb.input('remind_time', sql.NVarChar(20), remind_time || '')
    reqDb.input('enabled', sql.TinyInt, enabled != null ? (enabled ? 1 : 0) : 1)

    if (id) {
      reqDb.input('id', sql.Int, parseInt(id))
      await reqDb.query(`
        UPDATE dbo.medication_reminder SET
          disease_name=@disease_name, medicine_name=@medicine_name, dosage=@dosage,
          frequency=@frequency, remind_time=@remind_time, enabled=@enabled
        WHERE id=@id
      `)
      res.json({ code: 200, msg: '用药提醒更新成功' })
    } else {
      await reqDb.query(`
        INSERT INTO dbo.medication_reminder (user_id, disease_name, medicine_name, dosage, frequency, remind_time, enabled)
        VALUES (@user_id, @disease_name, @medicine_name, @dosage, @frequency, @remind_time, @enabled)
      `)
      res.json({ code: 200, msg: '用药提醒添加成功' })
    }
  } catch (err) {
    console.error('【用药提醒保存异常】', err)
    res.json({ code: 500, msg: '保存用药提醒失败', error: err.message })
  }
})

// 删除用药提醒 DELETE /api/health/reminder?id=1
router.delete('/reminder', async (req, res) => {
  try {
    const { id } = req.query
    if (!id) return res.json({ code: 400, msg: '缺少id参数' })
    const pool = getPool()
    const reqDb = pool.request()
    reqDb.input('id', sql.Int, id)
    await reqDb.query('DELETE FROM dbo.medication_reminder WHERE id=@id')
    res.json({ code: 200, msg: '删除成功' })
  } catch (err) {
    console.error('【用药提醒删除异常】', err)
    res.json({ code: 500, msg: '删除失败', error: err.message })
  }
})

// 删除风险评估记录 DELETE /api/health/risk?id=1
router.delete('/risk', async (req, res) => {
  try {
    const { id } = req.query
    if (!id) return res.json({ code: 400, msg: '缺少id参数' })
    const pool = getPool()
    const reqDb = pool.request()
    reqDb.input('id', sql.Int, id)
    await reqDb.query('DELETE FROM dbo.health_risk WHERE id=@id')
    res.json({ code: 200, msg: '删除成功' })
  } catch (err) {
    console.error('【风险评估删除异常】', err)
    res.json({ code: 500, msg: '删除失败', error: err.message })
  }
})

// 删除健康管理方案 DELETE /api/health/plan?id=1
router.delete('/plan', async (req, res) => {
  try {
    const { id } = req.query
    if (!id) return res.json({ code: 400, msg: '缺少id参数' })
    const pool = getPool()
    const reqDb = pool.request()
    reqDb.input('id', sql.Int, id)
    await reqDb.query('DELETE FROM dbo.health_plan WHERE id=@id')
    res.json({ code: 200, msg: '删除成功' })
  } catch (err) {
    console.error('【健康方案删除异常】', err)
    res.json({ code: 500, msg: '删除失败', error: err.message })
  }
})

module.exports = router