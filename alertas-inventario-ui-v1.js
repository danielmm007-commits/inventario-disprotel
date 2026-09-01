(()=>{
  if(window.__disprotelAlertasInventarioUIV1)return;
  window.__disprotelAlertasInventarioUIV1=true;

  const API='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-alertas-pendientes';
  const KEY='disprotel_login_general_v2';
  let session={};try{session=JSON.parse(sessionStorage.getItem(KEY)||'{}')}catch{}
  if(!session?.session_token)return;

  let lastVersion=null,lastData=null,running=false;
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();

  const style=document.createElement('style');
  style.textContent=`
    .invAttentionHost{position:relative!important}
    .invAttentionHost.invNeedsAttention{border-color:#e3aa27!important;animation:invAttentionPulse 1.15s ease-in-out infinite!important;filter:saturate(1.12)}
    .invAttentionSymbol{position:absolute;right:8px;top:8px;z-index:20;display:grid;place-items:center;width:25px;height:25px;border-radius:50%;background:#d88b00;color:#fff;font-size:13px;font-weight:1000;box-shadow:0 4px 11px rgba(125,81,0,.3)}
    .invAttentionSymbol.hidden{display:none!important}
    @keyframes invAttentionPulse{0%,100%{box-shadow:0 0 0 0 rgba(227,170,39,.22),0 8px 22px rgba(9,43,92,.08);filter:brightness(1)}50%{box-shadow:0 0 0 8px rgba(227,170,39,.16),0 0 26px rgba(255,190,45,.42);filter:brightness(1.16)}}
  `;
  document.head.appendChild(style);

  async function getAlerts(){
    const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','x-session':session.session_token},body:'{}',cache:'no-store'});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||d.error)throw new Error(d.error||'No se pudieron consultar alertas');
    return d;
  }

  function mainCandidates(){
    return [...document.querySelectorAll('button,a,.module,.rootCard,.dashItem')].filter(el=>{
      const t=norm(el.textContent);
      return (t.includes('SOLICITUD')&&t.includes('TRANSFER'))||t.includes('SOLICITUDES Y TRANSFERENCIAS')||t.includes('TRANSFERENCIAS DE EQUIPOS');
    });
  }

  function mark(el,on){
    if(!el)return;
    el.classList.add('invAttentionHost');
    let sym=el.querySelector(':scope > .invAttentionSymbol');
    if(!sym){sym=document.createElement('span');sym.className='invAttentionSymbol hidden';sym.textContent='⚠';el.appendChild(sym)}
    el.classList.toggle('invNeedsAttention',!!on);
    sym.classList.toggle('hidden',!on);
  }

  function paintMain(total){
    const done=new Set();
    for(const el of mainCandidates()){
      const host=el.closest('.module,.rootCard,.dashItem,button,a')||el;
      if(done.has(host))continue;done.add(host);mark(host,total>0);
      host.querySelectorAll(':scope > .invAttentionText,:scope > .invAttentionBadge').forEach(x=>x.remove());
    }
  }

  function transferFrames(){return [...document.querySelectorAll('iframe')].filter(f=>/solicitudes-transferencias/i.test(String(f.src||'')))}

  function injectFrameStyle(doc){
    if(doc.getElementById('invAttentionFrameStyle'))return;
    const s=doc.createElement('style');s.id='invAttentionFrameStyle';
    s.textContent=`
      .invAttentionAction{position:relative!important}
      .invAttentionAction.invNeedsAttention{border-color:#e3aa27!important;animation:invActionPulse 1.15s ease-in-out infinite!important;filter:saturate(1.1)}
      .invAttentionAction .invInnerSymbol{position:absolute;right:9px;top:9px;display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:#d88b00;color:white;font-size:12px;font-weight:1000;z-index:8;box-shadow:0 4px 10px rgba(125,81,0,.28)}
      @keyframes invActionPulse{0%,100%{box-shadow:0 0 0 0 rgba(227,170,39,.2);filter:brightness(1)}50%{box-shadow:0 0 0 7px rgba(227,170,39,.14),0 0 22px rgba(255,190,45,.35);filter:brightness(1.14)}}
    `;
    doc.head.appendChild(s);
  }

  function markFrameButton(doc,id,on){
    const b=doc.getElementById(id);if(!b)return;
    b.classList.add('invAttentionAction');
    let s=b.querySelector(':scope > .invInnerSymbol');
    if(on&&!s){s=doc.createElement('span');s.className='invInnerSymbol';s.textContent='⚠';b.appendChild(s)}
    if(!on&&s)s.remove();
    b.classList.toggle('invNeedsAttention',!!on);
  }

  function paintInside(d){
    if(!d)return;
    const c=d.counts||{};
    for(const frame of transferFrames()){
      try{
        const doc=frame.contentDocument;if(!doc)continue;injectFrameStyle(doc);
        if(d.perfil==='ADMIN'){
          markFrameButton(doc,'supplyAction',Number(c.abastecimientos||0)>0);
          markFrameButton(doc,'directAction',Number(c.directas||0)>0);
          markFrameButton(doc,'bajaAction',Number(c.bajas||0)>0);
        }else if(d.perfil==='TECNICO'){
          const supplyAlert=Number(c.transferencias_por_recibir||0)>0||Number(c.abastecimientos_por_confirmar||0)>0;
          markFrameButton(doc,'supplyAction',supplyAlert);
          markFrameButton(doc,'directAction',false);
          markFrameButton(doc,'bajaAction',Number(c.bajas_pendientes||0)>0);
        }
      }catch{}
    }
  }

  function visibleTransferFrame(){
    return transferFrames().find(f=>{const s=getComputedStyle(f),r=f.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0})||null;
  }

  function refreshOpenModule(){
    const frame=visibleTransferFrame();if(!frame)return;
    try{if(typeof frame.contentWindow?.load==='function')frame.contentWindow.load()}catch{}
  }

  async function poll(){
    if(running)return;running=true;
    try{
      const d=await getAlerts(),changed=lastVersion!==null&&d.version!==lastVersion;
      lastData=d;paintMain(Number(d.total||0));paintInside(d);
      if(changed){refreshOpenModule();setTimeout(()=>paintInside(d),700)}
      lastVersion=d.version||'';
    }catch(e){console.warn('Alertas inventario:',e)}finally{running=false}
  }

  document.addEventListener('click',e=>{
    const el=e.target?.closest?.('button,a,.module,.rootCard,.dashItem');if(!el)return;
    const t=norm(el.textContent);
    if((t.includes('SOLICITUD')&&t.includes('TRANSFER'))||t.includes('TRANSFERENCIAS DE EQUIPOS'))setTimeout(()=>{poll();refreshOpenModule();if(lastData)setTimeout(()=>paintInside(lastData),500)},350);
  },true);

  const observer=new MutationObserver(()=>{if(lastData){paintMain(Number(lastData.total||0));paintInside(lastData)}});
  observer.observe(document.body,{childList:true,subtree:true});
  poll();
  setInterval(poll,10000);
})();