<template>
  <div class="health-page">
    <!-- 顶部：蓝色渐变 -->
    <header class="health-header">
      <div class="hd-left">
        <button class="back-btn" @click="goBack">← 返回</button>
        <div class="hd-title">
          <span class="hd-kicker">HEALTH MANAGEMENT</span>
          <h1>健康管理</h1>
        </div>
      </div>
      <div class="hd-right">
        <select v-model="currentUserId" class="user-select" @change="switchUser">
          <option :value="null" disabled>选择健康档案</option>
          <option v-for="u in users" :key="u.id" :value="u.id">{{ u.name }}（{{ u.phone }}）</option>
        </select>
        <button class="hd-btn" @click="openUserEdit()">编辑档案</button>
        <button class="hd-btn" @click="openUserNew()">新建档案</button>
      </div>
    </header>

    <!-- 档案概览 -->
    <section class="profile-bar" v-if="currentUser">
      <div class="profile-avatar">{{ currentUser.name.charAt(0) }}</div>
      <div class="profile-info">
        <div class="profile-name">
          {{ currentUser.name }}
          <span class="profile-tag" v-if="currentUser.gender">{{ currentUser.gender }}</span>
          <span class="profile-tag" v-if="currentUser.age">{{ currentUser.age }}岁</span>
        </div>
        <div class="profile-meta">
          身高 {{ currentUser.height || '-' }} cm · 体重 {{ currentUser.weight || '-' }} kg
          <span v-if="bmi"> · BMI {{ bmi }}</span>
        </div>
        <div class="profile-history" v-if="currentUser.history">既往病史：{{ currentUser.history }}</div>
      </div>
    </section>

    <!-- 功能标签页 -->
    <nav class="tab-bar">
      <button :class="{ active: view === 'monitor' }" @click="view = 'monitor'">📊 健康数据监测</button>
      <button :class="{ active: view === 'risk' }" @click="view = 'risk'">🩺 健康风险评估</button>
      <button :class="{ active: view === 'plan' }" @click="view = 'plan'">🎯 健康管理方案</button>
      <button :class="{ active: view === 'chronic' }" @click="view = 'chronic'">💊 慢性病管理</button>
    </nav>

    <!-- ===== 健康数据监测 ===== -->
    <section class="view-body" v-if="view === 'monitor'">
      <div class="two-col">
        <!-- 录入表单 -->
        <div class="panel">
          <h3 class="panel-title">➕ 录入监测数据</h3>
          <div class="form-grid">
            <div class="form-item">
              <label>测量日期 <i>*</i></label>
              <input v-model="recordForm.measure_date" type="date" />
            </div>
            <div class="form-item">
              <label>测量时间</label>
              <input v-model="recordForm.measure_time" type="time" />
            </div>
            <div class="form-item">
              <label>收缩压 (mmHg)</label>
              <input v-model.number="recordForm.systolic" type="number" placeholder="" />
            </div>
            <div class="form-item">
              <label>舒张压 (mmHg)</label>
              <input v-model.number="recordForm.diastolic" type="number" placeholder="" />
            </div>
            <div class="form-item">
              <label>血糖 (mmol/L)</label>
              <input v-model.number="recordForm.blood_sugar" type="number" step="0.1" placeholder="" />
            </div>
            <div class="form-item">
              <label>心率 (次/分)</label>
              <input v-model.number="recordForm.heart_rate" type="number" placeholder="" />
            </div>
            <div class="form-item">
              <label>体重 (kg)</label>
              <input v-model.number="recordForm.weight" type="number" step="0.1" placeholder="" />
            </div>
            <div class="form-item">
              <label>备注</label>
              <input v-model="recordForm.remark" placeholder="选填" />
            </div>
          </div>
          <div class="panel-actions">
            <button class="btn-primary" @click="addRecord">保存记录</button>
          </div>
        </div>

        <!-- 实时监测 -->
        <div class="panel">
          <h3 class="panel-title">📡 实时监测</h3>
          <div class="metric-grid">
            <div class="metric-card" v-for="m in metricCards" :key="m.label">
              <div class="m-label">{{ m.label }}</div>
              <div class="m-value">{{ m.value ?? '--' }}<span class="m-unit">{{ m.unit }}</span></div>
              <div class="m-status" :class="m.level">{{ m.status }}</div>
            </div>
          </div>
          <div class="trend-box">
            <div class="trend-title">近10次趋势</div>
            <svg viewBox="0 0 300 120" class="trend-svg">
              <polyline v-if="sysPoints" :points="sysPoints" fill="none" stroke="#ef5350" stroke-width="2" />
              <polyline v-if="diaPoints" :points="diaPoints" fill="none" stroke="#ff9800" stroke-width="2" />
              <polyline v-if="hrPoints" :points="hrPoints" fill="none" stroke="#2196f3" stroke-width="2" />
            </svg>
            <div class="trend-legend">
              <span><i style="background:#ef5350"></i>收缩压</span>
              <span><i style="background:#ff9800"></i>舒张压</span>
              <span><i style="background:#2196f3"></i>心率</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 历史记录表 -->
      <div class="panel">
        <h3 class="panel-title">📋 监测记录（共 {{ recordList.length }} 条）</h3>
        <table class="data-table">
          <thead>
            <tr><th>日期</th><th>时间</th><th>收缩压</th><th>舒张压</th><th>血糖</th><th>心率</th><th>体重</th><th>备注</th><th>操作</th></tr>
          </thead>
          <tbody>
            <tr v-for="r in recordList" :key="r.id">
              <td>{{ r.measure_date }}</td>
              <td>{{ r.measure_time || '-' }}</td>
              <td>{{ r.systolic ?? '-' }}</td>
              <td>{{ r.diastolic ?? '-' }}</td>
              <td>{{ r.blood_sugar ?? '-' }}</td>
              <td>{{ r.heart_rate ?? '-' }}</td>
              <td>{{ r.weight ?? '-' }}</td>
              <td>{{ r.remark || '-' }}</td>
              <td><button class="link-del" @click="deleteRecord(r)">删除</button></td>
            </tr>
          </tbody>
        </table>
        <div class="empty" v-if="recordList.length === 0">暂无监测记录</div>
      </div>
    </section>

    <!-- ===== 健康风险评估 ===== -->
    <section class="view-body" v-else-if="view === 'risk'">
      <div class="panel">
        <h3 class="panel-title">🩺 健康风险评估</h3>
        <div class="risk-sub-row">
          <p class="panel-sub">基于当前档案与最新监测数据，综合评估潜在健康风险</p>
          <button class="btn-primary" @click="genRisk">生成评估</button>
        </div>

        <div class="risk-result" v-if="riskResult">
          <div class="risk-level" :class="riskLevelClass">{{ riskResult.level }}</div>
          <div class="risk-body">
            <div class="risk-title">风险项</div>
            <ul class="risk-items">
              <li v-for="(it, i) in riskResult.items" :key="i">{{ it }}</li>
            </ul>
            <div class="risk-title">健康建议</div>
            <p class="risk-sugg">{{ riskResult.suggestion }}</p>
          </div>
          <div class="risk-actions">
            <button class="btn-warm" @click="saveRisk">保存评估</button>
          </div>
        </div>
        <div class="empty" v-else>点击「生成评估」查看结果</div>
      </div>

      <div class="panel" v-if="riskHistory.length">
        <h3 class="panel-title">📚 历史评估记录</h3>
        <div class="risk-hist" v-for="r in riskHistory" :key="r.id">
          <span class="risk-level sm" :class="levelClass(r.risk_level)">{{ r.risk_level }}</span>
          <div class="rh-main">
            <div class="rh-date">{{ r.risk_date }}</div>
            <div class="rh-items">{{ formatLines(r.risk_items) }}</div>
          </div>
          <span class="link-del del" @click="deleteRisk(r)">删除</span>
        </div>
      </div>
    </section>

    <!-- ===== 健康管理方案 ===== -->
    <section class="view-body" v-else-if="view === 'plan'">
      <div class="panel">
        <h3 class="panel-title">🎯 个性化健康管理方案</h3>
        <div class="goal-row">
          <input v-model="planForm.goal" class="search-input" placeholder="请输入健康目标" />
          <button class="btn-primary" @click="genPlan">生成方案</button>
        </div>

        <div class="plan-preview" v-if="planForm.diet || planForm.exercise || planForm.lifestyle">
          <div class="plan-block">
            <h4>🥗 饮食建议</h4>
            <p>{{ planForm.diet }}</p>
          </div>
          <div class="plan-block">
            <h4>🏃 运动建议</h4>
            <p>{{ planForm.exercise }}</p>
          </div>
          <div class="plan-block">
            <h4>🌙 作息与生活方式</h4>
            <p>{{ planForm.lifestyle }}</p>
          </div>
          <div class="panel-actions">
            <button class="btn-warm" @click="savePlan">保存方案</button>
          </div>
        </div>
      </div>

      <div class="panel" v-if="planHistory.length">
        <h3 class="panel-title">📚 历史方案</h3>
        <div class="plan-hist" v-for="p in planHistory" :key="p.id">
          <div class="ph-head">
            <span class="ph-date">{{ p.plan_date }}</span>
            <b>{{ p.goal || '综合健康管理' }}</b>
            <span class="link-del del" @click="deletePlan(p)">删除</span>
          </div>
          <div class="ph-line">🥗 {{ p.diet }}</div>
          <div class="ph-line">🏃 {{ p.exercise }}</div>
          <div class="ph-line">🌙 {{ p.lifestyle }}</div>
        </div>
      </div>
    </section>

    <!-- ===== 慢性病管理 ===== -->
    <section class="view-body" v-else-if="view === 'chronic'">
      <div class="panel">
        <div class="risk-head">
          <h3 class="panel-title">💊 慢性病档案</h3>
          <button class="btn-primary" @click="openChronicEdit()">添加慢病</button>
        </div>
        <div class="chronic-list">
          <div class="chronic-card" v-for="c in chronicList" :key="c.id">
            <div class="cc-head">
              <b>{{ c.disease_name }}</b>
              <span class="stage-tag" v-if="c.stage">{{ c.stage }}</span>
              <span class="link-del" @click="openChronicEdit(c)">编辑</span>
              <span class="link-del del" @click="deleteChronic(c)">删除</span>
            </div>
            <div class="cc-line" v-if="c.diagnose_date">确诊日期：{{ c.diagnose_date }}</div>
            <div class="cc-line" v-if="c.track_note"><b>病情跟踪：</b>{{ c.track_note }}</div>
            <div class="cc-line rehab" v-if="c.rehab_guide"><b>康复指导：</b>{{ c.rehab_guide }}</div>
          </div>
          <div class="empty" v-if="chronicList.length === 0">暂无慢病档案</div>
        </div>
      </div>

      <div class="panel">
        <div class="risk-head">
          <h3 class="panel-title">⏰ 用药提醒</h3>
          <button class="btn-primary" @click="openReminderEdit()">添加提醒</button>
        </div>
        <table class="data-table" v-if="reminderList.length">
          <thead>
            <tr><th>药名</th><th>关联疾病</th><th>剂量</th><th>频次</th><th>提醒时间</th><th>状态</th><th>操作</th></tr>
          </thead>
          <tbody>
            <tr v-for="rm in reminderList" :key="rm.id">
              <td><b>{{ rm.medicine_name }}</b></td>
              <td>{{ rm.disease_name || '-' }}</td>
              <td>{{ rm.dosage || '-' }}</td>
              <td>{{ rm.frequency || '-' }}</td>
              <td>{{ rm.remind_time || '-' }}</td>
              <td><span class="status-tag" :class="rm.enabled ? 'on' : 'off'">{{ rm.enabled ? '启用' : '停用' }}</span></td>
              <td>
                <span class="link-del" @click="openReminderEdit(rm)">编辑</span>
                <span class="link-del del" @click="deleteReminder(rm)">删除</span>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="empty" v-else>暂无用药提醒</div>
      </div>
    </section>

    <!-- ===== 档案编辑/新建弹窗 ===== -->
    <div class="modal-mask" v-if="userModalShow" @click.self="userModalShow = false">
      <div class="modal-card">
        <h3 class="em-title">{{ userForm.id ? '编辑档案' : '新建档案' }}</h3>
        <div class="form-grid">
          <div class="form-item">
            <label>姓名 <i>*</i></label>
            <input v-model="userForm.name" />
          </div>
          <div class="form-item">
            <label>手机号 <i>*</i></label>
            <input v-model="userForm.phone" />
          </div>
          <div class="form-item">
            <label>性别</label>
            <select v-model="userForm.gender">
              <option value="">请选择</option>
              <option value="男">男</option>
              <option value="女">女</option>
            </select>
          </div>
          <div class="form-item">
            <label>年龄</label>
            <input v-model.number="userForm.age" type="number" />
          </div>
          <div class="form-item">
            <label>身高 (cm)</label>
            <input v-model.number="userForm.height" type="number" step="0.1" />
          </div>
          <div class="form-item">
            <label>体重 (kg)</label>
            <input v-model.number="userForm.weight" type="number" step="0.1" />
          </div>
          <div class="form-item full">
            <label>既往病史</label>
            <input v-model="userForm.history" placeholder="如 高血压、糖尿病等" />
          </div>
        </div>
        <div class="em-actions">
          <button class="btn-ghost" @click="userModalShow = false">取消</button>
          <button class="btn-primary" @click="saveUser">保存</button>
        </div>
      </div>
    </div>

    <!-- ===== 慢病编辑弹窗 ===== -->
    <div class="modal-mask" v-if="chronicModalShow" @click.self="chronicModalShow = false">
      <div class="modal-card">
        <h3 class="em-title">{{ chronicForm.id ? '编辑慢病' : '添加慢病' }}</h3>
        <div class="form-grid">
          <div class="form-item">
            <label>病名 <i>*</i></label>
            <input v-model="chronicForm.disease_name" placeholder="如 高血压" />
          </div>
          <div class="form-item">
            <label>确诊日期</label>
            <input v-model="chronicForm.diagnose_date" type="date" />
          </div>
          <div class="form-item full">
            <label>分期/分级</label>
            <input v-model="chronicForm.stage" placeholder="如 1级高血压" />
          </div>
          <div class="form-item full">
            <label>病情跟踪</label>
            <textarea v-model="chronicForm.track_note" rows="2"></textarea>
          </div>
          <div class="form-item full">
            <label>康复指导</label>
            <textarea v-model="chronicForm.rehab_guide" rows="2"></textarea>
          </div>
        </div>
        <div class="em-actions">
          <button class="btn-ghost" @click="chronicModalShow = false">取消</button>
          <button class="btn-primary" @click="saveChronic">保存</button>
        </div>
      </div>
    </div>

    <!-- ===== 用药提醒编辑弹窗 ===== -->
    <div class="modal-mask" v-if="reminderModalShow" @click.self="reminderModalShow = false">
      <div class="modal-card">
        <h3 class="em-title">{{ reminderForm.id ? '编辑提醒' : '添加提醒' }}</h3>
        <div class="form-grid">
          <div class="form-item">
            <label>药名 <i>*</i></label>
            <input v-model="reminderForm.medicine_name" placeholder="如 硝苯地平" />
          </div>
          <div class="form-item">
            <label>关联疾病</label>
            <input v-model="reminderForm.disease_name" placeholder="如 高血压" />
          </div>
          <div class="form-item">
            <label>剂量</label>
            <input v-model="reminderForm.dosage" placeholder="如 30mg/次" />
          </div>
          <div class="form-item">
            <label>频次</label>
            <input v-model="reminderForm.frequency" placeholder="如 每日1次" />
          </div>
          <div class="form-item">
            <label>提醒时间</label>
            <input v-model="reminderForm.remind_time" type="time" />
          </div>
          <div class="form-item">
            <label>状态</label>
            <select v-model="reminderForm.enabled">
              <option :value="1">启用</option>
              <option :value="0">停用</option>
            </select>
          </div>
        </div>
        <div class="em-actions">
          <button class="btn-ghost" @click="reminderModalShow = false">取消</button>
          <button class="btn-primary" @click="saveReminder">保存</button>
        </div>
      </div>
    </div>

    <div class="toast-tip" :class="toast.type" v-if="toast.show">{{ toast.text }}</div>

    <!-- 小巧确认弹窗 -->
    <div class="confirm-mask" v-if="confirmBox.show" @click.self="confirmCancel">
      <div class="confirm-card">
        <div class="confirm-text">{{ confirmBox.text }}</div>
        <div class="confirm-actions">
          <button class="cf-btn cancel" @click="confirmCancel">取消</button>
          <button class="cf-btn ok" @click="confirmOk">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import request from '../api/request'

