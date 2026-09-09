<template>
  <div class="app-wrap">
    <!-- ==========顶部通栏========== -->
    <header class="top-header">
      <div class="header-left">
        <span class="logo-icon"></span>
        <h1>浦东新区公共医疗资源服务平台</h1>
      </div>
      <div class="header-right">
        <template v-if="!userInfo">
          <button class="top-btn" @click="$router.push('/login')">登录</button>
          <button class="top-btn" @click="$router.push('/register')">注册</button>
        </template>
        <template v-else>
          <span class="user-text">{{userInfo.username}}</span>
          <span class="tag-admin" v-if="userInfo.role==='admin'">管理员</span>
          <button class="top-btn" @click="$router.push('/personal')">个人中心</button>
          <button class="top-btn btn-logout" @click="handleLogout">退出</button>
        </template>
      </div>
    </header>
    <!-- ==========主体三栏布局 左｜中地图｜右统计========== -->
    <div class="main-container">
      <!-- 左侧功能区 -->
      <aside class="aside-left">
        <div class="panel-block">
          <div class="block-title">资源加载</div>
          <div class="form-item">
            <label>资源类型</label>
            <select v-model="loadPointType">
              <option value="">--请选择资源类型--</option>
              <option v-for="t in medicalTypeList" :key="t.type" :value="t.type">{{ t.type }}</option>
              <option value="community">居民区</option>
            </select>
          </div>
          <div class="btn-row">
            <button class="btn-primary" @click="handleLoadPoint">加载点位</button>
            <button class="btn-gray" @click="clearAllMarker">清空图层</button>
          </div>
        </div>
        <div class="panel-block">
          <div class="block-title">功能分析</div>
          <div class="menu-item" @click="routePanelShow=true">路径规划</div>
          <div class="menu-item" @click="create15MinBuffer">15分钟服务圈</div>
          <div class="menu-item" @click="toggleStatPanel">系统统计</div>
          <div class="menu-item" @click="aiDialogVisible=true">AI就医咨询</div>
        </div>
        <div class="panel-block tip-block">
          <div class="block-title">操作提示</div>
          <p class="tip-desc">进入系统后地图默认空白，请先在上方选择点位类型并点击加载点位。</p>
        </div>
      </aside>
      <!-- 中间：高德地图区域 -->
      <section class="map-wrap">
        <MapContainer @map-ready="onMapReady" />
        <RoutePlanner ref="routePlannerRef" v-model:visible="routePanelShow" :map="routeMap" />
      </section>
      <aside class="aside-right" v-show="statPanelVisible">
        <div class="stat-card">
          <div class="card-title">医疗机构统计</div>
          <div id="chartBox"></div>
        </div>
        <div class="stat-card">
          <div class="card-title">点位类型统计</div>
          <div id="chartType"></div>
        </div>
      </aside>
    </div>
    <div class="modal" v-if="showSiteModal">
      <div class="modal-content">
        <h4>选址分析</h4>
        <p>{{siteTip}}</p>
        <input v-model="evalNameInput" placeholder="填写评估名称" />
        <div class="modal-buttons">
          <button class="btn-primary" @click="confirmSiteEval">确认保存</button>
          <button class="btn-gray" @click="closeSiteModal">关闭</button>
        </div>
      </div>
    </div>

    <!-- AI聊天弹窗组件，抽离到外部文件 -->
    <AiChatDialog ref="aiChatRef" :visible="aiDialogVisible" @close="aiDialogVisible=false" />

  </div>
</template>

<script setup>
import {ref,onUnmounted,onMounted,nextTick} from 'vue'
import {useRouter} from 'vue-router'
import MapContainer from '../components/MapContainer.vue'
import RoutePlanner from '../components/RoutePlanner.vue'
//引入抽离的AI弹窗组件
import AiChatDialog from '../components/AiChatDialog.vue'
import request from '../api/request'
import * as turf from '@turf/turf'
import * as echarts from 'echarts'
import {getUserInfo,clearStorage} from '../utils/storage'
const router = useRouter()

// AI弹窗状态
const aiDialogVisible = ref(false)
const aiChatRef = ref(null)

