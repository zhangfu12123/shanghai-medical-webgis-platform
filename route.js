(function (global) {
  'use strict';
  class RoutePlanner {
    constructor(map) { this.map = map; this.start = null; this.end = null; this.pickMode = null; this.markers = {}; this.driving = null; this.geocoder = new AMap.Geocoder({ city: '上海' }); }
    init() {
      document.getElementById('pickStart').onclick = () => this.beginPick('start');
      document.getElementById('pickEnd').onclick = () => this.beginPick('end');
      document.getElementById('planRoute').onclick = () => this.plan();
      document.getElementById('clearRoute').onclick = () => this.clear();
      this.map.on('click', event => { if (this.pickMode) { this.setPoint(this.pickMode, [event.lnglat.lng, event.lnglat.lat], '地图选点'); this.pickMode = null; this.map.setDefaultCursor('default'); } });
    }
    beginPick(mode) { this.pickMode = mode; this.map.setDefaultCursor('crosshair'); this.status(`请在地图上点击选择${mode === 'start' ? '起点' : '终点'}`); }
    setEnd(position, name) { this.setPoint('end', position, name); this.status('终点已选择，请设置起点'); }
    setPoint(mode, position, name) {
      const point = { position, name }; this[mode] = point;
      if (this.markers[mode]) this.map.remove(this.markers[mode]);
      this.markers[mode] = new AMap.Marker({ position, map: this.map, label: { content: mode === 'start' ? '起点' : '终点', direction: 'top' } });
      document.getElementById(`${mode}Input`).value = name || '';
      document.getElementById(`${mode}Coord`).textContent = `${position[0].toFixed(6)}, ${position[1].toFixed(6)}`;
    }
    geocode(address) { return new Promise((resolve, reject) => this.geocoder.getLocation(address, (status, result) => status === 'complete' && result.geocodes?.length ? resolve([result.geocodes[0].location.lng, result.geocodes[0].location.lat]) : reject(new Error('地址解析失败')))); }
    async resolveInput(mode) { if (this[mode]) return this[mode].position; const input = document.getElementById(`${mode}Input`).value.trim(); if (!input) throw new Error(`请设置${mode === 'start' ? '起点' : '终点'}`); const position = await this.geocode(input); this.setPoint(mode, position, input); return position; }
    async plan() {
      try {
        this.status('正在规划路线…'); const start = await this.resolveInput('start'); const end = await this.resolveInput('end');
        this.driving?.clear(); this.driving = new AMap.Driving({ map: this.map, hideMarkers: true, policy: AMap.DrivingPolicy.LEAST_TIME });
        this.driving.search(new AMap.LngLat(...start), new AMap.LngLat(...end), (status, result) => {
          if (status !== 'complete' || !result.routes?.length) {
            const reason = result?.info || result || status;
            console.error('高德驾车路线规划失败：', status, result);
            return this.status(`路线规划失败：${reason}`, true);
          }
          const route = result.routes[0], distance = route.distance, seconds = route.time;
          document.getElementById('routeDistance').textContent = `距离：${distance >= 1000 ? `${(distance / 1000).toFixed(1)} 公里` : `${distance} 米`}`;
          document.getElementById('routeDuration').textContent = `预计耗时：${seconds >= 3600 ? `${Math.floor(seconds / 3600)} 小时 ${Math.ceil(seconds % 3600 / 60)} 分钟` : `${Math.ceil(seconds / 60)} 分钟`}`;
          document.getElementById('routeResult').hidden = false; this.status('路线规划完成');
        });
      } catch (error) { this.status(error.message, true); }
    }
    clear() { this.driving?.clear(); this.driving = null; Object.values(this.markers).forEach(marker => this.map.remove(marker)); this.markers = {}; this.start = this.end = null; ['start','end'].forEach(mode => { document.getElementById(`${mode}Input`).value = ''; document.getElementById(`${mode}Coord`).textContent = '尚未选择'; }); document.getElementById('routeResult').hidden = true; this.status('请选择起点和终点'); }
    status(message, error = false) { const el = document.getElementById('routeStatus'); el.textContent = message; el.classList.toggle('error', error); }
  }
  global.RoutePlanner = RoutePlanner;
})(window);
