import request from '../api/request'
import { getUserInfo } from './storage'
function getUid(){
  const u = getUserInfo()
  if(!u) return null
  return u.id ?? u.userId
}
/**
 * 生成弹窗HTML字符串
 * @param {Object} item 点位对象
 * @returns {string} html
 */
export function buildPointPopupHtml(item){
  return `
    <div class="info-win-root">
      <span class="win-close">×</span>
      <h4 class="win-title">${item.name}</h4>
      <p class="win-row">类型：${item.type}</p>
      <p class="win-row">地址：${item.address||'无'}</p>
      <p class="win-row">电话：${item.phone||'无'}</p>
      <p class="win-row">等级：${item.level||'无'}</p>
      <div class="win-btn-group">
        <button class="btn-collect">收藏医疗点</button>
        <button class="btn-refresh">刷新留言</button>
      </div>
      <textarea class="ta-comment" placeholder="写下你的留言评价"></textarea>
      <div class="win-submit-row">
        <select class="sel-star">
          <option value="1">★</option>
          <option value="2">★★</option>
          <option value="3" selected>★★★</option>
          <option value="4">★★★★</option>
          <option value="5">★★★★★</option>
        </select>
        <button class="btn-submit">提交评价</button>
      </div>
      <div class="comment-box"></div>
    </div>
  `
}

/**
 * 给弹窗DOM绑定全部事件
 * @param {Object} infoWin 高德infoWin实例
 * @param {Object} item 当前点位数据
 * @param {Function} showToast 父组件toast回调
 */
export function bindPopupDomEvent(infoWin, item, showToast){
  setTimeout(async ()=>{
    const rootDom = document.querySelector('.info-win-root')
    if(!rootDom) return

    const domClose = rootDom.querySelector('.win-close')
    const domCollect = rootDom.querySelector('.btn-collect')
    const domRefresh = rootDom.querySelector('.btn-refresh')
    const domSubmit = rootDom.querySelector('.btn-submit')
    const domTa = rootDom.querySelector('.ta-comment')
    const domSel = rootDom.querySelector('.sel-star')
    const domCommentWrap = rootDom.querySelector('.comment-box')

    domClose.onclick = ()=>{
      infoWin.close()
    }

    //收藏
    domCollect.onclick = async ()=>{
      const uid = getUid()
      if(!uid){
        showToast("请先登录账号","warning")
        return
      }
      try{
        await request.post('/collect/addCollect',{user_id:uid,point_id:item.id})
        showToast("收藏成功","success")
      }catch(e){
        showToast(e?.msg||"收藏失败","error")
      }
    }

    //刷新留言
    async function refreshComment(){
      try{
        const resCom = await request.get(`/comment/list/${item.id}`)
        const list = resCom.data||[]
        if(list.length===0){
          domCommentWrap.innerHTML = `<div style="color:#9db8dd;font-size:13px;">暂无用户留言</div>`
        }else{
          let s = ''
          list.forEach(c=>{
            s +=`<div style="padding:5px 0;border-bottom:1px solid #27416b;color:#b3e5fc;font-size:13px;">用户：${c.content}｜${c.star}星</div>`
          })
          domCommentWrap.innerHTML = s
        }
      }catch(err){
        domCommentWrap.innerHTML = `<div style="color:#ff7878;font-size:13px;">获取留言失败</div>`
      }
    }
    domRefresh.onclick = refreshComment

    //提交留言
    domSubmit.onclick = async ()=>{
      const uid = getUid()
      if(!uid){
        showToast("请先登录账号","warning")
        return
      }
      const text = domTa.value.trim()
      const star = Number(domSel.value)
      if(!text){
        showToast("留言不能为空","warning")
        return
      }
      try{
        await request.post('/comment/add',{
          point_id:item.id,
          user_id:uid,
          content:text,
          star:star
        })
        showToast("留言提交成功","success")
        domTa.value = ''
        domSel.value = '3'
        await refreshComment()
      }catch(e){
        showToast(e?.msg||"提交留言失败","error")
      }
    }
    refreshComment()
  },120)
}