const router = useRouter()
const view = ref('monitor')

// 档案
const users = ref([])
const currentUserId = ref(null)
const currentUser = computed(() => users.value.find(u => u.id === currentUserId.value) || null)
const userModalShow = ref(false)
const userForm = reactive({ id: null, phone: '', name: '', gender: '', age: null, height: null, weight: null, history: '' })

// 监测记录
const recordList = ref([])
const recordForm = reactive({
  measure_date: '', measure_time: '', systolic: null, diastolic: null,
  blood_sugar: null, heart_rate: null, weight: null, remark: ''
})

// 风险
const riskHistory = ref([])
const riskResult = ref(null)

// 方案
const planHistory = ref([])
const planForm = reactive({ goal: '', diet: '', exercise: '', lifestyle: '' })

// 慢病 + 用药
const chronicList = ref([])
const chronicModalShow = ref(false)
const chronicForm = reactive({ id: null, disease_name: '', diagnose_date: '', stage: '', track_note: '', rehab_guide: '' })
const reminderList = ref([])
const reminderModalShow = ref(false)
const reminderForm = reactive({ id: null, disease_name: '', medicine_name: '', dosage: '', frequency: '', remind_time: '', enabled: 1 })

const toast = reactive({ show: false, text: '', type: 'success' })

// 小巧确认弹窗
const confirmBox = reactive({ show: false, text: '', onOk: null })

