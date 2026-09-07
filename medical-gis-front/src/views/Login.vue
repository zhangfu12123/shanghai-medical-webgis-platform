<template>
  <div class="page‑login">
    <div class="login‑box">
      <h2>用户登录</h2>
      <div class="item">
        <label>用户名</label>
        <input v‑model="form.username" />
      </div>
      <div class="item">
        <label>密码</label>
        <input v‑model="form.password" type="password" />
      </div>
      <div class="item">
        <label>验证码</label>
        <input v‑model="form.code" />
        <img :src="captchaSrc" @click="refreshCaptcha" class="captcha‑img" />
      </div>
      <div class="item">
        <label><input type="checkbox" v‑model="form.remember" />7天免登录</label>
      </div>
      <div class="btns">
        <button @click="handleLogin">登录</button>
        <button @click="$router.push('/register')">去注册</button>
        <button @click="$router.push('/home')">返回首页</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue‑router'
import request from '../api/request'
import { setToken, setUserInfo } from '../utils/storage'

const router = useRouter()
const form = ref({
  username: '',
  password: '',
  code: '',
  remember: false
})
const captchaSrc = ref('')

function refreshCaptcha() {
  captchaSrc.value = `/api/user/captcha?t=${Date.now()}`
}

onMounted(() => {
  refreshCaptcha()
})

async function handleLogin() {
  try {
    const res = await request.post('/user/login', form.value)
    if (res.code === 200) {
      setToken(res.data.token)
      setUserInfo(res.data.userInfo)
      alert('登录成功')
      router.push('/home')
    } else {
      alert(res.msg)
      refreshCaptcha()
    }
  } catch (err) {
    alert(err?.msg || '登录失败')
    refreshCaptcha()
  }
}
</script>

<style scoped>
.page‑login {
  width: 100vw;
  height: 100vh;
  display: flex;
  align‑items: center;
  justify‑content: center;
}
.login‑box {
  width: 420px;
  padding: 24px;
  border: 1px solid #ccc;
  border‑radius: 8px;
}
.item {
  margin: 12px 0;
}
.item input {
  width: 100%;
  padding: 8px;
  margin‑top: 4px;
}
.captcha‑img {
  height: 36px;
  cursor: pointer;
  margin‑left: 8px;
}
.btns button {
  margin: 4px;
  padding: 6px 12px;
}
</style>
