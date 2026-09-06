(()=>{
  if(window.__disprotelHeaderMejorado)return;
  window.__disprotelHeaderMejorado=true;
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const up=v=>String(v??'').toLocaleUpperCase('es-EC');
  function dato(...vals){return vals.find(v=>String(v??'').trim())||''}
  function tipo(v){const m={INSTALACION_INTERNET:'INSTALACIÓN INTERNET',INSTALACION_INTERNET_TV:'INSTALACIÓN INTERNET + TV',ACTIVACION_TV_EXISTENTE:'ACTIVACIÓN TV',CAMBIO_EQUIPOS:'CAMBIO DE EQUIPOS'};return m[v]||up(v||'INSTALACIÓN')}
  function css(){
    if($('#headerMejoradoCss'))return;
    const st=document.createElement('style');
    st.id='headerMejoradoCss';
    st.textContent='.techHero{background:linear-gradient(135deg,#eef8ff 0%,#f8fcff 100%)!important;border-color:#b8d9ee!important;padding:10px 12px!important}.techHero h1{font-size:18px!important;line-height:1.1!important;color:#0b3767!important;margin:0!important}.techType{font-size:12px!important;margin:3px 0 8px!important}.techGrid{display:flex!important;flex-wrap:wrap!important;gap:6px!important;max-width:980px!important;justify-content:center!important;margin:0 auto!important}.techChip{display:inline-flex;align-items:center;gap:4px;max-width:100%;padding:6px 9px;border:1px solid #cfe0ea;border-radius:999px;background:#fff;color:#17313d;font-size:12px;line-height:1.1;font-weight:800;box-shadow:0 2px 8px rgba(23,49,61,.06)}.techChip b{color:#0b64b0}.techChip.loc{flex-basis:min(100%,620px);justify-content:center}.techChip.router{background:#eaf8f0;border-color:#bde8cc}.techChip.warn{background:#fff7e4;border-color:#f3d283}.techChip span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}@media(max-width:720px){.techHero{padding:8px!important}.techHero h1{font-size:15px!important}.techType{font-size:11px!important;margin-bottom:6px!important}.techGrid{justify-content:flex-start!important;gap:5px!important}.techChip{font-size:10.5px;padding:5px 7px}.techChip.loc{flex-basis:100%;justify-content:flex-start}.techChip span{white-space:normal}}';
    document.head.appendChild(st);
  }
  function pintar(){
    try{
      if(typeof O==='undefined'||!O)return false;
      css();
      const hero=$('.techHero'),ctx=document.querySelector('[data-contexto-ejecucion]');
      if(!hero||!ctx)return false;
      const title=hero.querySelector('h1');if(title)title.textContent='EJECUCIÓN DEL TRABAJO';
      const session=JSON.parse(sessionStorage.getItem('disprotel_trabajos_test')||'{}');
      const direccion=dato(O.cliente_direccion_final,O.cliente_direccion,'SIN DIRECCIÓN');
      const sector=dato(O.cliente_zona_final,O.cliente_zona,O.cliente_sector,'SIN SECTOR');
      const ref=dato(O.cliente_referencia_final,O.cliente_referencia,'');
      const estado=dato(O.estado,'EN PROCESO');
      const router=dato(O.router?.nombre,O.router_cobertura,'PENDIENTE DE SELECCIÓN');
      ctx.dataset.compacto='1';
      const routerOk=!/PENDIENTE/.test(up(router));
      ctx.innerHTML=`<div class="techChip"><b>📋</b><span>${esc(up(O.id_orden||O.id||''))}</span></div><div class="techChip"><b>🛠️</b><span>${esc(tipo(O.tipo_trabajo))}</span></div><div class="techChip"><b>👤</b><span>${esc(up(O.cliente_nombre||''))}</span></div><div class="techChip"><b>☎️</b><span>${esc(O.cliente_telefono||'SIN TEL.')}</span></div><div class="techChip loc"><b>📍</b><span>${esc(up(sector))} · ${esc(up(direccion))}${ref?` · ${esc(up(ref))}`:''}</span></div><div class="techChip"><b>🚐</b><span>${esc(up(session.unidad_grupo||session.grupo||''))}</span></div><div class="techChip"><b>👷</b><span>${esc(up(session.nombre||session.usuario||''))}</span></div><div class="techChip"><b>⚙️</b><span>${esc(up(estado))}</span></div><div class="techChip router ${routerOk?'':'warn'}"><b>🌐</b><span>${esc(up(router))}</span></div>`;
      return true;
    }catch{return false}
  }
  let n=0;
  const t=setInterval(()=>{n++;if(pintar()||n>30)clearInterval(t)},200);
  document.addEventListener('disprotel:router-cambiado',pintar);
})();
