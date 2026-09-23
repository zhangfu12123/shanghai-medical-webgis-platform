<template>
  <div class="resilience-panel">
    <!-- 顶部标题 -->
    <div class="panel-header">
      <div class="panel-title-row">
        <span class="panel-kicker">MEDICAL RESILIENCE</span>
        <strong>医疗资源韧性评估中心</strong>
      </div>
      <span class="panel-index">03</span>
    </div>

    <!-- 数据加载错误提示 -->
    <div class="error-banner" v-if="errorMsg">
      <span class="err-icon">⚠</span>
      <span class="err-text">{{ errorMsg }}</span>
    </div>

    <!-- ① 医疗韧性指数仪表盘 -->
    <div class="card-section">
      <div class="section-title"><i class="dot dot-cyan"></i>医疗韧性指数</div>
      <div class="gauge-wrap">
        <div ref="gaugeRef" class="gauge-chart"></div>
      </div>
      <div class="score-row">
        <div class="gauge-num" :style="{ color: frontLevel.color }">{{ frontResilience }}</div>
        <div class="gauge-level" :style="{ color: frontLevel.color }">{{ frontLevel.level }}</div>
      </div>
      <div class="metric-list">
        <div class="metric-item" v-for="m in metrics" :key="m.key">
          <div class="metric-head"><span>{{ m.label }}</span><b>{{ m.value }}%</b></div>
          <div class="metric-bar"><i :style="{ width: m.value + '%', background: m.color }"></i></div>
        </div>
      </div>
    </div>

    <!-- ①.① 韧性指数公式 -->
    <div class="card-section formula-section">
      <div class="section-title"><i class="dot dot-ai"></i>韧性指数公式<em class="tag"></em></div>
      <div class="formula-row">
        <span class="f-eq">score =</span>
        <span class="f-term">医院
          <input type="number" v-model.number="weights.hospital" step="0.05" min="0" max="1">
        </span>
        <span class="f-op">+</span>
        <span class="f-term">药店
          <input type="number" v-model.number="weights.pharmacy" step="0.05" min="0" max="1">
        </span>
        <span class="f-op">+</span>
        <span class="f-term">社区
          <input type="number" v-model.number="weights.community" step="0.05" min="0" max="1">
        </span>
        <span class="f-op">+</span>
        <span class="f-term">空间
          <input type="number" v-model.number="weights.spatial" step="0.05" min="0" max="1">
        </span>
      </div>
      <div class="formula-foot">
        <span>权重合计 <b :class="{ bad: weightSum !== 1 }">{{ weightSum }}</b>（建议 = 1）</span>
        <button class="reset-btn" @click="resetWeights">恢复默认</button>
      </div>
    </div>

    <!-- ② 医疗资源短板雷达图 -->
    <div class="card-section">
      <div class="section-title"><i class="dot dot-orange"></i>医疗资源短板雷达</div>
      <div ref="radarRef" class="radar-chart"></div>
      <div class="radar-warning" v-if="radarData.suggestion">
        <span class="warn-tag">短板</span>
        <span>{{ radarData.suggestion }}</span>
      </div>
    </div>

    <!-- ③ 区域风险矩阵 -->
    <div class="card-section">
      <div class="section-title"><i class="dot dot-red"></i>区域风险矩阵</div>
      <div ref="scatterRef" class="scatter-chart"></div>
      <div class="scatter-legend">
        <span><i class="lg lg-high"></i>高风险</span>
        <span><i class="lg lg-mid"></i>中风险</span>
        <span><i class="lg lg-low"></i>低风险</span>
      </div>

      <div class="risk-summary">
        <span class="rs-item rs-high">高风险 <b>{{ riskSummary.high }}</b></span>
        <span class="rs-item rs-mid">中风险 <b>{{ riskSummary.mid }}</b></span>
        <span class="rs-item rs-low">低风险 <b>{{ riskSummary.low }}</b></span>
        <span class="rs-weakest" v-if="riskSummary.weakest">覆盖最弱：{{ riskSummary.weakest }}</span>
      </div>

      <div class="risk-tuner">
        <div class="tuner-head">模型参数<em class="tag"></em></div>
        <div class="tuner-grid">
          <label class="tuner-item">点位加分
            <input type="number" v-model.number="riskParams.pointBonus" step="0.5" min="0" max="10">
          </label>
          <label class="tuner-item">缺口系数
            <input type="number" v-model.number="riskParams.gapFactor" step="0.05" min="0" max="1">
          </label>
          <label class="tuner-item">高压阈值
            <input type="number" v-model.number="riskParams.highPressure" step="1" min="0" max="100">
          </label>
          <label class="tuner-item">低盖阈值
            <input type="number" v-model.number="riskParams.lowCoverage" step="1" min="0" max="100">
          </label>
        </div>
        <button class="reset-btn" @click="resetRiskParams">恢复默认</button>
      </div>

      <div class="simulation">
        <div class="sim-head">
          <span>调度推演 · 新增医疗点</span>
          <b>{{ simulateCount }} 个</b>
        </div>
        <input type="range" min="0" max="30" step="1" v-model.number="simulateCount" class="sim-slider">
        <div class="sim-tip" v-if="simulateCount > 0">已按贪心策略补给覆盖最低的片区，观察散点右移、风险下降</div>
        <div class="sim-tip" v-else>拖动滑块，优先给薄弱片区补点</div>
      </div>
    </div>

    <!-- ④ 医疗资源智能诊断 -->
    <div class="card-section ai-section">
      <div class="section-title"><i class="dot dot-ai"></i>医疗资源智能诊断</div>

      <div class="ai-block">
        <div class="ai-label">资源缺口</div>
        <div class="shortage-list">
          <div class="shortage-item" v-for="s in aiData.shortages" :key="s.key">
            <div class="sh-head">
              <span>{{ s.label }}</span>
              <b :class="{ zero: s.gap === 0 }">{{ s.gap === 0 ? '已达标' : '缺口 ' + s.gap + ' 处' }}</b>
            </div>
            <div class="sh-meta">现有 {{ s.current }} 家 · 基准 {{ s.base }} 家 · 覆盖率 {{ s.coverage }}%</div>
            <div class="sh-bar"><i :style="{ width: s.coverage + '%' }"></i></div>
          </div>
        </div>
      </div>

      <div class="ai-block">
        <div class="ai-label">资源配比结构</div>
        <div class="mix-bar">
          <i
            v-for="m in aiData.mix.items"
            :key="m.key"
            :style="{ width: m.percent + '%', background: m.color }"
          ></i>
        </div>
        <div class="mix-legend">
          <span v-for="m in aiData.mix.items" :key="m.key">
            <i :style="{ background: m.color }"></i>{{ m.label }} {{ m.count }} 家 · {{ m.percent }}%
          </span>
        </div>
        <div class="mix-diagnosis">{{ aiData.mix.diagnosis }}</div>
      </div>

      <div class="ai-block">
        <div class="ai-label">诊断结论</div>
        <ul class="ai-list">
          <li v-for="(f, i) in aiData.findings" :key="'f' + i">{{ f }}</li>
        </ul>
      </div>
      <div class="ai-block">
        <div class="ai-label">调度建议</div>
        <ul class="ai-list">
          <li v-for="(s, i) in aiData.suggestions" :key="'s' + i">{{ s }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import request from '../api/request'

const emit = defineEmits(['locate-map'])

// 后端返回的基础数据（四个维度的覆盖率）
const rawIndex = reactive({
  hospitalCoverage: 0,
  pharmacyCoverage: 0,
  communityCoverage: 0,
  spatialBalance: 0
})

// 可编辑的权重（默认与后端公式一致）
const weights = reactive({
  hospital: 0.4,
  pharmacy: 0.2,
  community: 0.2,
  spatial: 0.2
})

// 权重合计
const weightSum = computed(() =>
  +(weights.hospital + weights.pharmacy + weights.community + weights.spatial).toFixed(2)
)

// 前端重算韧性指数（用户改权重即实时变化）
const frontResilience = computed(() => {
  const r =
    rawIndex.hospitalCoverage * (weights.hospital || 0) +
    rawIndex.pharmacyCoverage * (weights.pharmacy || 0) +
    rawIndex.communityCoverage * (weights.community || 0) +
    rawIndex.spatialBalance * (weights.spatial || 0)
  return Math.round(r * 10) / 10
})

// 等级评定
const frontLevel = computed(() => {
  const v = frontResilience.value
  if (v >= 90) return { level: '优秀', color: '#00e676' }
  if (v >= 80) return { level: '良好', color: '#4caf50' }
  if (v >= 70) return { level: '中等', color: '#ffc107' }
  if (v >= 60) return { level: '一般', color: '#ff9800' }
  return { level: '较差', color: '#f44336' }
})

// 四项指标（用于列表进度条）
const metrics = computed(() => {
  const wSum = weightSum.value || 1
  return [
    { key: 'hospital', label: '医院覆盖率', value: Math.round(rawIndex.hospitalCoverage * (weights.hospital || 0) / wSum), color: '#00e5ff' },
    { key: 'pharmacy', label: '药店覆盖率', value: Math.round(rawIndex.pharmacyCoverage * (weights.pharmacy || 0) / wSum), color: '#ffb300' },
    { key: 'community', label: '社区覆盖率', value: Math.round(rawIndex.communityCoverage * (weights.community || 0) / wSum), color: '#4caf50' },
    { key: 'spatial', label: '空间均衡度', value: Math.round(rawIndex.spatialBalance * (weights.spatial || 0) / wSum), color: '#b388ff' }
  ]
})


const radarData = ref({ indicators: [], values: [], dimensions: [], weakest: '', weakestValue: 0, suggestion: '' })
const aiData = ref({ shortages: [], mix: { items: [], diagnosis: '' }, findings: [], suggestions: [] })
const errorMsg = ref('')
const computedRadarValues = computed(() => {
  const indicators = radarData.value.indicators || []
  const originValues = radarData.value.values || []
  if (!indicators.length) return []
  // 假设雷达图的前四个维度依次对应：医院、药店、社区、空间
  const weightArr = [weights.hospital, weights.pharmacy, weights.community, weights.spatial]
  return originValues.map((v, i) => {
    const w = weightArr[i] || 0
    return Math.round(v * w)
  })
})


// 风险矩阵：原始片区数据 + 可调模型参数 + 调度推演
const riskRegions = ref([])
const riskParams = reactive({
  pointBonus: 2,
  gapFactor: 0.25,
  highPressure: 55,
  lowCoverage: 45
})
const simulateCount = ref(0)

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v))
}

