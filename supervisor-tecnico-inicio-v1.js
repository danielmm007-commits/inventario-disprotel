(()=>{
  if(window.__disprotelSupervisorTecnicoInicioV1)return;
  window.__disprotelSupervisorTecnicoInicioV1=true;

  const KEY='disprotel_login_general_v2';
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
  let me={};try{me=JSON.parse(sessionStorage.getItem(KEY)||'{}')}catch{}
  const rol=norm(me.rol);
  if(!rol.includes('SUPERVISOR')||!rol.includes('TECNICO'))return;

  function ensureStyle(){
    if(document.getElementById('supervisorTecnicoInicioV1Style'))return;
    const s=document.createElement('style');
    s.id='supervisorTecnicoInicioV1Style';
    s.textContent=`
      .supRoute{cursor:pointer;transition:.16s ease}.supRoute:hover{transform:translateY(-2px);border-color:#8fc5e8!important;box-shadow:0 8px 18px #0b2a5c14}.supRoute:active{transform:translateY(1px) scale(.99)}
      .supRoute span:nth-child(2){flex:1}.supRoute small{display:block;color:#70848f;margin-top:2px;font-size:9px}
      .supZone{padding:11px 12px;border:1px solid #dce9ef;border-radius:13px;background:#f8fbfd}.supZone b{display:block;color:#0b3b68;font-size:12px}.supZone span{display:block;color:#70848f;font-size:10px;margin-top:3px}
      .supZoneGrid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.supMetricNote{display:block;margin-top:4px;color:#8798a1;font-size:8px;font-weight:700}
      @media(max-width:700px){.supZoneGrid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }

  function ensureHome(aside){
    if(!aside||aside.querySelector('.erpHomeButton'))return;
    const title=aside.querySelector('.sideTitle');if(!title)return;
    const b=document.createElement('button');
    b.type='button';b.className='erpHomeButton';b.title='Inicio · Panel general';
    b.innerHTML='<span aria-hidden="true">🏠</span><span>Inicio</span>';
    b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();location.href='principal.html'});
    title.insertAdjacentElement('afterend',b);
  }

  function sameLabel(btn,label){return norm(btn?.textContent)===norm(label)}
  function setBtn(btn,icon,label,href){
    if(!btn)return;
    if(String(btn.dataset.href||'')!==href)btn.dataset.href=href;
    if(!sameLabel(btn,label))btn.innerHTML=icon+' <span>'+label+'</span>';
    if(btn.title!==label)btn.title=label;
  }

  function applyMenu(){
    const aside=document.querySelector('.menuAside');if(!aside)return false;
    ensureHome(aside);
    const buttons=[...aside.querySelectorAll('button[data-href]')];
    const byHref=s=>buttons.find(b=>String(b.dataset.href||'').toLowerCase().includes(s));
    const byText=re=>buttons.find(b=>re.test(b.textContent||''));
    const ip=byHref('asignacion-ip.html')||byText(/IP Y ACCESO REMOTO|ACTIVACIONES Y ACCESO REMOTO/i);
    const tech=byHref('panel-general-supervisor-visual.html')||byHref('trabajos-tecnicos.html')||byText(/ÁREA TÉCNICA|SUPERVISIÓN TÉCNICA/i);
    const req=byHref('solicitudes-oficina.html')||byText(/REQUERIMIENTOS A TÉCNICOS|^\s*SOLICITUDES\s*$/i);
    const inv=byHref('inventario-supervisor.html')||buttons.find(b=>/^\s*📦?\s*INVENTARIO\s*$/i.test((b.textContent||'').trim()))||byHref('index.html');
    const compras=byHref('compras-ingresos.html')||byText(/COMPRAS E INGRESOS/i);
    const transfer=byHref('solicitudes-transferencias.html')||byText(/TRANSFERENCIAS/i);

    setBtn(ip,'📡','Activaciones y acceso remoto','asignacion-ip.html');
    setBtn(tech,'🛠️','Supervisión técnica','panel-general-supervisor-visual.html');
    setBtn(req,'📋','Requerimientos a técnicos','solicitudes-oficina.html');
    setBtn(inv,'📦','Inventario','inventario-supervisor.html');
    if(compras&&compras!==inv)compras.remove();
    if(transfer&&transfer!==inv)transfer.remove();

    const group=aside.querySelector('.navGroup');
    if(group){
      let cursor=group;
      [ip,tech,req,inv].filter(Boolean).forEach(b=>{
        if(cursor.nextElementSibling!==b)cursor.insertAdjacentElement('afterend',b);
        cursor=b;
      });
    }
    return true;
  }

  function metric(label){
    const wanted=norm(label);
    const stats=[...document.querySelectorAll('.menuHome .main .stat')];
    const stat=stats.find(x=>norm(x.querySelector('.lbl')?.textContent).includes(wanted));
    const raw=String(stat?.querySelector('.num')?.textContent||'0').replace(/[^0-9-]/g,'');
    const n=parseInt(raw,10);return Number.isFinite(n)?n:0;
  }

  function openMenu(label){
    const aside=document.querySelector('.menuAside');if(!aside)return;
    const wanted=norm(label);
    const b=[...aside.querySelectorAll('button[data-href]')].find(x=>norm(x.textContent).includes(wanted));
    if(b)b.click();
  }

  function syncDashboard(){
    const root=document.getElementById('supervisorDashboardV1');if(!root)return;
    const pending=metric('TRABAJOS POR ACEPTAR');
    const process=metric('TRABAJOS EN PROCESO');
    const done=metric('TRABAJOS FINALIZADOS');
    const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=String(v)};
    set('supPending',pending);set('supField',process);set('supDone',done);set('supZones',2);

    const list=document.getElementById('supAttentionList');if(!list)return;
    const rows=[];
    if(pending>0)rows.push('<div class="dashItem dashAlert"><span>📋</span><span>Requerimientos que todavía necesitan atención</span><b>'+pending+'</b></div>');
    if(process>0)rows.push('<div class="dashItem"><span>🚐</span><span>Trabajos que se encuentran en campo</span><b>'+process+'</b></div>');
    if(!pending&&!process)rows.push('<div class="dashItem dashOk"><span>✓</span><span>No hay trabajos pendientes o en proceso reportados en este momento</span></div>');
    rows.push('<div class="dashItem"><span>📣</span><span>Revisa novedades de grupos, vehículos y apoyos interzonales desde Supervisión técnica</span></div>');
    list.innerHTML=rows.join('');
  }

  function renderDashboard(){
    const dash=document.querySelector('.menuDashboard');if(!dash)return false;
    if(dash.querySelector('#supervisorDashboardV1')){syncDashboard();return true}
    ensureStyle();
    const nombre=String(me.nombre||'Supervisor Técnico').toUpperCase();
    dash.innerHTML=`<div id="supervisorDashboardV1">
      <div class="dashHero"><div><small>RESUMEN DE SUPERVISIÓN TÉCNICA</small><h1>Hola, ${nombre}</h1><p>Vista rápida de lo que necesita atención. La gestión detallada se realiza desde Supervisión técnica.</p></div><div class="dashHeroActions"><span class="panelConnected">● CONECTADO</span><button id="supRefresh">↻ Actualizar</button></div></div>
      <div class="dashGrid">
        <article class="dashPanel dashFull"><h2>📊 Estado de la jornada</h2><div class="dashSub">Indicadores generales para decidir dónde intervenir.</div><div class="dashMetrics"><div class="dashMetric"><strong id="supPending">—</strong><span>REQUERIMIENTOS POR ATENDER</span></div><div class="dashMetric"><strong id="supField">—</strong><span>TRABAJOS EN CAMPO</span></div><div class="dashMetric"><strong id="supDone">—</strong><span>FINALIZADOS</span></div><div class="dashMetric"><strong id="supZones">2</strong><span>ÁMBITOS DE SUPERVISIÓN</span><small class="supMetricNote">Salcedo + regional</small></div></div></article>
        <article class="dashPanel"><h2>🔔 Qué requiere atención</h2><div class="dashSub">Resumen para detectar pendientes antes de entrar al detalle.</div><div class="dashList" id="supAttentionList"></div></article>
        <article class="dashPanel"><h2>🧭 Ruta de gestión</h2><div class="dashSub">Entra directamente al módulo donde corresponde resolver cada caso.</div><div class="dashList"><div class="dashItem supRoute" data-open="ACTIVACIONES Y ACCESO REMOTO"><span>📡</span><span><b>Activaciones y acceso remoto</b><small>Solicitudes que llegan desde campo.</small></span><b>ABRIR →</b></div><div class="dashItem supRoute" data-open="SUPERVISIÓN TÉCNICA"><span>🛠️</span><span><b>Supervisión técnica</b><small>Grupos, jornada, novedades y seguimiento.</small></span><b>ABRIR →</b></div><div class="dashItem supRoute" data-open="REQUERIMIENTOS A TÉCNICOS"><span>📋</span><span><b>Requerimientos a técnicos</b><small>Asignaciones y trabajos enviados a los técnicos.</small></span><b>ABRIR →</b></div></div></article>
        <article class="dashPanel dashFull"><h2>🗺️ Cobertura de supervisión</h2><div class="dashSub">El Inicio solo muestra el alcance; la operación detallada permanece en Supervisión técnica.</div><div class="supZoneGrid"><div class="supZone"><b>📍 SALCEDO · prioridad directa</b><span>Seguimiento principal de grupos y novedades de la zona.</span></div><div class="supZone"><b>🌐 SAQUISILÍ – LATACUNGA · supervisión regional</b><span>Seguimiento regional y solicitudes de apoyo interzonal.</span></div></div></article>
      </div>
    </div>`;

    dash.querySelectorAll('[data-open]').forEach(x=>x.addEventListener('click',()=>openMenu(x.dataset.open)));
    const refresh=dash.querySelector('#supRefresh');if(refresh)refresh.addEventListener('click',()=>{refresh.disabled=true;refresh.textContent='↻ Actualizando…';syncDashboard();setTimeout(()=>{refresh.disabled=false;refresh.textContent='✓ Actualizado';setTimeout(()=>refresh.textContent='↻ Actualizar',800)},180)});
    syncDashboard();
    return true;
  }

  let timer=null;
  function applyAll(){
    clearTimeout(timer);timer=setTimeout(()=>{applyMenu();renderDashboard()},20);
  }

  const mo=new MutationObserver(applyAll);
  mo.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('click',e=>{if(e.target.closest('.erpHomeButton'))setTimeout(renderDashboard,30)},true);
  [0,120,320,700,1400,2500].forEach(ms=>setTimeout(()=>{applyMenu();renderDashboard();syncDashboard()},ms));

  setInterval(syncDashboard,5000);
})();