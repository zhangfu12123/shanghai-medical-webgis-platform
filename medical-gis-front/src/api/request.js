import axios from 'axios'
import { getToken, clearStorage } from '../utils/storage'

const service = axios.create({
  baseURL: '/api',
  timeout: 10000
})

// 请求拦截器携带token
service.interceptors.request.use(config => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截，401登录失效
service.interceptors.response.use(
  res => res.data,
  err => {
    if (err.response?.data?.code === 401) {
      clearStorage()
      location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default service
