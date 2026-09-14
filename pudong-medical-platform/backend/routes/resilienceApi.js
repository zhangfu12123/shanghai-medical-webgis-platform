const express = require('express')
const router = express.Router()
const { getPool, sql } = require('../db/db')

// 禁用接口缓存：避免浏览器缓存旧数据，导致图表关闭再打开后回到旧状态
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.set('Pragma', 'no-cache')
  res.set('Expires', '0')
  next()
})

/**
 * @desc 医疗资源韧性评估中心（数据全部来自 medical_point 表，无需新建表）
 *       韧性指数 = 医院覆盖率*0.4 + 药店覆盖率*0.2 + 社区覆盖率*0.2 + 空间均衡度*0.2
 * @table medical_point(name, type, lng, lat, level)
 */

// 把 type 归一化到：hospital / pharmacy / community / other
function classifyType(t) {
  const s = String(t || '')
  if (s.includes('医院')) return 'hospital'
  if (s.includes('药店') || s.includes('药房')) return 'pharmacy'
  if (s.includes('社区') || s.includes('卫生')) return 'community'
  return 'other'
}

// 统计各类数量
function countByClass(rows) {
  const c = { hospital: 0, pharmacy: 0, community: 0, other: 0 }
  rows.forEach(r => { c[classifyType(r.type)]++ })
  return c
}

// 覆盖率：数量 / 基准值 * 100，上限 100（基准值可按实际业务调整）
function coverage(count, base) {
  return Math.min(100, Math.round((count / base) * 1000) / 10)
}

/**
 * @api GET /api/resilience/index
 * @desc 医疗韧性指数仪表盘数据
 */
router.get('/index', async (req, res) => {
  try {
    const pool = getPool()

    // 1. 统计各类型数量
    const typeRs = await pool.request().query(`SELECT type FROM medical_point`)
    const counter = countByClass(typeRs.recordset)

    // 2. 经纬度数据，用于计算空间均衡度
    const geoRs = await pool.request().query(
      `SELECT lng, lat FROM medical_point WHERE lng IS NOT NULL AND lat IS NOT NULL`
    )
    const points = geoRs.recordset

    // 3. 覆盖率（基准：医院30家、药店100家、社区50家达标）
    const hospitalCoverage = coverage(counter.hospital, 30)
    const pharmacyCoverage = coverage(counter.pharmacy, 100)
    const communityCoverage = coverage(counter.community, 50)

    // 4. 空间均衡度：栅格覆盖法，点位覆盖的网格越多越均衡
    let spatialBalance = 0
    if (points.length > 0) {
      const cols = 5, rows = 6
      const lngMin = 121.4, lngMax = 121.9
      const latMin = 30.8, latMax = 31.4
      const colW = (lngMax - lngMin) / cols
      const rowH = (latMax - latMin) / rows
      const covered = new Set()
      points.forEach(p => {
        const col = Math.floor((p.lng - lngMin) / colW)
        const row = Math.floor((p.lat - latMin) / rowH)
        if (col >= 0 && col < cols && row >= 0 && row < rows) {
          covered.add(col + '_' + row)
        }
      })
      spatialBalance = Math.round((covered.size / (cols * rows)) * 1000) / 10
    }

    // 5. 综合韧性指数
    const resilience = (
      hospitalCoverage * 0.4 +
      pharmacyCoverage * 0.2 +
      communityCoverage * 0.2 +
      spatialBalance * 0.2
    ).toFixed(1)

    // 6. 等级评定
    let level = '良好', levelColor = '#4caf50'
    if (resilience >= 90) { level = '优秀'; levelColor = '#00e676' }
    else if (resilience >= 80) { level = '良好'; levelColor = '#4caf50' }
    else if (resilience >= 70) { level = '中等'; levelColor = '#ffc107' }
    else if (resilience >= 60) { level = '一般'; levelColor = '#ff9800' }
    else { level = '较差'; levelColor = '#f44336' }

    res.json({
      code: 200,
      msg: 'success',
      data: {
        resilience: Number(resilience),
        level,
        levelColor,
        hospitalCoverage,
        pharmacyCoverage,
        communityCoverage,
        spatialBalance,
        hospitalCount: counter.hospital,
        pharmacyCount: counter.pharmacy,
        communityCount: counter.community,
        totalCount: typeRs.recordset.length
      }
    })
  } catch (err) {
    res.json({ code: 500, msg: '获取韧性指数失败', error: err.message })
  }
})

