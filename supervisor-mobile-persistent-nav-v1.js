(()=>{
  if(window.__disprotelSupervisorPersistentNavV1)return;
  window.__disprotelSupervisorPersistentNavV1=true;

  const KEY='disprotel_login_general_v2';
  const FRAME_VERSION='20260916-mobile-nav3';
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,' ').toUpperCase();
  let me={};try{me=JSON.parse(sessionStorage.getItem(KEY)||'{}')}catch{}
  if(!norm(me.rol).includes('SUPERVISOR TECNICO')||!matchMedia('(max-width:680px)').matches)return;

  const style=document.createElement('style');
  style.id='supervisorPersistentNavV1Style';
  style.textContent=`
    body.supSupervisorMobile .supOpsBottom{display:none!important}
    #supPersistentNav{position:fixed;left:7px;right:7px;bottom:7px;z-index:2147483000;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:3px;padding:5px;border:1px solid #d0e0e8;border-radius:17px;background:#fffffff2;backdrop-filter:blur(10px);box-shadow:0 8px 22px #071a382b}
    #supPersistentNav button{border:0;border-radius:11px;background:transparent;color:#607784;min-height:51px;padding:5px 2px;font-size:16px;line-height:1;touch-action:manipulation}
    #supPersistentNav button span{display:block;margin-top:4px;font-size:6.8px;font-weight:900;line-height:1.1}
    #supPersistentNav button.on{background:linear-gradient(145deg,#0c4c82,#148ca4);color:#fff;box-shadow:0 4px 10px #0b5c8d2c}
    #supPersistentNav button:active{transform:scale(.96)}
    body.supSupervisorMobile.panelMenu.moduleOpen .menuFrame{height:calc(100dvh - 156px)!important}
    body.supSupervisorMobile.panelMenu.moduleOpen .menuStage{padding-bottom:70px!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .supLive{padding-bottom:82px!important}
  `;
  document.head.appendChild(style);

  let active='inicio';
  let moduleActive=false;
  const navHtml=()=>`<nav id="supPersistentNav" aria-label="Navegación principal del supervisor"><button data-sup-nav="inicio">🏠<span>Inicio</span></button><button data-sup-nav="supervision">🛠️<span>Supervisión</span></button><button data-sup-nav="inventario">📦<span>Inventario</span></button><button data-sup-nav="chat">💬<span>Conversaciones</span></button></nav>`;

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
    setActive('inicio');
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
  }

  function triggerChatButton(btn){
    try{
      const EventCtor=window.PointerEvent||window.MouseEvent;
      btn.dispatchEvent(new EventCtor('pointerup',{bubbles:true,cancelable:true,pointerId:77,clientX:0,clientY:0}));
      return true;
    }catch{
      try{btn.dispatchEvent(new Event('pointerup',{bubbles:true,cancelable:true}));return true}catch{return false}
    }
  }

  function openChat(attempt=0){
    setActive('chat');
    const manager=document.querySelector('.chatManager');
    if(manager?.classList.contains('open'))return;
    const btn=document.querySelector('.chatManagerButton');
    if(btn){
      triggerChatButton(btn);
      setTimeout(()=>{
        if(!document.querySelector('.chatManager')?.classList.contains('open')&&attempt<2)openChat(attempt+1);
      },120);
      return;
    }
    if(attempt<12){setTimeout(()=>openChat(attempt+1),150);return}
    setActive(moduleActive?active:'inicio');
    alert('Conversaciones todavía está cargando. Intenta nuevamente en unos segundos.');
  }

  function openSection(name){
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
    const nav=document.getElementById('supPersistentNav');
    nav.addEventListener('click',e=>{
      const b=e.target.closest('[data-sup-nav]');if(!b)return;
      e.preventDefault();e.stopPropagation();openSection(b.dataset.supNav);
    });
    setActive(active);
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