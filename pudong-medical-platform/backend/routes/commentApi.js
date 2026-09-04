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
            .query(`select c.*,u.username from point_comment c 
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

module.exports = router