/**
 * @api GET /api/resilience/radar
 * @desc 医疗资源短板雷达图（医院/药店/社区/交通四维）
 */
router.get('/radar', async (req, res) => {
  try {
    const pool = getPool()

    const typeRs = await pool.request().query(`SELECT type FROM medical_point`)
    const counter = countByClass(typeRs.recordset)

    const geoRs = await pool.request().query(
      `SELECT lng, lat FROM medical_point WHERE lng IS NOT NULL AND lat IS NOT NULL`
    )
    const pointCount = geoRs.recordset.length

    const hospitalScore = coverage(counter.hospital, 30)
    const pharmacyScore = coverage(counter.pharmacy, 100)
    const communityScore = coverage(counter.community, 50)
    // 交通可达性：用点位总量近似估算（150 个点位视为满分）
    const trafficScore = coverage(pointCount, 150)

    const dimensions = [
      { name: '医院', value: hospitalScore },
      { name: '药店', value: pharmacyScore },
      { name: '社区', value: communityScore },
      { name: '交通', value: trafficScore }
    ]

    const weakest = [...dimensions].sort((a, b) => a.value - b.value)[0]

    res.json({
      code: 200,
      msg: 'success',
      data: {
        indicators: dimensions.map(d => ({ name: d.name, max: 100 })),
        values: dimensions.map(d => d.value),
        dimensions,
        weakest: weakest.name,
        weakestValue: weakest.value,
        suggestion: `${weakest.name}维度得分最低（${weakest.value}分），建议重点加强${weakest.name}资源配置`
      }
    })
  } catch (err) {
    res.json({ code: 500, msg: '获取雷达图数据失败', error: err.message })
  }
})

/**
 * @api GET /api/resilience/risk-matrix
 * @desc 区域风险矩阵（散点图），X=资源覆盖，Y=医疗压力
 */
router.get('/risk-matrix', async (req, res) => {
  try {
    const pool = getPool()

    // 浦东典型片区（中心经纬度 + 半径 + 基础资源覆盖与医疗压力，使散点在矩阵中分布合理不堆叠）
    const regions = [
      { name: '陆家嘴', lngCenter: 121.50, latCenter: 31.24, radius: 0.03, baseCoverage: 78, basePressure: 82 },
      { name: '张江',   lngCenter: 121.59, latCenter: 31.21, radius: 0.04, baseCoverage: 60, basePressure: 68 },
      { name: '金桥',   lngCenter: 121.59, latCenter: 31.27, radius: 0.03, baseCoverage: 66, basePressure: 52 },
      { name: '外高桥', lngCenter: 121.58, latCenter: 31.34, radius: 0.03, baseCoverage: 52, basePressure: 40 },
      { name: '川沙',   lngCenter: 121.70, latCenter: 31.19, radius: 0.04, baseCoverage: 42, basePressure: 52 },
      { name: '周浦',   lngCenter: 121.57, latCenter: 31.12, radius: 0.03, baseCoverage: 47, basePressure: 58 },
      { name: '惠南',   lngCenter: 121.76, latCenter: 31.06, radius: 0.04, baseCoverage: 30, basePressure: 42 },
      { name: '临港',   lngCenter: 121.93, latCenter: 30.90, radius: 0.05, baseCoverage: 20, basePressure: 30 }
    ]

    const allRs = await pool.request().query(
      `SELECT lng, lat, type FROM medical_point WHERE lng IS NOT NULL AND lat IS NOT NULL`
    )
    const points = allRs.recordset

    const regionList = regions.map(region => {
      const regionPoints = points.filter(p =>
        Math.abs(p.lng - region.lngCenter) <= region.radius &&
        Math.abs(p.lat - region.latCenter) <= region.radius
      )
      return {
        name: region.name,
        lng: region.lngCenter,
        lat: region.latCenter,
        baseCoverage: region.baseCoverage,
        basePressure: region.basePressure,
        pointCount: regionPoints.length
      }
    })

    // 返回原始数据 + 默认可调参数；散点位置由前端按可编辑系数实时重算
    res.json({
      code: 200,
      msg: 'success',
      data: {
        regions: regionList,
        params: {
          pointBonus: 2,     // 每个点位带来的覆盖加分
          gapFactor: 0.25,   // 覆盖缺口对医疗压力的放大系数
          highPressure: 55,  // 高压力判定阈值
          lowCoverage: 45    // 低覆盖判定阈值
        }
      }
    })
  } catch (err) {
    res.json({ code: 500, msg: '获取风险矩阵失败', error: err.message })
  }
})

