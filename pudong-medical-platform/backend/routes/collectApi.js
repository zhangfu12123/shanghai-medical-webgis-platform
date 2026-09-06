const express = require('express')
const router = express.Router()
const { getPool, sql } = require('../db/db')

//添加收藏（数据库有唯一约束，重复收藏数据库直接报错）
router.post('/addCollect', async (req, res) => {
    try {
        const { user_id, point_id } = req.body
        const pool = getPool()
        await pool.request()
            .input('uid', sql.Int, user_id)
            .input('pid', sql.Int, point_id)
            .query(`insert into user_collect(user_id,point_id,create_time) values(@uid,@pid,GETDATE())`)
        return res.success(null, "收藏成功")
    } catch (e) {
        if (e.number === 2627) {
            return res.fail("该点位已经收藏过")
        }
        return res.fail(e.message)
    }
})

//取消收藏
router.delete('/cancelCollect', async (req, res) => {
    try {
        const { user_id, point_id } = req.body
        const pool = getPool()
        await pool.request()
            .input('uid', sql.Int, user_id)
            .input('pid', sql.Int, point_id)
            .query(`delete from user_collect where user_id=@uid and point_id=@pid`)
        return res.success(null, "取消收藏")
    } catch (e) {
        return res.fail(e.message)
    }
})

//获取我的收藏列表，关联医疗点位信息
router.get('/myCollect/:uid', async (req, res) => {
    try {
        const { uid } = req.params
        const pool = getPool()
        const rs = await pool.request()
            .input('uid', sql.Int, uid)
            .query(`select c.*,p.name,p.type,p.address,p.lng,p.lat,p.phone,p.level 
                    from user_collect c 
                    left join medical_point p on c.point_id=p.id 
                    where c.user_id=@uid`)
        return res.success(rs.recordset)
    } catch (e) {
        return res.fail(e.message)
    }
})

//保存选址评估记录 site_evaluation
router.post('/saveSiteEval', async (req, res) => {
    try {
        const { user_id, eval_name, lng, lat, resultJson } = req.body
        const pool = getPool()
        await pool.request()
            .input('uid', sql.Int, user_id)
            .input('eval_name', sql.NVarChar, eval_name)
            .input('lng', sql.Decimal(12, 8), lng)
            .input('lat', sql.Decimal(12, 8), lat)
            .input('resultJson', sql.NVarChar, resultJson)
            .query(`insert into site_evaluation(user_id,eval_name,lng,lat,resultJson,create_time) 
                    values(@uid,@eval_name,@lng,@lat,@resultJson,GETDATE())`)
        return res.success(null, "选址评估已保存")
    } catch (e) {
        return res.fail(e.message)
    }
})

//获取用户选址历史
router.get('/siteHistory/:uid', async (req, res) => {
    try {
        const { uid } = req.params
        const pool = getPool()
        const rs = await pool.request()
            .input('uid', sql.Int, uid)
            .query(`select * from site_evaluation where user_id=@uid order by create_time desc`)
        return res.success(rs.recordset)
    } catch (e) {
        return res.fail(e.message)
    }
})

//保存用户查询历史 search_record
router.post('/saveSearchRecord', async (req, res) => {
    try {
        const { user_id, search_text, param_json } = req.body
        const pool = getPool()
        await pool.request()
            .input('uid', sql.Int, user_id)
            .input('st', sql.NVarChar, search_text)
            .input('pj', sql.NVarChar, param_json)
            .query(`insert into search_record(user_id,search_text,param_json,create_time) 
                    values(@uid,@st,@pj,GETDATE())`)
        return res.success(null)
    } catch (e) {
        return res.fail(e.message)
    }
})

//读取查询历史
router.get('/searchHistory/:uid', async (req, res) => {
    try {
        const { uid } = req.params
        const pool = getPool()
        const rs = await pool.request()
            .input('uid', sql.Int, uid)
            .query(`select * from search_record where user_id=@uid order by create_time desc`)
        return res.success(rs.recordset)
    } catch (e) {
        return res.fail(e.message)
    }
})

module.exports = router
