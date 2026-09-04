'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');
const { asyncHandler, HttpError, sendSuccess } = require('../utils/response');
const noticeRouter = require('./noticeApi');

const router = express.Router();
const geojsonDirectory = path.join(__dirname, '..', 'public', 'geojson');

async function readGeoJson(fileName, layerName) {
  const filePath = path.join(geojsonDirectory, fileName);
  let raw;

  try {
    raw = await fs.promises.readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new HttpError(503, `${layerName}GeoJSON数据文件尚未提供`);
    }
    throw error;
  }

  if (!raw.trim()) {
    throw new HttpError(503, `${layerName}GeoJSON数据文件为空，请放置有效数据后重试`);
  }

  let geojson;
  try {
    geojson = JSON.parse(raw);
  } catch (error) {
    throw new HttpError(500, `${layerName}GeoJSON文件格式无效`);
  }

  const validTypes = new Set(['FeatureCollection', 'Feature', 'GeometryCollection']);
  if (!geojson || typeof geojson !== 'object' || !validTypes.has(geojson.type)) {
    throw new HttpError(500, `${layerName}GeoJSON缺少有效的type字段`);
  }
  return geojson;
}

function mountOptionalRouter(routePrefix, moduleName) {
  const modulePath = path.join(__dirname, `${moduleName}.js`);
  if (!fs.existsSync(modulePath) || fs.statSync(modulePath).size === 0) {
    console.info(`[路由待接入] ${routePrefix} -> ${moduleName}.js`);
    return;
  }

  const childRouter = require(`./${moduleName}`);
  if (typeof childRouter !== 'function') {
    throw new Error(`${moduleName}.js必须导出Express Router`);
  }
  router.use(routePrefix, childRouter);
}

router.get('/health', (req, res) => sendSuccess(res, {
  service: 'pudong-medical-webgis-backend',
  status: 'ok'
}));

router.get('/geo/boundary', asyncHandler(async (req, res) => {
  const geojson = await readGeoJson('pudong_boundary.geojson', '浦东新区边界');
  res.set('Cache-Control', 'public, max-age=300');
  return sendSuccess(res, geojson);
}));

router.get('/geo/roads', asyncHandler(async (req, res) => {
  const geojson = await readGeoJson('road.geojson', '浦东新区路网');
  res.set('Cache-Control', 'public, max-age=300');
  return sendSuccess(res, geojson);
}));

router.use('/notices', noticeRouter);

mountOptionalRouter('/medical', 'medicalApi');
mountOptionalRouter('/users', 'userApi');
mountOptionalRouter('/comments', 'commentApi');
mountOptionalRouter('/stats', 'statApi');
mountOptionalRouter('/collects', 'collectApi');

module.exports = router;
