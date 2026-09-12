<template>
  <div class="app-wrap">
    <header class="top-header">
      <div class="top-cap"></div>
      <div class="center-bulge">
        <div class="bulge-inner"></div>
        <div class="bulge-glow"></div>
      </div>
      <div class="header-left">
        <span class="logo-icon"></span>
        <button class="top-btn" @click="$router.push('/notice')">📢 系统公告</button>
      </div>
      <div class="header-center">
        <div class="title-wrap">
          <span class="title-glow"></span>
          <h1>浦东新区公共医疗资源服务平台</h1>
          <span class="title-line"></span>
        </div>
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
    <div class="map-full-container">
      <section class="map-wrap">
        <MapContainer @map-ready="onMapReady" />
        <div class="route-panel" v-if="routePanelShow">
          <div class="route-title">
            路径规划
            <span class="close-btn" @click="closeRoutePanel">×</span>
          </div>
          <div class="route-form-item">
            <label>起点</label>
            <input id="inputStart" v-model="route.startName" class="route-input" placeholder="输入地点" />
          </div>
          <div class="route-form-item">
            <label>终点</label>
            <input id="inputEnd" v-model="route.endName" class="route-input" placeholder="输入地点" />
          </div>
          <div class="route-tip">{{ routeClickTip }}</div>
          <div class="route-btn-row">
            <button class="btn-primary route-btn" @click="doRouteSearch">生成路径</button>
            <button class="btn-gray route-btn" @click="clearRouteDraw">清除路线</button>
          </div>
        </div>
        <aside class="aside-right" v-show="statPanelVisible || sitePanelVisible || heatStatShow">
          <div v-if="statPanelVisible" class="stat-card">
            <div class="card-title">医疗机构统计</div>
            <div id="chartBox"></div>
          </div>
          <div v-if="statPanelVisible" class="stat-card">
            <div class="card-title">点位类型统计</div>
            <div id="chartType"></div>
          </div>
          <div v-if="heatStatShow" class="stat-card">
            <div class="card-title">🏘️居民区就医热力统计</div>
            <div class="win-row">居民区：{{heatStat.communityName}}</div>
            <div class="win-row">分析半径：{{heatStat.radiusM}} 米</div>
            <div class="win-row">医疗点位数量：{{heatStat.medicalCount}}</div>
            <div class="win-row">可达评估：{{heatStat.level}}</div>
            <div class="win-row" style="color:#ffe082">建议：{{heatStat.suggest}}</div>
          </div>
          <SiteSelectionPanel
            v-if="sitePanelVisible"
            :trigger-refresh="siteNeedRefresh"
            @locate-map="handleSiteLocate"
          />
        </aside>
        <div class="toast-wrap" v-if="toast.show">
          <div class="toast-box" :class="toast.type">{{toast.msg}}</div>
        </div>
      </section>
      <div class="bottom-tool-bar">
        <div class="tool-group">
          <select v-model="loadPointType" class="tool-select">
            <option value="">--资源类型--</option>
            <option v-for="t in medicalTypeList" :key="t.type" :value="t.type">{{ t.type }}</option>
            <option value="community">居民区</option>
          </select>
          <button class="tool-btn" @click="handleLoadPoint">加载点位</button>
          <button class="tool-btn" @click="clearAllMarker">清空图层</button>
        </div>
        <div class="divider"></div>
        <div class="tool-group">
          <button class="tool-btn" @click="openRoutePanel">🚗路径规划</button>
          <button class="tool-btn" @click="openHeatDialog">🔥热力分析</button>
          <button class="tool-btn" @click="openResourceQuery">📋时空资源查询</button>
          <button class="tool-btn" @click="openAppoint">🏥预约挂号</button>
          <button class="tool-btn" @click="toggleStatPanel">📊系统统计</button>
          <button class="tool-btn" @click="toggleSitePanel">📍选址分析</button>
          <button class="tool-btn" @click="aiDialogVisible=true">🤖AI就医咨询</button>
        </div>
      </div>
    </div>
    <div class="modal" v-if="showSiteModal">
      <div class="modal-content">
        <h4>🏥 选址评估</h4>
        <div class="form-item-modal">
          <label>分析半径(米，500‑5000)</label>
          <input v-model.number="analyzeRadiusM" type="number" min="500" max="5000" placeholder="请填写半径" />
        </div>
        <div class="form-item-modal">
          <label>评估名称</label>
          <input v-model="evalNameInput" placeholder="填写评估名称" />
        </div>
        <div v-if="siteTip" class="site-tip-text">{{siteTip}}</div>
        <div class="modal-buttons">
          <button class="btn-primary" @click="confirmSiteEval">确认保存</button>
          <button class="btn-gray" @click="closeSiteModal">关闭</button>
        </div>
      </div>
    </div>
    <AiChatDialog ref="aiChatRef" :visible="aiDialogVisible" @close="aiDialogVisible=false" />
    <!-- 传给热力 allRawMedical 全部医疗点，不受下拉筛选影响 -->
    <HeatMapDialog
      :visible="heatDialogVisible"
      :map-ins="map"
      :medical-point-list="allRawMedical"
      @close="heatDialogVisible=false"
      @update-stat-panel="onHeatStatUpdate"
      @closeAll="()=>{heatDialogVisible=false; heatStatShow=false; heatStat={};}"
    />
  </div>
