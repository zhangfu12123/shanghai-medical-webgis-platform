const express = require('express')
const fs = require('fs')
const path = require('path')
const router = express.Router()
const { getPool, sql } = require('../db/db')

// //浦东新区边界geojson
// router.get('/boundary', (req, res) => {
//     const filePath = path.join(__dirname, "../static/pudong_boundary.geojson")
//     fs.readFile(filePath, "utf8", (err, data) => {
//         if (err) return res.fail("读取边界文件失败")
//         return res.success(JSON.parse(data))
//     })
// })

// //路网geojson（高德路径规划不需要，暂时注释）
// router.get('/roadnet', (req, res) => {
//     const filePath = path.join(__dirname, "../static/pudong_road.geojson")
//     fs.readFile(filePath, "utf8", (err, data) => {
//         if (err) return res.fail("读取路网文件失败")
//         return res.success(JSON.parse(data))
//     })
// })

//获取全部小区点位 community表
router.get('/community', async (req, res) => {
    try {
        const pool = getPool()
        const rs = await pool.request().query(`select * from community`)
        return res.success(rs.recordset)
    } catch (e) {
        return res.fail(e.message)
    }
})

module.exports = router
