const express = require('express')
const axios = require('axios')
const router = express.Router()

// 从本地.env读取密钥，代码中无明文密钥
const API_KEY = process.env.API_KEY
const MODEL_EP_ID = process.env.MODEL_EP_ID
const ARK_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions"

// POST /api/ai/analysis AI点位分析接口
router.post('/analysis', async (req, res) => {
    try {
        // 判断环境变量是否读取成功
        if (!API_KEY || !MODEL_EP_ID) {
            return res.fail("AI配置缺失，请检查backend/.env文件")
        }
        const { prompt, pointData } = req.body

        // 请求火山方舟大模型
        const resp = await axios.post(
            ARK_BASE_URL,
            {
                model: MODEL_EP_ID,
                messages: [
                    { role: "system", content: "你是医疗地理数据分析助手，根据传入点位数据做分析" },
                    { role: "user", content: `${prompt}\n点位数据：${JSON.stringify(pointData)}` }
                ],
                temperature: 0.7
            },
            {
                headers: {
                    "Authorization": `Bearer ${API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        )

        res.success({
            msg: "AI分析完成",
            content: resp.data.choices[0].message.content
        })

    } catch (err) {
        console.error("AI接口报错：", err.response?.data || err.message)
        res.fail("AI服务调用失败")
    }
})

module.exports = router