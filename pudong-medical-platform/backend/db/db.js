'use strict';

const path = require('path');
const sql = require('mssql/msnodesqlv8');

require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

let pool = null;
let connecting = null;

function toInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function toBoolean(value, fallback) {
  if (value === undefined) return fallback;
  return String(value).toLowerCase() === 'true';
}

function getConfig() {
  const requiredKeys = ['DB_SERVER', 'DB_DATABASE', 'DB_USER', 'DB_PASSWORD'];
  const missingKeys = requiredKeys.filter((key) => !process.env[key]);
  if (missingKeys.length > 0) {
    throw new Error(`缺少数据库环境变量：${missingKeys.join(', ')}`);
  }

  const encrypt = toBoolean(process.env.DB_ENCRYPT, false) ? 'yes' : 'no';
  const trustCertificate = toBoolean(process.env.DB_TRUST_SERVER_CERTIFICATE, true) ? 'yes' : 'no';
  const odbcDriver = process.env.DB_ODBC_DRIVER || 'ODBC Driver 17 for SQL Server';
  const connectionString = [
    `Driver={${odbcDriver}}`,
    `Server={${process.env.DB_SERVER}}`,
    `Database={${process.env.DB_DATABASE}}`,
    `Uid={${process.env.DB_USER}}`,
    `Pwd={${process.env.DB_PASSWORD}}`,
    'Trusted_Connection=no',
    `Encrypt=${encrypt}`,
    `TrustServerCertificate=${trustCertificate}`
  ].join(';');

  return {
    connectionString,
    options: {
      trustedConnection: false,
      useUTC: true
    },
    pool: {
      max: toInteger(process.env.DB_POOL_MAX, 10),
      min: toInteger(process.env.DB_POOL_MIN, 0),
      idleTimeoutMillis: toInteger(process.env.DB_POOL_IDLE_TIMEOUT_MS, 30000)
    }
  };
}

async function connectDatabase() {
  if (pool?.connected) return pool;
  if (connecting) return connecting;

  pool = new sql.ConnectionPool(getConfig());
  pool.on('error', (error) => {
    console.error('[SQL Server连接池错误]', error);
  });

  connecting = pool.connect()
    .then((connectedPool) => {
      console.log(`SQL Server已连接：${process.env.DB_SERVER}/${process.env.DB_DATABASE}`);
      return connectedPool;
    })
    .catch((error) => {
      pool = null;
      throw error;
    })
    .finally(() => {
      connecting = null;
    });

  return connecting;
}

async function getPool() {
  return connectDatabase();
}

async function closeDatabase() {
  if (pool) {
    await pool.close();
    pool = null;
  }
}

async function withTransaction(work, isolationLevel = sql.ISOLATION_LEVEL.READ_COMMITTED) {
  const activePool = await getPool();
  const transaction = new sql.Transaction(activePool);
  await transaction.begin(isolationLevel);

  try {
    const result = await work(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

module.exports = {
  closeDatabase,
  connectDatabase,
  getConfig,
  getPool,
  sql,
  withTransaction
};
