<template>
  <div v-if="visible" class="heat-dialog-wrap">
    <div class="heat-dialog">
      <div class="dialog-header">
        <h3>🏘️居民区就医分析</h3>
        <button class="heat-close-btn" @click="handleClose">×</button>
      </div>
      <div class="dialog-body">
        <div class="form-row">
          <label>选择居民区中心点：</label>
          <select
            v-model="selectCommunityIndex"
            class="sel-com"
            :disabled="loadingCommunity"
            :key="communityList.length"
          >
            <option value="-1">{{ loadingCommunity ? '加载居民区中...' : '' }}</option>
            <option v-for="(item,idx) in communityList" :key="item.id" :value="idx">
              {{ item.name }}
            </option>
          </select>
        </div>
        <div class="form-row">
          <label>辐射半径(米)</label>
          <input v-model.number="radiusM" type="number" min="500" max="5000" class="inp-radius" />
        </div>
        <div class="btn-row">
          <button class="btn-primary" @click="renderHeat">生成热力图</button>
          <button class="btn-gray" @click="clearHeatLayer">清除图层</button>
        </div>
      </div>
      <div class="dialog-footer">
        <button class="heat-footer-close" @click="handleClose">关闭</button>
      </div>
    </div>
    <!-- 替换alert的自动消失轻提示，不需要点击确认 -->
    <Transition name="fadeTip">
      <div v-if="tipShow" class="global-tip">{{ tipText }}</div>
    </Transition>
  </div>
</template>

<script setup>
import {ref, defineEmits, defineProps, watch, onUnmounted, nextTick} from 'vue'
import request from '../api/request'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  mapIns: {
    type: Object,
    default: null
  },
  medicalPointList: {
    type: Array,
    default: ()=>[]
  }
})
const emit = defineEmits(['close','updateStatPanel','closeAll'])

let heatmapInstance = null
let tipTimer = null

const selectCommunityIndex = ref(-1)
const radiusM = ref()
const statResult = ref(null)
const communityList = ref([])
const loadingCommunity = ref(false)

// 轻提示状态
const tipShow = ref(false)
const tipText = ref('')

const heatmapOption = ref({
  radius:45,
  opacity:[0.15,0.85],
  gradient:{
    0.0:'#0044ff',
    0.3:'#00dddd',
    0.6:'#ffff00',
    0.85:'#ff6600',
    1.0:'#ff2222'
  }
})

// 显示自动消失提示，替换alert，无需点击确认
function showTip(msg){
  clearTimeout(tipTimer)
  tipText.value = msg
  tipShow.value = true
  tipTimer = setTimeout(()=>{
    tipShow.value = false
  }, 2200)
}

watch(()=>props.visible,async (newVal)=>{
  if(newVal){
    await nextTick()
    selectCommunityIndex.value = -1
    await fetchAllCommunity()
  }else{
    clearHeatLayer()
    selectCommunityIndex.value = -1
    statResult.value = null
    communityList.value = []
    clearTimeout(tipTimer)
    tipShow.value = false
  }
})

async function fetchAllCommunity(){
  loadingCommunity.value = true
  try{
    const backendResp = await request.get('/community/list')
    if(backendResp?.code === 200){
      communityList.value = [...backendResp.data]
    }
  }catch(err){
    console.error("读取居民区下拉失败",err)
    showTip("居民区加载失败")
  }finally{
    loadingCommunity.value = false
  }
}

