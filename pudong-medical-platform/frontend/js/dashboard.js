// ==========================================
// 覃江华 - ECharts统计看板 + 地图图表双向联动
// 依赖：项目已有的 map 对象（何飞 mapInit.js）、ECharts、Vue
// ==========================================

// ---------- Vue看板实例 ----------
const dashboardVm = new Vue({
    el: '#dashboardPanel',
    data: {
        // 统计数据
        totalCount: 0,
        categoryData: [],   // 分类统计 [{name, value}]
        districtData: [],   // 各街道统计
        trendData: [],      // 趋势数据
        // 联动状态
        selectedCategory: 'all',
        loading: false
    },
    mounted() {
        this.initCharts();
        this.loadStats();
        this.bindMap联动();
    },
    methods: {
        // 初始化ECharts实例
        initCharts() {
            this.categoryChart = echarts.init(document.getElementById('categoryChart'));
            this.districtChart = echarts.init(document.getElementById('districtChart'));
            this.trendChart = echarts.init(document.getElementById('trendChart'));
            window.addEventListener('resize', () => {
                this.categoryChart.resize();
                this.districtChart.resize();
                this.trendChart.resize();
            });
        },

        // 从后端加载统计数据（张星富 statApi 接口）
        async loadStats() {
            this.loading = true;
            try {
                const [totalRes, categoryRes, districtRes] = await Promise.all([
                    fetch('/api/stat/total').then(r => r.json()),
                    fetch('/api/stat/category').then(r => r.json()),
                    fetch('/api/stat/district').then(r => r.json())
                ]);
                this.totalCount = totalRes.data || 0;
                this.categoryData = categoryRes.data || [];
                this.districtData = districtRes.data || [];
                this.renderCharts();
            } catch (e) {
                console.error('统计数据加载失败', e);
                // 兜底模拟数据（联调时可删）
                this.totalCount = 328;
                this.categoryData = [
                    { name: '医院', value: 45 },
                    { name: '社区卫生中心', value: 120 },
                    { name: '急救站', value: 38 },
                    { name: '药店', value: 125 }
                ];
                this.renderCharts();
            } finally {
                this.loading = false;
            }
        },

        // 渲染三个图表
        renderCharts() {
            // 1. 分类饼图
            this.categoryChart.setOption({
                title: { text: '医疗资源分类占比', left: 'center', textStyle: { fontSize: 14 } },
                tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
                legend: { bottom: 0, type: 'scroll' },
                series: [{
                    type: 'pie',
                    radius: ['40%', '65%'],
                    data: this.categoryData,
                    emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.5)' } }
                }]
            });

            // 2. 各街道柱状图
            this.districtChart.setOption({
                title: { text: '各街道医疗点位数量', left: 'center', textStyle: { fontSize: 14 } },
                tooltip: { trigger: 'axis' },
                grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
                xAxis: { type: 'category', data: this.districtData.map(d => d.name), axisLabel: { rotate: 30 } },
                yAxis: { type: 'value' },
                series: [{
                    type: 'bar',
                    data: this.districtData.map(d => d.value),
                    itemStyle: { color: '#1890ff' },
                    barMaxWidth: 20
                }]
            });

            // 3. 趋势折线图（模拟）
            this.trendChart.setOption({
                title: { text: '医疗资源增长趋势', left: 'center', textStyle: { fontSize: 14 } },
                tooltip: { trigger: 'axis' },
                grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
                xAxis: { type: 'category', data: ['2020', '2021', '2022', '2023', '2024', '2025'] },
                yAxis: { type: 'value' },
                series: [{
                    type: 'line',
                    data: [180, 210, 245, 278, 305, 328],
                    smooth: true,
                    itemStyle: { color: '#52c41a' },
                    areaStyle: { color: 'rgba(82,196,26,0.2)' }
                }]
            });
        },

        // 地图-图表双向联动：点击饼图分类 → 地图筛选点位
        bindMap联动() {
            const self = this;
            // 图表点击 → 地图筛选
            this.categoryChart.on('click', function (params) {
                self.selectedCategory = params.name;
                // 触发全局事件，郝远里的 medicalPoint.js 监听后筛选点位
                window.dispatchEvent(new CustomEvent('categoryFilter', { detail: params.name }));
            });

            // 地图点位点击 → 图表高亮（监听郝远里模块发出的事件）
            window.addEventListener('pointClick', function (e) {
                const category = e.detail.category;
                self.categoryChart.dispatchAction({
                    type: 'highlight',
                    seriesIndex: 0,
                    name: category
                });
                setTimeout(() => {
                    self.categoryChart.dispatchAction({
                        type: 'downplay',
                        seriesIndex: 0,
                        name: category
                    });
                }, 1500);
            });
        },

        // 刷新统计
        refresh() {
            this.loadStats();
        }
    }
});