// 依据可调参数实时计算每个片区的散点坐标与风险等级
const scatterPoints = computed(() => {
  const pointBonus = Number(riskParams.pointBonus) || 0
  const gapFactor = Number(riskParams.gapFactor) || 0
  const highPressure = Number(riskParams.highPressure) || 55
  const lowCoverage = Number(riskParams.lowCoverage) || 45
  const totalExtra = Math.max(0, Math.round(Number(simulateCount.value) || 0))

  // 先按真实数据算当前覆盖
  const list = riskRegions.value.map(r => ({
    ...r,
    extra: 0,
    coverage: clamp(r.baseCoverage + r.pointCount * pointBonus, 5, 100)
  }))

  // 调度推演：新增点位贪心分配给当前覆盖最低的片区
  for (let i = 0; i < totalExtra; i++) {
    const lowest = list.reduce((a, b) => (a.coverage < b.coverage ? a : b))
    lowest.extra++
    lowest.coverage = clamp(lowest.baseCoverage + (lowest.pointCount + lowest.extra) * pointBonus, 5, 100)
  }

  return list.map(d => {
    const coverageGap = Math.max(0, 60 - d.coverage)
    const pressure = clamp(d.basePressure + coverageGap * gapFactor, 10, 100)

    let riskLevel = '低风险', riskColor = '#4caf50'
    if (pressure >= highPressure && d.coverage < lowCoverage) { riskLevel = '高风险'; riskColor = '#f44336' }
    else if (pressure >= highPressure || d.coverage < lowCoverage) { riskLevel = '中风险'; riskColor = '#ffc107' }

    return {
      name: d.name,
      lng: d.lng,
      lat: d.lat,
      value: [Math.round(d.coverage), Math.round(pressure)],
      riskLevel,
      riskColor,
      pointCount: d.pointCount,
      extra: d.extra
    }
  })
})

