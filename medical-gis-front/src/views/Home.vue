<template>
  <div class="home‑wrap">
    <SideBar
      @toggle‑filter="showFilter = true"
      @run‑buffer="create15MinBuffer"
      @run‑blind="extractBlindArea"
      @open‑site="openSiteDialog"
    />
    <MapContainer @map‑ready="onMapReady" />
    <!--右侧统计看板-->
    <div class="right‑panel">
      <h3>统计看板</h3>
      <div id="chartBox" style="width:100%;height:320px;"></div>
      <hr />
      <div>
        <h4>点位类型统计</h4>
        <div id="chartType" style="width:100%;height:260px;"></div>
      </div>
    </div>

    <!--点位筛选弹窗-->
    <div class="modal" v‑if="showFilter">
      <div class="modal‑content">
        <h4>医疗点位筛选</h4>
        <select v‑model="filterType">
          <option value="">全部类型</option>
          <option value="医院">医院</option>
          <option value="社区中心">社区中心</option>
          <option value="急救站">急救站</option>
          <option value="药店">药店</option>
        </select>
        <button @click="queryPoint">查询</button>
        <button @click="showFilter = false">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import SideBar from '../components/SideBar.vue'
import MapContainer from '../components/MapContainer.vue'
import request from '../api/request'
import * as turf from '@turf/turf'
import * as echarts from 'echarts'
import {
  clearPointLayer, setPointLayer,
  clearBufferLayer, setBufferLayer,
  clearBlindLayer, setBlindLayer,
  clearSiteMarker, setSiteMarker
} from '../utils/mapHelper'
import { getUserInfo } from '../utils/storage'

let map = null
let chartTotal = null
let chartType = null
let startLngLat = null
let driving = null

const showFilter = ref(false)
const filterType = ref('')
const userInfo = ref(getUserInfo())

const onMapReady = (m) => {
  map = m
  initDashboard()
  loadMedicalPoint()
  loadStatData()
}

//初始化ECharts
function initDashboard() {
  chartTotal = echarts.init(document.getElementById('chartBox'))
  chartType = echarts.init(document.getElementById('chartType'))
}

//加载统计数据
async function loadStatData() {
  const resTotal = await request.get('/stat/countAll')
  const resType = await request.get('/stat/countByType')
  chartTotal.setOption({
    title: { text: "医疗机构总数量" },
    tooltip: {},
    series: [{ type: 'gauge', data: [{ value: resTotal.data.total, name: "机构总数" }] }]
  })
  chartType.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: resType.data.map(d => d.type) },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: resType.data.map(d => d.cnt) }]
  })
}

