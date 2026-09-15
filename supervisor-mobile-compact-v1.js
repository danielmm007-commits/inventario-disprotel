(()=>{
  if(window.__disprotelSupervisorMobileCompactV2)return;
  window.__disprotelSupervisorMobileCompactV2=true;

  const KEY='disprotel_login_general_v2';
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
  let me={};try{me=JSON.parse(sessionStorage.getItem(KEY)||'{}')}catch{}
  if(!norm(me.rol).includes('SUPERVISOR TECNICO')||!matchMedia('(max-width:680px)').matches)return;

  const style=document.createElement('style');
  style.id='supervisorMobileCompactV2Style';
  style.textContent=`
    /* Encabezado general: mínimo y funcional */
    body.supSupervisorMobile.panelMenu .topin{padding:3px 6px!important;gap:4px!important;min-height:44px!important}
    body.supSupervisorMobile.panelMenu .logoBox{width:50px!important;height:29px!important;border-radius:7px!important;flex:0 0 50px!important}
    body.supSupervisorMobile.panelMenu .brand{min-width:0!important;flex:1!important}
    body.supSupervisorMobile.panelMenu .brand b{font-size:11px!important;line-height:1!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
    body.supSupervisorMobile.panelMenu .brand span{display:none!important}
    body.supSupervisorMobile.panelMenu .panelTools{gap:3px!important;margin-left:auto!important}
    body.supSupervisorMobile.panelMenu>.topbar .panelConnected{min-height:24px!important;padding:0 6px!important;font-size:7px!important;box-shadow:0 0 0 2px #36d47b18,0 0 8px #29d77645!important}
    body.supSupervisorMobile.panelMenu .userAvatar{width:31px!important;height:31px!important;font-size:16px!important;border-width:2px!important}
    body.supSupervisorMobile.panelMenu .logout{padding:5px 7px!important;font-size:9px!important;border-radius:8px!important;margin-left:1px!important}

    /* Menú ejecutivo */
    body.supSupervisorMobile.panelMenu:not(.moduleOpen):not(.supMobileDashboard){overflow:auto!important;background:#eef5f8!important}
    body.supSupervisorMobile.panelMenu:not(.moduleOpen):not(.supMobileDashboard) .menuShell{height:auto!important;min-height:calc(100dvh - 44px)!important;padding:7px!important;background:#eef5f8!important;overflow:visible!important}
    body.supSupervisorMobile.panelMenu:not(.moduleOpen):not(.supMobileDashboard) .menuAside{position:relative!important;display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;grid-auto-rows:auto!important;align-content:start!important;gap:9px!important;width:100%!important;height:auto!important;min-height:0!important;padding:14px 12px 13px!important;border-radius:20px!important;overflow:visible!important;background:linear-gradient(155deg,#06234a 0%,#084565 58%,#0b5968 100%)!important;box-shadow:0 18px 38px #082b5c2a!important}
    body.supSupervisorMobile.panelMenu .menuAside .sideTitle{grid-column:1/-1!important;min-height:62px!important;margin:0 0 2px!important;padding:2px 98px 10px 2px!important;border-bottom:1px solid #ffffff24!important}
    body.supSupervisorMobile.panelMenu .menuAside .sideTitle .navAvatar{width:36px!important;height:36px!important;margin:0 0 5px!important;border-radius:11px!important;font-size:19px!important}
    body.supSupervisorMobile.panelMenu .menuAside .sideTitle b{display:block!important;font-size:16px!important;line-height:1!important;color:#fff!important}
    body.supSupervisorMobile.panelMenu .menuAside .sideTitle small{display:block!important;font-size:9px!important;color:#b9d8ef!important;margin-top:4px!important}
    body.supSupervisorMobile.panelMenu .menuAside .erpHomeButton{position:absolute!important;right:12px!important;top:15px!important;width:auto!important;min-height:36px!important;height:36px!important;padding:0 10px!important;display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:center!important;gap:5px!important;border:1px solid #ffffff45!important;border-radius:11px!important;background:#ffffff14!important;font-size:16px!important;box-shadow:none!important;z-index:4!important}
    body.supSupervisorMobile.panelMenu .menuAside .erpHomeButton span:last-child{display:block!important;padding:0!important;background:transparent!important;font-size:9px!important;border-radius:0!important}
    body.supSupervisorMobile.panelMenu .menuAside .navGroup{display:block!important;grid-column:1/-1!important;margin:2px 0 -1px!important;padding:5px 2px 1px!important;font-size:8px!important;letter-spacing:1.35px!important;color:#8dd8ef!important;text-align:left!important}

    body.supSupervisorMobile.panelMenu:not(.moduleOpen):not(.supMobileDashboard) .menuAside button[data-href]{position:relative!important;display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:center!important;gap:7px!important;min-height:84px!important;padding:12px 11px!important;border:1px solid #ffffff22!important;border-radius:16px!important;background:linear-gradient(145deg,#ffffff13,#ffffff08)!important;color:#fff!important;text-align:left!important;transform:none!important;box-shadow:inset 0 1px 0 #ffffff10!important;overflow:hidden!important;animation:supExecCardIn .42s cubic-bezier(.2,.8,.2,1) both!important}
    body.supSupervisorMobile.panelMenu:not(.moduleOpen):not(.supMobileDashboard) .menuAside button[data-href] span{display:block!important;max-width:100%!important;padding:0!important;border-radius:0!important;background:transparent!important;color:#fff!important;font-size:10px!important;line-height:1.22!important;font-weight:900!important;text-align:left!important}
    body.supSupervisorMobile.panelMenu:not(.moduleOpen):not(.supMobileDashboard) .menuAside button[data-href]:active{transform:scale(.97)!important;filter:brightness(1.13)!important}
    body.supSupervisorMobile.panelMenu:not(.moduleOpen):not(.supMobileDashboard) .menuAside button[data-href].supExecPrimary{grid-column:1/-1!important;min-height:92px!important;padding-right:102px!important;background:linear-gradient(120deg,#0b70b4,#0d9ab2 72%,#19b68d)!important;border-color:#72dff1!important;box-shadow:0 9px 23px #031b3840,0 0 0 1px #ffffff13 inset!important;animation:supExecCardIn .42s cubic-bezier(.2,.8,.2,1) both,supExecPriority 2.8s ease-in-out 1.1s infinite!important}
    body.supSupervisorMobile.panelMenu:not(.moduleOpen):not(.supMobileDashboard) .menuAside button[data-href].supExecPrimary:after{content:'PRIORIDAD';position:absolute;right:12px;top:12px;padding:5px 7px;border-radius:999px;background:#e8fbff;color:#07567b;font-size:7px;font-weight:1000;letter-spacing:.7px;box-shadow:0 5px 12px #01294b25}
    body.supSupervisorMobile.panelMenu:not(.moduleOpen):not(.supMobileDashboard) .menuAside button[data-href].supExecPrimary:before{content:'Atender activaciones y accesos de campo';position:absolute;left:11px;bottom:10px;color:#dff9ff;font-size:8px;font-weight:700;opacity:.9}
    body.supSupervisorMobile.panelMenu:not(.moduleOpen):not(.supMobileDashboard) .menuAside button[data-href].supExecSupervision{animation-delay:.06s!important}
    body.supSupervisorMobile.panelMenu:not(.moduleOpen):not(.supMobileDashboard) .menuAside button[data-href].supExecRequirements{animation-delay:.12s!important}
    body.supSupervisorMobile.panelMenu:not(.moduleOpen):not(.supMobileDashboard) .menuAside button[data-href].supExecInventory{animation-delay:.18s!important}

    body.supSupervisorMobile.panelMenu .menuAside .supExecChat{grid-column:auto!important;min-height:84px!important;margin:0!important;padding:11px!important;border:1px solid #ffffff22!important;border-radius:16px!important;background:linear-gradient(145deg,#ffffff13,#ffffff08)!important;color:#fff!important;overflow:hidden!important;animation:supExecCardIn .42s .24s cubic-bezier(.2,.8,.2,1) both!important}
    body.supSupervisorMobile.panelMenu .menuAside .supExecChat *{max-width:100%!important}
    body.supSupervisorMobile.panelMenu .menuAside .supExecChat button{min-height:40px!important;border-radius:11px!important}
    body.supSupervisorMobile.panelMenu .menuAside .supExecChat .supExecHide{display:none!important}

    /* Inicio: sin barra azul, controles integrados en el bloque verde */
    body.supSupervisorMobile.panelMenu.supMobileDashboard .menuStage{height:calc(100dvh - 44px)!important;overflow:auto!important;background:#eef5f8!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .mobileModuleBar{display:none!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .menuHome{display:block!important;min-height:calc(100dvh - 44px)!important;padding:7px!important;background:#eef5f8!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .menuDashboard{display:block!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .dashHero{position:relative!important;padding:14px 13px 13px!important;padding-right:12px!important;border-radius:16px!important;gap:7px!important;animation:supHeroIn .38s ease both!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .dashHero small{font-size:7.5px!important;letter-spacing:.4px!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .dashHero h1{font-size:20px!important;line-height:1.05!important;margin:5px 0 5px!important;padding-right:0!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .dashHero p{font-size:10px!important;line-height:1.25!important;margin:0 0 9px!important;max-width:72%!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .dashHeroActions{width:100%!important;margin:0!important;display:flex!important;justify-content:flex-end!important;align-items:center!important;gap:6px!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .dashHeroActions .panelConnected{display:none!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .dashHeroActions button{min-height:32px!important;height:32px!important;padding:0 9px!important;font-size:9px!important;border-radius:9px!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .supHeroHome{margin-right:auto!important;width:34px!important;min-width:34px!important;padding:0!important;font-size:15px!important;background:#ffffff18!important;color:#fff!important;border-color:#ffffff55!important;box-shadow:none!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .dashGrid{margin-top:7px!important;gap:7px!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .dashPanel{padding:10px!important;border-radius:13px!important;animation:supPanelIn .34s ease both!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .dashPanel:nth-child(2){animation-delay:.05s!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .dashPanel:nth-child(3){animation-delay:.1s!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .dashPanel h2{font-size:14px!important;margin-bottom:2px!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .dashSub{font-size:9px!important;margin-bottom:7px!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .dashMetrics{gap:6px!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .dashMetric{padding:8px!important;border-radius:11px!important;min-height:83px!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .dashMetric strong{font-size:20px!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .dashMetric span{font-size:7.4px!important;line-height:1.15!important}

    @keyframes supExecCardIn{from{opacity:0;transform:translateY(12px) scale(.985)}to{opacity:1;transform:none}}
    @keyframes supExecPriority{0%,100%{box-shadow:0 9px 23px #031b3840,0 0 0 0 #49d8ee00}50%{box-shadow:0 11px 27px #031b3852,0 0 0 5px #49d8ee18}}
    @keyframes supHeroIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
    @keyframes supPanelIn{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}
    @media(prefers-reduced-motion:reduce){body.supSupervisorMobile.panelMenu *{animation:none!important;transition:none!important}}
  `;
  document.head.appendChild(style);

  function goMenu(){
    document.body.classList.remove('moduleOpen','supMobileDashboard','erpMobileMenuOpen');
    const frame=document.querySelector('.menuFrame');
    if(frame){frame.src='about:blank';frame.style.visibility='hidden';frame.removeAttribute('aria-busy')}
    document.querySelectorAll('.menuAside button').forEach(x=>x.classList.remove('on'));
    window.scrollTo(0,0);
  }

  function openNewModule(btn){
    const frame=document.querySelector('.menuFrame');
    const bar=document.querySelector('.mobileModuleBar');
    const title=bar?.querySelector('.mobileModuleTitle');
    if(!frame)return;
    if(title)title.textContent=btn.querySelector('span')?.textContent||'Módulo';
    frame.style.visibility='hidden';frame.setAttribute('aria-busy','true');
    frame.src=btn.dataset.href+(btn.dataset.href.includes('?')?'&':'?')+'v='+Date.now();
    document.body.classList.remove('supMobileDashboard');
    document.body.classList.add('moduleOpen');
    document.querySelectorAll('.menuAside button').forEach(x=>x.classList.toggle('on',x===btn));
  }

  function ensureRequirements(aside){
    let req=[...aside.querySelectorAll('button[data-href]')].find(b=>norm(b.textContent).includes('REQUERIMIENTOS A TECNICOS'));
    if(req)return req;
    req=document.createElement('button');
    req.type='button';req.dataset.href='solicitudes-oficina.html';req.title='Requerimientos a técnicos';
    req.innerHTML='📋 <span>Requerimientos a técnicos</span>';
    req.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();openNewModule(req)},true);
    const inv=[...aside.querySelectorAll('button[data-href]')].find(b=>String(b.dataset.href||'').includes('inventario-supervisor.html'));
    if(inv)aside.insertBefore(req,inv);else aside.appendChild(req);
    return req;
  }

  function compactChat(aside){
    const children=[...aside.children];
    const chat=children.find(el=>!el.classList.contains('sideTitle')&&!el.classList.contains('navGroup')&&norm(el.textContent).includes('CONVERSACIONES'));
    if(!chat)return;
    chat.classList.add('supExecChat');
    [...chat.querySelectorAll('*')].forEach(el=>{
      if(el.children.length)return;
      const t=norm(el.textContent);
      if(t==='CHAT'||t==='ANCLADOS'||t.includes('LOS ANCLADOS SE ACTUALIZAN'))el.classList.add('supExecHide');
    });
  }

  function enhanceMenu(){
    const aside=document.querySelector('.menuAside');if(!aside)return;
    const title=aside.querySelector('.sideTitle');
    if(title){
      const b=title.querySelector('b');const s=title.querySelector('small');
      if(b&&b.textContent!=='Panel Supervisor')b.textContent='Panel Supervisor';
      if(s&&s.textContent!=='Accesos principales de Fernando')s.textContent='Accesos principales de Fernando';
    }
    const group=aside.querySelector('.navGroup');if(group&&group.textContent!=='OPERACIÓN PRIORITARIA')group.textContent='OPERACIÓN PRIORITARIA';

    const buttons=[...aside.querySelectorAll('button[data-href]')];
    const ip=buttons.find(b=>String(b.dataset.href||'').includes('asignacion-ip.html')||norm(b.textContent).includes('ACTIVACIONES Y ACCESO REMOTO'));
    const sup=buttons.find(b=>String(b.dataset.href||'').includes('panel-general-supervisor-visual.html')||norm(b.textContent).includes('SUPERVISION TECNICA'));
    const inv=buttons.find(b=>String(b.dataset.href||'').includes('inventario-supervisor.html')||norm(b.textContent)==='INVENTARIO');
    const req=ensureRequirements(aside);
    ip?.classList.add('supExecPrimary');
    sup?.classList.add('supExecSupervision');
    req?.classList.add('supExecRequirements');
    inv?.classList.add('supExecInventory');
    compactChat(aside);
  }

  function enhanceDashboard(){
    const root=document.getElementById('supervisorDashboardV1');if(!root)return;
    const h=root.querySelector('.dashHero h1');if(h&&h.textContent!=='Hola, Fernando')h.textContent='Hola, Fernando';
    const p=root.querySelector('.dashHero p');if(p&&p.textContent!=='Resumen rápido de supervisión técnica.')p.textContent='Resumen rápido de supervisión técnica.';
    const actions=root.querySelector('.dashHeroActions');
    if(actions&&!actions.querySelector('.supHeroHome')){
      const home=document.createElement('button');home.type='button';home.className='supHeroHome';home.title='Volver al menú';home.setAttribute('aria-label','Volver al menú');home.textContent='⌂';
      home.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();goMenu()});
      actions.prepend(home);
    }
  }

  let scheduled=false;
  function apply(){scheduled=false;enhanceMenu();enhanceDashboard()}
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(apply)}
  const mo=new MutationObserver(schedule);mo.observe(document.documentElement,{childList:true,subtree:true});
  [0,120,350,750,1500,2600].forEach(ms=>setTimeout(apply,ms));
})();