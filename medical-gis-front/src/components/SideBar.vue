<template>
  <div class="sidebar">
    <div class="title">医疗资源平台</div>
    <div class="user‑info">
      <span v‑if="userInfo">
        {{ userInfo.username }}【{{ userInfo.role === 'admin' ? '管理员' : '普通用户' }}】
      </span>
      <span v‑else>未登录</span>
      <button v‑if="userInfo" @click="handleLogout">退出登录</button>
    </div>
    <ul class="menu">
      <li v‑if="!userInfo" @click="$router.push('/login')">登录</li>
      <li v‑if="!userInfo" @click="$router.push('/register')">注册</li>
      <li @click="$router.push('/notice')">系统公告</li>
      <li v‑if="userInfo && userInfo.role === 'admin'" @click="$router.push('/notice‑admin')">公告管理【管理员】</li>
      <li v‑if="userInfo" @click="$router.push('/personal')">个人中心</li>
      <li @click="$emit('toggle‑filter')">点位筛选</li>
      <li @click="$emit('run‑buffer')">15分钟服务圈缓冲区</li>
      <li @click="$emit('run‑blind')">医疗盲区提取</li>
      <li @click="$emit('open‑site')">选址分析</li>
    </ul>
  </div>
</template>

<script setup>
import { getUserInfo, clearStorage } from '../utils/storage'
import { useRouter } from 'vue‑router'
import { ref } from 'vue'

const router = useRouter()
const userInfo = ref(getUserInfo())

const handleLogout = () => {
  clearStorage()
  userInfo.value = null
  router.push('/home')
}
</script>

<style scoped>
.sidebar {
  width: 220px;
  height: 100vh;
  background: #2c3e50;
  color: #fff;
  position: absolute;
  left: 0;
  top: 0;
  z‑index: 999;
  padding: 12px;
}
.title {
  font‑size: 18px;
  font‑weight: bold;
  margin‑bottom: 16px;
  text‑align: center;
}
.user‑info {
  margin‑bottom: 12px;
  font‑size: 13px;
  line‑height: 1.6;
}
.menu li {
  list‑style: none;
  padding: 10px 8px;
  margin: 4px 0;
  background: #34495e;
  cursor: pointer;
  border‑radius: 4px;
  font‑size: 14px;
}
.menu li:hover {
  background: #3498db;
}
</style>
