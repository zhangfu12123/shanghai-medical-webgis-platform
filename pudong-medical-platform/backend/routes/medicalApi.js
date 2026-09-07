const express = require('express')
const router = express.Router()
const { getPool, sql } = require('../db/db')

//医疗点位列表，type筛选
router.get('/point', async (req, res) => {
    try {
        const { type } = req.query
        const pool = getPool()
        let q = `select * from medical_point`
        let reqObj = pool.request()
        if (type) {
            q += ` where type=@type`
            reqObj.input('type', sql.NVarChar, type)
        }
        const rs = await reqObj.query(q)
        return res.success(rs.recordset)
    } catch (e) {
        return res.fail(e.message)
    }
})

//单个点位详情
router.get('/point/:id', async (req, res) => {
    try {
        const { id } = req.params
        const pool = getPool()
        const rs = await pool.request()
            .input('id', sql.Int, id)
            .query(`select * from medical_point where id=@id`)
        return res.success(rs.recordset[0])
    } catch (e) {
        return res.fail(e.message)
    }
})

module.exports = router
