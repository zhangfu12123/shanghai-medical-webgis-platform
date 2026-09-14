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
          <div class="title-en">PUDONG NEW AREA PUBLIC MEDICAL RESOURCE SERVICE PLATFORM</div>
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
        <aside class="aside-right" v-show="resiliencePanelVisible || sitePanelVisible || heatStatShow">
          <MedicalResilience v-if="resiliencePanelVisible" :visible="resiliencePanelVisible" />
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
        <div class="hud-left-rail">
          <div class="side-head">
            <div>
              <span class="side-kicker">RESOURCE OVERVIEW</span>
              <strong>医疗资源实时态势</strong>
            </div>
            <span class="side-live"><i></i>LIVE</span>
          </div>

          <div class="live-total-card real-poi-card">
            <div>
              <span>行政区医疗 POI</span>
              <small>上海市各区县实时医疗数据</small>
            </div>
            <strong>{{livePoi.totalHits}}</strong>
          </div>

          <div class="district-live-bar">
            <div>
              <span>当前监测区域</span>
              <b>{{livePoi.district}}</b>
            </div>
          </div>

          <div class="side-section live-resource-list">
            <div class="side-section-title"><i></i>现实医疗资源检索</div>
            <div class="live-row real-row">
              <span><em class="legend-dot hospital"></em>医院</span>
              <b>{{livePoi.hospital}}</b>
              <i><span :style="{width: livePoi.maxCount ? Math.min(100, livePoi.hospital / livePoi.maxCount * 100) + '%' : '0%'}"></span></i>
            </div>
            <div class="live-row real-row">
              <span><em class="legend-dot health"></em>社区卫生</span>
              <b>{{livePoi.health}}</b>
              <i><span :style="{width: livePoi.maxCount ? Math.min(100, livePoi.health / livePoi.maxCount * 100) + '%' : '0%'}"></span></i>
            </div>
            <div class="live-row real-row">
              <span><em class="legend-dot pharmacy"></em>药店</span>
              <b>{{livePoi.pharmacy}}</b>
              <i><span :style="{width: livePoi.maxCount ? Math.min(100, livePoi.pharmacy / livePoi.maxCount * 100) + '%' : '0%'}"></span></i>
            </div>
          </div>

          <div class="side-section poi-monitor-section">
            <div class="side-section-title"><i></i>实时数据监测</div>
            <div class="poi-monitor-grid">
              <div>
                <span>数据源</span>
                <b>{{livePoi.online ? '3 / 3' : '0 / 3'}}</b>
                <small>医疗 POI 服务</small>
              </div>
              <div>
                <span>响应耗时</span>
                <b>{{livePoi.latency}}<em>ms</em></b>
                <small>本次同步</small>
              </div>
            </div>
          </div>

          <div class="backend-mini-status">
            <span>平台数据库</span>
            <b>{{liveData.total}}</b>
            <i></i>
            <small>{{liveData.online ? '已同步' : '离线'}}</small>
          </div>

        </div>

        <div class="hud-right-rail">
          <div class="side-head">
            <div>
              <span class="side-kicker">REAL-TIME ENVIRONMENT</span>
              <strong>城市运行监测</strong>
            </div>
            <span class="side-index">02</span>
          </div>

          <div class="weather-live-card">
            <div class="weather-icon">☁</div>
            <div>
              <span>上海 · 浦东</span>
              <strong>{{liveWeather.temperature}}<small>℃</small></strong>
              <b>{{liveWeather.weather}}</b>
            </div>
          </div>

          <div class="weather-grid">
            <div><span>湿度</span><b>{{liveWeather.humidity}}%</b></div>
            <div><span>风向</span><b>{{liveWeather.windDirection}}</b></div>
            <div><span>风力</span><b>{{liveWeather.windPower}} 级</b></div>
            <div><span>发布时间</span><b>{{liveWeather.reportTime}}</b></div>
          </div>

          <div class="side-section traffic-live">
            <div class="side-section-title"><i></i>实时路况</div>
            <div class="traffic-state">
              <span class="traffic-light"></span>
              <div>
                <b>{{trafficStatus}}</b>
                <small>{{trafficMessage}}</small>
              </div>
              <strong>{{trafficLayerReady ? '实时' : '连接中'}}</strong>
            </div>
            <div class="traffic-line"><i></i></div>
            <div class="traffic-foot">
              <span>路况图层自动刷新</span>
              <b>180s</b>
            </div>
          </div>

          <div class="side-section realtime-clock-panel">
            <div class="side-section-title"><i></i>系统时间</div>
            <div class="realtime-clock-plain">
              <div class="clock-time-row">
                <span class="clock-time">{{liveClock.time}}</span>
                <span class="clock-date">{{liveClock.date}}</span>
              </div>
              <div class="clock-meta">
                <span>{{liveClock.week}}</span>
                <b><i></i>实时</b>
              </div>
            </div>
          </div>

        </div>
        <div class="toast-wrap" v-if="toast.show">
          <div class="toast-box" :class="toast.type">{{toast.msg}}</div>
        </div>
      </section>
      <div class="bottom-status-left" aria-hidden="true">
        <span class="status-pulse"></span>
        <span>系统运行中</span>
        <i></i>
        <span>GIS 在线</span>
      </div>

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
          <button class="tool-btn" @click="toggleResiliencePanel">💪医疗资源韧性评估</button>
          <button class="tool-btn" @click="toggleSitePanel">📍选址分析</button>
          <button class="tool-btn" @click="aiDialogVisible=true">🤖AI就医咨询</button>
        </div>
      </div>

      <div class="bottom-status-right" aria-hidden="true">
        <span>医疗资源 GIS</span>
        <b>01</b>
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
import MedicalResilience from '../components/MedicalResilience.vue'
import request from '../api/request'
import * as turf from '@turf/turf'
import * as echarts from 'echarts'
import {getUserInfo,clearStorage} from '../utils/storage'
import {buildPointPopupHtml, bindPopupDomEvent} from '../utils/popupHelper'
const router = useRouter()
const aiDialogVisible = ref(false)
const aiChatRef = ref(null)
let map = null
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
const resiliencePanelVisible = ref(false)
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

