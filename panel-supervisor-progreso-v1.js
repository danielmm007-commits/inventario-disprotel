(()=>{
  if(window.__panelSupervisorProgresoV1)return;
  window.__panelSupervisorProgresoV1=true;

  const PANEL='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-panel-supervisor';
  const GPS='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-panel-gps';
  const KEY='disprotel_login_general_v2';
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ses=()=>{try{return JSON.parse(sessionStorage.getItem(KEY)||'{}')}catch{return{}}};
  let cache=null,gps=[],loading=false;

  function deepestFrame(){
    let f=document.getElementById('base');
    for(let i=0;i<5&&f;i++){
      try{const n=f.contentDocument?.getElementById?.('base');if(!n)return f;f=n}catch{return f}
    }
    return f;
  }
  function context(){
    const f=deepestFrame();if(!f)return null;
    try{const d=f.contentDocument,w=f.contentWindow;if(!d||!w)return null;return{d,w}}catch{return null}
  }
  function events(o){return (o.eventos||[]).map(e=>norm(e.evento))}
  function progress(o){
    const s=norm(o.estado),ev=events(o);
    if(s==='COMPLETADA'||ev.includes('TRABAJO_CONCLUIDO'))return 5;
    if(ev.some(x=>x.includes('EVIDENCIA'))||s.includes('EVIDENCIA'))return 4;
    if(ev.includes('SOPORTE_EN_PROCESO')||s==='EN_PROCESO'||s==='EN PROCESO')return 3;
    if(ev.includes('SOPORTE_EN_CAMINO')||s.includes('CAMINO'))return 2;
    if(o.grupo_asignado||o.grupo_destino||ev.includes('TRABAJO_TOMADO')||ev.includes('RECEPCION_OT_CONFIRMADA')||s==='ACEPTADA'||s==='IP_ASIGNADA')return 1;
    return 0;
  }
  const steps=['Creada','Asignada','En camino','En trabajo','Evidencias','Finalizada'];
  function gpsFor(o){
    const id=norm(o.id_orden),g=norm(o.grupo_asignado||o.grupo_destino);
    return gps.find(p=>norm(p.id_orden)===id)||gps.find(p=>g&&norm(p.grupo)===g)||null;
  }
  function fmt(v){try{return new Date(v).toLocaleTimeString('es-EC',{hour:'2-digit',minute:'2-digit'})}catch{return''}}

  function ensureStyle(d){
    if(d.getElementById('otLiveProgressStyle'))return;
    const s=d.createElement('style');s.id='otLiveProgressStyle';s.textContent=`
      .otFlowLive{margin-top:12px;padding:13px;border:1px solid #d6e5ec;border-radius:15px;background:linear-gradient(135deg,#f9fcff,#eef7fc);overflow:hidden}.otFlowHead{display:flex;justify-content:space-between;gap:12px;align-items:center}.otFlowHead b{font-size:12px;color:#0b356f}.otFlowHead small{font-size:8px;color:#71858f}.otFlowStages{display:grid;grid-template-columns:repeat(6,1fr);gap:7px;margin-top:10px}.otFlowStage{position:relative;min-height:62px;padding:9px 8px;border:1px solid #dbe6ec;border-radius:11px;background:#fff;transition:.25s}.otFlowStage strong{display:block;font-size:20px;color:#0b356f}.otFlowStage span{display:block;margin-top:4px;font-size:7px;font-weight:1000;color:#667c87;text-transform:uppercase}.otFlowStage.live{border-color:#3a9fe5;box-shadow:0 0 0 4px #3a9fe514;animation:flowPulse 1.8s ease-in-out infinite}.otFlowStage.done{background:#eefaf3;border-color:#bfe6cf}.otFlowStage.done strong{color:#188254}
      .otLiveProgress{margin-top:10px;padding-top:9px;border-top:1px dashed #d7e3e9}.otProgressLine{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;position:relative}.otStep{position:relative;text-align:center;padding-top:18px;font-size:7px;color:#8a9aa2;font-weight:900}.otStep:before{content:'';position:absolute;left:50%;top:2px;width:11px;height:11px;margin-left:-5.5px;border-radius:50%;background:#d5dfe4;border:2px solid #fff;box-shadow:0 0 0 1px #c7d4da;z-index:2}.otStep:after{content:'';position:absolute;left:-50%;right:50%;top:7px;height:3px;background:#dbe4e8;z-index:1}.otStep:first-child:after{display:none}.otStep.done{color:#28704e}.otStep.done:before{background:#29a464;box-shadow:0 0 0 1px #29a464}.otStep.done:after{background:#69bf8e}.otStep.current{color:#0b5f9f}.otStep.current:before{background:#1689d0;box-shadow:0 0 0 5px #1689d01b;animation:otPulse 1.25s ease-in-out infinite}.otStep.current:after{background:linear-gradient(90deg,#69bf8e,#1689d0)}.otProgressMeta{display:flex;gap:8px;flex-wrap:wrap;margin-top:9px}.otMetaChip{padding:4px 7px;border-radius:999px;background:#edf6fb;color:#285a78;font-size:7px;font-weight:900}.otMetaChip.gps{background:#eaf8ef;color:#24754e}.work.otMoving{transition:.25s;box-shadow:0 7px 21px #176eb71a}.work.otMoving:hover{transform:translateY(-2px)}
      @keyframes otPulse{50%{box-shadow:0 0 0 9px #1689d00d}}@keyframes flowPulse{50%{transform:translateY(-2px);box-shadow:0 8px 22px #1689d01e}}@media(max-width:850px){.otFlowStages{grid-template-columns:repeat(3,1fr)}}@media(max-width:560px){.otFlowStages{grid-template-columns:repeat(2,1fr)}.otStep{font-size:6px}}
    `;d.head.appendChild(s)
  }

  function counts(orders){
    const c=[0,0,0,0,0,0];orders.forEach(o=>c[progress(o)]++);return c
  }
  function renderFlow(d,orders){
    const stats=d.getElementById('stats');if(!stats)return;
    let box=d.getElementById('otFlowLive');
    if(!box){box=d.createElement('div');box.id='otFlowLive';box.className='otFlowLive';stats.insertAdjacentElement('afterend',box)}
    const c=counts(orders),active=Math.max(0,...c.map((n,i)=>n?i:-1));
    box.innerHTML=`<div class="otFlowHead"><b>🧭 Avance operativo de las OT</b><small>Se actualiza automáticamente con los estados de campo</small></div><div class="otFlowStages">${steps.map((x,i)=>`<div class="otFlowStage ${i<active?'done':i===active&&c[i]?'live':''}"><strong>${c[i]}</strong><span>${x}</span></div>`).join('')}</div>`;
  }
  function renderCards(d,orders){
    const cards=[...d.querySelectorAll('.work')];
    cards.forEach(card=>{
      const text=norm(card.textContent);const o=orders.find(x=>x.id_orden&&text.includes(norm(x.id_orden)));if(!o)return;
      const p=progress(o),point=gpsFor(o);card.classList.toggle('otMoving',p>0&&p<5);
      let box=card.querySelector('.otLiveProgress');if(!box){box=d.createElement('div');box.className='otLiveProgress';card.appendChild(box)}
      const meta=[];
      if(point?.capturado_at)meta.push(`<span class="otMetaChip gps">📍 GPS ${fmt(point.capturado_at)}</span>`);
      if(o.updated_at)meta.push(`<span class="otMetaChip">↻ Actualizada ${fmt(o.updated_at)}</span>`);
      box.innerHTML=`<div class="otProgressLine">${steps.map((x,i)=>`<span class="otStep ${i<p?'done':i===p?'current':''}">${x}</span>`).join('')}</div><div class="otProgressMeta">${meta.join('')}</div>`;
    })
  }
  function enhance(){
    const c=context();if(!c||!cache)return false;const{d}=c;ensureStyle(d);
    const z=d.getElementById('zone')?.value||'SALCEDO';const orders=(cache.orders||[]).filter(o=>z==='TODAS'||o.zona===z);
    renderFlow(d,orders);renderCards(d,orders);return true
  }
  async function refresh(){
    if(loading)return;loading=true;
    const token=ses().session_token||'';if(!token){loading=false;return}
    try{
      const [a,b]=await Promise.all([
        fetch(PANEL,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','x-session':token},body:JSON.stringify({action:'dashboard'})}),
        fetch(GPS,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','x-session':token},body:'{}'})
      ]);
      const j=await a.json().catch(()=>({})),g=await b.json().catch(()=>({}));if(a.ok&&!j.error)cache=j;if(b.ok&&!g.error)gps=g.puntos||[];enhance()
    }catch(e){console.warn('panel-supervisor-progreso-v1',e)}finally{loading=false}
  }
  function observe(){const c=context();if(!c)return;const d=c.d;if(d.body&&!d.body.dataset.otProgressObserver){d.body.dataset.otProgressObserver='1';const mo=new MutationObserver(()=>{if(cache)enhance()});mo.observe(d.body,{childList:true,subtree:true})}}
  window.addEventListener('load',()=>setTimeout(()=>{refresh();observe()},900));
  setTimeout(()=>{refresh();observe()},1300);setInterval(()=>{refresh();observe()},10000);
})();