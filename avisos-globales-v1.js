(()=>{
  if(window.__disprotelAvisosGlobalesV1)return;
  window.__disprotelAvisosGlobalesV1=true;

  const css=document.createElement('style');
  css.textContent=`
    #disprotelToastHost{position:fixed;inset:0;z-index:2147483000;pointer-events:none;display:grid;place-items:center;padding:18px}
    #disprotelToast{width:min(520px,92vw);display:none;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;padding:16px 16px 16px 18px;border-radius:16px;background:#fff;border:2px solid #d8e4ea;box-shadow:0 22px 65px rgba(4,30,55,.28);font-family:Arial,Helvetica,sans-serif;pointer-events:auto;animation:dtToastIn .18s ease both}
    #disprotelToast.show{display:grid}
    #disprotelToast.ok{border-color:#62c990;background:#f2fff7;color:#155c39}
    #disprotelToast.err{border-color:#e47b89;background:#fff5f6;color:#8c2534}
    #disprotelToast .dtIcon{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;font-size:21px;font-weight:900;background:#eef5f8}
    #disprotelToast.ok .dtIcon{background:#dff7e9;color:#177347}
    #disprotelToast.err .dtIcon{background:#ffe1e5;color:#a92f42}
    #disprotelToast .dtText{font-size:14px;line-height:1.35;font-weight:800;overflow-wrap:anywhere}
    #disprotelToast .dtClose{width:34px;height:34px;min-width:34px;margin:0;padding:0;border:0;border-radius:9px;background:rgba(20,50,70,.08);color:inherit;font-size:19px;font-weight:900;cursor:pointer;box-shadow:none}
    @keyframes dtToastIn{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:none}}
  `;
  document.head.appendChild(css);

  const host=document.createElement('div');host.id='disprotelToastHost';
  host.innerHTML='<div id="disprotelToast" role="alert" aria-live="assertive"><div class="dtIcon">!</div><div class="dtText"></div><button type="button" class="dtClose" aria-label="Cerrar">×</button></div>';
  document.body.appendChild(host);
  const toast=host.querySelector('#disprotelToast'),text=host.querySelector('.dtText'),icon=host.querySelector('.dtIcon');
  let timer=null,lastKey='',lastAt=0;
  function close(){toast.className='';clearTimeout(timer)}
  host.querySelector('.dtClose').onclick=close;
  function show(message,type='err'){
    message=String(message||'').trim();if(!message)return;
    const key=type+'|'+message,now=Date.now();if(key===lastKey&&now-lastAt<1200)return;lastKey=key;lastAt=now;
    clearTimeout(timer);toast.className='show '+(type==='ok'?'ok':'err');text.textContent=message;icon.textContent=type==='ok'?'✓':'!';
    timer=setTimeout(close,type==='ok'?2600:4200);
  }
  window.disprotelAviso=show;

  const seen=new WeakSet();
  function watchDocument(doc){
    if(!doc||seen.has(doc))return;seen.add(doc);
    const inspect=el=>{
      if(!(el instanceof doc.defaultView.HTMLElement))return;
      const candidates=el.matches?.('.msg,.err,.ok')?[el]:[...el.querySelectorAll?.('.msg,.err,.ok')||[]];
      candidates.forEach(node=>{
        const message=node.textContent?.trim();if(!message)return;
        const style=doc.defaultView.getComputedStyle(node);if(style.display==='none'||style.visibility==='hidden')return;
        const type=node.classList.contains('err')?'err':node.classList.contains('ok')?'ok':null;if(type)show(message,type);
      });
    };
    const observer=new MutationObserver(muts=>muts.forEach(m=>{if(m.type==='attributes'||m.type==='characterData')inspect(m.target.nodeType===3?m.target.parentElement:m.target);m.addedNodes.forEach(n=>n.nodeType===1&&inspect(n))}));
    observer.observe(doc.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','style']});
  }
  function hookFrames(){
    document.querySelectorAll('iframe').forEach(frame=>{
      if(frame.dataset.dtToastHook==='1')return;frame.dataset.dtToastHook='1';
      const hook=()=>{try{watchDocument(frame.contentDocument)}catch{}};
      frame.addEventListener('load',hook);hook();
    });
  }
  watchDocument(document);hookFrames();
  new MutationObserver(hookFrames).observe(document.documentElement,{subtree:true,childList:true});
})();