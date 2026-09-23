<template>
  <div class="pc-page">
    <!-- ===== 顶部用户名片 ===== -->
    <header class="pc-hero">
      <div class="pc-hero-inner">
        <div class="pc-avatar">{{ firstChar }}</div>
        <div class="pc-user">
          <div class="pc-name-row">
            <span class="pc-name">{{ user.username || '未登录' }}</span>
            <span class="pc-role" :class="{ admin: user.role === 'admin' }">{{ user.role === 'admin' ? '管理员' : '普通用户' }}</span>
          </div>
          <div class="pc-phone">{{ phone || '未绑定手机号' }}</div>
        </div>
        <div class="pc-hero-btns">
          <button class="pc-btn ghost" @click="$router.push('/home')">← 返回首页</button>
          <button v-if="user.role === 'admin'" class="pc-btn admin" @click="$router.push('/admin-manage')">🛡️ 权限管理</button>
          <button class="pc-btn danger" @click="handleLogout">退出登录</button>
        </div>
      </div>
    </header>

    <div class="pc-container">
      <!-- ===== 数据统计（可点击联动） ===== -->
      <section class="pc-stats">
        <div class="stat-card clickable" @click="switchTab('appoint')">
          <div class="stat-icon" style="background:#e3f2fd;color:#1976d2">📅</div>
          <div class="stat-info">
            <div class="stat-num">{{ appointList.length }}</div>
            <div class="stat-label">我的预约</div>
          </div>
        </div>
        <div class="stat-card clickable" @click="switchTab('collect')">
          <div class="stat-icon" style="background:#fff3e0;color:#ef6c00">⭐</div>
          <div class="stat-info">
            <div class="stat-num">{{ collectList.length }}</div>
            <div class="stat-label">我的收藏</div>
          </div>
        </div>
        <div class="stat-card clickable" @click="switchTab('site')">
          <div class="stat-icon" style="background:#e8f5e9;color:#2e7d32">📍</div>
          <div class="stat-info">
            <div class="stat-num">{{ siteHis.length }}</div>
            <div class="stat-label">选址评估</div>
          </div>
        </div>
        <div class="stat-card clickable" @click="gotoHealth">
          <div class="stat-icon" style="background:#f3e5f5;color:#8e24aa">📋</div>
          <div class="stat-info">
            <div class="stat-num">{{ healthProfile ? 1 : 0 }}</div>
            <div class="stat-label">健康档案</div>
          </div>
        </div>
      </section>

      <!-- ===== 我的健康档案（联动健康管理） ===== -->
      <section class="pc-health" v-if="healthProfile" @click="gotoHealth">
        <div class="health-left">
          <div class="health-avatar">{{ (healthProfile.name || '健')[0] }}</div>
          <div class="health-meta">
            <div class="health-name">
              {{ healthProfile.name }}
              <span class="health-tag" v-if="healthProfile.gender">{{ healthProfile.gender }}</span>
              <span class="health-tag" v-if="healthProfile.age">{{ healthProfile.age }}岁</span>
              <span class="health-tag bmi" v-if="bmi">BMI {{ bmi }}</span>
            </div>
            <div class="health-sub">
              身高 {{ healthProfile.height || '-' }}cm · 体重 {{ healthProfile.weight || '-' }}kg
            </div>
          </div>
        </div>
        <div class="health-history" v-if="healthProfile.history">既往病史：{{ healthProfile.history }}</div>
        <button class="pc-btn primary" @click.stop="gotoHealth">进入健康管理</button>
      </section>
      <!-- 无健康档案时的引导 -->
      <section class="pc-health empty-health" v-else-if="phone" @click="gotoHealth">
        <div class="health-left">
          <div class="health-avatar" style="background:#e0e6ee;color:#96a4b5">＋</div>
          <div class="health-meta">
            <div class="health-name">尚未建立健康档案</div>
            <div class="health-sub">建立档案后可进行健康监测、风险评估与用药提醒</div>
          </div>
        </div>
        <button class="pc-btn primary" @click.stop="gotoHealth">去建档</button>
      </section>

      <!-- ===== 快捷入口 ===== -->
      <section class="pc-grid">
        <div class="grid-item" @click="$router.push('/medical-staff-query')">
          <div class="gi-icon" style="background:#e3f2fd;color:#1976d2">👨‍⚕️</div>
          <span>预约挂号</span>
        </div>
        <div class="grid-item" @click="$router.push('/drug-database')">
          <div class="gi-icon" style="background:#e8f5e9;color:#2e7d32">💊</div>
          <span>药品数据库</span>
        </div>
        <div class="grid-item" @click="gotoHealth">
          <div class="gi-icon" style="background:#fff3e0;color:#ef6c00">❤️</div>
          <span>健康管理</span>
        </div>
        <div class="grid-item" @click="$router.push('/notice')">
          <div class="gi-icon" style="background:#f3e5f5;color:#8e24aa">📢</div>
          <span>系统公告</span>
        </div>
        <div class="grid-item" @click="$router.push('/home')">
          <div class="gi-icon" style="background:#e0f7fa;color:#00838f">🗺️</div>
          <span>平台地图</span>
        </div>
      </section>

      <!-- ===== 记录切换 ===== -->
      <nav class="pc-tabs">
        <button :class="{ active: tab === 'appoint' }" @click="tab = 'appoint'">我的预约</button>
        <button :class="{ active: tab === 'collect' }" @click="tab = 'collect'">我的收藏</button>
        <button :class="{ active: tab === 'site' }" @click="tab = 'site'">选址历史</button>
        <button :class="{ active: tab === 'search' }" @click="tab = 'search'">查询历史</button>
      </nav>

      <section class="pc-body">
        <!-- 我的预约 -->
        <div v-if="tab === 'appoint'">
          <div class="appoint-card" v-for="a in appointList" :key="a.id">
            <div class="ap-head">
              <div class="ap-doctor">
                <div class="ap-avatar">{{ (a.doctor_name || '医')[0] }}</div>
                <div>
                  <div class="ap-name">{{ a.doctor_name }}</div>
                  <div class="ap-dept">{{ a.department || '-' }}</div>
                </div>
              </div>
              <span class="ap-status" :class="appointState(a).cls">{{ appointState(a).text }}</span>
            </div>
            <div class="ap-line"><span class="lbl">医院</span>{{ a.hospital_name || '-' }}</div>
            <div class="ap-line">
              <span class="lbl">时间</span>{{ a.appoint_date || '-' }} {{ a.time_slot || '' }}
              <span class="ap-countdown" v-if="appointState(a).cls === 'on' || appointState(a).cls === 'soon'">{{ daysUntil(a.appoint_date) }}</span>
            </div>
            <div class="ap-line" v-if="a.remark"><span class="lbl">备注</span>{{ a.remark }}</div>
            <div class="ap-foot">
              <span class="ap-patient" v-if="a.patient_name">预约人：{{ a.patient_name }}</span>
              <span class="ap-patient" v-if="a.patient_phone">{{ a.patient_phone }}</span>
              <div class="ap-foot-btns" v-if="appointState(a).cls === 'on' || appointState(a).cls === 'soon'">
                <button class="pc-btn sm" @click="openEditAppoint(a)">编辑</button>
                <button class="pc-btn sm danger" @click="cancelAppoint(a)">取消预约</button>
              </div>
            </div>
          </div>
          <div class="empty" v-if="appointList.length === 0">
            <template v-if="phone">暂无预约记录，去「预约挂号」里挂个号吧</template>
            <template v-else>未绑定手机号，暂无法关联预约记录</template>
            <div class="empty-actions" v-if="phone">
              <button class="pc-btn primary sm" @click="$router.push('/medical-staff-query')">去预约挂号</button>
            </div>
          </div>
        </div>

        <!-- 我的收藏 -->
        <div v-else-if="tab === 'collect'">
          <div class="collect-card" v-for="c in collectList" :key="c.id || c.point_id">
            <div class="col-left">
              <div class="col-icon" :style="collectIconStyle(c.type)">{{ collectIcon(c.type) }}</div>
              <div class="col-info">
                <div class="col-name">{{ c.name }}</div>
                <div class="col-addr">{{ c.type }}｜{{ c.address || '暂无地址' }}</div>
              </div>
            </div>
            <button class="pc-btn sm danger" @click="cancelCollect(c)">取消收藏</button>
          </div>
          <div class="empty" v-if="collectList.length === 0">
            暂无收藏，去地图上收藏感兴趣的医疗点位吧
            <div class="empty-actions">
              <button class="pc-btn primary sm" @click="$router.push('/home')">去地图收藏</button>
            </div>
          </div>
        </div>

        <!-- 选址历史 -->
        <div v-else-if="tab === 'site'">
          <div class="his-card" v-for="h in siteHis" :key="h.id">
            <div class="his-icon">📍</div>
            <div class="his-info">
              <div class="his-name">{{ h.eval_name || '未命名评估' }}</div>
              <div class="his-time">{{ h.create_time }}</div>
              <div class="his-desc" v-if="h.resultJson">{{ summarizeSite(h.resultJson) }}</div>
            </div>
          </div>
          <div class="empty" v-if="siteHis.length === 0">
            暂无选址评估记录
            <div class="empty-actions">
              <button class="pc-btn primary sm" @click="$router.push('/home')">去做选址评估</button>
            </div>
          </div>
        </div>

        <!-- 查询历史 -->
        <div v-else>
          <div class="his-card" v-for="s in searchHis" :key="s.id">
            <div class="his-icon">🔍</div>
            <div class="his-info">
              <div class="his-name">{{ s.search_text || '-' }}</div>
              <div class="his-time">{{ s.create_time }}</div>
            </div>
          </div>
          <div class="empty" v-if="searchHis.length === 0">暂无查询记录</div>
        </div>
      </section>
    </div>

    <!-- ===== 编辑预约弹窗 ===== -->
    <div class="confirm-mask" v-if="editShow" @click.self="editShow = false">
      <div class="edit-card">
        <div class="edit-head">
          <h3>编辑预约</h3>
          <span class="edit-close" @click="editShow = false">×</span>
        </div>
        <div class="edit-doctor" v-if="editForm.doctor_name">
          接诊医生：{{ editForm.doctor_name }} · {{ editForm.hospital_name || '' }} · {{ editForm.department || '' }}
        </div>
        <div class="eform-grid">
          <div class="form-item">
            <label>姓名 <i>*</i></label>
            <input v-model="editForm.patient_name" placeholder="患者姓名" />
          </div>
          <div class="form-item">
            <label>性别</label>
            <select v-model="editForm.patient_gender">
              <option value="">请选择</option>
              <option value="男">男</option>
              <option value="女">女</option>
            </select>
          </div>
          <div class="form-item">
            <label>年龄</label>
            <input v-model.number="editForm.patient_age" type="number" placeholder="年龄" />
          </div>
          <div class="form-item">
            <label>手机号 <i>*</i></label>
            <input v-model="editForm.patient_phone" placeholder="预留手机号" />
          </div>
          <div class="form-item">
            <label>预约日期 <i>*</i></label>
            <input v-model="editForm.appoint_date" type="date" />
          </div>
          <div class="form-item">
            <label>时间段 <i>*</i></label>
            <select v-model="editForm.time_slot">
              <option value="">请选择</option>
              <option v-for="s in timeSlots" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
          <div class="form-item full">
            <label>备注</label>
            <input v-model="editForm.remark" placeholder="就诊需求、病史等（选填）" />
          </div>
        </div>
        <div class="edit-actions">
          <button class="cf-btn cancel" @click="editShow = false">取消</button>
          <button class="cf-btn ok" @click="saveEditAppoint">保存</button>
        </div>
      </div>
    </div>

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

    <!-- toast -->
    <div class="pc-toast" :class="toast.type" v-if="toast.show">{{ toast.text }}</div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import request from '../api/request'
