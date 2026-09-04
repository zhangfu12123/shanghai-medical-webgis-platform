const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, '上海市医疗机构与药店名录（单表版·含坐标）.xlsx');
const workbook = XLSX.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet);

console.log('=== 工作表名称 ===');
console.log(workbook.SheetNames);
console.log('\n=== 总数据条数 ===');
console.log(data.length);
console.log('\n=== 列名（表头）===');
console.log(Object.keys(data[0]));
console.log('\n=== 前3条数据样例 ===');
console.log(JSON.stringify(data.slice(0, 3), null, 2));

// 统计有坐标的数量
let hasCoord = 0;
let noCoord = 0;
data.forEach(item => {
  const keys = Object.keys(item);
  const lngKey = keys.find(k => k.includes('经度') || k.includes('lng') || k.includes('longitude'));
  const latKey = keys.find(k => k.includes('纬度') || k.includes('lat') || k.includes('latitude'));
  const lng = Number(item[lngKey]);
  const lat = Number(item[latKey]);
  if (lng && lat && lng !== 0 && lat !== 0) {
    hasCoord++;
  } else {
    noCoord++;
  }
});
console.log('\n=== 坐标统计 ===');
console.log('有有效经纬度：', hasCoord, '条');
console.log('无经纬度：', noCoord, '条');
