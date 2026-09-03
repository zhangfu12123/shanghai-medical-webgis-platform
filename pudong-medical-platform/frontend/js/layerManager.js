/* =====================================================================
 * layerManager.js —— 全局图层管理器
 * 功能：
 *   1. 图层的添加、显示、隐藏、切换、移除
 *   2. 矢量图层（GeoJSON）与点位图层（Marker）的刷新
 *   3. 查询图层状态（供左侧图层开关面板使用）
 * 接入数据时的用法示例：
 *   const lm = window.trafficMap.layerManager;
 *   lm.addLayer('监控点位', new AMap.SomeLayer(...));
 *   lm.refreshMarkerLayer('监控点位', [{ lng: 121.5, lat: 31.2, title: '探头1' }]);
 *   lm.toggle('实时路况');           // 显示/隐藏切换
 *   lm.getStatus();                  // 查看所有图层状态
 * ===================================================================== */
class LayerManager {
  constructor(map) {
    this.map = map;
    this.layers = {}; // 图层表： name -> { layer, markers, visible, type }
  }
  /* ---------------- 基础操作 ---------------- */
  // 添加一个高德图层
  addLayer(name, layer, options = {}) {
    const { type = 'overlay', visible = true } = options;
    if (this.layers[name]) this.remove(name);
    layer.setMap(visible ? this.map : null);
    this.layers[name] = { layer: layer, markers: null, visible: visible, type: type };
    return layer;
  }
  _get(name) {
    const info = this.layers[name];
    if (!info) throw new Error('图层不存在：' + name);
    return info;
  }
  show(name) {
    const info = this._get(name);
    info.visible = true;
    if (info.layer) info.layer.setMap(this.map);
    if (info.markers) info.markers.forEach(m => m.setMap(this.map));
    return this;
  }
  hide(name) {
    const info = this._get(name);
    info.visible = false;
    if (info.layer) info.layer.setMap(null);
    if (info.markers) info.markers.forEach(m => m.setMap(null));
    return this;
  }
  // 显示/隐藏切换
  toggle(name) {
    return this.layers[name] && this.layers[name].visible ? this.hide(name) : this.show(name);
  }
  setVisible(name, visible) {
    return visible ? this.show(name) : this.hide(name);
  }
  remove(name) {
    const info = this.layers[name];
    if (!info) return this;
    if (info.layer) info.layer.setMap(null);
    if (info.markers) info.markers.forEach(m => m.setMap(null));
    delete this.layers[name];
    return this;
  }
  /* ---------------- 数据刷新 ---------------- */
  // 刷新 GeoJSON 矢量图层（面/线/点数据）
  refreshVectorLayer(name, geojson, styleOptions = {}) {
    const old = this.layers[name];
    const visible = old ? old.visible : true;
    const styleFn = styleOptions.style || makeDefaultStyle(styleOptions);
    const layer = new getAMap().GeoJSONLayer({
      geoJSON: geojson,
      style: styleFn,
      zIndex: styleOptions.zIndex || 10
    });
    if (old && old.layer) old.layer.setMap(null);
    layer.setMap(visible ? this.map : null);
    this.layers[name] = { layer: layer, markers: null, visible: visible, type: 'vector' };
    return layer;
  }
  // 刷新点位图层（Marker 实现）
  // points 格式：[{ lng, lat, title }, ...]
  refreshMarkerLayer(name, points, options = {}) {
    const old = this.layers[name];
    const visible = old ? old.visible : true;
    const AMap = getAMap();
    const markers = points.map(p => new AMap.Marker({
      position: [p.lng, p.lat],
      title: p.title || '',
      ...(options.markerOptions || {})
    }));
    markers.forEach(m => m.setMap(visible ? this.map : null));
    if (old && old.markers) old.markers.forEach(m => m.setMap(null));
    this.layers[name] = { layer: null, markers: markers, visible: visible, type: 'marker' };
    return markers;
  }
  /* ---------------- 状态查询 ---------------- */
  // 返回所有图层状态，给左侧图层面板用
  getStatus() {
    return Object.keys(this.layers).map(name => ({
      name: name,
      visible: this.layers[name].visible,
      type: this.layers[name].type
    }));
  }
  // 取出某个图层对象
  getLayer(name) {
    return this.layers[name] ? (this.layers[name].layer || this.layers[name].markers) : null;
  }
}
/* 获取高德命名空间（地图初始化后会挂到 window.trafficMap.AMap） */
function getAMap() {
  if (window.trafficMap && window.trafficMap.AMap) return window.trafficMap.AMap;
  if (window.AMap) return window.AMap;
  throw new Error('高德地图尚未初始化，请先调用 initTrafficMap()');
}
/* 默认矢量样式 */
function makeDefaultStyle(options = {}) {
  const {
    strokeColor = '#1677ff',
    strokeWeight = 2,
    strokeOpacity = 0.9,
    fillColor = 'rgba(22, 119, 255, 0.15)',
    fillOpacity = 0.5
  } = options;
  return function (feature) {
    const t = feature.geometry.type;
    if (t === 'LineString' || t === 'MultiLineString') {
      return { strokeColor: strokeColor, strokeWeight: strokeWeight, strokeOpacity: strokeOpacity };
    }
    if (t === 'Polygon' || t === 'MultiPolygon') {
      return { strokeColor: strokeColor, strokeWeight: 1, strokeOpacity: 0.6, fillColor: fillColor, fillOpacity: fillOpacity };
    }
    return {}; // 点要素使用默认样式
  };
}
window.LayerManager = LayerManager;