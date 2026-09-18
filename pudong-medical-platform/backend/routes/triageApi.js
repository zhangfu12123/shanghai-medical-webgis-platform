const express = require('express')
const router = express.Router()
const { getPool, sql } = require('../db/db')

/**
 * 智慧导诊后端（全新独立功能）
 * 说明：
 *  1) 不新增任何数据表，仅「读取」已有的 dbo.doctor 表（含 department 科室字段）。
 *  2) 症状 → 科室的匹配以数据库中真实存在的科室名为准，找不到匹配医生时也不会报错。
 *  3) 不依赖、不改动任何现有接口。
 * 挂载前缀建议：app.use('/api/triage', require('./routes/triageApi'))
 */

// ============ 症状 → 科室 知识库 ============
// name:  标准科室名（作为兜底显示）
// hints: 与数据库真实科室名匹配的识别词（按"越具体越靠前"排序）
// keywords: 症状 / 关键词
const DEPT_RULES = [
  {
    name: '呼吸内科',
    hints: ['呼吸', '肺', '胸内'],
    keywords: ['咳嗽', '咳痰', '咽痛', '流鼻涕', '鼻塞', '打喷嚏', '气短', '气促', '气喘', '呼吸困难', '胸闷', '咯血', '痰', '感冒', '发烧', '发热', '嗓子疼', '咽喉痛', '扁桃体']
  },
  {
    name: '心血管内科',
    hints: ['心血管', '心内', '心脏', '心外'],
    keywords: ['胸痛', '心悸', '心慌', '心痛', '心律', '血压', '高血压', '胸闷', '气短', '晕厥']
  },
  {
    name: '消化内科',
    hints: ['消化', '胃肠', '肝胆', '脾胃'],
    keywords: ['腹痛', '腹胀', '恶心', '呕吐', '腹泻', '拉肚子', '便秘', '反酸', '烧心', '胃痛', '胃胀', '嗳气', '便血', '黑便', '消化不良', '肚子痛', '肚子胀']
  },
  {
    name: '神经内科',
    hints: ['神经内', '脑内', '神内', '脑'],
    keywords: ['头痛', '头晕', '眩晕', '失眠', '记忆力下降', '记忆力', '麻木', '肢体无力', '抽搐', '偏瘫', '面瘫', '手脚麻', '手抖', '晕厥', '癫痫', '震颤']
  },
  {
    name: '骨科',
    hints: ['骨科', '骨', '关节', '脊柱', '手外'],
    keywords: ['关节痛', '腰背痛', '颈肩痛', '腰痛', '骨折', '扭伤', '骨痛', '肌肉酸痛', '颈椎', '腰椎', '膝盖痛', '肩膀痛', '腿痛', '肩周炎', '腰间盘']
  },
  {
    name: '皮肤科',
    hints: ['皮肤', '皮科'],
    keywords: ['皮疹', '瘙痒', '脱发', '红肿', '荨麻疹', '湿疹', '痘痘', '过敏', '斑', '皮肤痒', '灰指甲', '牛皮癣']
  },
  {
    name: '泌尿外科',
    hints: ['泌尿', '肾内', '肾病'],
    keywords: ['尿频', '尿急', '尿痛', '血尿', '排尿', '肾结石', '尿路', '膀胱', '尿不尽', '尿道']
  },
  {
    name: '眼科',
    hints: ['眼科', '眼'],
    keywords: ['眼痛', '眼红', '视力下降', '视力', '眼干', '流泪', '视物模糊', '眼睛', '结膜', '眼痒', '近视', '白内障']
  },
  {
    name: '耳鼻喉科',
    hints: ['耳鼻喉', '耳鼻咽喉', '头颈'],
    keywords: ['耳鸣', '听力下降', '听力', '鼻出血', '打鼾', '鼻炎', '中耳炎', '嗓子', '喉咙', '耳痛', '咽部', '嗓子疼', '咽喉痛']
  },
  {
    name: '口腔科',
    hints: ['口腔', '牙'],
    keywords: ['牙痛', '牙齿', '口腔', '口臭', '牙龈', '龋齿', '牙疼', '智齿', '嘴']
  },
  {
    name: '内分泌科',
    hints: ['内分泌'],
    keywords: ['口渴', '多饮', '多尿', '消瘦', '肥胖', '甲亢', '甲减', '血糖', '甲状腺', '怕热', '水肿', '糖尿病', '体重下降']
  },
  {
    name: '妇产科',
    hints: ['妇产', '妇科', '产科'],
    keywords: ['月经不调', '痛经', '白带异常', '白带', '孕', '流产', '下腹', '月经', '阴道', '产科']
  },
  {
    name: '儿科',
    hints: ['儿科', '小儿'],
    keywords: ['小儿', '儿童', '婴儿', '宝宝', '孩子', '新生儿']
  },
  {
    name: '精神心理科',
    hints: ['精神', '心理'],
    keywords: ['焦虑', '抑郁', '情绪低落', '睡眠障碍', '压力', '烦躁', '恐惧', '易怒', '心情差', '失眠']
  },
  {
    name: '中医科',
    hints: ['中医', '康复医', '针灸'],
    keywords: ['调理', '体虚', '乏力', '盗汗', '畏寒', '上火', '湿气', '亚健康', '怕冷', '气虚']
  },
  {
    name: '普通内科',
    hints: ['全科', '综合', '门诊', '普通内科', '内科'],
    keywords: ['发热', '乏力', '全身酸痛', '体检', '不适', '发烧', '全身', '低烧']
  }
]

