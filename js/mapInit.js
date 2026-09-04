/* =====================================================================
 * mapInit.js —— OpenLayers 地图初始化（4号 何飞 负责）
 * OpenLayers 版
 * ===================================================================== */

var PUDONG_CENTER = [121.5444, 31.2211]; // 浦东新区中心点

/* 边界/路网数据源：先试后端接口，失败再试本地文件。
   后端没启动时会报红色 CONNECTION 错误，属正常，不影响底图显示 */
var DATA_SOURCES = {
  boundary: [
    'http://localhost:3000/api/map/pudongBoundary',
    'GeoJSON/pudong_boundary.geojson'
  ],
  road: [
    'http://localhost:3000/api/map/roadNetwork',
    'GeoJSON/road.geojson'
  ]
};

function loadJSON(url) {
  return fetch(url).then(function (r) {
    if (!r.ok) { throw new Error('HTTP ' + r.status); }
    return r.json();
  });
}

function tryLoad(list) {
  var i = 0;
  function next() {
    if (i >= list.length) { return Promise.reject(new Error('所有数据源加载失败')); }
    return loadJSON(list[i]).catch(function () { i++; return next(); });
  }
  return next();
}

function initMapBase(targetId) {
  if (typeof ol === 'undefined') {
    return Promise.reject(new Error('OpenLayers 未加载，请检查 CDN 网络'));
  }

  /* 1. 创建地图 */
  var map = new ol.Map({
    target: targetId,
    view: new ol.View({
      center: ol.proj.fromLonLat(PUDONG_CENTER),
      zoom: 11,
      minZoom: 8,
      maxZoom: 19
    }),
  });

  map.addControl(new ol.control.ScaleLine({ units: 'metric' }));
  map.addControl(new ol.control.OverviewMap({ collapsed: true, tipLabel: '鹰眼小地图' }));
  var layerManager = new LayerManager(map);

  /* 2. 底图：高德标准图（无需 Key，固定子域，避免加载失败） */
  layerManager.addTileLayer('高德标准图', new ol.layer.Tile({
    source: new ol.source.XYZ({
      url: 'https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
      crossOrigin: 'anonymous'
    }),
    zIndex: 0
  }), { type: 'base', visible: true });

  /* 3. 底图：高德卫星图（左侧面板可切换） */
  layerManager.addTileLayer('高德卫星图', new ol.layer.Tile({
    source: new ol.source.XYZ({
      url: 'https://webst01.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
      crossOrigin: 'anonymous'
    }),
    zIndex: 0
  }), { type: 'base', visible: false });

  /* 4. 立刻暴露全局对象，地图马上可用 */
  window.mapBase = { ol: ol, map: map, layerManager: layerManager, dataSources: DATA_SOURCES };

  /* 5. 边界 / 路网改成后台加载，不阻塞地图显示 */
  tryLoad(DATA_SOURCES.boundary).then(function (geojson) {
    var lyr = layerManager.addVectorLayer('浦东边界', geojson, {
      strokeColor: '#1677ff',
      fillColor: 'rgba(22,119,255,0.08)'
    });
    map.getView().fit(lyr.getSource().getExtent(), { padding: [60, 60, 60, 60], duration: 800 });
  }).catch(function (e) {
    console.warn('浦东边界加载失败（不影响底图显示）：', e);
  });

  tryLoad(DATA_SOURCES.road).then(function (geojson) {
    layerManager.addVectorLayer('路网', geojson, {
      strokeColor: '#9aa5b1', strokeWidth: 1, strokeOpacity: 0.8
    });
  }).catch(function (e) {
    console.warn('路网加载失败（不影响底图显示）：', e);
  });

  /* 6. 立即完成初始化（和旧版最大的区别在这里） */
  return Promise.resolve(window.mapBase);
}

window.initMapBase = initMapBase;