const express = require('express')
const router = express.Router()
const { getPool, sql } = require('../db/db')
const jwt = require('jsonwebtoken')
const SECRET = "medical_secret_2026"

//注册
router.post('/register', async (req, res) => {
    try {
        const { username, password, real_name = "", role = "user" } = req.body
        const pool = getPool()
        const exist = await pool.request()
            .input('un', sql.NVarChar, username)
            .query(`select * from sys_user where username=@un`)
        if (exist.recordset.length > 0) return res.fail("用户名已存在")

        await pool.request()
            .input('un', sql.NVarChar, username)
            .input('pw', sql.NVarChar, password)
            .input('rn', sql.NVarChar, real_name)
            .input('role', sql.NVarChar, role)
            .query(`insert into sys_user(username,password,real_name,role,create_time) 
                    values(@un,@pw,@rn,@role,GETDATE())`)
        return res.success(null, "注册成功")
    } catch (e) {
        return res.fail(e.message)
    }
})

//登录返回token
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body
        const pool = getPool()
        const rs = await pool.request()
            .input('un', sql.NVarChar, username)
            .input('pw', sql.NVarChar, password)
            .query(`select * from sys_user where username=@un and password=@pw`)
        if (rs.recordset.length === 0) return res.fail("账号密码错误", 401)
        const user = rs.recordset[0]
        const token = jwt.sign(
            { userId: user.id, username: user.username, role: user.role },
            SECRET,
            { expiresIn: "24h" }
        )
        return res.success({
            token,
            userInfo: { id: user.id, username: user.username, real_name: user.real_name, role: user.role }
        }, "登录成功")
    } catch (e) {
        return res.fail(e.message)
    }
})

module.exports = router
