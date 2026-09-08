(()=>{
  if(window.__otUniversalLocalV1)return;window.__otUniversalLocalV1=true;
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
  const qs=new URLSearchParams(location.search),territorio=qs.get('area_local')||'';
  if(!territorio||!/solicitudes-oficina\.html$/i.test(location.pathname))return;
  function tipoDesdeTexto(v){const t=norm(v);if(t.includes('RADIO')||t.includes('INALAMBR'))return'RADIO';if(t.includes('FIBRA')||t.includes('FTTH'))return'FIBRA';if(t.includes('TV'))return'TV';return''}
  function serviceInfo(tipo,plan,router,ip){return '<div id="serviceScopeInfo" style="margin-top:10px;padding:11px 13px;border:1px solid #b9d8e5;border-radius:12px;background:#eef8fc;color:#16465f;font-size:12px"><b>TIPO DE SERVICIO: '+String(tipo||'POR CONFIRMAR').toUpperCase()+'</b><br><span>Plan: '+String(plan||'—')+' · Router: '+String(router||'—')+(ip?' · IP: '+String(ip):'')+'</span></div>'}
  function install(){
    const quien=document.getElementById('quien');if(quien)quien.textContent='Gestión administrativa técnica · '+territorio;
    const hero=document.querySelector('.hero p');if(hero)hero.textContent='Crea y da seguimiento a las órdenes técnicas de '+territorio+'. Los servicios visibles respetan tu alcance territorial.';
    if(typeof window.usarServicio==='function'&&!window.__usarServicioScopeWrapped){
      const original=window.usarServicio;window.__usarServicioScopeWrapped=true;
      window.usarServicio=function(raw){original(raw);try{const x=JSON.parse(raw),s=x?.s||{},box=document.getElementById('seleccion');if(!box)return;box.querySelector('#serviceScopeInfo')?.remove();box.insertAdjacentHTML('beforeend',serviceInfo(s.tipo_conexion||tipoDesdeTexto(s.plan),s.plan,s.router,s.ip))}catch{}};
    }
    const plan=document.getElementById('plan');
    if(plan&&!plan.dataset.serviceTypeHook){plan.dataset.serviceTypeHook='1';const update=()=>{if(!plan.value){document.getElementById('newServiceTypeInfo')?.remove();return}const text=plan.selectedOptions?.[0]?.textContent||plan.value,tipo=tipoDesdeTexto(text)||tipoDesdeTexto(plan.value);let box=document.getElementById('newServiceTypeInfo');if(!box){box=document.createElement('div');box.id='newServiceTypeInfo';box.style.cssText='margin-top:8px;padding:9px 11px;border-radius:10px;background:#eef8fc;border:1px solid #c5e0eb;color:#174b64;font-size:12px';plan.insertAdjacentElement('afterend',box)}box.innerHTML='<b>Tipo de servicio solicitado:</b> '+(tipo||'SEGÚN PLAN SELECCIONADO')};plan.addEventListener('change',update);update()}
    const grupo=document.getElementById('grupo');if(grupo){[...grupo.options].forEach(o=>{if(!o.value)return;const ok=norm(o.value).includes('SAQUISILI')||norm(o.textContent).includes('SAQUISILI');o.hidden=!ok;o.disabled=!ok});const valid=[...grupo.options].find(o=>o.value&&!o.disabled);if(valid&&!grupo.value)grupo.value=valid.value}
  }
  let tries=0;const t=setInterval(()=>{install();if(++tries>40)clearInterval(t)},150);document.addEventListener('DOMContentLoaded',install);
})();
