(function (global) {
  'use strict';
  const TYPES = {
    hospital: { label: '医院', icon: '🏥' }, community: { label: '社区卫生', icon: '🏠' },
    emergency: { label: '急救站', icon: '🚑' }, pharmacy: { label: '药店', icon: '💊' }, clinic: { label: '诊所', icon: '🩺' }
  };
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  class MedicalPointModule {
    constructor(map, options = {}) {
      this.map = map; this.apiBase = options.apiBase || '/api'; this.points = []; this.markers = []; this.infoWindow = null;
      this.onSelectAsDestination = null; this.fallbackKey = 'medical-point-interactions';
    }
    async init() {
      document.getElementById('typeFilter').addEventListener('change', e => this.render(e.target.value));
      try {
        const response = await fetch(`${this.apiBase}/medical-points`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const body = await response.json();
        this.points = (Array.isArray(body) ? body : body.data || []).map(this.normalizePoint);
        this.render('all');
      } catch (error) {
        console.error('医疗点位加载失败', error);
        document.getElementById('pointCount').textContent = '接口加载失败';
        this.toast('医疗点位接口请求失败');
      }
    }
    normalizePoint(point) {
      return { ...point, id: Number(point.id), lng: Number(point.lng ?? point.longitude), lat: Number(point.lat ?? point.latitude), rating: Number(point.rating || 0), comments: point.comments || [] };
    }
    render(type) {
      this.markers.forEach(marker => this.map.remove(marker)); this.markers = [];
      const visible = type === 'all' ? this.points : this.points.filter(point => point.type === type);
      visible.filter(p => Number.isFinite(p.lng) && Number.isFinite(p.lat)).forEach(point => {
        const config = TYPES[point.type] || TYPES.clinic;
        const marker = new AMap.Marker({ position: [point.lng, point.lat], content: `<div class="medical-marker marker-${escapeHtml(point.type)}" title="${escapeHtml(point.name)}"><span>${config.icon}</span></div>`, offset: new AMap.Pixel(-21, -36), extData: point, bubble: false });
        marker.on('click', () => this.openPopup(marker, point));
        this.map.add(marker); this.markers.push(marker);
      });
      document.getElementById('pointCount').textContent = `显示 ${visible.length} / 共 ${this.points.length} 个`;
      if (this.markers.length) this.map.setFitView(this.markers, false, [70, 70, 70, 350]);
    }
    openPopup(marker, point) {
      this.infoWindow?.close();
      this.infoWindow = new AMap.InfoWindow({ content: this.popupHtml(point), offset: new AMap.Pixel(0, -37), closeWhenClickMap: true });
      this.infoWindow.open(this.map, marker.getPosition());
      // 高德不同版本触发 open 事件的时机不一致，等弹窗内容挂载后再绑定控件。
      window.setTimeout(() => this.bindPopup(point), 0);
    }
    popupHtml(point) {
      const type = TYPES[point.type] || TYPES.clinic;
      const comments = (point.comments || []).map(c => `<div class="comment">${escapeHtml(c.content)}<time>${escapeHtml(c.createTime || '')}</time></div>`).join('');
      return `<div class="point-popup" id="point-popup-${point.id}"><h3>${escapeHtml(point.name)}</h3><span class="tag">${type.icon} ${type.label}</span><dl><dt>地址</dt><dd>${escapeHtml(point.address || '暂无')}</dd><dt>电话</dt><dd>${escapeHtml(point.phone || '暂无')}</dd><dt>等级</dt><dd>${escapeHtml(point.level || '暂无')}</dd></dl><div class="popup-actions"><button class="collect" data-action="collect">${point.collected ? '❤️ 已收藏' : '🤍 收藏'}</button><button class="destination" data-action="destination">设为终点</button></div><div class="rating" aria-label="评分">${[1,2,3,4,5].map(value => `<button class="star ${value <= (point.userRating || 0) ? 'active' : ''}" data-rating="${value}" title="${value} 星">★</button>`).join('')}<small>${point.userRating ? `${point.userRating} 星` : '点击评分'}</small></div><div class="comment-row"><input maxlength="200" placeholder="写下留言…"><button data-action="comment">发送</button></div><div class="comments">${comments || '<div class="comment">暂无留言</div>'}</div></div>`;
    }
    bindPopup(point) {
      const root = document.getElementById(`point-popup-${point.id}`); if (!root) return;
      root.querySelector('[data-action="destination"]').onclick = () => this.onSelectAsDestination?.(point);
      root.querySelector('[data-action="collect"]').onclick = () => this.toggleCollect(point, root);
      root.querySelectorAll('[data-rating]').forEach(button => button.onclick = () => this.rate(point, Number(button.dataset.rating), root));
      const input = root.querySelector('input'); root.querySelector('[data-action="comment"]').onclick = () => this.comment(point, input.value.trim(), root);
      input.onkeydown = event => { if (event.key === 'Enter') root.querySelector('[data-action="comment"]').click(); };
    }
    async request(path, options) {
      const response = await fetch(`${this.apiBase}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
      if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json();
    }
    async toggleCollect(point, root) {
      const next = !point.collected;
      try { await this.request('/collects', { method: next ? 'POST' : 'DELETE', body: JSON.stringify({ pointId: point.id }) }); point.collected = next; root.querySelector('[data-action="collect"]').textContent = next ? '❤️ 已收藏' : '🤍 收藏'; this.toast(next ? '收藏成功' : '已取消收藏'); }
      catch { this.toast('收藏操作失败'); }
    }
    async rate(point, rating, root) {
      try { await this.request('/comments/rating', { method: 'POST', body: JSON.stringify({ pointId: point.id, rating }) }); point.userRating = rating; root.querySelectorAll('[data-rating]').forEach(b => b.classList.toggle('active', Number(b.dataset.rating) <= rating)); root.querySelector('.rating small').textContent = `${rating} 星`; this.toast('评分已提交'); }
      catch { this.toast('评分提交失败'); }
    }
    async comment(point, content, root) {
      if (!content) return this.toast('请输入留言内容');
      try { const saved = await this.request('/comments', { method: 'POST', body: JSON.stringify({ pointId: point.id, content }) }); point.comments.push(saved.data || saved); root.querySelector('input').value = ''; root.querySelector('.comments').innerHTML = point.comments.map(c => `<div class="comment">${escapeHtml(c.content)}<time>${escapeHtml(c.createTime || '')}</time></div>`).join(''); this.toast('留言已发布'); }
      catch { this.toast('留言发布失败'); }
    }
    toast(message) { const el = document.getElementById('toast'); el.textContent = message; el.classList.add('show'); clearTimeout(this.toastTimer); this.toastTimer = setTimeout(() => el.classList.remove('show'), 1800); }
  }
  global.MedicalPointModule = MedicalPointModule;
})(window);
