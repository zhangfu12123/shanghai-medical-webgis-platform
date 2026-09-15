<template>
  <div class="staff-page">
    <!-- 顶部：蓝色渐变 -->
    <header class="staff-header">
      <div class="hd-left">
        <button class="back-btn" @click="goBack">← 返回</button>
        <div class="hd-title">
          <span class="hd-kicker">MEDICAL STAFF SERVICE</span>
          <h1>医疗信息库</h1>
        </div>
      </div>
      <span class="hd-sub">浦东新区医院 · 医生信息 · 出诊排班 · 在线预约</span>
    </header>

    <!-- 功能标签页 -->
    <nav class="tab-bar">
      <button :class="{ active: view === 'query' }" @click="switchView('query')">🔍 医生查询</button>
      <button :class="{ active: view === 'schedule' }" @click="switchView('schedule')">🗓 医院排班</button>
      <button :class="{ active: view === 'mine' }" @click="switchView('mine')">📋 我的预约</button>
    </nav>

    <!-- ===== 医生查询 ===== -->
    <section class="view-body" v-if="view === 'query'">
      <div class="filter-bar">
        <input
          v-model="filters.keyword"
          class="search-input"
          placeholder="输入姓名 / 科室 / 擅长方向 / 医院"
          @keyup.enter="searchDoctors"
        />
        <select v-model="filters.hospitalId" class="select-box">
          <option value="">全部医院</option>
          <option v-for="h in hospitals" :key="h.value" :value="h.value">{{ h.label }}</option>
        </select>
        <select v-model="filters.department" class="select-box">
          <option value="">全部科室</option>
          <option v-for="d in departments" :key="d.value" :value="d.value">{{ d.label }}</option>
        </select>
        <button class="btn-primary" @click="searchDoctors">查询</button>
        <button class="btn-ghost" @click="resetFilters">重置</button>
      </div>

      <div class="doctor-count" v-if="!loading">共找到 <b>{{ doctorList.length }}</b> 位医生</div>

      <div class="card-grid">
        <div class="doc-card" v-for="d in doctorList" :key="d.id">
          <div class="doc-head">
            <div class="avatar" :style="{ background: avatarColor(d.name) }">{{ d.name.charAt(0) }}</div>
            <div class="doc-name">
              <h3>{{ d.name }} <span class="gender">{{ d.gender }}</span></h3>
              <span class="title-tag" :class="titleClass(d.title)">{{ d.title }}</span>
            </div>
          </div>
          <div class="doc-line"><span class="lbl">科室</span>{{ d.department }}</div>
          <div class="doc-line"><span class="lbl">医院</span>{{ d.hospital_name }}</div>
          <div class="doc-line"><span class="lbl">出诊</span>{{ d.out_time }}</div>
          <div class="tag-row">
            <span
              v-for="s in splitSpec(d.specialty)"
              :key="s"
              class="spec-tag"
            >{{ s }}</span>
          </div>
          <div class="doc-actions">
            <button class="btn-ghost sm" @click="openDetail(d)">查看详情</button>
            <button class="btn-warm sm" @click="startAppoint(d)">预约</button>
          </div>
        </div>
      </div>

      <div class="empty" v-if="!loading && doctorList.length === 0">未找到相关医生，请调整筛选条件</div>
    </section>

    <!-- ===== 医院排班 ===== -->
    <section class="view-body" v-else-if="view === 'schedule'">
      <div class="filter-bar">
        <select v-model="scheduleHospitalId" class="select-box wide" @change="loadSchedule">
          <option value="">请选择医院</option>
          <option v-for="h in hospitals" :key="h.value" :value="h.value">{{ h.label }}</option>
        </select>
      </div>

      <div class="schedule-card" v-if="scheduleHospitalId">
        <h3 class="sc-title">出诊排班（{{ scheduleHospitalName }}）</h3>
        <table class="sc-table">
          <thead>
            <tr><th>姓名</th><th>性别</th><th>科室</th><th>职称</th><th>出诊时间</th></tr>
          </thead>
          <tbody>
            <tr v-for="s in scheduleList" :key="s.id">
              <td><b>{{ s.name }}</b></td>
              <td>{{ s.gender }}</td>
              <td>{{ s.department }}</td>
              <td><span class="title-tag" :class="titleClass(s.title)">{{ s.title }}</span></td>
              <td>{{ s.out_time }}</td>
            </tr>
          </tbody>
        </table>
        <div class="empty" v-if="scheduleList.length === 0">该医院暂无排班信息</div>
      </div>
      <div class="empty" v-else>请在下方选择一家医院查看其出诊排班</div>
    </section>

    <!-- ===== 我的预约 ===== -->
    <section class="view-body" v-else-if="view === 'mine'">
      <div class="filter-bar">
        <input
          v-model="minePhone"
          class="search-input"
          placeholder="输入预留手机号查询我的预约"
          @keyup.enter="loadMine"
        />
        <button class="btn-primary" @click="loadMine">查询</button>
      </div>

      <div class="appt-list" v-if="appointmentList.length">
        <div class="appt-card" v-for="a in appointmentList" :key="a.id">
          <div class="appt-main">
            <h3>{{ a.doctor_name }} <span class="muted">/ {{ a.department }}</span></h3>
            <div class="appt-line">🏥 {{ a.hospital_name }}</div>
            <div class="appt-line">📅 {{ a.appoint_date }} · {{ a.time_slot }}</div>
            <div class="appt-line">👤 {{ a.patient_name }}（{{ a.patient_gender || '-' }} / {{ a.patient_age || '-' }}岁） · 📞 {{ a.patient_phone }}</div>
            <div class="appt-line" v-if="a.remark">备注：{{ a.remark }}</div>
            <span class="status-tag">{{ a.status }}</span>
          </div>
          <div class="appt-actions">
            <button class="btn-ghost sm" @click="openEdit(a)">编辑</button>
            <button class="btn-danger sm" @click="askDeleteAppt(a)">删除</button>
          </div>
        </div>
      </div>
      <div class="empty" v-else-if="minePhone && mineQueried">未查询到该手机号对应的预约记录</div>
      <div class="empty" v-else>输入手机号查询自己的预约，可进行编辑与删除</div>
    </section>

    <!-- ===== 预约表单 ===== -->
    <section class="view-body" v-else-if="view === 'appoint'">
      <div class="appoint-box">
        <h3 class="ap-title">预约挂号</h3>
        <div class="ap-doctor" v-if="appointDoctor">
          <div class="avatar lg" :style="{ background: avatarColor(appointDoctor.name) }">{{ appointDoctor.name.charAt(0) }}</div>
          <div>
            <div class="ap-doc-name">{{ appointDoctor.name }} · {{ appointDoctor.title }}</div>
            <div class="ap-doc-sub">{{ appointDoctor.hospital_name }} · {{ appointDoctor.department }}</div>
          </div>
        </div>

        <div class="form-grid">
          <div class="form-item">
            <label>姓名 <i>*</i></label>
            <input v-model="appointForm.patient_name" placeholder="患者姓名" />
          </div>
          <div class="form-item">
            <label>性别</label>
            <select v-model="appointForm.patient_gender">
              <option value="">请选择</option>
              <option value="男">男</option>
              <option value="女">女</option>
            </select>
          </div>
          <div class="form-item">
            <label>年龄</label>
            <input v-model="appointForm.patient_age" type="number" placeholder="年龄" />
          </div>
          <div class="form-item">
            <label>手机号 <i>*</i></label>
            <input v-model="appointForm.patient_phone" placeholder="预留手机号" />
          </div>
          <div class="form-item">
            <label>预约日期 <i>*</i></label>
            <input v-model="appointForm.appoint_date" type="date" />
          </div>
          <div class="form-item">
            <label>时间段 <i>*</i></label>
            <select v-model="appointForm.time_slot">
              <option value="">请选择</option>
              <option v-for="s in timeSlots" :key="s" :value="s">{{ s }}</option>
            </select>
            <span class="slot-hint" :class="slotStatus" v-if="slotStatus !== 'idle'">
              {{ slotStatus === 'busy' ? '⚠ 该时间段已被预约，请更换' : '✓ 该时间段可预约' }}
            </span>
          </div>
          <div class="form-item full">
            <label>备注</label>
            <input v-model="appointForm.remark" placeholder="就诊需求（选填）" />
          </div>
        </div>

        <div class="ap-actions">
          <button class="btn-ghost" @click="view = 'query'">返回</button>
          <button class="btn-primary" @click="submitAppoint">提交预约</button>
        </div>
      </div>
    </section>

    <!-- ===== 医生详情弹窗 ===== -->
    <div class="modal-mask" v-if="detailShow" @click.self="detailShow = false">
      <div class="detail-modal">
        <div class="dm-head">
          <img v-if="detailDoctor.photo" class="avatar-photo" :src="detailDoctor.photo" alt="医生照片" />
          <div v-else class="avatar lg" :style="{ background: avatarColor(detailDoctor.name) }">{{ detailDoctor.name.charAt(0) }}</div>
          <div class="dm-title">
            <h3>{{ detailDoctor.name }} <span class="gender">{{ detailDoctor.gender }}</span></h3>
            <span class="title-tag" :class="titleClass(detailDoctor.title)">{{ detailDoctor.title }}</span>
          </div>
          <button class="dm-close" @click="detailShow = false">×</button>
        </div>
        <div class="dm-info">
          <div class="dm-row"><b>科室</b><span>{{ detailDoctor.department }}</span></div>
          <div class="dm-row"><b>医院</b><span>{{ detailDoctor.hospital_name }}</span></div>
          <div class="dm-row"><b>出诊时间</b><span>{{ detailDoctor.out_time }}</span></div>
          <div class="dm-row"><b>擅长方向</b><span>{{ detailDoctor.specialty }}</span></div>
        </div>
        <div class="dm-calendar">
          <h4>出诊日历</h4>
          <div class="cal-grid">
            <div class="cal-cell" v-for="w in calendar.weekOrder" :key="w" :class="{ on: calendar.map[w].length > 0 }">
              <div class="cal-day">{{ w }}</div>
              <div class="cal-slots">{{ calendar.map[w].length ? calendar.map[w].join(' · ') : '休' }}</div>
            </div>
          </div>
        </div>
        <div class="dm-intro">
          <h4>详细介绍</h4>
          <p>{{ detailDoctor.intro }}</p>
        </div>
        <div class="dm-actions">
          <button class="btn-warm" @click="startAppoint(detailDoctor)">预约挂号</button>
        </div>
      </div>
    </div>

    <!-- ===== 编辑预约弹窗 ===== -->
    <div class="modal-mask" v-if="editShow" @click.self="editShow = false">
      <div class="edit-modal">
        <h3 class="em-title">编辑预约</h3>
        <div class="form-grid">
          <div class="form-item">
            <label>姓名 <i>*</i></label>
            <input v-model="editForm.patient_name" />
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
            <input v-model="editForm.patient_age" type="number" />
          </div>
          <div class="form-item">
            <label>手机号 <i>*</i></label>
            <input v-model="editForm.patient_phone" />
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
            <input v-model="editForm.remark" />
          </div>
        </div>
        <div class="em-actions">
          <button class="btn-ghost" @click="editShow = false">取消</button>
          <button class="btn-primary" @click="saveEdit">保存</button>
        </div>
      </div>
    </div>

    <!-- ===== 删除确认弹窗 ===== -->
    <div class="modal-mask" v-if="delShow" @click.self="delShow = false">
      <div class="del-modal">
        <div class="dm-icon">🗑</div>
        <h3>删除预约</h3>
        <p>确定删除与「{{ delTarget && delTarget.doctor_name }}」的这条预约吗？删除后不可恢复。</p>
        <div class="dm-actions">
          <button class="btn-ghost" @click="delShow = false">取消</button>
          <button class="btn-danger" @click="confirmDelete">确认删除</button>
        </div>
      </div>
    </div>

    <!-- 轻量提示 -->
    <div class="toast-tip" :class="toast.type" v-if="toast.show">{{ toast.text }}</div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import request from '../api/request'

