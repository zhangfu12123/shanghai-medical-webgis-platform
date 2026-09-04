const express = require('express')
const router = express.Router()
const { getPool, sql } = require('../db/db')

//总医疗机构数量
router.get('/countAll', async (req, res) => {
    try {
        const pool = getPool()
        const rs = await pool.request().query(`select count(*) as total from medical_point`)
        return res.success(rs.recordset[0])
    } catch (e) {
        return res.fail(e.message)
    }
})

//按类型分类统计
router.get('/countByType', async (req, res) => {
    try {
        const pool = getPool()
        const rs = await pool.request().query(`select type,count(*) as cnt from medical_point group by type`)
        return res.success(rs.recordset)
    } catch (e) {
        return res.fail(e.message)
    }
})

//选址辅助：返回全部医疗点位经纬度，前端Turf做距离过滤13km
router.get('/siteQuery', async (req, res) => {
    try {
        const pool = getPool()
        const rs = await pool.request().query(`select id,name,type,lng,lat from medical_point`)
        return res.success(rs.recordset)
    } catch (e) {
        return res.fail(e.message)
    }
})

//可达性指标计算接口（计算逻辑放前端Turf，后端仅接收参数占位）
router.post('/accessCalc', async (req, res) => {
    try {
        const { lng, lat, radius } = req.body
        return res.success({ lng, lat, radius, note: "空间运算由前端Turf完成，结果回传保存" })
    } catch (e) {
        return res.fail(e.message)
    }
})

module.exports = router