let map = null
const routeMap = ref(null)
let chartTotal = null
let chartType = null
const userInfo = ref(getUserInfo())
const loadPointType = ref('')
const showSiteModal = ref(false)
const siteTip = ref('点击地图获取选址坐标')
const evalNameInput = ref('')
const statPanelVisible = ref(false)

//路径规划
const routePanelShow = ref(false)
const routePlannerRef = ref(null)
const medicalTypeList = ref([])
let tempSiteLng=null
let tempSiteLat=null
onMounted(async ()=>{
  try{
    const res = await request.get('/stat/countByType')
    medicalTypeList.value = res.data
  }catch(e){
    console.error("读取医疗点位类型失败",e)
  }
})
//全局挂载给infoWindow内部onclick
window.collectPoint = async function(pointId){
  if(!userInfo.value) return alert("请登录")
  try{
    const res = await request.post('/collect/addCollect',{user_id:userInfo.value.userId,point_id:pointId})
    alert(res.msg)
  }catch(err){
    alert(err?.msg||"收藏失败")
  }
}
window.loadPointComment = async function(pointId){
  const res = await request.get(`/comment/list/${pointId}`)
  const box = document.getElementById("commentListBox")
  if(!box) return
  let html = "<hr><b>用户留言：</b><br>"
  if(res.data.length===0){
    html += "<p>暂无留言</p>"
  }else{
    res.data.forEach(c=>{
      html += `<div style="margin:4px 0;border-bottom:1px solid #445;"><span>用户：${c.content} | ${c.star}星</span></div>`
    })
  }
  box.innerHTML = html
}
window.submitComment = async function(pointId){
  if(!userInfo.value) return alert("请登录")
  const content = document.getElementById("commentText").value
  const star = document.getElementById("starSel").value
  if(!content.trim()) return alert("留言不能为空")
  await request.post('/comment/add',{
    point_id:pointId,
    user_id:userInfo.value.userId,
    content,
    star:Number(star)
  })
  alert("留言提交成功，点击查看全部留言刷新")
}
//地图初始化
const onMapReady = (m)=>{
  map = m
  routeMap.value = m
}
const handleLogout = ()=>{
  clearStorage()
  userInfo.value=null
  router.push('/login')
}
async function toggleStatPanel(){
  statPanelVisible.value = !statPanelVisible.value
  if(statPanelVisible.value){
    await nextTick()
    refreshStat()
  }
}
async function refreshStat(){
  if(chartTotal){
    chartTotal.dispose()
    chartType.dispose()
  }
  chartTotal = echarts.init(document.getElementById('chartBox'),'dark')
  chartType = echarts.init(document.getElementById('chartType'),'dark')
  const resTotal = await request.get('/stat/countAll')
  const resType = await request.get('/stat/countByType')
  chartTotal.setOption({
    tooltip:{},
    series:[{type:'gauge',data:[{value:resTotal.data.total,name:'机构总数'}]}]
  })
  chartType.setOption({
    tooltip:{trigger:'axis'},
    xAxis:{data:resType.data.map(i=>i.type)},
    yAxis:{},
    series:[{type:'bar',data:resType.data.map(i=>i.cnt)}]
  })
}
async function handleLoadPoint(){
  if(!loadPointType.value) return alert("请选择点位类型")
  if(loadPointType.value === 'community'){
    await loadCommunityPoint()
  }else{
    await loadMedicalPoint(loadPointType.value)
  }
}
function clearAllMarker(){
  if(!map) return
  map.clearMap()
  routePlannerRef.value?.clearRoute()
}
async function loadMedicalPoint(type){
  let url = '/medical/point'
  if(type) url +=`?type=${encodeURIComponent(type)}`
  const res = await request.get(url)
  res.data.forEach(item=>{
    const marker = new window.AMap.Marker({
      position:[item.lng,item.lat],
      title:item.name,
      content:`
        <div style="width:16px;height:16px;border-radius:50%;background:#d82626;display:flex;align-items:center;justify-content:center;color:#ffffff;font-weight:bold;font-size:14px;line-height:1;">+</div>
      `,
      offset: new window.AMap.Pixel(-9,-9),
      map:map
    })
    const infoWinContent = `
      <div style="min-width:300px;background:#ffffff;color:#000000;">
        <h4>${item.name}</h4>
        <p>类型：${item.type}</p>
        <p>地址：${item.address || '无'}</p>
        <p>电话：${item.phone || '无'}</p>
        <p>等级：${item.level || '无'}</p>
        <button onclick="window.collectPoint(${item.id})">收藏点位</button>
        <button onclick="window.loadPointComment(${item.id})">查看全部留言</button>
        <div>
          <textarea id="commentText" placeholder="输入留言"></textarea>
          <br>
          <select id="starSel">
            <option value="1">★</option>
            <option value="2">★★</option>
            <option value="3">★★★</option>
            <option value="4">★★★★</option>
            <option value="5">★★★★★</option>
          </select>
          <button onclick="window.submitComment(${item.id})">提交留言评分</button>
        </div>
        <div id="commentListBox"></div>
      </div>`
    const infoWin = new window.AMap.InfoWindow({ content:infoWinContent })
    marker.on('click',()=>{
      infoWin.open(map,marker.getPosition())
      routePlannerRef.value?.selectPoint({name:item.name,lngLat:[item.lng,item.lat]})
    })
  })
}
async function loadCommunityPoint(){
  const res = await request.get('/gisExtra/communityByRadius?lng=121.54&lat=31.22&radius=20000')
  res.data.forEach(item=>{
    const marker = new window.AMap.Marker({
      position:[item.lng,item.lat],
      title:item.name,
      content:`
        <div style="width:14px;height:14px;display:flex;align-items:center;justify-content:center;font-size:12px;line-height:1;">🏠</div>
      `,
      offset: new window.AMap.Pixel(-7,-7),
      map:map
    })
    marker.on('click',()=>{
      routePlannerRef.value?.selectPoint({name:item.name,lngLat:[item.lng,item.lat]})
    })
  })
}
async function create15MinBuffer(){
  const res = await request.get('/medical/siteQuery')
  res.data.forEach(p=>{
    const pt = turf.point([p.lng,p.lat])
    const buf = turf.buffer(pt,1.5,{units:'kilometers'})
    new window.AMap.Polygon({
      path:buf.geometry.coordinates[0],
      fillColor:'rgba(64,169,255,0.15)',
      strokeColor:'#4fc3f7',
      map:map
    })
  })
}
function openSiteDialog(){
  map.once('click',e=>{
    tempSiteLng = e.lnglat.lng
    tempSiteLat = e.lnglat.lat
    new window.AMap.Marker({position:[tempSiteLng,tempSiteLat],map})
    showSiteModal.value=true
  })
}
function closeSiteModal(){showSiteModal.value=false}
async function confirmSiteEval(){alert('保存完成')}