const router = useRouter()
const view = ref('query')

// 下拉选项
const hospitals = ref([])
const departments = ref([])

// 医生查询
const filters = reactive({ keyword: '', hospitalId: '', department: '' })
const doctorList = ref([])
const loading = ref(false)

// 详情
const detailShow = ref(false)
const detailDoctor = ref(null)

// 排班
const scheduleHospitalId = ref('')
const scheduleList = ref([])
const scheduleHospitalName = computed(() => {
  const h = hospitals.value.find(x => String(x.value) === String(scheduleHospitalId.value))
  return h ? h.label : ''
})

// 预约
const timeSlots = ['上午 08:30-11:30', '下午 13:30-16:30', '全天 08:00-16:30']
const appointDoctor = ref(null)
const appointForm = reactive({
  doctor_id: '', doctor_name: '', hospital_id: '', hospital_name: '', department: '',
  patient_name: '', patient_gender: '', patient_age: '', patient_phone: '',
  appoint_date: '', time_slot: '', remark: ''
})

// 我的预约
const minePhone = ref('')
const mineQueried = ref(false)
const appointmentList = ref([])

// 编辑
const editShow = ref(false)
const editForm = reactive({
  id: '', doctor_id: '', doctor_name: '', hospital_name: '', department: '',
  patient_name: '', patient_gender: '', patient_age: '', patient_phone: '',
  appoint_date: '', time_slot: '', remark: ''
})

