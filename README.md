# 上海市公共医疗资源服务平台（README）

> 基于 Web GIS 的医疗资源可视化、路径规划与选址辅助分析平台。

---

## 1. 项目简介

本项目是一个面向**上海市浦东新区**的公共医疗资源服务平台，以 Web GIS（地理信息系统）为核心，将医院、社区卫生服务中心、急救站、药店等医疗点位在电子地图上可视化呈现，并提供就医路径规划、15 分钟就医服务圈缓冲区分析、医疗资源可达性热力图、新建医疗点位选址辅助分析等空间分析能力。

系统同时具备用户注册登录、医疗点位收藏、点位留言与星级评分、系统公告发布与浏览，以及选址评估记录、用户查询历史等业务功能，形成"地理数据 + 业务数据"一体化的医疗资源管理平台。

## 2. 功能特性

### 2.1 GIS 核心基础功能
- 浦东新区医疗资源点位可视化查询：地图加载与矢量要素渲染，支持分类筛选与点位详情弹窗
- 就医路径规划：起终点拾取、就医路径绘制、距离与耗时计算
- 15 分钟就医服务圈缓冲区分析：基于空间缓冲区计算服务覆盖范围
- 医疗资源可达性热力图：对区域医疗可达程度进行可视化渲染
- 新建医疗点位选址辅助分析：给定范围查询周边 1–3km 医疗点位，辅助选址决策
- 右侧统计看板：ECharts 统计图表与地图双向联动

### 2.2 用户账号功能
- 用户注册、登录（区分普通用户 / 管理员）

### 2.3 拓展业务功能
- 医疗点位收藏
- 点位留言与星级评分
- 系统公告发布与浏览

### 2.4 历史记录功能
- 保存选址评估历史记录
- 记录用户查询历史

## 3. 技术栈

### 3.1 后端（服务端）
| 项 | 技术 |
|---|---|
| 运行环境 | Node.js |
| Web 服务框架 | Express.js |
| 数据库 | SQLServer |
| 数据格式 | GeoJSON / JSON |
| 开发语言 | JavaScript |

### 3.2 前端（浏览器端）
| 项 | 技术 |
|---|---|
| 基础网页 | HTML + CSS + 原生 JavaScript、Vue |
| GIS 地图引擎 | OpenLayers（地图加载、矢量要素渲染、图层管理、鹰眼与比例尺控件） |
| 空间计算库 | Turf.js（缓冲区分析、距离面积计算、框选统计、医疗盲区提取） |
| 图表可视化 | ECharts（统计看板、地图图表双向联动） |

### 3.3 存储方案
- **SQLServer**：存储医疗点位、用户账号、点位收藏、留言评分、系统公告、选址评估记录、用户查询历史共 7 类业务数据表
- **GeoJSON 离线文件**：存放浦东新区边界、路网几何数据，不存入数据库

> 备注：分工文档中"数据库连接配置文件"一处写作 MySQL，其余技术栈与存储方案处均为 SQLServer，正文以 **SQLServer** 为准，如有出入请以实际代码为准。

## 4. 系统架构

系统采用**前后端分离**架构：

```
┌─────────────────────────────────────────────┐
│                   前端（浏览器端）              │
│  HTML + CSS + Vue + OpenLayers + Turf.js    │
│  + ECharts                                  │
│  （地图底座 / 点位渲染 / 路径规划 / 空间分析 /   │
│    热力图 / 统计看板 / 页面交互）               │
└──────────────────┬──────────────────────────┘
                   │ HTTP 请求 / GeoJSON·JSON 响应
┌──────────────────▼──────────────────────────┐
│                后端（Node.js）                │
│  Express.js Web 服务（跨域 / 静态资源托管）     │
│  ┌──────────┬──────────┬─────────────────┐  │
│  │ 地理接口  │ 业务接口  │ 统计与选址接口    │  │
│  │ 边界/路网 │ 医疗点位  │ 统计 / 可达性     │  │
│  │          │ 用户/留言 │ 选址 / 收藏 / 历史 │  │
│  └──────────┴──────────┴─────────────────┘  │
└──────────────┬───────────┬─────────────────┘
               │           │
     ┌─────────▼───┐   ┌───▼──────────────────┐
     │  SQLServer   │   │  GeoJSON 离线文件      │
     │  7 张业务表  │   │  （浦东边界 / 路网）    │
     └─────────────┘   └──────────────────────┘
```

