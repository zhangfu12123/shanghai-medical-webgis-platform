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
          <div class="menu-item" @click="openRoutePanel">路径规划</div>
          <div class="menu-item" @click="create15MinBuffer">15分钟服务圈</div>
          <div class="menu-item" @click="toggleStatPanel">系统统计</div>
        </div>
        <div class="panel-block tip-block">
          <div class="block-title">操作提示</div>
          <p class="tip-desc">进入系统后地图默认空白，请先在上方选择点位类型并点击加载点位。</p>
        </div>
      </aside>
      <!-- 中间：高德地图区域 -->
      <section class="map-wrap">
        <MapContainer @map-ready="onMapReady" />
        <!-- 路径规划悬浮面板：输入联想 + 地图点击拾取 -->
        <div class="route-panel" v-if="routePanelShow">
          <div class="route-title">
            步行路径规划
            <span class="close-btn" @click="closeRoutePanel">×</span>
          </div>
          <div class="route-form-item">
            <label>起点（输入搜索 / 地图点击拾取）</label>
            <input id="inputStart" v-model="route.startName" class="route-input" placeholder="输入地点，选择联想结果" />
          </div>
          <div class="route-form-item">
            <label>终点（输入搜索 / 地图点击拾取）</label>
            <input id="inputEnd" v-model="route.endName" class="route-input" placeholder="输入地点，选择联想结果" />
          </div>
          <div class="route-tip">{{ routeClickTip }}</div>
          <div class="route-btn-row">
            <button class="btn-primary route-btn" @click="doRouteSearch">生成路径</button>
            <button class="btn-gray route-btn" @click="clearRouteDraw">清除路线</button>
          </div>
        </div>
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
  </div>