// 删除
const delShow = ref(false)
const delTarget = ref(null)

// toast
const toast = reactive({ show: false, text: '', type: 'success' })

function showToast(text, type = 'success') {
  toast.text = text
  toast.type = type
  toast.show = true
  setTimeout(() => { toast.show = false }, 2200)
}

function splitSpec(str) {
  if (!str) return []
  return str.split('、').filter(Boolean).slice(0, 3)
}

function avatarColor(name) {
  const palette = ['#2196f3', '#5c6bc0', '#8e24aa', '#00acc1', '#fb8c00', '#ec407a', '#3949ab', '#7e57c2']
  let sum = 0
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i)
  return palette[sum % palette.length]
}

// 职级徽章配色
function titleClass(title) {
  if (!title) return 'tt-other'
  if (title.indexOf('副主任医师') === 0) return 'tt-deputy'
  if (title.indexOf('主任医师') === 0) return 'tt-chief'
  if (title.indexOf('主治医师') === 0) return 'tt-attending'
  if (title.indexOf('住院医师') === 0) return 'tt-resident'
  return 'tt-other'
}

// 解析出诊时间为周历
const WEEK_ORDER = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
function parseSchedule(outTime) {
  const map = {}
  WEEK_ORDER.forEach(w => { map[w] = [] })
  if (!outTime) return map
  const weeks = outTime.match(/周[一二三四五六日]/g) || []
  let periods = []
  if (outTime.indexOf('全天') > -1) periods = ['上午', '下午']
  else {
    if (outTime.indexOf('上午') > -1) periods.push('上午')
    if (outTime.indexOf('下午') > -1) periods.push('下午')
  }
  weeks.forEach(w => { if (WEEK_ORDER.includes(w)) map[w] = periods.slice() })
  return map
}
const calendar = computed(() => {
  const m = detailDoctor.value ? parseSchedule(detailDoctor.value.out_time) : parseSchedule('')
  return { weekOrder: WEEK_ORDER, map: m }
})

