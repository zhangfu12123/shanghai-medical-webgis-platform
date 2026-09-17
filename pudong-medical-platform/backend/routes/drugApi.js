const express = require('express')
const router = express.Router()
const { getPool, sql } = require('../db/db')
const https = require('https')
const http = require('http')

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

// ==================== 创新功能：智能荐药 ====================

// 症状 → 药品分类 映射表
const SYMPTOM_MAP = {
  '头痛': ['解热镇痛', '神经系统'],
  '发热': ['解热镇痛'],
  '牙痛': ['解热镇痛'],
  '痛经': ['解热镇痛'],
  '肌肉酸痛': ['解热镇痛'],
  '关节疼痛': ['解热镇痛'],
  '咳嗽': ['呼吸', '抗感染'],
  '感冒': ['呼吸', '解热镇痛'],
  '咽痛': ['呼吸', '抗感染'],
  '鼻塞': ['呼吸', '抗过敏'],
  '流涕': ['呼吸', '抗过敏'],
  '腹泻': ['消化', '抗感染'],
  '胃痛': ['消化'],
  '消化不良': ['消化'],
  '胃酸过多': ['消化'],
  '恶心呕吐': ['消化'],
  '过敏': ['抗过敏'],
  '皮疹': ['抗过敏'],
  '荨麻疹': ['抗过敏'],
  '鼻炎': ['抗过敏'],
  '皮肤感染': ['抗感染', '外用药'],
  '外伤': ['抗感染', '外用药'],
  '高血压': ['心脑血管'],
  '心绞痛': ['心脑血管'],
  '心悸': ['心脑血管'],
  '糖尿病': ['内分泌'],
  '失眠': ['神经系统'],
  '焦虑': ['神经系统'],
  '维生素缺乏': ['维生素'],
  '骨质疏松': ['维生素'],
  '哮喘': ['呼吸', '激素'],
  '便秘': ['消化'],
  '痔疮': ['外用药'],
  '湿疹': ['抗过敏', '外用药', '激素'],
  '皮炎': ['抗过敏', '外用药', '激素'],
  '头晕': ['神经系统'],
  '痛风': ['解热镇痛', '内分泌'],
}

// ==================== 基础禁忌检测（AI 不可用时的最小兜底） ====================
// 仅做特殊人群 + 直接关键词匹配，不硬编码任何过敏别名
// 过敏交叉反应（如异丁苯丙酸↔布洛芬）完全由 AI 智能甄别

// 用户填写"无过敏"时的常见表达，这些不应被当作过敏原
const NO_ALLERGY_KEYWORDS = ['无', '没有', '无过敏', '不过敏', '不清楚', '未知', '无过敏史', '无药物过敏', '无药物过敏史']

function isNoAllergy(text) {
  const t = text.trim().toLowerCase()
  return NO_ALLERGY_KEYWORDS.some(k => t === k || t === k.toLowerCase())
}

function checkContraindicated(drug, userProfile) {
  const warns = []
  const contra = (drug.contraindications || '').toLowerCase()
  const precaut = (drug.precautions || '').toLowerCase()
  const allText = contra + ' ' + precaut
  const drugName = (drug.name || '').toLowerCase()
  const genericName = (drug.generic_name || '').toLowerCase()

  if (userProfile.isPregnant) {
    if (/孕妇|怀孕|妊娠|胎儿/.test(allText)) warns.push('孕妇禁用')
  }
  if (userProfile.isChild) {
    if (/儿童|小儿|婴幼儿|幼儿/.test(allText)) warns.push('儿童慎用/禁用')
  }
  if (userProfile.isElderly) {
    if (/老年|高龄/.test(allText)) warns.push('老年人慎用')
  }
  if (userProfile.allergyKeywords && !isNoAllergy(userProfile.allergyKeywords)) {
    const kws = userProfile.allergyKeywords.split(/[,，\s]+/).filter(k => k.trim())
    for (const kw of kws) {
      if (!kw || isNoAllergy(kw)) continue
      const kwLower = kw.toLowerCase()
      // 仅做直接匹配，交叉反应交给 AI
      if (allText.includes(kwLower)) warns.push(`含过敏成分「${kw}」`)
      if (drugName.includes(kwLower)) warns.push(`药品名称含「${kw}」`)
      if (genericName.includes(kwLower)) warns.push(`药品通用名含「${kw}」`)
    }
  }
  return warns
}

