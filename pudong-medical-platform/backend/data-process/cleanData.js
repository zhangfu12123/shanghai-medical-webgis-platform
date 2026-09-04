const fs = require('fs')
const { getPool, sql } = require('../db/db')

async function importMedicalPoint() {
    const pool = getPool()
    const raw = fs.readFileSync("./static/point_raw.geojson", "utf8")
    const geo = JSON.parse(raw)
    for (let f of geo.features) {
        const props = f.properties
        const lng = f.geometry.coordinates[0]
        const lat = f.geometry.coordinates[1]
        await pool.request()
            .input('name', sql.NVarChar, props.name || "")
            .input('type', sql.NVarChar, props.type || "药店")
            .input('address', sql.NVarChar, props.address || "")
            .input('phone', sql.NVarChar, props.phone || "")
            .input('level', sql.NVarChar, props.level || "")
            .input('lng', sql.Decimal(12, 8), lng)
            .input('lat', sql.Decimal(12, 8), lat)
            .query(`insert into medical_point(name,type,address,phone,level,lng,lat) 
                    values(@name,@type,@address,@phone,@level,@lng,@lat)`)
    }
    console.log("✅医疗点位导入完成")
}

//node dataprocess/cleanData.js 执行导入
;(async () => {
    await importMedicalPoint()
})()