import { getUserInfo, clearStorage } from '../utils/storage'

const router = useRouter()
const user = ref(getUserInfo() || {})
const userId = computed(() => user.value.userId || user.value.id || null)
const phone = computed(() => {
  const u = user.value
  return u.phone || u.mobile || (u.username && /^1\d{10}$/.test(u.username) ? u.username : '')
})
const firstChar = computed(() => (user.value.username || '用')[0])

const tab = ref('appoint')
const appointList = ref([])
const collectList = ref([])
const siteHis = ref([])
const searchHis = ref([])
const healthProfile = ref(null)

const toast = reactive({ show: false, text: '', type: 'success' })
const confirmBox = reactive({ show: false, text: '', onOk: null })

const timeSlots = ['上午 08:30-11:30', '下午 13:30-16:30', '全天 08:00-16:30']

// 编辑预约
const editShow = ref(false)
const editForm = reactive({
  id: null, doctor_id: null, doctor_name: '', hospital_name: '', department: '',
  patient_name: '', patient_gender: '', patient_age: null, patient_phone: '',
  appoint_date: '', time_slot: '', remark: ''
})

const bmi = computed(() => {
  const h = healthProfile.value
  if (h && h.height && h.weight) {
    return (h.weight / Math.pow(h.height / 100, 2)).toFixed(1)
  }
  return null
})

