<template>
  <div class="page‑notice">
    <h2>系统公告</h2>
    <button @click="$router.push('/home')">返回首页</button>
    <div v‑for="item in list" :key="item.id" class="notice‑item">
      <h3>{{ item.title }}</h3>
      <p>{{ item.content }}</p>
      <p class="time">发布时间：{{ item.create_time }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '../api/request'

const list = ref([])

onMounted(async () => {
  const res = await request.get('/notice?is_show=1')
  list.value = res.data
})
</script>

<style scoped>
.page‑notice {
  max‑width: 900px;
  margin: 30px auto;
  padding: 10px;
}
.notice‑item {
  border: 1px solid #aaa;
  margin: 8px 0;
  padding: 10px;
  border‑radius: 4px;
}
.time {
  color: #666;
  font‑size: 12px;
}
</style>
