(()=>{
  if(window.__disprotelSolicitudesFlujoV2)return;window.__disprotelSolicitudesFlujoV2=true;
  const ABAST_API='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-abastecimiento-registro';

  async function abastApi(action,payload={}){
    sync.textContent='🟡 GUARDANDO';
    const r=await fetch(ABAST_API,{method:'POST',headers:{'Content-Type':'application/json','x-session':SESSION?.session_token||''},body:JSON.stringify({action,...payload,carrito_token:CART_TOKEN})});
    const d=await r.json().catch(()=>({error:'Respuesta inválida'}));
    if(!r.ok||d.error){sync.textContent='🔴 ERROR';throw new Error(d.error||'Error del servidor')}
    sync.textContent='● CONECTADO';sync.className='sync ok connected';return d;
  }

  function patchStaticText(){
    const incoming=document.querySelector('#incomingPanel .sub');if(incoming)incoming.textContent='Solo las transferencias directas cambian el inventario cuando el receptor acepta.';
    const stock=document.querySelector('#stockPanel .sub');if(stock)stock.textContent='Consulta consolidada por bodega. El abastecimiento registrado mueve el inventario inmediatamente; las transferencias directas esperan aceptación y las bajas requieren aprobación.';
    const hp=document.querySelector('#historyType');
    if(hp){
      const labels={ABASTECIMIENTO:'Abastecimientos',DIRECTA:'Transferencias directas',BAJA:'Bajas'};
      [...hp.options].forEach(o=>{if(labels[o.value])o.textContent=labels[o.value]});
    }
    const hs=$('historyState');
    if(hs&&hs.dataset.v2!=='1'){
      const keep=hs.value;hs.dataset.v2='1';
      hs.innerHTML='<option value="">Todos los estados</option><option value="PENDIENTE">Pendientes de acción</option><option value="FINALIZADO">Confirmados / aceptados / aprobados</option><option value="RECHAZADA">Rechazados</option>';
      if([...hs.options].some(o=>o.value===keep))hs.value=keep;
    }
    const hl=$('historyLocation');
    if(hl&&hl.options.length){hl.options[0].textContent='Todas las bodegas involucradas';hl.title='Muestra movimientos donde la bodega sea origen o destino';}
    const htitle=document.querySelector('#transferHistory')?.closest('.panel')?.querySelector('h2');if(htitle)htitle.textContent='🧾 Historial de movimientos';
    if($('historySearch'))$('historySearch').placeholder='Buscar código, persona, origen, destino o artículo…';
  }

  const oldManagerUX=window.applyManagerUX;
  window.applyManagerUX=function(){
    oldManagerUX();
    const supply=$('supplyAction'),direct=$('directAction'),baja=$('bajaAction');
    if(D?.is_manager){
      supply.dataset.mode='LISTA_ABAST';
      supply.querySelector('strong').textContent='Abastecimientos pendientes de confirmar';
      supply.querySelector('span').textContent='Constata administrativamente abastecimientos que ya movieron el inventario.';
      direct.querySelector('span').textContent='Transferencias directas entre bodegas; el receptor confirma lo recibido.';
    }else if(D?.is_technician){
      const own=D.locations.find(x=>x.id===D.assigned_locations?.[0]);
      supply.querySelector('strong').textContent='Registrar abastecimiento recibido';
      supply.querySelector('span').textContent='Registra equipos o materiales que ya retiraste y tienes físicamente para '+(own?.ubicacion||'tu bodega operativa')+'.';
      direct.querySelector('span').textContent='Desde tu propia bodega hacia otro grupo, con aceptación del receptor.';
    }
    patchStaticText();
  };

  const oldApplyMode=window.applyMode;
  window.applyMode=function(){
    oldApplyMode();
    const baja=mode==='BAJA',direct=mode==='DIRECTA';
    const label=detailEl.closest('.field')?.querySelector('label');
    if(label)label.textContent=baja?'DETALLE / JUSTIFICACIÓN *':'DETALLE / JUSTIFICACIÓN';
    if(mode==='ABASTECIMIENTO'){
      formTitle.textContent='Registrar abastecimiento recibido';
      formSub.textContent='Al registrar, el inventario se mueve inmediatamente. La confirmación posterior es únicamente administrativa.';
      submitBtn.textContent='REGISTRAR ABASTECIMIENTO →';
    }else if(mode==='LISTA_ABAST'){
      listSub.textContent='Solo se muestran abastecimientos que todavía requieren confirmación administrativa. Los confirmados pasan al historial.';
    }else if(direct){
      formSub.textContent='Solo puedes transferir desde tu propia bodega; el inventario cambia cuando el receptor acepta.';
    }else if(baja){
      formSub.textContent='Describe claramente la causa de la baja. La justificación debe tener al menos 15 caracteres y requiere aprobación administrativa.';
    }
    patchStaticText();
  };

  window.submitFlow=async function(){
    try{
      if(!originEl.value||!reasonEl.value||!cartItems.length)return toast('Completa origen, motivo y artículos');
      if(mode!=='BAJA'&&(!destinationEl.value||!receiverEl.value))return toast('Selecciona destino y receptor');
      if(mode==='DIRECTA'&&!D.can_direct)return toast('No tienes permiso para transferencia directa');
      const detalle=detailEl.value.trim();
      if(mode==='BAJA'&&detalle.length<15)return toast('La justificación de la baja debe tener al menos 15 caracteres');
      const payload={origen_id:originEl.value,destino_id:destinationEl.value,receptor_id:receiverEl.value,motivo:reasonEl.value,detalle,observacion:detalle,items:cartItems,carrito_token:CART_TOKEN};
      let d;
      if(mode==='DIRECTA')d=await api('direct-transfer',payload);
      else if(mode==='ABASTECIMIENTO')d=await abastApi('register',payload);
      else d=await api('create-request',{...payload,tipo:mode});
      toast(d.message||'Operación registrada');cartItems=[];detailEl.value='';await load();
    }catch(e){toast(e.message)}
  };

  window.availabilityHtml=function(r){
    if(r.tipo==='ABASTECIMIENTO'&&['PENDIENTE_CONFIRMACION','PENDIENTE_APROBACION'].includes(r.estado)){
      const legacy=r.estado==='PENDIENTE_APROBACION';
      return '<div class="availability"><div class="availabilityTitle">'+(legacy?'REGISTRO ANTERIOR · AL CONFIRMAR SE APLICARÁ UNA SOLA VEZ':'MOVIMIENTO YA REGISTRADO · PENDIENTE SOLO DE CONFIRMACIÓN ADMINISTRATIVA')+'</div></div><div class="items">'+itemText(r)+'</div>';
    }
    return '<div class="items">'+itemText(r)+'</div>';
  };

  window.renderRequests=function(){
    let rows=D.requests||[];
    if(mode==='LISTA_ABAST')rows=rows.filter(r=>r.tipo==='ABASTECIMIENTO'&&['PENDIENTE_CONFIRMACION','PENDIENTE_APROBACION'].includes(r.estado));
    else if(mode==='LISTA_BAJA')rows=rows.filter(r=>r.tipo==='BAJA'&&r.estado==='PENDIENTE_APROBACION');
    else rows=rows.filter(r=>r.tipo===mode||mode==='DIRECTA'&&r.tipo==='DIRECTA');
    requests.innerHTML=rows.length?rows.map(r=>{
      const isAbast=r.tipo==='ABASTECIMIENTO',abastPending=isAbast&&['PENDIENTE_CONFIRMACION','PENDIENTE_APROBACION'].includes(r.estado),bajaPending=r.tipo==='BAJA'&&r.estado==='PENDIENTE_APROBACION';
      const actionable=abastPending||bajaPending,canApprove=r.tipo==='BAJA'?has('transferencias.aprobar_baja'):has('transferencias.aprobar_solicitudes');
      const stateLabel=r.estado==='PENDIENTE_CONFIRMACION'?'PENDIENTE DE CONFIRMACIÓN':r.estado==='CONFIRMADO'?'CONFIRMADO':r.estado;
      let actions='';
      if(actionable&&canApprove){
        actions='<div class="reqactions" style="margin-top:10px"><button class="primary approve" onclick="approveReq(\''+r.id+'\',\''+r.tipo+'\')">'+(isAbast?'✓ Confirmar':'✓ Aprobar')+'</button>'+(isAbast?'':'<button class="danger" onclick="rejectReq(\''+r.id+'\')">✕ Rechazar</button>')+'</div>';
      }
      return '<article class="request"><div class="reqtop"><div><span class="pill '+esc(r.tipo)+' '+(actionable?'':'done')+'">'+esc(r.tipo)+' · '+esc(stateLabel)+'</span><h3>'+esc(r.codigo)+'</h3><small>'+esc(r.solicitante?.nombre||'')+' · '+new Date(r.created_at).toLocaleString()+'</small></div></div>'+availabilityHtml(r)+'<div><b>Motivo:</b> '+esc(r.motivo)+'<br><b>Ruta:</b> '+esc(r.origen?.ubicacion||'—')+' → '+esc(r.tipo==='BAJA'?'ADMINISTRACIÓN MATRIZ SALCEDO · AUTORIZACIÓN DE BAJA':r.destino?.ubicacion||'—')+'<br>'+(r.detalle?'<b>Detalle:</b> '+esc(r.detalle):'')+'</div>'+actions+'</article>';
    }).join(''):'<div class="empty">No hay registros pendientes para atender.</div>';
  };

  function historyStatus(type,raw){
    raw=String(raw||'').toUpperCase();
    if(raw==='RECHAZADA'||raw==='RECHAZADO')return 'RECHAZADA';
    if(type==='ABASTECIMIENTO')return raw==='CONFIRMADO'?'FINALIZADO':'PENDIENTE';
    if(type==='DIRECTA')return raw==='ACEPTADA'||raw==='RECIBIDA'||raw==='FINALIZADA'?'FINALIZADO':'PENDIENTE';
    if(type==='BAJA')return raw==='APROBADA'||raw==='FINALIZADA'||raw==='CONFIRMADO'?'FINALIZADO':'PENDIENTE';
    return 'PENDIENTE';
  }
  function historyStateLabel(type,raw){
    const s=historyStatus(type,raw);if(s==='RECHAZADA')return 'RECHAZADA';if(s==='PENDIENTE')return type==='DIRECTA'?'PENDIENTE DE RECEPCIÓN':type==='ABASTECIMIENTO'?'PENDIENTE DE CONFIRMACIÓN':'PENDIENTE DE APROBACIÓN';return type==='DIRECTA'?'ACEPTADA':type==='ABASTECIMIENTO'?'CONFIRMADO':'APROBADA';
  }
  function relationLabel(x){
    const me=D?.me?.id;
    if(x.type==='ABASTECIMIENTO')return me&&(x.receptor?.id===me||x.emisor?.id===me)?'ABASTECIMIENTO RECIBIDO':'ABASTECIMIENTO REGISTRADO';
    if(x.type==='DIRECTA'){
      if(me&&x.emisor?.id===me)return 'TRANSFERENCIA ENVIADA';
      if(me&&x.receptor?.id===me)return 'TRANSFERENCIA RECIBIDA';
      return 'TRANSFERENCIA DIRECTA';
    }
    return 'SOLICITUD DE BAJA';
  }

  window.renderTransferHistory=function(){
    patchStaticText();
    const type=$('historyType')?.value||'',state=$('historyState')?.value||'',location=$('historyLocation')?.value||'',q=($('historySearch')?.value||'').trim().toLowerCase(),lots=D.transfer_history||[],requests=D.requests||[],linked=new Set(requests.map(r=>r.transferencia_lote_id).filter(Boolean)),rows=[];
    for(const r of requests){
      const t=r.transferencia_lote_id?lots.find(x=>x.id===r.transferencia_lote_id):null,raw=t?.estado||r.estado,origin=t?.origen||r.origen,destination=t?.destino||r.destino;
      rows.push({type:r.tipo,raw,status:historyStatus(r.tipo,raw),stateLabel:historyStateLabel(r.tipo,raw),code:r.codigo+(t?' · '+t.id_transferencia:''),date:t?.fecha_respuesta||t?.fecha_solicitud||r.fecha_respuesta||r.created_at,origin,destination,emisor:t?.emisor||r.solicitante,receptor:t?.receptor||r.receptor,items:t?.items||r.items||[]});
    }
    for(const t of lots.filter(x=>!linked.has(x.id))){const raw=t.estado;rows.push({type:'DIRECTA',raw,status:historyStatus('DIRECTA',raw),stateLabel:historyStateLabel('DIRECTA',raw),code:t.id_transferencia,date:t.fecha_respuesta||t.fecha_solicitud,origin:t.origen,destination:t.destino,emisor:t.emisor,receptor:t.receptor,items:t.items||[]})}
    rows.sort((a,b)=>new Date(b.date)-new Date(a.date));
    const filtered=rows.filter(x=>(!type||x.type===type)&&(!state||x.status===state)&&(!location||x.origin?.id===location||x.destination?.id===location)&&(!q||JSON.stringify(x).toLowerCase().includes(q)));
    $('historySub').textContent='Movimientos ordenados del más reciente al más antiguo. El filtro de bodega busca tanto en origen como en destino.';
    const card=x=>{const articles=(x.items||[]).map(i=>i.tipo_control==='SERIAL'?esc(i.producto?.producto)+' · serial '+esc(i.serial?.serial):i.cantidad+' × '+esc(i.producto?.producto)).join('<br>');const who=x.type==='DIRECTA'?'<b>Entrega:</b> '+esc(x.emisor?.nombre||'—')+' · <b>Recibe:</b> '+esc(x.receptor?.nombre||'—'):x.type==='ABASTECIMIENTO'?'<b>Registrado por:</b> '+esc(x.emisor?.nombre||'—')+' · <b>Recibe:</b> '+esc(x.receptor?.nombre||x.emisor?.nombre||'—'):'<b>Solicita:</b> '+esc(x.emisor?.nombre||'—');return '<article class="request"><div class="reqtop"><div><span class="pill '+(x.status==='FINALIZADO'?'done':'')+'">'+esc(relationLabel(x))+' · '+esc(x.stateLabel)+'</span><h3>'+esc(x.code)+'</h3><small>'+new Date(x.date).toLocaleString('es-EC')+'</small></div></div><div class="items">'+articles+'</div><div><b>Ruta:</b> '+esc(x.origin?.ubicacion||'—')+' → '+esc(x.type==='BAJA'?'AUTORIZACIÓN DE BAJA':x.destination?.ubicacion||'—')+'<br>'+who+'</div></article>'};
    $('transferHistory').innerHTML=filtered.length?filtered.map(card).join(''):'<div class="empty">No hay movimientos que coincidan con estos filtros.</div>';
  };

  window.approveReq=async function(id,type){
    if(type==='BAJA'){
      if(!confirm('¿Confirmas la baja definitiva? Esta acción moverá los artículos a UB-007 · BAJA.'))return;
      try{const r=D.requests.find(x=>x.id===id),payload={id,origen_id:r.origen_sugerido_id,destino_id:r.destino_id,receptor_id:r.receptor_id,observacion:'APROBADA DESDE CENTRO ADMINISTRATIVO'};const d=await api('approve-request',payload);toast(d.message);await load()}catch(e){toast(e.message)}
      return;
    }
    try{
      const d=await abastApi('confirm',{id,observacion:'CONFIRMADO DESDE CENTRO ADMINISTRATIVO'});
      toast(d.message||'Abastecimiento confirmado');await load();
    }catch(e){toast(e.message)}
  };

  const oldFill=window.fill;
  window.fill=function(){oldFill();patchStaticText();applyManagerUX();applyMode();renderRequests();renderTransferHistory()};

  patchStaticText();
  try{if(D){applyManagerUX();applyMode();renderRequests();renderTransferHistory()}}catch(e){console.warn('Flujo abastecimiento v2:',e)}
})();