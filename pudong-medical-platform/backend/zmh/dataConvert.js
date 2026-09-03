const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// 1. 读取原始Excel（文件名和你实际的一致）
const excelPath = path.join(__dirname, './raw/上海市医疗机构与药店名录（单表版）.xlsx');
const workbook = XLSX.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const rawList = XLSX.utils.sheet_to_json(sheet);

console.log('原始数据总条数：', rawList.length);

// 2. 构建标准GeoJSON
const geojson = {
  type: "FeatureCollection",
  features: []
};

// 3. 同时收集没有经纬度的数据，后续做地理编码
const needGeocodeList = [];

let hasCoordCount = 0;
let noCoordCount = 0;

rawList.forEach(item => {
  const lng = Number(item['经度']);
  const lat = Number(item['纬度']);
  
  const feature = {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [lng, lat]
    },
    properties: {
      name: item['机构名称'] || '',
      category: item['机构类别'] || '',      // 医院/药店
      type: item['机构类型'] || '',          // 综合医院/儿童医院等
      level: item['机构等级'] || '',         // 三级甲等/二级等
      district: item['行政区'] || '',
      address: item['机构地址'] || '',
      phone: item['联系电话'] || '',
      remark: item['备注'] || ''
    }
  };

  // 判断是否有有效经纬度
  if (lng && lat && lng !== 0 && lat !== 0) {
    geojson.features.push(feature);
    hasCoordCount++;
  } else {
    // 没有经纬度的，收集起来待地理编码
    needGeocodeList.push({
      name: item['机构名称'] || '',
      address: item['机构地址'] || '',
      district: item['行政区'] || ''
    });
    noCoordCount++;
  }
});

// 4. 输出已有经纬度的GeoJSON
const outputPath = path.join(__dirname, './data/medical.geojson');
fs.writeFileSync(outputPath, JSON.stringify(geojson, null, 2), 'utf-8');

// 5. 输出待地理编码的列表（JSON格式，方便后续脚本读取）
const needGeocodePath = path.join(__dirname, './data/need_geocode.json');
fs.writeFileSync(needGeocodePath, JSON.stringify(needGeocodeList, null, 2), 'utf-8');

console.log('\n✅ 数据清洗完成！');
console.log('有经纬度的点位：', hasCoordCount, '条');
console.log('没有经纬度（待地理编码）：', noCoordCount, '条');
console.log('医疗GeoJSON输出：', outputPath);
console.log('待地理编码列表输出：', needGeocodePath);