function showToast(text, type = 'success') {
  toast.text = text
  toast.type = type
  toast.show = true
  setTimeout(() => { toast.show = false }, 2200)
}
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

function handleLogout() {
  clearStorage()
  router.push('/login')
}

function switchTab(t) {
  tab.value = t
}
function gotoHealth() {
  router.push('/health-management')
}

// 预约状态
function appointState(a) {
  if (a.status === '已取消') return { cls: 'off', text: '已取消' }
  const t = new Date(); t.setHours(0, 0, 0, 0)
  const d = new Date(a.appoint_date)
  if (!isNaN(d.getTime()) && d < t) return { cls: 'done', text: '已结束' }
  if (!isNaN(d.getTime()) && d.getTime() === t.getTime()) return { cls: 'soon', text: '今天就诊' }
  return { cls: 'on', text: '待就诊' }
}
function daysUntil(dateStr) {
  if (!dateStr) return ''
  const t = new Date(); t.setHours(0, 0, 0, 0)
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const diff = Math.round((d - t) / 86400000)
  if (diff < 0) return ''
  if (diff === 0) return '· 今天就诊'
  return `· ${diff} 天后就诊`
}

onMounted(() => { loadAll() })

async function loadAll() {
  await Promise.all([loadAppoints(), loadCollects(), loadSiteHis(), loadSearchHis(), loadHealth()])
}

