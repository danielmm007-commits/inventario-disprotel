(()=>{
  if(window.__disprotelAlertasSolicitudesV1)return;
  window.__disprotelAlertasSolicitudesV1=true;

  const API='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-solicitudes-transferencias';
  const CART_TOKEN=(()=>{let x=sessionStorage.getItem('disprotel_inventory_cart_token');if(!x){x=crypto.randomUUID();sessionStorage.setItem('disprotel_inventory_cart_token',x)}return x})();
  let lastCount=null,busy=false,timer=null;

  function getSession(){
    try{return JSON.parse(sessionStorage.getItem('disprotel_login_general_v2')||'null')}catch{return null}
  }
  function ensureCss(){
    if(document.getElementById('disprotelAlertasSolicitudesCss'))return;
    const s=document.createElement('style');s.id='disprotelAlertasSolicitudesCss';s.textContent=`
      .invAlertHost{position:relative!important}
      .invAlertBadge{display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;padding:0 7px;margin-left:7px;border-radius:999px;background:#d9273e;color:#fff;font:1000 11px/1 Arial,sans-serif;box-shadow:0 0 0 3px rgba(217,39,62,.14),0 4px 12px rgba(130,14,31,.28);vertical-align:middle}
      .invAlertBadge.invAlertZero{display:none!important}
      #invAlertToast{position:fixed;right:18px;top:82px;z-index:9999;width:min(390px,calc(100vw - 28px));padding:14px 15px;border-radius:15px;background:#fff;border:1px solid #f1b9c2;box-shadow:0 18px 48px rgba(7,26,56,.24);display:none;cursor:pointer}
      #invAlertToast.show{display:block;animation:invAlertIn .2s ease both}
      #invAlertToast strong{display:block;color:#9c2135;font-size:13px}
      #invAlertToast span{display:block;margin-top:4px;color:#5e737f;font-size:11px;line-height:1.4}
      @keyframes invAlertIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
      @media(max-width:680px){#invAlertToast{top:68px;right:14px}}
    `;document.head.appendChild(s);
  }
  function targets(){
    const all=[...document.querySelectorAll('a,button,.stat,.module')];
    return all.filter(el=>{
      const href=String(el.getAttribute?.('href')||'');
      const onclick=String(el.getAttribute?.('onclick')||'');
      const text=String(el.textContent||'').toUpperCase();
      return href.includes('solicitudes-transferencias.html')||onclick.includes('solicitudes-transferencias.html')||text.includes('SOLICITUDES Y TRANSFERENCIAS')||text.includes('TRANSFERENCIAS PENDIENTES');
    });
  }
  function paint(n){
    ensureCss();
    for(const el of targets()){
      let host=el;
      if(el.classList.contains('module')) host=el.querySelector('h3')||el;
      else if(el.classList.contains('stat')) host=el.querySelector('.lbl')||el;
      host.classList.add('invAlertHost');
      let b=host.querySelector(':scope > .invAlertBadge');
      if(!b){b=document.createElement('span');b.className='invAlertBadge';host.appendChild(b)}
      b.textContent=n>99?'99+':String(n);
      b.classList.toggle('invAlertZero',n<=0);
    }
    const stat=[...document.querySelectorAll('.stat')].find(x=>String(x.getAttribute('onclick')||'').includes('solicitudes-transferencias.html'));
    const num=stat?.querySelector('.num');if(num)num.textContent=String(n);
    document.title=(n>0?`(${n}) `:'')+'Centro de Control Principal · DISPROTEL';
  }
  function toast(n,isNew){
    ensureCss();
    let t=document.getElementById('invAlertToast');
    if(!t){t=document.createElement('div');t.id='invAlertToast';t.title='Abrir solicitudes y transferencias';t.addEventListener('click',()=>location.href='solicitudes-transferencias.html');document.body.appendChild(t)}
    t.innerHTML=`<strong>${isNew?'🔔 Nueva solicitud de inventario':'🔔 Solicitudes pendientes'}</strong><span>${n===1?'Hay 1 solicitud que requiere atención administrativa.':`Hay ${n} solicitudes que requieren atención administrativa.`} Toca aquí para revisarlas.</span>`;
    t.classList.add('show');clearTimeout(t._hide);t._hide=setTimeout(()=>t.classList.remove('show'),9000);
  }
  async function check(){
    if(busy||document.visibilityState==='hidden')return;
    const ses=getSession();if(!ses?.session_token)return;
    busy=true;
    try{
      const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','x-session':ses.session_token},body:JSON.stringify({action:'bootstrap',carrito_token:CART_TOKEN})});
      const d=await r.json().catch(()=>null);if(!r.ok||!d?.ok)return;
      if(!d.is_manager){paint(0);lastCount=0;return}
      const pending=(d.requests||[]).filter(x=>['PENDIENTE_APROBACION','PENDIENTE_CONFIRMACION'].includes(String(x.estado||'').toUpperCase()));
      const n=pending.length;paint(n);
      if(lastCount===null){if(n>0)toast(n,false)}else if(n>lastCount)toast(n,true);
      lastCount=n;
    }catch(e){}finally{busy=false}
  }
  ensureCss();
  const obs=new MutationObserver(()=>{if(lastCount!==null)paint(lastCount)});obs.observe(document.documentElement,{childList:true,subtree:true});
  check();timer=setInterval(check,10000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check()});
  window.addEventListener('focus',check);
  window.addEventListener('storage',e=>{if(e.key==='disprotel_inventory_alert_refresh')check()});
})();