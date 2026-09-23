const express = require('express')
const router = express.Router()
const { getPool, sql } = require('../db/db')

/**
 * @api GET /api/gisExtra/communityByRadius
 * @desc 根据中心点经纬度+半径，查询范围内小区（用于医疗点位15分钟服务圈）
 * @query lng, lat, radius 单位米，默认15000
 * @note 距离计算公式与statApi保持一致：平面近似 1度≈111000米，只做查询，无增删改
 */
router.get('/communityByRadius', async (req, res) => {
  try {
    const { lng, lat, radius = 15000 } = req.query
    if (!lng || !lat) {
      return res.json({ code: 400, msg: '缺少经纬度参数lng,lat' })
    }

    const pool = getPool()
    const reqDb = pool.request()
    reqDb.input('lng', parseFloat(lng))
    reqDb.input('lat', parseFloat(lat))
    reqDb.input('radius', parseFloat(radius))

    const sqlText = `
      SELECT * FROM community
      WHERE SQRT( POWER((lng - @lng)*111000,2)+POWER((lat-@lat)*111000,2) ) <= @radius
    `
    const rs = await reqDb.query(sqlText)

    res.json({
      code: 200,
      msg: 'success',
      data: rs.recordset
    })
  } catch (err) {
    res.json({ code: 500, msg: '查询小区失败', error: err.message })
  }
})

module.exports = router