// 风险统计摘要
const riskSummary = computed(() => {
  const list = scatterPoints.value
  const high = list.filter(d => d.riskLevel === '高风险').length
  const mid = list.filter(d => d.riskLevel === '中风险').length
  const low = list.filter(d => d.riskLevel === '低风险').length
  const weakest = list.reduce((a, b) => (a.value[0] < b.value[0] ? a : b), list[0] || null)
  return { high, mid, low, weakest: weakest ? weakest.name : '' }
})

// 图表实例
let gaugeChart = null
let radarChart = null
let scatterChart = null
let resizeObserver = null

const gaugeRef = ref(null)
const radarRef = ref(null)
const scatterRef = ref(null)

const C_BLUE = '#00e5ff'

/* ---------- Gauge ---------- */
function initGauge() {
  if (!gaugeRef.value) return
  // 不传主题，背景透明，避免深色 canvas 形成「黑框」
  gaugeChart = echarts.init(gaugeRef.value)
  updateGauge()
}

function updateGauge() {
  if (!gaugeChart) return
  const val = Number(frontResilience.value)
  gaugeChart.setOption({
    series: [{
      type: 'gauge',
      min: 0,
      max: 100,
      splitNumber: 4,
      radius: '84%',
      center: ['50%', '52%'],
      startAngle: 210,
      endAngle: -30,
      axisLine: {
        lineStyle: {
          width: 18,
          color: [
            [0.6, '#f44336'],
            [0.75, '#ff9800'],
            [0.9, '#4caf50'],
            [1, '#00e676']
          ]
        }
      },
      splitLine: { length: 12, lineStyle: { color: '#1a2c40', width: 2 } },
      axisTick: { show: false },
      axisLabel: {
        distance: 24,
        color: '#cfeffb',
        fontSize: 14,
        fontWeight: '700',
        formatter: v => v
      },
      pointer: { width: 5, length: '56%', itemStyle: { color: C_BLUE } },
      anchor: { show: true, size: 8, itemStyle: { color: C_BLUE } },
      detail: { show: false },
      data: [{ value: isNaN(val) ? 0 : val, name: '' }]
    }]
  })
}

