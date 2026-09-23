<template>
  <div class="modal ai-modal" v-if="visible">
    <div class="modal-content ai-chat-wrap">
      <div class="ai-chat-header">
        <div class="ai-title-box">
          <h4>🩺 AI就医咨询助手</h4>
          <span class="ai-status">● 在线服务</span>
        </div>
        <div class="header-btn-group">
          <span class="clear-btn" @click="handleClearDialog">清除对话</span>
          <span class="close-btn" @click="$emit('close')">×</span>
        </div>
      </div>
      <div class="ai-chat-message" ref="aiMessageRef">
        <div class="msg-item ai-msg">
          <div class="msg-avatar">🤖</div>
          <div class="msg-bubble ai-bubble">
            您好！我是医疗咨询助手，可以提供就医科普咨询、医院科室咨询、医疗资源查询等服务。所有内容仅供科普参考，不能替代医生诊断。
          </div>
        </div>
        <div class="dialog-block" v-for="(item,idx) in msgList" :key="idx">
          <div class="msg-item user-msg">
            <div class="msg-bubble user-bubble">{{item.question}}</div>
            <div class="msg-avatar">👤</div>
          </div>
          <div class="msg-item ai-msg">
            <div class="msg-avatar">🤖</div>
            <div class="msg-bubble ai-bubble">{{item.answer}}</div>
          </div>
        </div>
        <div class="loading-tip" v-if="loading">🤖 正在分析您的问题...</div>
      </div>
      <div class="ai-chat-input-row">
        <textarea v-model="inputText" placeholder="请输入健康问题" :disabled="loading" @keyup.enter.prevent="handleSend"></textarea>
        <button class="btn-primary send-btn" @click="handleSend" :disabled="loading">发送 →</button>
      </div>
    </div>
  </div>
</template>
<script setup>
import {ref,nextTick,defineProps,defineEmits} from 'vue'
import request from '../api/request'
const props = defineProps({
  visible:{
    type:Boolean,
    default:false
  }
})
const emit = defineEmits(['close'])
const aiMessageRef = ref(null)
const inputText = ref('')
const loading = ref(false)
//每一组：question用户问题，answerAI回答
const msgList = ref([])

async function handleSend(){
  const text = inputText.value.trim()
  if(!text || loading.value) return
  loading.value = true
  msgList.value.push({
    question:text,
    answer:""
  })
  inputText.value = ''
  await nextTick()
  scrollBottom()
  try {
    const res = await request.post('/ai/chat',{ userMessage:text })
    const last = msgList.value[msgList.value.length -1]
    last.answer = res.data.answer
  }catch(err){
    const last = msgList.value[msgList.value.length -1]
    last.answer = "本内容仅为科普参考，不能替代执业医师诊断。如果身体不适，建议前往医院就诊，遵从医生指导。"
  }finally {
    loading.value = false
    await nextTick()
    scrollBottom()
  }
}

function scrollBottom(){
  if(aiMessageRef.value){
    aiMessageRef.value.scrollTop = aiMessageRef.value.scrollHeight
  }
}

//清除当前对话
function handleClearDialog(){
  inputText.value = ''
  msgList.value = []
  loading.value = false
}

//弹窗关闭清空会话
function clearChat(){
  handleClearDialog()
}

defineExpose({ clearChat })
</script>
<style scoped>
.modal{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:2000}
.ai-modal .modal-content.ai-chat-wrap{width:620px;height:650px;display:flex;flex-direction:column;padding:18px;background:#091a30;border:1px solid #28507c;border-radius:12px;box-shadow:0 0 30px rgba(0,150,255,.18)}
.ai-chat-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
.ai-title-box h4{margin:0;color:#55d5ff;font-size:20px}
.ai-status{font-size:12px;color:#58e0b0}
.header-btn-group{display:flex;gap:18px;align-items:center}.clear-btn{cursor:pointer;color:#55d5ff}.close-btn{cursor:pointer;color:#aac5e8;font-size:22px}
.ai-chat-message{flex:1;overflow-y:auto;border:1px solid #214266;border-radius:10px;padding:16px;background:rgba(5,18,35,.85);margin-bottom:14px}
.dialog-block{margin-bottom:18px}.msg-item{display:flex;align-items:flex-start;gap:8px;margin-bottom:10px}.user-msg{justify-content:flex-end}.msg-avatar{font-size:18px;line-height:32px}.msg-bubble{padding:10px 14px;border-radius:10px;white-space:pre-wrap;font-size:14px;line-height:1.65;max-width:82%}.ai-bubble{background:rgba(79,195,247,.13);border:1px solid rgba(79,195,247,.18);color:#e4f3ff}.user-bubble{background:rgba(30,136,229,.28);color:#fff}.loading-tip{color:#59d8ff;font-size:13px}
.ai-chat-input-row{
  display:flex;
  gap:10px;
  align-items:center;
}

.ai-chat-input-row textarea{
  flex:1;
  height:46px;
  min-height:46px;
  max-height:46px;
  background:#071426;
  border:1px solid #274b72;
  color:#d8edff;
  border-radius:8px;
  padding:10px 12px;
  resize:none;
  overflow:hidden;
  line-height:24px;
  font-size:14px;
}

.ai-chat-input-row textarea::placeholder{
  color:#7893b2;
}

.send-btn{
  height:46px;
  width:96px;
  border:none;
  border-radius:8px;
  background:#1688e8;
  color:white;
  cursor:pointer;
  font-size:14px;
  font-weight:600;
  transition:.2s;
}

.send-btn:hover{
  background:#2498f5;
}

.send-btn:disabled{
  opacity:.6;
  cursor:not-allowed;
}
</style>