const heatDialogVisible = ref(false)
const rawMedicalData = ref([])
const allRawMedical = ref([])
const rawCommunityData = ref([])
const heatStatShow = ref(false)
const heatStat = ref({})

/* 实时驾驶舱数据：来源于现有后端统计接口 + 高德实时天气/路况服务 */
const liveData = ref({
  total: 0,
  hospital: 0,
  health: 0,
  other: 0,
  updatedAt: '--:--:--',
  online: false
})
const liveWeather = ref({
  temperature: '--',
  weather: '--',
  humidity: '--',
  windDirection: '--',
  windPower: '--',
  reportTime: '--'
})
const liveClock = ref({
  date: '--/--/--',
  time: '--:--:--',
  week: '星期--'
})
const livePoi = ref({
  hospital: 0,
  health: 0,
  pharmacy: 0,
  totalHits: 0,
  maxCount: 0,
  samples: [],
  district: '浦东新区',
  districtCode: '310115',
  updatedAt: '--:--:--',
  online: false,
  latency: 0
})

// 上海 16 个行政区，按 5 秒一档自动轮巡；每个区首次进入时实时查询，之后使用本轮缓存，避免高频重复请求
const shanghaiDistricts = [
  {name:'浦东新区', code:'310115'},
  {name:'黄浦区', code:'310101'},
  {name:'徐汇区', code:'310104'},
  {name:'长宁区', code:'310105'},
  {name:'静安区', code:'310106'},
  {name:'普陀区', code:'310107'},
  {name:'虹口区', code:'310109'},
  {name:'杨浦区', code:'310110'},
  {name:'闵行区', code:'310112'},
  {name:'宝山区', code:'310113'},
  {name:'嘉定区', code:'310114'},
  {name:'金山区', code:'310116'},
  {name:'松江区', code:'310117'},
  {name:'青浦区', code:'310118'},
  {name:'奉贤区', code:'310120'},
  {name:'崇明区', code:'310151'}
]
const districtPoiCache = new Map()
let districtIndex = 0
let livePoiSearchTimer = null
const trafficStatus = ref('路况同步中')
const trafficMessage = ref('实时交通图层正在连接')
const trafficLayerReady = ref(false)
const mapCenterText = ref('--')
const mapZoom = ref('--')
let liveDashboardTimer = null
let clockTimer = null
let trafficLayer = null
let weatherInstance = null

