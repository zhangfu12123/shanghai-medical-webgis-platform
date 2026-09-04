// routes/statApi.js
const express = require('express')
const router = express.Router()
const { pool } = require('../db/db.js')

/**
 * @api GET /api/stat/countAll
 * @desc 获取浦东新区医疗机构总数量
 */
router.get('/countAll', async (req, res) => {
  try {
    await pool.connect()
    const result = await pool.request().query(`SELECT COUNT(*) AS total FROM medical_point`)
    res.json({
      code: 200,
      msg: 'success',
      data: {
        total: result.recordset[0].total
      }
    })
  } catch (err) {
    res.json({ code: 500, msg: '查询失败', error: err.message })
  }
})

/**
 * @api GET /api/stat/countByType
 * @desc 按医疗机构类型分类统计数量
 */
router.get('/countByType', async (req, res) => {
  try {
    await pool.connect()
    const sqlStr = `
      SELECT type,COUNT(*) AS cnt 
      FROM medical_point 
      GROUP BY type
    `
    const result = await pool.request().query(sqlStr)
    res.json({
      code: 200,
      msg: 'success',
      data: result.recordset
    })
  } catch (err) {
    res.json({ code: 500, msg: '分类统计失败', error: err.message })
  }
})

/**
 * @api GET /api/stat/queryAroundPoint
 * @desc 选址辅助：给定经纬度，查询周边13km范围内医疗点位
 * query参数：lng,lat,radius(单位米，默认13000即13km)
 */
router.get('/queryAroundPoint', async (req, res) => {
  try {
    const { lng, lat, radius = 13000 } = req.query
    if (!lng || !lat) {
      return res.json({ code: 400, msg: '缺少经纬度参数lng,lat' })
    }
    const reqDb = pool.request()
    reqDb.input('lng', parseFloat(lng))
    reqDb.input('lat', parseFloat(lat))
    reqDb.input('radius', parseFloat(radius))

    const sqlText = `
      SELECT * FROM medical_point 
      WHERE SQRT( POWER((lng - @lng)*111000,2)+POWER((lat-@lat)*111000,2) ) <= @radius
    `
    const rs = await reqDb.query(sqlText)
    res.json({
      code: 200,
      msg: 'success',
      data: rs.recordset
    })
  } catch (err) {
    res.json({ code: 500, msg: '周边点位查询失败', error: err.message })
  }
})

/**
 * @api POST /api/stat/reachIndex
 * @desc 可达性原始指标简单统计接口
 * body: {pointLng, pointLat}
 */
router.post('/reachIndex', async (req, res) => {
  try {
    const { pointLng, pointLat } = req.body
    if (!pointLng || !pointLat) {
      return res.json({ code: 400, msg: '缺少点位坐标' })
    }
    const dbReq = pool.request()
    dbReq.input('lng', parseFloat(pointLng))
    dbReq.input('lat', parseFloat(pointLat))
    
    const sqlText = `
      SELECT 
        (SELECT COUNT(*) FROM medical_point WHERE SQRT( POWER((lng-@lng)*111000,2)+POWER((lat-@lat)*111000,2)) <=5000 ) as fiveKmCnt,
        (SELECT COUNT(*) FROM medical_point WHERE SQRT( POWER((lng-@lng)*111000,2)+POWER((lat-@lat)*111000,2)) <=10000 ) as tenKmCnt
    `
    const rs = await dbReq.query(sqlText)
    res.json({
      code:200,
      msg:'success',
      data: rs.recordset[0]
    })
  }catch(err){
    res.json({code:500,msg:'可达性指标计算失败',error:err.message})
  }
})

module.exports = router
