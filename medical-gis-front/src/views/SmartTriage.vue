<template>
  <div class="triage-page">
    <!-- ===== 顶部 ===== -->
    <header class="tri-header">
      <div class="hd-left">
        <button class="back-btn" @click="goBack">← 返回</button>
        <div class="hd-title">
          <span class="hd-kicker">SMART TRIAGE SERVICE</span>
          <h1>智慧导诊</h1>
        </div>
      </div>
      <span class="hd-sub">症状自查 · 科室推荐 · 急缓分级 · 一键预约</span>
    </header>

    <div class="tri-container">
      <!-- 引导 -->
      <div class="intro-banner">
        <span class="intro-icon">🩺</span>
        <div>
          <b>身体不适却不知道该挂哪个科？</b>
          <p>选择症状，帮你智能匹配最合适的科室、判断紧急程度，并附就医建议。</p>
        </div>
      </div>

      <div class="tri-layout">
        <!-- 左：症状选择 -->
        <section class="panel form-panel">
          <h3>① 选择症状 <small>（可多选）</small></h3>
          <div class="tag-group" v-for="(list, area) in symptomGroups" :key="area">
            <div class="tag-area">{{ area }}</div>
            <div class="chip-wrap">
              <button
                v-for="s in list"
                :key="s"
                class="chip"
                :class="{ on: selected.includes(s) }"
                @click="toggleSymptom(s)"
              >{{ s }}</button>
            </div>
          </div>

          <h3>② 补充信息 <small>（选填）</small></h3>
          <div class="meta-row">
            <label>
              <span>性别</span>
              <select v-model="gender">
                <option>男</option>
                <option>女</option>
              </select>
            </label>
            <label>
              <span>年龄</span>
              <input v-model.number="age" type="number" min="0" placeholder="" />
            </label>
            <label>
              <span>持续时长</span>
              <select v-model="duration">
                <option v-for="d in durationOptions" :key="d.value" :value="d.value">{{ d.label }}</option>
              </select>
            </label>
          </div>
          <div class="kw-row">
            <input
              v-model="keywords"
              class="kw-input"
              placeholder="其他症状"
            />
          </div>

          <div class="action-row">
            <button class="btn-primary" :disabled="analyzing" @click="analyze">
              {{ analyzing ? '分析中…' : '开始智能分析' }}
            </button>
            <button class="btn-ghost" @click="reset">重置</button>
          </div>
        </section>

        <!-- 右：结果 -->
        <section class="panel result-panel">
          <template v-if="result">
            <h3>导诊结果</h3>
            <div class="level-badge" :class="result.level">{{ result.levelText }}</div>

            <div class="dept-card">
              <div class="dept-name">推荐科室：<b>{{ result.top.dept }}</b></div>
              <div class="dept-score">匹配度 {{ result.top.score }}%</div>
              <div class="dept-reason" v-if="result.top.reasons.length">
                依据症状：{{ result.top.reasons.join('、') }}
              </div>
            </div>

            <div class="candidates" v-if="result.candidates.length > 1">
              <div class="cand-item" v-for="c in result.candidates.slice(1)" :key="c.dept">
                {{ c.dept }} <span class="cand-score">{{ c.score }}%</span>
              </div>
            </div>

            <div class="advice-box">
              <div class="advice-title">💡 就医建议</div>
              <ul>
                <li v-for="(a, i) in result.advice" :key="i">{{ a }}</li>
              </ul>
            </div>

            <div class="doc-section">
              <div class="doc-sec-title">👨‍⚕️ 「{{ result.top.dept }}」可预约医生</div>
              <div v-if="docLoading" class="doc-empty">正在查询医生…</div>
              <div v-else-if="doctors.length === 0" class="doc-empty">
                暂未匹配到该科室医生，可前往「医生查询」按关键词搜索
              </div>
              <div v-else class="doc-list">
                <div class="doc-item" v-for="d in doctors" :key="d.id">
                  <div class="doc-avatar" :style="{ background: avatarColor(d.name) }">{{ d.name.charAt(0) }}</div>
                  <div class="doc-info">
                    <div class="doc-nm">{{ d.name }} <span class="doc-title" v-if="d.title">{{ d.title }}</span></div>
                    <div class="doc-sub">{{ d.hospital_name || '' }} · {{ d.specialty || d.department || '' }}</div>
                  </div>
                  <button class="btn-go" @click="goBook">去预约</button>
                </div>
              </div>
            </div>

            <div class="disclaimer">⚠️ 本结果仅作就医参考，不能替代专业医疗诊断；紧急情况请立即拨打 120。</div>
          </template>

          <template v-else>
            <div class="empty-result">
              <div class="empty-icon">🧭</div>
              <p>选择左侧症状后点击「开始智能分析」，<br />即可获取科室推荐与就医建议。</p>
            </div>
          </template>
        </section>
      </div>
    </div>

    <!-- toast -->
    <div class="tri-toast" :class="toast.type" v-if="toast.show">{{ toast.text }}</div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import request from '../api/request'