// 预约时段实时占用校验
const slotStatus = ref('idle')
let checkTimer = null
watch(
  () => [appointForm.doctor_id, appointForm.appoint_date, appointForm.time_slot],
  ([did, d, slot]) => {
    clearTimeout(checkTimer)
    if (!did || !d || !slot) {
      slotStatus.value = 'idle'
      return
    }
    checkTimer = setTimeout(async () => {
      try {
        const res = await request.get(`/staff/appoint/check?doctor_id=${did}&date=${d}&slot=${encodeURIComponent(slot)}`)
        if (res.code === 200 && res.data) {
          slotStatus.value = res.data.busy ? 'busy' : 'ok'
        }
      } catch (e) {
        slotStatus.value = 'idle'
      }
    }, 300)
  }
)

function goBack() {
  router.back()
}

function switchView(v) {
  view.value = v
  if (v === 'schedule' && scheduleHospitalId.value) loadSchedule()
}

async function loadOptions() {
  try {
    const res = await request.get('/staff/options')
    if (res.code === 200 && res.data) {
      hospitals.value = res.data.hospitals || []
      departments.value = res.data.departments || []
    }
  } catch (e) {
    console.error('加载选项失败', e)
  }
}

async function loadDoctors() {
  loading.value = true
  try {
    const kw = encodeURIComponent(filters.keyword || '')
    const hid = filters.hospitalId || ''
    const dep = encodeURIComponent(filters.department || '')
    const res = await request.get(`/staff/doctors?keyword=${kw}&hospitalId=${hid}&department=${dep}`)
    doctorList.value = res.data || []
  } catch (e) {
    console.error('查询医生失败', e)
    doctorList.value = []
  } finally {
    loading.value = false
  }
}

