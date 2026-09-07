const TOKEN_KEY = 'token'
const USER_KEY = 'userInfo'

export function setToken(val) {
  localStorage.setItem(TOKEN_KEY, val)
}
export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}
export function setUserInfo(obj) {
  localStorage.setItem(USER_KEY, JSON.stringify(obj))
}
export function getUserInfo() {
  const str = localStorage.getItem(USER_KEY)
  return str ? JSON.parse(str) : null
}
export function clearStorage() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}