// 急重症红旗症状（命中即提示急诊）
const EMERGENCY = ['胸痛', '呼吸困难', '昏迷', '意识模糊', '大出血', '抽搐', '高热', '吐血', '咯血', '黑便', '窒息', '剧烈头痛', '晕厥']

// ============ 工具函数 ============
function tokenize(symptoms, keywords) {
  const tokens = []
  ;(symptoms || []).forEach(s => { if (s) tokens.push(String(s).trim()) })
  if (keywords) {
    String(keywords).split(/[\s,，、;；/|]+/).forEach(k => {
      if (k && k.trim()) tokens.push(k.trim())
    })
  }
  return [...new Set(tokens.filter(Boolean))]
}

function match(a, b) {
  return a.includes(b) || b.includes(a)
}

// 把一条规则映射到数据库中真实存在的科室名（无匹配则退回标准名）
function resolveDept(rule, realDepts) {
  for (const h of rule.hints) {
    const hit = realDepts.find(d => d.includes(h))
    if (hit) return hit
  }
  return rule.name
}

// 查询某科室医生：先按科室名精确匹配，匹配不到再按识别词模糊兜底
async function queryDoctors(dept, hint) {
  const pool = getPool()
  let reqDb = pool.request()
  reqDb.input('dept', sql.NVarChar(50), dept)
  let rs = await reqDb.query('SELECT TOP 6 * FROM dbo.doctor WHERE department = @dept ORDER BY hospital_id, title')
  if (rs.recordset.length > 0) return rs.recordset

  const kw = hint || dept.replace(/科$/, '')
  reqDb = pool.request()
  reqDb.input('kw', sql.NVarChar(50), kw)
  rs = await reqDb.query("SELECT TOP 6 * FROM dbo.doctor WHERE department LIKE N'%' + @kw + N'%' ORDER BY hospital_id, title")
  return rs.recordset
}

// ============ 接口 ============

