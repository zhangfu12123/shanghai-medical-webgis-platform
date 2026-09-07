import { createRouter, createWebHistory } from 'vue‑router'
import { getToken } from '../utils/storage'

const routes = [
  { path: '/', redirect: '/home' },
  {
    path: '/home',
    name: 'Home',
    component: () => import('../views/Home.vue'),
    meta: { title: '医疗资源服务平台‑首页' }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/Register.vue'),
    meta: { title: '注册' }
  },
  {
    path: '/notice',
    name: 'Notice',
    component: () => import('../views/Notice.vue'),
    meta: { title: '系统公告' }
  },
  {
    path: '/notice‑admin',
    name: 'NoticeAdmin',
    component: () => import('../views/NoticeAdmin.vue'),
    meta: { title: '公告管理(管理员)', requireAdmin: true }
  },
  {
    path: '/personal',
    name: 'Personal',
    component: () => import('../views/Personal.vue'),
    meta: { title: '个人中心', requireAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = getToken()
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || 'null')
  if (to.meta.requireAuth && !token) {
    return next('/login')
  }
  if (to.meta.requireAdmin) {
    if (!token || userInfo?.role !== 'admin') {
      alert('需要管理员权限')
      return next('/home')
    }
  }
  next()
})

export default router
