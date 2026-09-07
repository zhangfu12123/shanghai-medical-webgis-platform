/* =====================================================================
 * layerManager.js —— 全局图层管理器（4号 何飞 负责）
 *  OpenLayers 版
 * ===================================================================== */

function LayerManager(map) {
  this.map = map;
  this.layers = {}; // name -> { layer, visible, type }
}

LayerManager.prototype._get = function (name) {
  var info = this.layers[name];
  if (!info) { throw new Error('图层不存在：' + name); }
  return info;
};

/* 添加瓦片图层（底图） */
LayerManager.prototype.addTileLayer = function (name, layer, options) {
  options = options || {};
  var info = {
    layer: layer,
    visible: options.visible !== false,
    type: options.type || 'tile'
  };
  layer.setVisible(info.visible);
  this.map.addLayer(layer);
  this.layers[name] = info;
  return layer;
};

/* 添加矢量图层（GeoJSON），type 固定为 'vector' */
LayerManager.prototype.addVectorLayer = function (name, geojson, styleOptions) {
  if (this.layers[name]) { this.remove(name); }
  var features = new ol.format.GeoJSON().readFeatures(geojson, {
    featureProjection: 'EPSG:3857'
  });
  var source = new ol.source.Vector({ features: features });
  var styleFn = (typeof styleOptions === 'function')
    ? styleOptions
    : makeVectorStyle(styleOptions || {});
  var layer = new ol.layer.Vector({ source: source, style: styleFn, zIndex: 10 });
  layer.set('geojson', geojson);
  this.addTileLayer(name, layer, { type: 'vector', visible: true });
  return layer;
};

LayerManager.prototype.refreshVectorLayer = function (name, geojson, styleOptions) {
  this.remove(name);
  return this.addVectorLayer(name, geojson, styleOptions);
};

/* 向矢量图层追加要素（E/F/G 渲染点位、缓冲区等用） */
LayerManager.prototype.addFeatures = function (name, features) {
  var info = this._get(name);
  if (info.type !== 'vector') { throw new Error('只能向矢量图层添加要素：' + name); }
  info.layer.getSource().addFeatures(features);
  return this;
};

LayerManager.prototype.clear = function (name) {
  var info = this._get(name);
  if (info.type === 'vector') { info.layer.getSource().clear(); }
  return this;
};

LayerManager.prototype.show = function (name) {
  var info = this._get(name);
  info.visible = true;
  info.layer.setVisible(true);
  return this;
};

LayerManager.prototype.hide = function (name) {
  var info = this._get(name);
  info.visible = false;
  info.layer.setVisible(false);
  return this;
};

/* 显示/隐藏切换。底图互斥：同一时间只显示一张底图 */
LayerManager.prototype.toggle = function (name) {
  var self = this;
  var info = this._get(name);
  if (info.type === 'base') {
    Object.keys(this.layers).forEach(function (k) {
      var it = self.layers[k];
      if (it.type === 'base') {
        it.visible = (k === name);
        it.layer.setVisible(it.visible);
      }
    });
  } else {
    info.visible = !info.visible;
    info.layer.setVisible(info.visible);
  }
  return this;
};

LayerManager.prototype.setVisible = function (name, visible) {
  return visible ? this.show(name) : this.hide(name);
};

LayerManager.prototype.remove = function (name) {
  var info = this.layers[name];
  if (!info) { return this; }
  this.map.removeLayer(info.layer);
  delete this.layers[name];
  return this;
};

LayerManager.prototype.getStatus = function () {
  var self = this;
  return Object.keys(this.layers).map(function (name) {
    return { name: name, visible: self.layers[name].visible, type: self.layers[name].type };
  });
};

LayerManager.prototype.getLayer = function (name) {
  return this._get(name).layer;
};

LayerManager.prototype.zoomTo = function (name, padding) {
  var info = this._get(name);
  if (info.type === 'vector') {
    this.map.getView().fit(info.layer.getSource().getExtent(), {
      padding: padding || [40, 40, 40, 40], duration: 500
    });
  }
  return this;
};

/* 默认矢量样式：点 / 线 / 面 */
function makeVectorStyle(options) {
  var strokeColor = options.strokeColor || '#1677ff';
  var strokeWidth = options.strokeWidth || 2;
  var strokeOpacity = (options.strokeOpacity !== undefined) ? options.strokeOpacity : 0.9;
  var fillColor = options.fillColor || 'rgba(22,119,255,0.15)';
  var pointColor = options.pointColor || '#f5222d';
  var pointRadius = options.pointRadius || 6;

  return function (feature) {
    var type = feature.getGeometry().getType();
    if (type === 'Point' || type === 'MultiPoint') {
      return new ol.style.Style({
        image: new ol.style.Circle({
          radius: pointRadius,
          fill: new ol.style.Fill({ color: pointColor }),
          stroke: new ol.style.Stroke({ color: '#fff', width: 2 })
        })
      });
    }
    if (type === 'LineString' || type === 'MultiLineString') {
      return new ol.style.Style({
        stroke: new ol.style.Stroke({ color: strokeColor, width: strokeWidth })
      });
    }
    if (type === 'Polygon' || type === 'MultiPolygon') {
      return new ol.style.Style({
        stroke: new ol.style.Stroke({ color: strokeColor, width: 1, lineDash: [6, 6] }),
        fill: new ol.style.Fill({ color: fillColor })
      });
    }
    return null;
  };
}

window.LayerManager = LayerManager;