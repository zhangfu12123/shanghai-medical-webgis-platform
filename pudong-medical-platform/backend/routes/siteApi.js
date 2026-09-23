const express = require('express')
const router = express.Router()
const { getPool,sql } = require('../db/db')

// 新增选址记录 POST /api/site/add
router.post('/add',async (req,res)=>{
	try{
		const {userId,evalName,lng,lat,resultJson} = req.body
		if(!userId || !evalName || !lng || !lat){
			return res.json({code:500,msg:"参数不全：userId、evalName、lng、lat必填"})
		}
		const pool = getPool()
		const reqDb = pool.request()
		reqDb.input('user_id',sql.Int,userId)
		reqDb.input('eval_name',sql.NVarChar,evalName)
		reqDb.input('lng',sql.Decimal(12,8),lng)
		reqDb.input('lat',sql.Decimal(12,8),lat)
		reqDb.input('resultJson',sql.NVarChar('MAX'),resultJson||'')
		await reqDb.query(`
			INSERT INTO site_evaluation(user_id,eval_name,lng,lat,resultJson,create_time) 
			VALUES(@user_id,@eval_name,@lng,@lat,@resultJson,GETDATE())
		`)
		res.json({code:200,msg:"保存成功"})
	}catch(err){
		console.error("【选址新增异常】",err)
		res.json({code:500,msg:"保存选址失败",error:err.message})
	}
})

// 获取全部选址列表 GET /api/site/list
router.get('/list',async(req,res)=>{
	try{
		const pool = getPool()
		const rs = await pool.request().query(`
			select * from site_evaluation order by create_time desc
		`)
		res.json({code:200,data:rs.recordset})
	}catch(err){
		console.error("【查询选址异常】",err)
		res.json({code:500,msg:"查询选址失败",error:err.message})
	}
})

// 删除选址记录 DELETE /api/site/del
router.delete('/del', async (req, res)=>{
  try{
    const {id} = req.query
    if(!id){
      return res.json({code:400,msg:"缺少id参数"})
    }
    const pool = getPool()
    const reqDb = pool.request()
    reqDb.input('id', sql.Int, id)
    await reqDb.query(`DELETE FROM site_evaluation WHERE id = @id`)
    res.json({code:200,msg:"删除成功"})
  }catch(err){
    console.error("【删除选址异常】",err)
    res.json({code:500,msg:"数据库删除失败",error:err.message})
  }
})

module.exports = router
