(function(){
  function tvInfo(){return Boolean(O?.tv_final??O?.tv_solicitada)?'SÍ · INTERNET + TV':'NO · SOLO INTERNET'}
  function fmtFecha(v){if(!v)return '—';try{return new Date(v).toLocaleString('es-EC')}catch{return v}}
  function ipv4Valida(ip){const p=String(ip||'').trim().split('.');return p.length===4&&p.every(x=>/^\d{1,3}$/.test(x)&&Number(x)>=0&&Number(x)<=255)}
  function manualBox(){return `<div class="candidate"><b>✍️ ASIGNAR IP MANUALMENTE</b><div class="muted">Úsalo cuando Fernando ya te haya enviado la IP. TV es solo informativo y no interviene en la detección.</div><div class="pickRow"><input id="ipManual" inputmode="decimal" autocomplete="off" placeholder="Ej. 172.25.1.120"><button type="button" onclick="asignarIpManual()">✅ ASIGNAR</button></div><div class="muted" style="margin-top:7px">Plan: se toma del router/Simple Queues cuando esté disponible. · TV: ${esc(tvInfo())}</div></div>`}
  function editarIpBox(ip){return `<div class="candidate"><b>✏️ MODIFICAR / VERIFICAR IP</b><div class="muted">Puedes guardar la misma IP para verificar que no esté duplicada, o cambiarla si fue digitada incorrectamente.</div><div class="pickRow"><input id="ipEditar" inputmode="decimal" autocomplete="off" value="${esc(ip||'')}" placeholder="Ej. 172.25.1.120"><button type="button" onclick="guardarIpEditada()">✅ GUARDAR</button></div><input id="motivoIp" style="width:100%;padding:11px;border:1px solid #cbd8de;border-radius:10px;font-size:15px;margin-top:8px" placeholder="Motivo opcional, ej. corrección de digitación"><div class="muted" style="margin-top:7px">Si la IP no cambia, se registrará como verificación sin cambios.</div></div>`}
  function planCandidato(c){const plan=c.plan_detectado||c.queue_parent||'';return plan?`<div class="muted"><b>PLAN / PARENT:</b> ${esc(up(plan))}${c.queue_name?` · QUEUE: ${esc(up(c.queue_name))}`:''}</div>`:'<div class="muted">PLAN: pendiente de lectura desde Simple Queues</div>'}
  window.estadoIp=async function(){
    try{
      const d=await post(API_IP,'status',{orden_id:ordenId()}),q=d.solicitud,cs=d.candidatos||[];
      if(d.orden){O.plan_final=d.orden.plan_final??O.plan_final;O.tv_final=d.orden.tv_final??O.tv_final;sessionStorage.setItem(INSTKEY,JSON.stringify(O))}
      $('candidatos').innerHTML='';
      if(!q){
        $('ipEstado').innerHTML=`<span class="badge">IP AÚN NO ASIGNADA</span><div class="row" style="margin-top:10px"><div class="item"><div class="label">Plan real</div><div class="value">SE LEERÁ DEL ROUTER</div></div><div class="item"><div class="label">TV · informativo</div><div class="value">${esc(tvInfo())}</div></div></div><div class="muted" style="margin-top:8px">Puedes iniciar la detección automática o ingresar la IP recibida por mensaje.</div>`;
        $('solicitar').classList.remove('hidden');$('solicitar').textContent='📡 DETECTAR IP AUTOMÁTICAMENTE';$('actualizar').classList.add('hidden');$('stIp').textContent='PENDIENTE';$('candidatos').innerHTML=manualBox();return
      }
      $('solicitar').classList.add('hidden');
      if(q.estado==='ASIGNADA'){
        $('actualizar').classList.add('hidden');
        const plan=O.plan_final||'POR VERIFICAR EN ROUTER';
        $('ipEstado').innerHTML=`<span class="badge okb">✅ IP ASIGNADA</span><div class="ip">${esc(q.ip_asignada)}</div><div class="row" style="margin-top:10px"><div class="item"><div class="label">Plan real / parent</div><div class="value">${esc(up(plan))}</div></div><div class="item"><div class="label">TV · informativo</div><div class="value">${esc(tvInfo())}</div></div></div>${q.observacion?`<div class="muted" style="margin-top:8px">${esc(q.observacion)}</div>`:''}`;
        $('candidatos').innerHTML=editarIpBox(q.ip_asignada);
        $('stIp').textContent='✅ '+q.ip_asignada;return
      }
      $('actualizar').classList.remove('hidden');$('actualizar').textContent='🔄 REVISAR DETECCIÓN';$('stIp').textContent='⏳ ESPERANDO IP';
      $('ipEstado').innerHTML=`<span class="badge wait">⏳ DETECCIÓN ACTIVA</span><div class="row" style="margin-top:10px"><div class="item"><div class="label">Solicitud</div><div class="value">${esc(fmtFecha(q.solicitado_at))}</div></div><div class="item"><div class="label">Último escaneo</div><div class="value">${esc(fmtFecha(q.detector_ultimo_scan))}</div></div></div><div class="muted" style="margin-top:8px">TV: ${esc(tvInfo())} · solo informativo</div>`;
      let html=manualBox();
      if(!cs.length){html+='<div class="msg warn">Todavía no hay IP candidata del detector.</div>'}
      else html+=cs.map(c=>`<div class="candidate"><span class="badge okb">CANDIDATO AUTOMÁTICO</span><div class="ip">${esc(c.address)}</div><b>${esc(up(c.comentario||''))}</b>${c.codigo_dspr?`<div class="muted">DSPR: ${esc(c.codigo_dspr)}</div>`:''}${planCandidato(c)}<div class="muted">Confianza: ${esc(c.score??'—')}</div><button type="button" onclick="confirmarIp('${c.id}','${esc(c.address)}')">✅ CONFIRMAR ESTA IP</button></div>`).join('');
      $('candidatos').innerHTML=html
    }catch(e){show(e.message,'err')}
  };
  window.solicitarIp=async function(){
    try{await post(API_O,'request-ip',{orden_id:ordenId(),plan_final:'',tv_final:Boolean(O.tv_final??O.tv_solicitada)});show('Detección de IP iniciada.');await window.estadoIp()}catch(e){show(e.message,'err')}
  };
  window.confirmarIp=async function(id,ip){
    if(!confirm(`¿Confirmar ${ip} como IP definitiva de esta instalación?`))return;
    try{const d=await post(API_IP,'confirm',{orden_id:ordenId(),candidato_id:id});if(d.plan_final)O.plan_final=d.plan_final;show('✅ IP confirmada desde MikroTik.');await window.estadoIp()}catch(e){show(e.message,'err')}
  };
  window.asignarIpManual=async function(){
    const ip=String($('ipManual')?.value||'').trim();
    if(!ip){show('Ingresa la IP que te enviaron.','warn');return}
    if(!ipv4Valida(ip)){show('La IP no es una IPv4 válida. Revisa los cuatro bloques.','warn');return}
    if(!confirm(`¿Asignar manualmente ${ip} como IP definitiva?`))return;
    try{await post(API_IP,'assign-manual',{orden_id:ordenId(),ip,observacion:'IP ingresada manualmente según información recibida de Fernando'});show('✅ IP asignada manualmente.');await window.estadoIp()}catch(e){show(e.message,'err')}
  };
  window.guardarIpEditada=async function(){
    const ip=String($('ipEditar')?.value||'').trim(),motivo=String($('motivoIp')?.value||'').trim();
    if(!ip){show('La IP no puede quedar vacía.','warn');return}
    if(!ipv4Valida(ip)){show('La IP no es una IPv4 válida. Cada bloque debe estar entre 0 y 255.','warn');return}
    if(!confirm(`¿Guardar/verificar la IP ${ip}?`))return;
    try{const d=await post(API_IP,'modify-ip',{orden_id:ordenId(),ip,motivo});if(d.sin_cambios)show('✅ IP verificada correctamente · sin cambios.');else show(`✅ IP actualizada: ${d.ip_anterior} → ${d.ip}.`);await window.estadoIp()}catch(e){show(e.message,'err')}
  };
  const s=$('solicitar'),a=$('actualizar');if(s)s.onclick=window.solicitarIp;if(a)a.onclick=window.estadoIp;
  setTimeout(()=>window.estadoIp(),0);
})();