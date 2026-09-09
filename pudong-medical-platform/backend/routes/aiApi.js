const express = require('express')
const axios = require('axios')
const router = express.Router()

const API_KEY = process.env.API_KEY
const MODEL_EP_ID = process.env.MODEL_EP_ID
const ARK_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions"

router.post('/chat', async (req, res) => {
  try {
    if (!API_KEY || !MODEL_EP_ID) {
      return res.success({
        answer: "AI配置缺失，请检查后端.env文件。"
      })
    }
    const { userMessage } = req.body
    const resp = await axios.post(
      ARK_BASE_URL,
      {
        model: MODEL_EP_ID,
        messages: [
          {
            role:"system",
            content:"你是AI就医咨询助手，可以提供医疗科普、就医建议。回复开头必须提醒：本内容仅为科普参考，不能替代执业医师诊断，身体不适请及时线下就医。回答条理清晰，简短。"
          },
          { role:"user", content: userMessage }
        ],
        temperature:0.7
      },
      {
        headers:{
          "Authorization":`Bearer ${API_KEY}`,
          "Content-Type":"application/json"
        },
        validateStatus: (status) => status < 500,
        timeout:15000
      }
    )

    if(resp.status === 400){
      return res.success({
        answer:"本内容仅为科普参考，不能替代执业医师诊断。如果身体不适，建议前往医院就诊，遵从医生指导。"
      })
    }

    res.success({
      answer: resp.data.choices[0].message.content
    })

  } catch(err){
    return res.success({
      answer:"本内容仅为科普参考，不能替代执业医师诊断。如果身体不适，建议前往医院就诊，遵从医生指导。"
    })
  }
})

module.exports = router