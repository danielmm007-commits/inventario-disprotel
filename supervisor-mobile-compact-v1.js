(()=>{
  if(window.__disprotelFernandoFastV1)return;
  window.__disprotelFernandoFastV1=true;

  const KEY='disprotel_login_general_v2';
  const VERSION='20260916-fernando-fast1';
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,' ').toUpperCase();
  let me={};try{me=JSON.parse(sessionStorage.getItem(KEY)||'{}')}catch{}
  if(!norm(me.rol).includes('SUPERVISOR TECNICO')||!matchMedia('(max-width:680px)').matches)return;

  document.body.classList.add('fmFastSupervisor');
  document.getElementById('supPersistentNav')?.remove();
  document.getElementById('supervisorPersistentNavV1Style')?.remove();

  const style=document.createElement('style');
  style.id='fmFastSupervisorStyle';
  style.textContent=`
    body.fmFastSupervisor.panelMenu{background:#eef3f6!important;overflow:auto!important}
    body.fmFastSupervisor .menuAside{display:none!important}
    body.fmFastSupervisor .menuShell{display:block!important}
    body.fmFastSupervisor .menuStage{display:block!important;width:100%!important;height:auto!important;min-height:calc(100dvh - 46px)!important;background:#eef3f6!important;border-radius:0!important;overflow:visible!important}
    body.fmFastSupervisor .menuHome{display:block!important;padding:0!important;min-height:calc(100dvh - 46px)!important}
    body.fmFastSupervisor .menuHome>.main{display:none!important}
    body.fmFastSupervisor .menuDashboard{display:block!important;padding:0!important}
    body.fmFastSupervisor .menuFrame{display:none!important;border:0!important;width:100%!important;background:#eef3f6!important}
    body.fmFastSupervisor .mobileModuleBar{display:none!important}

    body.fmFastSupervisor .topin{min-height:46px!important;padding:4px 8px!important;gap:6px!important}
    body.fmFastSupervisor .logoBox{width:54px!important;height:32px!important;flex:0 0 54px!important;border-radius:7px!important}
    body.fmFastSupervisor .brand{min-width:0!important;flex:1!important}
    body.fmFastSupervisor .brand b{font-size:11px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
    body.fmFastSupervisor .brand span,body.fmFastSupervisor .who{display:none!important}
    body.fmFastSupervisor .logout{padding:6px 9px!important;font-size:9px!important;border-radius:9px!important;margin-left:auto!important}

    body.fmFastSupervisor.fmModuleOpen{overflow:hidden!important}
    body.fmFastSupervisor.fmModuleOpen .menuHome{display:none!important}
    body.fmFastSupervisor.fmModuleOpen .mobileModuleBar{display:flex!important;align-items:center!important;min-height:40px!important;padding:5px 8px!important;background:#fff!important;border-bottom:1px solid #d9e4ea!important}
    body.fmFastSupervisor.fmModuleOpen .mobileModuleBack{display:none!important}
    body.fmFastSupervisor.fmModuleOpen .mobileModuleTitle{font-size:11px!important;color:#173b5c!important}
    body.fmFastSupervisor.fmModuleOpen .menuFrame{display:block!important;height:calc(100dvh - 145px)!important;visibility:visible!important}

    #fmSupervisorHome{padding:12px 10px 82px;max-width:620px;margin:auto}
    .fmHero{background:linear-gradient(135deg,#082754,#0d5d92);color:#fff;border-radius:17px;padding:15px;box-shadow:0 8px 22px #0b315522}
    .fmHero small{font-size:8px;font-weight:900;letter-spacing:.12em;color:#bdeaff}.fmHero h1{font-size:20px;margin:5px 0 4px}.fmHero p{font-size:9px;line-height:1.35;margin:0;color:#dcecf7}
    .fmTitle{margin:14px 2px 7px;font-size:11px;font-weight:1000;color:#254a61}
    .fmQuick{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .fmQuick button{min-height:105px;border:1px solid #d8e4ea;border-radius:15px;background:#fff;padding:12px;text-align:left;box-shadow:0 4px 12px #071a3808;color:#173b5c;touch-action:manipulation}
    .fmQuick button:active{transform:scale(.98)}.fmQuick i{display:block;font-style:normal;font-size:24px}.fmQuick b{display:block;margin-top:8px;font-size:11px}.fmQuick span{display:block;margin-top:4px;font-size:8px;line-height:1.3;color:#748791}
    .fmNote{margin-top:10px;padding:10px 11px;border:1px solid #d9e5eb;border-radius:12px;background:#f8fbfc;color:#6f818b;font-size:8px;line-height:1.4}

    #fmBottomNav{position:fixed;left:7px;right:7px;bottom:calc(7px + env(safe-area-inset-bottom));z-index:2147483000;height:58px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:3px;padding:4px;border:1px solid #cfdee6;border-radius:17px;background:#fffffff4;box-shadow:0 8px 22px #071a382c;backdrop-filter:blur(10px)}
    #fmBottomNav button,#fmBottomNav .fmChatSlot{border:0;border-radius:11px;background:transparent;color:#657b87;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font-size:16px;line-height:1;min-width:0}
    #fmBottomNav button span,#fmBottomNav .fmChatSlot span{font-size:7px;font-weight:900;line-height:1.05}
    #fmBottomNav button.on{background:#0d5a89;color:#fff}
    #fmBottomNav button:active{transform:scale(.96)}

    body.fmFastSupervisor .chatManagerButton{position:fixed!important;left:auto!important;top:auto!important;right:7px!important;bottom:calc(7px + env(safe-area-inset-bottom))!important;width:calc((100vw - 23px)/4)!important;height:58px!important;z-index:2147483100!important;opacity:.001!important;background:transparent!important;border:0!important;border-radius:11px!important;padding:0!important;box-shadow:none!important;transform:none!important;touch-action:manipulation!important}
    body.fmFastSupervisor .chatManager{position:fixed!important;left:8px!important;right:8px!important;top:52px!important;bottom:calc(73px + env(safe-area-inset-bottom))!important;width:auto!important;max-height:none!important;z-index:2147483200!important;border-radius:16px!important;touch-action:auto!important}
  `;
  document.head.appendChild(style);

  let current='inicio';
  const frame=()=>document.querySelector('.menuFrame');
  const dashboard=()=>document.querySelector('.menuDashboard');
  const titleEl=()=>document.querySelector('.mobileModuleTitle');

  function setActive(name){
    current=name||'inicio';
    document.querySelectorAll('#fmBottomNav [data-fm-nav]').forEach(b=>b.classList.toggle('on',b.dataset.fmNav===current));
  }

  function renderHome(){
    const d=dashboard();if(!d)return false;
    d.innerHTML=`<section id="fmSupervisorHome"><header class="fmHero"><small>SUPERVISOR TÉCNICO</small><h1>Fernando · Centro técnico</h1><p>Accesos rápidos. Los datos operativos se cargan solamente cuando abres Supervisión.</p></header><div class="fmTitle">Acciones de trabajo</div><div class="fmQuick"><button data-fm-open="supervision"><i>🛠️</i><b>Supervisión técnica</b><span>Operación del día, grupos, OT y novedades.</span></button><button data-fm-open="crear"><i>➕</i><b>Crear OT</b><span>Instalación o soporte con varias actividades.</span></button><button data-fm-open="mesa"><i>📡</i><b>Mesa técnica</b><span>IP, scanner y acceso remoto.</span></button><button data-fm-open="inventario"><i>📦</i><b>Inventario</b><span>Consulta y control de equipos y materiales.</span></button></div><div class="fmNote">Este Inicio no hace consultas automáticas ni refrescos en segundo plano.</div></section>`;
    d.querySelector('[data-fm-open="supervision"]')?.addEventListener('click',()=>openModule('panel-supervisor-vivo-v2.html','Supervisión técnica','supervision'));
    d.querySelector('[data-fm-open="crear"]')?.addEventListener('click',()=>openModule('solicitudes-oficina.html','Crear OT','supervision'));
    d.querySelector('[data-fm-open="mesa"]')?.addEventListener('click',()=>openModule('asignacion-ip.html','Mesa técnica de campo','supervision'));
    d.querySelector('[data-fm-open="inventario"]')?.addEventListener('click',()=>openModule('inventario-supervisor.html','Inventario','inventario'));
    return true;
  }

  function mountNav(){
    document.getElementById('fmBottomNav')?.remove();
    document.body.insertAdjacentHTML('beforeend',`<nav id="fmBottomNav" aria-label="Navegación de Fernando"><button data-fm-nav="inicio">🏠<span>Inicio</span></button><button data-fm-nav="supervision">🛠️<span>Supervisión</span></button><button data-fm-nav="inventario">📦<span>Inventario</span></button><div class="fmChatSlot">💬<span>Chat</span></div></nav>`);
    const n=document.getElementById('fmBottomNav');
    n.querySelector('[data-fm-nav="inicio"]')?.addEventListener('click',showHome);
    n.querySelector('[data-fm-nav="supervision"]')?.addEventListener('click',()=>openModule('panel-supervisor-vivo-v2.html','Supervisión técnica','supervision'));
    n.querySelector('[data-fm-nav="inventario"]')?.addEventListener('click',()=>openModule('inventario-supervisor.html','Inventario','inventario'));
    setActive(current);
  }

  function injectScript(d,id,src){
    if(d.getElementById(id))return;
    const s=d.createElement('script');s.id=id;s.src=src;s.async=false;(d.body||d.documentElement).appendChild(s);
  }

  function cleanSupervision(d){
    const actions=d.querySelector('.actions');if(!actions)return;
    [...actions.querySelectorAll('a')].forEach(a=>{
      const href=String(a.getAttribute('href')||'').toLowerCase();
      if(href.includes('trabajos-tecnicos.html')||href==='index.html'||href.endsWith('/index.html'))a.remove();
      else if(href.includes('solicitudes-oficina.html'))a.textContent='➕ CREAR OT';
      else if(href.includes('asignacion-ip.html'))a.textContent='🧰 MESA TÉCNICA DE CAMPO';
    });
    actions.style.gridTemplateColumns='repeat(2,minmax(0,1fr))';
  }

  function decorateMesa(d){
    d.title='Mesa técnica de campo · DISPROTEL';
    const h=d.querySelector('#login h1');if(h)h.textContent='🧰 Mesa técnica de campo';
    const q=d.getElementById('quien');if(q)q.textContent=String(q.textContent||'').replace(/^Asignación de IP/i,'Mesa técnica de campo');
    const p=d.querySelector('#secPend h2');if(p)p.textContent='📡 Solicitudes técnicas de campo pendientes';
    const hi=d.querySelector('#secHist h2');if(hi)hi.textContent='🔎 Consultar IP actual / historial';
    const tab=d.getElementById('tabHist');if(tab)tab.textContent='🔎 CONSULTAR IP ACTUAL';
  }

  function inspectFrame(){
    const f=frame();if(!f)return;
    try{
      const d=f.contentDocument,w=f.contentWindow;if(!d||!w)return;
      const path=String(w.location.pathname||'').toLowerCase();
      if(path.endsWith('/principal.html')){showHome();return}
      if(path.endsWith('/panel-supervisor-vivo-v2.html')){setActive('supervision');cleanSupervision(d)}
      if(path.endsWith('/solicitudes-oficina.html')){setActive('supervision');injectScript(d,'supervisorOtFamiliasLoader','supervisor-ot-familias-v1.js?v='+VERSION)}
      if(path.endsWith('/asignacion-ip.html')){setActive('supervision');decorateMesa(d)}
      if(path.endsWith('/inventario-supervisor.html'))setActive('inventario');
    }catch{}
  }

  function openModule(href,title,origin){
    const f=frame();if(!f){location.href=href;return}
    document.querySelector('.chatManager')?.classList.remove('open');
    setActive(origin);
    if(titleEl())titleEl().textContent=title;
    document.body.classList.add('fmModuleOpen');
    document.body.classList.remove('erpMobileMenuOpen');
    const url=href+(href.includes('?')?'&':'?')+'v='+VERSION;
    if(f.dataset.fmUrl!==url){f.dataset.fmUrl=url;f.src=url}
    else{f.style.visibility='visible';inspectFrame()}
    try{
      if(history.state?.fmFernandoView!=='module')history.pushState({fmFernandoView:'module'},'',location.pathname+location.search+'#fm-'+origin);
      else history.replaceState({fmFernandoView:'module'},'',location.pathname+location.search+'#fm-'+origin);
    }catch{}
  }

  function showHome(){
    document.querySelector('.chatManager')?.classList.remove('open');
    document.body.classList.remove('fmModuleOpen','erpMobileMenuOpen');
    setActive('inicio');
    renderHome();
    window.scrollTo(0,0);
    try{history.replaceState({fmFernandoView:'home'},'',location.pathname+location.search)}catch{}
  }

  window.DisprotelSupervisorMobile={showDashboard:showHome,showMenu:showHome};

  function boot(){
    const d=dashboard(),f=frame();if(!d||!f)return false;
    if(f.dataset.fmFastHook!=='1'){
      f.dataset.fmFastHook='1';
      f.addEventListener('load',()=>{f.style.visibility='visible';f.removeAttribute('aria-busy');inspectFrame()});
    }
    renderHome();mountNav();showHome();
    return true;
  }

  window.addEventListener('popstate',()=>{
    if(document.body.classList.contains('fmModuleOpen'))showHome();
  });

  let tries=0;
  const timer=setInterval(()=>{if(boot()||++tries>25)clearInterval(timer)},80);
})();