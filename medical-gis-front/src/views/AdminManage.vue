<template>
  <div class="admin-page">
    <!-- ===== 顶部标题 ===== -->
    <header class="ad-hero">
      <div class="ad-hero-inner">
        <div>
          <h1>🛡️ 权限管理</h1>
          <small>仅管理员可访问</small>
        </div>
        <div class="ad-hero-btns">
          <button class="ad-btn ghost" @click="$router.push('/personal')">← 返回个人中心</button>
        </div>
      </div>
    </header>

    <div class="ad-container">
      <!-- ===== 切换 ===== -->
      <nav class="ad-tabs">
        <button :class="{ active: tab === 'users' }" @click="tab = 'users'">用户管理</button>
        <button :class="{ active: tab === 'comments' }" @click="tab = 'comments'">留言管理</button>
      </nav>

      <!-- ===== 用户管理 ===== -->
      <section v-if="tab === 'users'" class="ad-panel">
        <div class="ad-panel-head">
          <b>全部用户（{{ userList.length }}）</b>
          <button class="ad-btn sm" @click="loadUsers">刷新</button>
        </div>
        <div v-if="userList.length === 0" class="ad-empty">暂无用户数据</div>
        <table class="ad-table" v-else>
          <thead>
            <tr>
              <th>ID</th><th>用户名</th><th>真实姓名</th><th>角色</th>
              <th>状态</th><th>注册时间</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in userList" :key="u.id">
              <td>{{ u.id }}</td>
              <td>{{ u.username }}</td>
              <td>{{ u.real_name || '—' }}</td>
              <td><span class="ad-tag" :class="{ 'is-admin': u.role === 'admin' }">{{ u.role === 'admin' ? '管理员' : '普通用户' }}</span></td>
              <td><span class="ad-tag" :class="u.status === 'banned' ? 'is-banned' : 'is-normal'">{{ u.status === 'banned' ? '已封禁' : '正常' }}</span></td>
              <td>{{ u.create_time }}</td>
              <td>
                <button v-if="u.role !== 'admin'" class="ad-btn sm" :class="u.status === 'banned' ? 'ok' : 'danger'" @click="toggleBan(u)">
                  {{ u.status === 'banned' ? '解封' : '封禁' }}
                </button>
                <span v-else class="ad-muted">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- ===== 留言管理 ===== -->
      <section v-else class="ad-panel">
        <div class="ad-panel-head">
          <b>全部留言（{{ commentList.length }}）</b>
          <button class="ad-btn sm" @click="loadComments">刷新</button>
        </div>
        <div v-if="commentList.length === 0" class="ad-empty">暂无留言数据</div>
        <table class="ad-table" v-else>
          <thead>
            <tr><th>ID</th><th>用户</th><th>所属点位</th><th>评分</th><th>内容</th><th>时间</th><th>操作</th></tr>
          </thead>
          <tbody>
            <tr v-for="c in commentList" :key="c.id">
              <td>{{ c.id }}</td>
              <td>{{ c.username || '未知用户' }}</td>
              <td>{{ c.point_name || '—' }}</td>
              <td>{{ c.star ? '⭐'.repeat(c.star) : '—' }}</td>
              <td class="ad-content">{{ c.content }}</td>
              <td>{{ c.create_time }}</td>
              <td><button class="ad-btn sm danger" @click="deleteComment(c)">删除</button></td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>

    <!-- ===== 小巧确认弹窗 ===== -->
    <div class="confirm-mask" v-if="confirmBox.show" @click.self="confirmCancel">
      <div class="confirm-card">
        <div class="confirm-icon" :class="confirmBox.type">
          <span v-if="confirmBox.type === 'danger'">⚠️</span>
          <span v-else>✅</span>
        </div>
        <div class="confirm-text">{{ confirmBox.text }}</div>
        <div class="confirm-actions">
          <button class="cf-btn cancel" @click="confirmCancel">取消</button>
          <button class="cf-btn ok" :class="confirmBox.type" @click="confirmOk">确定</button>
        </div>
      </div>
    </div>

    <!-- toast -->
    <div class="ad-toast" :class="toast.type" v-if="toast.show">{{ toast.text }}</div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import request from '../api/request'
