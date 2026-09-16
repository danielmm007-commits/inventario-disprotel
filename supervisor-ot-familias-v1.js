(()=>{
  if(window.__supervisorOtFamiliasV1)return;window.__supervisorOtFamiliasV1=true;
  const chooser=document.querySelector('.requestChooser'),box=document.querySelector('.requestTypes');
  if(!chooser||!box||typeof window.elegirTipo!=='function')return;
  const selected=document.getElementById('typeSelected');
  const supportSelected=new Set();
  const opts=[
    ['SOPORTE_TECNICO','🛠️','Diagnóstico / reparación','Falla, intermitencia o asistencia técnica.'],
    ['REUBICACION','📍','Traslado / reubicación','Cambio interno o cambio de domicilio.'],
    ['AMPLIACION_COBERTURA_WIFI','📶','Cobertura Wi‑Fi','Ampliación o mejora de cobertura.'],
    ['ACTIVACION_TV_EXISTENTE','📺','Activación TV','Activación sobre servicio existente.'],
    ['INSTALACION_PUNTO_TV','🔌','Punto adicional TV','Nuevo punto dentro del domicilio.'],
    ['CAMBIO_EQUIPOS','🔄','Cambio de equipos','Router, ONU, decodificador u otro equipo.'],
    ['RETIRO','📥','Retiro','Recuperación o desinstalación de equipos.'],
    ['OTRO','➕','Otra actividad','Trabajo técnico no contemplado arriba.']
  ];
  const labels=Object.fromEntries(opts.map(x=>[x[0],x[2]]));
  const style=document.createElement('style');style.id='supervisorOtFamiliasStyle';style.textContent=`
    .otFamilyGrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.otFamily{min-height:150px!important;border-width:2px!important}.otFamily .requestIcon{font-size:38px}.otFamily strong{font-size:19px!important}.otSupportOptions{display:none;margin-top:15px;padding-top:15px;border-top:1px solid #d8e7ee}.otSupportOptions.show{display:block}.otSupportOptions h3{margin:0 0 5px;color:#0b356f}.otSupportOptions>p{margin:0 0 12px}.otSupportGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.otSupportGrid .requestType{position:relative;min-height:105px;padding:13px}.otSupportGrid .requestIcon{font-size:23px;margin-bottom:5px}.otSupportGrid strong{font-size:13px}.otSupportGrid small{font-size:10px}.otSupportGrid .requestType.active:after{content:'✓';position:absolute;right:10px;top:9px;width:24px;height:24px;display:grid;place-items:center;border-radius:50%;background:#168b57;color:#fff;font-weight:1000}.otFamily.supportFamily{--accent:#e47d16}.otFamily.installFamily{--accent:#168bc0}.otIpHint{margin-top:10px;padding:10px 12px;border-radius:11px;background:#eef7ff;border:1px solid #c9e1f2;color:#24566f;font-size:12px;font-weight:700}.otSupportSummary{margin-top:12px;padding:12px 14px;border-radius:12px;background:#f4f9fc;border:1px solid #d6e5ed;color:#214b63;font-size:12px}.otSupportSummary b{color:#0b356f}.otContinue{margin-top:10px;background:linear-gradient(135deg,#0b356f,#168bc0)}.otContinue:disabled{opacity:.45;cursor:not-allowed}.multiPanel{display:grid;gap:12px}.multiBlock{padding:14px;border:1px solid #cfe0e8;border-radius:14px;background:#fff}.multiBlock h4{margin:0 0 8px;color:#0b356f}.multiGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.multiGrid .wide{grid-column:1/-1}.multiGrid label{margin:0;color:#214b63;font-size:12px}.multiGrid input,.multiGrid select,.multiGrid textarea{margin-top:5px}.multiGrid textarea{min-height:72px}.multiChecks{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.multiChecks label{display:flex;gap:7px;align-items:center;padding:9px;border:1px solid #d7e3e9;border-radius:9px;background:#f9fbfc}.multiChecks input{width:auto;margin:0}@media(max-width:850px){.otSupportGrid{grid-template-columns:1fr 1fr}}@media(max-width:650px){.multiGrid,.multiChecks{grid-template-columns:1fr}}@media(max-width:560px){.otFamilyGrid,.otSupportGrid{grid-template-columns:1fr}}
  `;document.head.appendChild(style);
  chooser.querySelector('h2').textContent='¿Qué tipo de OT vamos a crear?';
  const p=chooser.querySelector('h2+p');if(p)p.textContent='Primero elige si es una instalación nueva o un trabajo sobre un servicio existente.';
  box.className='requestTypes otFamilyGrid';
  box.innerHTML=`
    <button type="button" class="requestType otFamily installFamily" id="otFamilyInstall"><span class="requestIcon">📡</span><strong>INSTALACIÓN</strong><small>Alta de un servicio nuevo. Mantiene el flujo de instalación, documentos y plan.</small></button>
    <button type="button" class="requestType otFamily supportFamily" id="otFamilySupport"><span class="requestIcon">🛠️</span><strong>SOPORTE</strong><small>Una sola OT puede incluir varias actividades sobre el mismo servicio.</small></button>`;
  const support=document.createElement('section');support.id='otSupportOptions';support.className='otSupportOptions';support.innerHTML=`<h3>Actividades del soporte</h3><p class="muted">Marca una o varias actividades que el técnico deberá realizar en la misma visita.</p><div class="otSupportGrid"></div><div id="otSupportSummary" class="otSupportSummary">Todavía no has seleccionado actividades.</div><div id="otIpHint" class="otIpHint hidden"></div><button type="button" id="otSupportContinue" class="otContinue" disabled>CONTINUAR CON EL SOPORTE →</button>`;box.insertAdjacentElement('afterend',support);
  const grid=support.querySelector('.otSupportGrid');
  grid.innerHTML=opts.map(([t,i,n,d])=>`<button type="button" class="requestType" data-type="${t}"><span class="requestIcon">${i}</span><strong>${n}</strong><small>${d}</small></button>`).join('');
  const install=document.getElementById('otFamilyInstall'),supportBtn=document.getElementById('otFamilySupport'),hint=document.getElementById('otIpHint'),summary=document.getElementById('otSupportSummary'),cont=document.getElementById('otSupportContinue');

  function refreshSelection(){
    grid.querySelectorAll('[data-type]').forEach(b=>b.classList.toggle('active',supportSelected.has(b.dataset.type)));
    const arr=[...supportSelected];
    summary.innerHTML=arr.length?`<b>${arr.length} actividad${arr.length===1?'':'es'}:</b> ${arr.map(x=>labels[x]).join(' + ')}`:'Todavía no has seleccionado actividades.';
    cont.disabled=!arr.length;
    if(selected)selected.textContent=arr.length?`✓ SOPORTE · ${arr.map(x=>labels[x]).join(' + ')}`:'Selecciona una o varias actividades del soporte.';
    const cambio=arr.includes('CAMBIO_EQUIPOS');hint.classList.toggle('hidden',!cambio);
    if(cambio)hint.textContent='ℹ️ En cambio de equipos normalmente se conserva la IP actual. Si hace falta verificarla, usa Mesa técnica de campo → Consultar IP actual.';
  }
  function field(label,html,wide=false){return `<div class="${wide?'wide':''}"><label>${label}${html}</label></div>`}
  function block(type){
    if(type==='SOPORTE_TECNICO')return `<section class="multiBlock"><h4>🛠️ Diagnóstico / reparación</h4><div class="multiGrid">${field('Problema reportado *','<input data-detail data-required data-label="PROBLEMA REPORTADO" placeholder="EJ.: INTERNET INTERMITENTE, SIN SERVICIO...">',true)}${field('Causa probable','<select data-detail data-label="CAUSA PROBABLE"><option value="">Por determinar</option><option>FALLA DE EQUIPO</option><option>FIBRA / ACOMETIDA</option><option>CONFIGURACIÓN</option><option>WI-FI / COBERTURA</option><option>ENERGÍA / FUENTE</option><option>AFECTACIÓN EXTERNA</option><option>OTRA</option></select>')}${field('Diagnóstico breve de oficina','<textarea data-detail data-label="DIAGNÓSTICO DE OFICINA"></textarea>',true)}</div></section>`;
    if(type==='REUBICACION')return `<section class="multiBlock"><h4>📍 Traslado / reubicación</h4><div class="multiGrid">${field('Tipo *','<select data-detail data-required data-label="TIPO REUBICACIÓN"><option value="">Selecciona...</option><option>INTERNA</option><option>CAMBIO DE DOMICILIO</option></select>')}${field('Nueva ubicación *','<input data-detail data-required data-label="NUEVA UBICACIÓN">')}${field('Indicaciones','<textarea data-detail data-label="INDICACIONES DE TRASLADO"></textarea>',true)}</div></section>`;
    if(type==='AMPLIACION_COBERTURA_WIFI')return `<section class="multiBlock"><h4>📶 Cobertura Wi‑Fi</h4><div class="multiGrid">${field('Área que necesita cobertura *','<input data-detail data-required data-label="ÁREA WIFI">')}${field('Problema observado *','<input data-detail data-required data-label="PROBLEMA WIFI">')}${field('Equipo actual','<input data-detail data-label="EQUIPO ACTUAL">')}${field('Pisos / habitaciones','<input data-detail data-label="DIMENSIÓN WIFI">')}</div></section>`;
    if(type==='ACTIVACION_TV_EXISTENTE')return `<section class="multiBlock"><h4>📺 Activación TV</h4><div class="multiGrid">${field('Paquete / servicio solicitado *','<input data-detail data-required data-label="PAQUETE TV">')}${field('Cantidad de televisores *','<input type="number" min="1" value="1" data-detail data-required data-label="TELEVISORES">')}${field('Ubicación / indicaciones','<textarea data-detail data-label="UBICACIÓN TV"></textarea>',true)}</div></section>`;
    if(type==='INSTALACION_PUNTO_TV')return `<section class="multiBlock"><h4>🔌 Punto adicional TV</h4><div class="multiGrid">${field('Puntos adicionales *','<input type="number" min="1" value="1" data-detail data-required data-label="PUNTOS TV">')}${field('Recorrido aproximado','<input data-detail data-label="RECORRIDO">')}${field('Ubicaciones *','<textarea data-detail data-required data-label="UBICACIONES TV"></textarea>',true)}</div></section>`;
    if(type==='CAMBIO_EQUIPOS')return `<section class="multiBlock"><h4>🔄 Cambio de equipos</h4><div class="multiGrid">${field('Equipo(s) a reemplazar *','<input data-detail data-required data-label="EQUIPOS A REEMPLAZAR" placeholder="ROUTER, ONU, DECODIFICADOR...">')}${field('Serial actual','<input data-detail data-label="SERIAL ACTUAL">')}${field('Motivo del cambio *','<textarea data-detail data-required data-label="MOTIVO CAMBIO"></textarea>',true)}</div></section>`;
    if(type==='RETIRO')return `<section class="multiBlock"><h4>📥 Retiro</h4><div class="multiGrid"><div class="wide"><label>Equipos posiblemente instalados</label><div class="multiChecks"><label><input type="checkbox" value="ONU" data-detail data-label="POSIBLE RETIRO"> ONU</label><label><input type="checkbox" value="ROUTER" data-detail data-label="POSIBLE RETIRO"> Router</label><label><input type="checkbox" value="DECODIFICADOR TV" data-detail data-label="POSIBLE RETIRO"> Decodificador TV</label><label><input type="checkbox" value="REPETIDOR WI-FI" data-detail data-label="POSIBLE RETIRO"> Repetidor Wi‑Fi</label><label><input type="checkbox" value="FUENTE / ADAPTADOR" data-detail data-label="POSIBLE RETIRO"> Fuente / adaptador</label><label><input type="checkbox" value="OTRO EQUIPO" data-detail data-label="POSIBLE RETIRO"> Otro equipo</label></div></div>${field('Motivo / observación','<textarea data-detail data-label="MOTIVO RETIRO"></textarea>',true)}</div></section>`;
    return `<section class="multiBlock"><h4>➕ Otra actividad</h4><div class="multiGrid">${field('Actividad solicitada *','<textarea data-detail data-required data-label="OTRA ACTIVIDAD"></textarea>',true)}</div></section>`;
  }
  function openMultiSupport(){
    if(!supportSelected.size)return;
    window.elegirTipo('SOPORTE_TECNICO');
    const panel=document.getElementById('specificPanel');
    if(!panel)return;
    const names=[...supportSelected].map(x=>labels[x]);
    panel.innerHTML=`<h3>🛠️ Soporte multiactividad</h3><p class="muted">Una sola OT · ${names.join(' + ')}</p><input type="hidden" value="${names.join(' + ').replace(/"/g,'&quot;')}" data-detail data-label="ACTIVIDADES DEL SOPORTE"><div class="multiPanel">${[...supportSelected].map(block).join('')}</div>`;
    const title=document.getElementById('activityModalTitle');if(title)title.textContent='Soporte · '+names.join(' + ');
    const formTitle=document.getElementById('formTitle');if(formTitle)formTitle.textContent='Soporte · '+names.join(' + ');
    const formHint=document.getElementById('formHint');if(formHint)formHint.textContent='Servicio existente, actividades, prioridad y contacto';
    const send=document.getElementById('enviar');if(send)send.textContent='ENVIAR OT DE SOPORTE →';
    window.__supervisorSupportActivities=[...supportSelected];
  }

  install.onclick=()=>{supportSelected.clear();refreshSelection();support.classList.remove('show');hint.classList.add('hidden');window.elegirTipo('INSTALACION_INTERNET');install.classList.add('active');supportBtn.classList.remove('active')};
  supportBtn.onclick=()=>{support.classList.add('show');install.classList.remove('active');supportBtn.classList.add('active');refreshSelection();support.scrollIntoView({behavior:'smooth',block:'nearest'})};
  grid.querySelectorAll('[data-type]').forEach(b=>b.onclick=()=>{const t=b.dataset.type;supportSelected.has(t)?supportSelected.delete(t):supportSelected.add(t);refreshSelection()});
  cont.onclick=openMultiSupport;
  if(selected)selected.textContent='Selecciona INSTALACIÓN o SOPORTE para comenzar.';
})();