// ==================== AI 智能过敏分析（豆包模型） ====================
// 与 AI 就医咨询功能共用 .env 配置：
//   API_KEY      — 火山引擎 API 密钥
//   MODEL_EP_ID  — 豆包模型接入点 ID（如 ep-2024xxxx）
// ARK_BASE_URL 固定为火山引擎端点地址，与 AI 就医咨询一致
const ARK_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'

async function aiAllergyAnalysis(drugs, userProfile, symptoms, symptomDesc) {
  const aiApiKey = process.env.API_KEY || ''
  if (!aiApiKey) {
    console.log('【AI过敏分析】未配置 API_KEY，跳过 AI 分析')
    return null
  }

  const modelEpId = process.env.MODEL_EP_ID || ''
  if (!modelEpId) {
    console.log('【AI过敏分析】未配置 MODEL_EP_ID，跳过 AI 分析')
    return null
  }

  console.log('【AI过敏分析】请求端点:', ARK_BASE_URL, '模型接入点:', modelEpId)

  // 精简药品信息发给 AI
  const drugList = drugs.map(d => ({
    id: d.id,
    name: d.name,
    generic_name: d.generic_name || '',
    category: d.category || '',
    prescription: d.prescription || '',
    contraindications: (d.contraindications || '').substring(0, 200),
    precautions: (d.precautions || '').substring(0, 200),
  }))

  const profileDesc = [
    userProfile.age ? `年龄${userProfile.age}岁` : '年龄未知',
    userProfile.gender ? `性别${userProfile.gender}` : '性别未知',
    userProfile.isPregnant ? '孕期/哺乳期' : '非孕期',
    userProfile.allergyKeywords ? `过敏史：${userProfile.allergyKeywords}` : '无过敏史',
  ].join('，')

  // 构建症状描述（预选症状 + 自由描述）
  let symptomText = symptoms.join('、') || '无'
  if (symptomDesc && symptomDesc.trim()) {
    symptomText += `\n患者自述：${symptomDesc.trim()}`
  }

  const prompt = `你是一位专业的临床药师AI助手。请根据患者的过敏史和个人情况，逐一分析以下药品对该患者是否安全。

【患者信息】${profileDesc}
【症状】${symptomText}

【待分析药品列表】
${JSON.stringify(drugList, null, 2)}

分析要求（必须严格执行）：
1. 重点考虑过敏史——同一药物常有多个名称（化学名/通用名/商品名），你必须识别交叉反应：
   - "异丁苯丙酸"就是"布洛芬"的化学名，对异丁苯丙酸过敏的患者，所有含布洛芬的药品都禁用
   - "青霉素"过敏的患者，应排除所有β-内酰胺类/青霉素类药品（阿莫西林、氨苄西林、哌拉西林等），即使药品名称中不含"青霉素"
   - "阿司匹林"="乙酰水杨酸"，"对乙酰氨基酚"="扑热息痛"，"头孢"过敏需排除所有头孢类
   - "磺胺"过敏需排除所有含磺胺类成分的药品
2. 检查药品的 generic_name（通用名）是否与过敏原属于同一药物或同类药物
3. 考虑特殊人群禁忌（孕妇、儿童、老年人）
4. 考虑药品禁忌症和注意事项字段中明确标注的内容
5. 结合患者描述的症状，判断药品是否对症

请对每种药品给出判断，返回 JSON 数组格式：
[
  {"id": 1, "safe": true, "reason": "与患者过敏史无交叉，可安全使用"},
  {"id": 2, "safe": false, "reason": "该药通用名为布洛芬，患者对异丁苯丙酸（布洛芬的化学名）过敏，禁用"}
]

只返回 JSON 数组本身，不要输出任何思考过程、分析步骤、解释或 markdown 代码块，第一个字符必须是 [。`

  // 使用 Node.js 原生 https 模块调用豆包 API
  return new Promise((resolve) => {
    const parsedUrl = new URL(ARK_BASE_URL)
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiApiKey}`,
      },
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            console.error('【AI接口请求失败】HTTP', res.statusCode, data.substring(0, 300))
            resolve(null)
            return
          }
          const response = JSON.parse(data)
          // 豆包推理模型可能返回 reasoning_content（思考过程）和 content（正式回复）
          // 只取 content 字段，不要 reasoning_content
          let content = response.choices?.[0]?.message?.content || ''

          // 如果 content 为空，尝试从 reasoning_content 后面取
          if (!content && response.choices?.[0]?.message?.reasoning_content) {
            content = response.choices[0].message.reasoning_content
          }

          // 去掉可能的 markdown 代码块包裹和思考标签
          content = content.replace(/<thinking[\s\S]*?<\/thinking>/g, '').trim()
          content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

          console.log('【AI返回内容】(前300字)', content.substring(0, 300))

          // 解析 JSON 数组：从最后一个 [ 取到最后一个 ]，避免思考内容混在前面的干扰
          const lastBracket = content.lastIndexOf('[')
          const lastClose = content.lastIndexOf(']')
          if (lastBracket === -1 || lastClose === -1 || lastClose < lastBracket) {
            console.error('【AI返回内容无法解析为JSON】', content.substring(0, 300))
            resolve(null)
            return
          }

          const jsonStr = content.substring(lastBracket, lastClose + 1)
          const result = JSON.parse(jsonStr)
          // 转成以 id 为 key 的 map，方便查找
          const resultMap = {}
          for (const item of result) {
            if (item.id != null) {
              resultMap[item.id] = {
                safe: item.safe !== false,
                reason: item.reason || (item.safe === false ? 'AI判断存在禁忌' : '安全'),
              }
            }
          }
          console.log('【AI过敏分析成功】共分析', drugs.length, '种药品')
          resolve(resultMap)
        } catch (e) {
          console.error('【AI响应解析失败】', e.message || e)
          resolve(null)
        }
      })
    })

    req.on('error', (e) => {
      console.error('【AI接口请求错误】', e.message || e)
      resolve(null)
    })

    req.on('timeout', () => {
      req.destroy()
      console.error('【AI接口请求超时】')
      resolve(null)
    })

    req.setTimeout(5000)

    req.write(JSON.stringify({
      model: modelEpId,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      max_tokens: 8000,
      // 关键：关闭深度思考。medical-ai-chat 等推理型模型默认先输出很长的思维链，
      // 会拖到 20 秒级；关掉后直接生成结果，几秒内即可返回。
      thinking: { type: 'disabled' },
    }))
    req.end()
  })
}

/**
 * @api GET /api/drug/recommend
 * @desc 智能荐药：根据症状+用户画像推荐药品，AI 智能甄别过敏风险
 * @query symptoms 逗号分隔的预选症状, symptomDesc 自由症状描述, age 年龄, gender 性别, isPregnant 是否怀孕, allergies 过敏关键词
 */
router.get('/recommend', async (req, res) => {
  try {
    const symptoms = String(req.query.symptoms || '')
      .split(',')
      .map(s => s.trim())
      .filter(s => s)

    const symptomDesc = String(req.query.symptomDesc || '').trim()

    if (!symptoms.length && !symptomDesc) {
      return res.json({ code: 400, msg: '请至少选择一项症状或描述您的症状' })
    }

    const age = parseInt(req.query.age, 10) || 0
    const gender = String(req.query.gender || '').trim()
    const isPregnant = req.query.isPregnant === '1' || req.query.isPregnant === 'true'
    const allergyKeywords = String(req.query.allergies || '').trim()

    // 构建用户画像
    const userProfile = {
      age, gender, isPregnant,
      isChild: age > 0 && age < 14,
      isElderly: age >= 65,
      allergyKeywords,
    }

    // 根据症状获取匹配的分类
    const matchedCategories = new Set()
    symptoms.forEach(sym => {
      const cats = SYMPTOM_MAP[sym]
      if (cats) {
        cats.forEach(c => matchedCategories.add(c))
      }
    })

    if (!matchedCategories.size) {
      return res.json({
        code: 200, msg: 'success',
        data: {
          matchedCategories: [],
          recommended: [],
          excluded: [],
          triage: {
            level: 'warning',
            title: '未匹配到对应药品分类',
            message: '您描述的症状暂未在系统中匹配到药品分类，建议直接就医或咨询药师。',
            needDoctor: true,
          }
        }
      })
    }

    const catList = Array.from(matchedCategories)

    // 查询匹配分类下的所有药品
    const pool = getPool()
    const reqDb = pool.request()
    const catParams = catList.map((c, i) => {
      reqDb.input(`cat${i}`, sql.NVarChar, c)
      return `@cat${i}`
    }).join(', ')
    const rs = await reqDb.query(`
      SELECT id, name, generic_name, category, prescription, dosage_form, spec,
             usage_dosage, contraindications, precautions, adverse_reactions,
             manufacturer, approval_number
      FROM dbo.drug
      WHERE category IN (${catParams})
      ORDER BY prescription ASC, name ASC
    `)

    // 分类药品并检查禁忌
    const recommended = []   // 安全推荐
    const excluded = []      // 被排除（有禁忌）

    // AI 为主：过敏交叉反应由豆包 AI 智能甄别
    // 关键词匹配仅做最小兜底（AI 不可用时回退，只做直接匹配不做交叉反应）
    let aiUsed = false
    let aiResult = null
    const hasAllergy = allergyKeywords && !isNoAllergy(allergyKeywords)
    if (hasAllergy || userProfile.isPregnant || userProfile.isChild || userProfile.isElderly) {
      try {
        // 竞速保护：AI 最多等 5 秒，超时就回退到关键词匹配
        aiResult = await Promise.race([
          aiAllergyAnalysis(rs.recordset, userProfile, symptoms, symptomDesc),
          new Promise((resolve) => setTimeout(() => resolve(null), 5000)),
        ])
        if (aiResult) aiUsed = true
      } catch (aiErr) {
        console.error('【AI分析异常，回退到关键词匹配】', aiErr.message)
      }
    }

    rs.recordset.forEach(drug => {
      let warns = []
      let aiReasonText = null

      if (aiUsed && aiResult[drug.id]) {
        // AI 为主：以 AI 判断为准
        aiReasonText = aiResult[drug.id].reason
        if (!aiResult[drug.id].safe) {
          warns.push(aiResult[drug.id].reason)
        }
        // AI 已分析时，关键词匹配仅补充特殊人群禁忌（AI 可能漏判的特殊人群提示）
        const basicWarns = checkContraindicated(drug, userProfile)
        for (const bw of basicWarns) {
          if (!warns.some(w => w.includes(bw))) warns.push(bw)
        }
      } else {
        // AI 不可用时：回退到基础关键词匹配（仅直接匹配，无交叉反应）
        warns = checkContraindicated(drug, userProfile)
      }

      if (warns.length === 0) {
        recommended.push({
          ...drug,
          safe: true,
          warnings: [],
          aiReason: aiReasonText,
        })
      } else {
        excluded.push({
          id: drug.id,
          name: drug.name,
          generic_name: drug.generic_name,
          category: drug.category,
          prescription: drug.prescription,
          dosage_form: drug.dosage_form,
          spec: drug.spec,
          warnings: warns,
          aiReason: aiReasonText,
        })
      }
    })

    // OTC 优先排序
    recommended.sort((a, b) => {
      const aOtc = a.prescription === 'OTC' ? 0 : 1
      const bOtc = b.prescription === 'OTC' ? 0 : 1
      return aOtc - bOtc
    })

    // 分诊建议
    let triage
    const hasPrescriptionOnly = recommended.length > 0 && recommended.every(d => d.prescription === '处方药')
    const allExcluded = recommended.length === 0 && excluded.length > 0

    if (allExcluded) {
      triage = {
        level: 'danger',
        title: '所有匹配药品均存在禁忌',
        message: `根据您的个人情况（${userProfile.isPregnant ? '孕期 ' : ''}${userProfile.isChild ? '儿童 ' : ''}${userProfile.isElderly ? '老年 ' : ''}${allergyKeywords ? '过敏史' : ''}），匹配的药品均不建议自行使用。请尽快就医，由医生评估后开具适合的处方。`,
        needDoctor: true,
      }
    } else if (hasPrescriptionOnly) {
      triage = {
        level: 'warning',
        title: '建议就医开具处方',
        message: '匹配药品均为处方药，需医生诊断后凭处方购买。建议前往社区卫生服务中心或相关科室就诊。',
        needDoctor: true,
      }
    } else if (userProfile.isChild || userProfile.isPregnant) {
      triage = {
        level: 'caution',
        title: '可参考推荐，但建议就医确认',
        message: '由于您属于特殊人群（儿童/孕妇），即使推荐了OTC药品，也强烈建议在用药前咨询医生或药师。',
        needDoctor: false,
      }
    } else {
      triage = {
        level: 'safe',
        title: '可参考OTC药品自行用药',
        message: '推荐列表中有非处方药可供选择。请仔细阅读药品说明书，按用法用量服用。如症状持续或加重，请及时就医。',
        needDoctor: false,
      }
    }

    res.json({
      code: 200, msg: 'success',
      data: {
        matchedCategories: catList,
        symptoms,
        recommended,
        excluded,
        triage,
        userProfile,
        aiUsed,
      }
    })
  } catch (err) {
    console.error('【智能荐药异常】', err)
    res.json({ code: 500, msg: '智能荐药失败', error: err.message })
  }
})

/**
 * @api GET /api/drug/ai-debug
 * @desc AI 过敏分析调试接口：输入过敏原和药品ID，看 AI 完整的请求和返回
 * @query allergy 过敏原, drugIds 逗号分隔的药品ID
 */
router.get('/ai-debug', async (req, res) => {
  try {
    const allergy = String(req.query.allergy || '异丁苯丙酸')
    const drugIdsStr = String(req.query.drugIds || '')

    const pool = getPool()
    const reqDb = pool.request()

    let rs
    if (drugIdsStr) {
      const ids = drugIdsStr.split(',').map(id => parseInt(id.trim(), 10)).filter(id => id)
      if (ids.length) {
        const idParams = ids.map((id, i) => {
          reqDb.input(`id${i}`, sql.Int, id)
          return `@id${i}`
        }).join(', ')
        rs = await reqDb.query(`SELECT * FROM dbo.drug WHERE id IN (${idParams})`)
      }
    }

    if (!rs || !rs.recordset.length) {
      rs = await getPool().request().query(`SELECT TOP 5 id, name, generic_name, category, prescription, contraindications, precautions FROM dbo.drug WHERE category = '解热镇痛' ORDER BY name`)
    }

    const userProfile = {
      age: 23, gender: '', isPregnant: false,
      isChild: false, isElderly: false,
      allergyKeywords: allergy,
    }

    const symptoms = ['头痛']
    const symptomDesc = '持续头痛两天'

    // 构建和 aiAllergyAnalysis 一样的 prompt，直接展示
    const drugList = rs.recordset.map(d => ({
      id: d.id,
      name: d.name,
      generic_name: d.generic_name || '',
      category: d.category || '',
      prescription: d.prescription || '',
      contraindications: (d.contraindications || '').substring(0, 200),
      precautions: (d.precautions || '').substring(0, 200),
    }))

    const profileDesc = [
      `年龄${userProfile.age}岁`,
      '性别未知',
      '非孕期',
      `过敏史：${userProfile.allergyKeywords}`,
    ].join('，')

    const symptomText = symptoms.join('、') + `\n患者自述：${symptomDesc}`

    const prompt = `你是一位专业的临床药师AI助手。请根据患者的过敏史和个人情况，逐一分析以下药品对该患者是否安全。

【患者信息】${profileDesc}
【症状】${symptomText}

【待分析药品列表】
${JSON.stringify(drugList, null, 2)}

分析要求（必须严格执行）：
1. 重点考虑过敏史——同一药物常有多个名称（化学名/通用名/商品名），你必须识别交叉反应：
   - "异丁苯丙酸"就是"布洛芬"的化学名，对异丁苯丙酸过敏的患者，所有含布洛芬的药品都禁用
   - "青霉素"过敏的患者，应排除所有β-内酰胺类/青霉素类药品（阿莫西林、氨苄西林、哌拉西林等），即使药品名称中不含"青霉素"
   - "阿司匹林"="乙酰水杨酸"，"对乙酰氨基酚"="扑热息痛"，"头孢"过敏需排除所有头孢类
   - "磺胺"过敏需排除所有含磺胺类成分的药品
2. 检查药品的 generic_name（通用名）是否与过敏原属于同一药物或同类药物
3. 考虑特殊人群禁忌（孕妇、儿童、老年人）
4. 考虑药品禁忌症和注意事项字段中明确标注的内容
5. 结合患者描述的症状，判断药品是否对症

请对每种药品给出判断，返回 JSON 数组格式：
[
  {"id": 1, "safe": true, "reason": "与患者过敏史无交叉，可安全使用"},
  {"id": 2, "safe": false, "reason": "该药通用名为布洛芬，患者对异丁苯丙酸（布洛芬的化学名）过敏，禁用"}
]

只返回 JSON 数组，不要加任何其他文字或解释。`

    // 调用 AI
    const aiApiKey = process.env.API_KEY || ''
    const modelEpId = process.env.MODEL_EP_ID || ''
    const arkUrl = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'

    if (!aiApiKey || !modelEpId) {
      return res.json({
        code: 200,
        msg: 'AI 配置不完整',
        data: { prompt, drugs: drugList, error: '缺少 API_KEY 或 MODEL_EP_ID' }
      })
    }

    const aiResponse = await new Promise((resolve) => {
      const parsedUrl = new URL(arkUrl)
      const options = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aiApiKey}`,
        },
      }

      const testReq = https.request(options, (testRes) => {
        let body = ''
        testRes.on('data', (chunk) => { body += chunk })
        testRes.on('end', () => {
          resolve({
            statusCode: testRes.statusCode,
            rawBody: body.substring(0, 2000),
            parsed: (() => {
              try { return JSON.parse(body) } catch { return null }
            })(),
          })
        })
      })

      testReq.on('error', (e) => resolve({ error: e.message }))
      testReq.on('timeout', () => { testReq.destroy(); resolve({ error: 'timeout' }) })
      testReq.setTimeout(15000)

      testReq.write(JSON.stringify({
        model: modelEpId,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 3000,
        thinking: { type: 'disabled' },
      }))
      testReq.end()
    })

    // 提取 AI 回复内容
    let aiContent = ''
    if (aiResponse.parsed?.choices?.[0]?.message) {
      const msg = aiResponse.parsed.choices[0].message
      aiContent = msg.content || msg.reasoning_content || ''
    }

    res.json({
      code: 200,
      msg: 'AI 调试结果',
      data: {
        allergy,
        drugs: drugList,
        prompt: prompt.substring(0, 500) + '...',
        aiStatusCode: aiResponse.statusCode,
        aiContent: aiContent.substring(0, 1000),
        aiRaw: aiResponse.rawBody?.substring(0, 500),
      }
    })
  } catch (err) {
    res.json({ code: 500, msg: 'AI 调试失败', error: err.message })
  }
})