//球面距离计算
function calcDistance(lat1,lng1,lat2,lng2){
  const R = 6371000
  const rad = Math.PI / 180
  const latRad1 = lat1 * rad
  const latRad2 = lat2 * rad
  const deltaLat = (lat2 - lat1) * rad
  const deltaLng = (lng2 - lng1) * rad
  const a = Math.sin(deltaLat/2)**2 + Math.cos(latRad1)*Math.cos(latRad2)*Math.sin(deltaLng/2)**2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/**
 * 在圆形范围内批量生成网格采样点，用来铺满热力图
 * @param {number} centerLng 中心经度
 * @param {number} centerLat 中心纬度
 * @param {number} radius 米
 * @param {Array} realMedPoints 圈内真实医疗点位
 */
function generateCircleSamplePoints(centerLng,centerLat,radius, realMedPoints){
  const sampleList = []
  const stepMeter = 180
  const degreePerMeterLat = 1 / 111320
  const latDelta = stepMeter * degreePerMeterLat
  const lngDelta = stepMeter * degreePerMeterLat / Math.cos(centerLat * Math.PI / 180)
  const latRadiusDeg = radius * degreePerMeterLat
  const lngRadiusDeg = radius * degreePerMeterLat / Math.cos(centerLat * Math.PI / 180)
  const minLat = centerLat - latRadiusDeg
  const maxLat = centerLat + latRadiusDeg
  const minLng = centerLng - lngRadiusDeg
  const maxLng = centerLng + lngRadiusDeg
  for(let lat = minLat; lat <= maxLat; lat += latDelta){
    for(let lng = minLng; lng <= maxLng; lng += lngDelta){
      const dist = calcDistance(centerLat, centerLng, lat, lng)
      if(dist <= radius){
        let weight = 1
        realMedPoints.forEach(med=>{
          const d = calcDistance(lat,lng, med.lat, med.lng)
          if(d < 350) weight += 8
        })
        sampleList.push({lng, lat, count: weight})
      }
    }
  }
  return sampleList
}

async function renderHeat(){
  if(!props.mapIns){
    showTip("地图实例未就绪！")
    return
  }
  if(selectCommunityIndex.value === -1){
    showTip("请先选择一个居民区作为中心点")
    return
  }
  if(!props.medicalPointList || props.medicalPointList.length ===0){
    showTip("请先加载医疗点位数据！")
    return
  }
  const communityItem = communityList.value[selectCommunityIndex.value]
  const cLng = communityItem.lng
  const cLat = communityItem.lat
  const inRangeMedPoints = []
  props.medicalPointList.forEach(med=>{
    const dist = calcDistance(cLat,cLng,med.lat,med.lng)
    if(dist <= radiusM.value){
      inRangeMedPoints.push(med)
    }
  })
  console.log("【圈内全部医疗点（含药店医院）】", inRangeMedPoints.length, inRangeMedPoints)
  if(heatmapInstance){
    heatmapInstance.setMap(null)
    heatmapInstance = null
  }
  if(inRangeMedPoints.length === 0){
    showTip(`当前${radiusM.value}米范围内没有医疗点位，请调大半径`)
    statResult.value = {
      communityName: communityItem.name,
      radiusM: radiusM.value,
      medicalCount:0,
      level:"无点位",
      suggest:"当前范围没有医疗机构"
    }
    emit('updateStatPanel', statResult.value)
    props.mapIns.setCenter([cLng,cLat])
    props.mapIns.setZoom(12)
    return
  }
  const heatSampleData = generateCircleSamplePoints(cLng,cLat,radiusM.value, inRangeMedPoints)
  let level, suggest
  const cnt = inRangeMedPoints.length
  if(cnt <=2){
    level = "就医资源薄弱"
    suggest = "该居民区周边医疗资源较少，就医可达性较差，建议补充配套医疗机构"
  }else if(cnt <=6){
    level = "就医资源一般"
    suggest = "周边具备基础医疗，可按需完善社区医疗点"
  }else{
    level = "就医资源充足"
    suggest = "该居民区周边医疗机构密集，居民就医便利"
  }
  statResult.value = {
    communityName: communityItem.name,
    radiusM: radiusM.value,
    medicalCount: cnt,
    level,
    suggest
  }
  emit('updateStatPanel', statResult.value)
  await new Promise(resolve=>{
    window.AMap.plugin(["AMap.HeatMap"],()=>resolve())
  })
  heatmapInstance = new window.AMap.HeatMap(props.mapIns,{
    radius: heatmapOption.value.radius,
    opacity: heatmapOption.value.opacity,
    gradient: heatmapOption.value.gradient,
    zooms:[3,18]
  })
  heatmapInstance.setDataSet({
    data: heatSampleData,
    max:12
  })
  props.mapIns.setCenter([cLng,cLat])
  props.mapIns.setZoom(12)
  showTip(`热力已生成，共${cnt}个医疗点位`)
}

function clearHeatLayer(){
  if(heatmapInstance){
    heatmapInstance.setMap(null)
    heatmapInstance = null
    showTip("热力图层已清除")
  }
}

function handleClose(){
  clearHeatLayer()
  emit('closeAll')
}

onUnmounted(()=>{
  clearTimeout(tipTimer)
  clearHeatLayer()
})
</script>

<style scoped>
.heat-dialog-wrap{
  position:fixed;
  top:96px;
  left:16px;
  z-index:2100;
  pointer-events:none;
}
.heat-dialog{
  pointer-events:auto;
  width:360px;
  background:#0d1c33;
  border:1px solid rgba(79,195,247,0.35);
  border-radius:8px;
  overflow:hidden;
}
.dialog-header{
  position: relative;
  display:flex;
  justify-content:space-between;
  align-items:center;
  padding:10px 14px;
  border-bottom:1px solid #27416b;
}
.dialog-header h3{
  margin:0;
  color:#4fc3f7;
  font-size:14px;
}
.heat-close-btn{
  position: absolute;
  top: 12px;
  right: 12px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.06);
  color: #9db8dd;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease;
  z-index: 3;
}
.heat-close-btn:hover{
  background: rgba(229, 57, 53, 0.95);
  color: #ffffff;
  transform: rotate(90deg) scale(1.08);
  box-shadow: 0 0 12px rgba(229, 57, 53, 0.55), 0 0 22px rgba(229, 57, 53, 0.25);
}
.heat-close-btn:active{
  transform: rotate(90deg) scale(0.96);
}
.dialog-body{
  padding:14px;
}
.form-row{
  margin-bottom:10px;
  display:flex;
  flex-direction:column;
  gap:4px;
}
.form-row label{
  font-size:12px;
  color:#b8d4ff;
}
.sel-com,.inp-radius{
  height:30px;
  background:#0a1728;
  border:1px solid #27416b;
  color:#d0e4ff;
  border-radius:4px;
  padding:0 8px;
}
.btn-row{
  display:flex;
  gap:8px;
  margin-bottom:2px;
}
.btn-primary,.btn-gray{
  flex:1;
  height:30px;
  border-radius:4px;
  border:none;
  cursor:pointer;
  font-size:12px;
}
.btn-primary{
  background:#1e88e5;
  color:#fff;
}
.btn-gray{
  background:#2a3d5c;
  color:#d0e4ff;
}
.dialog-footer{
  padding:8px 14px;
  border-top:1px solid #27416b;
  text-align:right;
}
.heat-footer-close{
  width:100%;
  height:36px;
  border-radius:8px;
  border:none;
  background:rgba(255, 255, 255, 0.04);
  color:#cfd8ff;
  font-size:14px;
  font-weight:600;
  letter-spacing:2px;
  cursor:pointer;
  transition:all 0.3s ease;
  border:1px solid rgba(255, 255, 255, 0.08);
  position:relative;
  overflow:hidden;
}
.heat-footer-close::before{
  content:"";
  position:absolute;
  left:0;
  top:0;
  width:0;
  height:100%;
  background:linear-gradient(90deg,#ff5f5f,#e53935);
  transition:width 0.3s ease;
  z-index:-1;
}
.heat-footer-close:hover{
  color:#ffffff;
  border-color:#ff7070;
  box-shadow:0 0 16px rgba(255,95,95,0.5),0 0 32px rgba(229,57,53,0.25);
  transform:translateY(-2px);
}
.heat-footer-close:hover::before{
  width:100%;
}
.heat-footer-close:active{
  transform:translateY(0) scale(0.97);
}

.fadeTip-enter-from{
  opacity:0;
  transform:translateY(-6px);
}
.fadeTip-enter-active{
  transition: all 0.24s ease;
}
.fadeTip-enter-to{
  opacity:1;
  transform:translateY(0);
}
.fadeTip-leave-from{
  opacity:1;
}
.fadeTip-leave-active{
  transition: all 0.24s ease;
}
.fadeTip-leave-to{
  opacity:0;
  transform:translateY(-6px);
}
.global-tip{
  position:fixed;
  top:70px;
  left:50%;
  transform:translateX(-50%);
  z-index:99999;
  pointer-events:none;
  background:rgba(13,28,51,0.93);
  border:1px solid rgba(79,195,247,0.35);
  color:#c7e6ff;
  font-size:12px;
  border-radius:6px;
  padding:9px 14px;
  box-shadow:0 4px 14px rgba(0,0,0,0.45);
}
</style>
