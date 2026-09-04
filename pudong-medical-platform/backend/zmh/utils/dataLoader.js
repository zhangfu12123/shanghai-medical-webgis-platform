const fs = require('fs');
const path = require('path');

let medicalData = null;

function loadMedicalGeoJson() {
  if (!medicalData) {
    const filePath = path.join(__dirname, '../data/medical.geojson');
    const str = fs.readFileSync(filePath, 'utf-8');
    medicalData = JSON.parse(str);
    console.log('📦 医疗数据已加载，共', medicalData.features.length, '个点位');
  }
  return medicalData;
}

module.exports = { loadMedicalGeoJson };
