(()=>{
  if(window.__disprotelSupervisorMobileLiveV1)return;
  window.__disprotelSupervisorMobileLiveV1=true;

  const KEY='disprotel_login_general_v2';
  const API='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-panel-supervisor';
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,' ').toUpperCase();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let me={};try{me=JSON.parse(sessionStorage.getItem(KEY)||'{}')}catch{}
  if(!norm(me.rol).includes('SUPERVISOR TECNICO')||!matchMedia('(max-width:680px)').matches||!me.session_token)return;

  const style=document.createElement('style');
  style.id='supervisorMobileLiveV1Style';
  style.textContent=`
    body.supSupervisorMobile.panelMenu{background:#edf3f7!important;overflow:auto!important}
    body.supSupervisorMobile.panelMenu .topin{padding:4px 7px!important;gap:5px!important;min-height:48px!important}
    body.supSupervisorMobile.panelMenu .logoBox{width:58px!important;height:34px!important;flex:0 0 58px!important;border-radius:8px!important}
    body.supSupervisorMobile.panelMenu .brand{min-width:0!important;flex:1!important}.brand span{display:none!important}
    body.supSupervisorMobile.panelMenu .brand b{font-size:12px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
    body.supSupervisorMobile.panelMenu .panelTools{gap:4px!important;margin-left:auto!important}
    body.supSupervisorMobile.panelMenu>.topbar .panelConnected{min-height:27px!important;padding:0 7px!important;font-size:7px!important}
    body.supSupervisorMobile.panelMenu .userAvatar{width:34px!important;height:34px!important;font-size:17px!important;border-width:2px!important}
    body.supSupervisorMobile.panelMenu .logout{padding:6px 8px!important;font-size:10px!important;border-radius:9px!important}

    body.supSupervisorMobile.panelMenu.supMobileDashboard .menuAside{display:none!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .menuStage{display:block!important;width:100%!important;height:auto!important;min-height:calc(100dvh - 48px)!important;overflow:visible!important;border-radius:0!important;background:#edf3f7!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .mobileModuleBar{display:none!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .menuHome{display:block!important;min-height:calc(100dvh - 48px)!important;padding:8px!important;background:#edf3f7!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .menuDashboard{display:block!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .menuFrame{display:none!important}

    .supLive{display:grid;gap:9px;animation:supLiveIn .28s ease both}
    .supLiveHero{background:linear-gradient(130deg,#082755,#155d9f 66%,#159f9b);color:#fff;border-radius:18px;padding:15px;box-shadow:0 12px 26px #0b2a5c25}
    .supLiveTop{display:flex;align-items:flex-start;gap:8px}.supLiveTitle{flex:1;min-width:0}
    .supLiveTitle small{font-size:8px;letter-spacing:.12em;color:#b9e8ff;font-weight:1000}.supLiveTitle h1{margin:4px 0 3px;font-size:21px;line-height:1.05}.supLiveTitle p{margin:0;color:#dcefff;font-size:10px;line-height:1.35}
    .supLiveActions{display:flex;gap:6px}.supLiveActions button{border:1px solid #ffffff55;border-radius:10px;background:#ffffff18;color:#fff;min-width:36px;height:34px;padding:0 9px;font-size:10px;font-weight:1000}.supLiveActions button:active{transform:scale(.95)}
    .supLiveUpdate{margin-top:10px;font-size:8px;color:#ccecff;display:flex;justify-content:space-between;gap:8px}

    .supLiveKpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
    .supLiveKpi{background:#fff;border:1px solid #d8e5ec;border-radius:15px;padding:11px;min-height:91px;box-shadow:0 5px 16px #071a380b;position:relative;overflow:hidden}
    .supLiveKpi i{font-style:normal;font-size:19px}.supLiveKpi strong{display:block;margin-top:6px;font-size:25px;color:#0b4d83;line-height:1}.supLiveKpi b{display:block;margin-top:5px;font-size:9px;color:#29485b}.supLiveKpi small{display:block;margin-top:3px;color:#7b8c95;font-size:7px}
    .supLiveKpi.warn{border-color:#efd9a3;background:#fffdf7}.supLiveKpi.warn strong{color:#b96c00}.supLiveKpi.ok strong{color:#188254}.supLiveKpi.alert{border-color:#efc0c5}.supLiveKpi.alert strong{color:#c53042}

    .supLivePanel{background:#fff;border:1px solid #d8e5ec;border-radius:16px;overflow:hidden;box-shadow:0 5px 16px #071a380b}
    .supLiveHead{display:flex;align-items:center;gap:8px;padding:11px 12px;border-bottom:1px solid #e4ecef}.supLiveHead b{flex:1;color:#0d315b;font-size:13px}.supLiveHead small{font-size:7px;color:#738994}.supLiveHead button{border:0;background:#edf5fa;color:#0d5d9c;border-radius:8px;padding:6px 8px;font-size:8px;font-weight:1000}
    .supAttention{display:grid;gap:7px;padding:9px}.supAttentionItem{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px;align-items:center;padding:9px;border:1px solid #e2e9ed;border-radius:11px;background:#f9fbfc}.supAttentionItem.alert{background:#fff8ed;border-color:#f1d29d}.supAttentionItem i{font-style:normal;font-size:18px}.supAttentionItem b{display:block;color:#173d5c;font-size:9px}.supAttentionItem span{display:block;color:#70838d;font-size:8px;margin-top:2px}.supAttentionItem em{font-style:normal;border-radius:999px;padding:4px 6px;background:#e7f2f8;color:#145f91;font-size:7px;font-weight:1000}
    .supEmpty{padding:18px 12px;text-align:center;color:#758893;font-size:9px}

    .supGroups{display:grid;gap:7px;padding:9px}.supGroup{border:1px solid #e0e9ed;border-radius:11px;padding:9px;background:#fbfdfe}.supGroupTop{display:flex;gap:8px;align-items:center}.supGroupTop b{flex:1;font-size:10px;color:#133f66}.supGroupTop strong{font-size:13px;color:#0a6b9a}.supGroupMeta{display:flex;gap:7px;flex-wrap:wrap;margin-top:6px}.supChip{font-size:7px;font-weight:900;padding:4px 6px;border-radius:999px;background:#e9f4fa;color:#245d7e}.supChip.warn{background:#fff1df;color:#9b6200}.supChip.ok{background:#e7f7ed;color:#20764d}

    .supRecent{display:grid;gap:7px;padding:9px}.supRecentItem{padding:9px;border-bottom:1px solid #edf1f3}.supRecentItem:last-child{border-bottom:0}.supRecentItemTop{display:flex;gap:7px;align-items:center}.supRecentItemTop b{font-size:9px;color:#143e63}.supRecentItemTop em{margin-left:auto;font-style:normal;font-size:7px;padding:4px 6px;border-radius:999px;background:#eaf4fb;color:#155d91;font-weight:1000}.supRecentItem span{display:block;margin-top:3px;font-size:8px;color:#758893}

    @keyframes supLiveIn{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}
    @media(prefers-reduced-motion:reduce){.supLive{animation:none!important}}
  `;
  document.head.appendChild(style);

  let lastData=null,loading=false;
  function menuButton(label){
    const wanted=norm(label),aside=document.querySelector('.menuAside');
    return [...(aside?.querySelectorAll('button[data-href]')||[])].find(b=>norm(b.textContent).includes(wanted));
  }
  function openModule(label){const b=menuButton(label);if(b){document.body.classList.remove('supMobileDashboard');b.click()}}
  function showMenu(){
    document.body.classList.remove('supMobileDashboard','moduleOpen','erpMobileMenuOpen');
    const frame=document.querySelector('.menuFrame');if(frame){frame.src='about:blank';frame.style.visibility='hidden'}
    window.scrollTo(0,0);
  }
  function showDashboard(){
    document.body.classList.remove('moduleOpen','erpMobileMenuOpen');
    document.body.classList.add('supMobileDashboard');
    const frame=document.querySelector('.menuFrame');if(frame){frame.src='about:blank';frame.style.visibility='hidden'}
    render(lastData);window.scrollTo(0,0);
  }
  window.DisprotelSupervisorMobile={showDashboard,showMenu};

  const statusText=s=>norm(s).replaceAll('_',' ');
  const attentionIcon=t=>t==='ACCESO_REMOTO'?'📡':t==='REASIGNACION'?'↪️':'⚠️';
  const attentionLabel=t=>t==='ACCESO_REMOTO'?'Acceso remoto':t==='REASIGNACION'?'Reasignación':'Novedad de OT';
  function fmtTime(v){try{return new Date(v).toLocaleTimeString('es-EC',{hour:'2-digit',minute:'2-digit'})}catch{return''}}

  function render(d){
    const dash=document.querySelector('.menuDashboard');if(!dash)return false;
    const data=d||{};const r=data.resumen||{};const att=data.requiere_atencion||[];const groups=data.groups||[];const orders=data.orders||[];
    const latest=orders.slice().sort((a,b)=>new Date(b.updated_at||0)-new Date(a.updated_at||0)).slice(0,5);
    const novCount=(data.novedades||[]).length+(data.novedades_unidad||[]).length;
    dash.innerHTML=`<div id="supervisorDashboardV1" class="supLive">
      <section class="supLiveHero"><div class="supLiveTop"><div class="supLiveTitle"><small>SUPERVISIÓN TÉCNICA · EN VIVO</small><h1>Hola, Fernando</h1><p>Resumen de la operación actual y lo que necesita atención.</p></div><div class="supLiveActions"><button id="supLiveMenu" title="Menú">☰</button><button id="supLiveRefresh" title="Actualizar">↻</button></div></div><div class="supLiveUpdate"><span>● Sistema conectado</span><span id="supLiveClock">${data.fecha?esc(data.fecha):'Actualizando…'}</span></div></section>
      <section class="supLiveKpis"><article class="supLiveKpi"><i>🚐</i><strong>${Number(r.en_campo||0)}</strong><b>Trabajos en campo</b><small>OT activas de hoy</small></article><article class="supLiveKpi ${att.length?'alert':'ok'}"><i>🔔</i><strong>${att.length}</strong><b>Requieren atención</b><small>Accesos, reasignaciones o novedades</small></article><article class="supLiveKpi ${novCount?'warn':''}"><i>⚠️</i><strong>${novCount}</strong><b>Novedades operativas</b><small>Personal y unidades</small></article><article class="supLiveKpi ok"><i>✅</i><strong>${Number(r.finalizadas||0)}</strong><b>Finalizadas hoy</b><small>${Number(r.creadas||0)} creadas en total</small></article></section>
      <section class="supLivePanel"><header class="supLiveHead"><b>🔔 Atención inmediata</b><small>${att.length} pendientes</small><button id="supOpenSupervision">VER TODO</button></header><div class="supAttention">${att.length?att.slice(0,5).map(x=>`<div class="supAttentionItem ${x.tipo_atencion==='REASIGNACION'?'alert':''}"><i>${attentionIcon(x.tipo_atencion)}</i><div><b>${esc(attentionLabel(x.tipo_atencion))} · ${esc(x.id_orden||'OT')}</b><span>${esc(x.cliente_nombre||'Sin cliente')} · ${esc(x.grupo_asignado||x.grupo_actual||'Sin grupo')}</span></div><em>${esc(statusText(x.estado||''))}</em></div>`).join(''):'<div class="supEmpty">✓ No hay asuntos urgentes en este momento.</div>'}</div></section>
      <section class="supLivePanel"><header class="supLiveHead"><b>👥 Grupos operativos</b><small>${groups.length} activos</small><button id="supOpenGroups">GESTIONAR</button></header><div class="supGroups">${groups.length?groups.map(g=>`<div class="supGroup"><div class="supGroupTop"><b>${esc(g.nombre)}</b><strong>${Number(g.ordenes_activas||0)}</strong></div><div class="supGroupMeta"><span class="supChip ok">${(g.miembros||[]).length} técnicos</span><span class="supChip">${Number(g.ordenes_activas||0)} OT activas</span>${g.unidad?.novedad?'<span class="supChip warn">⚠ Unidad con novedad</span>':'<span class="supChip ok">Unidad disponible</span>'}</div></div>`).join(''):'<div class="supEmpty">No hay grupos disponibles.</div>'}</div></section>
      <section class="supLivePanel"><header class="supLiveHead"><b>🕒 Movimiento reciente</b><small>últimas actualizaciones</small></header><div class="supRecent">${latest.length?latest.map(o=>`<div class="supRecentItem"><div class="supRecentItemTop"><b>${esc(o.id_orden||'OT')} · ${esc(o.cliente_nombre||'Cliente')}</b><em>${esc(statusText(o.estado||''))}</em></div><span>${esc(o.tipo_trabajo||'Trabajo')} · ${esc(o.grupo_asignado||o.grupo_destino||'Sin grupo')} · ${fmtTime(o.updated_at)}</span></div>`).join(''):'<div class="supEmpty">Todavía no hay movimientos registrados hoy.</div>'}</div></section>
    </div>`;
    dash.querySelector('#supLiveMenu')?.addEventListener('click',showMenu);
    dash.querySelector('#supLiveRefresh')?.addEventListener('click',load);
    dash.querySelector('#supOpenSupervision')?.addEventListener('click',()=>openModule('SUPERVISIÓN TÉCNICA'));
    dash.querySelector('#supOpenGroups')?.addEventListener('click',()=>openModule('SUPERVISIÓN TÉCNICA'));
    return true;
  }

  async function load(){
    if(loading)return;loading=true;
    try{
      const r=await fetch(API,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','x-session':me.session_token},body:JSON.stringify({action:'dashboard'})});
      const d=await r.json().catch(()=>({}));if(!r.ok||d.error)throw new Error(d.error||'No se pudo cargar');
      lastData=d;render(d);
    }catch(e){
      const dash=document.querySelector('.menuDashboard');if(dash&&!lastData)dash.innerHTML='<div id="supervisorDashboardV1" class="supLive"><section class="supLivePanel"><div class="supEmpty">No se pudo actualizar el tablero. Toca actualizar en unos segundos.</div></section></div>';
    }finally{loading=false}
  }

  function boot(){
    const dash=document.querySelector('.menuDashboard'),aside=document.querySelector('.menuAside');
    if(!dash||!aside)return false;
    document.body.classList.remove('moduleOpen','erpMobileMenuOpen');document.body.classList.add('supMobileDashboard');
    render(lastData);load();return true;
  }
  let tries=0;const timer=setInterval(()=>{if(boot()||++tries>40)clearInterval(timer)},120);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&document.body.classList.contains('supMobileDashboard'))load()});
  setInterval(()=>{if(!document.hidden&&document.body.classList.contains('supMobileDashboard'))load()},15000);
})();