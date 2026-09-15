(()=>{
  if(window.__disprotelSupervisorMobileCompactV1)return;
  window.__disprotelSupervisorMobileCompactV1=true;
  const KEY='disprotel_login_general_v2';
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
  let me={};try{me=JSON.parse(sessionStorage.getItem(KEY)||'{}')}catch{}
  if(!norm(me.rol).includes('SUPERVISOR TECNICO')||!matchMedia('(max-width:680px)').matches)return;

  const style=document.createElement('style');
  style.id='supervisorMobileCompactV1Style';
  style.textContent=`
    body.supSupervisorMobile.panelMenu .topin{padding:4px 7px!important;gap:5px!important;min-height:48px!important}
    body.supSupervisorMobile.panelMenu .logoBox{width:56px!important;height:32px!important;border-radius:8px!important;flex:0 0 56px!important}
    body.supSupervisorMobile.panelMenu .brand{min-width:0!important;flex:1!important}
    body.supSupervisorMobile.panelMenu .brand b{font-size:12px!important;line-height:1.05!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
    body.supSupervisorMobile.panelMenu .brand span{display:none!important}
    body.supSupervisorMobile.panelMenu .panelTools{gap:4px!important;margin-left:auto!important}
    body.supSupervisorMobile.panelMenu>.topbar .panelConnected{min-height:26px!important;padding:0 7px!important;font-size:7px!important;box-shadow:0 0 0 2px #36d47b1c,0 0 10px #29d77655!important}
    body.supSupervisorMobile.panelMenu .userAvatar{width:34px!important;height:34px!important;font-size:17px!important;border-width:2px!important}
    body.supSupervisorMobile.panelMenu .logout{padding:6px 8px!important;font-size:10px!important;border-radius:9px!important;margin-left:2px!important}

    body.supSupervisorMobile.panelMenu.supMobileDashboard .menuStage{height:calc(100dvh - 48px)!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .mobileModuleBar{height:38px!important;min-height:38px!important;padding:4px 7px!important;gap:6px!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .mobileModuleBack{min-height:28px!important;padding:4px 8px!important;font-size:10px!important;border-radius:9px!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .mobileModuleTitle{font-size:11px!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .menuHome{min-height:calc(100dvh - 86px)!important;padding:6px!important}

    body.supSupervisorMobile.panelMenu.supMobileDashboard .dashHero{padding:12px!important;border-radius:14px!important;gap:7px!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .dashHero small{font-size:8px!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .dashHero h1{font-size:17px!important;line-height:1.12!important;margin:3px 0 4px!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .dashHero p{font-size:10px!important;line-height:1.28!important;margin:0!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .dashHeroActions{margin-top:2px!important;justify-content:flex-end!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .dashHeroActions .panelConnected{display:none!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .dashHeroActions button{min-height:32px!important;padding:0 9px!important;font-size:10px!important;border-radius:9px!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .dashGrid{margin-top:7px!important;gap:7px!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .dashPanel{padding:10px!important;border-radius:13px!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .dashPanel h2{font-size:14px!important;margin-bottom:2px!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .dashSub{font-size:9px!important;margin-bottom:8px!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .dashMetrics{gap:6px!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .dashMetric{padding:8px!important;border-radius:11px!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .dashMetric strong{font-size:20px!important}
    body.supSupervisorMobile.panelMenu.supMobileDashboard .dashMetric span{font-size:7.5px!important}
  `;
  document.head.appendChild(style);
})();