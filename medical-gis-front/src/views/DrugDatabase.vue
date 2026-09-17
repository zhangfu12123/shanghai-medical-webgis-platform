<template>
  <div class="drug-page">
    <header class="drug-header">
      <div class="brand">
        <button class="back-btn" @click="goHome">← 返回</button>
        <span class="brand-icon">💊</span>
        <div class="brand-text">
          <h1>药品数据库</h1>
          <small>DRUG DATABASE · 医疗资源服务</small>
        </div>
      </div>
      <div class="search-box">
        <input
          v-model="searchQuery"
          class="search-input"
          placeholder="输入药品名称 / 通用名 / 分类 / 剂型 进行搜索"
          @keyup.enter="doSearch"
        />
        <button class="search-btn" @click="doSearch">🔍 搜索</button>
      </div>
    </header>

    <div class="drug-body">
      <aside class="drug-sidebar">
        <div class="side-logo" @click="switchTab('list')">
          <span class="side-logo-icon">🏥</span>
          <div>
            <b>药品中心</b>
            <small>药品详细查询</small>
          </div>
        </div>
        <nav class="side-menu">
          <div
            class="menu-item"
            :class="{ active: activeTab === 'interaction' }"
            @click="switchTab('interaction')"
          >
            <span class="mi-icon">🔗</span>
            <div><b>相互作用查询</b><small>两药联用风险评估</small></div>
          </div>
          <div
            class="menu-item"
            :class="{ active: activeTab === 'add' }"
            @click="switchTab('add')"
          >
            <span class="mi-icon">➕</span>
            <div><b>新增药品</b><small>录入药品信息</small></div>
          </div>
          <div
            class="menu-item"
            :class="{ active: activeTab === 'guide' }"
            @click="switchTab('guide')"
          >
            <span class="mi-icon">📖</span>
            <div><b>用药指南</b><small>合理用药 · 就近就医</small></div>
          </div>
          <div
            class="menu-item"
            :class="{ active: activeTab === 'smart' }"
            @click="switchTab('smart')"
          >
            <span class="mi-icon">🩺</span>
            <div><b>智能荐药</b><small>症状自查 · 安全推荐</small></div>
          </div>
        </nav>
        <div class="side-foot">浦东新区公共医疗资源服务平台</div>
      </aside>

      <!-- 中间内容区 -->
      <main class="drug-main">
        <template v-if="activeTab === 'list'">
          <!-- 药品详情 -->
          <section v-if="detailDrug" class="detail-view">
            <div class="view-head">
              <button class="link-btn" @click="detailDrug = null">← 返回药品列表</button>
            </div>
            <div class="detail-card">
              <div class="detail-hero">
                <div>
                  <h2>{{ detailDrug.name }}</h2>
                  <div class="detail-tags">
                    <span class="tag tag-blue">{{ detailDrug.category || '未分类' }}</span>
                    <span class="tag" :class="detailDrug.prescription === '处方药' ? 'tag-red' : 'tag-green'">
                      {{ detailDrug.prescription || '未知' }}
                    </span>
                    <span class="tag tag-gray">{{ detailDrug.dosage_form || '未知剂型' }}</span>
                  </div>
                </div>
                <div class="detail-spec" v-if="detailDrug.spec">
                  <span>规格</span><b>{{ detailDrug.spec }}</b>
                </div>
              </div>

              <div class="info-grid">
                <div class="info-item"><span>通用名</span><b>{{ detailDrug.generic_name || '—' }}</b></div>
                <div class="info-item"><span>分类</span><b>{{ detailDrug.category || '—' }}</b></div>
                <div class="info-item"><span>处方分类</span><b>{{ detailDrug.prescription || '—' }}</b></div>
                <div class="info-item"><span>生产企业</span><b>{{ detailDrug.manufacturer || '—' }}</b></div>
                <div class="info-item"><span>批准文号</span><b>{{ detailDrug.approval_number || '—' }}</b></div>
                <div class="info-item"><span>剂型</span><b>{{ detailDrug.dosage_form || '—' }}</b></div>
              </div>

              <div class="detail-block danger">
                <div class="block-title"><i></i>用法用量</div>
                <p>{{ detailDrug.usage_dosage || '暂无数据' }}</p>
              </div>
              <div class="detail-block warn">
                <div class="block-title"><i></i>禁忌</div>
                <p>{{ detailDrug.contraindications || '暂无数据' }}</p>
              </div>
              <div class="detail-block warn">
                <div class="block-title"><i></i>注意事项</div>
                <p>{{ detailDrug.precautions || '暂无数据' }}</p>
              </div>
              <div class="detail-block" v-if="detailDrug.adverse_reactions">
                <div class="block-title"><i></i>不良反应</div>
                <p>{{ detailDrug.adverse_reactions }}</p>
              </div>

              <div class="detail-inter" v-if="detailDrug.interactions && detailDrug.interactions.length">
                <div class="block-title"><i></i>相关相互作用</div>
                <div class="inter-row" v-for="it in detailDrug.interactions" :key="it.id">
                  <span class="inter-level" :class="levelClass(it.level)">{{ it.severity }}</span>
                  <span class="inter-names">
                    {{ it.drug_a_name }} <em>⇄</em> {{ it.drug_b_name }}
                  </span>
                  <span class="inter-desc">{{ it.description }}</span>
                </div>
              </div>
            </div>
          </section>

          <!-- 药品列表 -->
          <section v-else class="list-view">
            <div class="list-head">
              <div>
                <h2>药品目录</h2>
                <small>共 {{ total }} 种药品 · 点击药品名称查看详情</small>
              </div>
              <div class="filter-row">
                <select v-model="filterCategory" class="filter-select" @change="loadList(1)">
                  <option value="">全部分类</option>
                  <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
                </select>
              </div>
            </div>

            <div class="loading-tip" v-if="listLoading">加载中…</div>
            <div class="empty-tip" v-else-if="!drugList.length">未找到相关药品，试试更换关键词</div>

            <div class="drug-grid" v-else>
              <div
                class="drug-card"
                v-for="d in drugList"
                :key="d.id"
                :class="{ highlight: d.id === highlightId }"
                @click="openDetail(d.id)"
              >
                <button v-if="isMyAdded(d.id)" class="del-btn" @click.stop="askDelete(d)">删除</button>
                <div class="drug-card-top">
                  <h3>{{ d.name }}</h3>
                  <span class="tag tag-blue">{{ d.category || '未分类' }}</span>
                </div>
                <div class="drug-card-meta">
                  <span class="rx" :class="d.prescription === '处方药' ? 'rx-e' : 'rx-o'">{{ d.prescription || '—' }}</span>
                  <span>{{ d.dosage_form || '—' }}</span>
                  <span class="spec">{{ d.spec || '—' }}</span>
                </div>
                <div class="drug-card-foot">
                  <span>{{ d.manufacturer || '生产企业未知' }}</span>
                  <b>查看详情 →</b>
                </div>
              </div>
            </div>
          </section>
        </template>

        <!-- ============ 相互作用查询 ============ -->
        <section v-else-if="activeTab === 'interaction'" class="func-view">
          <div class="func-title">
            <h2>🔗 相互作用查询</h2>
            <small>选择两种药品，评估联合用药风险（A+B 与 B+A 等价）</small>
          </div>
          <div class="inter-panel">
            <div class="inter-selects">
              <div class="select-item">
                <label>药品 A</label>
                <select v-model="interA">
                  <option :value="null" disabled>请选择药品 A</option>
                  <option v-for="o in options" :key="o.id" :value="o.id">{{ o.name }}</option>
                </select>
              </div>
              <div class="inter-divider">+</div>
              <div class="select-item">
                <label>药品 B</label>
                <select v-model="interB">
                  <option :value="null" disabled>请选择药品 B</option>
                  <option v-for="o in options" :key="o.id" :value="o.id">{{ o.name }}</option>
                </select>
              </div>
              <button class="query-btn" @click="checkInteraction" :disabled="interLoading">
                {{ interLoading ? '查询中…' : '查询' }}
              </button>
            </div>

            <div class="inter-tip" v-if="interTip">{{ interTip }}</div>

            <div class="inter-result" v-if="interResult">
              <div class="result-banner" :class="levelClass(interResult.level)">
                <span class="result-badge">{{ interResult.severity }}</span>
                <div>
                  <b>{{ interResult.drug_a_name }} ↕ {{ interResult.drug_b_name }}</b>
                  <small v-if="interResult.description">{{ interResult.description }}</small>
                </div>
              </div>
              <div class="result-advice" v-if="interResult.advice">
                <span>💡 建议</span>{{ interResult.advice }}
              </div>
            </div>

            <div class="level-legend">
              <span><i class="lg lg-1"></i>禁忌联用</span>
              <span><i class="lg lg-2"></i>需要监测</span>
              <span><i class="lg lg-3"></i>安全</span>
            </div>
          </div>
        </section>

        <!-- ============ 新增药品 ============ -->
        <section v-else-if="activeTab === 'add'" class="func-view">
          <div class="func-title">
            <h2>➕ 新增药品</h2>
            <small>录入新的药品信息（带 * 为必填）</small>
          </div>
          <div class="add-panel">
            <div class="form-row">
              <div class="form-item full">
                <label>药品名称 <em>*</em></label>
                <input v-model="form.name" placeholder="" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-item"><label>通用名</label><input v-model="form.generic_name" placeholder="" /></div>
              <div class="form-item">
                <label>分类</label>
                <input v-model="form.category" list="catList" placeholder="选择或输入分类" />
                <datalist id="catList">
                  <option v-for="c in defaultCategories" :key="c" :value="c"></option>
                </datalist>
              </div>
            </div>
            <div class="form-row">
              <div class="form-item">
                <label>处方分类</label>
                <select v-model="form.prescription">
                  <option value="">请选择</option>
                  <option value="处方药">处方药</option>
                  <option value="OTC">OTC</option>
                </select>
              </div>
              <div class="form-item"><label>剂型</label><input v-model="form.dosage_form" placeholder="" /></div>
            </div>
            <div class="form-row">
              <div class="form-item"><label>规格</label><input v-model="form.spec" placeholder="" /></div>
              <div class="form-item"><label>生产企业</label><input v-model="form.manufacturer" placeholder="" /></div>
            </div>
            <div class="form-row">
              <div class="form-item"><label>批准文号</label><input v-model="form.approval_number" placeholder="" /></div>
            </div>
            <div class="form-item full">
              <label>用法用量</label>
              <textarea v-model="form.usage_dosage" rows="2" placeholder=""></textarea>
            </div>
            <div class="form-item full">
              <label>禁忌</label>
              <textarea v-model="form.contraindications" rows="2" placeholder=""></textarea>
            </div>
            <div class="form-item full">
              <label>注意事项</label>
              <textarea v-model="form.precautions" rows="2" placeholder=""></textarea>
            </div>
            <div class="form-item full">
              <label>不良反应</label>
              <textarea v-model="form.adverse_reactions" rows="2" placeholder=""></textarea>
            </div>

            <div class="add-msg" :class="addMsg.type" v-if="addMsg.text">{{ addMsg.text }}</div>
            <div class="form-actions">
              <button class="btn-primary" @click="submitAdd" :disabled="addSaving">{{ addSaving ? '保存中…' : '保存药品' }}</button>
              <button class="btn-gray" @click="resetForm">重置</button>
            </div>
          </div>
        </section>

        <!-- ============ 用药指南 ============ -->
        <section v-else-if="activeTab === 'guide'" class="func-view">
          <template v-if="guideDetail">
            <div class="view-head">
              <button class="link-btn" @click="guideDetail = null">← 返回指南列表</button>
            </div>
            <div class="guide-detail-card">
              <span class="tag tag-blue">{{ guideDetail.category }}</span>
              <h2>{{ guideDetail.title }}</h2>
              <p class="guide-content">{{ guideDetail.content }}</p>
            </div>
          </template>
          <template v-else>
            <div class="func-title">
              <h2>📖 用药指南</h2>
              <small>合理用药知识，结合就近就医与社区随访，贴合医疗资源服务</small>
            </div>
            <div class="loading-tip" v-if="guideLoading">加载中…</div>
            <div class="empty-tip" v-else-if="!guideList.length">暂无用药指南</div>
            <div class="guide-grid" v-else>
              <div class="guide-card" v-for="g in guideList" :key="g.id" @click="openGuide(g.id)">
                <div class="guide-card-head">
                  <span class="tag" :class="guideTagClass(g.category)">{{ g.category }}</span>
                  <h3>{{ g.title }}</h3>
                </div>
                <p>{{ g.summary }}</p>
                <b>阅读全文 →</b>
              </div>
            </div>
          </template>
        </section>

        <!-- ============ 智能荐药（创新功能） ============ -->
        <section v-else-if="activeTab === 'smart'" class="func-view">
          <div class="func-title">
            <h2>🩺 智能荐药</h2>
            <small>根据您的症状和个人情况，智能推荐安全适用的药品，自动排除禁忌药品</small>
          </div>

          <!-- 症状选择 + 用户信息 -->
          <div class="smart-input-panel">
            <div class="smart-step">
              <div class="smart-step-head">
                <span class="step-num">1</span>
                <b>选择您的症状（可多选）</b>
                <button
                  type="button"
                  class="symptom-clear-btn"
                  :disabled="!selectedSymptoms.length"
                  @click="clearSymptoms"
                >清除所选</button>
              </div>
              <div class="symptom-grid">
                <label class="symptom-chip" v-for="s in symptomList" :key="s" :class="{ on: selectedSymptoms.includes(s) }">
                  <input type="checkbox" :value="s" v-model="selectedSymptoms" />{{ s }}
                </label>
              </div>
              <div class="symptom-desc-area">
                <label>症状描述</label>
                <textarea
                  v-model="symptomDesc"
                  rows="3"
                  placeholder=""
                ></textarea>
                <p class="desc-hint" v-if="selectedSymptoms.length">
                </p>
              </div>
            </div>

            <div class="smart-step">
              <div class="smart-step-head">
                <span class="step-num">2</span>
                <b>填写个人情况</b>
              </div>
              <div class="smart-profile-row">
                <div class="profile-item">
                  <label>年龄</label>
                  <input type="number" v-model="userProfile.age" min="0" max="120" placeholder="" />
                </div>
                <div class="profile-item">
                  <label>性别</label>
                  <select v-model="userProfile.gender">
                    <option value="">不透露</option>
                    <option value="男">男</option>
                    <option value="女">女</option>
                  </select>
                </div>
                <div class="profile-item">
                  <label>是否孕期/哺乳期</label>
                  <select v-model="userProfile.isPregnant">
                    <option :value="false">否</option>
                    <option :value="true">是</option>
                  </select>
                </div>
              </div>
              <div class="smart-profile-row">
                <div class="profile-item profile-allergy">
                  <label>过敏史（选填，AI 将智能甄别交叉过敏风险）</label>
                  <input v-model="userProfile.allergies" placeholder="" />
                </div>
              </div>
            </div>

            <div class="smart-action">
              <button class="smart-rec-btn" @click="doRecommend" :disabled="recLoading">
                {{ recLoading ? '🤖 AI 正在分析过敏风险…' : '🔍 开始智能荐药' }}
              </button>
            </div>
          </div>

          <!-- 推荐结果 -->
          <div class="smart-result" v-if="recResult">
            <!-- AI 分析标识 -->
            <div class="ai-badge" v-if="recResult.aiUsed">
              <span class="ai-badge-icon">🤖</span>
              <span>本次过敏分析由 AI 智能甄别，已交叉比对药物成分类别与您的过敏史</span>
            </div>

            <div class="triage-banner" :class="recResult.triage.level">
              <div class="triage-icon">
                <span v-if="recResult.triage.level === 'safe'">✅</span>
                <span v-else-if="recResult.triage.level === 'caution'">⚠️</span>
                <span v-else-if="recResult.triage.level === 'warning'">📋</span>
                <span v-else>🚨</span>
              </div>
              <div class="triage-body">
                <b>{{ recResult.triage.title }}</b>
                <p>{{ recResult.triage.message }}</p>
              </div>
              <div class="triage-badge" v-if="recResult.triage.needDoctor">建议就医</div>
            </div>

            <div class="match-cats" v-if="recResult.matchedCategories.length">
              <span class="match-label">匹配分类：</span>
              <span class="match-cat-tag" v-for="c in recResult.matchedCategories" :key="c">{{ c }}</span>
            </div>

            <div class="rec-drug-section" v-if="recResult.recommended.length">
              <h3>✅ 推荐药品（{{ recResult.recommended.length }} 种）</h3>
              <div class="rec-drug-grid">
                <div class="rec-drug-card" v-for="d in recResult.recommended" :key="d.id" @click="openDetail(d.id)">
                  <div class="rec-drug-top">
                    <h4>{{ d.name }}</h4>
                    <span class="rx" :class="d.prescription === '处方药' ? 'rx-e' : 'rx-o'">{{ d.prescription || '—' }}</span>
                  </div>
                  <div class="rec-drug-meta">
                    <span class="tag tag-blue">{{ d.category || '未分类' }}</span>
                    <span>{{ d.dosage_form || '—' }}</span>
                    <span class="spec">{{ d.spec || '—' }}</span>
                  </div>
                  <p class="rec-usage" v-if="d.usage_dosage">{{ d.usage_dosage }}</p>
                  <div class="rec-ai-safe" v-if="d.aiReason">
                    <span class="ai-reason-icon">🤖</span>{{ d.aiReason }}
                  </div>
                  <b class="rec-detail-link">查看详情 →</b>
                </div>
              </div>
            </div>

            <div class="rec-excluded-section" v-if="recResult.excluded.length">
              <h3>🚫 已排除药品（{{ recResult.excluded.length }} 种，存在禁忌）</h3>
              <div class="excluded-list">
                <div class="excluded-item" v-for="d in recResult.excluded" :key="d.id">
                  <div class="excluded-name">
                    <b>{{ d.name }}</b>
                    <span class="rx" :class="d.prescription === '处方药' ? 'rx-e' : 'rx-o'">{{ d.prescription || '—' }}</span>
                  </div>
                  <div class="excluded-warns">
                    <span class="warn-tag" v-for="w in d.warnings" :key="w">{{ w }}</span>
                  </div>
                  <div class="excluded-ai-reason" v-if="d.aiReason">
                    <span class="ai-reason-icon">🤖</span>{{ d.aiReason }}
                  </div>
                </div>
              </div>
            </div>

            <div class="rec-empty" v-if="!recResult.recommended.length && !recResult.excluded.length">
              <div class="rec-empty-icon">🔍</div>
              <p>未找到匹配的药品，请尝试选择其他症状或就医咨询</p>
            </div>
          </div>
        </section>
      </main>
    </div>

    <!-- 删除确认弹窗 -->
    <div class="modal-mask" v-if="delConfirm.show" @click.self="closeDelConfirm">
      <div class="modal-card">
        <div class="modal-icon">🗑</div>
        <h3 class="modal-title">删除药品</h3>
        <p class="modal-text">确定删除「{{ delConfirm.drug && delConfirm.drug.name }}」吗？<br/></p>
        <div class="modal-actions">
          <button class="btn-gray btn-sm" @click="closeDelConfirm">取消</button>
          <button class="btn-danger btn-sm" @click="confirmDelete" :disabled="delConfirm.loading">
            {{ delConfirm.loading ? '删除中…' : '确认删除' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 轻量提示 -->
    <div class="toast-tip" :class="toastTip.type" v-if="toastTip.show">{{ toastTip.text }}</div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import request from '../api/request'

const router = useRouter()

const activeTab = ref('list')
const searchQuery = ref('')
const filterCategory = ref('')

const drugList = ref([])
const total = ref(0)
const listLoading = ref(false)
const categories = ref([])

const detailDrug = ref(null)
const highlightId = ref(null)
const myAddedIds = ref([])
const delConfirm = reactive({ show: false, drug: null, loading: false })
const toastTip = reactive({ show: false, text: '', type: '' })

const options = ref([])
const interA = ref(null)
const interB = ref(null)
const interResult = ref(null)
const interTip = ref('')
const interLoading = ref(false)

const form = reactive({
  name: '', generic_name: '', category: '', prescription: '', dosage_form: '',
  spec: '', usage_dosage: '', contraindications: '', precautions: '',
  adverse_reactions: '', manufacturer: '', approval_number: ''
})
const addSaving = ref(false)
const addMsg = reactive({ text: '', type: '' })

const guideList = ref([])
const guideDetail = ref(null)
const guideLoading = ref(false)

const defaultCategories = ['解热镇痛', '抗感染', '心脑血管', '消化', '呼吸', '抗过敏', '内分泌']

function levelClass(level) {
  if (level === 1) return 'lv-1'
  if (level === 2) return 'lv-2'
  return 'lv-3'
}
function guideTagClass(category) {
  if (category === '儿童用药' || category === '老年用药') return 'tag-purple'
  if (category === '抗感染') return 'tag-red'
  if (category === '慢病管理') return 'tag-blue'
  return 'tag-green'
}

function goHome() {
  router.push('/')
}

async function switchTab(tab) {
  addMsg.text = ''
  addMsg.type = ''
  activeTab.value = tab
  detailDrug.value = null
  guideDetail.value = null
  interResult.value = null
  interTip.value = ''
  if (tab === 'list') {
    await loadList(1)
    scrollToHighlightIfNeeded()
  }
  if (tab === 'guide') loadGuides()
  if (tab === 'smart') { /* 无需预加载 */ }
}

async function loadList(page = 1) {
  listLoading.value = true
  try {
    const kw = encodeURIComponent(searchQuery.value.trim())
    const cat = encodeURIComponent(filterCategory.value)
    const res = await request.get(`/drug/list?keyword=${kw}&category=${cat}&page=${page}&pageSize=100`)
    drugList.value = res.data.list || []
    total.value = res.data.total || 0
  } catch (e) {
    console.error('加载药品列表失败', e)
    drugList.value = []
    total.value = 0
  } finally {
    listLoading.value = false
  }
}

function doSearch() {
  activeTab.value = 'list'
  detailDrug.value = null
  loadList(1)
}

function clearSymptoms() {
  selectedSymptoms.value = []
}

async function openDetail(id) {
  try {
    const res = await request.get(`/drug/detail/${id}`)
    activeTab.value = 'list'     // 从智能荐药等标签跳转到药品详情视图
    detailDrug.value = res.data
  } catch (e) {
    console.error('加载药品详情失败', e)
  }
}

async function loadOptions() {
  try {
    const res = await request.get('/drug/options')
    options.value = res.data || []
  } catch (e) {
    console.error('加载药品选项失败', e)
  }
}

async function loadCategories() {
  try {
    const res = await request.get('/drug/categories')
    categories.value = res.data || []
  } catch (e) {
    console.error('加载药品分类失败', e)
  }
}

async function checkInteraction() {
  if (!interA.value || !interB.value) {
    interTip.value = '请选择两种药品'
    interResult.value = null
    return
  }
  interLoading.value = true
  interTip.value = ''
  interResult.value = null
  try {
    const res = await request.get(`/drug/interaction/check?drugAId=${interA.value}&drugBId=${interB.value}`)
    if (res.data) {
      interResult.value = res.data
    } else {
      interTip.value = res.tip || res.msg || '未收录两者相互作用'
    }
  } catch (e) {
    console.error('相互作用查询失败', e)
    interTip.value = '查询失败，请稍后重试'
  } finally {
    interLoading.value = false
  }
}

async function submitAdd() {
  if (!form.name.trim()) {
    addMsg.text = '请填写药品名称'
    addMsg.type = 'error'
    return
  }
  addSaving.value = true
  addMsg.text = ''
  addMsg.type = ''
  try {
    const res = await request.post('/drug/add', { ...form })
    const newId = res.data && res.data.id
    if (newId) {
      if (!myAddedIds.value.includes(newId)) {
        myAddedIds.value.push(newId)
        saveMyAddedIds()
      }
      highlightId.value = newId
    }
    addMsg.text = '新增药品成功，请到药品中心查看'
    addMsg.type = 'success'
    resetForm()
    loadOptions()
  } catch (e) {
    console.error('新增药品失败', e)
    addMsg.text = '保存失败，请重试'
    addMsg.type = 'error'
  } finally {
    addSaving.value = false
  }
}

function resetForm() {
  Object.keys(form).forEach(k => (form[k] = ''))
}

function loadMyAddedIds() {
  try {
    myAddedIds.value = JSON.parse(localStorage.getItem('myAddedDrugIds') || '[]')
  } catch (e) {
    myAddedIds.value = []
  }
}
function saveMyAddedIds() {
  localStorage.setItem('myAddedDrugIds', JSON.stringify(myAddedIds.value))
}
function isMyAdded(id) {
  return myAddedIds.value.includes(id)
}

async function scrollToHighlightIfNeeded() {
  if (highlightId.value == null) return
  await nextTick()
  setTimeout(() => {
    const el = document.querySelector('.drug-card.highlight')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, 80)
}

function askDelete(d) {
  delConfirm.drug = d
  delConfirm.show = true
}
function closeDelConfirm() {
  if (delConfirm.loading) return
  delConfirm.show = false
  delConfirm.drug = null
}
async function confirmDelete() {
  const d = delConfirm.drug
  if (!d) return
  delConfirm.loading = true
  try {
    await request.post('/drug/delete', { id: d.id })
    myAddedIds.value = myAddedIds.value.filter(x => x !== d.id)
    saveMyAddedIds()
    if (highlightId.value === d.id) highlightId.value = null
    await loadList(1)
    showToast('删除成功', 'success')
  } catch (e) {
    console.error('删除药品失败', e)
    showToast('删除失败，请稍后重试', 'error')
  } finally {
    delConfirm.loading = false
    delConfirm.show = false
    delConfirm.drug = null
  }
}
function showToast(text, type = 'success') {
  toastTip.text = text
  toastTip.type = type
  toastTip.show = true
  setTimeout(() => { toastTip.show = false }, 2200)
}

async function loadGuides() {
  guideLoading.value = true
  try {
    const res = await request.get('/drug/guide/list')
    guideList.value = res.data || []
  } catch (e) {
    console.error('加载用药指南失败', e)
    guideList.value = []
  } finally {
    guideLoading.value = false
  }
}

async function openGuide(id) {
  try {
    const res = await request.get(`/drug/guide/${id}`)
    guideDetail.value = res.data
  } catch (e) {
    console.error('加载指南详情失败', e)
  }
}

// ==================== 创新功能：智能荐药 ====================
const symptomList = [
  '头痛', '发热', '牙痛', '痛经', '肌肉酸痛', '关节疼痛',
  '咳嗽', '感冒', '咽痛', '鼻塞', '流涕',
  '腹泻', '胃痛', '消化不良', '胃酸过多', '恶心呕吐',
  '过敏', '皮疹', '荨麻疹', '鼻炎',
  '皮肤感染', '外伤',
  '高血压', '心绞痛', '心悸',
  '糖尿病', '失眠', '焦虑',
  '维生素缺乏', '骨质疏松', '哮喘',
  '便秘', '痔疮', '湿疹', '皮炎', '头晕', '痛风',
]
const selectedSymptoms = ref([])
const symptomDesc = ref('')   // 症状描述框内容 = 自动填入的症状 + 用户补充文字
const autoPart = ref('')      // 记录当前已自动填入的症状文字，用于下次更新时剥离

// 点选症状 → 自动把症状文字填到描述框；用户手写的补充文字不丢失
watch(selectedSymptoms, (newVals) => {
  const autoText = newVals.join('、')

  // 从当前描述里剥离上次自动填入的部分，剩下的就是用户自己补充的文字
  let userText = symptomDesc.value || ''
  const prevAuto = autoPart.value
  if (prevAuto) {
    const idx = userText.indexOf(prevAuto)
    if (idx !== -1) {
      userText = (userText.slice(0, idx) + userText.slice(idx + prevAuto.length))
        .replace(/^[\s,，、；;]*(?:\n)?/, '')
        .trim()
    }
  }
  autoPart.value = autoText

  // 重新拼接：自动填充部分 + 用户补充部分
  if (autoText && userText) {
    symptomDesc.value = autoText + '\n' + userText
  } else if (autoText) {
    symptomDesc.value = autoText
  } else {
    symptomDesc.value = userText
  }
}, { deep: true })
const userProfile = reactive({ age: '', gender: '', isPregnant: false, allergies: '' })
const recResult = ref(null)
const recLoading = ref(false)

async function doRecommend() {
  if (!selectedSymptoms.value.length && !symptomDesc.value.trim()) {
    showToast('请至少选择一项症状或描述您的症状', 'error')
    return
  }
  recLoading.value = true
  recResult.value = null
  try {
    const params = new URLSearchParams({
      symptoms: selectedSymptoms.value.join(','),
      symptomDesc: symptomDesc.value || '',
      age: userProfile.age || '0',
      gender: userProfile.gender || '',
      isPregnant: userProfile.isPregnant ? '1' : '0',
      allergies: userProfile.allergies || '',
    })
    const res = await request.get(`/drug/recommend?${params.toString()}`, { timeout: 30000 })
    if (res.code === 200 && res.data) {
      recResult.value = res.data
    } else {
      showToast(res.msg || '推荐失败', 'error')
    }
  } catch (e) {
    console.error('智能荐药失败', e)
    showToast('推荐失败，请稍后重试', 'error')
  } finally {
    recLoading.value = false
  }
}

onMounted(() => {
  loadMyAddedIds()
  loadList(1)
  loadOptions()
  loadCategories()
})
</script>

<style scoped>
* { box-sizing: border-box; }
.drug-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #eef5ff 0%, #f6f9fe 100%);
  font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif;
  color: #1f2937;
}
.drug-header {
  display: flex; align-items: center; justify-content: space-between;
  gap: 24px; padding: 16px 28px;
  background: linear-gradient(90deg, #1565c0 0%, #1976d2 45%, #1e88e5 100%);
  color: #fff; box-shadow: 0 2px 10px rgba(15, 60, 120, 0.25);
}
.brand { display: flex; align-items: center; gap: 14px; }
.back-btn {
  background: rgba(255,255,255,0.16); border: 1px solid rgba(255,255,255,0.35);
  color: #fff; padding: 8px 14px; border-radius: 8px; cursor: pointer; font-size: 14px;
  transition: background .2s;
}
.back-btn:hover { background: rgba(255,255,255,0.28); }
.brand-icon { font-size: 30px; }
.brand-text h1 { font-size: 22px; margin: 0; letter-spacing: 1px; }
.brand-text small { font-size: 11px; opacity: .85; letter-spacing: .5px; }
.search-box { display: flex; gap: 8px; flex: 1; max-width: 560px; }
.search-input {
  flex: 1; padding: 11px 16px; border: none; border-radius: 10px; font-size: 14px;
  outline: none; box-shadow: inset 0 1px 3px rgba(0,0,0,0.12);
}
.search-btn {
  background: #ffb300; border: none; color: #4a3200; font-weight: 700;
  padding: 0 20px; border-radius: 10px; cursor: pointer; font-size: 14px;
}
.search-btn:hover { background: #ffc533; }

.drug-body { display: flex; min-height: calc(100vh - 74px); }

/* 左侧栏 */
.drug-sidebar {
  width: 240px; flex-shrink: 0; background: #fff; padding: 18px 14px;
  border-right: 1px solid #e5edf5; display: flex; flex-direction: column; gap: 6px;
}
.side-logo {
  display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 12px;
  cursor: pointer; margin-bottom: 10px; transition: background .2s;
}
.side-logo:hover { background: #f0f6ff; }
.side-logo-icon { font-size: 26px; }
.side-logo b { display: block; font-size: 15px; }
.side-logo small { color: #90a0b5; font-size: 12px; }
.menu-item {
  display: flex; align-items: center; gap: 12px; padding: 14px 12px; border-radius: 12px;
  cursor: pointer; border: 1px solid transparent; transition: all .2s;
}
.menu-item:hover { background: #f3f7fd; }
.menu-item.active { background: #e3f0ff; border-color: #c6e0ff; }
.mi-icon { font-size: 20px; }
.menu-item b { display: block; font-size: 14px; color: #24344d; }
.menu-item small { color: #8fa0b8; font-size: 12px; }
.menu-item.active b { color: #1565c0; }
.side-foot {
  margin-top: auto; padding-top: 16px; font-size: 11px; color: #b0bccd;
  text-align: center; border-top: 1px dashed #e5edf5;
}

/* 内容区 */
.drug-main { flex: 1; padding: 24px 28px; overflow-y: auto; }
.view-head { margin-bottom: 14px; }
.link-btn {
  background: none; border: none; color: #1565c0; cursor: pointer; font-size: 14px;
  padding: 0; font-weight: 600;
}
.link-btn:hover { text-decoration: underline; }
.list-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.list-head h2 { margin: 0 0 4px; font-size: 20px; }
.list-head small { color: #8fa0b8; }
.filter-select {
  padding: 9px 12px; border: 1px solid #d8e3ef; border-radius: 10px; font-size: 14px;
  background: #fff; color: #33475b;
}
.loading-tip, .empty-tip {
  padding: 60px 20px; text-align: center; color: #9aa8bb; font-size: 14px;
}

/* 药品卡片 */
.drug-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
.drug-card {
  position: relative;
  background: #fff; border: 1px solid #e8eef6; border-radius: 14px; padding: 18px;
  cursor: pointer; transition: all .2s; box-shadow: 0 1px 3px rgba(20,50,90,0.04);
}
.drug-card.highlight { border-color: #1976d2; box-shadow: 0 0 0 3px rgba(25,118,210,0.18); }
.del-btn {
  position: absolute; top: 10px; right: 10px; z-index: 2;
  background: #d32f2f; color: #fff; border: none; border-radius: 6px;
  padding: 4px 12px; font-size: 12px; cursor: pointer; opacity: 0; transition: opacity .2s;
}
.drug-card:hover .del-btn { opacity: 1; }

/* 删除确认弹窗（小巧高级风） */
.modal-mask {
  position: fixed; inset: 0; background: rgba(15, 30, 60, 0.45);
  display: flex; align-items: center; justify-content: center; z-index: 1000;
}
.modal-card {
  background: #fff; border-radius: 16px; padding: 26px 28px; width: 320px;
  text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.25); animation: popIn .18s ease;
}
@keyframes popIn { from { transform: scale(.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.modal-icon { font-size: 30px; }
.modal-title { margin: 10px 0 8px; font-size: 17px; color: #11294a; }
.modal-text { font-size: 13px; color: #5b6e86; line-height: 1.7; margin: 0 0 20px; }
.modal-actions { display: flex; flex-direction: column; gap: 10px; }
.modal-actions button { width: 100%; }
.btn-sm { padding: 9px 20px; font-size: 13px; border-radius: 8px; cursor: pointer; border: none; font-weight: 600; }
.btn-danger { background: #d32f2f; color: #fff; }
.btn-danger:hover { background: #b71c1c; }
.btn-danger:disabled { opacity: .6; cursor: not-allowed; }

/* 轻量 toast 提示 */
.toast-tip {
  position: fixed; top: 90px; left: 50%; transform: translateX(-50%);
  padding: 10px 20px; border-radius: 10px; font-size: 14px; color: #fff;
  box-shadow: 0 8px 20px rgba(0,0,0,0.18); z-index: 1001; animation: popIn .18s ease;
}
.toast-tip.success { background: rgba(30, 142, 62, 0.95); }
.toast-tip.error { background: rgba(211, 47, 47, 0.95); }
.drug-card:hover { transform: translateY(-3px); box-shadow: 0 8px 22px rgba(20,80,160,0.12); border-color: #c6e0ff; }
.drug-card-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.drug-card-top h3 { margin: 0; font-size: 18px; color: #11294a; }
.drug-card-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin: 14px 0; font-size: 13px; color: #5b6e86; }
.rx { padding: 2px 8px; border-radius: 6px; font-size: 12px; }
.rx-e { background: #ffe9e9; color: #d32f2f; }
.rx-o { background: #e6f7ec; color: #1e8e3e; }
.spec { color: #90a0b5; }
.drug-card-foot { display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #f0f4fa; padding-top: 12px; }
.drug-card-foot span { font-size: 12px; color: #8fa0b8; max-width: 70%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.drug-card-foot b { font-size: 13px; color: #1565c0; }

/* 标签 */
.tag { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
.tag-blue { background: #e3f0ff; color: #1565c0; }
.tag-red { background: #ffe9e9; color: #d32f2f; }
.tag-green { background: #e6f7ec; color: #1e8e3e; }
.tag-gray { background: #efF2f7; color: #64748b; }
.tag-purple { background: #f0e7ff; color: #7c3aed; }

/* 药品详情 */
.detail-card { background: #fff; border-radius: 16px; padding: 26px; box-shadow: 0 2px 8px rgba(20,50,90,0.05); }
.detail-hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding-bottom: 20px; border-bottom: 1px solid #eef3f9; }
.detail-hero h2 { margin: 0 0 12px; font-size: 26px; color: #11294a; }
.detail-tags { display: flex; gap: 8px; flex-wrap: wrap; }
.detail-spec { text-align: right; background: #f5f9ff; padding: 12px 16px; border-radius: 12px; }
.detail-spec span { display: block; font-size: 12px; color: #8fa0b8; }
.detail-spec b { font-size: 18px; color: #1565c0; }
.info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin: 20px 0; }
.info-item { background: #f8fafd; padding: 12px 14px; border-radius: 10px; }
.info-item span { display: block; font-size: 12px; color: #8fa0b8; margin-bottom: 4px; }
.info-item b { font-size: 14px; color: #33475b; }
.detail-block { margin-top: 18px; }
.block-title { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700; color: #24344d; margin-bottom: 8px; }
.block-title i { width: 4px; height: 16px; border-radius: 2px; background: #1976d2; }
.detail-block p { margin: 0; line-height: 1.8; color: #4a5b70; font-size: 14px; background: #fafcff; padding: 14px; border-radius: 10px; border-left: 3px solid #1976d2; }
.detail-block.danger p { border-left-color: #d32f2f; background: #fffaf8; }
.detail-block.warn p { border-left-color: #f59e0b; background: #fffcf5; }
.detail-block.warn .block-title i { background: #f59e0b; }
.detail-block.danger .block-title i { background: #d32f2f; }
.detail-inter { margin-top: 20px; border-top: 1px dashed #e5edf5; padding-top: 18px; }
.inter-row { display: flex; align-items: center; gap: 14px; padding: 12px 0; border-bottom: 1px solid #f0f4fa; flex-wrap: wrap; }
.inter-level { flex-shrink: 0; padding: 4px 12px; border-radius: 8px; font-size: 13px; font-weight: 700; color: #fff; }
.inter-names { font-size: 14px; font-weight: 600; color: #24344d; }
.inter-names em { color: #90a0b5; font-style: normal; margin: 0 4px; }
.inter-desc { font-size: 13px; color: #6b7c92; width: 100%; }

/* 功能视图通用 */
.func-view { max-width: 860px; }
.func-title { margin-bottom: 20px; }
.func-title h2 { margin: 0 0 6px; font-size: 20px; }
.func-title small { color: #8fa0b8; }

/* 相互作用 */
.inter-panel { background: #fff; border-radius: 16px; padding: 26px; box-shadow: 0 2px 8px rgba(20,50,90,0.05); }
.inter-selects { display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
.select-item { flex: 1; min-width: 200px; }
.select-item label { display: block; font-size: 13px; color: #5b6e86; margin-bottom: 6px; }
.select-item select {
  width: 100%; padding: 11px 12px; border: 1px solid #d8e3ef; border-radius: 10px;
  font-size: 14px; background: #fff; color: #33475b;
}
.inter-divider { font-size: 20px; color: #90a0b5; padding-bottom: 12px; }
.query-btn {
  background: #1976d2; color: #fff; border: none; padding: 12px 28px; border-radius: 10px;
  font-size: 15px; font-weight: 600; cursor: pointer;
}
.query-btn:hover { background: #1565c0; }
.query-btn:disabled { opacity: .6; cursor: not-allowed; }
.inter-tip {
  margin-top: 18px; padding: 14px; background: #fff7e6; border-radius: 10px;
  color: #b26a00; font-size: 14px;
}
.inter-result { margin-top: 20px; }
.result-banner {
  display: flex; align-items: center; gap: 16px; padding: 18px; border-radius: 12px; color: #fff;
}
.result-banner.lv-1 { background: linear-gradient(90deg, #d32f2f, #e53935); }
.result-banner.lv-2 { background: linear-gradient(90deg, #f59e0b, #fbbf24); color: #4a3200; }
.result-banner.lv-3 { background: linear-gradient(90deg, #1e8e3e, #2e9e52); }
.result-badge { background: rgba(255,255,255,0.22); padding: 6px 16px; border-radius: 8px; font-weight: 700; font-size: 15px; }
.result-banner b { font-size: 17px; display: block; margin-bottom: 6px; }
.result-banner small { font-size: 14px; opacity: .95; line-height: 1.6; }
.result-advice {
  margin-top: 12px; padding: 14px 16px; background: #f0f6ff; border-radius: 10px;
  font-size: 14px; color: #33475b;
}
.result-advice span { font-weight: 700; color: #1565c0; margin-right: 6px; }
.level-legend { display: flex; gap: 20px; margin-top: 20px; font-size: 13px; color: #5b6e86; }
.lg { display: inline-block; width: 12px; height: 12px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; }
.lg-1 { background: #d32f2f; }
.lg-2 { background: #f59e0b; }
.lg-3 { background: #1e8e3e; }

/* 新增表单 */
.add-panel { background: #fff; border-radius: 16px; padding: 26px; box-shadow: 0 2px 8px rgba(20,50,90,0.05); }
.form-row { display: flex; gap: 16px; flex-wrap: wrap; }
.form-item { flex: 1; min-width: 220px; margin-bottom: 18px; }
.form-item.full { flex: 0 0 100%; min-width: 100%; }
.form-item label { display: block; font-size: 13px; color: #5b6e86; margin-bottom: 6px; }
.form-item label em { color: #d32f2f; font-style: normal; }
.form-item input, .form-item select, .form-item textarea {
  width: 100%; padding: 11px 12px; border: 1px solid #d8e3ef; border-radius: 10px;
  font-size: 14px; font-family: inherit; color: #33475b; background: #fff; resize: vertical;
}
.form-item input:focus, .form-item select:focus, .form-item textarea:focus {
  outline: none; border-color: #1976d2; box-shadow: 0 0 0 3px rgba(25,118,210,0.12);
}
.add-msg { padding: 12px 16px; border-radius: 10px; margin: 8px 0 16px; font-size: 14px; }
.add-msg.success { background: #e6f7ec; color: #1e8e3e; }
.add-msg.error { background: #ffe9e9; color: #d32f2f; }
.form-actions { display: flex; gap: 12px; }
.btn-primary {
  background: #1976d2; color: #fff; border: none; padding: 12px 28px; border-radius: 10px;
  font-size: 15px; font-weight: 600; cursor: pointer;
}
.btn-primary:hover { background: #1565c0; }
.btn-primary:disabled { opacity: .6; cursor: not-allowed; }
.btn-gray {
  background: #eef2f7; color: #33475b; border: none; padding: 12px 28px; border-radius: 10px;
  font-size: 15px; cursor: pointer;
}
.btn-gray:hover { background: #e2e8f0; }

/* 用药指南 */
.guide-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
.guide-card {
  background: #fff; border: 1px solid #e8eef6; border-radius: 14px; padding: 20px; cursor: pointer;
  transition: all .2s;
}
.guide-card:hover { transform: translateY(-3px); box-shadow: 0 8px 22px rgba(20,80,160,0.12); cursor: pointer; }
.guide-card-head h3 { margin: 10px 0 8px; font-size: 17px; color: #11294a; }
.guide-card p { margin: 0 0 12px; font-size: 13px; color: #5b6e86; line-height: 1.7; min-height: 42px; }
.guide-card b { font-size: 13px; color: #1565c0; }
.guide-detail-card { background: #fff; border-radius: 16px; padding: 28px; box-shadow: 0 2px 8px rgba(20,50,90,0.05); }
.guide-detail-card h2 { margin: 14px 0; font-size: 22px; color: #11294a; }
.guide-content { white-space: pre-line; line-height: 2; color: #4a5b70; font-size: 15px; }

/* ==================== 创新功能：智能荐药 ==================== */

/* 输入面板 */
.smart-input-panel { background: #fff; border-radius: 16px; padding: 28px; box-shadow: 0 2px 8px rgba(20,50,90,0.05); margin-bottom: 20px; }
.smart-step { margin-bottom: 24px; }
.smart-step-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.step-num { width: 26px; height: 26px; border-radius: 50%; background: #1976d2; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; flex-shrink: 0; }
.smart-step-head b { font-size: 15px; color: #24344d; }
.symptom-clear-btn { margin-left: auto; padding: 5px 14px; border: 1px solid #d8e3ef; border-radius: 8px; background: #f8fafd; color: #5b6e86; font-size: 13px; cursor: pointer; transition: all .2s; white-space: nowrap; }
.symptom-clear-btn:hover:not(:disabled) { border-color: #ef5350; color: #d32f2f; background: #fff5f5; }
.symptom-clear-btn:disabled { opacity: .45; cursor: not-allowed; }

.symptom-grid { display: flex; flex-wrap: wrap; gap: 10px; }
.symptom-chip { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border: 1px solid #d8e3ef; border-radius: 20px; font-size: 14px; color: #5b6e86; cursor: pointer; transition: all .2s; background: #fff; }
.symptom-chip input { display: none; }
.symptom-chip:hover { border-color: #90caf9; background: #f5f9ff; }
.symptom-chip.on { background: linear-gradient(135deg, #1976d2, #1565c0); color: #fff; border-color: #1565c0; box-shadow: 0 2px 8px rgba(25,118,210,0.25); }

.symptom-desc-area { margin-top: 14px; }
.symptom-desc-area label { display: block; font-size: 13px; color: #5b6e86; margin-bottom: 6px; }
.symptom-desc-area textarea {
  width: 100%; padding: 11px 14px; border: 1px solid #d8e3ef; border-radius: 10px;
  font-size: 14px; font-family: inherit; color: #33475b; background: #fff; resize: vertical;
  line-height: 1.6;
}
.symptom-desc-area textarea:focus {
  outline: none; border-color: #1976d2; box-shadow: 0 0 0 3px rgba(25,118,210,0.12);
}
.desc-hint {
  margin: 8px 0 0; font-size: 12px; color: #1e8e3e; line-height: 1.6;
}

.smart-profile-row { display: flex; gap: 16px; flex-wrap: wrap; }
.profile-item { flex: 1; min-width: 160px; }
.profile-item.profile-allergy { flex: 0 0 100%; min-width: 100%; }
.profile-item label { display: block; font-size: 13px; color: #5b6e86; margin-bottom: 6px; }
.profile-item input, .profile-item select { width: 100%; padding: 10px 12px; border: 1px solid #d8e3ef; border-radius: 10px; font-size: 14px; background: #fff; color: #33475b; }
.profile-item input:focus, .profile-item select:focus { outline: none; border-color: #1976d2; box-shadow: 0 0 0 3px rgba(25,118,210,0.12); }

.smart-action { margin-top: 8px; text-align: center; }
.smart-rec-btn { background: linear-gradient(135deg, #1976d2, #1565c0); color: #fff; border: none; padding: 14px 44px; border-radius: 12px; font-size: 16px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 14px rgba(25,118,210,0.3); transition: all .2s; }
.smart-rec-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(25,118,210,0.4); }
.smart-rec-btn:disabled { opacity: .6; cursor: not-allowed; transform: none; }

.smart-result { background: #fff; border-radius: 16px; padding: 28px; box-shadow: 0 2px 8px rgba(20,50,90,0.05); }

.triage-banner { display: flex; align-items: center; gap: 16px; padding: 18px 20px; border-radius: 12px; margin-bottom: 20px; }
.triage-banner.safe { background: #f0fdf4; border: 1px solid #bbf7d0; }
.triage-banner.caution { background: #fffbeb; border: 1px solid #fde68a; }
.triage-banner.warning { background: #fff7ed; border: 1px solid #fed7aa; }
.triage-banner.danger { background: #fef2f2; border: 1px solid #fecaca; }
.triage-icon { font-size: 32px; flex-shrink: 0; }
.triage-body b { display: block; font-size: 16px; color: #24344d; margin-bottom: 4px; }
.triage-body p { margin: 0; font-size: 13px; color: #5b6e86; line-height: 1.6; }
.triage-badge { flex-shrink: 0; background: #d32f2f; color: #fff; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 20px; white-space: nowrap; }

.match-cats { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
.match-label { font-size: 14px; color: #5b6e86; }
.match-cat-tag { background: #e3f0ff; color: #1565c0; font-size: 13px; font-weight: 600; padding: 4px 12px; border-radius: 20px; }

.rec-drug-section h3, .rec-excluded-section h3 { font-size: 16px; color: #24344d; margin: 0 0 16px; }
.rec-drug-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.rec-drug-card { background: #f8fafd; border: 1px solid #e8eef6; border-radius: 14px; padding: 18px; cursor: pointer; transition: all .2s; }
.rec-drug-card:hover { transform: translateY(-3px); box-shadow: 0 8px 22px rgba(20,80,160,0.1); border-color: #c6e0ff; }
.rec-drug-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
.rec-drug-top h4 { margin: 0; font-size: 17px; color: #11294a; }
.rec-drug-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 13px; color: #5b6e86; margin-bottom: 10px; }
.rec-usage { margin: 0 0 10px; font-size: 13px; color: #6b7c92; line-height: 1.6; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.rec-detail-link { font-size: 13px; color: #1565c0; }

.rec-excluded-section { margin-top: 24px; }
.excluded-list { display: flex; flex-direction: column; gap: 10px; }
.excluded-item { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; background: #fff8f8; border: 1px solid #ffcdd2; border-radius: 12px; flex-wrap: wrap; }
.excluded-name { display: flex; align-items: center; gap: 10px; }
.excluded-name b { font-size: 15px; color: #24344d; }
.excluded-warns { display: flex; gap: 8px; flex-wrap: wrap; }
.warn-tag { background: #fee; color: #d32f2f; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 6px; }

.excluded-ai-reason, .rec-ai-safe {
  margin-top: 8px; padding: 8px 12px; border-radius: 8px;
  font-size: 13px; color: #33475b; line-height: 1.6;
  display: flex; gap: 6px; align-items: flex-start;
}
.excluded-ai-reason { background: #fff3e0; border: 1px solid #ffe0b2; }
.rec-ai-safe { background: #e8f5e9; border: 1px solid #c8e6c9; }
.ai-reason-icon { flex-shrink: 0; }

.ai-badge {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px; margin-bottom: 20px;
  background: linear-gradient(135deg, #f0f4ff, #e8f5e9);
  border: 1px solid #c6e0ff; border-radius: 12px;
  font-size: 13px; color: #24344d; line-height: 1.6;
}
.ai-badge-icon { font-size: 20px; flex-shrink: 0; }

.rec-empty { text-align: center; padding: 40px 0; }
.rec-empty-icon { font-size: 40px; margin-bottom: 12px; }
.rec-empty p { color: #9aa8bb; font-size: 14px; }

@media (max-width: 900px) {
  .drug-header { flex-direction: column; align-items: stretch; }
  .search-box { max-width: none; }
  .drug-body { flex-direction: column; }
  .drug-sidebar { width: 100%; flex-direction: row; flex-wrap: wrap; }
  .side-logo, .side-foot { display: none; }
  .menu-item { flex: 1; min-width: 140px; }
  .info-grid { grid-template-columns: repeat(2, 1fr); }
  .rec-drug-grid { grid-template-columns: 1fr; }
  .triage-banner { flex-direction: column; text-align: center; }
}
</style>