function confirmDelete(text, cb) {
  confirmBox.text = text
  confirmBox.onOk = cb
  confirmBox.show = true
}
function confirmOk() {
  confirmBox.show = false
  const cb = confirmBox.onOk
  confirmBox.onOk = null
  if (typeof cb === 'function') cb()
}
function confirmCancel() {
  confirmBox.show = false
  confirmBox.onOk = null
}

function showToast(text, type = 'success') {
  toast.text = text
  toast.type = type
  toast.show = true
  setTimeout(() => { toast.show = false }, 2200)
}

function goBack() { router.back() }

function today() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

// BMI
const bmi = computed(() => {
  if (currentUser.value && currentUser.value.height && currentUser.value.weight) {
    return (currentUser.value.weight / Math.pow(currentUser.value.height / 100, 2)).toFixed(1)
  }
  return null
})

// 最新一条记录
const latest = computed(() => recordList.value[0] || null)

// 指标卡片
const metricCards = computed(() => {
  const r = latest.value
  return [
    judgeMetric('收缩压', r ? r.systolic : null, 'mmHg',
      v => v >= 140 ? ['偏高', 'bad'] : v >= 90 ? ['正常', 'good'] : ['偏低', 'warn']),
    judgeMetric('舒张压', r ? r.diastolic : null, 'mmHg',
      v => v >= 90 ? ['偏高', 'bad'] : v >= 60 ? ['正常', 'good'] : ['偏低', 'warn']),
    judgeMetric('血糖', r ? r.blood_sugar : null, 'mmol/L',
      v => v >= 7.0 ? ['偏高', 'bad'] : v >= 3.9 ? ['正常', 'good'] : ['偏低', 'warn']),
    judgeMetric('心率', r ? r.heart_rate : null, '次/分',
      v => v > 100 ? ['偏快', 'warn'] : v >= 60 ? ['正常', 'good'] : ['偏慢', 'warn'])
  ]
})
function judgeMetric(label, val, unit, fn) {
  let status = '未测', level = 'idle'
  if (val != null) {
    const [s, l] = fn(val)
    status = s
    level = l
  }
  return { label, value: val, unit, status, level }
}

