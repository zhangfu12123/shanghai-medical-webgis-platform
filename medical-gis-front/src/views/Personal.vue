<template>
  <div class="page‑personal">
    <h2>个人中心</h2>
    <button @click="$router.push('/home')">返回首页</button>
    <hr />
    <h3>我的收藏</h3>
    <div v‑for="c in collectList" :key="c.id" class="item">
      <p>名称：{{ c.name }}｜类型：{{ c.type }}</p>
      <p>地址：{{ c.address }}</p>
      <button @click="cancelCollect(c.point_id)">取消收藏</button>
    </div>
    <hr />
    <h3>选址评估历史</h3>
    <div v‑for="h in siteHis" :key="h.id">
      <p>{{ h.eval_name }}｜{{ h.create_time }}</p>
    </div>
    <hr />
    <h3>查询历史</h3>
    <div v‑for="s in searchHis" :key="s.id">
      <p>{{ s.search_text }}｜{{ s.create_time }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '../api/request'
import { getUserInfo } from '../utils/storage'

const collectList = ref([])
const siteHis = ref([])
const searchHis = ref([])
let userId = 0

onMounted(async () => {
  const user = getUserInfo()
  userId = user.userId
  const resCol = await request.get(`/collect/myCollect/${userId}`)
  collectList.value = resCol.data

  const resSite = await request.get(`/collect/siteHistory/${userId}`)
  siteHis.value = resSite.data

  const resSearch = await request.get(`/collect/searchHistory/${userId}`)
  searchHis.value = resSearch.data
})

async function cancelCollect(pid) {
  await request.delete('/collect/cancelCollect', { data: { user_id: userId, point_id: pid } })
  alert('已取消收藏')
  window.location.reload()
}
</script>

<style scoped>
.page‑personal {
  max‑width: 950px;
  margin: 20px auto;
  padding: 12px;
}
.item {
  border: 1px solid #ccc;
  padding: 8px;
  margin: 6px 0;
}
</style>