async function loadAppoints() {
  if (!phone.value) { appointList.value = []; return }
  try {
    const res = await request.get(`/staff/appointments?phone=${encodeURIComponent(phone.value)}`)
    appointList.value = res.data || []
  } catch (e) { appointList.value = [] }
}
async function loadCollects() {
  if (!userId.value) { collectList.value = []; return }
  try {
    const res = await request.get(`/collect/myCollect/${userId.value}`)
    collectList.value = res.data || []
  } catch (e) { collectList.value = [] }
}
async function loadSiteHis() {
  if (!userId.value) { siteHis.value = []; return }
  try {
    const res = await request.get(`/collect/siteHistory/${userId.value}`)
    siteHis.value = res.data || []
  } catch (e) { siteHis.value = [] }
}
async function loadSearchHis() {
  if (!userId.value) { searchHis.value = []; return }
  try {
    const res = await request.get(`/collect/searchHistory/${userId.value}`)
    searchHis.value = res.data || []
  } catch (e) { searchHis.value = [] }
}
async function loadHealth() {
  if (!phone.value) { healthProfile.value = null; return }
  try {
    const res = await request.get(`/health/users?phone=${encodeURIComponent(phone.value)}`)
    healthProfile.value = res.data || null
  } catch (e) { healthProfile.value = null }
}

// 编辑预约
function openEditAppoint(a) {
  Object.assign(editForm, {
    id: a.id, doctor_id: a.doctor_id, doctor_name: a.doctor_name,
    hospital_name: a.hospital_name, department: a.department,
    patient_name: a.patient_name, patient_gender: a.patient_gender, patient_age: a.patient_age,
    patient_phone: a.patient_phone, appoint_date: a.appoint_date, time_slot: a.time_slot, remark: a.remark || ''
  })
  editShow.value = true
}
async function saveEditAppoint() {
  if (!editForm.patient_name || !editForm.patient_phone || !editForm.appoint_date || !editForm.time_slot) {
    showToast('请填写姓名、手机号、日期与时间段', 'error')
    return
  }
  try {
    const res = await request.post('/staff/appointment/edit', { ...editForm })
    if (res.code === 200) {
      showToast('修改成功')
      editShow.value = false
      loadAppoints()
    } else {
      showToast(res.msg || '修改失败', 'error')
    }
  } catch (e) { showToast('修改失败，请重试', 'error') }
}