</template>

<script setup>
import {ref,onUnmounted,nextTick,onMounted} from 'vue'
import {useRouter} from 'vue-router'
import MapContainer from '../components/MapContainer.vue'
import AiChatDialog from '../components/AiChatDialog.vue'
import SiteSelectionPanel from '../components/SiteSelectionPanel.vue'
import HeatMapDialog from '../components/HeatMapDialog.vue'
import request from '../api/request'
import * as turf from '@turf/turf'
import * as echarts from 'echarts'
import {getUserInfo,clearStorage} from '../utils/storage'
import {buildPointPopupHtml, bindPopupDomEvent} from '../utils/popupHelper'

const router = useRouter()
const aiDialogVisible = ref(false)
const aiChatRef = ref(null)
let map = null
let chartTotal = null
let chartType = null
let driving = null
let autoStart = null
let autoEnd = null
let geocoder = null
let placeSearch = null
let routePluginsReady = false
const userInfo = ref(getUserInfo())
const loadPointType = ref('')
const showSiteModal = ref(false)
const siteTip = ref('')
const evalNameInput = ref('')
const analyzeRadiusM = ref()
const tempSiteLng = ref(null)
const tempSiteLat = ref(null)
const sitePanelVisible = ref(false)
const siteNeedRefresh = ref(false)
const isSiteSelectMode = ref(false)
const allMedicalPoints = ref([])
let siteBufferPolygon = null
const statPanelVisible = ref(false)
const routePanelShow = ref(false)
const routeClickTip = ref("🔵选择地点，生成路径")
const route = ref({
  startName:'',
  endName:'',
  startLngLat:null,
  endLngLat:null
})
const mapClickStatus = ref(0)
const medicalTypeList = ref([])
let currentInfoWin = null
const toast = ref({
  show:false,
  msg:'',
  type:'success'
})

// =========热力弹窗相关==========
const heatDialogVisible = ref(false)
const rawMedicalData = ref([])
// allRawMedical：存储**全部医疗点位**（医院、药店、社区卫生中心，专门给热力）
const allRawMedical = ref([])
const rawCommunityData = ref([])
const heatStatShow = ref(false)
const heatStat = ref({})

function openHeatDialog(){
  if(allRawMedical.value.length === 0){
    showToast("请先加载医疗点位！","warning")
    return
  }
  heatDialogVisible.value = true
}
function onHeatStatUpdate(res){
  heatStat.value = res
  heatStatShow.value = true
}

function openResourceQuery(){}
function openAppoint(){}

function fillRouteByPoint(name,lng,lat){
  const lnglatObj = new window.AMap.LngLat(lng,lat)
  if(!route.value.startLngLat){
    route.value.startName = name
    route.value.startLngLat = lnglatObj
    routeClickTip.value = `✅起点：${name}｜请再点击点位选择终点`
  }else{
    route.value.endName = name
    route.value.endLngLat = lnglatObj
    routeClickTip.value = `✅终点：${name}｜点击生成驾车路径`
  }
}

function showToast(msg,type='success'){
  toast.value.msg = msg
  toast.value.type = type
  toast.value.show = true
  setTimeout(()=>{toast.value.show=false},2500)
}

onMounted(async ()=>{
  try{
    const resType = await request.get('/stat/countByType')
    medicalTypeList.value = resType.data
  }catch(e){
    console.error("读取医疗点位类型失败",e)
  }
})

const onMapReady = (m)=>{
  map = m
  map.on('click', globalMapClickHandler)
}

function globalMapClickHandler(e){
  if(isSiteSelectMode.value){
    tempSiteLng.value = e.lnglat.lng
    tempSiteLat.value = e.lnglat.lat
    showSiteModal.value = true
    isSiteSelectMode.value = false
    siteTip.value = "⚠️请填写半径与评估名称后点确认保存"
    return
  }
  if(mapClickStatus.value>0){
    handleMapPick(e)
  }
}