function formatNow(){
  return new Date().toLocaleTimeString('zh-CN',{hour12:false})
}

function refreshRealtimeClock(){
  const now = new Date()
  const pad = n => String(n).padStart(2,'0')
  const weekNames = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六']
  liveClock.value = {
    date: `${now.getFullYear()}/${pad(now.getMonth()+1)}/${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
    week: weekNames[now.getDay()]
  }
}

function resourcePercent(value){
  const total = Number(livePoi.value.totalHits || 0)
  if(total <= 0) return 0
  return Math.max(3, Math.min(100, Math.round(Number(value || 0) / total * 100)))
}

function classifyMedicalType(type){
  const t = String(type || '')
  if(t.includes('医院')) return 'hospital'
  if(t.includes('社区') || t.includes('卫生')) return 'health'
  return 'other'
}

async function refreshLiveDashboard(){
  try{
    const [resTotal,resType] = await Promise.all([
      request.get('/stat/countAll'),
      request.get('/stat/countByType')
    ])
    const total = Number(resTotal?.data?.total || 0)
    const typeList = Array.isArray(resType?.data) ? resType.data : []
    const counters = {hospital:0,health:0,other:0}
    typeList.forEach(item=>{
      const key = classifyMedicalType(item?.type)
      counters[key] += Number(item?.cnt || 0)
    })
    liveData.value = {
      total,
      ...counters,
      updatedAt: formatNow(),
      online: true
    }
  }catch(e){
    console.error('实时驾驶舱统计数据刷新失败',e)
    liveData.value = {
      ...liveData.value,
      updatedAt: formatNow(),
      online: false
    }
  }
}

function searchDistrictPoi(keyword, district){
  return new Promise((resolve)=>{
    if(!window.AMap) return resolve({count:0,pois:[]})
    const search = new window.AMap.PlaceSearch({
      city:district.code,
      citylimit:true,
      pageSize:20,
      pageIndex:1,
      extensions:'all'
    })
    search.search(keyword,(status,result)=>{
      if(status === 'complete' && result?.poiList){
        resolve({
          count:Number(result.poiList.count || 0),
          pois:Array.isArray(result.poiList.pois) ? result.poiList.pois : []
        })
      }else{
        resolve({count:0,pois:[]})
      }
    })
  })
}

async function refreshRealWorldMedicalPoi(district = shanghaiDistricts[districtIndex]){
  if(!window.AMap || !district) return
  const cached = districtPoiCache.get(district.code)
  if(cached){
    livePoi.value = {...cached, district:district.name, districtCode:district.code}
    return
  }

  const startedAt = performance.now()
  try{
    await new Promise(resolve=>window.AMap.plugin(['AMap.PlaceSearch'],resolve))
    const [hospital,health,pharmacy] = await Promise.all([
      searchDistrictPoi('医院',district),
      searchDistrictPoi('社区卫生服务中心',district),
      searchDistrictPoi('药店',district)
    ])
    const counts = [hospital.count,health.count,pharmacy.count]
    const result = {
      hospital:hospital.count,
      health:health.count,
      pharmacy:pharmacy.count,
      totalHits:hospital.count + health.count + pharmacy.count,
      maxCount:Math.max(...counts,1),
      samples:[],
      updatedAt:formatNow(),
      online:true,
      latency:Math.max(1,Math.round(performance.now() - startedAt)),
      district:district.name,
      districtCode:district.code,
    }
    districtPoiCache.set(district.code,result)
    livePoi.value = result
  }catch(e){
    console.error(`${district.name} 高德实时医疗POI同步失败`,e)
    livePoi.value = {
      ...livePoi.value,
      district:district.name,
      districtCode:district.code,
      updatedAt:formatNow(),
      online:false,
      latency:Math.max(1,Math.round(performance.now() - startedAt)),
    }
  }
}

async function rotateDistrictPoi(){
  districtIndex = (districtIndex + 1) % shanghaiDistricts.length
  const district = shanghaiDistricts[districtIndex]
  livePoi.value = {...livePoi.value, district:district.name, districtCode:district.code}
  await refreshRealWorldMedicalPoi(district)
}

function initRealtimeWeather(){
  if(!window.AMap) return
  window.AMap.plugin('AMap.Weather',()=>{
    weatherInstance = new window.AMap.Weather()
    weatherInstance.getLive('浦东新区',(err,data)=>{
      if(err || !data) return
      liveWeather.value = {
        temperature: data.temperature ?? '--',
        weather: data.weather || '--',
        humidity: data.humidity ?? '--',
        windDirection: data.windDirection || '--',
        windPower: data.windPower ?? '--',
        reportTime: data.reportTime ? String(data.reportTime).slice(-8) : '--'
      }
    })
  })
}

function initRealtimeTraffic(){
  if(!map || !window.AMap?.TileLayer?.Traffic) return
  try{
    trafficLayer = new window.AMap.TileLayer.Traffic({
      autoRefresh:true,
      interval:180,
      zIndex:8,
      opacity:.62
    })
    map.add(trafficLayer)
    trafficLayerReady.value = true
    trafficStatus.value = '实时路况在线'
    trafficMessage.value = '高德交通图层已接入'
  }catch(e){
    console.error('实时路况图层初始化失败',e)
    trafficStatus.value = '路况服务不可用'
    trafficMessage.value = '请检查高德地图 Key / 权限'
  }
}

function refreshMapLiveState(){
  if(!map) return
  try{
    const center = map.getCenter()
    mapCenterText.value = `${center.getLng().toFixed(3)}, ${center.getLat().toFixed(3)}`
    mapZoom.value = Number(map.getZoom()).toFixed(1)
  }catch(e){}
}

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

  await refreshLiveDashboard()
  initRealtimeWeather()
  districtIndex = 0
  await refreshRealWorldMedicalPoi(shanghaiDistricts[districtIndex])

  refreshRealtimeClock()
  clockTimer = setInterval(()=>{
    refreshRealtimeClock()
    liveData.value.updatedAt = formatNow()
    refreshMapLiveState()
  },1000)

  liveDashboardTimer = setInterval(()=>{
    refreshLiveDashboard()
    initRealtimeWeather()
  },30000)

  // 5 秒切换一个行政区；首次进入该区时向高德发起真实 POI 查询，已查询区域从缓存读取
  livePoiSearchTimer = setInterval(()=>{
    rotateDistrictPoi()
  },5000)

})

const onMapReady = (m)=>{
  map = m

  // 高德地图深色科技风底图，与系统 HUD 深蓝主题统一
  try{
    map.setMapStyle('amap://styles/blue')
  }catch(e){
    console.warn('高德深色地图样式设置失败，将继续使用默认地图样式', e)
  }

  map.on('click', globalMapClickHandler)
  map.on('moveend', refreshMapLiveState)
  map.on('zoomend', refreshMapLiveState)
  refreshMapLiveState()
  initRealtimeTraffic()
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
  resiliencePanelVisible.value = false
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

function toggleResiliencePanel(){
  resiliencePanelVisible.value = !resiliencePanelVisible.value
  sitePanelVisible.value = false
  heatStatShow.value = false
  isSiteSelectMode.value = false
  clearSiteBufferDraw()
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

// 获取医疗点marker样式
function getMedicalMarkerStyle(type){
  const t = String(type || '').toLowerCase()
  if(t.includes('医院')){
    return { color:'#e53935', glow:'rgba(229, 57, 53, 0.55)', icon:'医' }
  }
  if(t.includes('社区') || t.includes('卫生')){
    return { color:'#1e88e5', glow:'rgba(30, 136, 229, 0.55)', icon:'卫' }
  }
  return { color:'#fdd835', glow:'rgba(253, 216, 53, 0.55)', icon:'药' }
}

async function handleLoadPoint(){
  if(!loadPointType.value) return showToast("请选择点位类型","warning")
  if(loadPointType.value === 'community'){
    await loadCommunityPoint()
  }else{
    const url = '/medical/point?type='+encodeURIComponent(loadPointType.value)
    const res = await request.get(url)
    if(allRawMedical.value.length === 0){
      const resAll = await request.get('/medical/point')
      allRawMedical.value = [...resAll.data]
    }
    rawMedicalData.value = [...res.data]
    allMedicalPoints.value = res.data.map(p=>turf.point([p.lng,p.lat],{name:p.name,type:p.type}))
    res.data.forEach(item=>{
      const markerStyle = getMedicalMarkerStyle(item.type)
      const marker = new window.AMap.Marker({
        position:[item.lng,item.lat],
        title:item.name,
        content:`
<div style="
  width:14px;
  height:18px;
  position:relative;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4)) drop-shadow(0 1px 1px rgba(0,0,0,0.25));