async function cancelAppoint(a) {
  confirmDelete(`确定取消与 ${a.doctor_name || '该医生'} 的预约吗？`, async () => {
    try {
      const res = await request.post('/staff/appointment/delete', { id: a.id })
      if (res.code === 200) { showToast('已取消预约'); loadAppoints() }
      else showToast(res.msg || '取消失败', 'error')
    } catch (e) { showToast('取消失败', 'error') }
  })
}

async function cancelCollect(c) {
  confirmDelete(`确定取消收藏「${c.name}」吗？`, async () => {
    try {
      const res = await request.delete('/collect/cancelCollect', { data: { user_id: userId.value, point_id: c.point_id } })
      showToast('已取消收藏')
      loadCollects()
    } catch (e) { showToast('取消失败', 'error') }
  })
}

function collectIcon(type) {
  const t = String(type || '')
  if (t.includes('医院')) return '🏥'
  if (t.includes('社区') || t.includes('卫生')) return '🏘️'
  if (t.includes('药')) return '💊'
  return '📍'
}
function collectIconStyle(type) {
  const t = String(type || '')
  if (t.includes('医院')) return { background: '#ffebee', color: '#c62828' }
  if (t.includes('社区') || t.includes('卫生')) return { background: '#e3f2fd', color: '#1565c0' }
  if (t.includes('药')) return { background: '#e8f5e9', color: '#2e7d32' }
  return { background: '#e0f7fa', color: '#00838f' }
}
function summarizeSite(json) {
  try {
    const o = JSON.parse(json)
    if (o && o.densityLevel) return `${o.densityLevel}｜周边 ${o.aroundCount} 个医疗点位`
    return ''
  } catch (e) { return '' }
}
</script>

<style scoped>
.pc-page {
  min-height: 100vh;
  background:
    radial-gradient(1100px 420px at 0% 0%, rgba(33, 150, 243, 0.09), transparent 55%),
    linear-gradient(180deg, #e9f1fb 0%, #f4f8fd 36%, #edf2f7 100%);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  color: #1f2937;
}

/* ===== Hero ===== */
.pc-hero {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(1000px 380px at 85% -30%, rgba(120, 190, 255, 0.5), transparent 60%),
    radial-gradient(700px 300px at 5% 150%, rgba(21, 101, 192, 0.5), transparent 65%),
    linear-gradient(135deg, #1565c0 0%, #1e88e5 45%, #42a5f5 100%);
  box-shadow: 0 6px 24px rgba(21, 101, 192, 0.28);
}
.pc-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(115deg, rgba(255, 255, 255, 0.05) 0 2px, transparent 2px 28px);
  pointer-events: none;
}
.pc-hero-inner {
  position: relative;
  z-index: 1;
  max-width: 1080px;
  margin: 0 auto;
  padding: 24px 28px;
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
}
.pc-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.22);
  border: 2px solid rgba(255, 255, 255, 0.7);
  color: #fff;
  font-size: 28px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.pc-user { flex: 1; min-width: 160px; }
