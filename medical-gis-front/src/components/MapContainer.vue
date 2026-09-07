<template>
  <div id="container" class="map‑box"></div>
</template>

<script setup>
import { onMounted, defineEmits } from 'vue'
import AMapLoader from '@amap/amap‑jsapi‑loader'

const emit = defineEmits(['map‑ready'])
let map = null

onMounted(async () => {
  // =========替换为你自己高德Web端key + 安全密钥=========
  window._AMapSecurityConfig = {
    securityJsCode: 'ba03939e7b7b04b1ba2a7353a8cd4225',
  }
  await AMapLoader.load({
    key: "a66ef9397fa30aef13ab51c3f60bac94",
    version: "2.0",
    plugins: ['AMap.Scale', 'AMap.HawkEye', 'AMap.Driving', 'AMap.HeatMap']
  })
  map = new window.AMap.Map("container", {
    zoom: 11,
    center: [121.5441, 31.2287], // 浦东新区中心点
    resizeEnable: true
  })
  map.addControl(new window.AMap.Scale())
  map.addControl(new window.AMap.HawkEye({ isOpen: false }))
  emit('map‑ready', map)
})
</script>

<style scoped>
.map‑box {
  width: calc(100vw ‑ 440px);
  height: 100vh;
  position: absolute;
  left: 220px;
  top: 0;
}
</style>