onUnmounted(()=>{
  chartTotal?.dispose()
  chartType?.dispose()
})
</script>

<style scoped>
*{margin:0;padding:0;box-sizing:border-box;}
.app-wrap{
  width:100vw;
  height:100vh;
  display:flex;
  flex-direction:column;
  background:#081428;
  color:#fff;
  overflow:hidden;
}
/* 顶部栏 */
.top-header{
  height:60px;
  background:#0f203d;
  border-bottom:1px solid #27416b;
  display:flex;
  justify-content:space-between;
  align-items:center;
  padding:0 24px;
}
.header-left{
  display:flex;
  align-items:center;
  gap:10px;
}
/* 顶部logo，和登录注册页同款柔和红十字 */
.logo-icon{
  width: 24px;
  height: 24px;
  background: rgba(229, 57, 53, 0.12);
  border: 1px solid rgba(229, 57, 53, 0.35);
  border-radius: 50%;
  position: relative;
}
.logo-icon::before,
.logo-icon::after {
  content: "";
  position: absolute;
  background: #e53935;
  box-shadow: 0 0 8px rgba(229, 57, 53, 0.55);
  border-radius: 2px;
}
.logo-icon::before {
  width: 5px;
  height: 16px;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}
.logo-icon::after {
  width: 16px;
  height: 5px;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}
