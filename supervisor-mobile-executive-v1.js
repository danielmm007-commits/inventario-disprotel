(()=>{
  if(window.__disprotelSupervisorMobileWebParityV2)return;
  window.__disprotelSupervisorMobileWebParityV2=true;

  const KEY='disprotel_login_general_v2';
  const TARGET='panel-supervisor-vivo-v2.html';
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
  let me={};try{me=JSON.parse(sessionStorage.getItem(KEY)||'{}')}catch{}
  if(!norm(me.rol).includes('SUPERVISOR TECNICO')||!matchMedia('(max-width:680px)').matches)return;

  const css=document.createElement('style');
  css.id='supervisorMobileWebParityV2Style';
  css.textContent=`
    body.supSupervisorMobile.panelMenu .menuAside{display:none!important}
    body.supSupervisorMobile.panelMenu .supOpsBottom{grid-template-columns:repeat(4,1fr)!important}
    body.supSupervisorMobile.panelMenu .supNav span{font-size:7px!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .mobileModuleBar{display:none!important}
    body.supSupervisorMobile.panelMenu.moduleOpen .mobileModuleBar{display:flex!important}
    body.supSupervisorMobile.panelMenu.moduleOpen .menuStage{width:100%!important}
    body.supSupervisorMobile.panelMenu.moduleOpen .menuFrame{width:100%!important}
  `;
  document.head.appendChild(css);

  function frame(){return document.querySelector('iframe.menuFrame')}
  function setModuleTitle(text){const t=document.querySelector('.mobileModuleTitle');if(t)t.textContent=text}
  function openModule(href,title,origin=''){
    const f=frame();if(!f)return;
    if(origin)f.dataset.supOrigin=origin;else delete f.dataset.supOrigin;
    setModuleTitle(title);
    f.style.visibility='hidden';
    f.setAttribute('aria-busy','true');
    f.src=href+(href.includes('?')?'&':'?')+'v='+Date.now();
    document.body.classList.remove('supMobileDashboard','erpMobileMenuOpen');
    document.body.classList.add('moduleOpen');
  }
  function openSupervision(){openModule(TARGET,'Supervisión técnica','live')}
  function openInventory(){openModule('inventario-supervisor.html','Inventario')}
  function openChat(){
    const b=document.querySelector('.chatManagerButton');
    if(b){b.click();return}
    alert('Conversaciones todavía está cargando. Intenta nuevamente en unos segundos.');
  }
  function goHome(){
    if(window.DisprotelSupervisorMobile?.showDashboard)window.DisprotelSupervisorMobile.showDashboard('inicio');
    else location.reload();
    setTimeout(applyNav,30);
  }

  function navHtml(){return `
    <button class="supNav on" type="button" data-web-mobile="inicio">🏠<span>Inicio</span></button>
    <button class="supNav" type="button" data-web-mobile="supervision">🛠️<span>Supervisión</span></button>
    <button class="supNav" type="button" data-web-mobile="inventario">📦<span>Inventario</span></button>
    <button class="supNav" type="button" data-web-mobile="chat">💬<span>Conversaciones</span></button>`}

  function applyNav(){
    const nav=document.querySelector('.supOpsBottom');
    if(!nav)return false;
    if(nav.dataset.webParity!=='2'){
      nav.dataset.webParity='2';
      nav.innerHTML=navHtml();
    }
    return true;
  }

  function injectScript(d,id,src){
    if(d.getElementById(id))return true;
    const s=d.createElement('script');
    s.id=id;s.src=src+'?v='+Date.now();s.async=false;
    (d.body||d.documentElement).appendChild(s);
    return true;
  }

  function cleanPanelNav(d){
    const actions=d.querySelector('.actions');if(!actions)return;
    [...actions.querySelectorAll('a')].forEach(a=>{
      const href=String(a.getAttribute('href')||'').toLowerCase();
      if(href.includes('trabajos-tecnicos.html')||href.includes('inventario-supervisor.html')||href==='index.html'||href.endsWith('/index.html')){a.remove();return}
      if(href.includes('solicitudes-oficina.html'))a.textContent='➕ CREAR OT';
      if(href.includes('asignacion-ip.html'))a.textContent='🧰 MESA TÉCNICA DE CAMPO';
    });
    actions.style.gridTemplateColumns='repeat(2,minmax(0,1fr))';
    if(!d.getElementById('supMobilePanelStyle')){
      const st=d.createElement('style');st.id='supMobilePanelStyle';st.textContent='@media(max-width:680px){.wrap{padding:10px!important}.actions{grid-template-columns:1fr 1fr!important}.actions a{min-height:62px!important;font-size:12px!important}.grid,.cols{grid-template-columns:1fr!important}}';d.head.appendChild(st)
    }
  }

  function decorateMesa(d){
    d.title='Mesa técnica de campo · DISPROTEL';
    const loginTitle=d.querySelector('#login h1');if(loginTitle)loginTitle.textContent='🧰 Mesa técnica de campo';
    const quien=d.getElementById('quien');if(quien)quien.textContent=String(quien.textContent||'').replace(/^Asignación de IP/i,'Mesa técnica de campo');
    const pend=d.querySelector('#secPend h2');if(pend)pend.textContent='📡 Solicitudes técnicas de campo pendientes';
    const hist=d.querySelector('#secHist h2');if(hist)hist.textContent='🔎 Consultar IP actual / historial';
    const tabHist=d.getElementById('tabHist');if(tabHist)tabHist.textContent='🔎 CONSULTAR IP ACTUAL';
    if(!d.getElementById('mesaTecnicaScope')){
      const app=d.getElementById('app');
      if(app){const n=d.createElement('div');n.id='mesaTecnicaScope';n.className='msg ok';n.innerHTML='<b>🧰 Mesa técnica de campo</b><br>Asignación/consulta de IP y confirmación de acceso remoto.';app.insertBefore(n,app.children[1]||null)}
    }
  }

  function injectEnhancerSafely(f,w,d){
    if(d.getElementById('panelSupervisorDirectEnhanceLoader'))return true;
    const NativeMO=w.MutationObserver,captured=[];
    try{
      w.MutationObserver=class extends NativeMO{constructor(cb){super(cb);captured.push(this)}};
      const s=d.createElement('script');
      s.id='panelSupervisorDirectEnhanceLoader';
      s.src='panel-supervisor-direct-enhance-v1.js?v='+Date.now();
      s.async=false;
      s.onload=()=>{captured.forEach(o=>{try{o.disconnect()}catch{}});w.MutationObserver=NativeMO;injectScript(d,'supervisorReasignacionVisualLoader','supervisor-reasignacion-visual-v1.js')};
      s.onerror=()=>{w.MutationObserver=NativeMO};
      d.body.appendChild(s);
      setTimeout(()=>{captured.forEach(o=>{try{o.disconnect()}catch{}});if(w.MutationObserver!==NativeMO)w.MutationObserver=NativeMO},1500);
      return true;
    }catch(e){w.MutationObserver=NativeMO;console.warn('Enhancer móvil:',e);return false}
  }

  function returnToLive(f){
    try{
      f.dataset.supOrigin='live';
      setModuleTitle('Supervisión técnica');
      f.style.visibility='hidden';
      f.setAttribute('aria-busy','true');
      f.src=TARGET+'?v='+Date.now();
      document.body.classList.add('moduleOpen');
    }catch(e){console.warn('Regreso móvil a supervisión:',e)}
  }

  function installBackGuard(f,d){
    if(d.documentElement.dataset.supMobileBackGuard==='1')return;
    d.documentElement.dataset.supMobileBackGuard='1';
    d.addEventListener('click',e=>{
      const c=e.target?.closest?.('button,a');if(!c)return;
      const text=norm(c.textContent||'');
      const raw=String(c.getAttribute('onclick')||'')+' '+String(c.getAttribute('href')||'');
      if(!text.includes('ATRAS')&&!text.includes('VOLVER AL PANEL')&&!/principal\.html/i.test(raw))return;
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();returnToLive(f);
    },true);
  }

  function guardFrame(f){
    try{
      const w=f.contentWindow,d=f.contentDocument;if(!w||!d)return false;
      const path=String(w.location.pathname||'').toLowerCase();
      if(path.endsWith('/panel-supervisor-vivo-v2.html')){
        f.dataset.supOrigin='live';cleanPanelNav(d);injectEnhancerSafely(f,w,d);return true;
      }
      if(path.endsWith('/solicitudes-oficina.html')){
        injectScript(d,'supervisorOtFamiliasLoader','supervisor-ot-familias-v1.js');
        if(f.dataset.supOrigin==='live')installBackGuard(f,d);
        return true;
      }
      if(path.endsWith('/asignacion-ip.html')){
        decorateMesa(d);if(f.dataset.supOrigin==='live')installBackGuard(f,d);return true;
      }
      if(path.endsWith('/principal.html')&&f.dataset.supOrigin==='live'){
        setTimeout(()=>returnToLive(f),0);return true;
      }
      return false;
    }catch{return false}
  }

  function hookFrame(){
    const f=frame();if(!f)return false;
    if(f.dataset.supMobileWebHook!=='2'){
      f.dataset.supMobileWebHook='2';
      f.addEventListener('load',()=>setTimeout(()=>guardFrame(f),40));
    }
    guardFrame(f);return true;
  }

  document.addEventListener('click',e=>{
    const b=e.target?.closest?.('[data-web-mobile]');if(!b)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    const a=b.dataset.webMobile;
    if(a==='inicio')goHome();
    else if(a==='supervision')openSupervision();
    else if(a==='inventario')openInventory();
    else if(a==='chat')openChat();
  },true);

  document.addEventListener('click',e=>{
    const b=e.target?.closest?.('.supLive [data-view="operacion"]');
    if(!b)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openSupervision();
  },true);

  let queued=false;
  const apply=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;applyNav();hookFrame()})};
  new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true});
  [0,120,350,700,1400,2600].forEach(ms=>setTimeout(()=>{applyNav();hookFrame()},ms));
})();