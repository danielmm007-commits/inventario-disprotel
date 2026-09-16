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
  function mesaButton(){
    const aside=document.querySelector('.menuAside');if(!aside)return null;
    return [...aside.querySelectorAll('button[data-href]')].find(b=>String(b.dataset.href||'').includes('asignacion-ip.html'))||null;
  }
  function setButtonLabel(btn,label){const span=btn?.querySelector('span:last-child');if(span&&span.textContent!==label)span.textContent=label}
  function wire(){
    const tech=techButton();
    if(tech){if(tech.dataset.href!==TARGET)tech.dataset.href=TARGET;tech.title='Supervisión técnica · Operación en vivo';setButtonLabel(tech,'Supervisión técnica')}
    const mesa=mesaButton();
    if(mesa){mesa.title='Mesa técnica de campo · solicitudes desde la ejecución';setButtonLabel(mesa,'Mesa técnica de campo')}
    return !!tech;
  }
  function cleanPanelNav(d){
    const actions=d.querySelector('.actions');if(!actions)return;
    [...actions.querySelectorAll('a')].forEach(a=>{
      const href=String(a.getAttribute('href')||'').toLowerCase();
      if(href.includes('trabajos-tecnicos.html')||href==='index.html'||href.endsWith('/index.html')){a.remove();return}
      if(href.includes('solicitudes-oficina.html'))a.textContent='➕ CREAR OT';
      if(href.includes('asignacion-ip.html'))a.textContent='🧰 MESA TÉCNICA DE CAMPO';
    });
    actions.style.gridTemplateColumns='repeat(2,minmax(0,1fr))';
  }
  function injectScript(d,id,src){
    if(d.getElementById(id))return true;
    const s=d.createElement('script');s.id=id;s.src=src+'?v='+Date.now();s.async=false;(d.body||d.documentElement).appendChild(s);return true;
  }
  function decorateMesa(d){
    d.title='Mesa técnica de campo · DISPROTEL';
    const loginTitle=d.querySelector('#login h1');if(loginTitle)loginTitle.textContent='🧰 Mesa técnica de campo';
    const quien=d.getElementById('quien');if(quien)quien.textContent=String(quien.textContent||'').replace(/^Asignación de IP/i,'Mesa técnica de campo');
    const pend=d.querySelector('#secPend h2');if(pend)pend.textContent='📡 Solicitudes técnicas de campo pendientes';
    const hist=d.querySelector('#secHist h2');if(hist)hist.textContent='🔎 Consultar IP actual / historial';
    const tabHist=d.getElementById('tabHist');if(tabHist)tabHist.textContent='🔎 CONSULTAR IP ACTUAL';
    if(!d.getElementById('mesaTecnicaScope')){
      const app=d.getElementById('app');if(app){const n=d.createElement('div');n.id='mesaTecnicaScope';n.className='msg ok';n.innerHTML='<b>🧰 Mesa técnica de campo</b><br>Funciones conectadas actualmente: asignación/consulta de IP y confirmación de acceso remoto.';app.insertBefore(n,app.children[1]||null)}
    }
  }
  function injectEnhancerSafely(frame,w,d){
    if(d.getElementById('panelSupervisorDirectEnhanceLoader')){injectScript(d,'supervisorReasignacionVisualLoader','supervisor-reasignacion-visual-v1.js');return true}
    const NativeMO=w.MutationObserver,captured=[];
    try{
      w.MutationObserver=class extends NativeMO{constructor(cb){super(cb);captured.push(this)}};
      const s=d.createElement('script');s.id='panelSupervisorDirectEnhanceLoader';s.src='panel-supervisor-direct-enhance-v1.js?v='+Date.now();s.async=false;
      s.onload=()=>{captured.forEach(o=>{try{o.disconnect()}catch{}});w.MutationObserver=NativeMO;frame.dataset.supEnhancerSafe='1';injectScript(d,'supervisorReasignacionVisualLoader','supervisor-reasignacion-visual-v1.js')};
      s.onerror=()=>{w.MutationObserver=NativeMO};d.body.appendChild(s);
      setTimeout(()=>{captured.forEach(o=>{try{o.disconnect()}catch{}});if(w.MutationObserver!==NativeMO)w.MutationObserver=NativeMO;injectScript(d,'supervisorReasignacionVisualLoader','supervisor-reasignacion-visual-v1.js')},1500);
      return true;
    }catch(e){w.MutationObserver=NativeMO;console.warn('Enhancer seguro:',e);return false}
  }
  function enhanceFrame(frame){
    try{const w=frame.contentWindow,d=frame.contentDocument;if(!w||!d)return false;const path=String(w.location.pathname||'').toLowerCase();if(!path.endsWith('/panel-supervisor-vivo-v2.html'))return false;frame.dataset.supOrigin='live';cleanPanelNav(d);return injectEnhancerSafely(frame,w,d)}catch{return false}
  }
  function returnToLive(frame){
    try{frame.dataset.supOrigin='live';frame.style.visibility='hidden';frame.setAttribute('aria-busy','true');frame.src=TARGET;document.body.classList.add('moduleOpen');const tech=techButton();document.querySelectorAll('.menuAside button').forEach(x=>x.classList.toggle('on',x===tech))}catch(e){console.warn('Regreso a supervisión:',e)}
  }
  function installBackGuard(frame,d){
    if(d.documentElement.dataset.supBackGuard==='1')return;d.documentElement.dataset.supBackGuard='1';
    d.addEventListener('click',e=>{const c=e.target?.closest?.('button,a');if(!c)return;const text=norm(c.textContent||''),raw=String(c.getAttribute('onclick')||'')+' '+String(c.getAttribute('href')||'');if(!text.includes('ATRAS')&&!text.includes('VOLVER AL PANEL')&&!/principal\.html/i.test(raw))return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();returnToLive(frame)},true);
  }
  function guardFrame(frame){
    try{
      const w=frame.contentWindow,d=frame.contentDocument;if(!w||!d)return false;const path=String(w.location.pathname||'').toLowerCase();
      if(path.endsWith('/panel-supervisor-vivo-v2.html')){frame.dataset.supOrigin='live';cleanPanelNav(d);enhanceFrame(frame);return true}
      if(path.endsWith('/principal.html')&&frame.dataset.supOrigin==='live'){setTimeout(()=>returnToLive(frame),0);return true}
      if(path.endsWith('/solicitudes-oficina.html')&&frame.dataset.supOrigin==='live'){installBackGuard(frame,d);injectScript(d,'supervisorOtFamiliasLoader','supervisor-ot-familias-v1.js');return true}
      if(path.endsWith('/asignacion-ip.html')){decorateMesa(d);if(frame.dataset.supOrigin==='live')installBackGuard(frame,d);return true}
      return false;
    }catch{return false}
  }
  function hookFrames(){
    document.querySelectorAll('iframe.menuFrame').forEach(frame=>{if(frame.dataset.supDirectHook!=='1'){frame.dataset.supDirectHook='1';frame.addEventListener('load',()=>setTimeout(()=>guardFrame(frame),40))}guardFrame(frame)})
  }

  document.addEventListener('click',e=>{
    const b=e.target?.closest?.('.menuAside button[data-href]');if(!b)return;const frames=[...document.querySelectorAll('iframe.menuFrame')];
    if(b===techButton()){b.dataset.href=TARGET;frames.forEach(f=>f.dataset.supOrigin='live')}else frames.forEach(f=>delete f.dataset.supOrigin)
  },true);

  const mo=new MutationObserver(()=>{wire();hookFrames()});mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['data-href','src']});
  let tries=0;const timer=setInterval(()=>{tries++;wire();hookFrames();if(tries>80)clearInterval(timer)},150);
  window.addEventListener('load',()=>{setTimeout(()=>{wire();hookFrames()},120);setTimeout(()=>{wire();hookFrames()},600);setTimeout(()=>{wire();hookFrames()},1400)});
})();