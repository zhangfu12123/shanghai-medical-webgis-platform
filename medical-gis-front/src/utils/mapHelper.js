// 地图全局覆盖物管理工具，对应分工文档图层管理类
let pointLayer = null
let bufferLayer = null
let blindLayer = null
let heatmap = null
let siteMarker = null

export function setPointLayer(layer) {
  pointLayer = layer
}
export function clearPointLayer() {
  if (pointLayer) pointLayer.clear()
}

export function setBufferLayer(layer) {
  bufferLayer = layer
}
export function clearBufferLayer() {
  if (bufferLayer) bufferLayer.clear()
}

export function setBlindLayer(layer) {
  blindLayer = layer
}
export function clearBlindLayer() {
  if (blindLayer) blindLayer.clear()
}

export function setHeatMap(h) {
  heatmap = h
}
export function getHeatMap() {
  return heatmap
}

export function setSiteMarker(m) {
  siteMarker = m
}
export function clearSiteMarker() {
  if (siteMarker) {
    siteMarker.remove()
    siteMarker = null
  }
}

export function clearAllOverlay() {
  clearPointLayer()
  clearBufferLayer()
  clearBlindLayer()
  clearSiteMarker()
}
