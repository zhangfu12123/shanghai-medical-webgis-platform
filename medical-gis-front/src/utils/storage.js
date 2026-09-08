export function getToken(){
  return localStorage.getItem('token')
}

export function setToken(val){
  return localStorage.setItem('token',val)
}

export function removeToken(){
  return localStorage.removeItem('token')
}

export function getUserInfo() {
  try {
    return JSON.parse(localStorage.getItem('userInfo') || 'null')
  } catch {
    return null
  }
}

export function setUserInfo(val) {
  localStorage.setItem('userInfo', JSON.stringify(val))
}

export function clearStorage() {
  localStorage.removeItem('token')
  localStorage.removeItem('userInfo')
}
