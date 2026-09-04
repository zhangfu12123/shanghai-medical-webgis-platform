const express = require('express');
const router = express.Router();
const { loadMedicalGeoJson } = require('../utils/dataLoader');

// ========== 接口1：获取全部医疗点位 ==========
// GET /api/medical/all
router.get('/all', (req, res) => {
  try {
    const geoData = loadMedicalGeoJson();
    res.json({
      code: 200,
      msg: '获取全部医疗点位成功',
      data: geoData
    });
  } catch (err) {
    res.status(500).json({ code: 500, msg: '服务器错误', data: null });
  }
});

// ========== 接口2：按机构类型筛选 ==========
// GET /api/medical/filterByType?type=综合医院
router.get('/filterByType', (req, res) => {
  try {
    const { type } = req.query;
    if (!type) {
      return res.json({ code: 400, msg: '缺少type参数', data: null });
    }

    const geoData = loadMedicalGeoJson();
    const filterFeatures = geoData.features.filter(f => f.properties.type === type);

    res.json({
      code: 200,
      msg: `按类型筛选完成，共${filterFeatures.length}条`,
      data: {
        type: "FeatureCollection",
        features: filterFeatures
      }
    });
  } catch (err) {
    res.status(500).json({ code: 500, msg: '服务器错误', data: null });
  }
});

// ========== 接口3：按行政区查询 ==========
// GET /api/medical/filterByDistrict?district=浦东新区
router.get('/filterByDistrict', (req, res) => {
  try {
    const { district } = req.query;
    if (!district) {
      return res.json({ code: 400, msg: '缺少district参数', data: null });
    }

    const geoData = loadMedicalGeoJson();
    const filterFeatures = geoData.features.filter(f => f.properties.district === district);

    res.json({
      code: 200,
      msg: `查询${district}医疗资源完成，共${filterFeatures.length}条`,
      data: {
        type: "FeatureCollection",
        features: filterFeatures
      }
    });
  } catch (err) {
    res.status(500).json({ code: 500, msg: '服务器错误', data: null });
  }
});

// ========== 接口4：组合筛选（行政区+类型+等级+类别）==========
// GET /api/medical/filter?district=浦东新区&type=综合医院&level=三级甲等
router.get('/filter', (req, res) => {
  try {
    const { district, type, level, category } = req.query;
    const geoData = loadMedicalGeoJson();
    let list = [...geoData.features];

    if (district) {
      list = list.filter(f => f.properties.district === district);
    }
    if (type) {
      list = list.filter(f => f.properties.type === type);
    }
    if (level) {
      list = list.filter(f => f.properties.level === level);
    }
    if (category) {
      list = list.filter(f => f.properties.category === category);
    }

    res.json({
      code: 200,
      msg: `组合筛选完成，共${list.length}条`,
      data: {
        type: "FeatureCollection",
        features: list
      }
    });
  } catch (err) {
    res.status(500).json({ code: 500, msg: '服务器错误', data: null });
  }
});

// ========== 接口5：按名称模糊搜索 ==========
// GET /api/medical/search?keyword=东方医院
router.get('/search', (req, res) => {
  try {
    const { keyword } = req.query;
    if (!keyword) {
      return res.json({ code: 400, msg: '缺少keyword参数', data: null });
    }

    const geoData = loadMedicalGeoJson();
    const filterFeatures = geoData.features.filter(f =>
      f.properties.name.includes(keyword)
    );

    res.json({
      code: 200,
      msg: `搜索完成，共${filterFeatures.length}条`,
      data: {
        type: "FeatureCollection",
        features: filterFeatures
      }
    });
  } catch (err) {
    res.status(500).json({ code: 500, msg: '服务器错误', data: null });
  }
});

module.exports = router;