function searchDoctors() { loadDoctors() }

function resetFilters() {
  filters.keyword = ''
  filters.hospitalId = ''
  filters.department = ''
  loadDoctors()
}

function openDetail(d) {
  detailDoctor.value = d
  detailShow.value = true
}

function startAppoint(d) {
  appointDoctor.value = d
  appointForm.doctor_id = d.id
  appointForm.doctor_name = d.name
  appointForm.hospital_id = d.hospital_id
  appointForm.hospital_name = d.hospital_name
  appointForm.department = d.department
  appointForm.patient_name = ''
  appointForm.patient_gender = ''
  appointForm.patient_age = ''
  appointForm.patient_phone = ''
  appointForm.appoint_date = ''
  appointForm.time_slot = ''
  appointForm.remark = ''
  slotStatus.value = 'idle'
  view.value = 'appoint'
}

async function submitAppoint() {
  if (!appointForm.patient_name || !appointForm.patient_phone || !appointForm.appoint_date || !appointForm.time_slot) {
    showToast('请填写姓名、手机号、日期与时间段', 'error')
    return
  }
  try {
    const res = await request.post('/staff/appoint', { ...appointForm })
    if (res.code === 200) {
      showToast('预约提交成功')
      minePhone.value = appointForm.patient_phone
      mineQueried.value = false
      view.value = 'mine'
    } else {
      showToast(res.msg || '提交失败', 'error')
    }
  } catch (e) {
    console.error('提交预约失败', e)
    showToast('提交失败，请重试', 'error')
  }
}

async function loadSchedule() {
  if (!scheduleHospitalId.value) {
    scheduleList.value = []
    return
  }
  try {
    const res = await request.get(`/staff/schedule/${scheduleHospitalId.value}`)
    scheduleList.value = res.data || []
  } catch (e) {
    console.error('查询排班失败', e)
    scheduleList.value = []
  }
}

