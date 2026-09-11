<template>
  <div v-if="visible" class="route-panel">
    <div class="route-title">
      驾车路径规划
      <span class="close-btn" @click="closePanel">×</span>
    </div>

    <div class="route-form-item">
      <label>起点：{{ route.startName || "尚未选取，请点击地图点位" }}</label>
    </div>
    <div class="route-form-item">
      <label>终点：{{ route.endName || "尚未选取，请点击地图点位" }}</label>
    </div>

    <div class="route-tip">{{ routeTip }}</div>
    <div class="route-btn-row">
      <button class="btn-primary route-btn" @click="searchRoute">生成驾车路线</button>
      <button class="btn-gray route-btn" @click="clearRoute">清除路线</button>
    </div>
  </div>
</template>

<script setup>
import { nextTick, onUnmounted, reactive, ref, watch } from 'vue'
const props = defineProps({
  map: { type: Object, default: null },
  visible: { type: Boolean, default: false },
  // 现在不再使用这个点位列表，保留props不破坏父组件传参
  pointList: { type: Array, default: () => [] }
})
const emit = defineEmits(['update:visible'])

const routeTip = ref('🔽打开面板后，点击地图点位/空白处拾取起点')
const route = reactive({
  startName: '',
  endName: '',
  startLngLat: null,
  endLngLat: null
})

let driving = null
let pluginsPromise = null

function initPlugins() {
  if (pluginsPromise) return pluginsPromise
  pluginsPromise = new Promise((resolve, reject) => {
    if (!window.AMap) {
      reject(new Error('高德地图尚未加载完成'))
      return
    }
    window.AMap.plugin(['AMap.Driving','AMap.Geocoder'], () => {
      resolve()
    })
  })
  return pluginsPromise
}

async function openPanel() {
  await nextTick()
  try {
    await initPlugins()
  } catch (error) {
    console.error('路径规划插件初始化失败', error)
    pluginsPromise = null
    routeTip.value = '地图服务尚未准备好，请稍后重试'
    return
  }
  clearRoute()
}

function closePanel() {
  emit('update:visible', false)
  clearRoute()
}

// 【供父组件调用：地图点击拾取回填】
function fillByMapPick({name,lngLat}){
  if(!route.startLngLat){
    route.startName = name
    route.startLngLat = lngLat
    routeTip.value = `✅起点：${name}｜请再拾取终点`
  }else{
    route.endName = name
    route.endLngLat = lngLat
    routeTip.value = `✅终点：${name}｜点击生成驾车路线`
  }
}

async function searchRoute() {
  if (!props.map) {
    alert('地图尚未加载完成，请稍后再试')
    return
  }
  try {
    await initPlugins()
  } catch (error) {
    console.error('路径规划插件初始化失败', error)
    alert('路径规划服务暂不可用，请稍后重试')
    return
  }
  if (!route.startName || !route.endName || !route.startLngLat || !route.endLngLat) {
    alert('请在地图上拾取起点与终点！')
    return
  }
  if (driving) driving.clear()
  driving = new window.AMap.Driving({ map: props.map, hideMarkers: false, autoFitView: true })
  driving.search(route.startLngLat, route.endLngLat, (status, result) => {
    if (status !== 'complete') {
      alert(`路径规划失败：${result?.info || status}，更换点位重试`)
      return
    }
    const summary = result.routes?.[0]
    routeTip.value = summary
      ? `🚗 ${route.startName} → ${route.endName}｜全程 ${(summary.distance / 1000).toFixed(2)} 公里 · 驾车约 ${Math.round(summary.time / 60)} 分钟`
      : '✅驾车路线已生成'
  })
}

function clearRoute() {
  if (driving) {
    driving.clear()
    driving = null
  }
  route.startName = ''
  route.endName = ''
  route.startLngLat = null
  route.endLngLat = null
  routeTip.value = '🔽打开面板后，点击地图点位/空白处拾取起点'
}

defineExpose({ selectPoint:fillByMapPick, clearRoute })

watch(() => props.visible, (visible) => {
  if (visible) openPanel()
})

onUnmounted(() => {
  if (driving) driving.clear()
})
</script>

<style scoped>
.route-panel{
  position:absolute;left:16px;top:16px;width:340px;
  background:rgba(13,28,51,.95);
  border:1px solid #27416b;
  border-radius:6px;padding:12px;
  z-index:999;
  box-shadow:0 4px 16px rgba(0,0,0,.4);
}
.route-title{
  font-size:14px;color:#4fc3f7;
  display:flex;justify-content:space-between;align-items:center;
  margin-bottom:10px;
}
.close-btn{cursor:pointer;font-size:18px;color:#9db8dd;}
.close-btn:hover{color:#fff;}

.route-form-item{margin-bottom:10px;}
.route-form-item label{
  display:block;font-size:12px;color:#9db8dd;
}

.route-tip{
  font-size:12px;color:#ffd54f;
  line-height:1.5;margin:8px 0;
  min-height:36px;
}
.route-btn-row{display:flex;gap:8px;}
.route-btn{height:32px;flex:1;border:0;border-radius:4px;cursor:pointer;font-size:13px;}
.btn-primary{background:#1e88e5;color:#fff;}
.btn-primary:hover{background:#2196f3;}
.btn-gray{background:#2a3d5c;color:#d0e4ff;}
.btn-gray:hover{background:#35496b;}
</style>