import { getUserInfo } from '../utils/storage'

const router = useRouter()
const tab = ref('users')
const userList = ref([])
const commentList = ref([])
const toast = reactive({ show: false, text: '', type: 'success' })
const confirmBox = reactive({ show: false, text: '', type: 'primary', onOk: null })

function showToast(text, type = 'success') {
  toast.text = text
  toast.type = type
  toast.show = true
  setTimeout(() => { toast.show = false }, 2200)
}
function confirmAction(text, type, cb) {
  confirmBox.text = text
  confirmBox.type = type || 'primary'
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

async function loadUsers() {
  try {
    const res = await request.get('/admin/users')
    userList.value = res.data || []
  } catch (e) {
    showToast('加载用户失败', 'error')
  }
}

async function loadComments() {
  try {
    const res = await request.get('/admin/comments')
    commentList.value = res.data || []
  } catch (e) {
    showToast('加载留言失败', 'error')
  }
}

function toggleBan(u) {
  const banning = u.status !== 'banned'
  const tip = banning
    ? `确定封禁用户「${u.username}」吗？封禁后该用户将无法登录。`
    : `确定解封用户「${u.username}」吗？`
  confirmAction(tip, banning ? 'danger' : 'primary', async () => {
    try {
      const res = await request.post(banning ? '/admin/user/ban' : '/admin/user/unban', { id: u.id })
      if (res.code === 200) {
        showToast(banning ? '已封禁' : '已解封')
        loadUsers()
      } else {
        showToast(res.msg || '操作失败', 'error')
      }
    } catch (e) {
      showToast('操作失败', 'error')
    }
  })
}

function deleteComment(c) {
  confirmAction(`确定删除用户「${c.username || '未知'}」的这条留言吗？`, 'danger', async () => {
    try {
      await request.delete(`/admin/comment/${c.id}`)
      showToast('留言已删除')
      loadComments()
    } catch (e) {
      showToast('删除失败', 'error')
    }
  })
}

onMounted(() => {
  const info = getUserInfo() || {}
  // 前端兜底：非管理员直接踢回个人中心（后端 adminCheck 才是真正的安全闸门）
  if (info.role !== 'admin') {
    router.replace('/personal')
    return
  }
  loadUsers()
  loadComments()
})
</script>

<style scoped>
.admin-page {
  min-height: 100vh;
  background:
    radial-gradient(1100px 420px at 100% 0%, rgba(33, 150, 243, 0.08), transparent 55%),
    linear-gradient(180deg, #edf3fb 0%, #f6f9fd 34%, #edf2f7 100%);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  color: #1f2937;
}
.ad-hero {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(1000px 380px at 82% -30%, rgba(96, 165, 250, 0.55), transparent 60%),
    radial-gradient(700px 300px at 8% 140%, rgba(33, 150, 243, 0.45), transparent 65%),
    linear-gradient(135deg, #0b1934 0%, #13294f 48%, #23549e 100%);
  box-shadow: 0 6px 24px rgba(12, 30, 66, 0.28);
}
.ad-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(115deg, rgba(255, 255, 255, 0.035) 0 2px, transparent 2px 26px);
  pointer-events: none;
}
.ad-hero-inner {
  position: relative;
  z-index: 1;
  max-width: 1080px;
  margin: 0 auto;
  padding: 22px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.ad-hero h1 { margin: 0; font-size: 22px; color: #fff; font-weight: 700; }
.ad-hero small { color: rgba(255,255,255,0.7); font-size: 13px; }
.ad-hero-btns { display: flex; gap: 10px; }
.ad-btn {
  border: none;
  cursor: pointer;
  border-radius: 8px;
  font-size: 14px;
  padding: 10px 18px;
  transition: all .2s;
}
.ad-btn.ghost { background: rgba(255,255,255,0.14); color: #fff; border: 1px solid rgba(255,255,255,0.45); backdrop-filter: blur(4px); }
.ad-btn.ghost:hover { background: rgba(255,255,255,0.26); }
.ad-btn.sm { padding: 6px 14px; font-size: 13px; background: linear-gradient(135deg, #2196f3, #1565c0); color: #fff; box-shadow: 0 3px 8px rgba(33,150,243,0.28); }
.ad-btn.sm:hover { background: linear-gradient(135deg, #1976d2, #0d47a1); }
.ad-btn.danger { background: #ef5350; color: #fff; }
.ad-btn.danger:hover { background: #d32f2f; }
.ad-btn.ok { background: #2e7d32; color: #fff; }
.ad-btn.ok:hover { background: #1b5e20; }

.ad-container { max-width: 1080px; margin: 0 auto; padding: 22px 28px 40px; }

.ad-tabs {
  display: flex;
  gap: 6px;
  background: #fff;
  border: 1px solid #eef3f9;
  border-radius: 10px;
  padding: 6px;
  margin-bottom: 16px;
  box-shadow: 0 4px 14px rgba(21, 80, 160, 0.07);
}
.ad-tabs button {
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
.ad-tabs button.active { background: linear-gradient(135deg, #2196f3, #1565c0); color: #fff; font-weight: 600; box-shadow: 0 3px 8px rgba(33, 150, 243, 0.32); }

.ad-panel {
  background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
  border: 1px solid #eef3f9;
  border-radius: 12px;
  padding: 18px;
  box-shadow: 0 6px 18px rgba(21, 80, 160, 0.08);
}
.ad-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.ad-panel-head b { font-size: 15px; color: #1a2740; }
.ad-empty { text-align: center; color: #96a4b5; font-size: 14px; padding: 40px 0; }
.ad-muted { color: #96a4b5; }

.ad-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.ad-table th, .ad-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid #eef2f7;
  vertical-align: middle;
}
.ad-table th { color: #8696a8; font-weight: 600; background: #f8fafc; }
.ad-table tr:hover td { background: #f5f9ff; }
.ad-content { max-width: 280px; white-space: pre-wrap; word-break: break-all; }

.ad-tag {
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 999px;
  background: #eef2f7;
  color: #55606e;
}
.ad-tag.is-admin { background: #fff3e0; color: #ef6c00; }
.ad-tag.is-normal { background: #e8f5e9; color: #2e7d32; }
.ad-tag.is-banned { background: #ffebee; color: #c62828; }

/* ===== 确认弹窗 ===== */
.confirm-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 25, 45, 0.38);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1300;
}
.confirm-card {
  background: #fff;
  border-radius: 14px;
  padding: 24px 26px;
  width: 320px;
  max-width: 88vw;
  text-align: center;
  box-shadow: 0 20px 50px rgba(15, 30, 60, 0.28);
  animation: popIn .18s ease;
}
.confirm-icon {
  width: 54px;
  height: 54px;
  margin: 0 auto 14px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background: #e3f2fd;
}
.confirm-icon.danger { background: #ffebee; }
.confirm-text { font-size: 14px; color: #1f2937; line-height: 1.6; margin-bottom: 20px; }
.confirm-actions { display: flex; gap: 12px; }
.cf-btn { flex: 1; padding: 9px 0; border-radius: 8px; border: none; cursor: pointer; font-size: 14px; transition: all .2s; }
.cf-btn.cancel { background: #eef2f7; color: #55606e; }
.cf-btn.cancel:hover { background: #e2e8f0; }
.cf-btn.ok { background: #2196f3; color: #fff; }
.cf-btn.ok:hover { background: #1976d2; }
.cf-btn.ok.danger { background: #ef5350; }
.cf-btn.ok.danger:hover { background: #d32f2f; }
@keyframes popIn { from { transform: scale(.94); opacity: 0; } to { transform: scale(1); opacity: 1; } }

.ad-toast {
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
.ad-toast.success { background: #2196f3; }
.ad-toast.error { background: #ef5350; }
</style>