(()=>{
  const CODIGOS_ONU=new Set(['ONU-BRIDGE','ONU-CATV']);
  const API_ITEMS=API_DOM;
  const esOnu=x=>CODIGOS_ONU.has(String(x?.codigo||'').toUpperCase());
  const productoInv=id=>(INV?.materiales||[]).find(x=>x.id===id);
  const onuGuardada=()=> (SAVED_ITEMS||[]).find(esOnu)||null;
  const onuEnCanasta=()=> Object.values(CART||{}).find(esOnu)||null;

  function resultadoLocal(texto,tipo='ok'){
    let box=$('accionResultadoLocal');
    if(!box){
      box=document.createElement('div');
      box.id='accionResultadoLocal';
      const ref=$('guardarCambiosMasivos')||$('confirmarUso')||$('resumenGuardado');
      if(ref?.parentNode)ref.parentNode.insertBefore(box,ref.nextSibling);
    }
    box.className='msg '+tipo;
    box.textContent=texto;
    box.scrollIntoView({behavior:'smooth',block:'nearest'});
  }

  const agregarOnuBase=window.agregarOnu;
  window.agregarOnu=async function(){
    if(typeof bloqueado==='function'&&bloqueado())return;
    const actual=onuGuardada();
    if(actual){
      const t=`Ya existe ${up(actual.producto||actual.codigo||'una ONU')} en esta instalación. Usa MODIFICAR ARTÍCULOS para reemplazarla.`;
      show(t,'warn');resultadoLocal(t,'warn');return;
    }
    if(onuEnCanasta()){
      const t='Ya tienes una ONU en la canasta. Quita esa ONU si deseas elegir otro modelo.';
      show(t,'warn');resultadoLocal(t,'warn');return;
    }
    return agregarOnuBase?.call(this);
  };

  window.renderEditarGuardado=function(){
    $('trabajoCabecera').classList.add('hidden');
    $('selectorTrabajo').classList.add('hidden');
    $('resumenGuardado').classList.remove('hidden');
    $('stTrabajo').textContent='✏️ MODIFICANDO';
    const disponibles=(INV?.seriales||[]).filter(s=>s.estado==='DISPONIBLE');
    const onus=(INV?.materiales||[]).filter(esOnu);
    const lineas=(SAVED_ITEMS||[]).map(x=>{
      if(x.serial){
        const ops=disponibles.map(s=>`<option value="${s.id}">${esc(up(s.producto))} · ${esc(s.serial)}</option>`).join('');
        return `<div class="editItem"><b>${esc(up(x.producto))}</b><div class="muted">Actual: SERIAL ${esc(x.serial)}</div><div class="editRow"><span>Reemplazar por</span><select id="rep_${x.id}" onchange="actualizarConteoCambios()"><option value="">-- SIN CAMBIO --</option>${ops}</select></div></div>`;
      }
      if(esOnu(x)){
        const ops=onus.map(o=>`<option value="${o.id}" ${o.codigo===x.codigo?'selected':''}>${esc(up(o.producto))} · ${Number(o.disponible||0)} disp.</option>`).join('');
        return `<div class="editItem"><b>${esc(up(x.producto))}</b><div class="muted">Equipo controlado por modelo · cantidad fija 1</div><div class="editRow"><span>Reemplazar modelo</span><select id="onu_${x.id}" onchange="actualizarConteoCambios()">${ops}</select></div></div>`;
      }
      return `<div class="editItem"><b>${esc(up(x.producto))}</b><div class="muted">Cantidad actual: ${x.cantidad} ${esc(x.unidad||'UNIDAD')}</div><div class="editRow"><span>Nueva cantidad</span><input id="aj_${x.id}" type="number" min="1" value="${x.cantidad}" oninput="actualizarConteoCambios()"></div></div>`;
    }).join('');
    $('resumenGuardado').innerHTML=`<div class="modeHead"><b>✏️ MODIFICAR ARTÍCULOS GUARDADOS</b><div class="muted">La ONU se reemplaza por modelo y siempre mantiene cantidad 1. Los materiales como rosetas sí pueden cambiar de cantidad.</div></div><div class="pickBox">${lineas}</div><div id="conteoCambios" class="muted" style="margin-top:10px">0 cambios pendientes</div><button id="guardarCambiosMasivos" type="button" onclick="guardarModificacionesMasivas()" disabled>✅ GUARDAR TODAS LAS MODIFICACIONES</button><div id="accionResultadoLocal"></div><button type="button" class="secondary" onclick="volverResumen()">← CANCELAR / VOLVER AL RESUMEN</button>`;
    actualizarConteoCambios();
  };

  window.cambiosPendientes=function(){
    const cambios=[],seriales=new Set();
    for(const x of (SAVED_ITEMS||[])){
      if(x.serial){
        const sid=$('rep_'+x.id)?.value||'';
        if(sid){
          if(seriales.has(sid))throw new Error('No puedes asignar el mismo serial a dos equipos.');
          seriales.add(sid);
          cambios.push({tipo:'SERIAL',item_id:x.id,serial_nuevo_id:sid});
        }
        continue;
      }
      if(esOnu(x)){
        const pid=$('onu_'+x.id)?.value||'';
        if(pid&&pid!==x.producto_id){
          const p=productoInv(pid);
          if(!p||!esOnu(p))throw new Error('Elige un modelo de ONU válido.');
          if(Number(p.disponible||0)<1)throw new Error(`${up(p.producto)} no tiene stock disponible en la minibodega.`);
          cambios.push({tipo:'MODELO_ONU',item_id:x.id,producto_nuevo_id:pid,codigo_nuevo:p.codigo});
        }
        continue;
      }
      const el=$('aj_'+x.id),n=Number(el?.value);
      if(!Number.isInteger(n)||n<1)throw new Error('Revisa las cantidades ingresadas.');
      if(n!==Number(x.cantidad))cambios.push({tipo:'CANTIDAD',item_id:x.id,cantidad_nueva:n});
    }
    return cambios;
  };

  window.guardarModificacionesMasivas=async function(){
    let cambios;
    try{cambios=cambiosPendientes()}catch(e){show(e.message,'warn');resultadoLocal(e.message,'warn');return}
    if(!cambios.length){show('No has realizado ningún cambio.','warn');resultadoLocal('No has realizado ningún cambio.','warn');return}
    if(!confirm(`¿Guardar ${cambios.length} modificación(es)? Todos los cambios se aplicarán juntos.`))return;
    const b=$('guardarCambiosMasivos');if(b){b.disabled=true;b.textContent='GUARDANDO...'}
    resultadoLocal('⏳ Guardando modificaciones...','warn');
    try{
      await post(API_ITEMS,'batch-edit-items',{orden_id:ordenId(),cambios});
      const cOnu=cambios.find(c=>c.tipo==='MODELO_ONU');
      if(cOnu){
        const p=productoInv(cOnu.producto_nuevo_id);
        if(p){
          const tv=p.codigo==='ONU-CATV';
          await post(API_DOM,'service-mode',{orden_id:ordenId(),tv_final:tv,motivo:`REEMPLAZO DE ONU A ${p.codigo}`});
          O.tv_final=tv;
          sessionStorage.setItem(INSTKEY,JSON.stringify(O));
          renderModalidad?.();
        }
      }
      EDITING=false;
      const ok=`✅ ${cambios.length} modificación(es) guardada(s). Inventario actualizado.`;
      show(ok);resultadoLocal(ok,'ok');
      await estadoArticulos(true);
      Promise.resolve().then(()=>cargarInventario()).catch(()=>{});
    }catch(e){
      const t=e.message||'No se pudo guardar la modificación.';
      show(t,'err');resultadoLocal('❌ '+t,'err');actualizarConteoCambios();
      if(b){b.disabled=false;b.textContent='✅ GUARDAR TODAS LAS MODIFICACIONES'}
    }
  };
})();