const router = useRouter()

const symptomGroups = {
  '全身': ['发热', '乏力', '盗汗', '水肿', '消瘦', '全身酸痛'],
  '呼吸道': ['咳嗽', '咳痰', '咽痛', '流鼻涕', '鼻塞', '打喷嚏', '气短', '呼吸困难'],
  '头颈部': ['头痛', '头晕', '眩晕', '失眠', '记忆力下降', '耳鸣', '颈部肿块'],
  '心胸': ['胸痛', '胸闷', '心悸', '心慌', '气促'],
  '消化': ['腹痛', '腹胀', '恶心', '呕吐', '腹泻', '便秘', '反酸', '烧心', '便血'],
  '泌尿': ['尿频', '尿急', '尿痛', '血尿', '腰痛'],
  '皮肤': ['皮疹', '瘙痒', '脱发', '红肿', '荨麻疹', '湿疹'],
  '骨骼肌肉': ['关节痛', '腰背痛', '颈肩痛', '肌肉酸痛', '麻木'],
  '五官': ['眼痛', '视力下降', '眼干', '鼻出血', '听力下降'],
  '心理': ['焦虑', '抑郁', '情绪低落', '睡眠障碍', '烦躁'],
  '妇科': ['月经不调', '痛经', '白带异常']
}

const selected = ref([])
const gender = ref('')
const age = ref(null)
const duration = ref(3)
const keywords = ref('')

const durationOptions = [
  { value: 1, label: '1 天以内' },
  { value: 3, label: '1~3 天' },
  { value: 7, label: '3~7 天' },
  { value: 14, label: '超过 7 天' }
]

const toast = reactive({ show: false, text: '', type: 'success' })
const analyzing = ref(false)
const result = ref(null)
const doctors = ref([])
const docLoading = ref(false)

const PALETTE = ['#0d9488', '#0f766e', '#0891b2', '#0e7490', '#059669', '#0b5e54', '#0f6b8a']

function showToast(text, type = 'success') {
  toast.text = text
  toast.type = type
  toast.show = true
  setTimeout(() => { toast.show = false }, 2200)
}

function toggleSymptom(s) {
  const i = selected.value.indexOf(s)
  if (i >= 0) selected.value.splice(i, 1)
  else selected.value.push(s)
}

function reset() {
  selected.value = []
  gender.value = ''
  age.value = null
  duration.value = 3
  keywords.value = ''
  result.value = null
  doctors.value = []
}

function goBack() {
  router.back()
}

function goBook() {
  router.push('/medical-staff-query')
}

function avatarColor(name) {
  let h = 0
  const s = String(name || '')
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997
  return PALETTE[h % PALETTE.length]
}

async function analyze() {
  if (selected.value.length === 0 && !keywords.value.trim()) {
    showToast('请至少选择一个症状或输入关键词', 'error')
    return
  }
  analyzing.value = true
  result.value = null
  try {
    const res = await request.post('/triage/analyze', {
      symptoms: selected.value,
      keywords: keywords.value,
      age: age.value,
      gender: gender.value,
      duration: duration.value
    })
    if (res.code === 200) {
      result.value = res.data
      if (Array.isArray(res.data.doctors)) {
        doctors.value = res.data.doctors
      } else {
        loadDoctors(res.data.top.dept)
      }
    } else {
      showToast(res.msg || '分析失败', 'error')
    }
  } catch (e) {
    showToast('分析失败，请稍后重试', 'error')
  } finally {
    analyzing.value = false
  }
}

