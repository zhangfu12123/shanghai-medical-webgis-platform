<template>
  <div class="modal ai-modal" v-if="visible">
    <div class="modal-content ai-chat-wrap">
      <div class="ai-chat-header">
        <h4>AI就医咨询助手</h4>
        <div class="header-btn-group">
          <span class="clear-btn" @click="handleClearDialog">清除对话</span>
          <span class="close-btn" @click="$emit('close')">×</span>
        </div>
      </div>
      <!--聊天消息区域-->
      <div class="ai-chat-message" ref="aiMessageRef">
        <div class="msg-item ai-msg">
          <div class="msg-bubble ai-bubble">
            您好！我是医疗咨询助手，可以提供就医科普咨询，所有内容仅供科普，不能替代医生诊断。如果身体不适，建议前往医院就诊，遵从医生指导。
          </div>
        </div>
        <!-- 用户提问（靠右） + AI回复（靠左） -->
        <div class="dialog-block" v-for="(item,idx) in msgList" :key="idx">
          <div class="msg-item user-msg">
            <div class="msg-bubble user-bubble">{{item.question}}</div>
          </div>
          <div class="msg-item ai-msg">
            <div class="msg-bubble ai-bubble">{{item.answer}}</div>
          </div>
        </div>
      </div>
      <!--输入区域，按钮高度与输入框对齐-->
      <div class="ai-chat-input-row">
        <textarea
          v-model="inputText"
          placeholder="请输入咨询问题..."
          :disabled="loading"
          @keyup.enter.prevent="handleSend"
        ></textarea>
        <button class="btn-primary send-btn" @click="handleSend" :disabled="loading">
          发送
        </button>
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
.modal{
  position:fixed;
  inset:0;
  background:rgba(0,0,0,0.5);
  display:flex;
  align-items:center;
  justify-content:center;
  z-index:2000;
}
.ai-modal .modal-content.ai-chat-wrap{
  width:520px;
  height:600px;
  display:flex;
  flex-direction:column;
  padding:16px;
  background:#0d1c33;
  border:1px solid #27416b;
  border-radius:6px;
}
.ai-chat-header{
  display:flex;
  justify-content:space-between;
  align-items:center;
  margin-bottom:10px;
}
.ai-chat-header h4{
  margin:0;
  color:#4fc3f7;
}
.header-btn-group{
  display:flex;
  gap:14px;
  align-items:center;
}
.clear-btn{
  cursor:pointer;
  font-size:13px;
  color:#4fc3f7;
}
.clear-btn:hover{
  color:#ffffff;
}
.close-btn{
  cursor:pointer;
  font-size:18px;
  color:#9db8dd;
}
.close-btn:hover{color:#fff;}

.ai-chat-message{
  flex:1;
  overflow-y:auto;
  border:1px solid #27416b;
  border-radius:4px;
  padding:10px;
  background:#0a1728;
  margin-bottom:12px;
}
.dialog-block{
  margin-bottom:16px;
}
.msg-item{
  margin-bottom:6px;
}
.msg-bubble{
  padding:8px 10px;
  border-radius:4px;
  white-space:pre-wrap;
  font-size:13px;
  line-height:1.6;
  max-width:90%;
}
/* AI消息居左 */
.ai-msg{
  display:flex;
  justify-content:flex-start;
}
/* 用户消息居右 */
.user-msg{
  display:flex;
  justify-content:flex-end;
}

.user-bubble{
  background:rgba(30,136,229,0.25);
}
.ai-bubble{
  background:rgba(79,195,247,0.12);
}

/* 输入行，按钮和输入框等高 */
.ai-chat-input-row{
  display:flex;
  gap:8px;
  align-items: stretch;
}
.ai-chat-input-row textarea{
  flex:1;
  min-height:60px;
  background:#0a1728;
  border:1px solid #27416b;
  color:#d0e4ff;
  border-radius:4px;
  padding:6px;
  resize:none;
}
.send-btn{
  width:80px;
  border:none;
  border-radius:4px;
  background:#1e88e5;
  color:#fff;
  cursor:pointer;
}
.send-btn:disabled{
  opacity:0.6;
  cursor:not-allowed;
}
</style>