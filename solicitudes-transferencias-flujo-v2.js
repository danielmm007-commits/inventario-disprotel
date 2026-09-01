(()=>{
  if(window.__disprotelSolicitudesFlujoV2)return;
  window.__disprotelSolicitudesFlujoV2=true;

  const ABAST_API='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-abastecimiento-registro';
  const historyPanel=$('transferHistory')?.closest('.panel');

  const esc2=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const fmt=v=>v?new Date(v).toLocaleString('es-EC'):'—';
  const setTitle=(title,sub)=>{if(!historyPanel)return;const h=historyPanel.querySelector('h2'),p=historyPanel.querySelector('.sub');if(h)h.textContent=title;if(p)p.textContent=sub};

  async function abastApi(action,payload={}){
    sync.textContent='🟡 GUARDANDO';
    const r=await fetch(ABAST_API,{method:'POST',headers:{'Content-Type':'application/json','x-session':SESSION?.session_token||''},body:JSON.stringify({action,...payload,carrito_token:CART_TOKEN})});
    const d=await r.json().catch(()=>({error:'Respuesta inválida'}));
    if(!r.ok||d.error){sync.textContent='🔴 ERROR';throw new Error(d.error||'Error del servidor')}
    sync.textContent='● CONECTADO';sync.className='sync ok connected';return d;
  }

  function ensureStyle(){
    if(document.getElementById('adminHistoryProcessV3'))return;
    const s=document.createElement('style');s.id='adminHistoryProcessV3';
    s.textContent='.adminHistMeta{margin-top:8px;padding-top:8px;border-top:1px solid #dce9ef;color:#526d7b;font-size:10px;line-height:1.55}.request.directDiff{border:2px solid #e0aa2b;background:#fffaf0}.pill.diff{background:#fff0bd;color:#805900}.historyCollapsed>h2{cursor:pointer;display:flex;align-items:center}.historyCollapsed>h2:after{content:"Abrir historial ▾";margin-left:auto;border-radius:999px;padding:7px 10px;background:#e8f2f7;color:#176b91;font-size:10px}.historyCollapsed.historyExpanded>h2:after{content:"Comprimir historial ▴"}.historyCollapsed:not(.historyExpanded)>:not(h2){display:none!important}';
    document.head.appendChild(s);
    if(historyPanel&&!historyPanel.dataset.compactReady){historyPanel.dataset.compactReady='1';historyPanel.classList.add('historyCollapsed');historyPanel.querySelector('h2')?.addEventListener('click',()=>historyPanel.classList.toggle('historyExpanded'))}
  }

  function configureManagerButtons(){
    if(!D?.is_manager)return;
    const supply=$('supplyAction'),direct=$('directAction'),baja=$('bajaAction');
    supply.dataset.mode='LISTA_ABAST';supply.querySelector('strong').textContent='Abastecimientos pendientes de confirmar';supply.querySelector('span').textContent='Constata abastecimientos que ya movieron el inventario.';
    direct.dataset.mode='DIRECTA';direct.querySelector('span').textContent='Transferencias directas entre bodegas; el receptor confirma lo recibido.';
    baja.dataset.mode='LISTA_BAJA';baja.querySelector('strong').textContent='Solicitudes de baja';baja.querySelector('span').textContent='Autoriza o rechaza solicitudes dirigidas a Administración Matriz Salcedo.';
  }

  function configureHistoryControls(){
    if(!D?.is_manager)return;
    const ht=$('historyType'),hs=$('historyState'),hl=$('historyLocation'),hq=$('historySearch'),filters=hs?.parentElement;
    if(ht){ht.classList.add('hidden');ht.value=''}
    if(hs){
      const keep=hs.value;
      if(mode==='LISTA_ABAST')hs.innerHTML='<option value="">Todos los estados</option><option value="PENDIENTE">Pendientes de confirmar</option><option value="FINALIZADO">Confirmados</option>';
      else if(mode==='DIRECTA')hs.innerHTML='<option value="">Todos los estados</option><option value="PENDIENTE">Pendientes de recepción</option><option value="FINALIZADO">Recibidas</option><option value="DIFERENCIA">Con diferencia</option><option value="RECHAZADA">Rechazadas</option>';
      else hs.innerHTML='<option value="">Todos los estados</option><option value="PENDIENTE">Pendientes de aprobación</option><option value="FINALIZADO">Aprobadas</option><option value="RECHAZADA">Rechazadas</option>';
      hs.value=[...hs.options].some(o=>o.value===keep)?keep:'';
      hs.onchange=()=>window.renderTransferHistory();
    }
    if(hl){if(hl.options.length)hl.options[0].textContent=mode==='LISTA_ABAST'?'Todas las bodegas abastecidas':mode==='DIRECTA'?'Todas las bodegas involucradas':'Todas las bodegas solicitantes';hl.onchange=()=>window.renderTransferHistory()}
    if(hq){hq.placeholder='Buscar código, técnico, bodega o artículo…';hq.oninput=()=>window.renderTransferHistory()}
    if(ht)ht.onchange=()=>window.renderTransferHistory();
    if(filters)filters.style.gridTemplateColumns='1fr 1fr 2fr';
  }

  function histStatus(type,raw){
    raw=String(raw||'').toUpperCase();
    if(raw.includes('RECHAZ'))return'RECHAZADA';
    if(type==='ABASTECIMIENTO')return raw==='CONFIRMADO'?'FINALIZADO':'PENDIENTE';
    if(type==='DIRECTA'){if(raw==='RECIBIDA_CON_DIFERENCIA')return'DIFERENCIA';return ['ACEPTADA','RECIBIDA','FINALIZADA'].includes(raw)?'FINALIZADO':'PENDIENTE'}
    if(type==='BAJA')return ['APROBADA','FINALIZADA','CONFIRMADO'].includes(raw)?'FINALIZADO':'PENDIENTE';
    return'PENDIENTE';
  }

  function stateLabel(x){
    if(x.status==='RECHAZADA')return'RECHAZADA';
    if(x.status==='DIFERENCIA')return'RECIBIDA CON DIFERENCIA';
    if(x.status==='PENDIENTE')return x.type==='DIRECTA'?'PENDIENTE DE RECEPCIÓN':x.type==='ABASTECIMIENTO'?'PENDIENTE DE CONFIRMACIÓN':'PENDIENTE DE APROBACIÓN';
    return x.type==='DIRECTA'?'RECIBIDA':x.type==='ABASTECIMIENTO'?'CONFIRMADO':'APROBADA';
  }

  function buildRows(){
    const lots=D?.transfer_history||[],reqs=D?.requests||[],linked=new Set(reqs.map(r=>r.transferencia_lote_id).filter(Boolean)),rows=[];
    for(const r of reqs){
      const t=r.transferencia_lote_id?lots.find(x=>x.id===r.transferencia_lote_id):null,raw=t?.estado||r.estado;
      rows.push({type:r.tipo,status:histStatus(r.tipo,raw),raw,code:r.codigo+(t?' · '+t.id_transferencia:''),createdAt:r.created_at,date:t?.fecha_respuesta||t?.fecha_solicitud||r.fecha_respuesta||r.created_at,responseDate:r.fecha_respuesta,originId:t?.origen_ubicacion_id||r.origen_sugerido_id||r.origen_id||null,destinationId:t?.destino_ubicacion_id||r.destino_id||null,origin:t?.origen||r.origen,destination:t?.destino||r.destino,emisor:t?.emisor||r.solicitante,receptor:t?.receptor||r.receptor,responder:r.aprobador,responseNote:r.respuesta_observacion,items:t?.items||r.items||[]});
    }
    for(const t of lots.filter(x=>!linked.has(x.id)))rows.push({type:'DIRECTA',status:histStatus('DIRECTA',t.estado),raw:t.estado,code:t.id_transferencia,createdAt:t.fecha_solicitud,date:t.fecha_respuesta||t.fecha_solicitud,responseDate:t.fecha_respuesta,originId:t.origen_ubicacion_id||null,destinationId:t.destino_ubicacion_id||null,origin:t.origen,destination:t.destino,emisor:t.emisor,receptor:t.receptor,responseNote:t.respuesta_observacion,items:t.items||[]});
    return rows;
  }

  window.renderTransferHistory=function(){
    if(!D?.is_manager)return;
    let rows=buildRows();
    if(mode==='LISTA_ABAST'){rows=rows.filter(x=>x.type==='ABASTECIMIENTO');setTitle('🧾 Historial de abastecimientos','Solo abastecimientos registrados por técnicos. Fecha de registro y confirmación administrativa.')}
    else if(mode==='DIRECTA'){rows=rows.filter(x=>x.type==='DIRECTA');setTitle('🧾 Historial de transferencias directas','Solo transferencias directas: pendientes, recibidas, rechazadas y con diferencia.')}
    else if(mode==='LISTA_BAJA'){rows=rows.filter(x=>x.type==='BAJA');setTitle('🧾 Historial de solicitudes de baja','Solo solicitudes de baja: pendientes, aprobadas y rechazadas.')}
    else rows=[];

    const st=$('historyState')?.value||'',loc=$('historyLocation')?.value||'',q=($('historySearch')?.value||'').trim().toLowerCase();
    rows=rows.filter(x=>(!st||x.status===st)&&(!loc||(x.type==='ABASTECIMIENTO'?x.destinationId===loc:x.type==='BAJA'?x.originId===loc:x.originId===loc||x.destinationId===loc))&&(!q||JSON.stringify(x).toLowerCase().includes(q))).sort((a,b)=>new Date(b.date)-new Date(a.date));

    const card=x=>{
      const arts=(x.items||[]).map(i=>{const name=i.producto?.producto||'ARTÍCULO';if(x.type==='DIRECTA'&&x.status==='DIFERENCIA'){const sent=Number(i.cantidad||1),got=Number(i.cantidad_recibida??0);return '<b>'+esc2(name)+'</b><br>Enviado: '+sent+' · Recibido: '+got+' · Faltante: '+Math.max(0,sent-got)}return i.tipo_control==='SERIAL'?esc2(name)+' · serial '+esc2(i.serial?.serial):Number(i.cantidad||1)+' × '+esc2(name)}).join('<br>');
      const label=x.type==='ABASTECIMIENTO'?'ABASTECIMIENTO':x.type==='DIRECTA'?'TRANSFERENCIA DIRECTA':'SOLICITUD DE BAJA';
      let meta='';
      if(x.type==='ABASTECIMIENTO')meta='<div class="adminHistMeta"><b>Registrado por técnico:</b> '+fmt(x.createdAt)+(x.status==='FINALIZADO'&&x.responseDate?'<br><b>Confirmado administrativamente:</b> '+fmt(x.responseDate)+(x.responder?.nombre?' · '+esc2(x.responder.nombre):''):'')+'</div>';
      else if(x.type==='BAJA')meta='<div class="adminHistMeta"><b>Fecha de solicitud:</b> '+fmt(x.createdAt)+(x.responseDate?'<br><b>Fecha de resolución:</b> '+fmt(x.responseDate):'')+'</div>';
      else meta='<div class="adminHistMeta"><b>Fecha de envío:</b> '+fmt(x.createdAt)+(x.responseDate?'<br><b>Fecha de recepción/respuesta:</b> '+fmt(x.responseDate):'')+'</div>';
      return '<article class="request '+(x.status==='DIFERENCIA'?'directDiff':'')+'"><span class="pill '+(x.status==='FINALIZADO'?'done':x.status==='DIFERENCIA'?'diff':'')+'">'+label+' · '+stateLabel(x)+'</span><h3>'+esc2(x.code)+'</h3>'+(x.type==='DIRECTA'&&x.status==='DIFERENCIA'&&x.responseNote?'<div class="items"><b>Diferencia reportada:</b> '+esc2(x.responseNote)+'</div>':'')+(x.type==='BAJA'&&x.responder?'<div class="items"><b>'+(x.status==='RECHAZADA'?'Rechazado por:':'Atendido por:')+'</b> '+esc2(x.responder.nombre||'—')+(x.responseNote?'<br><b>Motivo / respuesta:</b> '+esc2(x.responseNote):'')+'</div>':'')+'<div class="items">'+arts+'</div><div><b>Ruta:</b> '+esc2(x.origin?.ubicacion||'—')+' → '+esc2(x.type==='BAJA'?'BAJA':x.destination?.ubicacion||'—')+'<br>'+(x.type==='DIRECTA'?'<b>Entrega:</b> '+esc2(x.emisor?.nombre||'—')+' · <b>Recibe:</b> '+esc2(x.receptor?.nombre||'—'):'<b>Técnico:</b> '+esc2(x.emisor?.nombre||'—'))+'</div>'+meta+'</article>';
    };
    $('transferHistory').innerHTML=rows.length?rows.map(card).join(''):'<div class="empty">No hay movimientos para estos filtros.</div>';
  };

  window.renderRequests=function(){
    if(!D?.is_manager)return;
    let rows=D.requests||[];
    if(mode==='LISTA_ABAST')rows=rows.filter(r=>r.tipo==='ABASTECIMIENTO'&&['PENDIENTE_CONFIRMACION','PENDIENTE_APROBACION'].includes(r.estado));
    else if(mode==='LISTA_BAJA')rows=rows.filter(r=>r.tipo==='BAJA'&&r.estado==='PENDIENTE_APROBACION');
    else rows=[];
    requests.innerHTML=rows.length?rows.map(r=>{const isAbast=r.tipo==='ABASTECIMIENTO',canApprove=isAbast?has('transferencias.aprobar_solicitudes'):has('transferencias.aprobar_baja'),state=isAbast&&r.estado==='PENDIENTE_CONFIRMACION'?'PENDIENTE DE CONFIRMACIÓN':r.estado,items='<div class="items">'+itemText(r)+'</div>',actions=canApprove?'<div class="reqactions" style="margin-top:10px"><button class="primary approve" onclick="approveReq(\''+r.id+'\',\''+r.tipo+'\')">'+(isAbast?'✓ Confirmar':'✓ Aprobar')+'</button>'+(isAbast?'':'<button class="danger" onclick="rejectReq(\''+r.id+'\')">✕ Rechazar</button>')+'</div>':'';return '<article class="request"><span class="pill">'+esc2(r.tipo)+' · '+esc2(state)+'</span><h3>'+esc2(r.codigo)+'</h3><small>'+fmt(r.created_at)+'</small>'+items+'<div><b>Ruta:</b> '+esc2(r.origen?.ubicacion||'—')+' → '+esc2(r.tipo==='BAJA'?'BAJA':r.destino?.ubicacion||'—')+(r.detalle?'<br><b>Detalle:</b> '+esc2(r.detalle):'')+'</div>'+actions+'</article>'}).join(''):'<div class="empty">No tienes pendientes en esta sección.</div>';
  };

  window.approveReq=async function(id,type){
    if(type==='ABASTECIMIENTO'){try{const d=await abastApi('confirm',{id,observacion:'CONFIRMADO DESDE CENTRO ADMINISTRATIVO'});toast(d.message||'Abastecimiento confirmado');await load()}catch(e){toast(e.message)}return}
    if(type==='BAJA'){if(!confirm('¿Confirmas la baja definitiva?'))return;try{const r=D.requests.find(x=>x.id===id),d=await api('approve-request',{id,origen_id:r.origen_sugerido_id,destino_id:r.destino_id,receptor_id:r.receptor_id,observacion:'APROBADA DESDE CENTRO ADMINISTRATIVO'});toast(d.message);await load()}catch(e){toast(e.message)}}
  };

  const oldManagerUX=window.applyManagerUX;
  window.applyManagerUX=function(){oldManagerUX();if(D?.is_manager)configureManagerButtons()};

  const oldApplyMode=window.applyMode;
  window.applyMode=function(){oldApplyMode();if(!D?.is_manager)return;historyPanel?.classList.remove('hidden');$('stockPanel')?.classList.toggle('hidden',mode==='LISTA_ABAST'||mode==='LISTA_BAJA');listSub.textContent=mode==='LISTA_ABAST'?'Solo abastecimientos pendientes de confirmación administrativa.':mode==='LISTA_BAJA'?'Solicitudes de baja pendientes de autorización administrativa.':'Transferencia directa entre bodegas.';configureHistoryControls();window.renderRequests();window.renderTransferHistory()};

  const oldFill=window.fill;
  window.fill=function(){oldFill();if(!D?.is_manager)return;ensureStyle();configureManagerButtons();configureHistoryControls();window.renderRequests();window.renderTransferHistory()};

  ensureStyle();
  try{if(D?.is_manager){configureManagerButtons();configureHistoryControls();window.renderRequests();window.renderTransferHistory()}}catch(e){console.warn('Flujo administrativo v2:',e)}
})();