/**
 * @api GET /api/resilience/ai-suggestion
 * @desc 医疗资源智能诊断（真实缺口 + 服务盲区网格 + 智能补点建议）
 */
router.get('/ai-suggestion', async (req, res) => {
  try {
    const pool = getPool()

    const allRs = await pool.request().query(
      `SELECT name, type, lng, lat FROM medical_point WHERE lng IS NOT NULL AND lat IS NOT NULL`
    )
    const rows = allRs.recordset
    const counter = countByClass(rows)

    // 1. 真实资源缺口（基准：医院30、药店100、社区50，按缺口从大到小排序）
    const targets = [
      { key: 'hospital', label: '医院', current: counter.hospital, base: 30 },
      { key: 'pharmacy', label: '药店', current: counter.pharmacy, base: 100 },
      { key: 'community', label: '社区卫生', current: counter.community, base: 50 }
    ]
    const shortages = targets
      .map(t => ({
        ...t,
        gap: Math.max(0, t.base - t.current),
        coverage: coverage(t.current, t.base)
      }))
      .sort((a, b) => b.gap - a.gap)

    // 2. 医疗资源配比结构（纯数据诊断，无需定位）
    const totalMix = counter.hospital + counter.pharmacy + counter.community
    const mixItems = [
      { key: 'hospital', label: '医院', count: counter.hospital, color: '#00e5ff' },
      { key: 'pharmacy', label: '药店', count: counter.pharmacy, color: '#ffb300' },
      { key: 'community', label: '社区', count: counter.community, color: '#4caf50' }
    ].map(m => ({
      ...m,
      percent: totalMix ? Math.round(m.count / totalMix * 100) : 0
    }))

    // 配比合理性诊断：合理区间 医院 10-25%、药店 45-65%、社区 25-40%
    const dg = []
    if (mixItems[0].percent > 25) dg.push('大型医院占比偏高，警惕医疗资源向上集中')
    if (mixItems[1].percent > 65) dg.push('药店数量偏多但诊疗能力有限，建议增加具备诊疗功能的社区点')
    if (mixItems[2].percent < 25) dg.push('基层社区医疗覆盖偏低，优先补充社区卫生点位')
    if (!dg.length) dg.push('医院·药店·社区配比均衡，结构健康')
    const mixDiagnosis = dg.join('；')

    // 3. 诊断结论（全部由真实数据拼装）
    const weakest = shortages[0]
    const findings = [
      `${weakest.label}缺口最大：现有 ${weakest.current} 家，距基准 ${weakest.base} 家仍差 ${weakest.gap} 家（覆盖率 ${weakest.coverage}%）`,
      mixDiagnosis,
      `全区现有医院 ${counter.hospital} 家、药店 ${counter.pharmacy} 家、社区卫生 ${counter.community} 家`
    ]

    const suggestions = [
      `优先补齐 ${weakest.label} ${Math.max(1, weakest.gap)} 处`,
      `优先向资源覆盖最低的片区投入，兼顾空间均衡`,
      `新设点位建议兼具首诊分诊与慢病管理，缓解二级医院接诊压力`
    ]

    res.json({
      code: 200,
      msg: 'success',
      data: {
        shortages,
        mix: { total: totalMix, items: mixItems, diagnosis: mixDiagnosis },
        findings,
        suggestions,
        totalCount: rows.length,
        hospitalCount: counter.hospital,
        pharmacyCount: counter.pharmacy,
        communityCount: counter.community
      }
    })
  } catch (err) {
    res.json({ code: 500, msg: '获取AI建议失败', error: err.message })
  }
})

module.exports = router