/* ---------- Radar ---------- */
function initRadar() {
  if (!radarRef.value) return
  radarChart = echarts.init(radarRef.value, 'dark')
  // 无数据时不渲染，避免 ECharts 雷达图空 indicator 崩溃
}

function updateRadar() {
  if (!radarChart) return
  const indicators = (radarData.value.indicators || []).map(d => ({ name: d.name, max: 100 }))
  const values = radarData.value.values || []
  if (!indicators.length || !values.length) return

  radarChart.setOption({
    radar: {
      center: ['50%', '52%'],
      radius: '62%',
      splitNumber: 5,
      indicator: indicators,
      splitArea: { areaStyle: { color: ['rgba(0,229,255,0.02)', 'rgba(0,229,255,0.05)'] } },
      splitLine: { lineStyle: { color: 'rgba(0,229,255,0.22)' } },
      axisLine: { lineStyle: { color: 'rgba(0,229,255,0.3)' } },
      axisName: { color: '#eafcff', fontSize: 14, fontWeight: '700' }
    },
    series: [{
      type: 'radar',
      symbol: 'circle',
      symbolSize: 7,
      label: {
        show: true,
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
        formatter: p => p.value
      },
      data: [{
        value: values,
        name: '资源覆盖',
        lineStyle: { color: C_BLUE, width: 3 },
        itemStyle: { color: C_BLUE },
        areaStyle: { color: 'rgba(0,229,255,0.25)' }
      }]
    }]
  })
}

/* ---------- Scatter ---------- */
function initScatter() {
  if (!scatterRef.value) return
  scatterChart = echarts.init(scatterRef.value, 'dark')
  // 点击散点 → 联动地图定位到该片区
  scatterChart.on('click', p => {
    if (p.data && p.data.lng != null && p.data.lat != null) {
      emit('locate-map', { lng: p.data.lng, lat: p.data.lat, name: p.data.name })
    }
  })
  updateScatter()
}

