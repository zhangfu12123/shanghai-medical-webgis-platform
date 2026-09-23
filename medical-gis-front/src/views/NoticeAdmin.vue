<template>
  <div class="page-admin-notice">
    <Toast ref="toastRef" />
    <!-- 右上角删除确认小弹窗 -->
    <Teleport to="body">
      <div v-if="showDelConfirm" class="del-confirm-popup">
        <div class="confirm-title">⚠️确认删除该公告？</div>
        <div class="confirm-buttons">
          <button class="btn-cancel" @click="cancelDelete">取消</button>
          <button class="btn-confirm" @click="confirmDelete">确认</button>
        </div>
      </div>
    </Teleport>
    <div class="admin-inner">
      <h2>📋 公告管理（管理员）</h2>
      <div class="action-row">
        <button class="top-btn" @click="$router.push('/notice')">查看公告</button>
        <button class="top-btn" @click="$router.push('/home')">返回首页</button>
      </div>
      <div class="edit-form">
        <h3>{{ editForm.id > 0 ? '编辑公告' : '新增公告' }}</h3>
        <div class="form-item">
          <label>标题：</label>
          <input autocomplete="off" v-model="editForm.title" placeholder="请输入公告标题" />
        </div>
        <div class="form-item">
          <label>内容：</label>
          <textarea autocomplete="off" v-model="editForm.content" placeholder="请输入公告内容"></textarea>
        </div>
        <div class="form-item checkbox-item">
          <input type="checkbox" v-model="editForm.is_show" id="is_show" />
          <label for="is_show">是否对外显示</label>
        </div>
        <div class="form-buttons">
          <button class="top-btn save-btn" @click="submitNotice">保存</button>
          <button class="top-btn" @click="resetEdit">清空</button>
        </div>
      </div>
      <h3 class="list-title">全部公告列表</h3>
      <div v-if="noticeList.length === 0" class="empty-tip">
        暂无公告数据
      </div>
      <div v-for="n in noticeList" :key="n.id" class="notice-row">
        <div class="row-main">
          <h4>{{ n.title }}</h4>
          <p class="row-content">{{ n.content }}</p>
          <p class="row-meta">
            显示状态：
            <span :class="n.is_show ? 'tag-show' : 'tag-hide'">
              {{ n.is_show ? '对外显示' : '隐藏' }}
            </span>
            ｜发布时间：{{ n.create_time }}
          </p>
        </div>
        <div class="row-actions">
          <button class="top-btn" @click="fillEdit(n)">编辑</button>
          <button class="top-btn delete-btn" @click="openDelConfirm(n.id)">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '../api/request'
import Toast from '../components/Toast.vue'
const toastRef = ref(null)
const noticeList = ref([])
const editForm = ref({
  id: 0,
  title: '',
  content: '',
  is_show: true
})
// 删除确认弹窗状态
const showDelConfirm = ref(false)
const pendingDeleteId = ref(null)
async function loadNotice() {
  try {
    const res = await request.get('/notice')
    noticeList.value = res.data || []
  } catch (err) {
    console.error('加载公告失败', err)
    toastRef.value?.show('加载公告失败', 'warn')
  }
}
function resetEdit() {
  editForm.value = {
    id: 0,
    title: '',
    content: '',
    is_show: true
  }
}
function fillEdit(item) {
  editForm.value = { ...item }
}
async function submitNotice() {
  if (!editForm.value.title.trim() || !editForm.value.content.trim()) {
    toastRef.value?.show('标题和内容不能为空', 'warn')
    return
  }
  try {
    if (editForm.value.id > 0) {
      await request.put(`/notice/update/${editForm.value.id}`, {
        title: editForm.value.title,
        content: editForm.value.content,
        is_show: editForm.value.is_show ? 1 : 0
      })
    } else {
      await request.post('/notice/add', {
        title: editForm.value.title,
        content: editForm.value.content,
        is_show: editForm.value.is_show ? 1 : 0
      })
    }
    toastRef.value?.show('发布成功', 'success')
    resetEdit()
    await loadNotice()
  } catch (err) {
    console.error('保存公告失败', err)
    toastRef.value?.show('保存失败，请稍后重试', 'warn')
  }
}
// 打开删除确认弹窗
function openDelConfirm(id) {
  console.log('点击删除，id=', id)
  pendingDeleteId.value = id
  showDelConfirm.value = true
}
// 确认删除
async function confirmDelete() {
  const id = pendingDeleteId.value
  showDelConfirm.value = false
  pendingDeleteId.value = null
  try {
    await request.delete(`/notice/del/${id}`)
    toastRef.value?.show('删除成功', 'success')
    await loadNotice()
  } catch (err) {
    console.error('删除公告失败', err)
    toastRef.value?.show('删除失败，请稍后重试', 'warn')
  }
}
// 取消删除
function cancelDelete() {
  showDelConfirm.value = false
  pendingDeleteId.value = null
}
onMounted(() => {
  loadNotice()
})
</script>

