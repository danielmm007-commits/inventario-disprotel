(()=>{
  if(window.__supervisorWebOperativoV1)return;
  window.__supervisorWebOperativoV1=true;
  const KEY='disprotel_login_general_v2';
  const TARGET='panel-supervisor-vivo-v2.html';
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
  let me={};try{me=JSON.parse(sessionStorage.getItem(KEY)||'{}')}catch{}
  if(!norm(me.rol).includes('SUPERVISOR TECNICO')||matchMedia('(max-width:680px)').matches)return;

  function techButton(){
    const aside=document.querySelector('.menuAside');if(!aside)return null;
    return [...aside.querySelectorAll('button[data-href]')].find(b=>/SUPERVISI[ÓO]N T[ÉE]CNICA|[ÁA]REA T[ÉE]CNICA/i.test(b.textContent||''))||null;
  }
  function wire(){
    const tech=techButton();if(!tech)return false;
    if(tech.dataset.href!==TARGET)tech.dataset.href=TARGET;
    tech.title='Supervisión técnica · Operación en vivo';
    const span=tech.querySelector('span:last-child');if(span&&span.textContent!=='Supervisión técnica')span.textContent='Supervisión técnica';
    return true;
  }
  function enhanceFrame(frame){
    try{
      const w=frame.contentWindow,d=frame.contentDocument;if(!w||!d)return false;
      const path=String(w.location.pathname||'').toLowerCase();
      if(!path.endsWith('/panel-supervisor-vivo-v2.html'))return false;
      if(d.getElementById('panelSupervisorDirectEnhanceLoader'))return true;
      const s=d.createElement('script');s.id='panelSupervisorDirectEnhanceLoader';s.src='panel-supervisor-direct-enhance-v1.js?v='+Date.now();s.async=false;d.body.appendChild(s);return true;
    }catch{return false}
  }
  function hookFrames(){
    document.querySelectorAll('iframe.menuFrame').forEach(frame=>{
      if(frame.dataset.supDirectHook!=='1'){
        frame.dataset.supDirectHook='1';
        frame.addEventListener('load',()=>setTimeout(()=>enhanceFrame(frame),80));
      }
      enhanceFrame(frame);
    });
  }

  document.addEventListener('click',e=>{
    const b=e.target?.closest?.('.menuAside button[data-href]');
    if(!b||b!==techButton())return;
    b.dataset.href=TARGET;
  },true);

  const mo=new MutationObserver(()=>{wire();hookFrames()});
  mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['data-href','src']});

  let tries=0;const timer=setInterval(()=>{tries++;wire();hookFrames();if(tries>80)clearInterval(timer)},150);
  window.addEventListener('load',()=>{setTimeout(()=>{wire();hookFrames()},120);setTimeout(()=>{wire();hookFrames()},600);setTimeout(()=>{wire();hookFrames()},1400)});
})();