const express = require('express')
const router = express.Router()
const { getPool, sql } = require('../db/db')

// 禁用接口缓存，避免药品数据更新后前端拿到旧数据
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.set('Pragma', 'no-cache')
  res.set('Expires', '0')
  next()
})

/**
 * ============================================================================
 * 药品数据库接口（挂载路径：app.use('/api/drug', require('./routes/drugApi'))）
 * 依赖表：dbo.drug / dbo.drug_interaction / dbo.drug_guide（见 drug.sql）
 * ============================================================================
 */

// 把字段统一转为安全字符串（空值转 null）
function strOrNull(v) {
  if (v === undefined || v === null) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

/**
 * @api GET /api/drug/list
 * @desc 药品列表 + 名称/通用名/分类模糊搜索 + 分页
 * @query keyword 模糊关键词, category 分类, page 页码, pageSize 每页条数
 */
router.get('/list', async (req, res) => {
  try {
    const keyword = strOrNull(req.query.keyword)
    const category = strOrNull(req.query.category)
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const pageSize = Math.max(1, parseInt(req.query.pageSize, 10) || 50)

    const pool = getPool()
    const reqDb = pool.request()

    let where = ' WHERE 1=1 '
    if (keyword) {
      reqDb.input('kw', sql.NVarChar, `%${keyword}%`)
      where += ' AND (name LIKE @kw OR generic_name LIKE @kw OR category LIKE @kw OR dosage_form LIKE @kw) '
    }
    if (category) {
      reqDb.input('cat', sql.NVarChar, category)
      where += ' AND category = @cat '
    }

    const offset = (page - 1) * pageSize
    reqDb.input('offset', sql.Int, offset)
    reqDb.input('pageSize', sql.Int, pageSize)
    const rs = await reqDb.query(`
      SELECT id, name, generic_name, category, prescription, dosage_form, spec, manufacturer, approval_number,
             COUNT(*) OVER() AS totalCount
      FROM dbo.drug ${where}
      ORDER BY id DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `)

    const total = Number(rs.recordset[0]?.totalCount || 0)

    res.json({
      code: 200,
      msg: 'success',
      data: { list: rs.recordset, total, page, pageSize }
    })
  } catch (err) {
    res.json({ code: 500, msg: '查询药品列表失败', error: err.message })
  }
})

/**
 * @api GET /api/drug/options
 * @desc 药品下拉选项（供相互作用查询的药品选择器使用）
 */
router.get('/options', async (req, res) => {
  try {
    const rs = await getPool().request().query(
      `SELECT id, name, category FROM dbo.drug ORDER BY name`
    )
    res.json({ code: 200, msg: 'success', data: rs.recordset })
  } catch (err) {
    res.json({ code: 500, msg: '查询药品选项失败', error: err.message })
  }
})

/**
 * @api GET /api/drug/categories
 * @desc 药品分类列表（供筛选/新增下拉）
 */
router.get('/categories', async (req, res) => {
  try {
    const rs = await getPool().request().query(
      `SELECT DISTINCT category FROM dbo.drug WHERE category IS NOT NULL AND category <> '' ORDER BY category`
    )
    res.json({ code: 200, msg: 'success', data: rs.recordset.map(r => r.category) })
  } catch (err) {
    res.json({ code: 500, msg: '查询药品分类失败', error: err.message })
  }
})

/**
 * @api GET /api/drug/detail/:id
 * @desc 药品详情（用法用量/规格/禁忌/注意事项等）+ 该药相关的相互作用
 */
router.get('/detail/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (!id) return res.json({ code: 400, msg: '缺少药品id' })

    const pool = getPool()
    const reqDb = pool.request()
    reqDb.input('id', sql.Int, id)

    const rs = await reqDb.query(`SELECT * FROM dbo.drug WHERE id = @id`)
    if (!rs.recordset.length) return res.json({ code: 404, msg: '药品不存在' })

    const interRs = await reqDb.query(`
      SELECT i.id, i.drug_a_id, i.drug_b_id, i.severity, i.level, i.description, i.advice,
             a.name AS drug_a_name, b.name AS drug_b_name
      FROM dbo.drug_interaction i
      JOIN dbo.drug a ON a.id = i.drug_a_id
      JOIN dbo.drug b ON b.id = i.drug_b_id
      WHERE i.drug_a_id = @id OR i.drug_b_id = @id
    `)

    res.json({
      code: 200,
      msg: 'success',
      data: { ...rs.recordset[0], interactions: interRs.recordset }
    })
  } catch (err) {
    res.json({ code: 500, msg: '查询药品详情失败', error: err.message })
  }
})

/**
 * @api POST /api/drug/add
 * @desc 新增药品（参数以 JSON body 方式提交）
 */
