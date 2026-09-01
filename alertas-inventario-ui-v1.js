(()=>{
  if(window.__disprotelAlertasInventarioUIV1)return;
  window.__disprotelAlertasInventarioUIV1=true;

  const API='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-alertas-pendientes';
  const KEY='disprotel_login_general_v2';
  let session={};try{session=JSON.parse(sessionStorage.getItem(KEY)||'{}')}catch{}
  if(!session?.session_token)return;

  let lastVersion=null,lastTotal=null,running=false;
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();

  const style=document.createElement('style');
  style.textContent=`
    .invAttentionHost{position:relative!important}
    .invAttentionHost.invNeedsAttention{border-color:#e3aa27!important;box-shadow:0 0 0 0 rgba(227,170,39,.35)!important;animation:invAttentionPulse 1.5s ease-in-out infinite!important}
    .invAttentionBadge{position:absolute;right:8px;top:8px;z-index:8;display:inline-flex;align-items:center;justify-content:center;min-width:25px;height:25px;padding:0 7px;border-radius:999px;background:#d88b00;color:#fff;font-size:10px;font-weight:1000;line-height:1;box-shadow:0 4px 11px rgba(125,81,0,.28)}
    .invAttentionBadge.hidden{display:none!important}
    .invAttentionText{display:block;margin-top:5px;color:#8a5b00;font-size:9px;font-weight:900}
    @keyframes invAttentionPulse{0%,100%{box-shadow:0 0 0 0 rgba(227,170,39,.2)}50%{box-shadow:0 0 0 7px rgba(227,170,39,.12)}}
  `;
  document.head.appendChild(style);

  async function getAlerts(){
    const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','x-session':session.session_token},body:'{}',cache:'no-store'});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||d.error)throw new Error(d.error||'No se pudieron consultar alertas');
    return d;
  }

  function candidates(){
    return [...document.querySelectorAll('button,a,.module,.rootCard,.dashItem')].filter(el=>{
      const t=norm(el.textContent);
      return (t.includes('SOLICITUD')&&t.includes('TRANSFER'))||t.includes('SOLICITUDES Y TRANSFERENCIAS')||t.includes('TRANSFERENCIAS DE EQUIPOS');
    });
  }

  function paintMain(total,profile,counts){
    const hosts=candidates();
    for(const el of hosts){
      const host=el.closest('.module,.rootCard,.dashItem,button,a')||el;
      host.classList.add('invAttentionHost');
      let badge=host.querySelector(':scope > .invAttentionBadge');
      if(!badge){badge=document.createElement('span');badge.className='invAttentionBadge hidden';host.appendChild(badge)}
      badge.textContent=String(total||0);
      badge.classList.toggle('hidden',!(total>0));
      host.classList.toggle('invNeedsAttention',total>0);
      let txt=host.querySelector(':scope > .invAttentionText');
      if(!txt){txt=document.createElement('small');txt.className='invAttentionText';host.appendChild(txt)}
      if(total>0){
        if(profile==='ADMIN')txt.textContent=`Requiere atención · Abast. ${counts.abastecimientos||0} · Directas ${counts.directas||0} · Bajas ${counts.bajas||0}`;
        else if(profile==='TECNICO')txt.textContent=`Requiere atención · Por recibir ${counts.transferencias_por_recibir||0} · Abast. ${counts.abastecimientos_por_confirmar||0} · Bajas ${counts.bajas_pendientes||0}`;
        else txt.textContent='Requiere atención';
      }else txt.textContent='';
    }
  }

  function visibleTransferFrame(){
    const frames=[...document.querySelectorAll('iframe')].filter(f=>/solicitudes-transferencias/i.test(String(f.src||'')));
    return frames.find(f=>{const s=getComputedStyle(f);const r=f.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0})||null;
  }

  function refreshOpenModule(){
    const frame=visibleTransferFrame();
    if(!frame)return;
    try{if(typeof frame.contentWindow?.load==='function')frame.contentWindow.load()}catch{}
  }

  async function poll(){
    if(running)return;running=true;
    try{
      const d=await getAlerts(),changed=lastVersion!==null&&d.version!==lastVersion;
      paintMain(Number(d.total||0),d.perfil,d.counts||{});
      if(changed)refreshOpenModule();
      lastVersion=d.version||'';lastTotal=Number(d.total||0);
    }catch(e){console.warn('Alertas inventario:',e)}finally{running=false}
  }

  document.addEventListener('click',e=>{
    const el=e.target?.closest?.('button,a,.module,.rootCard,.dashItem');if(!el)return;
    const t=norm(el.textContent);
    if((t.includes('SOLICITUD')&&t.includes('TRANSFER'))||t.includes('TRANSFERENCIAS DE EQUIPOS'))setTimeout(()=>{poll();refreshOpenModule()},350);
  },true);

  const observer=new MutationObserver(()=>{if(lastTotal!==null)poll()});
  observer.observe(document.body,{childList:true,subtree:true});
  poll();
  setInterval(poll,10000);
})();