<style scoped>
.page-admin-notice {
  min-height: 100vh;
  background:
    radial-gradient(circle at 20% 10%, rgba(79, 195, 247, 0.15), transparent 40%),
    radial-gradient(circle at 80% 80%, rgba(30, 136, 229, 0.12), transparent 45%),
    linear-gradient(135deg, #051224 0%, #0a1f3a 50%, #071529 100%);
  padding: 30px 20px;
  color: #d0e4ff;
}
.admin-inner {
  max-width: 1000px;
  margin: 0 auto;
  background: rgba(13, 28, 51, 0.85);
  border: 1px solid #27416b;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 0 30px rgba(79, 195, 247, 0.08);
}
.page-admin-notice h2 {
  margin: 0 0 16px 0;
  color: #4fc3f7;
  font-size: 22px;
}
.page-admin-notice h3 {
  color: #b3e5fc;
  margin: 0 0 14px 0;
}
.action-row {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}
.top-btn {
  padding: 8px 16px;
  background: rgba(30, 136, 229, 0.18);
  border: 1px solid #27416b;
  color: #d0e4ff;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}
.top-btn:hover {
  background: rgba(79, 195, 247, 0.28);
  border-color: #4fc3f7;
  color: #fff;
}
.save-btn {
  background: rgba(79, 195, 247, 0.22);
  border-color: #4fc3f7;
  color: #b3e5fc;
}
.delete-btn {
  background: rgba(229, 57, 53, 0.15);
  border-color: #e53935;
  color: #ff8a8a;
}
.delete-btn:hover {
  background: rgba(229, 57, 53, 0.28);
  color: #fff;
}
.edit-form {
  border: 1px solid #27416b;
  background: linear-gradient(135deg, rgba(30, 60, 110, 0.35), rgba(13, 28, 51, 0.6));
  padding: 18px;
  border-radius: 10px;
  margin-bottom: 24px;
}
.form-item {
  margin-bottom: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.form-item label {
  color: #9db8dd;
  font-size: 14px;
  padding-left: 6px;
  border-left: 3px solid #4fc3f7;
}

.form-item input[type="text"],
.form-item textarea {
  width: 100%;
  background: #0a1f3a !important;
  border: 1px solid #27416b;
  border-bottom: 1px solid #4fc3f7;
  color: #d0e4ff !important;
  border-radius: 6px;
  padding: 10px 12px;
  box-sizing: border-box;
  font-family: inherit;
  outline: none;
  transition: 0.2s;
}

.form-item input[type="text"]:focus,
.form-item textarea:focus {
  border-color: #4fc3f7;
  box-shadow: 0 0 0 2px rgba(79, 195, 247, 0.12);
  background:#0a1f3a !important;
}
.form-item textarea {
  min-height: 120px;
  resize: vertical;
}
.checkbox-item {
  flex-direction: row;
  align-items: center;
  gap: 10px;
}
.form-buttons {
  display: flex;
  gap: 10px;
}
.list-title {
  margin: 10px 0 14px 0;
}
.empty-tip {
  text-align: center;
  padding: 30px 0;
  color: #9db8dd;
}
.notice-row {
  border: 1px solid #27416b;
  background: linear-gradient(135deg, rgba(30, 60, 110, 0.35), rgba(13, 28, 51, 0.6));
  padding: 16px;
  margin: 12px 0;
  border-radius: 10px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  transition: transform 0.2s, box-shadow 0.2s;
}
.notice-row:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(79, 195, 247, 0.12);
  border-color: #4fc3f7;
}
.row-main {
  flex: 1;
  min-width: 0;
}
.row-main h4 {
  color: #4fc3f7;
  margin: 0 0 8px 0;
}
.row-content {
  color: #d0e4ff;
  margin: 0 0 8px 0;
  white-space: pre-wrap;
}
.row-meta {
  color: #9db8dd;
  font-size: 12px;
  margin: 0;
}
.tag-show {
  color: #4fc3f7;
}
.tag-hide {
  color: #ffb74d;
}
.row-actions {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  flex-shrink: 0;
}
</style>

<style>
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus,
textarea:-webkit-autofill,
textarea:-webkit-autofill:hover,
textarea:-webkit-autofill:focus {
  -webkit-box-shadow: 0 0 0 1000px #0a1f3a inset !important;
  -webkit-text-fill-color: #d0e4ff !important;
}

.del-confirm-popup {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 9999;
  width: 280px;
  background: rgba(13, 28, 51, 0.94);
  border: 1px solid #27416b;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 6px 22px rgba(0, 0, 0, 0.4);
}
.del-confirm-popup .confirm-title {
  color: #d0e4ff;
  font-size: 14px;
  margin-bottom: 14px;
}
.del-confirm-popup .confirm-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.del-confirm-popup .btn-cancel {
  padding:6px 14px;
  background:rgba(30, 136, 229, 0.18);
  border:1px solid #27416b;
  color:#d0e4ff;
  border-radius:4px;
  cursor:pointer;
}
.del-confirm-popup .btn-confirm {
  padding:6px 14px;
  background:rgba(229, 57, 53, 0.22);
  border:1px solid #e53935;
  color:#ff8a8a;
  border-radius:4px;
  cursor:pointer;
}
</style>