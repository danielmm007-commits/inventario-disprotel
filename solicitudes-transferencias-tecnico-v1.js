(()=>{
  if(window.__disprotelSolicitudesTecnicoV1)return;
  window.__disprotelSolicitudesTecnicoV1=true;
  const $=id=>document.getElementById(id);
  const setTitle=(panel,title,sub)=>{if(!panel)return;const h=panel.querySelector('h2'),s=panel.querySelector('.sub');if(h)h.textContent=title;if(s)s.textContent=sub};
  const show=(el,on)=>{if(el)el.classList.toggle('hidden',!on)};
  function own(){const id=window.D?.assigned_locations?.[0];return (window.D?.locations||[]).find(x=>x.id===id)}
  function matriz(){const rows=window.D?.locations||[];return rows.find(x=>String(x.codigo||x.codigo_ubicacion||'').toUpperCase()==='UB-001')||rows.find(x=>/BODEGA MATRIZ/i.test(String(x.ubicacion||x.nombre||'')))}
  function setOrigin(loc,label){const el=$('origin');if(!el||!loc)return;const code=loc.codigo||loc.codigo_ubicacion||'',name=loc.ubicacion||loc.nombre||'';el.innerHTML='<option value="'+esc(loc.id)+'">'+esc((code?code+' · ':'')+name)+'</option>';el.value=loc.id;el.disabled=true;const lab=el.closest('.field')?.querySelector('label');if(lab)lab.textContent=label;if(typeof renderChoice==='function')renderChoice()}
  function applyTech(){
    if(!window.D?.is_technician)return false;
    const supply=$('supplyAction'),direct=$('directAction'),baja=$('bajaAction'),stock=$('stockPanel'),incoming=$('incomingPanel'),req=$('reqPanel'),hist=$('transferHistory')?.closest('.panel');
    if(!supply||!direct||!baja)return false;
    supply.style.removeProperty('display');direct.style.removeProperty('display');baja.style.removeProperty('display');
    supply.dataset.mode='ABASTECIMIENTO';direct.dataset.mode='DIRECTA';baja.dataset.mode='BAJA';
    supply.querySelector('strong').textContent='Abastecimientos y transferencias recibidas';
    supply.querySelector('span').textContent='Registra lo retirado de Bodega Matriz y acepta transferencias que te envían.';
    direct.querySelector('strong').textContent='Transferir desde mi bodega';
    direct.querySelector('span').textContent='Envía equipos o materiales desde tu bodega y revisa si ya fueron recibidos.';
    baja.querySelector('strong').textContent='Solicitar baja de mi inventario';
    baja.querySelector('span').textContent='Reporta artículos averiados, perdidos o que deban darse de baja.';
    if(stock)stock.classList.add('hidden');
    const htype=$('historyType');if(htype)htype.classList.add('hidden');
    if(mode==='ABASTECIMIENTO'){
      if($('formTitle'))$('formTitle').textContent='Registrar abastecimiento recibido';
      if($('formSub'))$('formSub').textContent='Registra lo que retiraste físicamente de Bodega Matriz. El inventario queda disponible de inmediato.';
      if($('submitBtn'))$('submitBtn').textContent='REGISTRAR ABASTECIMIENTO →';
      setOrigin(matriz(),'BODEGA MATRIZ · ORIGEN DEL ABASTECIMIENTO');
      show(incoming,true);show(req,true);show(hist,true);
      setTitle(incoming,'📥 Transferencias recibidas pendientes de aceptar','Transferencias enviadas por otro técnico hacia tu bodega.');
      setTitle(req,'📋 Mis abastecimientos pendientes de confirmación','Abastecimientos ya registrados que esperan confirmación administrativa.');
      setTitle(hist,'🧾 Historial de abastecimientos y transferencias recibidas','Tus abastecimientos y las transferencias que recibiste.');
      const hl=$('historyLocation');if(hl?.options?.length)hl.options[0].textContent='Todas las bodegas involucradas';
    }else if(mode==='DIRECTA'){
      if($('formTitle'))$('formTitle').textContent='Transferir desde mi bodega';
      if($('formSub'))$('formSub').textContent='El inventario llegará al destino únicamente cuando el receptor acepte la transferencia.';
      if($('submitBtn'))$('submitBtn').textContent='ENVIAR TRANSFERENCIA →';
      setOrigin(own(),'MI BODEGA · ORIGEN');
      show(incoming,false);show(req,false);show(hist,true);
      setTitle(hist,'🧾 Transferencias enviadas desde mi bodega','Transferencias pendientes de recepción y ya aceptadas.');
      const hl=$('historyLocation');if(hl?.options?.length)hl.options[0].textContent='Todas las bodegas destino';
    }else if(mode==='BAJA'){
      if($('formTitle'))$('formTitle').textContent='Solicitar baja de mi inventario';
      if($('formSub'))$('formSub').textContent='Reporta un artículo de tu bodega y explica claramente el motivo. La administración debe aprobar la baja.';
      if($('submitBtn'))$('submitBtn').textContent='ENVIAR SOLICITUD DE BAJA →';
      setOrigin(own(),'MI BODEGA · ORIGEN');
      show(incoming,false);show(req,true);show(hist,true);
      setTitle(req,'🗑️ Mis solicitudes de baja pendientes','Bajas que todavía esperan resolución administrativa.');
      setTitle(hist,'🧾 Historial de bajas','Tus solicitudes de baja pendientes y finalizadas.');
      const lab=$('detail')?.closest('.field')?.querySelector('label');if(lab)lab.textContent='DETALLE / JUSTIFICACIÓN *';
    }
    return true;
  }
  const oldApplyMode=window.applyMode;
  window.applyMode=function(){if(typeof oldApplyMode==='function')oldApplyMode();applyTech()};
  const oldManager=window.applyManagerUX;
  window.applyManagerUX=function(){if(typeof oldManager==='function')oldManager();applyTech()};
  const oldFill=window.fill;
  window.fill=function(){if(typeof oldFill==='function')oldFill();applyTech()};
  let n=0;const t=setInterval(()=>{if(applyTech()||++n>80)clearInterval(t)},50);
})();