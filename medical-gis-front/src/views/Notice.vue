<template>
  <div class="page-notice">
    <div class="notice-inner">
      <h2>📢 系统公告</h2>

      <div class="action-row">
        <button class="top-btn" @click="$router.push('/home')">返回首页</button>
        <button
          v-if="isAdmin"
          class="top-btn admin-btn"
          @click="$router.push('/notice-admin')"
        >
          进入公告管理
        </button>
      </div>

      <div v-if="list.length === 0" class="empty-tip">
        暂无系统公告
      </div>

      <div
        v-for="item in list"
        :key="item.id"
        class="notice-item"
      >
        <h3>{{ item.title }}</h3>
        <div class="notice-content">{{ item.content }}</div>
        <p class="time">发布时间：{{ item.create_time }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import request from '../api/request'

const list = ref([])

const userRaw = localStorage.getItem('userInfo')
const userInfo = userRaw ? JSON.parse(userRaw) : null
const isAdmin = computed(() => userInfo && userInfo.role === 'admin')

onMounted(async () => {
  try {
    const res = await request.get('/notice?is_show=1')
    list.value = res.data || []
  } catch (err) {
    console.error('获取公告失败', err)
  }
})
</script>

<style scoped>
.page-notice {
  min-height: 100vh;
  background:
    radial-gradient(circle at 20% 10%, rgba(79, 195, 247, 0.15), transparent 40%),
    radial-gradient(circle at 80% 80%, rgba(30, 136, 229, 0.12), transparent 45%),
    linear-gradient(135deg, #051224 0%, #0a1f3a 50%, #071529 100%);
  padding: 30px 20px;
  color: #d0e4ff;
}

.notice-inner {
  max-width: 960px;
  margin: 0 auto;
  background: rgba(13, 28, 51, 0.85);
  border: 1px solid #27416b;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 0 30px rgba(79, 195, 247, 0.08);
}

.page-notice h2 {
  margin: 0 0 16px 0;
  color: #4fc3f7;
  font-size: 22px;
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

.admin-btn {
  background: rgba(79, 195, 247, 0.18);
  border-color: #4fc3f7;
  color: #b3e5fc;
}

.empty-tip {
  text-align: center;
  padding: 40px 0;
  color: #9db8dd;
}

.notice-item {
  border: 1px solid #27416b;
  background: linear-gradient(135deg, rgba(30, 60, 110, 0.35), rgba(13, 28, 51, 0.6));
  margin: 14px 0;
  padding: 18px;
  border-radius: 10px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.notice-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(79, 195, 247, 0.12);
  border-color: #4fc3f7;
}

.notice-item h3 {
  color: #4fc3f7;
  margin: 0 0 10px 0;
  font-size: 17px;
}

.notice-content {
  line-height: 1.8;
  margin-bottom: 10px;
  white-space: pre-wrap;
}

.time {
  color: #9db8dd;
  font-size: 12px;
  margin: 0;
}
</style>