.pc-name-row { display: flex; align-items: center; gap: 10px; }
.pc-name { font-size: 22px; font-weight: 700; color: #fff; }
.pc-role {
  font-size: 12px;
  color: #fff;
  background: rgba(255, 255, 255, 0.22);
  padding: 2px 10px;
  border-radius: 999px;
}
.pc-role.admin { background: #ff9800; }
.pc-phone { font-size: 13px; color: rgba(255, 255, 255, 0.82); margin-top: 5px; }
.pc-hero-btns { display: flex; gap: 10px; }
.pc-btn {
  border: none;
  cursor: pointer;
  border-radius: 8px;
  font-size: 14px;
  padding: 10px 18px;
  transition: all .2s;
}
.pc-btn.ghost { background: rgba(255, 255, 255, 0.16); color: #fff; border: 1px solid rgba(255, 255, 255, 0.5); }
.pc-btn.ghost:hover { background: rgba(255, 255, 255, 0.28); }
.pc-btn.danger { background: #fff; color: #e53935; }
.pc-btn.danger:hover { background: #ffebee; }
.pc-btn.admin { background: #ff9800; color: #fff; }
.pc-btn.admin:hover { background: #f57c00; }
.pc-btn.primary { background: #2196f3; color: #fff; }
.pc-btn.primary:hover { background: #1976d2; }
.pc-btn.sm { padding: 6px 14px; font-size: 13px; }

/* ===== 容器 ===== */
.pc-container { max-width: 1080px; margin: 0 auto; padding: 22px 28px 40px; }

/* ===== 统计 ===== */
.pc-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 18px;
}
.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: 0 2px 8px rgba(21, 101, 192, 0.06);
}
.stat-card.clickable { cursor: pointer; transition: transform .15s, box-shadow .15s; }
.stat-card.clickable:hover { transform: translateY(-3px); box-shadow: 0 8px 18px rgba(21, 101, 192, 0.12); }
.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}
.stat-num { font-size: 24px; font-weight: 700; color: #1a2740; line-height: 1; }
.stat-label { font-size: 13px; color: #8696a8; margin-top: 4px; }
@media (max-width: 720px) { .pc-stats { grid-template-columns: repeat(2, 1fr); } }

/* ===== 健康档案卡片 ===== */
.pc-health {
  background: #fff;
  border-left: 4px solid #2196f3;
  border-radius: 12px;
  padding: 16px 18px;
  margin-bottom: 18px;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  box-shadow: 0 2px 8px rgba(21, 101, 192, 0.06);
  cursor: pointer;
  transition: transform .15s, box-shadow .15s;
}
.pc-health:hover { transform: translateY(-2px); box-shadow: 0 8px 18px rgba(21, 101, 192, 0.12); }
.pc-health.empty-health { border-left-color: #96a4b5; }
.health-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 220px; }
.health-avatar {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: linear-gradient(135deg, #64b5f6, #1565c0);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 600;
  flex-shrink: 0;
}
.health-name { font-size: 16px; font-weight: 600; color: #1a2740; }
.health-tag { font-size: 12px; color: #1976d2; background: #e3f2fd; padding: 2px 8px; border-radius: 4px; margin-left: 6px; }
.health-tag.bmi { color: #8e24aa; background: #f3e5f5; }
.health-sub { font-size: 13px; color: #55606e; margin-top: 4px; }
.health-history { font-size: 12px; color: #8696a8; flex: 1; min-width: 180px; }

/* ===== 快捷入口 ===== */
.pc-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14px;
  margin-bottom: 20px;
}
.grid-item {
  background: #fff;
  border-radius: 12px;
  padding: 18px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(21, 101, 192, 0.06);
  transition: transform .15s, box-shadow .15s;
}
.grid-item:hover { transform: translateY(-3px); box-shadow: 0 8px 18px rgba(21, 101, 192, 0.12); }
.grid-item span { font-size: 14px; color: #1a2740; }
.gi-icon { width: 46px; height: 46px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 22px; }
@media (max-width: 720px) { .pc-grid { grid-template-columns: repeat(3, 1fr); } }

/* ===== tabs ===== */
.pc-tabs {
  display: flex;
  gap: 6px;
  background: #fff;
  border-radius: 10px;
  padding: 6px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(21, 101, 192, 0.06);
}
.pc-tabs button {
  flex: 1;
  border: none;
  background: transparent;
  padding: 10px 0;
  cursor: pointer;
  font-size: 14px;
  color: #5b6b7f;
  border-radius: 8px;
  transition: all .2s;
}
.pc-tabs button.active { background: linear-gradient(135deg, #2196f3, #1565c0); color: #fff; font-weight: 600; box-shadow: 0 3px 8px rgba(33, 150, 243, 0.32); }

/* ===== 预约卡片 ===== */
.appoint-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px 18px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(21, 101, 192, 0.06);
}
.ap-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.ap-doctor { display: flex; align-items: center; gap: 12px; }
.ap-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #64b5f6, #1565c0);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 19px;
  font-weight: 600;
  flex-shrink: 0;
}
.ap-name { font-size: 16px; font-weight: 600; color: #1a2740; }
.ap-dept { font-size: 13px; color: #8696a8; margin-top: 3px; }
.ap-status { font-size: 12px; color: #1976d2; background: #e3f2fd; padding: 3px 12px; border-radius: 999px; }
.ap-status.soon { color: #ef6c00; background: #fff3e0; }
.ap-status.done { color: #96a4b5; background: #f0f4f8; }
.ap-status.off { color: #96a4b5; background: #f0f4f8; }
.ap-line { font-size: 13px; color: #55606e; margin-bottom: 6px; }
.ap-line .lbl { color: #8696a8; margin-right: 10px; }
.ap-countdown { font-size: 12px; color: #ef6c00; }
.ap-foot { display: flex; align-items: center; gap: 14px; margin-top: 10px; flex-wrap: wrap; }
.ap-patient { font-size: 12px; color: #96a4b5; }
.ap-foot-btns { margin-left: auto; display: flex; gap: 8px; }

/* ===== 收藏卡片 ===== */
.collect-card {
  background: #fff;
  border-radius: 12px;
  padding: 14px 18px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  box-shadow: 0 2px 8px rgba(21, 101, 192, 0.06);
}
.col-left { display: flex; align-items: center; gap: 12px; }
.col-icon { width: 42px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
.col-name { font-size: 15px; font-weight: 600; color: #1a2740; }
.col-addr { font-size: 13px; color: #8696a8; margin-top: 3px; }

/* ===== 历史卡片 ===== */
.his-card {
  background: #fff;
  border-radius: 12px;
  padding: 14px 18px;
  margin-bottom: 12px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  box-shadow: 0 2px 8px rgba(21, 101, 192, 0.06);
}
.his-icon { font-size: 20px; }
.his-name { font-size: 15px; font-weight: 600; color: #1a2740; }
.his-time { font-size: 12px; color: #8696a8; margin-top: 3px; }
.his-desc { font-size: 13px; color: #55606e; margin-top: 4px; }

.empty { text-align: center; color: #96a4b5; font-size: 14px; padding: 40px 0; }
.empty-actions { margin-top: 14px; }

/* ===== 编辑弹窗 ===== */
.edit-card {
  background: #fff;
  border-radius: 14px;
  padding: 24px 26px;
  width: 480px;
  max-width: 92vw;
  box-shadow: 0 20px 50px rgba(20, 40, 80, 0.25);
  animation: popIn .18s ease;
  max-height: 88vh;
  overflow-y: auto;
}
.edit-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.edit-head h3 { margin: 0; font-size: 17px; font-weight: 600; color: #1a2740; }
.edit-close { font-size: 24px; color: #96a4b5; cursor: pointer; line-height: 1; transition: color .2s; }
.edit-close:hover { color: #1976d2; }
.edit-doctor {
  font-size: 13px;
  color: #55606e;
  background: #f4f8fc;
  border-radius: 8px;
  padding: 10px 14px;
  margin-bottom: 16px;
}
.eform-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-item { display: flex; flex-direction: column; gap: 6px; }
.form-item.full { grid-column: 1 / -1; }
.form-item label { font-size: 13px; color: #55606e; }
.form-item label i { color: #ef5350; font-style: normal; }
.form-item input, .form-item select {
  padding: 10px 14px;
  border: 1px solid #d8e1ec;
  border-radius: 8px;
  font-size: 14px;
  color: #1f2937;
  outline: none;
  transition: all .2s;
  font-family: inherit;
}
.form-item input:focus, .form-item select:focus { border-color: #2196f3; box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.12); }
.edit-actions { display: flex; gap: 12px; margin-top: 20px; }
@media (max-width: 520px) { .eform-grid { grid-template-columns: 1fr; } }

/* ===== 确认弹窗 ===== */
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
.confirm-actions { display: flex; gap: 12px; }
.cf-btn { flex: 1; padding: 8px 0; border-radius: 8px; border: none; cursor: pointer; font-size: 14px; transition: all .2s; }
.cf-btn.cancel { background: #eef2f7; color: #55606e; }
.cf-btn.cancel:hover { background: #e2e8f0; }
.cf-btn.ok { background: #2196f3; color: #fff; }
.cf-btn.ok:hover { background: #1976d2; }
@keyframes popIn { from { transform: scale(.94); opacity: 0; } to { transform: scale(1); opacity: 1; } }

/* ===== toast ===== */
.pc-toast {
  position: fixed;
  top: 30px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 22px;
  border-radius: 8px;
  font-size: 14px;
  color: #fff;
  z-index: 1200;
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.16);
  animation: popIn .18s ease;
}
.pc-toast.success { background: #2196f3; }
.pc-toast.error { background: #ef5350; }
</style>