// 智能导诊分析
router.post('/analyze', async (req, res) => {
  try {
    const { symptoms, keywords, age, gender, duration } = req.body || {}
    const tokens = tokenize(symptoms, keywords)
    if (tokens.length === 0) {
      return res.json({ code: 400, msg: '请至少选择一个症状或输入症状关键词' })
    }

    // 读取数据库中真实存在的科室（表缺失等异常时退化为静态标准名，不影响导诊）
    let realDepts = []
    try {
      const pool = getPool()
      const rs = await pool.request().query(
        "SELECT DISTINCT department FROM dbo.doctor WHERE department IS NOT NULL AND department <> N'' ORDER BY department"
      )
      realDepts = rs.recordset.map(r => String(r.department).trim()).filter(Boolean)
    } catch (e) {
      realDepts = []
    }

    // 累计：每条规则命中的症状 → 映射到真实科室名
    const scoreMap = {} // dept -> { count, reasons, hint }
    const addDept = (dept, reason, hint) => {
      if (!dept) return
      if (!scoreMap[dept]) scoreMap[dept] = { count: 0, reasons: [], hint: hint || dept }
      scoreMap[dept].count += 1
      scoreMap[dept].reasons.push(reason)
    }

    tokens.forEach(t => {
      DEPT_RULES.forEach(rule => {
        if (rule.keywords.some(k => match(k, t))) {
          addDept(resolveDept(rule, realDepts), t, rule.hints[0])
        }
      })
    })

    // 年龄 < 14 时向儿科加权
    const ageNum = Number(age)
    if (age != null && !Number.isNaN(ageNum) && ageNum >= 0 && ageNum < 14) {
      const pediaRule = DEPT_RULES.find(r => r.name === '儿科')
      if (pediaRule) addDept(resolveDept(pediaRule, realDepts), '年龄小于14岁', pediaRule.hints[0])
    }

    const scored = Object.keys(scoreMap)
      .map(dept => ({ dept, count: scoreMap[dept].count, reasons: scoreMap[dept].reasons, hint: scoreMap[dept].hint }))
      .sort((a, b) => b.count - a.count)

    const total = tokens.length
    const toScore = (n) => Math.min(99, Math.round((n / total) * 100))

    // 无任何匹配时的兜底
    if (scored.length === 0) {
      const dept = realDepts.find(d => d.includes('全科') || d.includes('综合')) || realDepts.find(d => d.includes('内科')) || realDepts[0] || '普通内科'
      let doctors = []
      try { doctors = await queryDoctors(dept, null) } catch (e) { doctors = [] }
      return res.json({
        code: 200,
        data: {
          top: { dept, score: 50, reasons: tokens },
          candidates: [],
          level: 'prompt',
          levelText: '建议就诊',
          advice: ['未能精确匹配到科室，建议前往「' + dept + '」进一步分诊。'],
          matchedSymptoms: tokens,
          doctors
        }
      })
    }

    const top = scored[0]
    const candidates = scored.slice(0, 3).map(d => ({ dept: d.dept, score: toScore(d.count), reasons: d.reasons }))

    // 紧急度分级
    const emergency = tokens.some(t => EMERGENCY.some(e => match(e, t)))
    const dur = Number(duration) || 0
    let level = 'observe'
    let levelText = '可先居家观察'
    let advice = []

    if (emergency) {
      level = 'urgent'
      levelText = '建议立即就医'
      advice = [
        '你描述的症状涉及急重症风险，建议立即前往急诊科就诊，必要时拨打 120。',
        `急诊处理稳定后，可转诊至「${top.dept}」进一步诊疗。`
      ]
    } else if (top.count >= 2 || dur >= 7) {
      level = 'prompt'
      levelText = '建议尽快就诊'
      advice = [
        `建议在 24~48 小时内预约「${top.dept}」就诊，避免延误。`,
        '就诊前可记录体温、症状变化与用药情况，方便医生快速判断。'
      ]
    } else {
      level = 'observe'
      levelText = '可先居家观察'
      advice = [
        '症状较轻，可先居家观察 1~2 天，注意休息、多饮水、清淡饮食。',
        '若症状加重、持续不退或出现新症状，请及时预约「' + top.dept + '」就诊。'
      ]
    }

    // 查询推荐科室的真实医生
    let doctors = []
    try { doctors = await queryDoctors(top.dept, top.hint) } catch (e) { doctors = [] }

    res.json({
      code: 200,
      data: {
        top: { dept: top.dept, score: toScore(top.count), reasons: top.reasons },
        candidates,
        level,
        levelText,
        advice,
        matchedSymptoms: tokens,
        doctors
      }
    })
  } catch (err) {
    console.error('【智慧导诊异常】', err)
    res.json({ code: 500, msg: '导诊分析失败', error: err.message })
  }
})

module.exports = router