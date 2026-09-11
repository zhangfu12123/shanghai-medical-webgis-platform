<template>
  <div class="site-panel">
    <div class="panel-head">
      <h4>🏥 候选选址记录</h4>
      <button class="btn-refresh" @click="fetchSiteList">刷新列表</button>
    </div>
    <div class="site-list">
      <div v-if="list.length ===0" class="empty-tip">暂无保存的选址记录<br></div>
      <div v-for="item in list" :key="item.id" class="site-item">
        <div class="item-name">{{item.eval_name}}</div>
        <div class="item-coord">经度：{{item.lng}}｜纬度：{{item.lat}}</div>
        <div class="item-time">保存时间：{{formatTime(item.create_time)}}</div>
        <div v-if="parseAnalyze(item.resultJson)" class="analyze-block">
          <div>📊{{parseAnalyze(item.resultJson).densityLevel}}</div>
          <div>分析半径：{{parseAnalyze(item.resultJson).radius}}米</div>
          <div>周边点位：{{parseAnalyze(item.resultJson).aroundCount}}个</div>
          <div class="suggest-text">{{parseAnalyze(item.resultJson).suggestion}}</div>
        </div>
        <div class="item-btn-row">
          <button class="btn-locate" @click="$emit('locate-map',{lng:item.lng,lat:item.lat,analyzeResult:parseAnalyze(item.resultJson)})">地图定位</button>
          <button class="btn-del" @click="openDeleteConfirm(item)">删除</button>
        </div>
      </div>
    </div>

    <div v-if="deleteVisible" class="confirm-mask" @click.self="deleteVisible = false">
      <div class="confirm-box">
        <div class="confirm-title">确认删除</div>
        <div class="confirm-text">删除后不可恢复，是否删除该条选址记录？</div>
        <div class="confirm-buttons">
          <button class="btn-cancel" @click="deleteVisible = false">取消</button>
          <button class="btn-confirm" @click="confirmDelete">确定删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {ref,watch} from 'vue'
import request from '../api/request'
const props = defineProps({
  triggerRefresh:{
    type:Boolean,
    default:false
  }
})
const emit = defineEmits(['locate-map'])
const list = ref([])
const deleteVisible = ref(false)
const deleteTarget = ref(null)

function parseAnalyze(str){
  if(!str) return null
  try{
    return JSON.parse(str)
  }catch(e){
    return null
  }
}

function formatTime(str){
  if(!str) return ''
  const d = new Date(str)
  return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
}

async function fetchSiteList(){
  try{
    const res = await request.get('/site/list')
    list.value = res.data || []
  }catch(e){
    console.error("获取选址列表失败",e)
  }
}

function openDeleteConfirm(row){
  deleteTarget.value = row
  deleteVisible.value = true
}

async function confirmDelete(){
  if(!deleteTarget.value) return
  try{
    await request.delete(`/site/del?id=${deleteTarget.value.id}`)
    await fetchSiteList()
    deleteVisible.value = false
    deleteTarget.value = null
  }catch(e){
    console.error(e)
    alert("删除失败")
  }
}

watch(()=>props.triggerRefresh,(v)=>{
  if(v){
    fetchSiteList()
  }
},{immediate:true})
</script>

<style scoped>
.site-panel{
  height:100%;
  display:flex;
  flex-direction:column;
}
.panel-head{
  display:flex;
  justify-content:space-between;
  align-items:center;
  margin-bottom:12px;
}
.panel-head h4{
  margin:0;
  color:#4fc3f7;
  font-size:15px;
}
.btn-refresh{
  padding:4px 8px;
  background:#1e88e522;
  border:1px solid #2e5080;
  color:#d0e4ff;
  border-radius:4px;
  cursor:pointer;
}
.site-list{
  flex:1;
  overflow-y:auto;
}
.empty-tip{
  color:#89a3c7;
  font-size:13px;
  text-align:center;
  padding:20px 0;
}
.site-item{
  border:1px solid #27416b;
  border-radius:6px;
  padding:10px;
  margin-bottom:8px;
  background:rgba(255,255,255,0.02);
}
.item-name{
  font-size:14px;
  color:#e0edff;
  margin-bottom:4px;
}
.item-coord{
  font-size:12px;
  color:#9db8dd;
  margin-bottom:4px;
}
.item-time{
  font-size:11px;
  color:#778fa9;
  margin-bottom:8px;
}
.analyze-block{
  padding:8px;
  background:rgba(79,195,247,0.08);
  border-radius:4px;
  font-size:12px;
  color:#b3e5fc;
  margin:6px 0;
  line-height:1.6;
}
.suggest-text{
  color:#ffd54f;
}
.item-btn-row{
  display:flex;
  gap:8px;
}
.btn-locate{
  flex:1;
  padding:4px 10px;
  background:rgba(79,195,247,0.15);
  border:1px solid #4fc3f7;
  color:#c7e6ff;
  border-radius:4px;
  cursor:pointer;
  font-size:12px;
}
.btn-del{
  flex:1;
  padding:4px 10px;
  background:rgba(220,50,50,0.18);
  border:1px solid #dd4444;
  color:#ffcaca;
  border-radius:4px;
  cursor:pointer;
  font-size:12px;
}

/* 自定义删除确认弹窗 */
.confirm-mask{
  position:fixed;
  inset:0;
  background:rgba(0,0,0,0.45);
  display:flex;
  align-items:center;
  justify-content:center;
  z-index:9999;
}
.confirm-box{
  width:320px;
  background:#0d1c33;
  border:1px solid #27416b;
  border-radius:10px;
  padding:18px;
  box-shadow:0 8px 24px rgba(0,0,0,0.35);
}
.confirm-title{
  font-size:15px;
  color:#4fc3f7;
  font-weight:bold;
  margin-bottom:8px;
}
.confirm-text{
  font-size:13px;
  color:#b8d4ff;
  line-height:1.6;
  margin-bottom:14px;
}
.confirm-buttons{
  display:flex;
  gap:10px;
}
.confirm-buttons button{
  flex:1;
  height:34px;
  border-radius:6px;
  border:none;
  cursor:pointer;
  font-size:13px;
}
.btn-cancel{
  background:#2a3d5c;
  color:#d0e4ff;
}
.btn-cancel:hover{
  background:#35496b;
}
.btn-confirm{
  background:#b71c1c;
  color:#fff;
}
.btn-confirm:hover{
  background:#c62828;
}
</style>
