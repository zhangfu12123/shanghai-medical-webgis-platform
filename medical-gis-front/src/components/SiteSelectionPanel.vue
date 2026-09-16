<template>
  <div class="site-panel">
    <div class="side-head">
      <div>
        <span class="side-kicker">SITE CANDIDATES</span>
        <strong>候选选址记录</strong>
      </div>
      <div class="site-head-tools">
        <button class="site-refresh" @click="fetchSiteList" title="刷新列表">刷新</button>
        <span class="side-index">03</span>
      </div>
    </div>

    <div class="site-list">
      <div v-if="list.length === 0" class="empty-tip">暂无保存的选址记录</div>
      <div v-for="item in list" :key="item.id" class="site-item">
        <div class="si-top">
          <b class="si-name">{{ item.eval_name || '未命名评估' }}</b>
          <span class="si-time">{{ formatTime(item.create_time) }}</span>
        </div>
        <div class="si-coord">经 {{ item.lng }} · 纬 {{ item.lat }}</div>

        <template v-if="parseAnalyze(item.resultJson)">
          <div class="si-analyze">
            <span class="si-badge" :class="levelClass(parseAnalyze(item.resultJson).densityLevel)">
              {{ parseAnalyze(item.resultJson).densityLevel }}
            </span>
            <div class="si-grid">
              <div><span>分析半径</span><b>{{ parseAnalyze(item.resultJson).radius }} 米</b></div>
              <div><span>周边点位</span><b>{{ parseAnalyze(item.resultJson).aroundCount }} 个</b></div>
            </div>
            <div class="si-suggest">{{ parseAnalyze(item.resultJson).suggestion }}</div>
          </div>
        </template>

        <div class="si-btns">
          <button class="si-locate" @click="$emit('locate-map',{lng:item.lng,lat:item.lat,analyzeResult:parseAnalyze(item.resultJson)})">地图定位</button>
          <button class="si-del" @click="openDeleteConfirm(item)">删除</button>
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
  triggerRefresh:{ type:Boolean, default:false }
})
defineEmits(['locate-map'])
const list = ref([])
const deleteVisible = ref(false)
const deleteTarget = ref(null)

function parseAnalyze(str){
  if(!str) return null
  try{ return JSON.parse(str) }catch(e){ return null }
}

function levelClass(level){
  const l = String(level || '')
  if(l.includes('稀缺')) return 'lv-low'
  if(l.includes('适中')) return 'lv-mid'
  if(l.includes('密集')) return 'lv-high'
  return ''
}

function formatTime(str){
  if(!str) return ''
  const d = new Date(str)
  const p = n => String(n).padStart(2,'0')
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
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
  if(v) fetchSiteList()
},{immediate:true})
</script>

