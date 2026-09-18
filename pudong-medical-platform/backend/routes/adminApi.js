const express = require('express')
const router = express.Router()
const { getPool, sql } = require('../db/db')
const { authCheck, adminCheck } = require('./userApi')

/**
 * 权限管理接口（挂载路径建议：app.use('/api/admin', require('./routes/adminApi'))）
 * 所有接口：先登录校验(authCheck)，再管理员校验(adminCheck)
 */
router.use(authCheck)
router.use(adminCheck)

// 查看所有用户（含封禁状态）
router.get('/users', async (req, res) => {
    try {
        const pool = getPool()
        const rs = await pool.request()
            .query(`select id, username, real_name, role, isnull(status,'normal') as status, create_time 
                    from sys_user order by id`)
        return res.success(rs.recordset)
    } catch (e) {
        return res.fail(e.message)
    }
})

// 封禁用户
router.post('/user/ban', async (req, res) => {
    try {
        const { id } = req.body
        if (!id) return res.fail("缺少用户ID")
        const pool = getPool()
        await pool.request().input('id', sql.Int, id)
            .query(`update sys_user set status='banned' where id=@id`)
        return res.success(null, "已封禁该用户")
    } catch (e) {
        return res.fail(e.message)
    }
})

// 解封用户
router.post('/user/unban', async (req, res) => {
    try {
        const { id } = req.body
        if (!id) return res.fail("缺少用户ID")
        const pool = getPool()
        await pool.request().input('id', sql.Int, id)
            .query(`update sys_user set status='normal' where id=@id`)
        return res.success(null, "已解封该用户")
    } catch (e) {
        return res.fail(e.message)
    }
})

// 查看全部点位留言（管理员）
router.get('/comments', async (req, res) => {
    try {
        const pool = getPool()
        const rs = await pool.request()
            .query(`select c.id, c.user_id, c.star, c.content, c.create_time, 
                           u.username, p.name as point_name
                    from point_comment c
                    left join sys_user u on c.user_id = u.id
                    left join medical_point p on c.point_id = p.id
                    order by c.create_time desc`)
        return res.success(rs.recordset)
    } catch (e) {
        return res.fail(e.message)
    }
})

// 删除任意留言（管理员）
router.delete('/comment/:id', async (req, res) => {
    try {
        const { id } = req.params
        const pool = getPool()
        await pool.request().input('id', sql.Int, id)
            .query(`delete from point_comment where id=@id`)
        return res.success(null, "留言已删除")
    } catch (e) {
        return res.fail(e.message)
    }
})

module.exports = router