router.post('/add', async (req, res) => {
  try {
    const b = req.body || {}
    const name = strOrNull(b.name)
    if (!name) return res.json({ code: 400, msg: '药品名称必填' })

    const pool = getPool()
    const reqDb = pool.request()
    reqDb.input('name', sql.NVarChar, name)
    reqDb.input('generic_name', sql.NVarChar, strOrNull(b.generic_name))
    reqDb.input('category', sql.NVarChar, strOrNull(b.category))
    reqDb.input('prescription', sql.NVarChar, strOrNull(b.prescription))
    reqDb.input('dosage_form', sql.NVarChar, strOrNull(b.dosage_form))
    reqDb.input('spec', sql.NVarChar, strOrNull(b.spec))
    reqDb.input('usage_dosage', sql.NVarChar('MAX'), strOrNull(b.usage_dosage))
    reqDb.input('contraindications', sql.NVarChar('MAX'), strOrNull(b.contraindications))
    reqDb.input('precautions', sql.NVarChar('MAX'), strOrNull(b.precautions))
    reqDb.input('adverse_reactions', sql.NVarChar('MAX'), strOrNull(b.adverse_reactions))
    reqDb.input('manufacturer', sql.NVarChar, strOrNull(b.manufacturer))
    reqDb.input('approval_number', sql.NVarChar, strOrNull(b.approval_number))

    const rs = await reqDb.query(`
      INSERT INTO dbo.drug
        (name, generic_name, category, prescription, dosage_form, spec, usage_dosage,
         contraindications, precautions, adverse_reactions, manufacturer, approval_number)
      VALUES
        (@name, @generic_name, @category, @prescription, @dosage_form, @spec, @usage_dosage,
         @contraindications, @precautions, @adverse_reactions, @manufacturer, @approval_number);
      SELECT SCOPE_IDENTITY() AS newId;
    `)

    const newId = rs.recordset[0]?.newId
    res.json({ code: 200, msg: '新增药品成功', data: { id: newId } })
  } catch (err) {
    console.error('【新增药品异常】', err)
    res.json({ code: 500, msg: '新增药品失败', error: err.message })
  }
})

/**
 * @api GET /api/drug/interaction/check
 * @desc 相互作用查询（无向，A+B 与 B+A 等价）
 * @query drugAId, drugBId
 */
router.get('/interaction/check', async (req, res) => {
  try {
    const a = parseInt(req.query.drugAId, 10)
    const b = parseInt(req.query.drugBId, 10)
    if (!a || !b) return res.json({ code: 400, msg: '请选择两种药品' })
    if (a === b) return res.json({ code: 200, msg: 'success', data: null, tip: '同一种药品无需查询相互作用' })

    const pool = getPool()
    const reqDb = pool.request()
    reqDb.input('a', sql.Int, a)
    reqDb.input('b', sql.Int, b)

    const rs = await reqDb.query(`
      SELECT i.id, i.drug_a_id, i.drug_b_id, i.severity, i.level, i.description, i.advice,
             a.name AS drug_a_name, b.name AS drug_b_name
      FROM dbo.drug_interaction i
      JOIN dbo.drug a ON a.id = i.drug_a_id
      JOIN dbo.drug b ON b.id = i.drug_b_id
      WHERE (i.drug_a_id = @a AND i.drug_b_id = @b)
         OR (i.drug_a_id = @b AND i.drug_b_id = @a)
    `)

    if (rs.recordset.length) {
      res.json({ code: 200, msg: 'success', data: rs.recordset[0] })
    } else {
      res.json({ code: 200, msg: 'success', data: null, tip: '数据库中暂未收录两者的相互作用，请遵医嘱或咨询药师' })
    }
  } catch (err) {
    res.json({ code: 500, msg: '查询相互作用失败', error: err.message })
  }
})

/**
 * @api GET /api/drug/guide/list
 * @desc 用药指南列表（可按分类筛选）
 * @query category
 */
router.get('/guide/list', async (req, res) => {
  try {
    const category = strOrNull(req.query.category)
    const reqDb = getPool().request()

    let where = ' WHERE 1=1 '
    if (category) {
      reqDb.input('cat', sql.NVarChar, category)
      where += ' AND category = @cat '
    }
    const rs = await reqDb.query(`
      SELECT id, title, category, summary, created_at FROM dbo.drug_guide ${where} ORDER BY id ASC
    `)
    res.json({ code: 200, msg: 'success', data: rs.recordset })
  } catch (err) {
    res.json({ code: 500, msg: '查询用药指南失败', error: err.message })
  }
})

/**
 * @api GET /api/drug/guide/:id
 * @desc 用药指南详情
 */
router.get('/guide/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (!id) return res.json({ code: 400, msg: '缺少指南id' })

    const reqDb = getPool().request()
    reqDb.input('id', sql.Int, id)
    const rs = await reqDb.query(`SELECT * FROM dbo.drug_guide WHERE id = @id`)
    if (!rs.recordset.length) return res.json({ code: 404, msg: '指南不存在' })
    res.json({ code: 200, msg: 'success', data: rs.recordset[0] })
  } catch (err) {
    res.json({ code: 500, msg: '查询指南详情失败', error: err.message })
  }
})

/**
 * @api POST /api/drug/delete
 * @desc 删除药品（同时删除其相关相互作用记录，避免外键约束拦截）body: { id }
 */
router.post('/delete', async (req, res) => {
  try {
    const id = parseInt((req.body && req.body.id) || req.query.id, 10)
    if (!id) return res.json({ code: 400, msg: '缺少药品id' })

    const pool = getPool()
    const reqDb = pool.request()
    reqDb.input('id', sql.Int, id)

    await reqDb.query(`DELETE FROM dbo.drug_interaction WHERE drug_a_id = @id OR drug_b_id = @id`)
    const rs = await reqDb.query(`DELETE FROM dbo.drug WHERE id = @id`)

    if (!rs.rowsAffected || rs.rowsAffected[0] === 0) {
      return res.json({ code: 404, msg: '药品不存在或已删除' })
    }
    res.json({ code: 200, msg: '删除成功' })
  } catch (err) {
    res.json({ code: 500, msg: '删除药品失败', error: err.message })
  }
})

module.exports = router