<style scoped>
.site-panel{
  height:100%;
  display:flex;
  flex-direction:column;
  min-height:0;
}
.site-head-tools{
  display:flex;
  align-items:center;
  gap:7px;
}
.site-refresh{
  padding:4px 8px;
  background:rgba(79,195,247,.08);
  border:1px solid rgba(79,195,247,.25);
  color:#9fd0ea;
  border-radius:3px;
  cursor:pointer;
  font-size:9px;
  letter-spacing:1px;
  line-height:1;
}
.site-refresh:hover{
  background:rgba(79,195,247,.2);
  color:#d7efff;
}
.site-list{
  flex:1;
  min-height:0;
  overflow-y:auto;
  margin-top:8px;
  padding-right:2px;
}
.site-list::-webkit-scrollbar{ width:5px; }
.site-list::-webkit-scrollbar-thumb{ background:rgba(79,195,247,.25); border-radius:3px; }
.site-list::-webkit-scrollbar-track{ background:rgba(79,195,247,.04); }
.empty-tip{
  color:#52789a;
  font-size:10px;
  text-align:center;
  padding:22px 0;
  letter-spacing:1px;
}
.site-item{
  border:1px solid rgba(79,195,247,.14);
  border-radius:4px;
  padding:10px 11px;
  margin-bottom:8px;
  background:linear-gradient(180deg,rgba(79,195,247,.045),rgba(79,195,247,.012));
  position:relative;
}
.site-item::before{
  content:"";
  position:absolute;
  left:0; top:0;
  width:14px; height:1px;
  background:#4fc3f7;
  box-shadow:0 0 6px rgba(79,195,247,.5);
}
.si-top{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:8px;
}
.si-name{
  font-size:12px;
  font-weight:600;
  color:#dff1ff;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.si-time{
  flex:none;
  font-size:8px;
  color:#5d86a6;
  letter-spacing:.5px;
}
.si-coord{
  font-size:9px;
  color:#6f93b2;
  margin-top:3px;
  letter-spacing:.5px;
}
.si-analyze{
  margin-top:8px;
  padding:8px 9px;
  background:rgba(79,195,247,.06);
  border:1px solid rgba(79,195,247,.11);
  border-radius:4px;
}
.si-badge{
  display:inline-block;
  font-size:10px;
  font-weight:600;
  padding:1px 7px;
  border-radius:999px;
  line-height:1.5;
}
.si-badge.lv-low{ color:#ff9d94; background:rgba(229,57,53,.14); border:1px solid rgba(229,57,53,.38); }
.si-badge.lv-mid{ color:#ffd54f; background:rgba(255,193,7,.10); border:1px solid rgba(255,193,7,.32); }
.si-badge.lv-high{ color:#8ef0c6; background:rgba(69,214,158,.10); border:1px solid rgba(69,214,158,.32); }
.si-grid{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:6px;
  margin-top:7px;
}
.si-grid > div{
  padding:6px 7px;
  border:1px solid rgba(79,195,247,.07);
  background:rgba(79,195,247,.02);
  min-width:0;
}
.si-grid span{
  display:block;
  color:#4d718e;
  font-size:7px;
  letter-spacing:.8px;
}
.si-grid b{
  display:block;
  margin-top:3px;
  color:#aac8df;
  font-size:9px;
  font-weight:500;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.si-suggest{
  margin-top:7px;
  padding-top:6px;
  border-top:1px dashed rgba(79,195,247,.12);
  color:#ffecb3;
  font-size:9px;
  line-height:1.6;
}
.si-btns{
  display:flex;
  gap:7px;
  margin-top:9px;
}
.si-locate{
  flex:1;
  min-width:0;
  height:27px;
  background:rgba(79,195,247,.13);
  border:1px solid rgba(79,195,247,.4);
  color:#c7e6ff;
  border-radius:3px;
  cursor:pointer;
  font-size:11px;
}
.si-locate:hover{ background:rgba(79,195,247,.24); }
.si-del{
  width:48px;
  flex:none;
  height:27px;
  background:rgba(220,50,50,.14);
  border:1px solid rgba(221,68,68,.36);
  color:#ffcaca;
  border-radius:3px;
  cursor:pointer;
  font-size:11px;
}
.si-del:hover{ background:rgba(220,50,50,.25); }

.confirm-mask{
  position:fixed;
  inset:0;
  background:rgba(0,0,0,.45);
  display:flex;
  align-items:center;
  justify-content:center;
  z-index:9999;
}
.confirm-box{
  width:300px;
  background:linear-gradient(180deg,rgba(11,32,67,.99),rgba(5,17,37,.99));
  border:1px solid rgba(79,195,247,.42);
  border-radius:8px;
  padding:16px 18px;
  box-shadow:0 16px 40px rgba(0,0,0,.5);
}
.confirm-title{
  font-size:15px;
  color:#4fc3f7;
  font-weight:600;
}
.confirm-text{
  font-size:12px;
  color:#b8d4ff;
  line-height:1.6;
  margin:12px 0 16px;
}
.confirm-buttons{
  display:flex;
  gap:10px;
}
.confirm-buttons button{
  flex:1;
  height:32px;
  border-radius:4px;
  border:none;
  cursor:pointer;
  font-size:12px;
}
.btn-cancel{ background:rgba(255,255,255,.08); color:#cfe3ff; }
.btn-cancel:hover{ background:rgba(255,255,255,.14); }
.btn-confirm{ background:rgba(220,50,50,.5); color:#fff; }
.btn-confirm:hover{ background:rgba(220,50,50,.7); }
</style>