function updateScatter() {
  if (!scatterChart) return
  const list = scatterPoints.value || []

  scatterChart.setOption({
    grid: { left: 56, right: 24, top: 32, bottom: 40 },
    xAxis: {
      name: '资源覆盖 →',
      nameLocation: 'middle',
      nameGap: 30,
      nameTextStyle: { color: '#7ee8ff', fontSize: 12 },
      min: 0,
      max: 100,
      interval: 25,
      splitLine: { show: false },
      axisLabel: { color: '#9fd8e8', fontSize: 11 },
      axisLine: { lineStyle: { color: 'rgba(0,229,255,0.4)' } },
      axisTick: { show: false }
    },
    yAxis: {
      name: '医疗压力 →',
      nameLocation: 'middle',
      nameGap: 38,
      nameTextStyle: { color: '#ffb300', fontSize: 12 },
      min: 0,
      max: 100,
      interval: 25,
      splitLine: { show: false },
      axisLabel: { color: '#9fd8e8', fontSize: 11 },
      axisLine: { lineStyle: { color: 'rgba(0,229,255,0.4)' } },
      axisTick: { show: false }
    },
    tooltip: {
      trigger: 'item',
      formatter: p => {
        const extra = p.data.extra ? `<br/>调度新增：+${p.data.extra} 点` : ''
        return `${p.data.name}（${p.data.riskLevel}）<br/>资源覆盖：${p.value[0]}<br/>医疗压力：${p.value[1]}${extra}`
      }
    },
    series: [{
      type: 'scatter',
      symbolSize: 18,
      label: {
        show: true,
        position: 'top',
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
        formatter: p => p.data.name
      },
      labelLayout: { hideOverlap: true },
      markArea: {
        silent: true,
        data: [
          [{ xAxis: 0, yAxis: 50, itemStyle: { color: 'rgba(244,67,54,0.10)' } }, { xAxis: 50, yAxis: 100 }],
          [{ xAxis: 50, yAxis: 50, itemStyle: { color: 'rgba(255,193,7,0.06)' } }, { xAxis: 100, yAxis: 100 }],
          [{ xAxis: 0, yAxis: 0, itemStyle: { color: 'rgba(255,193,7,0.06)' } }, { xAxis: 50, yAxis: 50 }],
          [{ xAxis: 50, yAxis: 0, itemStyle: { color: 'rgba(76,175,80,0.10)' } }, { xAxis: 100, yAxis: 50 }]
        ]
      },
      markLine: {
        silent: true,
        symbol: 'none',
        lineStyle: { color: 'rgba(255,255,255,0.28)', type: 'dashed', width: 1 },
        data: [
          { xAxis: 50 },
          { yAxis: 50 }
        ]
      },
      data: list.map(d => ({
        name: d.name,
        lng: d.lng,
        lat: d.lat,
        riskLevel: d.riskLevel,
        extra: d.extra,
        value: d.value,
        itemStyle: {
          color: d.riskColor,
          shadowBlur: 12,
          shadowColor: d.riskColor,
          borderColor: 'rgba(255,255,255,0.85)',
          borderWidth: 1
        }
      }))
    }]
  })
}

/* ---------- 加载数据 ---------- */
async function loadAllData() {
  errorMsg.value = ''
  const errors = []

  const safeGet = async (url) => {
    // 追加时间戳，绕开浏览器对 GET 接口的缓存
    const sep = url.includes('?') ? '&' : '?'
    try {
      return await request.get(`${url}${sep}_t=${Date.now()}`)
    } catch (e) {
      errors.push(`${url} 请求失败（${e?.message || e}）`)
      return null
    }
  }

  const [indexRes, radarRes, scatterRes, aiRes] = await Promise.all([
    safeGet('/resilience/index'),
    safeGet('/resilience/radar'),
    safeGet('/resilience/risk-matrix'),
    safeGet('/resilience/ai-suggestion')
  ])

  if (indexRes?.code === 200 && indexRes.data) {
    rawIndex.hospitalCoverage = indexRes.data.hospitalCoverage || 0
    rawIndex.pharmacyCoverage = indexRes.data.pharmacyCoverage || 0
    rawIndex.communityCoverage = indexRes.data.communityCoverage || 0
    rawIndex.spatialBalance = indexRes.data.spatialBalance || 0
  } else if (indexRes) {
    errors.push(`韧性指数接口：${indexRes.msg || '返回结构异常'}`)
  }

  if (radarRes?.code === 200 && radarRes.data) {
    radarData.value = radarRes.data
  } else if (radarRes) {
    errors.push(`雷达图接口：${radarRes.msg || '返回结构异常'}`)
  }

  if (scatterRes?.code === 200 && scatterRes.data) {
    riskRegions.value = scatterRes.data.regions || []
    const p = scatterRes.data.params || {}
    if (p.pointBonus != null) riskParams.pointBonus = p.pointBonus
    if (p.gapFactor != null) riskParams.gapFactor = p.gapFactor
    if (p.highPressure != null) riskParams.highPressure = p.highPressure
    if (p.lowCoverage != null) riskParams.lowCoverage = p.lowCoverage
  } else if (scatterRes) {
    errors.push(`风险矩阵接口：${scatterRes.msg || '返回结构异常'}`)
  }

  if (aiRes?.code === 200 && aiRes.data) {
    aiData.value = aiRes.data
  } else if (aiRes) {
    errors.push(`AI建议接口：${aiRes.msg || '返回结构异常'}`)
  }

  // 数据就绪后渲染各图表
  updateGauge()
  updateRadar()
  updateScatter()

  if (errors.length) {
    errorMsg.value = errors.join('；')
    console.error('韧性评估数据加载失败：', errors)
  }

  // 等 DOM 布局稳定后再 resize，避免面板刚从隐藏切回显示时容器尺寸为 0 导致图表被压缩
  nextTick(() => {
    requestAnimationFrame(handleResize)
  })
}