async function loadDoctors(dept) {
  docLoading.value = true
  doctors.value = []
  try {
    const res = await request.get(`/staff/doctors?keyword=&hospitalId=&department=${encodeURIComponent(dept)}`)
    doctors.value = (res.data || []).slice(0, 6)
  } catch (e) {
    doctors.value = []
  } finally {
    docLoading.value = false
  }
}
</script>

<style scoped>
/* ============ 青绿医疗风 · 与医疗信息查询页统一 ============ */
.triage-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f0fdfa 0%, #f6fffd 42%, #eff6f4 100%);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  color: #1f2937;
}

/* 顶部 */
.tri-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 28px;
  background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
  box-shadow: 0 4px 20px rgba(13, 148, 136, 0.25);
  position: relative;
  overflow: hidden;
}
.tri-header::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(700px 220px at 85% -20%, rgba(255, 255, 255, 0.18), transparent 60%);
  pointer-events: none;
}
.hd-left { display: flex; align-items: center; gap: 16px; position: relative; z-index: 1; }
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
.hd-sub { font-size: 13px; color: rgba(255, 255, 255, 0.9); position: relative; z-index: 1; }

.tri-container { max-width: 1200px; margin: 0 auto; padding: 24px 28px 44px; }

/* 引导条 */
.intro-banner {
  display: flex;
  align-items: center;
  gap: 14px;
  background: linear-gradient(120deg, #ecfdf5, #f0fdfa);
  border: 1px solid #d1fae5;
  border-radius: 14px;
  padding: 16px 18px;
  margin-bottom: 18px;
}
.intro-icon {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: linear-gradient(135deg, #0d9488, #0f766e);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}
.intro-banner b { color: #134e4a; font-size: 15px; }
.intro-banner p { margin: 4px 0 0; font-size: 13px; color: #5b6b7f; }

/* 布局 */
.tri-layout {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 18px;
  align-items: start;
}
@media (max-width: 860px) { .tri-layout { grid-template-columns: 1fr; } }

.panel {
  background: #fff;
  border: 1px solid #e0f2f1;
  border-radius: 16px;
  padding: 20px 22px;
  box-shadow: 0 6px 18px rgba(13, 148, 136, 0.07);
}
.panel h3 { margin: 0 0 14px; font-size: 16px; color: #134e4a; }
.panel h3 small { color: #7c8b9c; font-weight: 400; font-size: 12px; margin-left: 4px; }

/* 症状标签 */
.tag-group { margin-bottom: 12px; }
.tag-area { font-size: 12px; color: #7c8b9c; margin-bottom: 6px; }
.chip-wrap { display: flex; flex-wrap: wrap; gap: 8px; }
.chip {
  border: 1px solid #d7e6e2;
  background: #f8fcfb;
  color: #3f4f5f;
  padding: 6px 13px;
  border-radius: 18px;
  cursor: pointer;
  font-size: 13px;
  transition: all .18s;
}
.chip:hover { border-color: #0d9488; color: #0d9488; }
.chip.on {
  background: linear-gradient(135deg, #0d9488, #0f766e);
  color: #fff;
  border-color: #0d9488;
  box-shadow: 0 2px 8px rgba(13, 148, 136, 0.3);
}

/* 补充信息 */
.meta-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
.meta-row label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #5b6b7f; flex: 1; min-width: 130px; }
.meta-row select, .meta-row input, .kw-input {
  padding: 9px 12px;
  border: 1px solid #d7e6e2;
  border-radius: 9px;
  font-size: 14px;
  color: #1f2937;
  outline: none;
  transition: all .2s;
  font-family: inherit;
}
.meta-row select:focus, .meta-row input:focus, .kw-input:focus {
  border-color: #0d9488;
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
}
.kw-row { margin-bottom: 16px; }
.kw-input { width: 100%; box-sizing: border-box; }

.action-row { display: flex; gap: 12px; }
.btn-primary {
  flex: 1;
  border: none;
  background: linear-gradient(135deg, #0d9488, #0f766e);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  padding: 11px 0;
  border-radius: 10px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(13, 148, 136, 0.28);
  transition: all .2s;
}
.btn-primary:hover { filter: brightness(1.05); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-ghost {
  border: 1px solid #d7e6e2;
  background: #fff;
  color: #5b6b7f;
  padding: 0 20px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  transition: all .2s;
}
.btn-ghost:hover { border-color: #0d9488; color: #0d9488; }

/* 结果 */
.result-panel { position: sticky; top: 20px; }
.level-badge {
  display: inline-block;
  padding: 5px 16px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 14px;
}
.level-badge.urgent { background: #fee2e2; color: #b91c1c; }
.level-badge.prompt { background: #ffedd5; color: #c2410c; }
.level-badge.observe { background: #dcfce7; color: #15803d; }

.dept-card {
  background: linear-gradient(135deg, #0d9488, #0f766e);
  color: #fff;
  border-radius: 14px;
  padding: 18px 20px;
  margin-bottom: 12px;
}
.dept-name { font-size: 16px; }
.dept-name b { font-size: 22px; font-weight: 700; }
.dept-score { display: inline-block; font-size: 12px; background: rgba(255, 255, 255, 0.2); padding: 2px 10px; border-radius: 999px; margin-top: 8px; }
.dept-reason { font-size: 13px; color: rgba(255, 255, 255, 0.9); margin-top: 8px; }

.candidates { margin-bottom: 12px; }
.cand-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 9px 14px;
  background: #f8fcfb;
  border: 1px solid #e0f2f1;
  border-radius: 10px;
  font-size: 14px;
  color: #3f4f5f;
  margin-bottom: 8px;
}
.cand-score { color: #0d9488; font-weight: 600; }

.advice-box {
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 14px;
}
.advice-title { font-size: 14px; font-weight: 600; color: #92400e; margin-bottom: 8px; }
.advice-box ul { margin: 0; padding-left: 18px; }
.advice-box li { font-size: 13px; color: #6b5b2e; line-height: 1.7; }

.doc-section { margin-bottom: 12px; }
.doc-sec-title { font-size: 14px; font-weight: 600; color: #134e4a; margin-bottom: 10px; }
.doc-empty { font-size: 13px; color: #7c8b9c; text-align: center; padding: 18px 0; }
.doc-list { display: flex; flex-direction: column; gap: 10px; }
.doc-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid #e0f2f1;
  border-radius: 12px;
  background: #fbfefd;
  transition: box-shadow .15s;
}
.doc-item:hover { box-shadow: 0 4px 12px rgba(13, 148, 136, 0.12); }
.doc-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  font-weight: 600;
  flex-shrink: 0;
}
.doc-info { flex: 1; min-width: 0; }
.doc-nm { font-size: 14px; font-weight: 600; color: #1f2937; }
.doc-title { font-size: 12px; color: #0d9488; font-weight: 500; margin-left: 4px; }
.doc-sub { font-size: 12px; color: #7c8b9c; margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.btn-go {
  border: 1px solid #0d9488;
  background: #fff;
  color: #0d9488;
  padding: 6px 14px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  transition: all .18s;
  flex-shrink: 0;
}
.btn-go:hover { background: #0d9488; color: #fff; }

.disclaimer { font-size: 12px; color: #9aa8b5; line-height: 1.6; }

.empty-result { text-align: center; padding: 60px 20px; color: #7c8b9c; }
.empty-icon { font-size: 48px; margin-bottom: 14px; }
.empty-result p { font-size: 14px; line-height: 1.8; }

/* toast */
.tri-toast {
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
.tri-toast.success { background: #0d9488; }
.tri-toast.error { background: #ef5350; }
@keyframes popIn { from { transform: translateX(-50%) scale(.94); opacity: 0; } to { transform: translateX(-50%) scale(1); opacity: 1; } }
</style>