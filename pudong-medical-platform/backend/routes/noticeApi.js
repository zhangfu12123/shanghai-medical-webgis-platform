const express = require('express')
const router = express.Router()
const { getPool, sql } = require('../db/db')

//获取公告列表，可过滤是否显示
router.get('/', async (req, res) => {
    try {
        const { is_show } = req.query
        const pool = getPool()
        let q = `select * from system_notice `
        let reqObj = pool.request()
        if (is_show !== undefined) {
            q += ` where is_show=@is_show `
            reqObj.input('is_show', sql.TinyInt, is_show)
        }
        q += ` order by create_time desc`
        const result = await reqObj.query(q)
        return res.success(result.recordset)
    } catch (e) {
        return res.fail(e.message)
    }
})

//新增公告
router.post('/add', async (req, res) => {
    try {
        const { title, content, publish_user, is_show = 1 } = req.body
        const pool = getPool()
        await pool.request()
            .input('title', sql.NVarChar, title)
            .input('content', sql.NVarChar, content)
            .input('publish_user', sql.Int, publish_user)
            .input('is_show', sql.TinyInt, is_show)
            .query(`insert into system_notice(title,content,publish_user,is_show,create_time) 
                    values(@title,@content,@publish_user,@is_show,GETDATE())`)
        return res.success(null, "新增公告成功")
    } catch (e) {
        return res.fail(e.message)
    }
})

//修改公告
router.put('/update/:id', async (req, res) => {
    try {
        const { id } = req.params
        const { title, content, is_show } = req.body
        const pool = getPool()
        await pool.request()
            .input('id', sql.Int, id)
            .input('title', sql.NVarChar, title)
            .input('content', sql.NVarChar, content)
            .input('is_show', sql.TinyInt, is_show)
            .query(`update system_notice set title=@title,content=@content,is_show=@is_show where id=@id`)
        return res.success(null, "修改公告成功")
    } catch (e) {
        return res.fail(e.message)
    }
})

//删除公告
router.delete('/del/:id', async (req, res) => {
    try {
        const { id } = req.params
        const pool = getPool()
        await pool.request().input('id', sql.Int, id).query(`delete from system_notice where id=@id`)
        return res.success(null, "删除公告成功")
    } catch (e) {
        return res.fail(e.message)
    }
})

module.exports = router
