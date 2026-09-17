(()=>{
  if(window.__supervisorCommandV2||window.__supOpV3)return;
  window.__supervisorCommandV2=true;
  window.__supOpV3=true;

  const KEY='disprotel_login_general_v2';
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,' ').toUpperCase();
  let me={};try{me=JSON.parse(sessionStorage.getItem(KEY)||'{}')}catch{}
  if(!norm(me.rol).includes('SUPERVISOR TECNICO'))return;

  const mobile=matchMedia('(max-width:680px)').matches;
  const id=mobile?'supervisorMobileCompactV1Loader':'supervisorTecnicoInicioV1Loader';
  if(document.getElementById(id))return;

  const s=document.createElement('script');
  s.id=id;
  s.src=mobile?'supervisor-mobile-compact-v1.js?v=20260916-mobile4':'supervisor-tecnico-inicio-v1.js?v='+Date.now();
  s.async=false;
  if(mobile){
    s.onload=()=>{
      if(document.getElementById('supervisorMobilePersistentNavV1Loader'))return;
      const p=document.createElement('script');
      p.id='supervisorMobilePersistentNavV1Loader';
      p.src='supervisor-mobile-persistent-nav-v1.js?v=20260916-mobile4';
      p.async=false;
      document.body.appendChild(p);
    };
  }else{
    s.onload=()=>{
      if(document.getElementById('supervisorWebOperativoV1Loader'))return;
      const w=document.createElement('script');
      w.id='supervisorWebOperativoV1Loader';
      w.src='supervisor-web-operativo-v1.js?v='+Date.now();
      w.async=false;
      document.body.appendChild(w);
    };
  }
  document.body.appendChild(s);
})();