">
  <div style="
    position:absolute;
    left:0;
    right:0;
    top:0;
    height:14px;
    background: ${markerStyle.color};
    border-radius:8px 8px 4px 4px;
    border: 1px solid rgba(255,255,255,0.45);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.55),
      inset 0 -2px 4px rgba(0,0,0,0.18),
      0 1px 4px ${markerStyle.glow};
  "></div>
  <div style="
    position:absolute;
    left:2px;
    top:3px;
    width:10px;
    height:10px;
    border-radius:50%;
    background:rgba(255,255,255,0.95);
    display:flex;
    align-items:center;
    justify-content:center;
    color:${markerStyle.color};
    font-weight:800;
    font-size:9px;
    line-height:1;
    box-shadow: inset 0 1px 2px rgba(0,0,0,0.25);
  ">${markerStyle.icon}</div>
  <div style="
    position:absolute;
    left:50%;
    bottom:-2px;
    transform:translateX(-50%);
    width:6px;
    height:6px;
    background:${markerStyle.color};
    border:1px solid rgba(255,255,255,0.4);
    border-radius:0 0 50% 50%;
    box-shadow:0 1px 3px ${markerStyle.glow};
  "></div>
</div>`,
offset: new window.AMap.Pixel(-7, -18),
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
      content:`
