const express = require('express')
const cors = require('cors')
const path = require('path')
const session = require('express-session')
const db = require('./db/db')
const indexRouter = require('./routes/index')
const noticeRouter = require('./routes/noticeApi')
const medicalRouter = require('./routes/medicalApi')
// 修改这里
const userModule = require('./routes/userApi')
const userRouter = userModule.router

const commentRouter = require('./routes/commentApi')
const statRouter = require('./routes/statApi')
const collectRouter = require('./routes/collectApi')
const gisExtraRouter = require('./routes/gisExtraApi')
const app = express()
const PORT = 3000
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
// ✅session配置，验证码必须，放在路由挂载前面！
app.use(session({
    secret: "medical_secret_2026",
    resave: false,
    saveUninitialized: true,
    cookie:{maxAge: 5*60*1000} //验证码有效期5分钟
}))
app.use('/static', express.static(path.join(__dirname, './static')))
// 统一响应扩展
app.response.success = function (data, msg = "操作成功") {
    return this.json({ code: 200, msg, data })
}
app.response.fail = function (msg = "操作失败", code = 500) {
    return this.json({ code, msg, data: null })
}
//挂载路由
app.use('/api', indexRouter)
app.use('/api/notice', noticeRouter)
app.use('/api/medical', medicalRouter)
app.use('/api/user', userRouter)
app.use('/api/comment', commentRouter)
app.use('/api/stat', statRouter)
app.use('/api/collect', collectRouter)
app.use('/api/gisExtra', gisExtraRouter)
//全局错误捕获
app.use((err, req, res, next) => {
    console.error(err)
    return res.fail("服务器内部异常")
})
app.listen(PORT, async () => {
    console.log(`服务启动，端口:${PORT}`)
    console.log(`访问地址：http://localhost:${PORT}`)
    await db.connect()
})
