(()=>{
  if(window.__disprotelSupervisorMobileLiveV1)return;
  window.__disprotelSupervisorMobileLiveV1=true;

  const KEY='disprotel_login_general_v2';
  const API='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-panel-supervisor';
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,' ').toUpperCase();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let me={};try{me=JSON.parse(sessionStorage.getItem(KEY)||'{}')}catch{}
  if(!norm(me.rol).includes('SUPERVISOR TECNICO')||!matchMedia('(max-width:680px)').matches||!me.session_token)return;

  document.body.classList.add('supSupervisorMobile');

  const style=document.createElement('style');
  style.id='supervisorMobileUnifiedV1Style';
  style.textContent=`
    body.supSupervisorMobile.panelMenu{background:#edf3f7!important;overflow:auto!important}
    body.supSupervisorMobile.panelMenu .topin{min-height:44px!important;padding:3px 6px!important;gap:4px!important}
    body.supSupervisorMobile.panelMenu .logoBox{width:51px!important;height:30px!important;flex:0 0 51px!important;border-radius:7px!important}
    body.supSupervisorMobile.panelMenu .brand{min-width:0!important;flex:1!important}
    body.supSupervisorMobile.panelMenu .brand b{font-size:11px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
    body.supSupervisorMobile.panelMenu .brand span{display:none!important}
    body.supSupervisorMobile.panelMenu .panelTools{gap:3px!important;margin-left:auto!important}
    body.supSupervisorMobile.panelMenu>.topbar .panelConnected{min-height:24px!important;padding:0 6px!important;font-size:7px!important}
    body.supSupervisorMobile.panelMenu .userAvatar{width:31px!important;height:31px!important;font-size:15px!important;border-width:2px!important}
    body.supSupervisorMobile.panelMenu .logout{padding:5px 7px!important;font-size:9px!important;border-radius:8px!important}

    body.supSupervisorMobile.panelMenu.supMobileDashboard .menuAside{display:none!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .menuStage{display:block!important;width:100%!important;height:auto!important;min-height:calc(100dvh - 44px)!important;overflow:visible!important;border-radius:0!important;background:#edf3f7!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .mobileModuleBar{display:none!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .menuHome{display:block!important;min-height:calc(100dvh - 44px)!important;padding:0!important;background:#edf3f7!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .menuDashboard{display:block!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .menuFrame{display:none!important}

    .supLive{min-height:calc(100dvh - 44px);padding:8px 8px 78px;display:block}
    .supOpsHeader{position:relative;overflow:hidden;background:linear-gradient(128deg,#082755,#145d9e 65%,#118f86);color:#fff;border-radius:18px;padding:14px 14px 13px;box-shadow:0 13px 28px #0b2a5c22;animation:supViewIn .26s ease both}
    .supOpsHeader:after{content:'';position:absolute;width:145px;height:145px;border:26px solid #ffffff0e;border-radius:50%;right:-66px;top:-75px}
    .supOpsHeadRow{position:relative;z-index:1;display:flex;align-items:flex-start;gap:9px}.supOpsHeadText{flex:1;min-width:0}
    .supOpsHeadText small{display:block;font-size:7.5px;font-weight:1000;letter-spacing:.12em;color:#bcecff}.supOpsHeadText h1{margin:4px 0 3px;font-size:20px;line-height:1.05}.supOpsHeadText p{margin:0;font-size:9px;color:#dcefff;line-height:1.3}
    .supOpsRefresh{position:relative;z-index:2;width:34px;height:34px;border:1px solid #ffffff55;border-radius:10px;background:#ffffff18;color:#fff;font-size:15px;font-weight:1000}.supOpsRefresh:active{transform:scale(.94)}
    .supOpsStamp{position:relative;z-index:1;margin-top:8px;display:flex;justify-content:space-between;gap:8px;font-size:7.5px;color:#cdeeff}

    .supOpsStage{margin-top:8px;animation:supViewIn .24s ease both}.supSectionTitle{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;margin:10px 2px 7px}.supSectionTitle h2{margin:0;color:#0d315b;font-size:14px}.supSectionTitle span{font-size:7.5px;color:#758893}
    .supKpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.supKpi{background:#fff;border:1px solid #d8e5ec;border-radius:14px;padding:10px;min-height:86px;box-shadow:0 5px 15px #071a380a}.supKpi i{font-style:normal;font-size:17px}.supKpi strong{display:block;margin-top:5px;font-size:23px;color:#0b568b;line-height:1}.supKpi b{display:block;margin-top:5px;color:#29485b;font-size:8.5px}.supKpi small{display:block;margin-top:3px;color:#81919a;font-size:7px}.supKpi.alert strong{color:#bf3141}.supKpi.warn strong{color:#ad6a00}.supKpi.ok strong{color:#1d8057}

    .supCard{background:#fff;border:1px solid #d8e5ec;border-radius:15px;overflow:hidden;box-shadow:0 5px 16px #071a380a;margin-top:8px}.supCardHead{display:flex;align-items:center;gap:8px;padding:10px 11px;border-bottom:1px solid #e6edf0}.supCardHead b{flex:1;color:#0d315b;font-size:12px}.supCardHead span{font-size:7px;color:#758893}.supCardHead button{border:0;border-radius:8px;background:#eaf4f9;color:#0d5f92;padding:6px 8px;font-size:7.5px;font-weight:1000}
    .supList{display:grid;gap:6px;padding:8px}.supRow{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px;align-items:center;padding:9px;border:1px solid #e2e9ed;border-radius:11px;background:#fafcfd}.supRow.hot{background:#fff8ed;border-color:#f1d29d}.supRow i{font-style:normal;font-size:17px}.supRow b{display:block;color:#173d5c;font-size:9px}.supRow small{display:block;color:#748791;font-size:7.5px;margin-top:2px;line-height:1.25}.supRow em{font-style:normal;padding:4px 6px;border-radius:999px;background:#e8f3f8;color:#155f91;font-size:6.8px;font-weight:1000;max-width:92px;text-align:center}.supEmpty{padding:17px 10px;text-align:center;color:#748791;font-size:8.5px}

    .supActionGrid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.supAction{border:1px solid #d5e4eb;border-radius:13px;background:#fff;padding:11px;text-align:left;box-shadow:0 4px 13px #071a3808;min-height:83px}.supAction:active{transform:scale(.97)}.supAction i{display:block;font-style:normal;font-size:21px}.supAction b{display:block;margin-top:7px;font-size:9px;color:#113f66}.supAction small{display:block;margin-top:3px;color:#788b95;font-size:7px;line-height:1.25}.supAction.primary{grid-column:1/-1;background:linear-gradient(128deg,#0c5f9c,#168ca7);border-color:#55b8cf;color:#fff}.supAction.primary b,.supAction.primary small{color:#fff}.supAction.primary small{opacity:.82}

    .supGroup{padding:10px;border-bottom:1px solid #edf1f3}.supGroup:last-child{border-bottom:0}.supGroupTop{display:flex;align-items:center;gap:8px}.supGroupTop b{flex:1;color:#123f66;font-size:9.5px}.supGroupTop strong{font-size:14px;color:#0b6894}.supChips{display:flex;gap:5px;flex-wrap:wrap;margin-top:6px}.supChip{padding:4px 6px;border-radius:999px;background:#eaf4f9;color:#275f7e;font-size:6.8px;font-weight:900}.supChip.ok{background:#e8f7ee;color:#23784f}.supChip.warn{background:#fff1dd;color:#9b6100}

    .supTabs{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-top:8px}.supTab{border:1px solid #d4e3ea;border-radius:10px;background:#fff;color:#4e6978;padding:8px 3px;font-size:7px;font-weight:900}.supTab.on{background:#0c4d82;color:#fff;border-color:#0c4d82}.supOrderList{margin-top:7px;display:grid;gap:6px}.supOrder{background:#fff;border:1px solid #dce7ec;border-radius:12px;padding:9px}.supOrderTop{display:flex;align-items:flex-start;gap:7px}.supOrderTop b{flex:1;font-size:9px;color:#123f66}.supOrderTop em{font-style:normal;font-size:6.7px;font-weight:1000;padding:4px 6px;border-radius:999px;background:#eaf4f9;color:#155d91}.supOrder small{display:block;margin-top:4px;color:#758893;font-size:7.5px;line-height:1.25}

    .supOpsBottom{position:fixed;left:7px;right:7px;bottom:7px;z-index:250;display:grid;grid-template-columns:repeat(5,1fr);gap:3px;padding:5px;border:1px solid #d0e0e8;border-radius:17px;background:#ffffffed;backdrop-filter:blur(13px);box-shadow:0 12px 32px #071a3838}.supNav{border:0;border-radius:11px;background:transparent;color:#607784;min-height:51px;padding:5px 2px;font-size:16px}.supNav span{display:block;margin-top:3px;font-size:6.8px;font-weight:900}.supNav.on{background:linear-gradient(145deg,#0c4c82,#148ca4);color:#fff;box-shadow:0 5px 12px #0b5c8d35}.supNav:active{transform:scale(.94)}
    body.moduleOpen .supOpsBottom{display:none!important}
    @keyframes supViewIn{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}
    @media(prefers-reduced-motion:reduce){.supOpsHeader,.supOpsStage{animation:none!important}}
  `;
  document.head.appendChild(style);

  let DATA=null,loading=false,view='inicio',orderFilter='libres';
  const terminal=s=>['COMPLETADA','FINALIZADA','CANCELADA','CANCELADA EN SITIO','CANCELADA_EN_SITIO','NO EJECUTADA CLIENTE','NO_EJECUTADA_CLIENTE'].includes(norm(s));
  const labelState=s=>norm(s).replaceAll('_',' ');
  const freeOrders=()=>((DATA?.orders)||[]).filter(o=>norm(o.estado)==='PENDIENTE'&&!o.grupo_asignado&&!o.grupo_destino);
  const activeOrders=()=>((DATA?.orders)||[]).filter(o=>!terminal(o.estado)&&(o.grupo_asignado||o.grupo_destino));
  const attention=()=>DATA?.requiere_atencion||[];
  const completed=()=>((DATA?.orders)||[]).filter(o=>norm(o.estado)==='COMPLETADA'||norm(o.estado)==='FINALIZADA');
  const noveltyCount=()=>((DATA?.novedades)||[]).length+((DATA?.novedades_unidad)||[]).length;
  const groupNovelty=g=>Boolean(g?.unidad?.novedad)||((DATA?.novedades)||[]).some(n=>n.grupo_habitual_id===g.id||n.grupo_operativo_id===g.id);
  const attIcon=t=>t==='ACCESO_REMOTO'?'📡':t==='REASIGNACION'?'↪️':'⚠️';
  const attName=t=>t==='ACCESO_REMOTO'?'Acceso remoto':t==='REASIGNACION'?'Reasignación':'Novedad de OT';

  function frame(){return document.querySelector('.menuFrame')}
  function openHref(href,title){
    const f=frame();if(!f){location.href=href;return}
    const mt=document.querySelector('.mobileModuleTitle');if(mt)mt.textContent=title||'Módulo';
    f.style.visibility='hidden';f.setAttribute('aria-busy','true');
    f.src=href+(href.includes('?')?'&':'?')+'v='+Date.now();
    document.body.classList.remove('supMobileDashboard','erpMobileMenuOpen');
    document.body.classList.add('moduleOpen');
  }
  function showDashboard(target=view){
    view=target||'inicio';
    document.body.classList.remove('moduleOpen','erpMobileMenuOpen');
    document.body.classList.add('supMobileDashboard');
    const f=frame();if(f){f.src='about:blank';f.style.visibility='hidden';f.removeAttribute('aria-busy')}
    render();window.scrollTo(0,0);
  }
  window.DisprotelSupervisorMobile={showDashboard,showMenu:()=>showDashboard('inicio')};

  window.addEventListener('click',e=>{
    const back=e.target?.closest?.('.mobileModuleBack');
    if(!back)return;
    e.preventDefault();e.stopImmediatePropagation();showDashboard(view);
  },true);

  function header(){
    const date=DATA?.fecha||new Date().toLocaleDateString('en-CA',{timeZone:'America/Guayaquil'});
    const names={inicio:['CENTRO DE OPERACIÓN','Hola, Fernando','Lo importante de la operación actual.'],ordenes:['GESTIÓN DE TRABAJO','Órdenes','Crear, asignar, revisar y reorganizar.'],operacion:['ARRANQUE OPERATIVO','Operación del día','Grupos, técnicos, unidades y capacidad real.'],soporte:['ATENCIÓN DE CAMPO','Soporte','Lo que campo necesita para continuar.'],mas:['HERRAMIENTAS','Más','Accesos de apoyo sin distraer la operación.']};
    const n=names[view]||names.inicio;
    return `<section class="supOpsHeader"><div class="supOpsHeadRow"><div class="supOpsHeadText"><small>${n[0]}</small><h1>${n[1]}</h1><p>${n[2]}</p></div><button class="supOpsRefresh" id="supRefresh" title="Actualizar">↻</button></div><div class="supOpsStamp"><span>● Operación en vivo</span><span>${esc(date)}</span></div></section>`;
  }

  function rowAttention(x){return `<div class="supRow ${x.tipo_atencion==='REASIGNACION'?'hot':''}"><i>${attIcon(x.tipo_atencion)}</i><div><b>${esc(attName(x.tipo_atencion))} · ${esc(x.id_orden||'OT')}</b><small>${esc(x.cliente_nombre||'Sin cliente')} · ${esc(x.grupo_asignado||x.grupo_actual||'Sin grupo')}</small></div><em>${esc(labelState(x.estado||''))}</em></div>`}
  function rowOrder(o){return `<div class="supOrder"><div class="supOrderTop"><b>${esc(o.id_orden||'OT')} · ${esc(o.cliente_nombre||'Cliente')}</b><em>${esc(labelState(o.estado||''))}</em></div><small>${esc(String(o.tipo_trabajo||'Trabajo').replaceAll('_',' '))} · ${esc(o.grupo_asignado||o.grupo_destino||'Sin grupo')}</small></div>`}

  function homeView(){
    const r=DATA?.resumen||{},free=freeOrders(),att=attention(),groups=DATA?.groups||[];
    const decision=[...att.slice(0,3),...free.slice(0,Math.max(0,3-att.length)).map(o=>({...o,tipo_atencion:'LIBRE',estado:'POR ASIGNAR'}))];
    return `<section class="supKpis"><article class="supKpi ${free.length?'warn':''}"><i>📥</i><strong>${free.length}</strong><b>Por asignar</b><small>OT libres de hoy</small></article><article class="supKpi"><i>🚐</i><strong>${Number(r.en_campo||0)}</strong><b>En campo</b><small>Operación activa</small></article><article class="supKpi ${att.length?'alert':'ok'}"><i>🔔</i><strong>${att.length}</strong><b>Requieren decisión</b><small>Soporte o reasignación</small></article><article class="supKpi ok"><i>✅</i><strong>${Number(r.finalizadas||0)}</strong><b>Finalizadas</b><small>Completadas hoy</small></article></section>
      <section class="supCard"><header class="supCardHead"><b>Ahora requiere decisión</b><span>${decision.length} visibles</span></header><div class="supList">${decision.length?decision.map(x=>x.tipo_atencion==='LIBRE'?`<div class="supRow hot"><i>📥</i><div><b>OT por asignar · ${esc(x.id_orden||'OT')}</b><small>${esc(x.cliente_nombre||'Cliente')} · ${esc(String(x.tipo_trabajo||'Trabajo').replaceAll('_',' '))}</small></div><em>ASIGNAR</em></div>`:rowAttention(x)).join(''):'<div class="supEmpty">✓ No hay decisiones urgentes pendientes.</div>'}</div></section>
      <section class="supCard"><header class="supCardHead"><b>Estado de grupos</b><span>${groups.length} grupos</span><button data-view="operacion">VER OPERACIÓN</button></header>${groups.length?groups.slice(0,4).map(g=>`<div class="supGroup"><div class="supGroupTop"><b>${esc(g.nombre)}</b><strong>${Number(g.ordenes_activas||0)} OT</strong></div><div class="supChips"><span class="supChip ok">${(g.miembros||[]).length} técnicos</span>${groupNovelty(g)?'<span class="supChip warn">⚠ Con novedad</span>':'<span class="supChip ok">✓ Disponible</span>'}</div></div>`).join(''):'<div class="supEmpty">Sin grupos operativos.</div>'}</section>`;
  }

  function ordersForFilter(){if(orderFilter==='libres')return freeOrders();if(orderFilter==='activas')return activeOrders();if(orderFilter==='atencion')return attention();return completed()}
  function ordersView(){const rows=ordersForFilter();return `<div class="supActionGrid"><button class="supAction primary" data-href="solicitudes-oficina.html" data-title="Crear orden"><i>➕</i><b>Crear nueva OT</b><small>Usa el flujo de solicitudes técnicas que ya funciona.</small></button><button class="supAction" data-href="panel-supervisor-vivo-v4.html" data-title="Centro de órdenes"><i>🗂️</i><b>Gestionar órdenes</b><small>Asignar, reasignar y revisar detalle.</small></button><button class="supAction" data-view="operacion"><i>🚐</i><b>Ver operación</b><small>Órdenes distribuidas por grupos.</small></button></div>
      <div class="supTabs"><button class="supTab ${orderFilter==='libres'?'on':''}" data-filter="libres">POR ASIGNAR<br>${freeOrders().length}</button><button class="supTab ${orderFilter==='activas'?'on':''}" data-filter="activas">EN CURSO<br>${activeOrders().length}</button><button class="supTab ${orderFilter==='atencion'?'on':''}" data-filter="atencion">ATENCIÓN<br>${attention().length}</button><button class="supTab ${orderFilter==='final'?'on':''}" data-filter="final">FINALIZADAS<br>${completed().length}</button></div><div class="supOrderList">${rows.length?rows.slice(0,12).map(x=>x.tipo_atencion?rowAttention(x):rowOrder(x)).join(''):'<div class="supCard"><div class="supEmpty">No hay órdenes en esta categoría.</div></div>'}</div>`}

  function operationView(){const groups=DATA?.groups||[],withNews=groups.filter(groupNovelty).length,active=groups.reduce((n,g)=>n+Number(g.ordenes_activas||0),0);return `<section class="supKpis"><article class="supKpi ok"><i>👥</i><strong>${groups.length-withNews}</strong><b>Grupos listos</b><small>Sin novedad registrada</small></article><article class="supKpi ${withNews?'warn':'ok'}"><i>⚠️</i><strong>${withNews}</strong><b>Con novedad</b><small>Personal o unidad</small></article><article class="supKpi"><i>📋</i><strong>${active}</strong><b>OT activas</b><small>Carga actual de grupos</small></article><article class="supKpi ${noveltyCount()?'warn':'ok'}"><i>🚐</i><strong>${noveltyCount()}</strong><b>Novedades</b><small>Registradas hoy</small></article></section>
      <div class="supActionGrid" style="margin-top:8px"><button class="supAction primary" data-href="panel-supervisor-vivo-v4.html" data-title="Operación del día"><i>☀️</i><b>Abrir operación del día</b><small>Registrar novedades, revisar grupos, GPS y redistribuir trabajo.</small></button></div>
      <section class="supCard"><header class="supCardHead"><b>Grupos técnicos</b><span>capacidad de hoy</span></header>${groups.length?groups.map(g=>`<div class="supGroup"><div class="supGroupTop"><b>${esc(g.nombre)}</b><strong>${Number(g.ordenes_activas||0)} OT</strong></div><div class="supChips"><span class="supChip ok">${(g.miembros||[]).length} técnicos</span><span class="supChip">${esc(g.unidad?.nombre||'Sin unidad')}</span>${groupNovelty(g)?'<span class="supChip warn">⚠ Revisar novedad</span>':'<span class="supChip ok">✓ Operativo</span>'}</div></div>`).join(''):'<div class="supEmpty">No hay grupos configurados.</div>'}</section>`}

  function supportView(){const att=attention(),remote=att.filter(x=>x.tipo_atencion==='ACCESO_REMOTO').length,reass=att.filter(x=>x.tipo_atencion==='REASIGNACION').length;return `<section class="supKpis"><article class="supKpi ${remote?'alert':'ok'}"><i>📡</i><strong>${remote}</strong><b>IP / remoto</b><small>Solicitudes activas</small></article><article class="supKpi ${reass?'warn':'ok'}"><i>↪️</i><strong>${reass}</strong><b>Reasignaciones</b><small>Decisiones de campo</small></article></section>
      <div class="supActionGrid" style="margin-top:8px"><button class="supAction primary" data-href="asignacion-ip.html" data-title="IP y acceso remoto"><i>📡</i><b>IP y acceso remoto</b><small>Atender solicitudes técnicas que llegan desde campo.</small></button><button class="supAction" data-href="panel-supervisor-vivo-v4.html" data-title="Atención de campo"><i>🛠️</i><b>Reasignaciones y apoyo</b><small>Resolver novedades y apoyos operativos.</small></button><button class="supAction" data-view="operacion"><i>👥</i><b>Grupos</b><small>Ver si la causa viene de capacidad operativa.</small></button></div>
      <section class="supCard"><header class="supCardHead"><b>Pendientes de campo</b><span>${att.length} casos</span></header><div class="supList">${att.length?att.slice(0,10).map(rowAttention).join(''):'<div class="supEmpty">✓ Campo no registra solicitudes pendientes.</div>'}</div></section>`}

  function moreView(){return `<div class="supActionGrid"><button class="supAction primary" data-href="inventario-supervisor.html" data-title="Inventario"><i>📦</i><b>Inventario</b><small>Consulta y gestión de existencias desde los módulos actuales.</small></button><button class="supAction" id="supOpenChat"><i>💬</i><b>Conversaciones</b><small>Comunicación interna con técnicos y grupos.</small></button><button class="supAction" data-href="panel-supervisor-vivo-v4.html" data-title="Panel operativo detallado"><i>📊</i><b>Panel detallado</b><small>Vista ampliada de toda la operación.</small></button></div>`}

  function nav(){return `<nav class="supOpsBottom" aria-label="Navegación del supervisor"><button class="supNav ${view==='inicio'?'on':''}" data-view="inicio">🏠<span>Inicio</span></button><button class="supNav ${view==='ordenes'?'on':''}" data-view="ordenes">📋<span>Órdenes</span></button><button class="supNav ${view==='operacion'?'on':''}" data-view="operacion">👥<span>Operación</span></button><button class="supNav ${view==='soporte'?'on':''}" data-view="soporte">🛠️<span>Soporte</span></button><button class="supNav ${view==='mas'?'on':''}" data-view="mas">☰<span>Más</span></button></nav>`}

  function bind(root){
    root.querySelector('#supRefresh')?.addEventListener('click',load);
    root.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.view;render();window.scrollTo(0,0)}));
    root.querySelectorAll('[data-href]').forEach(b=>b.addEventListener('click',()=>openHref(b.dataset.href,b.dataset.title||b.textContent.trim())));
    root.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{orderFilter=b.dataset.filter;render()}));
    root.querySelector('#supOpenChat')?.addEventListener('click',()=>{
      const btn=document.querySelector('.chatManagerButton');
      if(btn){btn.click();return}
      alert('Conversaciones todavía está cargando. Intenta nuevamente en unos segundos.');
    });
  }

  function render(){
    const dash=document.querySelector('.menuDashboard');if(!dash)return false;
    const content=view==='ordenes'?ordersView():view==='operacion'?operationView():view==='soporte'?supportView():view==='mas'?moreView():homeView();
    dash.innerHTML=`<div id="supervisorDashboardV1" class="supLive supOpsApp">${header()}<main class="supOpsStage">${content}</main>${nav()}</div>`;
    bind(dash);return true;
  }

  async function load(){
    if(loading)return;loading=true;
    try{
      const r=await fetch(API,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','x-session':me.session_token},body:JSON.stringify({action:'dashboard'})});
      const d=await r.json().catch(()=>({}));if(!r.ok||d.error)throw new Error(d.error||'No se pudo cargar');
      DATA=d;render();
    }catch(e){
      const dash=document.querySelector('.menuDashboard');
      if(dash&&!DATA)dash.innerHTML=`<div id="supervisorDashboardV1" class="supLive supOpsApp"><section class="supCard"><div class="supEmpty">⚠ No se pudo cargar la operación. Revisa la conexión e intenta actualizar.</div></section></div>`;
    }finally{loading=false}
  }

  function boot(){
    const dash=document.querySelector('.menuDashboard');
    if(!dash||!document.querySelector('.menuShell'))return false;
    document.body.classList.remove('moduleOpen','erpMobileMenuOpen');
    document.body.classList.add('supMobileDashboard');
    render();load();return true;
  }
  let tries=0;const timer=setInterval(()=>{if(boot()||++tries>50)clearInterval(timer)},100);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&document.body.classList.contains('supMobileDashboard'))load()});
  setInterval(()=>{if(!document.hidden&&document.body.classList.contains('supMobileDashboard'))load()},15000);
})();