<div style="
  width:14px;
  height:18px;
  position:relative;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4)) drop-shadow(0 1px 1px rgba(0,0,0,0.25));
">
  <div style="
    position:absolute;
    left:0;
    right:0;
    top:0;
    height:14px;
    background: linear-gradient(180deg, #66bb6a 0%, #2e7d32 100%);
    border-radius:8px 8px 4px 4px;
    border: 1px solid rgba(255,255,255,0.45);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.55),
      inset 0 -2px 4px rgba(0,0,0,0.18),
      0 1px 4px rgba(46, 125, 50, 0.45);
  "></div>
  <div style="
    position:absolute;
    left:2px;
    top:3px;
    width:10px;
    height:10px;
    border-radius:50%;
    background:rgba(255,255,255,0.95);
    display:flex;
    align-items:center;
    justify-content:center;
    color:#2e7d32;
    font-weight:800;
    font-size:9px;
    line-height:1;
    box-shadow: inset 0 1px 2px rgba(0,0,0,0.25);
  ">居</div>
  <div style="
    position:absolute;
    left:50%;
    bottom:-2px;
    transform:translateX(-50%);
    width:6px;
    height:6px;
    background:#2e7d32;
    border:1px solid rgba(255,255,255,0.4);
    border-radius:0 0 50% 50%;
    box-shadow:0 1px 3px rgba(46, 125, 50, 0.45);
  "></div>
</div>`,
offset: new window.AMap.Pixel(-7, -18),
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
  if(liveDashboardTimer) clearInterval(liveDashboardTimer)
  if(livePoiSearchTimer) clearInterval(livePoiSearchTimer)
  if(clockTimer) clearInterval(clockTimer)
  liveDashboardTimer = null
  clockTimer = null
  if(map){
    map.off('click', globalMapClickHandler)
    map.off('moveend', refreshMapLiveState)
    map.off('zoomend', refreshMapLiveState)
    if(trafficLayer){
      map.remove(trafficLayer)
      trafficLayer = null
    }
  }
  if(currentInfoWin){
    currentInfoWin.close()
    currentInfoWin = null
  }
  if(driving) driving.clear()
  driving = null
  geocoder = null
  placeSearch = null
})
</script>
<style src="./Home_style.css"></style>