## 5. 数据库设计

系统共 7 张业务数据表（存储于 SQLServer）：

| 序号 | 表名 | 说明 |
|---|---|---|
| 1 | `medical_point` | 医疗点位主表（浦东新区医院、社区中心、急救站、药店） |
| 2 | `site_evaluation` | 选址评估历史记录表 |
| 3 | `sys_user` | 用户账号表（注册、登录、区分普通用户 / 管理员） |
| 4 | `search_record` | 用户查询历史记录表 |
| 5 | `user_collect` | 用户医疗点位收藏表 |
| 6 | `point_comment` | 点位留言、星级评分表 |
| 7 | `system_notice` | 系统公告信息表 |

浦东新区边界、路网矢量几何数据以 **GeoJSON 离线文件**形式存放，不存入数据库。

## 6. 安装与运行

### 6.1 环境要求
- Node.js（建议 14.x 及以上）
- npm（随 Node.js 一起安装）
- SQLServer 数据库（含可用的数据库实例与连接凭据）
- 现代浏览器（Chrome / Edge / Firefox 等）

### 6.2 依赖安装

**后端依赖（Node.js / Express）**

在项目后端目录下执行：

```bash
npm install express          # Web 服务框架
npm install cors             # 跨域支持
npm install mssql            # SQLServer 数据库驱动（连接管理）
npm install -D nodemon       # 开发调试热重载（可选）
```

> 说明：若实际数据库为 MySQL，请将 `mssql` 替换为 `mysql` / `mysql2` 驱动，并同步修改 `db/db.js` 中的连接配置。

**前端依赖（浏览器端）**

推荐通过 CDN 引入，在 `index.html` 中加载：

```html
<!-- OpenLayers 地图引擎 -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ol/ol.css">
<script src="https://cdn.jsdelivr.net/npm/ol/dist/ol.js"></script>

<!-- Turf.js 空间计算库 -->
<script src="https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js"></script>

<!-- ECharts 图表可视化 -->
<script src="https://cdn.jsdelivr.net/npm/echarts/dist/echarts.min.js"></script>

<!-- Vue -->
<script src="https://cdn.jsdelivr.net/npm/vue@2/dist/vue.js"></script>
```

也可使用 npm 方式安装前端依赖：`npm install ol @turf/turf echarts vue`。

### 6.3 启动步骤

1. **准备数据库**：在 SQLServer 中创建数据库，按第 5 节创建 7 张业务数据表，并配置连接信息。
2. **导入医疗点位数据**：运行数据清洗入库脚本（`data-process/cleanData.js`），将浦东新区医院、社区中心、急救站、药店原始点位数据清洗后导入数据库。
3. **放置 GeoJSON 文件**：将浦东新区边界、路网 GeoJSON 离线文件放置到指定目录（不入库）。
4. **启动后端服务**：

```bash
# 进入后端目录
node server.js
# 或开发模式
nodemon server.js
```

5. **启动前端**：在浏览器中打开 `index.html`（或按项目配置通过静态资源托管访问）。

### 6.4 关键配置

- 数据库连接配置：`db/db.js`
- 后端路由：`routes/` 目录下各业务模块
- 前端入口：`index.html`

## 7. 项目目录结构（建议）

