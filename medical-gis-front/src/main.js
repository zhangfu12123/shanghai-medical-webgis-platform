import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import axios from 'axios'

// 配置后端基础地址，你的后端跑在3000端口
axios.defaults.baseURL = 'http://localhost:3000/api'

const app = createApp(App)
app.config.globalProperties.$axios = axios
app.use(router)
app.mount('#app')