function resetWeights() {
  weights.hospital = 0.4
  weights.pharmacy = 0.2
  weights.community = 0.2
  weights.spatial = 0.2
}

function resetRiskParams() {
  riskParams.pointBonus = 2
  riskParams.gapFactor = 0.25
  riskParams.highPressure = 55
  riskParams.lowCoverage = 45
  simulateCount.value = 0
}

// 权重或基础数据变化时，实时重算仪表盘
watch(frontResilience, () => {
  updateGauge()
})
watch(weights, () => {
  updateRadar()
}, { deep: true })


// 风险矩阵参数或推演值变化时，实时重算散点
watch(scatterPoints, () => {
  updateScatter()
})

function handleResize() {
  gaugeChart && gaugeChart.resize()
  radarChart && radarChart.resize()
  scatterChart && scatterChart.resize()
}

onMounted(() => {
  initGauge()
  initRadar()
  initScatter()
  loadAllData()
  window.addEventListener('resize', handleResize)

  // 监听图表容器尺寸变化：面板从隐藏切回显示时自动重算，避免图表被压缩/堆叠
  if (window.ResizeObserver) {
    resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(handleResize)
    })
    ;[gaugeRef, radarRef, scatterRef].forEach(r => {
      if (r.value) resizeObserver.observe(r.value)
    })
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  resizeObserver && resizeObserver.disconnect()
  resizeObserver = null
  gaugeChart && gaugeChart.dispose()
  radarChart && radarChart.dispose()
  scatterChart && scatterChart.dispose()
  gaugeChart = radarChart = scatterChart = null
})
</script>

<style scoped>
.resilience-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(180deg, rgba(4, 20, 38, 0.92), rgba(2, 12, 24, 0.94));
  border: 1px solid rgba(0, 229, 255, 0.22);
  border-radius: 8px;
  box-shadow: 0 0 28px rgba(0, 180, 255, 0.14);
  color: #e6f7ff;
  width: 100%;
  box-sizing: border-box;
  max-height: 100%;
  overflow-y: auto;
  font-size: 12px;
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(0, 229, 255, 0.18);
}

.panel-title-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.panel-kicker {
  font-size: 10px;
  letter-spacing: 2px;
  color: rgba(0, 229, 255, 0.55);
}

.panel-title-row strong {
  font-size: 18px;
  color: #eafcff;
  letter-spacing: 1px;
}

.panel-index {
  font-size: 26px;
  font-weight: 700;
  color: rgba(0, 229, 255, 0.15);
  font-family: 'Arial', sans-serif;
}

.error-banner {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 8px 10px;
  background: rgba(244, 67, 54, 0.12);
  border: 1px solid rgba(244, 67, 54, 0.45);
  border-radius: 4px;
  font-size: 11px;
  color: #ffcdd2;
  line-height: 1.5;
  word-break: break-all;
}

.err-icon { flex-shrink: 0; font-size: 13px; }