```
├── server.js                  # 后端主服务入口
├── db/
│   └── db.js                  # 数据库连接模块
├── routes/                    # 后端路由
│   ├── index.js               # 路由顶层结构
│   ├── medicalApi.js          # 医疗点位接口
│   ├── userApi.js             # 用户账号接口
│   ├── commentApi.js          # 留言评价接口
│   ├── statApi.js             # 统计接口
│   ├── collectApi.js          # 收藏接口
│   └── noticeApi.js           # 系统公告接口
├── data-process/
│   └── cleanData.js           # 数据清洗入库脚本
├── index.html                 # 前端入口页
├── css/
│   └── main.css               # 全局样式
├── js/
│   ├── mapInit.js             # OpenLayers 地图初始化
│   ├── layerManager.js        # 图层管理
│   ├── medicalPoint.js        # 医疗点位渲染
│   ├── route.js               # 路径规划
│   ├── spatialAnalysis.js     # 空间分析
│   ├── heatMap.js             # 可达性热力图
│   ├── dashboard.js           # ECharts 看板
│   └── siteSelectFront.js     # 选址前端交互
└── GeoJSON/                   # 离线地理数据（边界、路网）
```

## 8. 团队分工

| 成员 | 组别 | 角色 | 负责文件 | 核心工作 |
|---|---|---|---|---|
| 尚泽桐 | 后端 | 主框架工程师 | `server.js`、`routes/index.js`、`db/db.js`、`routes/noticeApi.js` | Express 项目初始化、跨域与静态资源托管、数据库连接、路由顶层结构、浦东边界路网接口、公共工具封装、系统公告接口 |
| 邹孟华 | 后端 | 医疗数据接口工程师 | `routes/medicalApi.js`、`data-process/cleanData.js`、`routes/userApi.js`、`routes/commentApi.js` | 医疗点位数据清洗入库、点位查询与分类筛选接口、注册登录、留言评分接口 |
| 张星富 | 后端 | 统计与选址后端工程师 | `routes/statApi.js`、`routes/collectApi.js` | 医疗机构数量/分类统计、选址查询（周边 1–3km）、可达性指标计算、收藏接口、选址与查询历史接口 |
| 何飞 | 前端 | GIS 底座 & UI 开发工程师 | `index.html`、`css/main.css`、`js/mapInit.js`、`js/layerManager.js` | 操作台页面布局、OpenLayers 地图初始化（比例尺、鹰眼）、图层管理类、登录/注册/公告/个人中心页面 |
| 郝远里 | 前端 | 点位查询 + 路径规划工程师 | `js/medicalPoint.js`、`js/route.js` | 医疗点位地图渲染、筛选与弹窗详情、弹窗收藏/留言/评分控件、起终点拾取与就医路径绘制 |
| 马添祺 | 前端 | 空间分析 & 热力图工程师 | `js/spatialAnalysis.js`、`js/heatMap.js` | Turf.js 缓冲区（15 分钟服务圈）、多边形框选统计、医疗盲区提取、可达性热力图层 |
| 覃江华 | 前端 | ECharts 看板 + 选址前端工程师 | `js/dashboard.js`、`js/siteSelectFront.js` | ECharts 统计图与地图双向联动、选址前端交互与结果展示、收藏/留言/公告前端渲染、登录权限控制 |

## 9. 技术要点

- **地图底座**：OpenLayers 加载浦东新区底图，固定视角范围，内置比例尺、鹰眼控件，实现矢量要素（医疗点位）渲染与图层管理。
- **空间计算**：基于 Turf.js 完成缓冲区分析（15 分钟服务圈）、距离/面积计算、多边形框选统计、医疗盲区提取。
- **数据可视化**：ECharts 构建统计看板，实现地图与图表的双向联动。
- **数据服务**：后端提供结构化地理数据（GeoJSON / JSON）与业务数据接口，前端统一消费渲染。

---

*本文档基于项目《项目简介与分工》整理，供开发者快速了解系统功能、技术栈与部署方式。*
