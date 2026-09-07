<template>
  <div class="page‑reg">
    <div class="reg‑box">
      <h2>用户注册</h2>
      <div class="item">
        <label>用户名</label>
        <input v‑model="form.username" />
      </div>
      <div class="item">
        <label>密码</label>
        <input v‑model="form.password" type="password" />
      </div>
      <div class="item">
        <label>用户名</label>
        <input v‑model="form.real_name" />
      </div>
      <div class="item">
        <label>验证码</label>
        <input v‑model="form.code" />
        <img :src="captchaSrc" @click="refreshCaptcha" class="captcha‑img" />
      </div>
      <div class="btns">
        <button @click="handleRegister">注册</button>
        <button @click="$router.push('/login')">去登录</button>
        <button @click="$router.push('/home')">返回首页</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue‑router'
import request from '../api/request'

const router = useRouter()
const form = ref({
  username: '',
  password: '',
  real_name: '',
  code: ''
})
const captchaSrc = ref('')

function refreshCaptcha() {
  captchaSrc.value = `/api/user/captcha?t=${Date.now()}`
}

onMounted(() => {
  refreshCaptcha()
})

async function handleRegister() {
  try {
    const res = await request.post('/user/register', form.value)
    if (res.code === 200) {
      alert('注册成功，请登录')
      router.push('/login')
    } else {
      alert(res.msg)
      refreshCaptcha()
    }
  } catch (err) {
    alert(err?.msg || '注册失败')
    refreshCaptcha()
  }
}
</script>

<style scoped>
.page‑reg {
  width: 100vw;
  height: 100vh;
  display: flex;
  align‑items: center;
  justify‑content: center;
}
.reg‑box {
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
