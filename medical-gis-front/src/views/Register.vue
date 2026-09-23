<template>
  <div class="page-reg">
    <div class="bg-gradient"></div>
    <div class="reg-card">
      <div class="card-header">
        <div class="logo-dot"></div>
        <h2>用户注册</h2>
        <p>浦东新区公共医疗资源服务平台</p>
      </div>
      <div class="form-item">
        <label>用户名</label>
        <input
          v-model="form.username"
          class="glass-input"
          placeholder="请输入用户名"
        />
      </div>
      <div class="form-item">
        <label>密码</label>
        <input
          v-model="form.password"
          class="glass-input"
          type="password"
          placeholder="请输入密码"
        />
      </div>
      <div class="form-item">
        <label>真实姓名</label>
        <input
          v-model="form.real_name"
          class="glass-input"
          placeholder="真实姓名（选填）"
        />
      </div>
      <div class="form-item captcha-row">
        <input
          v-model="form.code"
          class="glass-input"
          placeholder="请输入验证码"
        />
        <img
          :src="captchaSrc"
          @click="refreshCaptcha"
          class="captcha-img"
          title="点击刷新验证码"
        />
      </div>
      <div class="btn-group">
        <button class="btn-main" @click="handleRegister">注册</button>
      </div>
      <div class="link-row">
        <span @click="$router.push('/login')" class="link-text">
          返回登录
        </span>
      </div>
    </div>

    <!-- Toast轻提示 -->
    <div v-if="toast.show" class="toast-wrap">
      <div class="toast-box" :class="toast.type">{{toast.msg}}</div>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import request from '../api/request'
const router = useRouter()

const toast = ref({
  show: false,
  msg: '',
  type: ''
})
function showToast(msg, type='info'){
  toast.value.msg = msg
  toast.value.type = type
  toast.value.show = true
  setTimeout(()=>{
    toast.value.show = false
  },2200)
}

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
      showToast('注册成功，请登录','success')
      router.push('/login')
    } else {
      showToast(res.msg,'error')
      form.value.code = ''
      refreshCaptcha()
    }
  } catch (err) {
    showToast(err?.msg || '注册失败','error')
    form.value.code = ''
    refreshCaptcha()
  }
}
</script>
<style scoped>
.page-reg {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}
.bg-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #081428 0%, #0f203d 50%, #132b4e 100%);
  z-index: 0;
}
.reg-card {
  width: 420px;
  z-index: 2;
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(79, 195, 247, 0.22);
  border-radius: 20px;
  padding: 36px 32px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
}
.card-header {
  text-align: center;
  margin-bottom: 28px;
}
.logo-dot {
  width: 24px;
  height: 24px;
  margin: 0 auto 12px;
  background: rgba(229, 57, 53, 0.12);
  border: 1px solid rgba(229, 57, 53, 0.35);
  border-radius: 50%;
  position: relative;
}
.logo-dot::before,
.logo-dot::after {
  content: "";
  position: absolute;
  background: #e53935;
  box-shadow: 0 0 8px rgba(229, 57, 53, 0.55);
  border-radius: 2px;
}
.logo-dot::before {
  width: 5px;
  height: 16px;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}
.logo-dot::after {
  width: 16px;
  height: 5px;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}
.card-header h2 {
  color: #e8f4ff;
  margin: 0 0 6px;
  font-size: 22px;
  font-weight: 600;
}
.card-header p {
  color: #87a8cc;
  font-size: 13px;
  margin: 0;
}
.form-item {
  margin-bottom: 18px;
}
.form-item label {
  display: block;
  font-size: 13px;
  color: #a2c4e8;
  margin-bottom: 8px;
}
.glass-input {
  width: 100%;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(79, 195, 247, 0.24);
  border-radius: 10px;
  color: #ffffff;
  padding: 11px 14px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.glass-input:focus {
  border-color: #4fc3f7;
  box-shadow: 0 0 0 3px rgba(79, 195, 247, 0.18);
}
.glass-input::placeholder {
  color: #6f8db0;
}
.captcha-row {
  display: flex;
  gap: 12px;
  align-items: center;
}
.captcha-img {
  height: 42px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid rgba(79, 195, 247, 0.24);
  user-select: none;
}
.btn-group {
  margin-top: 6px;
  margin-bottom: 24px;
}
.btn-main {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #2185e9, #4fc3f7);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: filter 0.2s, transform 0.1s;
}
.btn-main:hover {
  filter: brightness(1.1);
}
.btn-main:active {
  transform: scale(0.99);
}
.link-row {
  display: flex;
  justify-content: center;
}
.link-text {
  color: #4fc3f7;
  font-size: 13px;
  cursor: pointer;
}
.link-text:hover {
  text-decoration: underline;
}

/* Toast轻提示 */
.toast-wrap{
  position:fixed;
  left:50%;
  top:50%;
  transform:translate(-50%,-50%);
  z-index:9999;
}
.toast-box{
  padding:12px 24px;
  border-radius:8px;
  color:#fff;
  background:rgba(0,0,0,0.72);
}
.toast-box.success{
  background:rgba(16,149,71,0.75);
}
.toast-box.error{
  background:rgba(212,48,48,0.75);
}
</style>
