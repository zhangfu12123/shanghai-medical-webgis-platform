const express = require('express')
const router = express.Router()
const { getPool, sql } = require('../db/db')
const jwt = require('jsonwebtoken')
const svgCaptcha = require('svg-captcha')
const SECRET = "medical_secret_2026"

//登录校验中间件
const authCheck = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1]
    if(!token) return res.fail("未携带登录令牌，请先登录",401)
    try{
        const payload = jwt.verify(token,SECRET)
        req.user = payload
        next()
    }catch(err){
        return res.fail("token失效，请重新登录",401)
    }
}

//管理员权限校验中间件
const adminCheck = (req, res, next) => {
    if(req.user.role !== 'admin'){
        return res.fail("权限不足，仅管理员可操作",403)
    }
    next()
}

// 注册接口
router.post('/register', async (req, res) => {
    try {
        const { username, password, real_name = "", code } = req.body
        if(!username || !password){
            return res.fail("用户名和密码不能为空")
        }
        if(!code){
            return res.fail("验证码不能为空")
        }
        //验证码校验
        if(!req.session.captchaCode || req.session.captchaCode !== code.toLowerCase()){
            return res.fail("验证码错误")
        }
        delete req.session.captchaCode;
        const pool = getPool()
        const exist = await pool.request()
            .input('un', sql.NVarChar, username)
            .query(`select * from sys_user where username=@un`)
        if (exist.recordset.length > 0) return res.fail("用户名已存在")
        await pool.request()
            .input('un', sql.NVarChar, username)
            .input('pw', sql.NVarChar, password)
            .input('rn', sql.NVarChar, real_name)
            .query(`insert into sys_user(username,password,real_name,role,create_time) 
                    values(@un,@pw,@rn,'user',GETDATE())`)
        return res.success(null, "注册成功")
    } catch (e) {
        return res.fail(e.message)
    }
})

//登录接口 7天免登录
router.post('/login', async (req, res) => {
    try {
        const { username, password, remember = false, code } = req.body
        if(!code){
            return res.fail("验证码不能为空")
        }
        if(!req.session.captchaCode || req.session.captchaCode !== code.toLowerCase()){
            return res.fail("验证码错误")
        }
        delete req.session.captchaCode;
        const pool = getPool()
        const rs = await pool.request()
            .input('un', sql.NVarChar, username)
            .input('pw', sql.NVarChar, password)
            .query(`select * from sys_user where username=@un and password=@pw`)
        if (rs.recordset.length === 0) return res.fail("账号密码错误", 401)
        const user = rs.recordset[0]
        let expiresTime = remember ? "7d" : "24h"
        const token = jwt.sign(
            { userId: user.id, username: user.username, role: user.role },
            SECRET,
            { expiresIn: expiresTime }
        )
        return res.success({
            token,
            remember,
            userInfo: { id: user.id, username: user.username, real_name: user.real_name, role: user.role }
        }, "登录成功")
    } catch (e) {
        return res.fail(e.message)
    }
})

//图形验证码接口
router.get('/captcha', (req, res) => {
    const captcha = svgCaptcha.create({
        size: 4,
        noise: 2,
        color: true
    })
    req.session.captchaCode = captcha.text.toLowerCase();
    res.type('svg');
    res.send(captcha.data)
})

//同时导出路由 + 中间件
module.exports = {
    router,
    authCheck,
    adminCheck
}
