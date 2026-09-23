const express = require('express')
const router = express.Router()
// 和userApi保持一模一样导入
const { getPool, sql } = require('../db/db')

// 获取全部居民区列表
router.get('/list', async (req, res) => {
  try {
    const pool = getPool()
    const rs = await pool.request()
      .query(`select id,name,lng,lat from community where lng is not null and lat is not null`)

    return res.json({
      code:200,
      data: rs.recordset
    })
  } catch(err){
    console.error('查询居民区报错：', err)
    return res.json({code:500,msg:'读取居民区失败'})
  }
})

module.exports = router