async function loadMine() {
  if (!minePhone.value) {
    showToast('请输入手机号', 'error')
    return
  }
  try {
    const res = await request.get(`/staff/appointments?phone=${encodeURIComponent(minePhone.value)}`)
    appointmentList.value = res.data || []
    mineQueried.value = true
  } catch (e) {
    console.error('查询预约失败', e)
    appointmentList.value = []
    mineQueried.value = true
  }
}

function openEdit(a) {
  editForm.id = a.id
  editForm.doctor_id = a.doctor_id
  editForm.doctor_name = a.doctor_name
  editForm.hospital_name = a.hospital_name
  editForm.department = a.department
  editForm.patient_name = a.patient_name
  editForm.patient_gender = a.patient_gender
  editForm.patient_age = a.patient_age
  editForm.patient_phone = a.patient_phone
  editForm.appoint_date = a.appoint_date
  editForm.time_slot = a.time_slot
  editForm.remark = a.remark
  editShow.value = true
}

async function saveEdit() {
  try {
    const res = await request.post('/staff/appointment/edit', { ...editForm })
    if (res.code === 200) {
      showToast('修改成功')
      editShow.value = false
      loadMine()
    } else {
      showToast(res.msg || '修改失败', 'error')
    }
  } catch (e) {
    console.error('编辑预约失败', e)
    showToast('修改失败，请重试', 'error')
  }
}

function askDeleteAppt(a) {
  delTarget.value = a
  delShow.value = true
}

async function confirmDelete() {
  if (!delTarget.value) return
  try {
    const res = await request.post('/staff/appointment/delete', { id: delTarget.value.id })
    if (res.code === 200) {
      showToast('删除成功')
      delShow.value = false
      delTarget.value = null
      loadMine()
    } else {
      showToast(res.msg || '删除失败', 'error')
    }
  } catch (e) {
    console.error('删除预约失败', e)
    showToast('删除失败，请重试', 'error')
  }
}

onMounted(() => {
  loadOptions()
  loadDoctors()
})
</script>

<style scoped>
/* ============ 蓝色清爽风 · 参考药品数据库版（清晰、专业、不高饱和绿） ============ */
.staff-page {
  min-height: 100vh;
  background: #f0f4f8;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  color: #1f2937;
}

