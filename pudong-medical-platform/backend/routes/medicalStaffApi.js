const express = require('express')
const router = express.Router()
const { getPool, sql } = require('../db/db')

/**
 * 医疗人员查询 / 排班 / 预约 后端接口
 * 挂载前缀建议：app.use('/api/staff', require('./routes/medicalStaffApi'))
 */

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

// 提交预约（含同医生同日期同时段占用校验）
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
    const pool = getPool()

    // 占用校验：同医生 + 同日期 + 同时段，且状态未取消，视为冲突
    if (appoint_date && time_slot) {
      const checkDb = pool.request()
      checkDb.input('c_doctor_id', sql.Int, doctor_id)
      checkDb.input('c_date', sql.NVarChar(20), appoint_date)
      checkDb.input('c_slot', sql.NVarChar(50), time_slot)
      const dup = await checkDb.query(`
        SELECT TOP 1 id FROM dbo.appointment
        WHERE doctor_id = @c_doctor_id AND appoint_date = @c_date
          AND time_slot = @c_slot AND status <> N'已取消'
      `)
      if (dup.recordset.length > 0) {
        return res.json({ code: 500, msg: '该医生在所选日期该时间段已被预约，请更换时间段' })
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

// 实时校验：某医生某日期某时间段是否已被占用
router.get('/appoint/check', async (req, res) => {
  try {
    const { doctor_id, date, slot } = req.query
    if (!doctor_id || !date || !slot) {
      return res.json({ code: 200, data: { busy: false } })
    }
    const pool = getPool()
    const reqDb = pool.request()
    reqDb.input('doctor_id', sql.Int, parseInt(doctor_id))
    reqDb.input('date', sql.NVarChar(20), date)
    reqDb.input('slot', sql.NVarChar(50), slot)
    const rs = await reqDb.query(`
      SELECT TOP 1 id FROM dbo.appointment
      WHERE doctor_id = @doctor_id AND appoint_date = @date
        AND time_slot = @slot AND status <> N'已取消'
    `)
    res.json({ code: 200, data: { busy: rs.recordset.length > 0 } })
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

// 编辑预约（含同医生同日期同时段占用校验，排除自身记录）
router.post('/appointment/edit', async (req, res) => {
  try {
    const id = parseInt(req.body.id)
    const {
      patient_name, patient_gender, patient_age, patient_phone,
      appoint_date, time_slot, remark, doctor_id, doctor_name, hospital_name, department
    } = req.body
    if (!id) return res.json({ code: 400, msg: '缺少id参数' })
    const pool = getPool()

    // 占用校验：排除当前这条记录自身
    if (appoint_date && time_slot && doctor_id) {
      const checkDb = pool.request()
      checkDb.input('c_doctor_id', sql.Int, doctor_id)
      checkDb.input('c_date', sql.NVarChar(20), appoint_date)
      checkDb.input('c_slot', sql.NVarChar(50), time_slot)
      checkDb.input('c_id', sql.Int, id)
      const dup = await checkDb.query(`
        SELECT TOP 1 id FROM dbo.appointment
        WHERE doctor_id = @c_doctor_id AND appoint_date = @c_date
          AND time_slot = @c_slot AND status <> N'已取消' AND id <> @c_id
      `)
      if (dup.recordset.length > 0) {
        return res.json({ code: 500, msg: '该医生在所选日期该时间段已被预约，请更换时间段' })
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

// 删除预约
router.post('/appointment/delete', async (req, res) => {
  try {
    const id = parseInt(req.body.id)
    if (!id) return res.json({ code: 400, msg: '缺少id参数' })
    const pool = getPool()
    const reqDb = pool.request()
    reqDb.input('id', sql.Int, id)
    await reqDb.query('DELETE FROM dbo.appointment WHERE id = @id')
    res.json({ code: 200, msg: '删除成功' })
  } catch (err) {
    console.error('【删除预约异常】', err)
    res.json({ code: 500, msg: '删除预约失败', error: err.message })
  }
})

module.exports = router