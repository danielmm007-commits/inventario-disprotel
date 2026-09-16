(()=>{
  if(window.__supervisorOtFamiliasV1)return;window.__supervisorOtFamiliasV1=true;
  const chooser=document.querySelector('.requestChooser'),box=document.querySelector('.requestTypes');
  if(!chooser||!box||typeof window.elegirTipo!=='function')return;
  const selected=document.getElementById('typeSelected');
  const style=document.createElement('style');style.id='supervisorOtFamiliasStyle';style.textContent=`
    .otFamilyGrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.otFamily{min-height:150px!important;border-width:2px!important}.otFamily .requestIcon{font-size:38px}.otFamily strong{font-size:19px!important}.otSupportOptions{display:none;margin-top:15px;padding-top:15px;border-top:1px solid #d8e7ee}.otSupportOptions.show{display:block}.otSupportOptions h3{margin:0 0 5px;color:#0b356f}.otSupportOptions>p{margin:0 0 12px}.otSupportGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.otSupportGrid .requestType{min-height:105px;padding:13px}.otSupportGrid .requestIcon{font-size:23px;margin-bottom:5px}.otSupportGrid strong{font-size:13px}.otSupportGrid small{font-size:10px}.otFamily.supportFamily{--accent:#e47d16}.otFamily.installFamily{--accent:#168bc0}.otIpHint{margin-top:10px;padding:10px 12px;border-radius:11px;background:#eef7ff;border:1px solid #c9e1f2;color:#24566f;font-size:12px;font-weight:700}@media(max-width:850px){.otSupportGrid{grid-template-columns:1fr 1fr}}@media(max-width:560px){.otFamilyGrid,.otSupportGrid{grid-template-columns:1fr}}
  `;document.head.appendChild(style);
  chooser.querySelector('h2').textContent='¿Qué tipo de OT vamos a crear?';
  const p=chooser.querySelector('h2+p');if(p)p.textContent='Primero elige si es una instalación nueva o un trabajo sobre un servicio existente.';
  box.className='requestTypes otFamilyGrid';
  box.innerHTML=`
    <button type="button" class="requestType otFamily installFamily" id="otFamilyInstall"><span class="requestIcon">📡</span><strong>INSTALACIÓN</strong><small>Alta de un servicio nuevo. Mantiene el flujo de instalación, documentos y plan.</small></button>
    <button type="button" class="requestType otFamily supportFamily" id="otFamilySupport"><span class="requestIcon">🛠️</span><strong>SOPORTE</strong><small>Todo trabajo sobre un servicio existente: falla, traslado, Wi‑Fi, TV, equipos, retiro y otras actividades.</small></button>`;
  const support=document.createElement('section');support.id='otSupportOptions';support.className='otSupportOptions';support.innerHTML=`<h3>Actividad de soporte</h3><p class="muted">Selecciona la actividad principal. La OT sigue siendo de soporte y puede involucrar varias acciones durante la ejecución.</p><div class="otSupportGrid"></div><div id="otIpHint" class="otIpHint hidden"></div>`;box.insertAdjacentElement('afterend',support);
  const opts=[
    ['SOPORTE_TECNICO','🛠️','Falla / soporte','Diagnóstico, reparación o asistencia.'],
    ['REUBICACION','📍','Traslado / reubicación','Cambio interno o cambio de domicilio.'],
    ['AMPLIACION_COBERTURA_WIFI','📶','Cobertura Wi‑Fi','Ampliación o mejora de cobertura.'],
    ['ACTIVACION_TV_EXISTENTE','📺','Activación TV','Activación sobre servicio existente.'],
    ['INSTALACION_PUNTO_TV','🔌','Punto adicional TV','Nuevo punto dentro del domicilio.'],
    ['CAMBIO_EQUIPOS','🔄','Cambio de equipos','Router, ONU, decodificador u otro equipo.'],
    ['RETIRO','📥','Retiro','Recuperación o desinstalación de equipos.'],
    ['OTRO','➕','Otra actividad','Trabajo técnico no contemplado arriba.']
  ];
  const grid=support.querySelector('.otSupportGrid');
  grid.innerHTML=opts.map(([t,i,n,d])=>`<button type="button" class="requestType" data-type="${t}"><span class="requestIcon">${i}</span><strong>${n}</strong><small>${d}</small></button>`).join('');
  const install=document.getElementById('otFamilyInstall'),supportBtn=document.getElementById('otFamilySupport'),hint=document.getElementById('otIpHint');
  const selectSupport=type=>{
    window.elegirTipo(type);
    support.classList.add('show');supportBtn.classList.add('active');install.classList.remove('active');
    grid.querySelectorAll('[data-type]').forEach(b=>b.classList.toggle('active',b.dataset.type===type));
    if(type==='CAMBIO_EQUIPOS'){
      hint.classList.remove('hidden');hint.textContent='ℹ️ En cambio de equipos normalmente se conserva la IP actual. Si hace falta verificarla, usa Mesa técnica de campo → Consultar IP actual por cliente u OT.';
    }else hint.classList.add('hidden');
  };
  install.onclick=()=>{support.classList.remove('show');hint.classList.add('hidden');window.elegirTipo('INSTALACION_INTERNET');install.classList.add('active');supportBtn.classList.remove('active')};
  supportBtn.onclick=()=>{support.classList.add('show');install.classList.remove('active');supportBtn.classList.add('active');if(selected)selected.textContent='Selecciona la actividad principal del soporte.';support.scrollIntoView({behavior:'smooth',block:'nearest'})};
  grid.querySelectorAll('[data-type]').forEach(b=>b.onclick=()=>selectSupport(b.dataset.type));
  if(selected)selected.textContent='Selecciona INSTALACIÓN o SOPORTE para comenzar.';
})();