</template>
<script setup>
import {ref,onUnmounted,nextTick,onMounted} from 'vue'
import {useRouter} from 'vue-router'
import MapContainer from '../components/MapContainer.vue'
import request from '../api/request'
import * as turf from '@turf/turf'
import * as echarts from 'echarts'
import {getUserInfo,clearStorage} from '../utils/storage'
const router = useRouter()
let map = null
let chartTotal = null
let chartType = null
let walking = null
let autoStart = null
let autoEnd = null
let isMapPickBind = false
// 新增：地理编码 / POI 搜索实例（只初始化一次）
let geocoder = null
let placeSearch = null
let routePluginsReady = false
const userInfo = ref(getUserInfo())
const loadPointType = ref('')
const showSiteModal = ref(false)
const siteTip = ref('点击地图获取选址坐标')
const evalNameInput = ref('')
const statPanelVisible = ref(false)
//路径规划
const routePanelShow = ref(false)
const routeClickTip = ref("🔵输入地点搜索，或点击地图拾取【起点】")
const route = ref({
  startName:'',
  endName:'',
  startLngLat:null,
  endLngLat:null
})
//0关闭拾取，1拾取起点，2拾取终点
const mapClickStatus = ref(0)
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
}
/* ============ 路径规划核心工具：插件初始化 / 地名↔坐标 ============ */
function initRoutePlugins(){
  if(routePluginsReady) return Promise.resolve()
  return new Promise((resolve)=>{
    window.AMap.plugin(['AMap.Geocoder','AMap.PlaceSearch','AMap.Walking'],()=>{
      geocoder = new window.AMap.Geocoder({
        city:'上海市',
        radius:1000
      })
      // 注意：不要传 map，否则每次解析都会在地图上撒点
      placeSearch = new window.AMap.PlaceSearch({
        city:'上海市',
        citylimit:false,   // 浦东业务优先，搜不到时全国兜底
        pageSize:1,
        extensions:'base'
      })
      routePluginsReady = true
      resolve()
    })
  })
}
// 坐标 -> 真实地名（逆地理编码）
function lnglatToName(lnglat){
  return new Promise((resolve)=>{
    geocoder.getAddress(lnglat,(status,result)=>{
      if(status==='complete' && result.regeocode){
        resolve(result.regeocode.formattedAddress || '')
      }else{
        console.warn('逆地理编码失败',status,result)
        resolve('')
      }
    })
  })
}
// 真实地名 -> 坐标（POI 搜索，用于联想结果无坐标 / 纯手输场景）
function nameToLngLat(name){
  return new Promise((resolve)=>{
    placeSearch.search(name,(status,result)=>{
      const pois = result?.poiList?.pois || []
      if(status==='complete' && pois.length){
        resolve({ name:pois[0].name, lnglat:pois[0].location })
      }else{
        console.warn('POI搜索无结果',status,result)
        resolve(null)
      }
    })
  })
}
// 统一处理“选中/解析”成功后的状态推进
function afterPickResolved(which,name,ok){
  if(which==='start'){
    if(ok){
      mapClickStatus.value = 2
      routeClickTip.value = `✅起点：${name}｜请再选择终点（输入或点地图）`
    }else{
      routeClickTip.value = `❌未解析到「${name}」的坐标，请换关键词或点击地图拾取`
    }
  }else{
    if(ok){
      mapClickStatus.value = 1
      routeClickTip.value = `✅终点：${name}｜点击「生成路径」，或继续点地图重选起点`
    }else{
      routeClickTip.value = `❌未解析到「${name}」的坐标，请换关键词或点击地图拾取`
    }
  }
}
/* ============ 地图点击拾取：坐标 -> 真实地名回填 ============ */
async function handleMapPick(e){
  if(!mapClickStatus.value) return
  const lnglat = e.lnglat
  if(!geocoder) await initRoutePlugins()
  routeClickTip.value = '🔍正在解析该点地址…'
  const addr = await lnglatToName(lnglat)
  const label = addr || `${lnglat.getLng().toFixed(6)},${lnglat.getLat().toFixed(6)}`
  if(mapClickStatus.value === 1){
    route.value.startLngLat = lnglat
    route.value.startName = label   // v-model 自动回填到输入框
    afterPickResolved('start',label,true)
  }else if(mapClickStatus.value === 2){
    route.value.endLngLat = lnglat
    route.value.endName = label
    afterPickResolved('end',label,true)
  }
}
/* ============ 打开 / 关闭路径面板 ============ */
async function openRoutePanel(){
  routePanelShow.value = true
  await nextTick()
  await initRoutePlugins()
  //重置
  mapClickStatus.value = 1
  routeClickTip.value = "🔵输入地点搜索，或点击地图拾取【起点】"
  route.value = {startName:'',endName:'',startLngLat:null,endLngLat:null}
  clearRouteDraw()
  // 联想实例：每次打开重新绑定新 input（v-if 会重建 DOM）
  autoStart = new window.AMap.AutoComplete({ input:'inputStart', city:'上海市', citylimit:false })
  autoStart.on('select', async (e)=>{
    const name = e.poi?.name || route.value.startName
    route.value.startName = name
    // 联想结果自带坐标直接用；没有则用 PlaceSearch 补齐（e.poi.location 常为空）
    if(e.poi && e.poi.location && typeof e.poi.location.getLng === 'function'){
      route.value.startLngLat = e.poi.location
      afterPickResolved('start',name,true)
    }else{
      routeClickTip.value = '🔍正在解析起点坐标…'
      const r = await nameToLngLat(name)
      if(r) route.value.startLngLat = r.lnglat
      afterPickResolved('start',name,!!r)
    }
  })
  autoEnd = new window.AMap.AutoComplete({ input:'inputEnd', city:'上海市', citylimit:false })
  autoEnd.on('select', async (e)=>{
    const name = e.poi?.name || route.value.endName
    route.value.endName = name
    if(e.poi && e.poi.location && typeof e.poi.location.getLng === 'function'){
      route.value.endLngLat = e.poi.location
      afterPickResolved('end',name,true)
    }else{
      routeClickTip.value = '🔍正在解析终点坐标…'
      const r = await nameToLngLat(name)
      if(r) route.value.endLngLat = r.lnglat
      afterPickResolved('end',name,!!r)
    }
  })
  //绑定地图点击拾取
  if(map && !isMapPickBind){
    map.on('click', handleMapPick)
    isMapPickBind = true
  }
}
function closeRoutePanel(){
  routePanelShow.value = false
  mapClickStatus.value = 0
  autoStart = null
  autoEnd = null
  // 清掉高德联想残留在 body 上的下拉面板
  document.querySelectorAll('.amap-sug-result').forEach(el=>el.remove())
  if(map && isMapPickBind){
    map.off('click', handleMapPick)
    isMapPickBind = false
  }
  clearRouteDraw()
}
/* ============ 生成步行路径 ============ */
async function doRouteSearch(){
  if(!map) return alert('地图尚未加载完成，请稍后再试')
  await initRoutePlugins()
  // 手输地名但没点联想 -> 现查坐标
  if(!route.value.startLngLat && route.value.startName){
    routeClickTip.value = '🔍正在解析起点坐标…'
    const r = await nameToLngLat(route.value.startName)
    if(r) route.value.startLngLat = r.lnglat
  }
  if(!route.value.endLngLat && route.value.endName){
    routeClickTip.value = '🔍正在解析终点坐标…'
    const r = await nameToLngLat(route.value.endName)
    if(r) route.value.endLngLat = r.lnglat
  }
  const s = route.value.startLngLat
  const e2 = route.value.endLngLat
  if(!route.value.startName || !route.value.endName){
    return alert('请设置起点、终点：输入搜索地点，或者点击地图拾取坐标！')
  }
  // 关键：先销毁旧实例，否则多次规划会叠加多条路线
  if(walking){ walking.clear(); walking = null }
  walking = new window.AMap.Walking({
    map:map,
    hideMarkers:false,
    autoFitView:true
  })
  const done = (status,result)=>{
    if(status === 'complete'){
      const r = result.routes?.[0]
      if(r){
        routeClickTip.value =
          `🚶 ${route.value.startName} → ${route.value.endName}｜` +
          `全程 ${(r.distance/1000).toFixed(2)} 公里 · 步行约 ${Math.round(r.time/60)} 分钟`
      }else{
        routeClickTip.value = '✅路径已生成'
      }
    }else{
      alert('路径规划失败：' + (result?.info || status) + '，请更换点位重试')
    }
  }
  if(s && e2){
    // 坐标模式（最准）
    walking.search(s, e2, done)
  }else{
    // 真实地名模式：直接把中文地名交给高德
    walking.search([
      { keyword: route.value.startName, city:'上海市' },
      { keyword: route.value.endName, city:'上海市' }
    ], done)
  }
}
/* ============ 清除路线 ============ */
function clearRouteDraw(){
  if(walking){
    walking.clear()
    walking = null
  }
  route.value = {
    startName:'',
    endName:'',
    startLngLat:null,
    endLngLat:null
  }
  mapClickStatus.value = 1
  routeClickTip.value = "🔵输入地点搜索，或点击地图拾取【起点】"
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
  if(walking){
    walking.clear()
    walking = null
  }
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
    })
  })
}
async function loadCommunityPoint(){
  const res = await request.get('/gisExtra/communityByRadius?lng=121.54&lat=31.22&radius=20000')
  res.data.forEach(item=>{
    new window.AMap.Marker({
      position:[item.lng,item.lat],
      title:item.name,
      content:`
        <div style="width:14px;height:14px;display:flex;align-items:center;justify-content:center;font-size:12px;line-height:1;">🏠</div>
      `,
      offset: new window.AMap.Pixel(-7,-7),
      map:map
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
  if (walking) walking.clear()
  walking = null
  geocoder = null
  placeSearch = null
  if(map && isMapPickBind){
    map.off('click', handleMapPick)
    isMapPickBind = false
  }
  document.querySelectorAll('.amap-sug-result').forEach(el=>el.remove())
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
/* 路径规划悬浮面板 */
.route-panel{
  position:absolute;
  left:16px;
  top:16px;
  width:300px;
  background:rgba(13,28,51,0.95);
  border:1px solid #27416b;
  border-radius:6px;
  padding:12px;
  z-index:999;   /* 防止被地图覆盖 */
  box-shadow:0 4px 16px rgba(0,0,0,0.4);
}
.route-title{
  font-size:14px;
  color:#4fc3f7;
  display:flex;
  justify-content:space-between;
  align-items:center;
  margin-bottom:10px;
}
.close-btn{
  cursor:pointer;
  font-size:18px;
  color:#9db8dd;
}
.close-btn:hover{color:#fff;}
.route-form-item{
  margin-bottom:8px;
}
.route-form-item label{
  display:block;
  font-size:12px;
  color:#9db8dd;
  margin-bottom:4px;
}
.route-input{
  width:100%;
  height:30px;
  background:#0a1728;
  border:1px solid #27416b;
  color:#d0e4ff;
  border-radius:4px;
  padding:0 8px;
}
.route-tip{
  font-size:12px;
  color:#ffd54f;
  line-height:1.5;
  margin:8px 0;
  min-height:32px;
}
.route-btn-row{
  display:flex;
  gap:8px;
}
.route-btn{
  height:30px;
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