function runSiteDensityAnalyze(lng, lat, radiusM){
  function getDistance(lng1, lat1, lng2, lat2) {
    const R = 6371000;
    const rad = Math.PI / 180;
    const latRad1 = lat1 * rad;
    const latRad2 = lat2 * rad;
    const deltaLat = (lat2 - lat1) * rad;
    const deltaLng = (lng2 - lng1) * rad;
    const a = Math.sin(deltaLat / 2)**2 + Math.cos(latRad1)*Math.cos(latRad2)*Math.sin(deltaLng / 2)**2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }
  const insideList = []
  allMedicalPoints.value.forEach(ptObj=>{
    const pLng = ptObj.geometry.coordinates[0]
    const pLat = ptObj.geometry.coordinates[1]
    const dist = getDistance(lng, lat, pLng, pLat)
    if(dist <= radiusM){
      insideList.push(ptObj.properties)
    }
  })
  const count = insideList.length
  let level, suggestion
  if(count <=2){
    level = "资源稀缺"
    suggestion = "周边医疗机构数量较少，适合新建医疗点"
  }else if(count <=6){
    level = "资源适中"
    suggestion = "周边已有一定医疗资源，可以酌情规划建设"
  }else{
    level = "高度密集"
    suggestion = "周边医疗机构已经很多，不建议继续新增"
  }
  return {
    radius: radiusM,
    radiusKm: radiusM / 1000,
    aroundCount: count,
    densityLevel: level,
    suggestion: suggestion,
    insideList: insideList
  }
}

function toggleSitePanel(){
  if(allMedicalPoints.value.length === 0){
    showToast("请先加载医疗数据！","warning")
    return
  }
  sitePanelVisible.value = !sitePanelVisible.value
  statPanelVisible.value = false
  heatStatShow.value = false
  if(sitePanelVisible.value){
    isSiteSelectMode.value = true
    siteTip.value = "🟢请在地图上点击，选取候选选址点"
  }else{
    isSiteSelectMode.value = false
    clearSiteBufferDraw()
  }
}

function clearSiteBufferDraw(){
  if(siteBufferPolygon){
    siteBufferPolygon.setMap(null)
    siteBufferPolygon = null
  }
}

function handleSiteLocate({lng,lat,analyzeResult}){
  if(!map) return
  map.setCenter([lng,lat])
  map.setZoom(14)
  clearSiteBufferDraw()
  if(analyzeResult && analyzeResult.radiusKm){
    const pt = turf.point([lng, lat])
    const buf = turf.buffer(pt, analyzeResult.radiusKm, {units:'kilometers'})
    siteBufferPolygon = new window.AMap.Polygon({
      path:buf.geometry.coordinates[0],
      fillColor:'rgba(100,200,255,0.18)',
      strokeColor:'#4fc3f7',
      strokeWeight:2,
      map:map
    })
  }
}

async function confirmSiteEval(){
  if(!tempSiteLng.value || !tempSiteLat.value){
    showToast("请先在地图点击选点","warning")
    return
  }
  if(!evalNameInput.value.trim()){
    showToast("请填写评估名称","warning")
    return
  }
  if(!userInfo.value?.id){
    showToast("请登录后操作","warning")
    return
  }
  if(!analyzeRadiusM.value || analyzeRadiusM.value<500 || analyzeRadiusM.value>5000){
    showToast("分析半径范围500‑5000米","warning")
    return
  }
  const analyzeResult = runSiteDensityAnalyze(tempSiteLng.value, tempSiteLat.value, analyzeRadiusM.value)
  siteTip.value = `🔍分析半径：${analyzeResult.radius}米\n周边医疗点位：${analyzeResult.aroundCount}个\n【${analyzeResult.densityLevel}】${analyzeResult.suggestion}`
  try{
    const res = await request.post('/site/add',{
      userId: userInfo.value.id,
      evalName:evalNameInput.value,
      lng:tempSiteLng.value,
      lat:tempSiteLat.value,
      resultJson: JSON.stringify(analyzeResult)
    })
    showToast("选址评估保存成功！","success")
    siteNeedRefresh.value = true
    evalNameInput.value = ''
    analyzeRadiusM.value = ' '
    tempSiteLng.value = null
    tempSiteLat.value = null
    showSiteModal.value = false
    setTimeout(()=>{
      siteNeedRefresh.value = false
    },100)
  }catch(e){
    console.error(e)
    showToast(e?.msg||"保存选址失败","error")
  }
}

