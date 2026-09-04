const express = require('express');
const cors = require('cors');

const medicalRouter = require('./routes/medical');

const app = express();
const PORT = 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 注册路由
app.use('/api/medical', medicalRouter);

// 首页测试
app.get('/', (req, res) => {
  res.send('上海市公共医疗资源服务平台 - 后端API运行中');
});

// 启动服务
app.listen(PORT, () => {
  console.log('🚀 后端服务已启动：http://localhost:' + PORT);
});
