import request from '../api/request'
import { getUserInfo } from './storage'
function getUid(){
  const u = getUserInfo()
  if(!u) return null
  return {
    id: u.id ?? u.userId,
    role: u.role ?? ''
  }
}
/**
 * 生成弹窗HTML字符串
 * @param {Object} item 点位对象
 * @returns {string} html
 */
export function buildPointPopupHtml(item){
  return `
    <div class="info-win-root" data-popup-point-id="${item.id}">
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
    const rootDom = document.querySelector(`[data-popup-point-id="${item.id}"]`)
    if(!rootDom) return
    const domClose = rootDom.querySelector('.win-close')
    const domCollect = rootDom.querySelector('.btn-collect')
    const domRefresh = rootDom.querySelector('.btn-refresh')
    const domSubmit = rootDom.querySelector('.btn-submit')
    const domTa = rootDom.querySelector('.ta-comment')
    const domSel = rootDom.querySelector('.sel-star')
    const domCommentWrap = rootDom.querySelector('.comment-box')

    const userInfo = getUid()
    const currUserId = userInfo?.id
    const currUserRole = userInfo?.role

    domClose.onclick = ()=>{
      infoWin.close()
    }
    let isCollected = false
    let collectBusy = false
    let commentBusy = false
    let refreshBusy = false

    async function loadCollectStatus(){
      if(!currUserId) return
      try{
        const resCollect = await request.get(`/collect/myCollect/${currUserId}`)
        const collectList = Array.isArray(resCollect.data) ? resCollect.data : []
        isCollected = collectList.some(record => Number(record.point_id) === Number(item.id))
        domCollect.innerText = isCollected ? "取消收藏" : "收藏医疗点"
      }catch(e){
        console.error('获取收藏状态失败',e)
      }
    }

    domCollect.onclick = async ()=>{
      if(!currUserId){
        showToast("请先登录账号","warning")
        return
      }
      if(collectBusy) return
      collectBusy = true
      domCollect.disabled = true
      try{
        if(isCollected){
          await request.delete('/collect/cancelCollect',{
            data:{ user_id:currUserId, point_id:item.id }
          })
          showToast("已取消收藏","success")
          domCollect.innerText = "收藏医疗点"
          isCollected = false
        }else{
          await request.post('/collect/addCollect',{user_id:currUserId,point_id:item.id})
          showToast("收藏成功","success")
          domCollect.innerText = "取消收藏"
          isCollected = true
        }
      }catch(e){
        showToast(e?.msg||"操作失败","error")
      }finally{
        collectBusy = false
        domCollect.disabled = false
      }
    }

    //刷新留言
    async function refreshComment(){
      if(refreshBusy) return
      refreshBusy = true
      try{
        const resCom = await request.get(`/comment/list/${item.id}`)
        const list = resCom.data||[]
        if(list.length===0){
          domCommentWrap.innerHTML = `<div style="color:#9db8dd;font-size:13px;">暂无用户留言</div>`
          return
        }
        let s = ''
        list.forEach(c=>{
          const canDel = (currUserId && (currUserId === c.user_id || currUserRole === 'admin'))
          let delBtnHtml = ''
          if(canDel){
            delBtnHtml = `<button class="del-comment-btn" data-cid="${c.id}" style="margin-left:8px;background:transparent;border:1px solid rgba(255,95,95,0.35);color:#ff7878;padding:1px 7px;border-radius:3px;font-size:11px;cursor:pointer;">删除</button>`
          }
          s +=`
<div style="padding:6px 0;border-bottom:1px solid #27416b;color:#b3e5fc;font-size:13px;">
  用户：${c.username}｜${c.star}星
  ${delBtnHtml}
  <div style="margin-top:4px;">${c.content}</div>
</div>`
        })
        domCommentWrap.innerHTML = s

        const delBtns = domCommentWrap.querySelectorAll('.del-comment-btn')
        delBtns.forEach(btn=>{
          btn.onclick = async ()=>{
            const cid = Number(btn.dataset.cid)
            if(!currUserId){
              showToast("请登录","warning")
              return
            }
            if(btn.dataset.deleting === '1') return

            if(btn.dataset.confirmed !== '1'){
              btn.dataset.confirmed = '1'
              const originalText = btn.innerText
              btn.innerText = '再次确认删除'
              btn.style.background = '#c62828'
              btn.style.color = '#fff'
              btn.style.borderColor = '#c62828'

              setTimeout(()=>{
                if(btn.dataset.confirmed === '1'){
                  btn.dataset.confirmed = '0'
                  btn.innerText = originalText
                  btn.style.background = ''
                  btn.style.color = ''
                  btn.style.borderColor = ''
                }
              }, 3000)
              return
            }

            btn.dataset.confirmed = '0'
            btn.dataset.deleting = '1'
            btn.disabled = true
            try{
              await request.delete(`/comment/del/${cid}`,{
                data:{
                  user_id: currUserId,
                  user_role: currUserRole
                }
              })
              showToast("留言已删除","success")
              await refreshComment()
            }catch(err){
              showToast(err?.msg||"删除留言失败","error")
            }finally{
              btn.dataset.deleting = '0'
              btn.disabled = false
              btn.innerText = '删除'
              btn.style.background = ''
              btn.style.color = ''
              btn.style.borderColor = ''
            }
          }
        })
      }catch(err){
        domCommentWrap.innerHTML = `<div style="color:#ff7878;font-size:13px;">获取留言失败</div>`
      }finally{
        refreshBusy = false
      }
    }

    domRefresh.onclick = refreshComment

    //提交留言
    domSubmit.onclick = async ()=>{
      if(!currUserId){
        showToast("请先登录账号","warning")
        return
      }
      const text = domTa.value.trim()
      const star = Number(domSel.value)
      if(!text){
        showToast("留言不能为空","warning")
        return
      }
      if(commentBusy) return
      commentBusy = true
      domSubmit.disabled = true
      try{
        await request.post('/comment/add',{
          point_id:item.id,
          user_id:currUserId,
          content:text,
          star:star
        })
        showToast("留言提交成功","success")
        domTa.value = ''
        domSel.value = '3'
        await refreshComment()
      }catch(e){
        showToast(e?.msg||"提交留言失败","error")
      }finally{
        commentBusy = false
        domSubmit.disabled = false
      }
    }

    await Promise.all([loadCollectStatus(),refreshComment()])
  },120)
}
