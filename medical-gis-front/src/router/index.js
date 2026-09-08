import { createRouter, createWebHistory } from 'vue-router'
import { getToken } from '../utils/storage'
import Home from '../views/Home.vue'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import Notice from '../views/Notice.vue'
import NoticeAdmin from '../views/NoticeAdmin.vue'
import Personal from '../views/Personal.vue'

const routes = [
  { path: '/', redirect: '/home' },
  {
    path: '/home',
    name: 'Home',
    component: Home,
    meta: { title: '医疗资源服务平台-首页', requireAuth: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { title: '登录' }
  },
  {
    path: '/register',
    name: 'Register',
    component: Register,
    meta: { title: '注册' }
  },
  {
    path: '/notice',
    name: 'Notice',
    component: Notice,
    meta: { title: '系统公告', requireAuth: true }
  },
  {
    path: '/notice-admin',
    name: 'NoticeAdmin',
    component: NoticeAdmin,
    meta: { title: '公告管理(管理员)', requireAdmin: true }
  },
  {
    path: '/personal',
    name: 'Personal',
    component: Personal,
    meta: { title: '个人中心', requireAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = getToken()
  let userInfo = null
  try {
    userInfo = JSON.parse(localStorage.getItem('userInfo') || 'null')
  } catch (err) {
    userInfo = null
  }

  // 需要登录校验
  if (to.meta.requireAuth && !token) {
    return next({ path: '/login', query: { redirect: to.fullPath } })
  }

  // 需要管理员权限校验
  if (to.meta.requireAdmin) {
    if (!token || userInfo?.role !== 'admin') {
      alert('需要管理员权限')
      return next('/home')
    }
  }

  next()
})

export default router
