<template>
  <div class="page-admin-notice">
    <h2>公告管理（管理员）</h2>
    <button @click="$router.push('/home')">返回首页</button>
    <hr />
    <div class="edit-form">
      <h3>{{ editForm.id > 0 ? '编辑公告' : '新增公告' }}</h3>
      <p>标题：<input v-model="editForm.title" style="width:400px" /></p>
      <p>内容：<textarea v-model="editForm.content" style="width:400px;height:120px"></textarea></p>
      <p>是否显示：<input type="checkbox" v-model="editForm.is_show" /></p>
      <button @click="submitNotice">保存</button>
      <button @click="resetEdit">清空</button>
    </div>
    <hr />
    <h3>公告列表</h3>
    <div v-for="n in noticeList" :key="n.id" class="row">
      <h4>{{ n.title }}</h4>
      <p>{{ n.content }}</p>
      <p>显示状态：{{ n.is_show ? '显示' : '隐藏' }}｜{{ n.create_time }}</p>
      <button @click="fillEdit(n)">编辑</button>
      <button @click="delNotice(n.id)">删除</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '../api/request'
const noticeList = ref([])
const editForm = ref({ id: 0, title: '', content: '', is_show: true })

async function loadNotice() {
  const res = await request.get('/notice')
  noticeList.value = res.data
}

function resetEdit() {
  editForm.value = { id: 0, title: '', content: '', is_show: true }
}

function fillEdit(item) {
  editForm.value = { ...item }
}

async function submitNotice() {
  if (!editForm.value.title || !editForm.value.content) return alert('标题内容不能为空')
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
  alert('操作成功')
  resetEdit()
  await loadNotice()
}

async function delNotice(id) {
  if (!confirm('确定删除？')) return
  await request.delete(`/notice/del/${id}`)
  alert('已删除')
  await loadNotice()
}

onMounted(() => {
  loadNotice()
})
</script>

<style scoped>
.page-admin-notice {
  max-width: 1000px;
  margin: 20px auto;
  padding: 12px;
}
.row {
  border: 1px solid #ccc;
  padding: 8px;
  margin: 6px 0;
}
</style>
