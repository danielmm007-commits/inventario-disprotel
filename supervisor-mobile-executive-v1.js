(()=>{
  if(window.__disprotelSupervisorMobileExecutiveV1)return;
  window.__disprotelSupervisorMobileExecutiveV1=true;

  const KEY='disprotel_login_general_v2';
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,' ').toUpperCase();
  let me={};try{me=JSON.parse(sessionStorage.getItem(KEY)||'{}')}catch{}
  if(!norm(me.rol).includes('SUPERVISOR TECNICO')||!matchMedia('(max-width:680px)').matches)return;

  const css=document.createElement('style');
  css.id='supervisorMobileExecutiveV1Style';
  css.textContent=`
    body.supSupervisorMobile.panelMenu .topin{min-height:43px!important;padding:3px 6px!important;gap:4px!important}
    body.supSupervisorMobile.panelMenu .logoBox{width:49px!important;height:29px!important;flex:0 0 49px!important}
    body.supSupervisorMobile.panelMenu .brand b{font-size:10.5px!important}.brand span{display:none!important}
    body.supSupervisorMobile.panelMenu>.topbar .panelConnected{min-height:23px!important;padding:0 6px!important;font-size:6.8px!important}
    body.supSupervisorMobile.panelMenu .userAvatar{width:30px!important;height:30px!important;font-size:15px!important}
    body.supSupervisorMobile.panelMenu .logout{padding:5px 7px!important;font-size:9px!important}

    body.supSupervisorMobile.panelMenu.supMobileDashboard .mobileModuleBar{display:none!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .menuStage{min-height:calc(100dvh - 43px)!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .menuHome{min-height:calc(100dvh - 43px)!important;padding:7px!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .supLiveHero{padding:13px!important;border-radius:16px!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .supLiveTitle h1{font-size:19px!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .supLiveTitle p{font-size:9px!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .supLiveActions button{height:32px!important;min-width:34px!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .supLiveUpdate{margin-top:7px!important;justify-content:flex-end!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .supLiveUpdate span:first-child{display:none!important}

    body.supSupervisorMobile.panelMenu:not(.moduleOpen):not(.supMobileDashboard){overflow:auto!important;background:#edf3f7!important}
    body.supSupervisorMobile.panelMenu:not(.moduleOpen):not(.supMobileDashboard) .menuShell{height:auto!important;min-height:calc(100dvh - 43px)!important;padding:7px!important;overflow:visible!important;background:#edf3f7!important}
    body.supSupervisorMobile.panelMenu:not(.moduleOpen):not(.supMobileDashboard) .menuAside{position:relative!important;display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;align-content:start!important;gap:9px!important;width:100%!important;height:auto!important;min-height:0!important;padding:14px 12px!important;border-radius:20px!important;overflow:visible!important;background:linear-gradient(155deg,#06234a,#084565 58%,#0b5968)!important;box-shadow:0 18px 38px #082b5c2a!important}

    body.supSupervisorMobile.panelMenu .menuAside .sideTitle{grid-column:1/-1!important;min-height:64px!important;margin:0!important;padding:2px 92px 10px 2px!important;border-bottom:1px solid #ffffff24!important}
    body.supSupervisorMobile.panelMenu .menuAside .sideTitle .navAvatar{width:36px!important;height:36px!important;margin:0 0 5px!important;border-radius:11px!important;font-size:19px!important}
    body.supSupervisorMobile.panelMenu .menuAside .sideTitle b{display:block!important;font-size:16px!important;line-height:1!important;color:#fff!important}
    body.supSupervisorMobile.panelMenu .menuAside .sideTitle small{display:block!important;font-size:8.5px!important;color:#b9d8ef!important;margin-top:4px!important}
    body.supSupervisorMobile.panelMenu .menuAside .navGroup{display:block!important;grid-column:1/-1!important;margin:1px 0 -1px!important;padding:5px 2px 1px!important;font-size:7.5px!important;letter-spacing:1.35px!important;color:#8dd8ef!important}

    body.supSupervisorMobile.panelMenu .menuAside .erpHomeButton{position:absolute!important;right:12px!important;top:15px!important;width:auto!important;height:35px!important;min-height:35px!important;padding:0 9px!important;display:flex!important;flex-direction:row!important;justify-content:center!important;align-items:center!important;gap:5px!important;border:1px solid #ffffff46!important;border-radius:11px!important;background:#ffffff14!important;box-shadow:none!important;font-size:15px!important;z-index:5!important}
    body.supSupervisorMobile.panelMenu .menuAside .erpHomeButton span:last-child{display:block!important;padding:0!important;background:transparent!important;border-radius:0!important;font-size:8px!important}

    body.supSupervisorMobile.panelMenu:not(.moduleOpen):not(.supMobileDashboard) .menuAside button[data-href]{position:relative!important;display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:center!important;gap:6px!important;min-height:82px!important;padding:11px!important;border:1px solid #ffffff22!important;border-radius:15px!important;background:linear-gradient(145deg,#ffffff14,#ffffff08)!important;color:#fff!important;text-align:left!important;transform:none!important;overflow:hidden!important;box-shadow:inset 0 1px 0 #ffffff10!important;animation:supExecEnter .38s cubic-bezier(.2,.8,.2,1) both!important}
    body.supSupervisorMobile.panelMenu:not(.moduleOpen):not(.supMobileDashboard) .menuAside button[data-href] span{display:block!important;max-width:100%!important;padding:0!important;background:transparent!important;border-radius:0!important;color:#fff!important;font-size:10px!important;line-height:1.18!important;font-weight:900!important;text-align:left!important}
    body.supSupervisorMobile.panelMenu:not(.moduleOpen):not(.supMobileDashboard) .menuAside button[data-href]:active{transform:scale(.97)!important;filter:brightness(1.12)!important}

    body.supSupervisorMobile.panelMenu:not(.moduleOpen):not(.supMobileDashboard) .menuAside .supExecPrimary{grid-column:1/-1!important;min-height:91px!important;padding-right:102px!important;background:linear-gradient(120deg,#0b70b4,#0d9ab2 72%,#18aa8a)!important;border-color:#71d8e9!important;box-shadow:0 9px 23px #031b3840!important;animation:supExecEnter .38s ease both,supExecPulse 2.8s 1.1s ease-in-out infinite!important}
    body.supSupervisorMobile.panelMenu:not(.moduleOpen):not(.supMobileDashboard) .menuAside .supExecPrimary:after{content:'PRIORIDAD';position:absolute;right:11px;top:11px;padding:5px 7px;border-radius:999px;background:#e9fbff;color:#07567b;font-size:7px;font-weight:1000;letter-spacing:.65px}
    body.supSupervisorMobile.panelMenu:not(.moduleOpen):not(.supMobileDashboard) .menuAside .supExecPrimary:before{content:'Activaciones y accesos de campo';position:absolute;left:11px;bottom:10px;color:#ddf9ff;font-size:7.5px;font-weight:700}
    body.supSupervisorMobile.panelMenu:not(.moduleOpen):not(.supMobileDashboard) .menuAside .supExecSupervision{animation-delay:.06s!important}
    body.supSupervisorMobile.panelMenu:not(.moduleOpen):not(.supMobileDashboard) .menuAside .supExecRequirements{animation-delay:.12s!important}
    body.supSupervisorMobile.panelMenu:not(.moduleOpen):not(.supMobileDashboard) .menuAside .supExecInventory{animation-delay:.18s!important}

    body.supSupervisorMobile.panelMenu .menuAside .supExecChat{grid-column:auto!important;min-height:82px!important;margin:0!important;padding:10px!important;border:1px solid #ffffff22!important;border-radius:15px!important;background:linear-gradient(145deg,#ffffff14,#ffffff08)!important;color:#fff!important;overflow:hidden!important;animation:supExecEnter .38s .24s ease both!important}
    body.supSupervisorMobile.panelMenu .menuAside .supExecChat .supExecHide{display:none!important}
    body.supSupervisorMobile.panelMenu .menuAside .supExecChat button{min-height:38px!important;border-radius:10px!important}

    @keyframes supExecEnter{from{opacity:0;transform:translateY(11px) scale(.985)}to{opacity:1;transform:none}}
    @keyframes supExecPulse{0%,100%{box-shadow:0 9px 23px #031b3840,0 0 0 0 #4ce1ee00}50%{box-shadow:0 11px 27px #031b3850,0 0 0 5px #4ce1ee17}}
    @media(prefers-reduced-motion:reduce){body.supSupervisorMobile.panelMenu *{animation:none!important;transition:none!important}}
  `;
  document.head.appendChild(css);

  function openHref(btn){
    const frame=document.querySelector('.menuFrame');if(!frame)return;
    const title=document.querySelector('.mobileModuleTitle');if(title)title.textContent=btn.querySelector('span')?.textContent||'Módulo';
    frame.style.visibility='hidden';frame.setAttribute('aria-busy','true');
    const href=btn.dataset.href;frame.src=href+(href.includes('?')?'&':'?')+'v='+Date.now();
    document.body.classList.remove('supMobileDashboard');document.body.classList.add('moduleOpen');
    document.querySelectorAll('.menuAside button').forEach(x=>x.classList.toggle('on',x===btn));
  }

  function ensureRequirements(aside){
    let req=[...aside.querySelectorAll('button[data-href]')].find(b=>norm(b.textContent).includes('REQUERIMIENTOS A TECNICOS'));
    if(req)return req;
    req=document.createElement('button');req.type='button';req.dataset.href='solicitudes-oficina.html';req.title='Requerimientos a técnicos';req.innerHTML='📋 <span>Requerimientos a técnicos</span>';
    req.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();openHref(req)},true);
    const inv=[...aside.querySelectorAll('button[data-href]')].find(b=>String(b.dataset.href||'').includes('inventario-supervisor.html'));
    if(inv)aside.insertBefore(req,inv);else aside.appendChild(req);
    return req;
  }

  function simplifyChat(aside){
    const chat=[...aside.children].find(el=>!el.classList.contains('sideTitle')&&!el.classList.contains('navGroup')&&norm(el.textContent).includes('CONVERSACIONES'));
    if(!chat)return;
    chat.classList.add('supExecChat');
    [...chat.querySelectorAll('*')].forEach(el=>{
      if(el.children.length)return;
      const t=norm(el.textContent);
      if(t==='CHAT'||t==='ANCLADOS'||t.includes('LOS ANCLADOS SE ACTUALIZAN'))el.classList.add('supExecHide');
    });
  }

  function apply(){
    const aside=document.querySelector('.menuAside');if(!aside)return;
    const title=aside.querySelector('.sideTitle');
    if(title){const b=title.querySelector('b'),s=title.querySelector('small');if(b)b.textContent='Panel Supervisor';if(s)s.textContent='Accesos principales de Fernando'}
    const group=aside.querySelector('.navGroup');if(group)group.textContent='OPERACIÓN PRIORITARIA';
    const all=[...aside.querySelectorAll('button[data-href]')];
    const ip=all.find(b=>String(b.dataset.href||'').includes('asignacion-ip.html')||norm(b.textContent).includes('ACTIVACIONES Y ACCESO REMOTO'));
    const sup=all.find(b=>String(b.dataset.href||'').includes('panel-general-supervisor-visual.html')||norm(b.textContent).includes('SUPERVISION TECNICA'));
    const inv=all.find(b=>String(b.dataset.href||'').includes('inventario-supervisor.html')||norm(b.textContent)==='INVENTARIO');
    const req=ensureRequirements(aside);
    ip?.classList.add('supExecPrimary');sup?.classList.add('supExecSupervision');req?.classList.add('supExecRequirements');inv?.classList.add('supExecInventory');
    simplifyChat(aside);
  }

  let queued=false;const queue=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply()})};
  new MutationObserver(queue).observe(document.documentElement,{childList:true,subtree:true});
  [0,120,350,800,1600,2600].forEach(ms=>setTimeout(apply,ms));
})();