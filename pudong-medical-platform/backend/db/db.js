const sql = require('mssql')

const config = {
    user: 'sa',
    password: '001824',
    server: 'localhost',
    database: 'PudongMedicalDB',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
}

let pool = null

async function connect() {
    try {
        pool = await sql.connect(config)
        console.log("✅数据库连接成功")
        return pool
    } catch (e) {
        console.error("❌数据库连接失败", e.message)
    }
}

function getPool() {
    return pool
}

module.exports = { connect, getPool, sql }