function closeSiteModal(){
  showSiteModal.value=false
  evalNameInput.value = ''
  analyzeRadiusM.value = 1500
  siteTip.value = ''
}

async function toggleStatPanel(){
  statPanelVisible.value = !statPanelVisible.value
  sitePanelVisible.value = false
  heatStatShow.value = false
  isSiteSelectMode.value = false
  clearSiteBufferDraw()
  if(statPanelVisible.value){
    await nextTick()
    refreshStat()
  }
}

async function refreshStat(){
  if(chartTotal){ chartTotal.dispose(); chartType.dispose() }
  chartTotal = echarts.init(document.getElementById('chartBox'),'dark')
  chartType = echarts.init(document.getElementById('chartType'),'dark')
  const resTotal = await request.get('/stat/countAll')
  const resType = await request.get('/stat/countByType')
  chartTotal.setOption({tooltip:{},series:[{type:'gauge',data:[{value:resTotal.data.total,name:'机构总数'}]}]})
  chartType.setOption({tooltip:{trigger:'axis'},xAxis:{data:resType.data.map(i=>i.type)},yAxis:{},series:[{type:'bar',data:resType.data.map(i=>i.cnt)}]})
}

function initRoutePlugins(){
  if(routePluginsReady) return Promise.resolve()
  return new Promise((resolve)=>{
    window.AMap.plugin(['AMap.Geocoder','AMap.PlaceSearch','AMap.Driving'],()=>{
      geocoder = new window.AMap.Geocoder({city:'上海市',radius:1000})
      placeSearch = new window.AMap.PlaceSearch({city:'上海市',citylimit:false,pageSize:1,extensions:'base'})
      routePluginsReady = true
      resolve()
    })
  })
}

function lnglatToName(lnglat){
  return new Promise((resolve)=>{
    geocoder.getAddress(lnglat,(status,result)=>{
      if(status==='complete' && result.regeocode){
        resolve(result.regeocode.formattedAddress || '')
      }else resolve('')
    })
  })
}

function nameToLngLat(name){
  return new Promise((resolve)=>{
    placeSearch.search(name,(status,result)=>{
      const pois = result?.poiList?.pois || []
      if(status==='complete' && pois.length){
        resolve({ name:pois[0].name, lnglat:pois[0].location })
      }else resolve(null)
    })
  })
}

function afterPickResolved(which,name,ok){
  if(which==='start'){
    mapClickStatus.value = ok ?2:1
    routeClickTip.value = ok ?`✅起点：${name}｜请再选择终点`:`❌未解析到「${name}」的坐标，请换关键词`
  }else{
    mapClickStatus.value = ok ?1:2
    routeClickTip.value = ok ?`✅终点：${name}｜点击「生成驾车路径」`:`❌未解析到「${name}」的坐标，请换关键词`
  }
}

async function handleMapPick(e){
  const lnglat = e.lnglat
  if(!geocoder) await initRoutePlugins()
  routeClickTip.value = '🔍正在解析该点地址…'
  const addr = await lnglatToName(lnglat)
  const label = addr || `${lnglat.getLng().toFixed(6)},${lnglat.getLat().toFixed(6)}`
  if(mapClickStatus.value ===1){
    route.value.startLngLat = lnglat
    route.value.startName = label
    afterPickResolved('start',label,true)
  }else if(mapClickStatus.value===2){
    route.value.endLngLat = lnglat
    route.value.endName = label
    afterPickResolved('end',label,true)
  }
}

