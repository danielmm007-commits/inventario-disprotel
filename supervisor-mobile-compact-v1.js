(()=>{
  if(window.__disprotelSupervisorMobileWebParityV3)return;
  window.__disprotelSupervisorMobileWebParityV3=true;

  const KEY='disprotel_login_general_v2';
  const API='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-panel-supervisor';
  const TARGET='panel-supervisor-vivo-v2.html';
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,' ').toUpperCase();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let me={};try{me=JSON.parse(sessionStorage.getItem(KEY)||'{}')}catch{}
  if(!norm(me.rol).includes('SUPERVISOR TECNICO')||!matchMedia('(max-width:680px)').matches||!me.session_token)return;

  document.body.classList.add('supSupervisorMobile');

  const style=document.createElement('style');
  style.id='supervisorMobileWebParityV3Style';
  style.textContent=`
    body.supSupervisorMobile.panelMenu{background:#edf3f7!important;overflow:auto!important}
    body.supSupervisorMobile.panelMenu .topin{min-height:44px!important;padding:3px 6px!important;gap:4px!important}
    body.supSupervisorMobile.panelMenu .logoBox{width:51px!important;height:30px!important;flex:0 0 51px!important;border-radius:7px!important}
    body.supSupervisorMobile.panelMenu .brand{min-width:0!important;flex:1!important}
    body.supSupervisorMobile.panelMenu .brand b{font-size:11px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
    body.supSupervisorMobile.panelMenu .brand span,.who{display:none!important}
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

    body.supSupervisorMobile.panelMenu.moduleOpen{overflow:hidden!important}
    body.supSupervisorMobile.panelMenu.moduleOpen .menuAside{display:none!important}
    body.supSupervisorMobile.panelMenu.moduleOpen .menuStage{width:100%!important;height:calc(100dvh - 44px)!important;border-radius:0!important;overflow:hidden!important}
    body.supSupervisorMobile.panelMenu.moduleOpen .mobileModuleBar{display:flex!important;min-height:42px!important;padding:5px 8px!important;gap:7px!important}
    body.supSupervisorMobile.panelMenu.moduleOpen .menuFrame{display:block!important;width:100%!important;height:calc(100dvh - 86px)!important;border-radius:0!important}

    .supLive{min-height:calc(100dvh - 44px);padding:8px 8px 78px;display:block}
    .supOpsHeader{position:relative;overflow:hidden;background:linear-gradient(128deg,#082755,#145d9e 65%,#118f86);color:#fff;border-radius:18px;padding:14px;box-shadow:0 13px 28px #0b2a5c22}
    .supOpsHeadRow{display:flex;align-items:flex-start;gap:9px}.supOpsHeadText{flex:1;min-width:0}
    .supOpsHeadText small{display:block;font-size:7.5px;font-weight:1000;letter-spacing:.12em;color:#bcecff}.supOpsHeadText h1{margin:4px 0 3px;font-size:20px;line-height:1.05}.supOpsHeadText p{margin:0;font-size:9px;color:#dcefff;line-height:1.3}
    .supOpsRefresh{width:34px;height:34px;border:1px solid #ffffff55;border-radius:10px;background:#ffffff18;color:#fff;font-size:15px;font-weight:1000}.supOpsRefresh:active{transform:scale(.94)}
    .supOpsStamp{margin-top:8px;display:flex;justify-content:space-between;gap:8px;font-size:7.5px;color:#cdeeff}
    .supOpsStage{margin-top:8px}.supKpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.supKpi{background:#fff;border:1px solid #d8e5ec;border-radius:14px;padding:10px;min-height:86px;box-shadow:0 5px 15px #071a380a}.supKpi i{font-style:normal;font-size:17px}.supKpi strong{display:block;margin-top:5px;font-size:23px;color:#0b568b;line-height:1}.supKpi b{display:block;margin-top:5px;color:#29485b;font-size:8.5px}.supKpi small{display:block;margin-top:3px;color:#81919a;font-size:7px}.supKpi.alert strong{color:#bf3141}.supKpi.warn strong{color:#ad6a00}.supKpi.ok strong{color:#1d8057}
    .supCard{background:#fff;border:1px solid #d8e5ec;border-radius:15px;overflow:hidden;box-shadow:0 5px 16px #071a380a;margin-top:8px}.supCardHead{display:flex;align-items:center;gap:8px;padding:10px 11px;border-bottom:1px solid #e6edf0}.supCardHead b{flex:1;color:#0d315b;font-size:12px}.supCardHead span{font-size:7px;color:#758893}
    .supList{display:grid;gap:6px;padding:8px}.supRow{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px;align-items:center;padding:9px;border:1px solid #e2e9ed;border-radius:11px;background:#fafcfd}.supRow.hot{background:#fff8ed;border-color:#f1d29d}.supRow i{font-style:normal;font-size:17px}.supRow b{display:block;color:#173d5c;font-size:9px}.supRow small{display:block;color:#748791;font-size:7.5px;margin-top:2px;line-height:1.25}.supRow em{font-style:normal;padding:4px 6px;border-radius:999px;background:#e8f3f8;color:#155f91;font-size:6.8px;font-weight:1000}.supEmpty{padding:17px 10px;text-align:center;color:#748791;font-size:8.5px}
    .supGroup{padding:10px;border-bottom:1px solid #edf1f3}.supGroup:last-child{border-bottom:0}.supGroupTop{display:flex;align-items:center;gap:8px}.supGroupTop b{flex:1;color:#123f66;font-size:9.5px}.supGroupTop strong{font-size:14px;color:#0b6894}.supChips{display:flex;gap:5px;flex-wrap:wrap;margin-top:6px}.supChip{padding:4px 6px;border-radius:999px;background:#eaf4f9;color:#275f7e;font-size:6.8px;font-weight:900}.supChip.ok{background:#e8f7ee;color:#23784f}.supChip.warn{background:#fff1dd;color:#9b6100}

    .supOpsBottom{position:fixed;left:7px;right:7px;bottom:7px;z-index:250;display:grid;grid-template-columns:repeat(4,1fr);gap:3px;padding:5px;border:1px solid #d0e0e8;border-radius:17px;background:#ffffffed;backdrop-filter:blur(13px);box-shadow:0 12px 32px #071a3838}.supNav{border:0;border-radius:11px;background:transparent;color:#607784;min-height:51px;padding:5px 2px;font-size:16px}.supNav span{display:block;margin-top:3px;font-size:6.8px;font-weight:900}.supNav.on{background:linear-gradient(145deg,#0c4c82,#148ca4);color:#fff;box-shadow:0 5px 12px #0b5c8d35}.supNav:active{transform:scale(.94)}
    body.moduleOpen .supOpsBottom{display:none!important}
  `;
  document.head.appendChild(style);

  let DATA=null,loading=false,currentModule='inicio';
  const terminal=s=>['COMPLETADA','FINALIZADA','CANCELADA','CANCELADA EN SITIO','CANCELADA_EN_SITIO','NO EJECUTADA CLIENTE','NO_EJECUTADA_CLIENTE'].includes(norm(s));
  const freeOrders=()=>((DATA?.orders)||[]).filter(o=>norm(o.estado)==='PENDIENTE'&&!o.grupo_asignado&&!o.grupo_destino);
  const attention=()=>DATA?.requiere_atencion||[];
  const groupNovelty=g=>Boolean(g?.unidad?.novedad)||((DATA?.novedades)||[]).some(n=>n.grupo_habitual_id===g.id||n.grupo_operativo_id===g.id);
  const attIcon=t=>t==='ACCESO_REMOTO'?'📡':t==='REASIGNACION'?'↪️':'⚠️';
  const attName=t=>t==='ACCESO_REMOTO'?'Acceso remoto':t==='REASIGNACION'?'Reasignación':'Novedad de OT';

  function frame(){return document.querySelector('.menuFrame')}
  function injectScript(d,id,src){
    if(d.getElementById(id))return true;
    const s=d.createElement('script');s.id=id;s.src=src+'?v='+Date.now();s.async=false;(d.body||d.documentElement).appendChild(s);return true;
  }
  function setModuleTitle(text){const el=document.querySelector('.mobileModuleTitle');if(el)el.textContent=text||'Módulo'}
  function openModule(href,title,origin='module'){
    const f=frame();if(!f){location.href=href;return}
    currentModule=origin;
    f.dataset.supMobileOrigin=origin;
    setModuleTitle(title);
    f.style.visibility='hidden';f.setAttribute('aria-busy','true');
    f.src=href+(href.includes('?')?'&':'?')+'v='+Date.now();
    document.body.classList.remove('supMobileDashboard','erpMobileMenuOpen');
    document.body.classList.add('moduleOpen');
  }
  function showHome(){
    currentModule='inicio';
    document.body.classList.remove('moduleOpen','erpMobileMenuOpen');
    document.body.classList.add('supMobileDashboard');
    const f=frame();if(f){f.src='about:blank';f.style.visibility='hidden';f.removeAttribute('aria-busy');delete f.dataset.supMobileOrigin}
    render();window.scrollTo(0,0);load();
  }
  window.DisprotelSupervisorMobile={showDashboard:()=>showHome(),showMenu:()=>showHome()};

  function cleanPanelNav(d){
    const actions=d.querySelector('.actions');if(!actions)return;
    [...actions.querySelectorAll('a')].forEach(a=>{
      const href=String(a.getAttribute('href')||'').toLowerCase();
      if(href.includes('trabajos-tecnicos.html')||href==='index.html'||href.endsWith('/index.html')){a.remove();return}
      if(href.includes('solicitudes-oficina.html'))a.textContent='➕ CREAR OT';
      if(href.includes('asignacion-ip.html'))a.textContent='🧰 MESA TÉCNICA DE CAMPO';
    });
    actions.style.gridTemplateColumns='repeat(2,minmax(0,1fr))';
  }
  function decorateMesa(d){
    d.title='Mesa técnica de campo · DISPROTEL';
    const loginTitle=d.querySelector('#login h1');if(loginTitle)loginTitle.textContent='🧰 Mesa técnica de campo';
    const quien=d.getElementById('quien');if(quien)quien.textContent=String(quien.textContent||'').replace(/^Asignación de IP/i,'Mesa técnica de campo');
    const pend=d.querySelector('#secPend h2');if(pend)pend.textContent='📡 Solicitudes técnicas de campo pendientes';
    const hist=d.querySelector('#secHist h2');if(hist)hist.textContent='🔎 Consultar IP actual / historial';
    const tabHist=d.getElementById('tabHist');if(tabHist)tabHist.textContent='🔎 CONSULTAR IP ACTUAL';
  }
  function injectEnhancerSafely(f,w,d){
    if(d.getElementById('panelSupervisorDirectEnhanceLoader')){injectScript(d,'supervisorReasignacionVisualLoader','supervisor-reasignacion-visual-v1.js');return true}
    const NativeMO=w.MutationObserver,captured=[];
    try{
      w.MutationObserver=class extends NativeMO{constructor(cb){super(cb);captured.push(this)}};
      const s=d.createElement('script');s.id='panelSupervisorDirectEnhanceLoader';s.src='panel-supervisor-direct-enhance-v1.js?v='+Date.now();s.async=false;
      s.onload=()=>{captured.forEach(o=>{try{o.disconnect()}catch{}});w.MutationObserver=NativeMO;injectScript(d,'supervisorReasignacionVisualLoader','supervisor-reasignacion-visual-v1.js')};
      s.onerror=()=>{w.MutationObserver=NativeMO};
      (d.body||d.documentElement).appendChild(s);
      setTimeout(()=>{captured.forEach(o=>{try{o.disconnect()}catch{}});if(w.MutationObserver!==NativeMO)w.MutationObserver=NativeMO},1500);
      return true;
    }catch(e){w.MutationObserver=NativeMO;console.warn('Enhancer móvil:',e);return false}
  }
  function returnToSupervision(f){
    currentModule='supervision';f.dataset.supMobileOrigin='supervision';setModuleTitle('Supervisión técnica');
    f.style.visibility='hidden';f.setAttribute('aria-busy','true');f.src=TARGET+'?v='+Date.now();
    document.body.classList.remove('supMobileDashboard');document.body.classList.add('moduleOpen');
  }
  function installBackGuard(f,d){
    if(d.documentElement.dataset.supMobileBackGuard==='1')return;d.documentElement.dataset.supMobileBackGuard='1';
    d.addEventListener('click',e=>{
      const c=e.target?.closest?.('button,a');if(!c)return;
      const text=norm(c.textContent||''),raw=String(c.getAttribute('onclick')||'')+' '+String(c.getAttribute('href')||'');
      if(!text.includes('ATRAS')&&!text.includes('VOLVER AL PANEL')&&!/principal\.html/i.test(raw))return;
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();returnToSupervision(f);
    },true);
  }
  function guardFrame(f){
    try{
      const w=f.contentWindow,d=f.contentDocument;if(!w||!d)return false;
      const path=String(w.location.pathname||'').toLowerCase();
      if(path.endsWith('/panel-supervisor-vivo-v2.html')){
        currentModule='supervision';f.dataset.supMobileOrigin='supervision';setModuleTitle('Supervisión técnica');cleanPanelNav(d);injectEnhancerSafely(f,w,d);return true;
      }
      if(path.endsWith('/solicitudes-oficina.html')&&f.dataset.supMobileOrigin==='supervision'){
        installBackGuard(f,d);injectScript(d,'supervisorOtFamiliasLoader','supervisor-ot-familias-v1.js');return true;
      }
      if(path.endsWith('/asignacion-ip.html')&&f.dataset.supMobileOrigin==='supervision'){
        decorateMesa(d);installBackGuard(f,d);return true;
      }
      if(path.endsWith('/principal.html')&&f.dataset.supMobileOrigin==='supervision'){
        setTimeout(()=>returnToSupervision(f),0);return true;
      }
      return false;
    }catch{return false}
  }
  function hookFrame(){
    const f=frame();if(!f)return false;
    if(f.dataset.supMobileHook!=='1'){
      f.dataset.supMobileHook='1';
      f.addEventListener('load',()=>setTimeout(()=>{guardFrame(f);f.style.visibility='visible';f.removeAttribute('aria-busy')},40));
    }
    guardFrame(f);return true;
  }

  window.addEventListener('click',e=>{
    const back=e.target?.closest?.('.mobileModuleBack');
    if(!back)return;
    e.preventDefault();e.stopImmediatePropagation();
    const f=frame();
    if(f?.dataset.supMobileOrigin==='supervision')showHome();else showHome();
  },true);

  function header(){
    const date=DATA?.fecha||new Date().toLocaleDateString('en-CA',{timeZone:'America/Guayaquil'});
    return `<section class="supOpsHeader"><div class="supOpsHeadRow"><div class="supOpsHeadText"><small>CENTRO DE CONTROL</small><h1>Hola, Fernando</h1><p>Resumen de la operación actual.</p></div><button class="supOpsRefresh" id="supRefresh" title="Actualizar">↻</button></div><div class="supOpsStamp"><span>● Operación en vivo</span><span>${esc(date)}</span></div></section>`;
  }
  function rowAttention(x){return `<div class="supRow ${x.tipo_atencion==='REASIGNACION'?'hot':''}"><i>${attIcon(x.tipo_atencion)}</i><div><b>${esc(attName(x.tipo_atencion))} · ${esc(x.id_orden||'OT')}</b><small>${esc(x.cliente_nombre||'Sin cliente')} · ${esc(x.grupo_asignado||x.grupo_actual||'Sin grupo')}</small></div><em>${esc(norm(x.estado||'').replaceAll('_',' '))}</em></div>`}
  function homeView(){
    const r=DATA?.resumen||{},free=freeOrders(),att=attention(),groups=DATA?.groups||[];
    const decision=[...att.slice(0,3),...free.slice(0,Math.max(0,3-att.length)).map(o=>({...o,tipo_atencion:'LIBRE',estado:'POR ASIGNAR'}))];
    return `<section class="supKpis"><article class="supKpi ${free.length?'warn':''}"><i>📥</i><strong>${free.length}</strong><b>Por asignar</b><small>OT libres</small></article><article class="supKpi"><i>🚐</i><strong>${Number(r.en_campo||0)}</strong><b>En campo</b><small>Operación activa</small></article><article class="supKpi ${att.length?'alert':'ok'}"><i>🔔</i><strong>${att.length}</strong><b>Requieren decisión</b><small>Atención del supervisor</small></article><article class="supKpi ok"><i>✅</i><strong>${Number(r.finalizadas||0)}</strong><b>Finalizadas</b><small>Completadas hoy</small></article></section>
      <section class="supCard"><header class="supCardHead"><b>Ahora requiere decisión</b><span>${decision.length} visibles</span></header><div class="supList">${decision.length?decision.map(x=>x.tipo_atencion==='LIBRE'?`<div class="supRow hot"><i>📥</i><div><b>OT por asignar · ${esc(x.id_orden||'OT')}</b><small>${esc(x.cliente_nombre||'Cliente')} · ${esc(String(x.tipo_trabajo||'Trabajo').replaceAll('_',' '))}</small></div><em>ASIGNAR</em></div>`:rowAttention(x)).join(''):'<div class="supEmpty">✓ No hay decisiones urgentes pendientes.</div>'}</div></section>
      <section class="supCard"><header class="supCardHead"><b>Estado de grupos</b><span>${groups.length} grupos</span></header>${groups.length?groups.slice(0,4).map(g=>`<div class="supGroup"><div class="supGroupTop"><b>${esc(g.nombre)}</b><strong>${Number(g.ordenes_activas||0)} OT</strong></div><div class="supChips"><span class="supChip ok">${(g.miembros||[]).length} técnicos</span>${groupNovelty(g)?'<span class="supChip warn">⚠ Con novedad</span>':'<span class="supChip ok">✓ Disponible</span>'}</div></div>`).join(''):'<div class="supEmpty">Sin grupos operativos.</div>'}</section>`;
  }
  function nav(){return `<nav class="supOpsBottom" aria-label="Navegación principal"><button class="supNav on" data-main="inicio">🏠<span>Inicio</span></button><button class="supNav" data-main="supervision">🛠️<span>Supervisión</span></button><button class="supNav" data-main="inventario">📦<span>Inventario</span></button><button class="supNav" data-main="chat">💬<span>Conversaciones</span></button></nav>`}
  function bind(root){
    root.querySelector('#supRefresh')?.addEventListener('click',load);
    root.querySelector('[data-main="inicio"]')?.addEventListener('click',showHome);
    root.querySelector('[data-main="supervision"]')?.addEventListener('click',()=>openModule(TARGET,'Supervisión técnica','supervision'));
    root.querySelector('[data-main="inventario"]')?.addEventListener('click',()=>openModule('inventario-supervisor.html','Inventario','inventario'));
    root.querySelector('[data-main="chat"]')?.addEventListener('click',()=>{
      const btn=document.querySelector('.chatManagerButton');if(btn){btn.click();return}
      alert('Conversaciones todavía está cargando. Intenta nuevamente en unos segundos.');
    });
  }
  function render(){
    const dash=document.querySelector('.menuDashboard');if(!dash)return false;
    dash.innerHTML=`<div id="supervisorDashboardV3" class="supLive">${header()}<main class="supOpsStage">${homeView()}</main>${nav()}</div>`;
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
      if(dash&&!DATA)dash.innerHTML=`<div class="supLive"><section class="supCard"><div class="supEmpty">⚠ No se pudo cargar la operación. Revisa la conexión e intenta actualizar.</div></section>${nav()}</div>`;
    }finally{loading=false}
  }
  function boot(){
    const dash=document.querySelector('.menuDashboard');if(!dash||!document.querySelector('.menuShell'))return false;
    hookFrame();document.body.classList.remove('moduleOpen','erpMobileMenuOpen');document.body.classList.add('supMobileDashboard');render();load();return true;
  }
  let tries=0;const timer=setInterval(()=>{if(boot()||++tries>60)clearInterval(timer)},100);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&document.body.classList.contains('supMobileDashboard'))load()});
  setInterval(()=>{if(!document.hidden&&document.body.classList.contains('supMobileDashboard'))load()},15000);
})();