//加载医疗点位、弹窗收藏留言
async function loadMedicalPoint(type = '') {
  clearPointLayer()
  let url = '/medical/point'
  if (type) url += `?type=${encodeURIComponent(type)}`
  const res = await request.get(url)
  if (res.code !== 200) return alert(res.msg)
  const list = res.data
  const overlayGroup = new window.AMap.OverlayGroup()
  list.forEach(item => {
    const marker = new window.AMap.Marker({
      position: [item.lng, item.lat],
      title: item.name,
      extData: item
    })
    const infoWinContent = `
      <div style="min‑width:300px;">
        <h4>${item.name}</h4>
        <p>类型：${item.type}</p>
        <p>地址：${item.address || '无'}</p>
        <p>电话：${item.phone || '无'}</p>
        <p>等级：${item.level || '无'}</p>
        <button onclick="window.startRoute(${item.lng},${item.lat})">路径规划</button>
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
    const infoWin = new window.AMap.InfoWindow({ content: infoWinContent })
    marker.on('click', () => {
      infoWin.open(map, marker.getPosition())
    })
    overlayGroup.addOverlay(marker)
  })
  setPointLayer(overlayGroup)
  map.add(overlayGroup)
}

const queryPoint = () => {
  loadMedicalPoint(filterType.value)
  showFilter.value = false
}

//15分钟缓冲区 Turf
async function create15MinBuffer() {
  clearBufferLayer()
  const res = await request.get("/stat/siteQuery")
  const points = res.data
  const group = new window.AMap.OverlayGroup()
  points.forEach(p => {
    const pt = turf.point([p.lng, p.lat])
    const buffered = turf.buffer(pt, 15, { units: 'kilometers' })
    const polygon = new window.AMap.Polygon({
      path: buffered.geometry.coordinates[0].map(c => [c[0], c[1]]),
      fillColor: 'rgba(64,169,255,0.2)',
      strokeColor: '#40a9ff',
      strokeWeight: 2
    })
    group.addOverlay(polygon)
  })
  setBufferLayer(group)
  map.add(group)
}

//医疗盲区提取
async function extractBlindArea() {
  clearBlindLayer()
  const resCommunity = await request.get("/community")
  const communityList = resCommunity.data
  const resPoint = await request.get("/stat/siteQuery")
  const points = resPoint.data
  let buffers = []
  points.forEach(p => {
    const pt = turf.point([p.lng, p.lat])
    buffers.push(turf.buffer(pt, 15, { units: 'kilometers' }))
  })
  const mergedBuf = buffers.length > 0 ? turf.union(...buffers) : null
  const group = new window.AMap.OverlayGroup()
  communityList.forEach(com => {
    const comPt = turf.point([com.lng, com.lat])
    let inService = false
    if (mergedBuf) inService = turf.booleanPointInPolygon(comPt, mergedBuf)
    if (!inService) {
      const marker = new window.AMap.Marker({
        position: [com.lng, com.lat],
        icon: 'https://a.amap.com/jsapi_demos/static/demo‑center/icons/poi‑marker‑red.png',
        title: "盲区小区:" + com.name
      })
      group.addOverlay(marker)
    }
  })
  setBlindLayer(group)
  map.add(group)
}

//调用后端gisExtra接口获取半径小区
async function getCommunityByRadius(lng, lat, radius) {
  const res = await request.get(`/gisExtra/communityByRadius?lng=${lng}&lat=${lat}&radius=${radius}`)
  return res.data
}

//选址分析交互
function openSiteDialog() {
  alert("请点击地图上的位置作为选址点")
  map.once('click', async (e) => {
    const lng = e.lnglat.lng
    const lat = e.lnglat.lat
    clearSiteMarker()
    const marker = new window.AMap.Marker({ position: [lng, lat], map })
    setSiteMarker(marker)
    const evalName = prompt("输入选址评估名称：")
    if (!evalName) return
    const nearCommunity = await getCommunityByRadius(lng, lat, 13000)
    const resCalc = await request.post("/stat/accessCalc", { lng, lat, radius: 13000 })
    const resultJson = JSON.stringify({ ...resCalc.data, nearCommunity })
    if (!userInfo.value) {
      alert("登录后才能保存选址记录")
      return
    }
    await request.post("/collect/saveSiteEval", {
      user_id: userInfo.value.userId,
      eval_name: evalName,
      lng, lat,
      resultJson
    })
    alert(`选址评估记录保存成功！周边共查询到${nearCommunity.length}个小区`)
  })
}

//全局挂载给弹窗onclick
window.startRoute = function (lng, lat) {
  alert("请在地图点击选择起点")
  map.once('click', (e) => {
    startLngLat = e.lnglat
    const end = [lng, lat]
    driving = new window.AMap.Driving({ map })
    driving.search(startLngLat, end)
  })
}

window.collectPoint = async function (pointId) {
  if (!userInfo.value) return alert("请登录")
  try {
    const res = await request.post('/collect/addCollect', { user_id: userInfo.value.userId, point_id: pointId })
    alert(res.msg)
  } catch (err) {
    alert(err?.msg || "收藏失败")
  }
}

window.loadPointComment = async function (pointId) {
  const res = await request.get(`/comment/list/${pointId}`)
  const box = document.getElementById("commentListBox")
  if (!box) return
  let html = "<hr><b>用户留言：</b><br>"
  if (res.data.length === 0) html += "<p>暂无留言</p>"
  else res.data.forEach(c => {
    html += `<div style="margin:4px 0;border‑bottom:1px solid #eee;"><span>用户：${c.content} | ${c.star}星</span></div>`
  })
  box.innerHTML = html
}

window.submitComment = async function (pointId) {
  if (!userInfo.value) return alert("请登录")
  const content = document.getElementById("commentText").value
  const star = document.getElementById("starSel").value
  if (!content.trim()) return alert("留言不能为空")
  await request.post('/comment/add', {
    point_id: pointId,
    user_id: userInfo.value.userId,
    content,
    star: Number(star)
  })
  alert("留言提交成功，点击查看全部留言刷新")
}

onUnmounted(() => {
  chartTotal?.dispose()
  chartType?.dispose()
})
</script>

<style scoped>
.right‑panel {
  width: 220px;
  height: 100vh;
  background: #fff;
  position: absolute;
  right: 0;
  top: 0;
  z‑index: 998;
  border‑left: 1px solid #ccc;
  padding: 10px;
  overflow‑y: auto;
}
.modal {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  z‑index: 1000;
  display: flex;
  align‑items: center;
  justify‑content: center;
}
.modal‑content {
  background: #fff;
  padding: 20px;
  border‑radius: 6px;
  min‑width: 320px;
}
.modal‑content h4 {
  margin‑bottom: 12px;
}
.modal‑content select,
textarea {
  width: 100%;
  padding: 6px;
  margin‑bottom: 12px;
}
button {
  padding: 6px 12px;
  margin: 0 4px;
  cursor: pointer;
}
</style>