.card-section {
  padding: 12px;
  background: rgba(26, 56, 80, 0.42);
  border: 1px solid rgba(0, 229, 255, 0.14);
  border-radius: 6px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 700;
  color: #d8f6ff;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.dot-cyan { background: #00e5ff; box-shadow: 0 0 6px #00e5ff; }
.dot-orange { background: #ffb300; box-shadow: 0 0 6px #ffb300; }
.dot-red { background: #f44336; box-shadow: 0 0 6px #f44336; }
.dot-ai { background: #b388ff; box-shadow: 0 0 6px #b388ff; }

.tag {
  font-style: normal;
  font-size: 10px;
  padding: 1px 6px;
  margin-left: 4px;
  border-radius: 3px;
  background: rgba(179, 136, 255, 0.18);
  color: #d9c6ff;
  letter-spacing: 1px;
}

/* Gauge */
.gauge-wrap {
  height: 220px;
}

.gauge-chart {
  width: 100%;
  height: 100%;
}

.score-row {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 12px;
  margin-top: -4px;
}

.gauge-num {
  font-size: 42px;
  font-weight: 800;
  font-family: 'Arial', sans-serif;
  line-height: 1;
  text-shadow: 0 0 16px currentColor;
}

.gauge-level {
  font-size: 17px;
  letter-spacing: 3px;
}

.metric-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.metric-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric-head span {
  font-size: 12px;
  color: #9fd8e8;
}

.metric-head b {
  font-size: 14px;
  color: #fff;
  font-weight: 700;
}

.metric-bar {
  height: 6px;
  border-radius: 3px;
  background: rgba(0, 229, 255, 0.1);
  overflow: hidden;
}

.metric-bar i {
  display: block;
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
  box-shadow: 0 0 8px currentColor;
}

/* 公式编辑 */
.formula-section {
  border-color: rgba(179, 136, 255, 0.25);
}

.formula-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 4px;
  font-size: 12px;
  color: #c9f4ff;
}

.f-eq {
  font-family: 'Consolas', monospace;
  color: #b388ff;
  font-weight: 700;
}

.f-term {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  white-space: nowrap;
}

.f-term input {
  width: 52px;
  padding: 3px 4px;
  text-align: center;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  background: rgba(0, 229, 255, 0.08);
  border: 1px solid rgba(0, 229, 255, 0.35);
  border-radius: 4px;
  outline: none;
}

.f-term input:focus {
  border-color: #00e5ff;
  box-shadow: 0 0 8px rgba(0, 229, 255, 0.35);
}

.f-op {
  color: #7ee8ff;
  font-weight: 700;
}

.formula-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  font-size: 11px;
  color: #9fd8e8;
}

.formula-foot b {
  color: #4caf50;
  font-size: 13px;
}

.formula-foot b.bad {
  color: #ffb300;
}

.reset-btn {
  padding: 3px 10px;
  font-size: 11px;
  color: #d9c6ff;
  background: rgba(179, 136, 255, 0.14);
  border: 1px solid rgba(179, 136, 255, 0.4);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.reset-btn:hover {
  background: rgba(179, 136, 255, 0.3);
  color: #fff;
}

/* Radar */
.radar-chart {
  width: 100%;
  height: 380px;
}

.radar-warning {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  padding: 7px 9px;
  background: rgba(255, 179, 0, 0.1);
  border: 1px solid rgba(255, 179, 0, 0.35);
  border-radius: 4px;
  font-size: 12px;
  color: #ffe082;
  line-height: 1.5;
}

.warn-tag {
  flex-shrink: 0;
  padding: 1px 6px;
  background: #ffb300;
  color: #1a2a3a;
  border-radius: 2px;
  font-weight: 700;
  font-size: 11px;
}

/* Scatter */
.scatter-chart {
  width: 100%;
  height: 360px;
}

.scatter-legend {
  display: flex;
  justify-content: center;
  gap: 18px;
  margin-top: 4px;
  font-size: 11px;
  color: #9fd8e8;
}

.scatter-legend span {
  display: flex;
  align-items: center;
  gap: 5px;
}

.lg {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  display: inline-block;
}

.lg-high { background: #f44336; }
.lg-mid { background: #ffc107; }
.lg-low { background: #4caf50; }

/* 风险统计摘要 */
.risk-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  font-size: 11px;
}

.rs-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 4px;
}

.rs-item b { font-size: 13px; color: #fff; }

.rs-high { background: rgba(244, 67, 54, 0.14); color: #ffcdd2; }
.rs-high b { color: #f44336; }
.rs-mid { background: rgba(255, 193, 7, 0.12); color: #ffe082; }
.rs-mid b { color: #ffc107; }
.rs-low { background: rgba(76, 175, 80, 0.14); color: #c8e6c9; }
.rs-low b { color: #4caf50; }

.rs-weakest {
  margin-left: auto;
  color: #ffb3a0;
  font-weight: 700;
}

/* 模型参数调参 */
.risk-tuner {
  margin-top: 10px;
  padding: 8px 10px;
  border: 1px solid rgba(244, 67, 54, 0.25);
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.18);
}

.tuner-head {
  font-size: 12px;
  color: #ffd0c8;
  font-weight: 700;
  margin-bottom: 8px;
}

.tuner-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.tuner-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 11px;
  color: #9fd8e8;
}

.tuner-item input {
  width: 100%;
  box-sizing: border-box;
  padding: 4px 6px;
  text-align: center;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  background: rgba(0, 229, 255, 0.08);
  border: 1px solid rgba(0, 229, 255, 0.35);
  border-radius: 4px;
  outline: none;
}

.tuner-item input:focus {
  border-color: #ffb300;
  box-shadow: 0 0 8px rgba(255, 179, 0, 0.35);
}

.risk-tuner .reset-btn {
  margin-top: 8px;
}

/* 调度推演 */
.simulation {
  margin-top: 10px;
  padding: 8px 10px;
  border: 1px solid rgba(0, 229, 255, 0.22);
  border-radius: 4px;
  background: rgba(0, 229, 255, 0.05);
}

.sim-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #d8f6ff;
  font-weight: 700;
}

.sim-head b {
  font-size: 15px;
  color: #00e5ff;
}

.sim-slider {
  width: 100%;
  margin: 8px 0 6px;
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(90deg, rgba(244, 67, 54, 0.5), rgba(255, 193, 7, 0.5), rgba(76, 175, 80, 0.5));
  outline: none;
}

.sim-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #00e5ff;
  border: 2px solid #fff;
  cursor: pointer;
  box-shadow: 0 0 8px rgba(0, 229, 255, 0.8);
}

.sim-tip {
  font-size: 11px;
  color: #9fd8e8;
  line-height: 1.5;
}

/* AI */
.ai-section {
  border-color: rgba(179, 136, 255, 0.25);
}

.ai-block {
  margin-bottom: 10px;
}

.ai-block:last-child { margin-bottom: 0; }

.ai-label {
  font-size: 12px;
  color: #b388ff;
  margin-bottom: 5px;
  letter-spacing: 1px;
}

.ai-list {
  margin: 0;
  padding-left: 16px;
  list-style: none;
}

.ai-list li {
  position: relative;
  font-size: 12px;
  color: #cfe6f2;
  line-height: 1.7;
  word-break: break-all;
}

.ai-list li::before {
  content: '';
  position: absolute;
  left: -12px;
  top: 7px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #b388ff;
}

.ai-label .hint {
  font-style: normal;
  font-size: 10px;
  color: rgba(179, 136, 255, 0.6);
  margin-left: 6px;
  letter-spacing: 0;
}

/* 资源缺口 */
.shortage-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shortage-item {
  padding: 7px 9px;
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(179, 136, 255, 0.16);
  border-radius: 4px;
}

.sh-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #e6f2ff;
}

.sh-head b {
  font-size: 12px;
  color: #ffb300;
}

.sh-head b.zero {
  color: #4caf50;
}

.sh-meta {
  font-size: 11px;
  color: #8fb8cc;
  margin: 2px 0 5px;
}

.sh-bar {
  height: 5px;
  border-radius: 3px;
  background: rgba(179, 136, 255, 0.12);
  overflow: hidden;
}

.sh-bar i {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, #b388ff, #00e5ff);
  transition: width 0.4s ease;
}

/* 资源配比结构 */
.mix-bar {
  display: flex;
  height: 14px;
  border-radius: 7px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.04);
}

.mix-bar i {
  display: block;
  height: 100%;
  min-width: 2px;
  transition: width 0.5s ease;
}

.mix-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
  font-size: 11px;
  color: #cfe6f2;
}

.mix-legend span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.mix-legend i {
  width: 9px;
  height: 9px;
  border-radius: 2px;
  display: inline-block;
}

.mix-diagnosis {
  margin-top: 8px;
  padding: 7px 9px;
  font-size: 12px;
  line-height: 1.6;
  color: #e6f2ff;
  background: rgba(179, 136, 255, 0.08);
  border-left: 3px solid #b388ff;
  border-radius: 3px;
}
</style>

<style>
/* 兜底：覆盖项目全局样式里 aside 容器的窄宽度限制，给图表足够空间 */
aside.aside-right {
  width: 540px !important;
  min-width: 540px !important;
}
</style>