/* 顶部 */
.staff-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 28px;
  background: linear-gradient(135deg, #2196f3 0%, #1565c0 100%);
  box-shadow: 0 2px 10px rgba(21, 101, 192, 0.18);
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
.hd-title .hd-kicker {
  display: block;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.75);
  letter-spacing: 1.5px;
}
.hd-title h1 { margin: 2px 0 0; font-size: 21px; font-weight: 600; color: #fff; }
.hd-sub { font-size: 13px; color: rgba(255, 255, 255, 0.88); }

/* 标签页 */
.tab-bar {
  display: flex;
  gap: 6px;
  padding: 0 28px;
  background: #fff;
  border-bottom: 1px solid #e5eaf0;
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

/* 筛选栏 */
.filter-bar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
  background: #fff;
  border-radius: 12px;
  padding: 16px 18px;
  margin-bottom: 18px;
  box-shadow: 0 2px 8px rgba(21, 101, 192, 0.05);
}
.search-input {
  flex: 1;
  min-width: 240px;
  padding: 10px 16px;
  border: 1px solid #d8e1ec;
  border-radius: 8px;
  font-size: 14px;
  background: #fff;
  color: #1f2937;
  outline: none;
  transition: all .2s;
}
.search-input:focus { border-color: #2196f3; box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.12); }
.select-box {
  padding: 10px 14px;
  border: 1px solid #d8e1ec;
  border-radius: 8px;
  font-size: 14px;
  background: #fff;
  color: #1f2937;
  outline: none;
  transition: all .2s;
}
.select-box:focus { border-color: #2196f3; box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.12); }
.select-box.wide { min-width: 320px; }

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
.btn-danger {
  background: #ef5350;
  color: #fff;
  border: none;
  padding: 10px 22px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: background .2s;
}
.btn-danger:hover { background: #e0413f; }
.btn-primary.sm, .btn-warm.sm, .btn-ghost.sm, .btn-danger.sm { padding: 7px 16px; font-size: 13px; }

.doctor-count { font-size: 13px; color: #8696a8; margin-bottom: 14px; }
.doctor-count b { color: #1976d2; font-size: 16px; }

/* 医生卡片 */
.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
}
@media (max-width: 900px) { .card-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 640px) { .card-grid { grid-template-columns: 1fr; } }
.doc-card {
  background: #fff;
  border-radius: 12px;
  padding: 18px 20px;
  box-shadow: 0 2px 8px rgba(21, 101, 192, 0.06), 0 0 1px rgba(0, 0, 0, 0.04);
  transition: all .2s;
}
.doc-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(21, 101, 192, 0.12); }
.doc-head { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 21px;
  font-weight: 600;
  flex-shrink: 0;
}
.avatar.lg { width: 60px; height: 60px; font-size: 24px; }
.doc-name h3 { margin: 0; font-size: 17px; font-weight: 600; color: #1a2740; display: flex; align-items: center; gap: 6px; }
.gender { font-size: 12px; color: #8696a8; font-weight: normal; }
.title-tag {
  display: inline-block;
  margin-top: 5px;
  font-size: 12px;
  font-weight: 500;
  padding: 2px 10px;
  border-radius: 4px;
  line-height: 1.6;
}
/* 职级徽章配色 */
.tt-chief { background: #ffebee; color: #c62828; }
.tt-deputy { background: #fff3e0; color: #ef6c00; }
.tt-attending { background: #e8f5e9; color: #2e7d32; }
.tt-resident { background: #e3f2fd; color: #1565c0; }
.tt-other { background: #f0f4f8; color: #5f6b7a; }

.doc-line { font-size: 13px; color: #55606e; margin-bottom: 8px; }
.doc-line .lbl { display: inline-block; width: 36px; color: #96a4b5; }
.tag-row { display: flex; gap: 6px; flex-wrap: wrap; margin: 10px 0 16px; min-height: 24px; }
.spec-tag { font-size: 12px; color: #1976d2; background: #e3f2fd; padding: 3px 10px; border-radius: 999px; }
.doc-actions { display: flex; gap: 10px; justify-content: flex-end; border-top: 1px solid #eef2f7; padding-top: 14px; }

/* 排班表 */
.schedule-card { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(21, 101, 192, 0.06); }
.sc-title { margin: 0 0 16px; font-size: 17px; font-weight: 600; color: #1a2740; }
.sc-table { width: 100%; border-collapse: collapse; }
.sc-table th, .sc-table td {
  text-align: left;
  padding: 13px 16px;
  font-size: 14px;
  border-bottom: 1px solid #eef2f7;
}
.sc-table th { color: #6b7b8f; font-weight: 600; background: #f4f7fb; }
.sc-table th:first-child { border-radius: 8px 0 0 8px; }
.sc-table th:last-child { border-radius: 0 8px 8px 0; }
.sc-table td b { color: #1a2740; }

/* 我的预约 */
.appt-list { display: flex; flex-direction: column; gap: 14px; }
.appt-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px 22px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(21, 101, 192, 0.06);
}
.appt-main h3 { margin: 0 0 8px; font-size: 16px; font-weight: 600; color: #1a2740; }
.muted { color: #8696a8; font-weight: normal; font-size: 14px; }
.appt-line { font-size: 13px; color: #55606e; margin-bottom: 5px; }
.status-tag { display: inline-block; margin-top: 4px; font-size: 12px; color: #2e7d32; background: #e8f5e9; padding: 3px 12px; border-radius: 4px; }
.appt-actions { display: flex; flex-direction: column; gap: 10px; }

/* 预约表单 */
.appoint-box { background: #fff; border-radius: 12px; padding: 28px; box-shadow: 0 2px 8px rgba(21, 101, 192, 0.06); max-width: 740px; }
.ap-title { margin: 0 0 20px; font-size: 18px; font-weight: 600; color: #1a2740; }
.ap-doctor { display: flex; align-items: center; gap: 14px; padding: 15px; background: #f4f8fc; border-radius: 10px; margin-bottom: 24px; }
.ap-doc-name { font-size: 16px; color: #1a2740; font-weight: 600; }
.ap-doc-sub { font-size: 13px; color: #8696a8; margin-top: 4px; }

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
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
}
.form-item input:focus, .form-item select:focus { border-color: #2196f3; box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.12); }
.ap-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 26px; }

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
.detail-modal, .edit-modal, .del-modal {
  background: #fff;
  border-radius: 14px;
  padding: 26px;
  width: 460px;
  max-width: 92vw;
  box-shadow: 0 20px 50px rgba(20, 40, 80, 0.25);
  animation: popIn .18s ease;
  max-height: 88vh;
  overflow-y: auto;
}
.del-modal { width: 350px; text-align: center; }
@keyframes popIn { from { transform: scale(.94); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.dm-head { display: flex; align-items: center; gap: 14px; position: relative; margin-bottom: 18px; }
.dm-title h3 { margin: 0; font-size: 18px; font-weight: 600; color: #1a2740; display: flex; align-items: center; gap: 6px; }
.dm-close { position: absolute; top: 0; right: 0; border: none; background: none; font-size: 26px; color: #96a4b5; cursor: pointer; transition: color .2s; }
.dm-close:hover { color: #1976d2; }
.dm-info .dm-row { display: flex; margin-bottom: 10px; font-size: 14px; }
.dm-row b { width: 72px; color: #8696a8; font-weight: 500; flex-shrink: 0; }
.dm-row span { color: #1f2937; }
.dm-intro { margin-top: 14px; padding: 14px; border-radius: 10px; background: #f4f8fc; }
.dm-intro h4 { margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #1a2740; }
.dm-intro p { margin: 0; font-size: 14px; line-height: 1.9; color: #55606e; }
.dm-actions { display: flex; justify-content: flex-end; margin-top: 18px; }

.em-title { margin: 0 0 18px; font-size: 17px; font-weight: 600; color: #1a2740; }
.em-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 22px; }
.dm-icon { font-size: 34px; }
.del-modal h3 { margin: 10px 0 8px; font-size: 17px; font-weight: 600; color: #1a2740; }
.del-modal p { margin: 0 0 20px; font-size: 13px; color: #55606e; line-height: 1.7; }
.del-modal .dm-actions { display: flex; gap: 12px; justify-content: center; }

/* 医生头像照片 */
.avatar-photo {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  border: 2px solid #e3f2fd;
  background: #eef4fb;
}

/* 出诊日历 */
.dm-calendar { margin-top: 16px; }
.dm-calendar h4 { margin: 0 0 10px; font-size: 14px; font-weight: 600; color: #1a2740; }
.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}
.cal-cell {
  text-align: center;
  padding: 8px 2px;
  border-radius: 8px;
  background: #f4f7fb;
  color: #96a4b5;
}
.cal-cell .cal-day { font-size: 12px; font-weight: 600; margin-bottom: 3px; }
.cal-cell .cal-slots { font-size: 11px; line-height: 1.4; }
.cal-cell.on { background: #e3f2fd; color: #1565c0; }

/* 预约时段占用提示 */
.slot-hint { font-size: 12px; margin-top: 4px; }
.slot-hint.ok { color: #2e7d32; }
.slot-hint.busy { color: #ef6c00; }

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

.empty { text-align: center; color: #96a4b5; font-size: 14px; padding: 54px 0; }
</style>