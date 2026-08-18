(()=>{
  const eliminados=new Set();

  function resultadoLocal(texto,tipo='ok'){
    let box=document.getElementById('resultadoEliminarInline');
    const ref=document.getElementById('guardarCambiosMasivos');
    if(!box&&ref){box=document.createElement('div');box.id='resultadoEliminarInline';ref.insertAdjacentElement('afterend',box)}
    if(box){box.className='msg '+tipo;box.textContent=texto;box.scrollIntoView({behavior:'smooth',block:'nearest'})}
  }

  function pintarFila(row,id){
    const marcada=eliminados.has(id);
    row.style.opacity=marcada?'.62':'';
    row.style.border=marcada?'1px solid #e5b9b9':'';
    row.style.borderRadius=marcada?'12px':'';
    row.style.padding=marcada?'12px':'';
    row.querySelectorAll('input,select').forEach(el=>el.disabled=marcada);
    let aviso=row.querySelector('.eliminarInlineAviso');
    if(marcada){if(!aviso){aviso=document.createElement('div');aviso.className='msg warn eliminarInlineAviso';aviso.style.marginTop='7px';row.appendChild(aviso)}aviso.textContent='⚠️ Se eliminará al guardar y volverá a la minibodega.'}else aviso?.remove();
  }

  function activarBoton(b,row,item){
    b.classList.remove('secondary');
    b.classList.add('eliminarInlineBtn');
    b.style.cssText='margin-top:9px;background:#8a2d2d!important;color:#fff!important;width:100%;border:0;border-radius:12px;padding:11px;font-weight:700';
    b.onclick=null;
    if(b.dataset.inlineReady==='1')return;
    b.dataset.inlineReady='1';
    b.addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();
      if(eliminados.has(item.id))eliminados.delete(item.id);else eliminados.add(item.id);
      b.textContent=eliminados.has(item.id)?'↩️ DESHACER ELIMINACIÓN':'🗑️ ELIMINAR ÍTEM';
      pintarFila(row,item.id);actualizarContador();
    });
  }

  function inyectar(){
    const caja=document.getElementById('resumenGuardado');
    if(!caja||!caja.querySelector('.modeHead'))return;
    const filas=[...caja.querySelectorAll('.editItem')];
    const items=Array.isArray(window.SAVED_ITEMS)?window.SAVED_ITEMS:(typeof SAVED_ITEMS!=='undefined'?SAVED_ITEMS:[]);
    if(!filas.length||!items?.length)return;
    filas.forEach((row,i)=>{
      const item=items[i];if(!item?.id)return;row.dataset.itemId=item.id;
      let b=row.querySelector('.eliminarInlineBtn');
      if(!b){
        b=[...row.querySelectorAll('button')].find(x=>/ELIMINAR ÍTEM|DESHACER ELIMINACIÓN/i.test(x.textContent||''));
      }
      if(!b){b=document.createElement('button');b.type='button';b.textContent='🗑️ ELIMINAR ÍTEM';row.appendChild(b)}
      activarBoton(b,row,item);
      [...row.querySelectorAll('button')].forEach(x=>{if(x!==b&&/ELIMINAR ÍTEM|DESHACER ELIMINACIÓN/i.test(x.textContent||''))x.remove()});
      b.textContent=eliminados.has(item.id)?'↩️ DESHACER ELIMINACIÓN':'🗑️ ELIMINAR ÍTEM';pintarFila(row,item.id);
    });
  }

  function cambiosBase(){if(typeof window.cambiosPendientes==='function')return window.cambiosPendientes()||[];if(typeof cambiosPendientes==='function')return cambiosPendientes()||[];return []}
  function cambiosTotales(){const base=cambiosBase().filter(c=>!eliminados.has(c.item_id));for(const id of eliminados)base.push({tipo:'ELIMINAR',item_id:id});return base}
  function actualizarContador(){const t=document.getElementById('conteoCambios'),b=document.getElementById('guardarCambiosMasivos');if(!t||!b)return;try{const n=cambiosTotales().length;t.textContent=`${n} cambio(s) pendiente(s)`;b.disabled=n===0}catch(e){t.textContent=e.message||'Revisa los cambios.';b.disabled=true}}

  document.addEventListener('click',async e=>{
    const btn=e.target.closest?.('#guardarCambiosMasivos');if(!btn||!eliminados.size)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    let cambios;try{cambios=cambiosTotales()}catch(err){resultadoLocal(err.message||'Revisa los cambios.','err');return}
    if(!cambios.length)return;const nElim=cambios.filter(c=>c.tipo==='ELIMINAR').length;
    if(!confirm(`¿Guardar ${cambios.length} modificación(es)? ${nElim} ítem(s) serán eliminados y devueltos a la minibodega.`))return;
    btn.disabled=true;btn.textContent='GUARDANDO...';resultadoLocal('⏳ Guardando modificaciones...','warn');
    try{await post(API_DOM,'batch-edit-items',{orden_id:ordenId(),cambios});eliminados.clear();if(typeof EDITING!=='undefined')EDITING=false;resultadoLocal(`✅ ${cambios.length} modificación(es) guardada(s). Inventario actualizado.`,'ok');if(typeof show==='function')show(`✅ ${cambios.length} modificación(es) guardada(s). Inventario actualizado.`);if(typeof estadoArticulos==='function')await estadoArticulos(true);if(typeof cargarInventario==='function')Promise.resolve().then(()=>cargarInventario()).catch(()=>{})}
    catch(err){resultadoLocal('❌ '+(err.message||'No se pudo guardar.'),'err');btn.disabled=false;btn.textContent='✅ GUARDAR TODAS LAS MODIFICACIONES'}
  },true);

  const obs=new MutationObserver(()=>requestAnimationFrame(()=>{inyectar();actualizarContador()}));
  const iniciar=()=>{const caja=document.getElementById('resumenGuardado');if(caja)obs.observe(caja,{childList:true,subtree:true});inyectar()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar);else iniciar();
})();