// 趋势
const trendRecords = computed(() => recordList.value.slice().reverse().slice(-10))
function toPoints(field, min, max) {
  const arr = trendRecords.value
  if (arr.length < 2) return ''
  const w = 300, h = 110, px = 8, py = 8
  return arr.map((r, i) => {
    const x = px + (w - 2 * px) * i / (arr.length - 1)
    const v = r[field]
    let y = h / 2
    if (v != null) y = py + (h - 2 * py) * (1 - (v - min) / ((max - min) || 1))
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
}
const sysPoints = computed(() => toPoints('systolic', 90, 190))
const diaPoints = computed(() => toPoints('diastolic', 50, 120))
const hrPoints = computed(() => toPoints('heart_rate', 40, 130))

// 风险评估
const riskLevelClass = computed(() => levelClass(riskResult.value ? riskResult.value.level : ''))
function levelClass(level) {
  if (level.indexOf('高') === 0) return 'lv-high'
  if (level.indexOf('中') === 0) return 'lv-mid'
  if (level.indexOf('低') === 0) return 'lv-low'
  return 'lv-low'
}
function calcRisk() {
  const u = currentUser.value
  const r = latest.value
  const items = []
  let score = 0
  if (r && r.systolic != null && r.diastolic != null) {
    if (r.systolic >= 160 || r.diastolic >= 100) { items.push('血压显著偏高（≥160/100），建议尽快就医'); score += 3 }
    else if (r.systolic >= 140 || r.diastolic >= 90) { items.push('血压偏高（140-159/90-99），属一级高血压'); score += 2 }
    else if (r.systolic >= 130 || r.diastolic >= 85) { items.push('血压处于正常高值（130-139/85-89），需关注'); score += 1 }
    else items.push('血压正常')
  }
  if (r && r.blood_sugar != null) {
    if (r.blood_sugar >= 7.0) { items.push('空腹血糖偏高（≥7.0），需排查糖尿病'); score += 3 }
    else if (r.blood_sugar >= 6.1) { items.push('空腹血糖受损（6.1-6.9），糖尿病前期'); score += 2 }
    else if (r.blood_sugar >= 5.6) { items.push('空腹血糖正常偏高（5.6-6.0）'); score += 1 }
    else items.push('空腹血糖正常')
  }
  if (r && r.heart_rate != null) {
    if (r.heart_rate > 100) { items.push('静息心率偏快（>100次/分）'); score += 2 }
    else if (r.heart_rate < 60) { items.push('静息心率偏慢（<60次/分）'); score += 1 }
    else items.push('心率正常')
  }
  if (u && u.height && u.weight) {
    const b = u.weight / Math.pow(u.height / 100, 2)
    if (b >= 28) { items.push(`BMI ${b.toFixed(1)}，属肥胖，增加代谢疾病风险`); score += 3 }
    else if (b >= 24) { items.push(`BMI ${b.toFixed(1)}，属超重`); score += 2 }
    else if (b < 18.5) { items.push(`BMI ${b.toFixed(1)}，体重偏瘦`); score += 1 }
    else items.push(`BMI ${b.toFixed(1)}，正常`)
  }
  if (u && u.history) { items.push('存在既往病史，需持续健康管理'); score += 1 }

  let level = '低风险'
  if (score >= 6) level = '高风险'
  else if (score >= 3) level = '中风险'

  const suggestion = [
    '保持清淡饮食，控制盐、糖、脂肪摄入，多吃蔬菜水果和全谷物。',
    '每周进行3-5次、每次30分钟左右的有氧运动（如快走、慢跑、游泳）。',
    '规律作息，保证充足睡眠，戒烟限酒，避免情绪大幅波动。',
    '按医嘱规范用药，定期复查，出现异常及时就医。'
  ].join('')

  return { level, items, suggestion }
}
function genRisk() {
  if (!currentUser.value) { showToast('请先选择健康档案', 'error'); return }
  riskResult.value = calcRisk()
}
async function saveRisk() {
  if (!riskResult.value || !currentUser.value) return
  try {
    const res = await request.post('/health/risk', {
      user_id: currentUser.value.id,
      risk_date: today(),
      risk_level: riskResult.value.level,
      risk_items: riskResult.value.items.join('\n'),
      suggestion: riskResult.value.suggestion
    })
    if (res.code === 200) { showToast('评估已保存'); loadRisks() }
    else showToast(res.msg || '保存失败', 'error')
  } catch (e) { showToast('保存失败', 'error') }
}

// 方案生成
function genPlan() {
  if (!currentUser.value) { showToast('请先选择健康档案', 'error'); return }
  const r = calcRisk()
  const goal = planForm.goal || '综合改善健康'
  const bp = (r && r.items.join('').indexOf('血压偏高') > -1)
  const glu = (r && r.items.join('').indexOf('血糖') > -1 && r.items.join('').indexOf('正常') < 0)
  planForm.diet = bp
    ? `围绕「${goal}」：低盐低脂饮食，每日食盐控制在5g以内，少食腌制、油炸及高胆固醇食物；` +
      '多吃新鲜蔬果、全谷物和优质蛋白（鱼、豆制品），控制总热量。'
    : (glu
      ? `围绕「${goal}」：控制主食总量，优选低GI食物（燕麦、糙米），定时定量进餐，` +
        '少食高糖高脂零食，多吃蔬菜与适量优质蛋白。'
      : `围绕「${goal}」：均衡膳食，荤素搭配，保证蔬菜、水果、全谷物、优质蛋白摄入，` +
        '减少高盐高糖高油食物，足量饮水。')
  planForm.exercise = '建议每周3-5次、每次30分钟左右中等强度有氧运动（快走、慢跑、游泳、骑车），' +
    '配合每周2次力量训练，运动前后注意热身与拉伸，量力而行。'
  planForm.lifestyle = '规律作息、保证7-8小时睡眠，戒烟限酒，保持心情舒畅；每日自测并记录体重、血压等指标，定期体检。'
}
async function savePlan() {
  if (!currentUser.value || !planForm.diet) return
  try {
    const res = await request.post('/health/plan', {
      user_id: currentUser.value.id,
      plan_date: today(),
      goal: planForm.goal,
      diet: planForm.diet,
      exercise: planForm.exercise,
      lifestyle: planForm.lifestyle
    })
    if (res.code === 200) { showToast('方案已保存'); loadPlans() }
    else showToast(res.msg || '保存失败', 'error')
  } catch (e) { showToast('保存失败', 'error') }
}

function deleteRisk(r) {
  confirmDelete(`确定删除 ${r.risk_date} 的评估记录吗？`, async () => {
    try {
      const res = await request.delete(`/health/risk?id=${r.id}`)
      if (res.code === 200) { showToast('删除成功'); loadRisks() }
      else showToast(res.msg || '删除失败', 'error')
    } catch (e) { showToast('删除失败', 'error') }
  })
}

function deletePlan(p) {
  confirmDelete(`确定删除 ${p.plan_date} 的方案吗？`, async () => {
    try {
      const res = await request.delete(`/health/plan?id=${p.id}`)
      if (res.code === 200) { showToast('删除成功'); loadPlans() }
      else showToast(res.msg || '删除失败', 'error')
    } catch (e) { showToast('删除失败', 'error') }
  })
}

function formatLines(s) {
  return (s || '').split('\n').filter(Boolean).join('；')
}

// 档案操作
function openUserEdit(u) {
  const t = u || currentUser.value
  if (!t) { showToast('请先选择档案', 'error'); return }
  Object.assign(userForm, { id: t.id, phone: t.phone, name: t.name, gender: t.gender || '', age: t.age, height: t.height, weight: t.weight, history: t.history || '' })
  userModalShow.value = true
}
function openUserNew() {
  Object.assign(userForm, { id: null, phone: '', name: '', gender: '', age: null, height: null, weight: null, history: '' })
  userModalShow.value = true
}
async function saveUser() {
  if (!userForm.name || !userForm.phone) { showToast('请填写姓名和手机号', 'error'); return }
  try {
    const res = await request.post('/health/user', { ...userForm })
    if (res.code === 200) {
      showToast(userForm.id ? '档案已更新' : '档案已创建')
      userModalShow.value = false
      await loadUsers()
      currentUserId.value = res.data.id
      loadAll()
    } else showToast(res.msg || '保存失败', 'error')
  } catch (e) { showToast('保存失败', 'error') }
}

// 监测记录操作
async function addRecord() {
  if (!currentUser.value) { showToast('请先选择健康档案', 'error'); return }
  if (!recordForm.measure_date) { showToast('请选择测量日期', 'error'); return }
  try {
    const res = await request.post('/health/record', { user_id: currentUser.value.id, ...recordForm })
    if (res.code === 200) {
      showToast('记录保存成功')
      Object.assign(recordForm, { systolic: null, diastolic: null, blood_sugar: null, heart_rate: null, weight: null, remark: '' })
      loadRecords()
    } else showToast(res.msg || '保存失败', 'error')
  } catch (e) { showToast('保存失败', 'error') }
}
function deleteRecord(r) {
  confirmDelete(`确定删除 ${r.measure_date} 的这条记录吗？`, async () => {
    try {
      const res = await request.delete(`/health/record?id=${r.id}`)
      if (res.code === 200) { showToast('删除成功'); loadRecords() }
      else showToast(res.msg || '删除失败', 'error')
    } catch (e) { showToast('删除失败', 'error') }
  })
}

// 慢病操作
function openChronicEdit(c) {
  if (c && c.id) Object.assign(chronicForm, c)
  else Object.assign(chronicForm, { id: null, disease_name: '', diagnose_date: '', stage: '', track_note: '', rehab_guide: '' })
  chronicModalShow.value = true
}
async function saveChronic() {
  if (!currentUser.value || !chronicForm.disease_name) { showToast('请填写病名', 'error'); return }
  try {
    const res = await request.post('/health/chronic', { user_id: currentUser.value.id, ...chronicForm })
    if (res.code === 200) { showToast('慢病档案已保存'); chronicModalShow.value = false; loadChronic() }
    else showToast(res.msg || '保存失败', 'error')
  } catch (e) { showToast('保存失败', 'error') }
}
function deleteChronic(c) {
  confirmDelete(`确定删除「${c.disease_name}」档案吗？`, async () => {
    try {
      const res = await request.delete(`/health/chronic?id=${c.id}`)
      if (res.code === 200) { showToast('删除成功'); loadChronic() }
      else showToast(res.msg || '删除失败', 'error')
    } catch (e) { showToast('删除失败', 'error') }
  })
}

// 用药提醒操作
function openReminderEdit(rm) {
  if (rm && rm.id) Object.assign(reminderForm, rm)
  else Object.assign(reminderForm, { id: null, disease_name: '', medicine_name: '', dosage: '', frequency: '', remind_time: '', enabled: 1 })
  reminderModalShow.value = true
}
async function saveReminder() {
  if (!currentUser.value || !reminderForm.medicine_name) { showToast('请填写药名', 'error'); return }
  try {
    const res = await request.post('/health/reminder', { user_id: currentUser.value.id, ...reminderForm })
    if (res.code === 200) { showToast('用药提醒已保存'); reminderModalShow.value = false; loadReminders() }
    else showToast(res.msg || '保存失败', 'error')
  } catch (e) { showToast('保存失败', 'error') }
}
function deleteReminder(rm) {
  confirmDelete(`确定删除「${rm.medicine_name}」提醒吗？`, async () => {
    try {
      const res = await request.delete(`/health/reminder?id=${rm.id}`)
      if (res.code === 200) { showToast('删除成功'); loadReminders() }
      else showToast(res.msg || '删除失败', 'error')
    } catch (e) { showToast('删除失败', 'error') }
  })
}

// 数据加载
async function loadUsers() {
  try {
    const res = await request.get('/health/users')
    users.value = res.data || []
    if (users.value.length && !currentUserId.value) currentUserId.value = users.value[0].id
  } catch (e) { console.error('加载档案失败', e) }
}
function switchUser() { loadAll() }
async function loadRecords() {
  if (!currentUserId.value) { recordList.value = []; return }
  try {
    const res = await request.get(`/health/records?user_id=${currentUserId.value}`)
    recordList.value = res.data || []
  } catch (e) { recordList.value = [] }
}
async function loadRisks() {
  if (!currentUserId.value) { riskHistory.value = []; return }
  try {
    const res = await request.get(`/health/risks?user_id=${currentUserId.value}`)
    riskHistory.value = res.data || []
  } catch (e) { riskHistory.value = [] }
}
async function loadPlans() {
  if (!currentUserId.value) { planHistory.value = []; return }
  try {
    const res = await request.get(`/health/plans?user_id=${currentUserId.value}`)
    planHistory.value = res.data || []
  } catch (e) { planHistory.value = [] }
}
async function loadChronic() {
  if (!currentUserId.value) { chronicList.value = []; return }
  try {
    const res = await request.get(`/health/chronic?user_id=${currentUserId.value}`)
    chronicList.value = res.data || []
  } catch (e) { chronicList.value = [] }
}
async function loadReminders() {
  if (!currentUserId.value) { reminderList.value = []; return }
  try {
    const res = await request.get(`/health/reminders?user_id=${currentUserId.value}`)
    reminderList.value = res.data || []
  } catch (e) { reminderList.value = [] }
}
function loadAll() {
  riskResult.value = null
  Object.assign(recordForm, { measure_date: today() })
  loadRecords()
  loadRisks()
  loadPlans()
  loadChronic()
  loadReminders()
}

onMounted(async () => {
  recordForm.measure_date = today()
  await loadUsers()
  loadAll()
})
</script>

<style scoped>
.health-page {
  min-height: 100vh;
  background: #f0f4f8;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  color: #1f2937;
}

/* 顶部 */
.health-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 28px;
  background: linear-gradient(135deg, #2196f3 0%, #1565c0 100%);
  box-shadow: 0 2px 10px rgba(21, 101, 192, 0.18);
  gap: 16px;
  flex-wrap: wrap;
}
.hd-left { display: flex; align-items: center; gap: 16px; }
.back-btn {
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.4);
  padding: 7px 16px;
  border-radius: 18px;
  cursor: pointer;
  font-size: 14px;
  transition: background .2s;
}
.back-btn:hover { background: rgba(255, 255, 255, 0.24); }
.hd-title .hd-kicker { display: block; font-size: 11px; color: rgba(255, 255, 255, 0.75); letter-spacing: 1.5px; }
.hd-title h1 { margin: 2px 0 0; font-size: 21px; font-weight: 600; color: #fff; }
.hd-right { display: flex; align-items: center; gap: 10px; }
.user-select {
  padding: 9px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.95);
  font-size: 14px;
  color: #1f2937;
  outline: none;
  min-width: 220px;
}
.hd-btn {
  padding: 9px 16px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  transition: background .2s;
}
.hd-btn:hover { background: rgba(255, 255, 255, 0.28); }

/* 档案概览 */
.profile-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #fff;
  border-radius: 12px;
  padding: 16px 20px;
  margin: 20px 28px 0;
  box-shadow: 0 2px 8px rgba(21, 101, 192, 0.06);
}
.profile-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2196f3, #1565c0);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 600;
  flex-shrink: 0;
}
.profile-name { font-size: 17px; font-weight: 600; color: #1a2740; }
.profile-tag { font-size: 12px; color: #1976d2; background: #e3f2fd; padding: 2px 10px; border-radius: 4px; margin-left: 6px; }
.profile-meta { font-size: 13px; color: #55606e; margin-top: 4px; }
.profile-history { font-size: 13px; color: #8696a8; margin-top: 3px; }

/* 标签页 */
.tab-bar {
  display: flex;
  gap: 6px;
  padding: 0 28px;
  background: #fff;
  border-bottom: 1px solid #e5eaf0;
  margin-top: 20px;
}
.tab-bar button {
  border: none;
  background: transparent;
  padding: 14px 20px;
  cursor: pointer;
  font-size: 15px;
  color: #5b6b7f;
  border-bottom: 3px solid transparent;
  transition: all .2s;
}
.tab-bar button:not(.active):hover { color: #1976d2; }
.tab-bar button.active { color: #1976d2; border-bottom-color: #1976d2; font-weight: 600; }

.view-body { padding: 24px 28px; max-width: 1200px; margin: 0 auto; }

/* 面板 */
.panel {
  background: #fff;
  border-radius: 12px;
  padding: 22px;
  margin-bottom: 18px;
  box-shadow: 0 2px 8px rgba(21, 101, 192, 0.06);
}
.panel-title { margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #1a2740; }
.panel-sub { margin: -8px 0 0; font-size: 13px; color: #8696a8; }
.panel-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }

.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 18px; }
@media (max-width: 900px) { .two-col { grid-template-columns: 1fr; } }

/* 表单 */
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-item { display: flex; flex-direction: column; gap: 6px; }
.form-item.full { grid-column: 1 / -1; }
.form-item label { font-size: 13px; color: #55606e; }
.form-item label i { color: #ef5350; font-style: normal; }
.form-item input, .form-item select, .form-item textarea {
  padding: 10px 14px;
  border: 1px solid #d8e1ec;
  border-radius: 8px;
  font-size: 14px;
  color: #1f2937;
  outline: none;
  transition: all .2s;
  font-family: inherit;
  resize: vertical;
}
.form-item input:focus, .form-item select:focus, .form-item textarea:focus { border-color: #2196f3; box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.12); }

/* 按钮 */
.btn-primary {
  background: #2196f3;
  color: #fff;
  border: none;
  padding: 10px 22px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: background .2s;
}
.btn-primary:hover { background: #1976d2; }
.btn-warm {
  background: #ff9800;
  color: #fff;
  border: none;
  padding: 10px 22px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: background .2s;
}
.btn-warm:hover { background: #f57c00; }
.btn-ghost {
  background: #fff;
  color: #1976d2;
  border: 1px solid #c8d8ea;
  padding: 9px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all .2s;
}
.btn-ghost:hover { background: #eef4fb; border-color: #2196f3; }

/* 指标卡片 */
.metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 18px; }
@media (max-width: 640px) { .metric-grid { grid-template-columns: repeat(2, 1fr); } }
.metric-card {
  border: 1px solid #e5eaf0;
  border-radius: 10px;
  padding: 14px;
  text-align: center;
  background: #fafcff;
}
.m-label { font-size: 13px; color: #8696a8; }
.m-value { font-size: 26px; font-weight: 700; color: #1a2740; margin: 6px 0 4px; }
.m-unit { font-size: 13px; font-weight: normal; color: #8696a8; margin-left: 3px; }
.m-status { font-size: 12px; padding: 2px 10px; border-radius: 999px; display: inline-block; }
.m-status.good { background: #e8f5e9; color: #2e7d32; }
.m-status.bad { background: #ffebee; color: #c62828; }
.m-status.warn { background: #fff3e0; color: #ef6c00; }
.m-status.idle { background: #f0f4f8; color: #96a4b5; }

/* 趋势 */
.trend-box { background: #fafcff; border: 1px solid #e5eaf0; border-radius: 10px; padding: 12px; }
.trend-title { font-size: 13px; color: #55606e; margin-bottom: 8px; }
.trend-svg { width: 100%; height: auto; display: block; background: #fff; border-radius: 6px; }
.trend-legend { display: flex; gap: 16px; margin-top: 8px; font-size: 12px; color: #55606e; }
.trend-legend i { display: inline-block; width: 14px; height: 3px; border-radius: 2px; margin-right: 5px; vertical-align: middle; }

/* 表格 */
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td {
  text-align: left;
  padding: 11px 14px;
  font-size: 13px;
  border-bottom: 1px solid #eef2f7;
}
.data-table th { color: #6b7b8f; font-weight: 600; background: #f4f7fb; }
.data-table th:first-child { border-radius: 8px 0 0 8px; }
.data-table th:last-child { border-radius: 0 8px 8px 0; }
.data-table td b { color: #1a2740; }

.link-del { color: #1976d2; cursor: pointer; font-size: 13px; margin-right: 8px; }
.link-del:hover { text-decoration: underline; }
.link-del.del { color: #ef5350; }

/* 风险评估 */
.risk-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.risk-sub-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 4px; }
.risk-sub-row .panel-sub { margin: 0; }
.risk-sub-row .btn-primary { flex-shrink: 0; }
.risk-result {
  margin-top: 16px;
  border: 1px solid #e5eaf0;
  border-radius: 10px;
  padding: 18px;
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.risk-level {
  font-size: 16px;
  font-weight: 700;
  padding: 8px 18px;
  border-radius: 8px;
  white-space: nowrap;
}
.risk-level.sm { font-size: 13px; padding: 4px 12px; }
.lv-low { background: #e8f5e9; color: #2e7d32; }
.lv-mid { background: #fff3e0; color: #ef6c00; }
.lv-high { background: #ffebee; color: #c62828; }
.risk-body { flex: 1; }
.risk-title { font-size: 14px; font-weight: 600; color: #1a2740; margin: 6px 0 8px; }
.risk-items { margin: 0; padding-left: 18px; }
.risk-items li { font-size: 13px; color: #55606e; margin-bottom: 5px; }
.risk-sugg { margin: 0; font-size: 13px; color: #55606e; line-height: 1.8; }
.risk-actions { display: flex; justify-content: flex-end; }
.risk-hist {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 12px 0;
  border-bottom: 1px solid #eef2f7;
}
.risk-hist .link-del { margin-left: auto; align-self: center; flex-shrink: 0; }
.rh-date { font-size: 13px; color: #8696a8; margin-bottom: 4px; }
.rh-items { font-size: 13px; color: #55606e; }

/* 方案 */
.goal-row { display: flex; gap: 12px; margin-bottom: 16px; align-items: stretch; }
.goal-row .btn-primary { min-width: 110px; flex-shrink: 0; }
.search-input {
  flex: 1;
  padding: 10px 16px;
  border: 1px solid #d8e1ec;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: all .2s;
}
.search-input:focus { border-color: #2196f3; box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.12); }
.plan-preview { border: 1px solid #e5eaf0; border-radius: 10px; padding: 16px; margin-right: 122px; }
.plan-block { margin-bottom: 14px; }
.plan-block h4 { margin: 0 0 6px; font-size: 14px; color: #1a2740; }
.plan-block p { margin: 0; font-size: 13px; color: #55606e; line-height: 1.8; }
.plan-hist { border-bottom: 1px solid #eef2f7; padding: 14px 0; }
.ph-head { display: flex; gap: 12px; align-items: center; margin-bottom: 8px; }
.ph-head .link-del { margin-left: auto; flex-shrink: 0; }
.ph-date { font-size: 12px; color: #fff; background: #2196f3; padding: 3px 10px; border-radius: 4px; }
.ph-head b { font-size: 15px; color: #1a2740; }
.ph-line { font-size: 13px; color: #55606e; margin-bottom: 5px; }

/* 慢病 */
.chronic-list { display: flex; flex-direction: column; gap: 12px; }
.chronic-card { border: 1px solid #e5eaf0; border-radius: 10px; padding: 16px; }
.cc-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.cc-head b { font-size: 16px; color: #1a2740; }
.stage-tag { font-size: 12px; color: #ef6c00; background: #fff3e0; padding: 2px 10px; border-radius: 4px; }
.cc-line { font-size: 13px; color: #55606e; margin-bottom: 5px; }
.cc-line.rehab { background: #f4f8fc; border-radius: 6px; padding: 8px 10px; }

/* 状态标签 */
.status-tag { font-size: 12px; padding: 2px 10px; border-radius: 4px; }
.status-tag.on { background: #e8f5e9; color: #2e7d32; }
.status-tag.off { background: #f0f4f8; color: #96a4b5; }

/* 弹窗 */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(20, 30, 50, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-card {
  background: #fff;
  border-radius: 14px;
  padding: 26px;
  width: 520px;
  max-width: 92vw;
  box-shadow: 0 20px 50px rgba(20, 40, 80, 0.25);
  animation: popIn .18s ease;
  max-height: 88vh;
  overflow-y: auto;
}
@keyframes popIn { from { transform: scale(.94); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.em-title { margin: 0 0 18px; font-size: 17px; font-weight: 600; color: #1a2740; }
.em-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px; }

/* toast */
.toast-tip {
  position: fixed;
  top: 90px;
  left: 50%;
  transform: translateX(-50%);
  padding: 11px 22px;
  border-radius: 8px;
  font-size: 14px;
  color: #fff;
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.16);
  z-index: 1001;
  animation: popIn .18s ease;
}
.toast-tip.success { background: #2196f3; }
.toast-tip.error { background: #ef5350; }

/* 小巧确认弹窗 */
.confirm-mask {
  position: fixed;
  inset: 0;
  background: rgba(20, 30, 50, 0.32);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}
.confirm-card {
  background: #fff;
  border-radius: 12px;
  padding: 22px 24px;
  width: 300px;
  max-width: 86vw;
  text-align: center;
  box-shadow: 0 16px 40px rgba(20, 40, 80, 0.22);
  animation: popIn .16s ease;
}
.confirm-text { font-size: 14px; color: #1f2937; line-height: 1.6; margin-bottom: 18px; }
.confirm-actions { display: flex; gap: 12px; justify-content: center; }
.cf-btn {
  flex: 1;
  padding: 8px 0;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  transition: all .2s;
}
.cf-btn.cancel { background: #eef2f7; color: #55606e; }
.cf-btn.cancel:hover { background: #e2e8f0; }
.cf-btn.ok { background: #ef5350; color: #fff; }
.cf-btn.ok:hover { background: #e53935; }

.empty { text-align: center; color: #96a4b5; font-size: 14px; padding: 30px 0; }
</style>