.header-left h1{
  font-size:20px;
  color:#e0edff;
}
.header-right{
  display:flex;
  gap:12px;
  align-items:center;
}
.user-text{color:#b8d4ff;}
.tag-admin{
  padding:2px 8px;background:rgba(79,195,247,0.2);color:#4fc3f7;border-radius:3px;font-size:12px;
}
.top-btn{
  padding:6px 14px;
  background:rgba(255,255,255,0.07);
  border:1px solid rgba(255,255,255,0.12);
  color:#d0e4ff;
  border-radius:4px;
  cursor:pointer;
}
.top-btn:hover{background:rgba(79,195,247,0.15);}
.btn-logout:hover{background:rgba(255,87,87,0.2);}
/* 主体三栏 */
.main-container{
  flex:1;
  display:flex;
  min-height:0;
}
/* 左侧面板 */
.aside-left{
  width:260px;
  background:#0d1c33;
  border-right:1px solid #27416b;
  padding:14px;
  overflow-y:auto;
}
.panel-block{
  background:rgba(255,255,255,0.03);
  border:1px solid #27416b;
  border-radius:6px;
  padding:12px;
  margin-bottom:14px;
}
.block-title{
  font-size:14px;
  color:#4fc3f7;
  border-left:3px solid #4fc3f7;
  padding-left:8px;
  margin-bottom:10px;
}
.form-item{
  display:flex;
  flex-direction:column;
  gap:6px;
  margin-bottom:10px;
}
.form-item label{
  font-size:12px;
  color:#9db8dd;
}
.form-item select{
  height:30px;
  background:#0a1728;
  border:1px solid #27416b;
  color:#d0e4ff;
  border-radius:4px;
  padding:0 6px;
}
.btn-row{
  display:flex;
  gap:8px;
}
.btn-primary,.btn-gray{
  flex:1;
  height:30px;
  border-radius:4px;
  border:none;
  cursor:pointer;
  font-size:13px;
}
.btn-primary{
  background:#1e88e5;
  color:#fff;
}
.btn-primary:hover{background:#2196f3;}
.btn-gray{
  background:#2a3d5c;
  color:#d0e4ff;
}
.btn-gray:hover{background:#35496b;}
.menu-item{
  padding:8px 10px;
  margin-bottom:6px;
  background:rgba(79,195,247,0.08);
  border:1px solid #27416b;
  border-radius:4px;
  font-size:13px;
  cursor:pointer;
}
.menu-item:hover{
  background:rgba(79,195,247,0.2);
}
.tip-block .tip-desc{
  font-size:12px;
  color:#8fa8c8;
  line-height:1.6;
}
/* 中间地图 */
.map-wrap{
  flex:1;
  position:relative;
  min-width:0;
}
/* 右侧统计 */
.aside-right{
  width:300px;
  background:#0d1c33;
  border-left:1px solid #27416b;
  padding:14px;
  overflow-y:auto;
}
.stat-card{
  background:rgba(255,255,255,0.03);
  border:1px solid #27416b;
  border-radius:6px;
  padding:12px;
  margin-bottom:14px;
}
.card-title{
  font-size:14px;
  color:#4fc3f7;
  border-left:3px solid #4fc3f7;
  padding-left:8px;
  margin-bottom:10px;
}
#chartBox{
  width:100%;
  height:200px;
}
#chartType{
  width:100%;
  height:240px;
}
/* 弹窗 */
.modal{
  position:fixed;
  inset:0;
  background:rgba(0,0,0,0.5);
  display:flex;
  align-items:center;
  justify-content:center;
  z-index:2000;
}
.modal-content{
  width:360px;
  background:#0d1c33;
  border:1px solid #27416b;
  border-radius:6px;
  padding:18px;
}
.modal-content h4{
  color:#4fc3f7;
  margin-bottom:10px;
}
.modal-content p{
  font-size:13px;
  color:#9db8dd;
  margin-bottom:10px;
}
.modal-content input{
  width:100%;
  height:30px;
  background:#0a1728;
  border:1px solid #27416b;
  color:#d0e4ff;
  border-radius:4px;
  padding:0 8px;
  margin-bottom:12px;
}
.modal-buttons{
  display:flex;
  gap:8px;
}
</style>