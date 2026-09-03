// routes/collectApi.js
const express = require('express')
const router = express.Router()
const { pool } = require('../db/db.js')

// ========== 收藏模块 user_collect表 ==========
/**
 * @api POST /api/collect/add
 * @desc 添加点位收藏
 * body: {userId,pointId}
 */
router.post('/add', async (req, res) => {
  try {
    const { userId, pointId } = req.body
    if (!userId || !pointId) {
      return res.json({ code: 400, msg: '参数缺失 userId、pointId' })
    }
    const dbReq = pool.request()
    dbReq.input('userId', userId)
    dbReq.input('pointId', pointId)
    // 判断是否已经收藏
    const exist = await dbReq.query(`SELECT * FROM user_collect WHERE user_id=@userId AND point_id=@pointId`)
    if(exist.recordset.length>0){
      return res.json({code:400,msg:'已收藏，无需重复添加'})
    }
    await dbReq.query(`INSERT INTO user_collect(user_id,point_id,create_time) VALUES(@userId,@pointId,GETDATE())`)
    res.json({code:200,msg:'收藏成功'})
  } catch (err) {
    res.json({code:500,msg:'收藏失败',error:err.message})
  }
})

/**
 * @api POST /api/collect/cancel
 * @desc 取消收藏
 * body: {userId,pointId}
 */
router.post('/cancel', async (req,res)=>{
  try{
    const {userId,pointId}=req.body
    if(!userId||!pointId) return res.json({code:400,msg:'参数缺失'})
    const dbReq=pool.request()
    dbReq.input('userId',userId)
    dbReq.input('pointId',pointId)
    await dbReq.query(`DELETE FROM user_collect WHERE user_id=@userId AND point_id=@pointId`)
    res.json({code:200,msg:'取消收藏成功'})
  }catch(err){
    res.json({code:500,msg:'取消收藏失败',error:err.message})
  }
})

/**
 * @api GET /api/collect/myList
 * @desc 获取用户个人收藏列表
 * query: userId
 */
router.get('/myList',async (req,res)=>{
  try{
    const {userId}=req.query
    if(!userId) return res.json({code:400,msg:'缺少userId'})
    const dbReq=pool.request()
    dbReq.input('userId',userId)
    const sqlStr=`
      SELECT c.*,mp.name,mp.type,mp.address 
      FROM user_collect c
      LEFT JOIN medical_point mp ON c.point_id=mp.id
      WHERE c.user_id=@userId
      ORDER BY c.create_time DESC
    `
    const rs=await dbReq.query(sqlStr)
    res.json({code:200,msg:'success',data:rs.recordset})
  }catch(err){
    res.json({code:500,msg:'获取收藏列表失败',error:err.message})
  }
})

// ========== 选址评估历史 site_evaluation ==========
/**
 * @api POST /api/collect/saveSiteEval
 * @desc 保存选址评估结果
 * body:{userId,evalName,lng,lat,resultJson}
 */
router.post('/saveSiteEval',async (req,res)=>{
  try{
    const {userId,evalName,lng,lat,resultJson}=req.body
    if(!userId||!lng||!lat) return res.json({code:400,msg:'参数不全'})
    const dbReq=pool.request()
    dbReq.input('userId',userId)
    dbReq.input('evalName',evalName||'未命名选址')
    dbReq.input('lng',parseFloat(lng))
    dbReq.input('lat',parseFloat(lat))
    dbReq.input('resultJson',resultJson||'')
    await dbReq.query(`
      INSERT INTO site_evaluation(user_id,eval_name,lng,lat,resultJson,create_time)
      VALUES(@userId,@evalName,@lng,@lat,@resultJson,GETDATE())
    `)
    res.json({code:200,msg:'选址评估记录保存成功'})
  }catch(err){
    res.json({code:500,msg:'保存选址记录失败',error:err.message})
  }
})

/**
 * @api GET /api/collect/siteEvalList
 * @desc 获取用户选址评估历史
 * query: userId
 */
router.get('/siteEvalList',async (req,res)=>{
  try{
    const {userId}=req.query
    if(!userId) return res.json({code:400,msg:'缺少userId'})
    const dbReq=pool.request()
    dbReq.input('userId',userId)
    const rs=await dbReq.query(`SELECT * FROM site_evaluation WHERE user_id=@userId ORDER BY create_time DESC`)
    res.json({code:200,msg:'success',data:rs.recordset})
  }catch(err){
    res.json({code:500,msg:'读取选址历史失败',error:err.message})
  }
})

// ========== 用户查询历史 search_record ==========
/**
 * @api POST /api/collect/saveSearchRecord
 * @desc 保存用户查询历史
 * body:{userId,searchText,searchParamJson}
 */
router.post('/saveSearchRecord',async (req,res)=>{
  try{
    const {userId,searchText,searchParamJson}=req.body
    if(!userId) return res.json({code:400,msg:'缺少userId'})
    const dbReq=pool.request()
    dbReq.input('userId',userId)
    dbReq.input('searchText',searchText||'')
    dbReq.input('searchParamJson',searchParamJson||'')
    await dbReq.query(`
      INSERT INTO search_record(user_id,search_text,param_json,create_time)
      VALUES(@userId,@searchText,@searchParamJson,GETDATE())
    `)
    res.json({code:200,msg:'查询历史保存成功'})
  }catch(err){
    res.json({code:500,msg:'保存查询历史失败',error:err.message})
  }
})

/**
 * @api GET /api/collect/searchRecordList
 * @desc 获取用户查询历史
 * query: userId
 */
router.get('/searchRecordList',async (req,res)=>{
  try{
    const {userId}=req.query
    if(!userId) return res.json({code:400,msg:'缺少userId'})
    const dbReq=pool.request()
    dbReq.input('userId',userId)
    const rs=await dbReq.query(`SELECT * FROM search_record WHERE user_id=@userId ORDER BY create_time DESC`)
    res.json({code:200,msg:'success',data:rs.recordset})
  }catch(err){
    res.json({code:500,msg:'读取查询历史失败',error:err.message})
  }
})

module.exports = router
