const express = require('express')
const router = express.Router()
const { getPool, sql } = require('../db/db')

//获取点位留言列表
router.get('/list/:pointId', async (req, res) => {
    try {
        const { pointId } = req.params
        const pool = getPool()
        const rs = await pool.request()
            .input('pid', sql.Int, pointId)
            .query(`select c.*,u.username,u.role 
                    from point_comment c 
                    left join sys_user u on c.user_id=u.id 
                    where c.point_id=@pid order by c.create_time desc`)
        return res.success(rs.recordset)
    } catch (e) {
        return res.fail(e.message)
    }
})

//提交留言评分
router.post('/add', async (req, res) => {
    try {
        const { point_id, user_id, content, star } = req.body
        const pool = getPool()
        await pool.request()
            .input('pid', sql.Int, point_id)
            .input('uid', sql.Int, user_id)
            .input('content', sql.NVarChar, content)
            .input('star', sql.TinyInt, star)
            .query(`insert into point_comment(point_id,user_id,content,star,create_time) 
                    values(@pid,@uid,@content,@star,GETDATE())`)
        return res.success(null, "留言提交成功")
    } catch (e) {
        return res.fail(e.message)
    }
})

//【新增：删除留言】普通用户只能删自己；管理员可以删除任意留言
router.delete('/del/:commentId', async (req, res) => {
    try {
        const { commentId } = req.params
        const { user_id, user_role } = req.body
        const pool = getPool()

        // 查询这条留言属于哪个用户
        const q = await pool.request()
            .input('cid', sql.Int, commentId)
            .query(`select user_id from point_comment where id=@cid`)

        if(q.recordset.length === 0){
            return res.fail("该留言不存在")
        }
        const commentOwnerUid = q.recordset[0].user_id

        //权限判断：管理员 或者 当前用户=留言作者，允许删除
        if(user_role !== 'admin' && commentOwnerUid !== user_id){
            return res.fail("无权限删除他人留言")
        }

        await pool.request()
            .input('cid', sql.Int, commentId)
            .query(`delete from point_comment where id=@cid`)

        return res.success(null,"留言已删除")
    } catch (e) {
        return res.fail(e.message)
    }
})

module.exports = router