'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');

require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });

const apiRouter = require('./routes');
const { closeDatabase, connectDatabase } = require('./db/db');
const { errorHandler, notFoundHandler, sendSuccess } = require('./utils/response');

const app = express();
const port = Number(process.env.PORT) || 3000;
const frontendDirectory = path.resolve(__dirname, '..', 'frontend');

function getAllowedOrigins() {
  return (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const allowedOrigins = getAllowedOrigins();

app.disable('x-powered-by');
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    const error = new Error(`不允许的跨域来源：${origin}`);
    error.status = 403;
    return callback(error);
  }
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));

app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/api', apiRouter);

app.get('/', (req, res, next) => {
  const indexFile = path.join(frontendDirectory, 'index.html');
  try {
    if (fs.existsSync(indexFile) && fs.statSync(indexFile).size > 0) {
      return res.sendFile(indexFile);
    }
    return sendSuccess(res, {
      service: '上海市公共医疗资源服务平台后端',
      apiHealth: '/api/health',
      note: '前端首页文件尚未完成'
    });
  } catch (error) {
    return next(error);
  }
});
app.use(express.static(frontendDirectory, { index: false }));

app.use(notFoundHandler);
app.use(errorHandler);

let server = null;

async function startServer() {
  await connectDatabase();
  return new Promise((resolve, reject) => {
    server = app.listen(port, () => {
      console.log(`后端服务已启动：http://localhost:${port}`);
      resolve(server);
    });
    server.on('error', reject);
  });
}

async function shutdown(signal) {
  console.log(`收到${signal}，正在关闭服务...`);
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await closeDatabase();
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('服务启动失败：', error);
    process.exitCode = 1;
  });

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, async () => {
      try {
        await shutdown(signal);
        process.exit(0);
      } catch (error) {
        console.error('服务关闭失败：', error);
        process.exit(1);
      }
    });
  }
}

module.exports = {
  app,
  shutdown,
  startServer
};