async function openRoutePanel(){
  routePanelShow.value = true
  await nextTick()
  await initRoutePlugins()
  mapClickStatus.value =1
  isSiteSelectMode.value = false
  clearSiteBufferDraw()
  routeClickTip.value = "🔵选择地点，快速生成路径"
  route.value = {startName:'',endName:'',startLngLat:null,endLngLat:null}
  clearRouteDraw()
  autoStart = new window.AMap.AutoComplete({ input:'inputStart', city:'上海市', citylimit:false })
  autoStart.on('select', async (e)=>{
    const name = e.poi?.name || route.value.startName
    route.value.startName = name
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
}

function closeRoutePanel(){
  routePanelShow.value = false
  mapClickStatus.value = 0
  autoStart = null
  autoEnd = null
  document.querySelectorAll('.amap-sug-result').forEach(el=>el.remove())
  clearRouteDraw()
}

async function doRouteSearch(){
  if(!map) return showToast('地图尚未加载完成，请稍后再试','warning')
  await initRoutePlugins()
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
    return showToast('请设置起点、终点！','warning')
  }
  if(driving) driving.clear()
  driving = new window.AMap.Driving({ map:map, hideMarkers:false, autoFitView:true })
  const searchCallback = (status,result)=>{
    if(status !== 'complete'){
      showToast(`路径规划失败：${result?.info||status}，更换点位重试`,"error")
      return
    }
    const summary = result.routes?.[0]
    if(summary){
      const km = (summary.distance / 1000).toFixed(2)
      const minute = Math.round(summary.time / 60)
      routeClickTip.value =`🚗 ${route.value.startName} → ${route.value.endName}｜全程 ${km} 公里 · 驾车约 ${minute} 分钟`
    }else{
      routeClickTip.value = "✅驾车路线已生成"
    }
  }
  if(s && e2){
    driving.search(s,e2,searchCallback)
  }else{
    driving.search([
      { keyword: route.value.startName, city:'上海市' },
      { keyword: route.value.endName, city:'上海市' }
    ],searchCallback)
  }
}

function clearRouteDraw(){
  if(driving){
    driving.clear()
    driving = null
  }
  route.value = {startName:'',endName:'',startLngLat:null,endLngLat:null}
  mapClickStatus.value = 1
  routeClickTip.value = "🔵选择地点，快速生成路径"
}

const handleLogout = ()=>{
  clearStorage()
  userInfo.value=null
  router.push('/login')
}

async function handleLoadPoint(){
  if(!loadPointType.value) return showToast("请选择点位类型","warning")
  if(loadPointType.value === 'community'){
    await loadCommunityPoint()
  }else{
    const url = '/medical/point?type='+encodeURIComponent(loadPointType.value)
    const res = await request.get(url)
    // 第一次加载医疗点，拉取全部医疗点存入allRawMedical（热力分析专用）
    if(allRawMedical.value.length === 0){
      const resAll = await request.get('/medical/point')
      allRawMedical.value = [...resAll.data]
    }
    rawMedicalData.value = [...res.data]
    allMedicalPoints.value = res.data.map(p=>turf.point([p.lng,p.lat],{name:p.name,type:p.type}))
    res.data.forEach(item=>{
      const marker = new window.AMap.Marker({
        position:[item.lng,item.lat],
        title:item.name,
        content:`<div style="width:16px;height:16px;border-radius:50%;background:#d82626;display:flex;align-items:center;justify-content:center;color:#ffffff;font-weight:bold;font-size:14px;line-height:1;">+</div>`,
        offset: new window.AMap.Pixel(-9,-9),
        map:map
      })
      marker.on('click',()=>{
        if(routePanelShow.value){
          fillRouteByPoint(item.name, item.lng, item.lat)
          return
        }
        if(currentInfoWin) currentInfoWin.close()
        let htmlPopup = buildPointPopupHtml(item)
        const infoWin = new window.AMap.InfoWindow({
          content:htmlPopup,
          isCustom:true,
          offset:new window.AMap.Pixel(0,-48),
          closeWhenClickMap:true
        })
        currentInfoWin = infoWin
        infoWin.open(map,marker.getPosition())
        bindPopupDomEvent(infoWin, item, showToast)
      })
    })
  }
}

function clearAllMarker(){
  if(!map) return
  map.clearMap()
  if(driving) driving.clear()
  driving = null
  clearSiteBufferDraw()
  allMedicalPoints.value = []
  rawMedicalData.value = []
  allRawMedical.value = []
  rawCommunityData.value = []
  heatStatShow.value = false
}

async function loadCommunityPoint(){
  const res = await request.get('/gisExtra/communityByRadius?lng=121.54&lat=31.22&radius=20000')
  rawCommunityData.value = [...res.data]
  res.data.forEach(item=>{
    const marker = new window.AMap.Marker({
      position:[item.lng,item.lat],
      title:item.name,
      content:`<div style="width:14px;height:14px;display:flex;align-items:center;justify-content:center;font-size:12px;line-height:1;">🏠</div>`,
      offset: new window.AMap.Pixel(-7,-7),
      map:map
    })
    marker.on('click',()=>{
      if(routePanelShow.value){
        fillRouteByPoint(item.name, item.lng, item.lat)
        return
      }
      if(currentInfoWin) currentInfoWin.close()
      let htmlPopup = `
<div class="info-win-root">
  <span class="win-close">×</span>
  <h3 class="win-title">${item.name}</h3>
  <div class="win-row">类型：居民区</div>
  <div class="win-row">经度:${item.lng} 纬度:${item.lat}</div>
</div>`
      const infoWin = new window.AMap.InfoWindow({
        content:htmlPopup,
        isCustom:true,
        offset:new window.AMap.Pixel(0,-48),
        closeWhenClickMap:true
      })
      currentInfoWin = infoWin
      infoWin.open(map,marker.getPosition())
    })
  })
}

onUnmounted(()=>{
  clearSiteBufferDraw()
  if(map){
    map.off('click', globalMapClickHandler)
  }
  if(currentInfoWin){
    currentInfoWin.close()
    currentInfoWin = null
  }
  chartTotal?.dispose()
  chartType?.dispose()
  if(driving) driving.clear()
  driving = null
  geocoder = null
  placeSearch = null
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
.toast-wrap{
  position:fixed;
  z-index:99999;
  top:90px;
  left:50%;
  transform:translateX(-50%);
}
.toast-box{
  padding:10px 22px;
  border-radius:6px;
  font-size:14px;
}
.toast-box.success{background:#198754;color:#fff;}
.toast-box.error{background:#dc3545;color:#fff;}
.toast-box.warning{background:#ffc107;color:#111;}
.top-header{
  height:84px;
  position:relative;
  display:flex;
  justify-content:space-between;
  align-items:center;
  padding:0 32px;
  flex-shrink:0;
  z-index:100;
  background:linear-gradient(180deg,rgba(7,18,40,0.98) 0%,rgba(11,30,64,0.96) 46%,rgba(14,40,90,0.94)100%);
  border-bottom:1px solid rgba(79,195,247,0.45);
  box-shadow:0 2px 0 rgba(0,0,0,0.55),0 10px 24px rgba(0,0,0,0.55),inset 0 1px 0 rgba(120,200,255,0.08);
}
.top-cap{
  position:absolute;
  left:0;
  right:0;
  top:0;
  height:26px;
  z-index:2;
  background:linear-gradient(180deg,rgba(5,12,28,0.99),rgba(9,22,48,0.96));
  border-bottom:1px solid rgba(79,195,247,0.22);
  box-shadow:inset 0 1px 0 rgba(255,255,255,0.04),inset 0 -8px 14px rgba(0,0,0,0.45);
}
.center-bulge{
  position:absolute;
  left:50%;
  top:24px;
  transform:translateX(-50%);
  width:54%;
  height:60px;
  z-index:3;
  background:linear-gradient(180deg,rgba(12,34,72,0.97)0%,rgba(18,56,124,0.94)45%,rgba(10,28,60,0.96)100%);
  border:1px solid rgba(79,195,247,0.35);
  border-top:1px solid rgba(79,195,247,0.55);
  border-radius:18px 18px 26px 26px;
  box-shadow:0 14px 28px rgba(0,0,0,0.55),0 0 0 1px rgba(0,0,0,0.35),inset 0 1px 0 rgba(255,255,255,0.08),inset 0 -10px 18px rgba(0,0,0,0.35);
  clip-path:polygon(8% 0,92% 0,100% 0,100% 70%,94% 100%,6% 100%,0 70%,0 0);
}
.bulge-inner{
  position:absolute;
  left:6%;
  right:6%;
  top:10px;
  height:18px;
  border-radius:50%;
  background:linear-gradient(180deg,rgba(79,195,247,0.18)0%,rgba(79,195,247,0.04)100%);
  border:1px solid rgba(79,195,247,0.25);
  border-bottom:none;
  box-shadow:inset 0 1px 0 rgba(255,255,255,0.06),0 0 12px rgba(79,195,247,0.12);
}
.bulge-glow{
  position:absolute;
  left:18%;
  right:18%;
  bottom:10px;
  height:1px;
  background:linear-gradient(90deg,transparent 0%,rgba(79,195,247,0.45)20%,rgba(79,195,247,0.95)50%,rgba(79,195,247,0.45)80%,transparent 100%);
  box-shadow:0 0 10px rgba(79,195,247,0.55),0 0 24px rgba(79,195,247,0.25);
}
.header-left,.header-right{
  position:relative;
  z-index:4;
  display:flex;
  align-items:center;
  gap:12px;
  flex:1;
}
.header-right{
  justify-content:flex-end;
}
.header-center{
  position:relative;
  z-index:5;
  flex:2;
  display:flex;
  justify-content:center;
  align-items:flex-start;
  padding-top:4px;
}
.title-wrap{
  display:flex;
  align-items:center;
  gap:14px;
  padding:6px 18px;
}
.title-glow{
  width:9px;
  height:9px;
  border-radius:50%;
  background:#4fc3f7;
  position:relative;
  box-shadow:0 0 10px #4fc3f7,0 0 22px rgba(79,195,247,0.75);
}
.title-glow::after{
  content:"";
  position:absolute;
  inset:-6px;
  border-radius:50%;
  border:1px solid rgba(79,195,247,0.45);
  animation:titlePulse 2.4s infinite ease-in-out;
}
@keyframes titlePulse{
  0%{ transform:scale(0.85); opacity:0.8; }
  50%{ transform:scale(1.2); opacity:0.35; }
  100%{ transform:scale(0.85); opacity:0.8; }
}
.header-center h1{
  font-size:19px;
  font-weight:600;
  letter-spacing:1.4px;
  color:#eaf6ff;
  background:linear-gradient(180deg,#ffffff 0%,#9fd8ff 100%);
  -webkit-background-clip:text;
  background-clip:text;
  -webkit-text-fill-color:transparent;
  text-shadow:0 0 18px rgba(79,195,247,0.35);
  margin:0;
}
.title-line{
  width:44px;
  height:1px;
  background:linear-gradient(90deg,transparent,#4fc3f7,transparent);
}
.logo-icon{
  width:26px;
  height:26px;
  background:rgba(229,57,53,0.14);
  border:1px solid rgba(229,57,53,0.45);
  border-radius:50%;
  position:relative;
  box-shadow:0 0 12px rgba(229,57,53,0.35);
}
.logo-icon::before,.logo-icon::after{
  content:"";
  position:absolute;
  background:#ff5f5f;
  box-shadow:0 0 10px rgba(255,95,95,0.6);
  border-radius:2px;
}
.logo-icon::before{
  width:5px;height:14px;
  left:50%;top:50%;
  transform:translate(-50%,-50%);
}
.logo-icon::after{
  width:14px;height:5px;
  left:50%;top:50%;
  transform:translate(-50%,-50%);
}
.user-text{color:#b8d4ff;}
.tag-admin{
  padding:2px 8px;
  background:rgba(79,195,247,0.18);
  color:#4fc3f7;
  border:1px solid rgba(79,195,247,0.4);
  border-radius:3px;
  font-size:12px;
}
.top-btn{
  padding:6px 14px;
  background:rgba(255,255,255,0.06);
  border:1px solid rgba(120,200,255,0.18);
  color:#d0e4ff;
  border-radius:4px;
  cursor:pointer;
  font-size:13px;
  transition:all .2s ease;
}
.top-btn:hover{
  background:rgba(79,195,247,0.18);
  border-color:rgba(79,195,247,0.5);
  box-shadow:0 0 12px rgba(79,195,247,0.25);
}
.btn-logout:hover{
  background:rgba(255,87,87,0.22);
  border-color:rgba(255,120,120,0.45);
  box-shadow:0 0 12px rgba(255,87,87,0.25);
}
.map-full-container{
  flex:1;
  position:relative;
  min-height:0;
}
.map-wrap{
  width:100%;
  height:100%;
  position:relative;
}
.map-full-container::before{
  content:"";
  position:absolute;
  left:0;right:0;bottom:0;
  height:72px;
  z-index:5;
  pointer-events:none;
  background:
    radial-gradient(
      ellipse at 50% 100%,
      rgba(8,20,46,0.72) 0%,
      rgba(14,34,76,0.35) 45%,
      rgba(8,20,46,0.12) 75%,
      transparent 100%
    );
}
.map-full-container::after{
  content:"";
  position:absolute;
  left:0;right:0;bottom:62px;
  height:1px;
  z-index:6;
  pointer-events:none;
  background:linear-gradient(90deg,transparent 0%,rgba(79,195,247,0.25)20%,rgba(79,195,247,0.5)50%,rgba(79,195,247,0.25)80%,transparent 100%);
  box-shadow:0 0 10px rgba(79,195,247,0.45);
}
.bottom-tool-bar{
  position:absolute;
  bottom:18px;
  left:50%;
  transform:translateX(-50%);
  z-index:8;
  background:linear-gradient(180deg,rgba(14,34,76,0.78)0%,rgba(8,20,46,0.78)100%);
  border:1px solid rgba(79,195,247,0.35);
  border-radius:14px;
  padding:10px 18px;
  display:flex;
  align-items:center;
  gap:14px;
  box-shadow:0 4px 18px rgba(0,0,0.45),inset 0 0 0 1px rgba(79,195,247,0.08),0 0 22px rgba(79,195,247,0.12);
}
.tool-group{
  display:flex;
  gap:8px;
  align-items:center;
}
.divider{
  width:1px;
  height:28px;
  background:#27416b;
}
.tool-select{
  height:32px;
  background:#0a1728;
  border:1px solid rgba(79,195,247,0.25);
  color:#d0e4ff;
  border-radius:4px;
  padding:0 8px;
  font-size:13px;
}
.tool-btn{
  height:32px;
  padding:0 12px;
  background:rgba(79,195,247,0.08);
  border:1px solid rgba(79,195,247,0.25);
  color:#d0e4ff;
  border-radius:4px;
  cursor:pointer;
  font-size:13px;
  white-space:nowrap;
  transition:all .2s ease;
}
.tool-btn:hover{
  background:rgba(79,195,247,0.22);
  border-color:rgba(79,195,247,0.55);
  box-shadow:0 0 14px rgba(79,195,247,0.3);
}
.route-panel{
  position:absolute;
  left:16px;
  top:16px;
  width:300px;
  background:rgba(13,28,51,0.95);
  border:1px solid rgba(79,195,247,0.32);
  border-radius:6px;
  padding:12px;
  z-index:999;
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
.route-btn{ height:30px; }
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
.aside-right{
  position:absolute;
  top:16px;
  right:16px;
  width:300px;
  background:linear-gradient(180deg,rgba(17,38,76,0.94)0%,rgba(10,24,52,0.94)100%);
  border:1px solid rgba(79,195,247,0.32);
  border-radius:12px;
  padding:14px;
  overflow-y:auto;
  max-height:calc(100% - 110px);
  z-index:997;
  box-shadow:0 4px 18px rgba(0,0,0.45),0 0 22px rgba(79,195,247,0.12);
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
#chartBox{ width:100%; height:200px; }
#chartType{ width:100%; height:240px; }
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
  width:440px;
  background:#0d1c33;
  border:1px solid #27416b;
  border-radius:6px;
  padding:20px;
}
.modal-content h4{
  color:#4fc3f7;
  margin-bottom:14px;
}
.form-item-modal{
  margin-bottom:12px;
  display:flex;
  flex-direction:column;
  gap:5px;
}
.form-item-modal label{
  font-size:13px;
  color:#b8d4ff;
}
.form-item-modal input{
  width:100%;
  height:34px;
  background:#0a1728;
  border:1px solid #27416b;
  color:#d0e4ff;
  border-radius:4px;
  padding:0 10px;
}
.site-tip-text{
  white-space:pre-line;
  font-size:13px;
  color:#9db8dd;
  margin:14px 0;
  line-height:1.7;
  background:rgba(79,195,247,0.06);
  padding:10px;
  border-radius:4px;
}
.modal-buttons{
  display:flex;
  gap:10px;
}
</style>
<style>
.info-win-root{
  position:relative;
  min-width:345px;
  max-width:375px;
  background:#0d1c33;
  border-radius:12px;
  border:1px solid #2c5488;
  padding:18px;
  box-shadow:0 8px 26px rgba(0,0,0,0.70);
}
.win-close{
  position:absolute;
  top:10px;
  right:14px;
  font-size:22px;
  color:#89a3c7;
  cursor:pointer;
  z-index:10;
}
.win-title{
  color:#52b8f7;
  margin:0 0 12px 0;
  font-size:17px;
  padding-right:24px;
}
.win-row{
  margin:6px 0;
  font-size:14px;
  color:#b3e5fc;
}
.win-btn-group{
  display:flex;
  gap:10px;
  margin:14px 0;
}
.win-btn-group button{
  flex:1;
  padding:8px 0;
  background:rgba(30,136,229,0.18);
  border:1px solid #2e5080;
  color:#d0e4ff;
  border-radius:6px;
  cursor:pointer;
  font-size:14px;
}
.ta-comment{
  width:100%;
  background:#0a1728;
  border:1px solid #27416b;
  color:#d0e4ff;
  border-radius:6px;
  padding:9px;
  min-height:70px;
  resize:vertical;
  box-sizing:border-box;
  font-size:14px;
}
.win-submit-row{
  display:flex;
  gap:10px;
  margin-top:10px;
  align-items:center;
}
.sel-star{
  width:110px;
  height:34px;
  background:#0a1728;
  border:1px solid #27416b;
  color:#d0e4ff;
  border-radius:4px;
  padding-left:8px;
  font-size:14px;
}
.btn-submit{
  flex:1;
  height:34px;
  background:rgba(82,184,247,0.20);
  border:1px solid #52b8f7;
  color:#c7e6ff;
  border-radius:6px;
  cursor:pointer;
}
.comment-box{
  margin-top:12px;
  max-height:140px;
  overflow-y:auto;
}
</style>
