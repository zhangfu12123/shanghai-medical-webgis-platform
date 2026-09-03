/* =====================================================================
 * mapInit.js —— 地图初始化（4号/D 负责）
 * 功能：
 *   1. 加载高德地图 JS API 2.0
 *   2. 设置上海可视范围（中心点、默认缩放级别）
 *   3. 添加比例尺、缩放、鹰眼（小地图）、底图切换控件
 *   4. 创建默认图层（实时路况/路网/卫星影像）交给图层管理器
 * 使用方法：页面里调用  window.initTrafficMap('地图容器的id')
 * ===================================================================== */
const AMAP_KEY = '3b74fbb6322cf172e1363efeffac99e5';
const AMAP_SECURITY_CODE = '81c30d30e6931d377baedc492ffff410';
const SHANGHAI_CENTER = [121.4737, 31.2304]; // 上海市中心（人民广场附近）
const DEFAULT_ZOOM = 11;
async function initTrafficMap(containerId) {
  if (typeof window.AMapLoader === 'undefined') {
    throw new Error('高德地图加载器(loader.js)没有加载成功，请检查网络');
  }
  // 新版高德要求：初始化前配置安全密钥（不设置会导致地图空白）
  window._AMapSecurityConfig = { securityJsCode: AMAP_SECURITY_CODE };
  const AMap = await window.AMapLoader.load({
    key: AMAP_KEY,
    version: '2.0',
    securityJsCode: AMAP_SECURITY_CODE,
    plugins: ['AMap.Scale', 'AMap.ToolBar', 'AMap.OverView', 'AMap.MapType', 'AMap.TileLayer', 'AMap.GeoJSON']
  });
  // 1. 创建地图
  const map = new AMap.Map(containerId, {
    center: SHANGHAI_CENTER,  // 地图中心：上海
    zoom: DEFAULT_ZOOM,       // 初始缩放级别
    viewMode: '2D',           // 2D 平面图
    zoomEnable: true,         // 允许滚轮缩放
    dragEnable: true          // 允许拖拽
  });
  // 2. 添加控件
  map.addControl(new AMap.Scale());                      // 比例尺（左下角）
  map.addControl(new AMap.ToolBar({ position: 'RB' }));  // 缩放条 + 方向罗盘（右下角）
  map.addControl(new AMap.OverView({ isOpen: false }));  // 鹰眼小地图（右下角点开）
  map.addControl(new AMap.MapType());                    // 标准图 / 卫星图切换（右上角）
  // 3. 创建图层管理器
  const layerManager = new LayerManager(map);
  // 4. 默认图层（左侧面板可勾选开关）
  layerManager.addLayer(
    '实时路况',
    new AMap.TileLayer.Traffic({ autoRefresh: true, interval: 180, zIndex: 10 }),
    { type: 'tile', visible: true }
  );
  layerManager.addLayer(
    '路网',
    new AMap.TileLayer.RoadNet({ zIndex: 3 }),
    { type: 'tile', visible: true }
  );
  layerManager.addLayer(
    '卫星影像',
    new AMap.TileLayer.Satellite({ zIndex: 1 }),
    { type: 'tile', visible: false }
  );
  // 5. 把地图相关对象挂到全局，E/F/G 同学的文件都能直接使用：
  //    window.trafficMap.map            地图对象
  //    window.trafficMap.layerManager   图层管理器
  //    window.trafficMap.AMap           高德命名空间
  window.trafficMap = { AMap: AMap, map: map, layerManager: layerManager };
  map.on('complete', function () {
    console.log('高德地图加载完成');
  });
  return window.trafficMap;
}
window.initTrafficMap = initTrafficMap;