/**
 * @api GET /api/drug/ai-test
 * @desc AI 配置诊断接口（不泄露密钥），测试豆包 API 是否可连通
 */
router.get('/ai-test', async (req, res) => {
  const apiKey = process.env.API_KEY || ''
  const modelEpId = process.env.MODEL_EP_ID || ''
  const arkUrl = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'

  const info = {
    apiKeyConfigured: !!apiKey,
    apiKeyPreview: apiKey ? `${apiKey.substring(0, 6)}****${apiKey.substring(apiKey.length - 4)}` : '(未配置)',
    modelEpIdConfigured: !!modelEpId,
    modelEpIdPreview: modelEpId || '(未配置)',
    arkUrl,
  }

  if (!apiKey || !modelEpId) {
    return res.json({
      code: 200, msg: 'AI 配置不完整',
      data: { ...info, aiReady: false, error: '缺少 API_KEY 或 MODEL_EP_ID' }
    })
  }

  // 发一个最小测试请求
  try {
    const testResult = await new Promise((resolve) => {
      const parsedUrl = new URL(arkUrl)
      const options = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
      }

      const testReq = https.request(options, (testRes) => {
        let body = ''
        testRes.on('data', (chunk) => { body += chunk })
        testRes.on('end', () => {
          resolve({
            statusCode: testRes.statusCode,
            body: body.substring(0, 500),
          })
        })
      })

      testReq.on('error', (e) => {
        resolve({ error: e.message })
      })

      testReq.on('timeout', () => {
        testReq.destroy()
        resolve({ error: 'timeout' })
      })

      testReq.setTimeout(8000)

      testReq.write(JSON.stringify({
        model: modelEpId,
        messages: [{ role: 'user', content: '你好' }],
        max_tokens: 10,
        thinking: { type: 'disabled' },
      }))
      testReq.end()
    })

    const aiReady = testResult.statusCode === 200
    res.json({
      code: 200,
      msg: aiReady ? 'AI 连接正常' : 'AI 连接失败',
      data: {
        ...info,
        aiReady,
        testCall: testResult,
      }
    })
  } catch (e) {
    res.json({
      code: 200,
      msg: 'AI 测试异常',
      data: { ...info, aiReady: false, error: e.message }
    })
  }
})

module.exports = router
