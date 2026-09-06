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
    st.textContent='.techHero{background:linear-gradient(135deg,#eaf6ff 0%,#f6fbff 55%,#eafaf2 100%)!important;border-color:#b8d9ee!important;padding:16px 18px!important}.techHero h1{font-size:24px!important;color:#0b3767!important}.techType{margin:5px 0 12px!important}.techGrid{max-width:900px!important;grid-template-columns:repeat(2,minmax(0,1fr))!important}.techRow.location,.techRow.state{grid-column:1/-1}.techValue{background:#fff!important}.techRow.location .techValue{min-height:auto}@media(max-width:720px){.techGrid{grid-template-columns:1fr!important}.techHero h1{font-size:20px!important}}';
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
      ctx.innerHTML=`<div class="techRow"><div class="techIcon">📋</div><div class="techLabel">OT</div><div class="techValue">${esc(up(O.id_orden||O.id||''))}</div></div><div class="techRow"><div class="techIcon">🛠️</div><div class="techLabel">TIPO</div><div class="techValue">${esc(tipo(O.tipo_trabajo))}</div></div><div class="techRow"><div class="techIcon">👤</div><div class="techLabel">CLIENTE</div><div class="techValue">${esc(up(O.cliente_nombre||''))} · ${esc(O.cliente_telefono||'SIN TELÉFONO')}</div></div><div class="techRow"><div class="techIcon">🚐</div><div class="techLabel">GRUPO</div><div class="techValue">${esc(up(session.unidad_grupo||session.grupo||''))} · ${esc(up(session.nombre||session.usuario||''))}</div></div><div class="techRow location"><div class="techIcon">📍</div><div class="techLabel">UBICACIÓN</div><div class="techValue">${esc(up(sector))} · ${esc(up(direccion))}${ref?` · REF: ${esc(up(ref))}`:''}</div></div><div class="techRow state"><div class="techIcon">🌐</div><div class="techLabel">ESTADO / ROUTER</div><div class="techValue">${esc(up(estado))} · ROUTER: ${esc(up(router))}</div></div>`;
      return true;
    }catch{return false}
  }
  let n=0;
  const t=setInterval(()=>{n++;if(pintar()||n>30)clearInterval(t)},200);
  document.addEventListener('disprotel:router-cambiado',pintar);
})();
