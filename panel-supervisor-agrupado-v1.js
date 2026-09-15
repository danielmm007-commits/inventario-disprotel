(()=>{
  if(window.__supervisorCommandV2||window.__supOpV3)return;
  window.__supervisorCommandV2=true;
  window.__supOpV3=true;

  const KEY='disprotel_login_general_v2';
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,' ').toUpperCase();
  let me={};try{me=JSON.parse(sessionStorage.getItem(KEY)||'{}')}catch{}
  if(!norm(me.rol).includes('SUPERVISOR TECNICO'))return;

  const loadExecutive=()=>{
    if(document.getElementById('supervisorMobileExecutiveV1Loader'))return;
    const e=document.createElement('script');
    e.id='supervisorMobileExecutiveV1Loader';
    e.src='supervisor-mobile-executive-v1.js?v='+Date.now();
    e.async=false;
    document.body.appendChild(e);
  };

  const id='supervisorTecnicoInicioV1Loader';
  if(document.getElementById(id))return;
  const s=document.createElement('script');
  s.id=id;
  s.src='supervisor-tecnico-inicio-v1.js?v='+Date.now();
  s.async=false;
  s.onload=()=>{
    if(document.getElementById('supervisorMobileCompactV1Loader')){loadExecutive();return}
    const m=document.createElement('script');
    m.id='supervisorMobileCompactV1Loader';
    m.src='supervisor-mobile-compact-v1.js?v='+Date.now();
    m.async=false;
    m.onload=loadExecutive;
    document.body.appendChild(m);
  };
  document.body.appendChild(s);
})();