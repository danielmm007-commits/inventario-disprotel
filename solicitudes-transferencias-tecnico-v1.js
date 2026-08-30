(()=>{
  if(window.__disprotelSolicitudesTecnicoV1)return;
  window.__disprotelSolicitudesTecnicoV1=true;

  const ABAST_API='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-abastecimiento-registro';
  const $=id=>document.getElementById(id);
  const setTitle=(panel,title,sub)=>{if(!panel)return;const h=panel.querySelector('h2'),s=panel.querySelector('.sub');if(h)h.textContent=title;if(s)s.textContent=sub};
  const show=(el,on)=>{if(el)el.classList.toggle('hidden',!on)};
  const stateOf=(type,raw)=>{raw=String(raw||'').toUpperCase();if(raw.includes('RECHAZ'))return'RECHAZADA';if(type==='ABASTECIMIENTO')return raw==='CONFIRMADO'?'FINALIZADO':'PENDIENTE';if(type==='DIRECTA')return ['ACEPTADA','RECIBIDA','FINALIZADA'].includes(raw)?'FINALIZADO':'PENDIENTE';if(type==='BAJA')return ['APROBADA','FINALIZADA','CONFIRMADO'].includes(raw)?'FINALIZADO':'PENDIENTE';return'PENDIENTE'};
  const stateLabel=(type,state)=>state==='RECHAZADA'?'RECHAZADA':state==='PENDIENTE'?(type==='DIRECTA'?'PENDIENTE DE RECEPCIÓN':type==='ABASTECIMIENTO'?'PENDIENTE DE CONFIRMACIÓN':'PENDIENTE DE APROBACIÓN'):(type==='DIRECTA'?'ACEPTADA':type==='ABASTECIMIENTO'?'CONFIRMADO':'APROBADA');

  function own(){const id=window.D?.assigned_locations?.[0];return (window.D?.locations||[]).find(x=>x.id===id)}
  function matriz(){const rows=window.D?.locations||[];return rows.find(x=>String(x.codigo||x.codigo_ubicacion||x.code||'').toUpperCase()==='UB-001')||rows.find(x=>/BODEGA MATRIZ/i.test(String(x.ubicacion||x.nombre||'')))}
  function setOrigin(loc,label){const el=$('origin');if(!el||!loc)return;const code=loc.codigo||loc.codigo_ubicacion||'',name=loc.ubicacion||loc.nombre||'';el.innerHTML='<option value="'+esc(loc.id)+'">'+esc((code?code+' · ':'')+name)+'</option>';el.value=loc.id;el.disabled=true;const lab=el.closest('.field')?.querySelector('label');if(lab)lab.textContent=label;if(typeof renderChoice==='function')renderChoice()}

  function baseCards(){
    const supply=$('supplyAction'),direct=$('directAction'),baja=$('bajaAction');
    if(!supply||!direct||!baja)return false;
    [supply,direct,baja].forEach(x=>x.style.removeProperty('display'));
    supply.dataset.mode='ABASTECIMIENTO';direct.dataset.mode='DIRECTA';baja.dataset.mode='BAJA';
    supply.querySelector('strong').textContent='Abastecimientos y transferencias recibidas';
    supply.querySelector('span').textContent='Registra lo retirado físicamente para tu bodega, revisa tus abastecimientos y acepta transferencias recibidas.';
    direct.querySelector('strong').textContent='Transferir desde mi bodega';
    direct.querySelector('span').textContent='Crea transferencias hacia otras bodegas y consulta las que tú enviaste.';
    baja.querySelector('strong').textContent='Solicitar baja de mi inventario';
    baja.querySelector('span').textContent='Crea bajas de tu inventario y revisa su estado administrativo.';
    return true;
  }

  function setupHistoryControls(){
    const hs=$('historyState'),hl=$('historyLocation'),ht=$('historyType');
    if(ht)ht.classList.add('hidden');
    if(hs){const keep=hs.value;hs.innerHTML='<option value="">Todos los estados</option><option value="PENDIENTE">Pendientes</option><option value="FINALIZADO">Finalizados</option><option value="RECHAZADA">Rechazados</option>';if([...hs.options].some(o=>o.value===keep))hs.value=keep}
    if(hl?.options?.length)hl.options[0].textContent=mode==='DIRECTA'?'Todas las bodegas destino':mode==='BAJA'?'Mi bodega':'Todas las bodegas involucradas';
  }

  function applyTech(){
    if(!window.D?.is_technician)return false;
    if(!baseCards())return false;
    const stock=$('stockPanel'),incoming=$('incomingPanel'),req=$('reqPanel'),hist=$('transferHistory')?.closest('.panel');
    if(stock)stock.classList.add('hidden');
    setupHistoryControls();

    if(mode==='ABASTECIMIENTO'){
      if($('formTitle'))$('formTitle').textContent='Registrar abastecimiento recibido';
      if($('formSub'))$('formSub').textContent='Registra lo que retiraste físicamente para tu bodega. El inventario se mueve inmediatamente; la confirmación posterior es administrativa.';
      if($('submitBtn'))$('submitBtn').textContent='REGISTRAR ABASTECIMIENTO →';
      setOrigin(matriz(),'BODEGA MATRIZ · ORIGEN DEL ABASTECIMIENTO');
      show(incoming,true);show(req,true);show(hist,true);
      setTitle(incoming,'📥 Transferencias recibidas pendientes de aceptar','Aquí aparecen únicamente las transferencias que otros técnicos enviaron hacia tu bodega.');
      setTitle(req,'📋 Mis abastecimientos pendientes de confirmación','Abastecimientos que ya registraste y que Administración todavía debe confirmar.');
      setTitle(hist,'🧾 Historial de abastecimientos y transferencias recibidas','Solo tus abastecimientos y las transferencias que recibiste.');
    }else if(mode==='DIRECTA'){
      if($('formTitle'))$('formTitle').textContent='Transferir equipos y materiales desde mi bodega';
      if($('formSub'))$('formSub').textContent='Envía únicamente artículos de tu inventario. El destino recibe el stock cuando acepta la transferencia.';
      if($('submitBtn'))$('submitBtn').textContent='ENVIAR TRANSFERENCIA →';
      setOrigin(own(),'MI BODEGA · ORIGEN');
      show(incoming,false);show(req,false);show(hist,true);
      setTitle(hist,'🧾 Transferencias enviadas desde mi bodega','Solo las transferencias que tú enviaste, pendientes o finalizadas.');
    }else if(mode==='BAJA'){
      if($('formTitle'))$('formTitle').textContent='Solicitar baja de mi inventario';
      if($('formSub'))$('formSub').textContent='Selecciona un artículo de tu inventario y justifica el motivo. La baja queda pendiente hasta aprobación administrativa.';
      if($('submitBtn'))$('submitBtn').textContent='ENVIAR SOLICITUD DE BAJA →';
      setOrigin(own(),'MI BODEGA · ORIGEN');
      show(incoming,false);show(req,true);show(hist,true);
      setTitle(req,'🗑️ Mis solicitudes de baja pendientes','Únicamente tus solicitudes que todavía esperan resolución administrativa.');
      setTitle(hist,'🧾 Historial de bajas','Tus bajas pendientes, aprobadas o rechazadas.');
      const lab=$('detail')?.closest('.field')?.querySelector('label');if(lab)lab.textContent='DETALLE / JUSTIFICACIÓN *';
    }
    return true;
  }

  function buildRows(){
    const reqs=window.D?.requests||[],lots=window.D?.transfer_history||[],linked=new Set(reqs.map(r=>r.transferencia_lote_id).filter(Boolean)),rows=[];
    for(const r of reqs){const t=r.transferencia_lote_id?lots.find(x=>x.id===r.transferencia_lote_id):null;rows.push({type:r.tipo,raw:t?.estado||r.estado,code:r.codigo+(t?' · '+t.id_transferencia:''),date:t?.fecha_respuesta||t?.fecha_solicitud||r.fecha_respuesta||r.created_at,origin:t?.origen||r.origen,destination:t?.destino||r.destino,emisor:t?.emisor||r.solicitante,receptor:t?.receptor||r.receptor,items:t?.items||r.items||[]})}
    for(const t of lots.filter(x=>!linked.has(x.id)))rows.push({type:'DIRECTA',raw:t.estado,code:t.id_transferencia,date:t.fecha_respuesta||t.fecha_solicitud,origin:t.origen,destination:t.destino,emisor:t.emisor,receptor:t.receptor,items:t.items||[]});
    return rows;
  }

  const oldRenderRequests=window.renderRequests;
  window.renderRequests=function(){
    if(!window.D?.is_technician){if(typeof oldRenderRequests==='function')return oldRenderRequests();return}
    const me=window.D?.me?.id;let rows=window.D?.requests||[];
    if(mode==='ABASTECIMIENTO')rows=rows.filter(r=>r.tipo==='ABASTECIMIENTO'&&(!me||r.solicitante_id===me)&&['PENDIENTE_CONFIRMACION','PENDIENTE_APROBACION'].includes(r.estado));
    else if(mode==='BAJA')rows=rows.filter(r=>r.tipo==='BAJA'&&(!me||r.solicitante_id===me)&&r.estado==='PENDIENTE_APROBACION');
    else rows=[];
    const box=$('requests');if(!box)return;
    box.innerHTML=rows.length?rows.map(r=>'<article class="request"><span class="pill '+esc(r.tipo)+'">'+esc(r.tipo)+' · '+esc(r.estado==='PENDIENTE_CONFIRMACION'?'PENDIENTE DE CONFIRMACIÓN':r.estado)+'</span><h3>'+esc(r.codigo)+'</h3><small>'+new Date(r.created_at).toLocaleString('es-EC')+'</small><div class="items">'+itemText(r)+'</div><div><b>Ruta:</b> '+esc(r.origen?.ubicacion||'—')+' → '+esc(r.tipo==='BAJA'?'BAJA':r.destino?.ubicacion||'—')+(r.detalle?'<br><b>Detalle:</b> '+esc(r.detalle):'')+'</div></article>').join(''):'<div class="empty">No tienes pendientes en esta sección.</div>';
  };

  const oldRenderHistory=window.renderTransferHistory;
  window.renderTransferHistory=function(){
    if(!window.D?.is_technician){if(typeof oldRenderHistory==='function')return oldRenderHistory();return}
    const me=window.D?.me?.id,state=$('historyState')?.value||'',loc=$('historyLocation')?.value||'',q=($('historySearch')?.value||'').trim().toLowerCase();
    let rows=buildRows();
    if(mode==='ABASTECIMIENTO')rows=rows.filter(x=>(x.type==='ABASTECIMIENTO'&&x.emisor?.id===me)||(x.type==='DIRECTA'&&x.receptor?.id===me));
    else if(mode==='DIRECTA')rows=rows.filter(x=>x.type==='DIRECTA'&&x.emisor?.id===me);
    else if(mode==='BAJA')rows=rows.filter(x=>x.type==='BAJA'&&x.emisor?.id===me);
    rows=rows.filter(x=>{const st=stateOf(x.type,x.raw);const locOk=!loc||(mode==='DIRECTA'?x.destination?.id===loc:(x.origin?.id===loc||x.destination?.id===loc));return(!state||st===state)&&locOk&&(!q||JSON.stringify(x).toLowerCase().includes(q))}).sort((a,b)=>new Date(b.date)-new Date(a.date));
    const box=$('transferHistory');if(!box)return;
    box.innerHTML=rows.length?rows.map(x=>{const st=stateOf(x.type,x.raw),label=x.type==='ABASTECIMIENTO'?'ABASTECIMIENTO RECIBIDO':x.type==='DIRECTA'?(x.emisor?.id===me?'TRANSFERENCIA ENVIADA':'TRANSFERENCIA RECIBIDA'):'SOLICITUD DE BAJA',arts=(x.items||[]).map(i=>i.tipo_control==='SERIAL'?esc(i.producto?.producto)+' · serial '+esc(i.serial?.serial):(i.cantidad||1)+' × '+esc(i.producto?.producto||'ARTÍCULO')).join('<br>');return '<article class="request"><span class="pill '+(st==='FINALIZADO'?'done':'')+'">'+label+' · '+stateLabel(x.type,st)+'</span><h3>'+esc(x.code)+'</h3><small>'+new Date(x.date).toLocaleString('es-EC')+'</small><div class="items">'+arts+'</div><div><b>Ruta:</b> '+esc(x.origin?.ubicacion||'—')+' → '+esc(x.type==='BAJA'?'BAJA':x.destination?.ubicacion||'—')+'</div></article>'}).join(''):'<div class="empty">No hay movimientos para estos filtros.</div>';
  };

  async function abastApi(action,payload={}){const sync=$('sync');if(sync)sync.textContent='🟡 GUARDANDO';const r=await fetch(ABAST_API,{method:'POST',headers:{'Content-Type':'application/json','x-session':SESSION?.session_token||''},body:JSON.stringify({action,...payload,carrito_token:CART_TOKEN})});const d=await r.json().catch(()=>({error:'Respuesta inválida'}));if(!r.ok||d.error){if(sync)sync.textContent='🔴 ERROR';throw new Error(d.error||'Error del servidor')}if(sync){sync.textContent='● CONECTADO';sync.className='sync ok connected'}return d}

  const oldSubmit=window.submitFlow;
  window.submitFlow=async function(){
    if(!window.D?.is_technician){if(typeof oldSubmit==='function')return oldSubmit();return}
    try{
      const origin=$('origin'),destination=$('destination'),receiver=$('receiver'),reason=$('reason'),detail=$('detail');
      if(!origin?.value||!reason?.value||!cartItems.length)return toast('Completa origen, motivo y artículos');
      if(mode!=='BAJA'&&(!destination?.value||!receiver?.value))return toast('Selecciona destino y receptor');
      const detalle=(detail?.value||'').trim();if(mode==='BAJA'&&detalle.length<15)return toast('La justificación de la baja debe tener al menos 15 caracteres');
      const payload={origen_id:origin.value,destino_id:destination?.value||'',receptor_id:receiver?.value||'',motivo:reason.value,detalle,observacion:detalle,items:cartItems,carrito_token:CART_TOKEN};
      const out=mode==='ABASTECIMIENTO'?await abastApi('register',payload):mode==='DIRECTA'?await api('direct-transfer',payload):await api('create-request',{...payload,tipo:'BAJA'});
      toast(out.message||'Operación registrada');cartItems=[];if(detail)detail.value='';await load();
    }catch(e){toast(e.message)}
  };

  const oldApplyMode=window.applyMode;
  window.applyMode=function(){if(typeof oldApplyMode==='function')oldApplyMode();applyTech();window.renderRequests();window.renderTransferHistory()};
  const oldManager=window.applyManagerUX;
  window.applyManagerUX=function(){if(typeof oldManager==='function')oldManager();applyTech()};
  const oldFill=window.fill;
  window.fill=function(){if(typeof oldFill==='function')oldFill();applyTech();if(typeof renderIncoming==='function')renderIncoming();window.renderRequests();window.renderTransferHistory()};

  let n=0;const t=setInterval(()=>{if(applyTech()){window.renderRequests();window.renderTransferHistory();clearInterval(t)}else if(++n>100)clearInterval(t)},50);
})();