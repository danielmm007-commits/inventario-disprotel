(()=>{
  if(window.__supervisorWebOperativoV1)return;
  window.__supervisorWebOperativoV1=true;
  const KEY='disprotel_login_general_v2';
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
  let me={};try{me=JSON.parse(sessionStorage.getItem(KEY)||'{}')}catch{}
  if(!norm(me.rol).includes('SUPERVISOR TECNICO')||matchMedia('(max-width:680px)').matches)return;

  function wire(){
    const aside=document.querySelector('.menuAside');if(!aside)return false;
    const buttons=[...aside.querySelectorAll('button[data-href]')];
    const tech=buttons.find(b=>/SUPERVISI[ÓO]N T[ÉE]CNICA|[ÁA]REA T[ÉE]CNICA/i.test(b.textContent||''));
    if(!tech)return false;
    tech.dataset.href='panel-supervisor-vivo-v4.html';
    tech.title='Supervisión técnica · Operación en vivo';
    const span=tech.querySelector('span:last-child');if(span)span.textContent='Supervisión técnica';
    return true;
  }

  let tries=0;const timer=setInterval(()=>{tries++;if(wire()||tries>30)clearInterval(timer)},180);
  window.addEventListener('load',()=>setTimeout(wire,250));
})();