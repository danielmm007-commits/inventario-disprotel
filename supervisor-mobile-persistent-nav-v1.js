(()=>{
  if(window.__disprotelSupervisorPersistentNavV1)return;
  window.__disprotelSupervisorPersistentNavV1=true;

  const KEY='disprotel_login_general_v2';
  const FRAME_VERSION='20260916-mobile-nav4';
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,' ').toUpperCase();
  let me={};try{me=JSON.parse(sessionStorage.getItem(KEY)||'{}')}catch{}
  if(!norm(me.rol).includes('SUPERVISOR TECNICO')||!matchMedia('(max-width:680px)').matches)return;

  const style=document.createElement('style');
  style.id='supervisorPersistentNavV1Style';
  style.textContent=`
    body.supSupervisorMobile .supOpsBottom{display:none!important}
    body.supSupervisorMobile .chatManagerButton{opacity:0!important;pointer-events:none!important;width:1px!important;height:1px!important;padding:0!important;border:0!important;overflow:hidden!important}
    body.supSupervisorMobile .chatManager{z-index:2147482500!important;left:8px!important;right:8px!important;top:52px!important;bottom:calc(66px + env(safe-area-inset-bottom))!important;width:auto!important;max-height:none!important;border-radius:18px!important}
    #supPersistentNav{position:fixed;left:50%;bottom:calc(7px + env(safe-area-inset-bottom));z-index:2147483000;width:min(420px,calc(100vw - 14px));display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:3px;padding:5px;border:1px solid #d0e0e8;border-radius:20px;background:#fffffff2;backdrop-filter:blur(14px);box-shadow:0 8px 22px #071a382b;transform:translateX(-50%);transition:width .22s ease,height .22s ease,padding .22s ease,opacity .2s ease,transform .22s ease;overflow:hidden}
    #supPersistentNav::after{content:'';position:absolute;left:50%;bottom:4px;width:34px;height:4px;border-radius:999px;background:#94aab6;opacity:0;transform:translateX(-50%);transition:.18s;pointer-events:none}
    #supPersistentNav button{border:0;border-radius:13px;background:transparent;color:#607784;min-height:50px;padding:5px 2px;font-size:16px;line-height:1;touch-action:manipulation;transition:opacity .15s ease,transform .15s ease,background .15s ease}
    #supPersistentNav button span{display:block;margin-top:4px;font-size:6.8px;font-weight:900;line-height:1.1}
    #supPersistentNav button.on{background:linear-gradient(145deg,#0c4c82,#148ca4);color:#fff;box-shadow:0 4px 10px #0b5c8d2c}
    #supPersistentNav button:active{transform:scale(.95)}
    #supPersistentNav.collapsed{width:82px;height:14px;padding:0;border-radius:999px;background:#f8fbfdd9;box-shadow:0 5px 15px #071a3824;cursor:pointer}
    #supPersistentNav.collapsed::after{opacity:1;bottom:5px;width:42px}
    #supPersistentNav.collapsed button{opacity:0;pointer-events:none;transform:translateY(12px)}
    body.supSupervisorMobile.panelMenu.moduleOpen .menuFrame{height:calc(100dvh - 104px)!important}
    body.supSupervisorMobile.panelMenu.moduleOpen .menuStage{padding-bottom:18px!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .supLive{padding-bottom:72px!important}
  `;
  document.head.appendChild(style);

  let active='inicio';
  let moduleActive=false;
  let collapseTimer=null;
  let lastScrollY=window.scrollY||0;
  const navHtml=()=>`<nav id="supPersistentNav" aria-label="Navegación principal del supervisor"><button data-sup-nav="inicio">🏠<span>Inicio</span></button><button data-sup-nav="supervision">🛠️<span>Supervisión</span></button><button data-sup-nav="inventario">📦<span>Inventario</span></button><button data-sup-nav="chat">💬<span>Conversaciones</span></button></nav>`;

  function navEl(){return document.getElementById('supPersistentNav')}
  function expandNav(auto=true){
    const nav=navEl();if(!nav)return;
    nav.classList.remove('collapsed');
    clearTimeout(collapseTimer);
    if(auto)collapseTimer=setTimeout(()=>collapseNav(),2400);
  }
  function collapseNav(){
    const nav=navEl();if(nav)nav.classList.add('collapsed');
    clearTimeout(collapseTimer);
  }
  function setActive(name){
    active=name||'inicio';
    document.querySelectorAll('#supPersistentNav [data-sup-nav]').forEach(b=>b.classList.toggle('on',b.dataset.supNav===active));
  }

  function normalizeHomeState(){
    try{
      const base=location.pathname+location.search;
      history.replaceState({...history.state,__supMobileShell:true,view:'inicio'},'',base);
    }catch{}
  }

  function markModuleState(name){
    try{
      const next={...history.state,__supMobileShell:true,view:name};
      const url=location.pathname+location.search+'#sup-'+name;
      if(history.state?.__supMobileShell&&history.state?.view!=='inicio')history.replaceState(next,'',url);
      else history.pushState(next,'',url);
    }catch{}
  }

  function forceHome(updateHistory=true){
    moduleActive=false;
    active='inicio';
    try{window.DisprotelSupervisorMobile?.showDashboard?.()}catch{}
    document.body.classList.remove('moduleOpen','erpMobileMenuOpen');
    document.body.classList.add('supMobileDashboard');
    document.querySelector('.chatManager')?.classList.remove('open');
    setActive('inicio');
    expandNav();
    if(updateHistory)normalizeHomeState();
  }

  function setModuleTitle(text){
    const el=document.querySelector('.mobileModuleTitle');
    if(el)el.textContent=text||'Módulo';
  }

  function openFrame(name,href,title,attempt=0){
    const f=document.querySelector('.menuFrame');
    if(!f){
      if(attempt<8){setTimeout(()=>openFrame(name,href,title,attempt+1),100);return}
      return;
    }
    document.querySelector('.chatManager')?.classList.remove('open');
    moduleActive=true;
    setActive(name);
    markModuleState(name);
    f.dataset.supMobileOrigin=name;
    setModuleTitle(title);
    f.style.visibility='hidden';
    f.setAttribute('aria-busy','true');
    const sep=href.includes('?')?'&':'?';
    f.src=href+sep+'v='+FRAME_VERSION;
    document.body.classList.remove('supMobileDashboard','erpMobileMenuOpen');
    document.body.classList.add('moduleOpen');
    expandNav();
  }

  function triggerChatButton(btn){
    try{
      const EventCtor=window.PointerEvent||window.MouseEvent;
      const down=new EventCtor('pointerdown',{bubbles:true,cancelable:true,pointerId:77,isPrimary:true,buttons:1,clientX:1,clientY:1});
      const up=new EventCtor('pointerup',{bubbles:true,cancelable:true,pointerId:77,isPrimary:true,buttons:0,clientX:1,clientY:1});
      const ownCapture=Object.prototype.hasOwnProperty.call(btn,'setPointerCapture');
      const previousCapture=btn.setPointerCapture;
      try{btn.setPointerCapture=()=>{}}catch{}
      btn.dispatchEvent(down);
      btn.dispatchEvent(up);
      try{if(ownCapture)btn.setPointerCapture=previousCapture;else delete btn.setPointerCapture}catch{}
      return true;
    }catch(e){
      console.warn('Chat móvil:',e);
      return false;
    }
  }

  function openChat(attempt=0){
    const manager=document.querySelector('.chatManager');
    if(manager?.classList.contains('open')){
      setActive('chat');
      expandNav();
      return;
    }
    const btn=document.querySelector('.chatManagerButton');
    if(btn){
      setActive('chat');
      triggerChatButton(btn);
      setTimeout(()=>{
        const opened=document.querySelector('.chatManager')?.classList.contains('open');
        if(opened){moduleActive=true;expandNav();return}
        if(attempt<3){openChat(attempt+1);return}
      },180);
      return;
    }
    if(attempt<14){setTimeout(()=>openChat(attempt+1),150);return}
    alert('Conversaciones todavía está cargando. Intenta nuevamente en unos segundos.');
  }

  function openSection(name){
    expandNav(false);
    if(name==='inicio'){forceHome(true);return}
    if(name==='chat'){openChat();return}
    if(name==='supervision'){
      openFrame('supervision','panel-supervisor-vivo-v2.html','Supervisión técnica');
      return;
    }
    if(name==='inventario'){
      openFrame('inventario','inventario-supervisor.html','Inventario');
    }
  }

  function mount(){
    if(document.getElementById('supPersistentNav'))return true;
    document.body.insertAdjacentHTML('beforeend',navHtml());
    const nav=navEl();
    nav.addEventListener('click',e=>{
      if(nav.classList.contains('collapsed')){
        e.preventDefault();e.stopPropagation();expandNav();return;
      }
      const b=e.target.closest('[data-sup-nav]');if(!b)return;
      e.preventDefault();e.stopPropagation();openSection(b.dataset.supNav);
      collapseTimer=setTimeout(()=>collapseNav(),2200);
    });
    nav.addEventListener('pointerdown',()=>expandNav(false),{passive:true});
    setActive(active);
    expandNav();
    return true;
  }

  function inspectFrame(){
    const f=document.querySelector('.menuFrame');if(!f)return;
    try{
      const path=String(f.contentWindow?.location?.pathname||'').toLowerCase();
      if(path.endsWith('/principal.html')){
        setTimeout(()=>forceHome(true),0);
        return;
      }
      if(path.endsWith('/inventario-supervisor.html')){moduleActive=true;setActive('inventario');return}
      if(path.endsWith('/panel-supervisor-vivo-v2.html')||path.endsWith('/solicitudes-oficina.html')||path.endsWith('/asignacion-ip.html')){moduleActive=true;setActive('supervision');return}
    }catch{}
  }

  function hookFrame(){
    const f=document.querySelector('.menuFrame');if(!f)return false;
    if(f.dataset.supPersistentNavHook!=='1'){
      f.dataset.supPersistentNavHook='1';
      f.addEventListener('load',()=>setTimeout(inspectFrame,40));
    }
    inspectFrame();return true;
  }

  window.addEventListener('scroll',()=>{
    const y=window.scrollY||0,delta=y-lastScrollY;
    if(delta>10)collapseNav();
    else if(delta<-8)expandNav();
    lastScrollY=y;
  },{passive:true});

  window.addEventListener('popstate',()=>{
    if(!moduleActive)return;
    forceHome(true);
  });

  window.addEventListener('click',e=>{
    if(!e.target?.closest?.('.mobileModuleBack'))return;
    setTimeout(()=>forceHome(true),0);
  },true);

  normalizeHomeState();
  mount();
  hookFrame();

  let tries=0;
  const timer=setInterval(()=>{
    mount();
    if(hookFrame()||++tries>=12)clearInterval(timer);
  },250);
})();