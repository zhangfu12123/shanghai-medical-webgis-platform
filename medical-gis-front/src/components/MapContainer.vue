<template>
  <div id="container" style="width: 100%; height: 100%;"></div>
</template>

<script setup>
import {onMounted,onUnmounted} from 'vue'
// ❗❗❗重点：不要花括号！默认导入！！
import AMapLoader from '@amap/amap-jsapi-loader'
const emit = defineEmits(['map-ready'])

let map = null
onMounted(async ()=>{
  try{
    console.log("开始加载高德")
    await AMapLoader.load({
      key:"a66ef9397fa30aef13ab51c3f60bac94",
      securityJsCode:"ba03939e7b7b04b1ba2a7353a8cd4225",
      version:"2.0",
      // 路径规划相关插件一次性加载，避免运行时再 plugin() 造成时序问题
      plugins:[
        'AMap.Driving',       // 驾车
        'AMap.Walking',       // 步行路径规划
        'AMap.AutoComplete',  // 输入联想
        'AMap.PlaceSearch',   // 名称 -> 坐标（兜底）
        'AMap.Geocoder',      // 坐标 -> 真实地名
        'AMap.Scale'
      ]
    })
    console.log("高德加载完成，window.AMap", window.AMap)
    map = new window.AMap.Map("container",{
      zoom:11,
      center:[121.54,31.22]
    })
    // 比例尺，可选
    map.addControl(new window.AMap.Scale())
    emit('map-ready', map)
  }catch(err){
    console.error("高德异常", err)
  }
})

onUnmounted(()=>{
  map?.destroy()
})
</script>

<style scoped>
:deep(#container){
  width:100%;
  height:100%;
}
</style>
