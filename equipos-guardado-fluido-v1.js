(()=>{
  const dormir=ms=>new Promise(r=>setTimeout(r,ms));
  const ONU_CODES=new Set(['ONU-BRIDGE','ONU-CATV']);
  const esOnu=x=>ONU_CODES.has(String(x?.codigo||'').toUpperCase());
  const onuGuardada=()=> (SAVED_ITEMS||[]).find(esOnu)||null;

  function abrirIp(){
    const trabajo=$('accTrabajo'),ip=$('accIp');
    recordarPaso('accIp');
    if(trabajo)trabajo.open=false;
    if(ip){
      ip.open=true;
      setTimeout(()=>ip.scrollIntoView({behavior:'smooth',block:'start'}),80);
    }
  }

  function recordarPaso(id){
    try{
      const oid=ordenId();
      if(oid&&id)localStorage.setItem('disprotel_instalacion_paso_'+oid,id);
    }catch{}
  }

  async function refrescarResumenGuardado(mantenerTrabajo=true){
    let ultimoError=null;
    for(let i=0;i<15;i++){
      try{
        const d=await post(API_DOM,'items-status',{orden_id:ordenId()});
        if(d?.saved){
          SAVED=true;
          SAVED_ITEMS=d.items||[];
          if(d.instalacion_id){
            O.instalacion_id=d.instalacion_id;
            sessionStorage.setItem(INSTKEY,JSON.stringify(O));
          }
          renderResumenGuardado();
          const acc=$('accTrabajo');
          if(acc)acc.open=Boolean(mantenerTrabajo);
          return true;
        }
      }catch(e){ultimoError=e}
      await dormir(400);
    }
    if(ultimoError)throw ultimoError;
    throw new Error('Los artículos se guardaron, pero el resumen todavía no se pudo actualizar.');
  }

  function validarOnuAntesDeGuardar(items,eraAgregar){
    const nuevas=items.filter(esOnu);
    if(nuevas.length>1)throw new Error('Solo se permite una ONU por instalación.');
    if(eraAgregar&&nuevas.length&&onuGuardada())throw new Error('Ya existe una ONU registrada en esta instalación. Usa MODIFICAR para reemplazarla.');
  }

  async function guardarSeleccionFluida(){
    window.__disprotelGuardadoMaterialesFluido=true;
    if(SAVING||(SAVED&&!ADDING))return;
    const items=Object.values(CART);
    if(!items.length){show('La canasta está vacía.','warn');return}
    const eraAgregar=ADDING;
    try{validarOnuAntesDeGuardar(items,eraAgregar)}catch(e){show(e.message,'warn');return}
    const texto=eraAgregar?'¿Guardar estos artículos adicionales? Se descontarán de la minibodega.':'¿Guardar todos los artículos seleccionados? Esto descontará el inventario de la minibodega.';
    if(!confirm(texto))return;

    SAVING=true;
    renderCart();
    try{
      const action=eraAgregar?'add-items':'save-items';
      const d=await post(API_DOM,action,{orden_id:ordenId(),items});
      if(d.instalacion_id){
        O.instalacion_id=d.instalacion_id;
        sessionStorage.setItem(INSTKEY,JSON.stringify(O));
      }

      ADDING=false;
      CART={};
      SAVING=false;
      $('stTrabajo').textContent='⏳ ACTUALIZANDO RESUMEN';
      show('✅ Artículos guardados correctamente. Actualizando resumen...');

      await refrescarResumenGuardado(false);
      show('✅ Artículos guardados correctamente. Continuamos con IP y plan.');
      abrirIp();

      Promise.resolve().then(()=>cargarInventario()).catch(()=>{});
    }catch(e){
      SAVING=false;
      show(e.message,'err');
      if(!SAVED||ADDING)renderCart();
    }
  }

  function onuBoxControlado(){
    const actual=onuGuardada();
    if(ADDING&&actual){
      return `<div class="pickBox"><b>ONU</b><div class="msg warn" style="margin-top:8px">Ya existe <b>${esc(up(actual.producto||actual.codigo||'ONU'))}</b> registrada en esta instalación. Para cambiar BRIDGE ↔ CATV usa <b>MODIFICAR ARTÍCULOS</b>; no se puede agregar una segunda ONU.</div></div>`;
    }
    const bridge=porCodigo('ONU-BRIDGE'),catv=porCodigo('ONU-CATV'),def=O.tv_solicitada?'ONU-CATV':'ONU-BRIDGE';
    return `<div class="pickBox"><b>ONU</b><div class="muted">Sugerida según la solicitud: ${def==='ONU-CATV'?'CATV':'BRIDGE'}. Se controla por modelo y siempre tiene cantidad 1.</div><div class="pickRow"><select id="onuTipo" class="onuSelect">${bridge?`<option value="ONU-BRIDGE" ${def==='ONU-BRIDGE'?'selected':''}>ONU BRIDGE · ${bridge.disponible} disp.</option>`:''}${catv?`<option value="ONU-CATV" ${def==='ONU-CATV'?'selected':''}>ONU CATV · ${catv.disponible} disp.</option>`:''}</select><button type="button" onclick="agregarOnu()">➕ AGREGAR ONU</button></div></div>`;
  }

  function agregarOnuControlada(){
    if(bloqueado())return;
    if(ADDING&&onuGuardada()){
      show('Ya existe una ONU registrada. Usa MODIFICAR para reemplazarla.','warn');
      return;
    }
    const codigo=$('onuTipo')?.value,x=porCodigo(codigo);
    if(!x||Number(x.disponible)<1){show('No hay stock de esa ONU en la minibodega.','err');return}
    const otra=Object.values(CART).find(v=>esOnu(v));
    if(otra){
      show('Ya agregaste una ONU a la canasta. Si deseas otro modelo, quita la actual y luego agrega la nueva.','warn');
      return;
    }
    CART['p_'+x.id]={tipo:'EQUIPO',producto_id:x.id,serial_id:null,codigo:x.codigo,nombre:x.producto,detalle:'UNIDAD',cantidad:1,unidad:'UNIDAD'};
    if(codigo==='ONU-CATV'&&O.tv_final!==true){
      actualizarModalidadTv().then(()=>{show(up(x.producto)+' agregada a la canasta.');renderInventario()}).catch(e=>show(e.message,'err'));
      return;
    }
    show(up(x.producto)+' agregada a la canasta.');
    renderInventario();
  }

  function materialesBoxBuscable(){
    const a=(INV?.materiales||[]).filter(x=>x.categoria!=='EQUIPOS'&&!ONU_CODES.has(String(x.codigo||'').toUpperCase())&&!/ONU|ONT/i.test(String(x.categoria||'')+' '+String(x.producto||''))&&!CART['p_'+x.id]);
    if(!a.length)return `<div class="pickBox"><b>🧰 MATERIALES</b><div class="muted">No hay materiales por cantidad disponibles en esta minibodega.</div></div>`;
    const opts=a.map(x=>`<option value="${esc(x.id)}">${esc(up(x.producto))} · ${x.disponible} ${esc(x.unidad)}</option>`).join('');
    return `<div class="pickBox"><b>🧰 MATERIALES</b><div class="muted">Busca o elige un material, define cantidad y agrégalo a la canasta. No se descuenta nada hasta guardar.</div><input id="buscarMaterialInst" type="search" list="listaMaterialesInst" placeholder="Buscar material por nombre o código..." oninput="filtrarMaterialInst()"><datalist id="listaMaterialesInst">${a.map(x=>`<option value="${esc(up(x.producto))}"></option>`).join('')}</datalist><div class="pickRow"><select id="materialInst">${opts}</select><input id="cantMaterialInst" type="number" min="1" value="1"></div><button type="button" onclick="agregarMaterialSeleccionadoInst()">➕ AGREGAR A CANASTA</button><div id="materialInstInfo" class="muted" style="margin-top:7px">${a.length} material(es) disponibles en tu minibodega.</div></div>`;
  }

  function filtrarMaterialInst(){
    const sel=$('materialInst'),info=$('materialInstInfo');
    if(!sel)return;
    const q=up($('buscarMaterialInst')?.value||'').trim();
    const a=(INV?.materiales||[]).filter(x=>x.categoria!=='EQUIPOS'&&!ONU_CODES.has(String(x.codigo||'').toUpperCase())&&!/ONU|ONT/i.test(String(x.categoria||'')+' '+String(x.producto||''))&&!CART['p_'+x.id]).filter(x=>!q||up(x.producto).includes(q)||up(x.codigo).includes(q));
    sel.innerHTML=a.map(x=>`<option value="${esc(x.id)}">${esc(up(x.producto))} · ${x.disponible} ${esc(x.unidad)}</option>`).join('');
    if(info)info.textContent=a.length?`${a.length} coincidencia(s).`:'No hay coincidencias.';
  }

  function agregarMaterialSeleccionadoInst(){
    const id=$('materialInst')?.value;
    if(!id){show('Elige un material de la lista.','warn');return}
    const x=(INV?.materiales||[]).find(v=>v.id===id);
    if(!x)return;
    const n=Number($('cantMaterialInst')?.value)||0;
    if(n<1){show('Ingresa una cantidad mayor a 0 para '+up(x.producto)+'.','warn');return}
    if(n>Number(x.disponible)){show('La cantidad supera el stock disponible de '+up(x.producto)+'.','err');return}
    const k='p_'+x.id;
    if(CART[k]){show(up(x.producto)+' ya está en la canasta.','warn');return}
    CART[k]={tipo:'MATERIAL',producto_id:x.id,serial_id:null,codigo:x.codigo,nombre:x.producto,detalle:x.unidad,cantidad:n,unidad:x.unidad};
    show(up(x.producto)+' · cantidad '+n+' agregada a la canasta.');
    renderInventario();
  }

  function renderEditarGuardadoControlado(){
    $('trabajoCabecera').classList.add('hidden');
    $('selectorTrabajo').classList.add('hidden');
    $('resumenGuardado').classList.remove('hidden');
    $('stTrabajo').textContent='✏️ MODIFICANDO';
    const disponibles=(INV?.seriales||[]).filter(s=>s.estado==='DISPONIBLE');
    const bridge=porCodigo('ONU-BRIDGE'),catv=porCodigo('ONU-CATV');
    const lineas=SAVED_ITEMS.map(x=>{
      if(x.serial){
        const ops=disponibles.map(s=>`<option value="${s.id}">${esc(up(s.producto))} · ${esc(s.serial)}</option>`).join('');
        return `<div class="editItem"><b>${esc(up(x.producto))}</b><div class="muted">Actual: SERIAL ${esc(x.serial)}</div><div class="editRow"><span>Reemplazar por</span><select id="rep_${x.id}" onchange="actualizarConteoCambios()"><option value="">-- SIN CAMBIO --</option>${ops}</select></div></div>`;
      }
      if(esOnu(x)){
        const actual=String(x.codigo||'').toUpperCase();
        const opciones=[bridge,catv].filter(Boolean).map(m=>`<option value="${m.id}" data-codigo="${esc(m.codigo)}" ${m.codigo===actual?'selected':''}>${esc(up(m.producto))} · ${m.disponible} disp.</option>`).join('');
        return `<div class="editItem"><b>${esc(up(x.producto||x.codigo))}</b><div class="muted">Equipo controlado por modelo · cantidad fija 1</div><div class="editRow"><span>Modelo de ONU</span><select id="onu_${x.id}" data-actual="${esc(actual)}" onchange="actualizarConteoCambios()">${opciones}</select></div></div>`;
      }
      return `<div class="editItem"><b>${esc(up(x.producto))}</b><div class="muted">Cantidad actual: ${x.cantidad} ${esc(x.unidad||'UNIDAD')}</div><div class="editRow"><span>Nueva cantidad</span><input id="aj_${x.id}" type="number" min="1" value="${x.cantidad}" oninput="actualizarConteoCambios()"></div></div>`;
    }).join('');
    $('resumenGuardado').innerHTML=`<div class="modeHead"><b>✏️ MODIFICAR ARTÍCULOS GUARDADOS</b><div class="muted">Haz todos los cambios que necesites. Nada se aplica al inventario hasta pulsar GUARDAR TODAS LAS MODIFICACIONES.</div></div><div class="pickBox">${lineas}</div><div id="conteoCambios" class="muted" style="margin-top:10px">0 cambios pendientes</div><button id="guardarCambiosMasivos" type="button" onclick="guardarModificacionesMasivas()" disabled>✅ GUARDAR TODAS LAS MODIFICACIONES</button><button type="button" class="secondary" onclick="volverResumen()">← CANCELAR / VOLVER AL RESUMEN</button>`;
    actualizarConteoCambiosControlado();
  }

  function cambiosPendientesControlados(){
    const cambios=[],seriales=new Set();
    for(const x of SAVED_ITEMS){
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
        const sel=$('onu_'+x.id),pid=sel?.value||'',codigo=sel?.selectedOptions?.[0]?.dataset?.codigo||'';
        if(codigo&&codigo!==String(x.codigo||'').toUpperCase()){
          const prod=(INV?.materiales||[]).find(v=>v.id===pid);
          if(!prod||Number(prod.disponible)<1)throw new Error('No hay stock disponible del modelo de ONU seleccionado.');
          cambios.push({tipo:'MODELO_ONU',item_id:x.id,producto_nuevo_id:pid,codigo_nuevo:codigo,cantidad_nueva:1});
        }
        continue;
      }
      const el=$('aj_'+x.id),n=Number(el?.value);
      if(!Number.isInteger(n)||n<1)throw new Error('Revisa las cantidades ingresadas.');
      if(n!==Number(x.cantidad))cambios.push({tipo:'CANTIDAD',item_id:x.id,cantidad_nueva:n});
    }
    return cambios;
  }

  function actualizarConteoCambiosControlado(){
    const t=$('conteoCambios'),b=$('guardarCambiosMasivos');
    if(!t||!b)return;
    try{
      const n=cambiosPendientesControlados().length;
      t.textContent=`${n} cambio(s) pendiente(s)`;
      b.disabled=n===0;
    }catch(e){t.textContent=e.message;b.disabled=true}
  }

  async function guardarModificacionesControladas(){
    let cambios;
    try{cambios=cambiosPendientesControlados()}catch(e){show(e.message,'warn');return}
    if(!cambios.length){show('No has realizado ningún cambio.','warn');return}
    if(!confirm(`¿Guardar ${cambios.length} modificación(es)? Todos los cambios se aplicarán juntos.`))return;
    const b=$('guardarCambiosMasivos');
    if(b)b.disabled=true;
    try{
      const normales=cambios.filter(c=>c.tipo!=='MODELO_ONU');
      const onu=cambios.find(c=>c.tipo==='MODELO_ONU');
      if(normales.length)await post(API_DOM,'batch-edit-items',{orden_id:ordenId(),cambios:normales});
      if(onu){
        // El backend actual no trata la ONU como material cuantificable: se solicita reemplazo explícito de modelo.
        await post(API_DOM,'replace-model-item',{orden_id:ordenId(),item_id:onu.item_id,producto_nuevo_id:onu.producto_nuevo_id,cantidad_nueva:1});
        if(onu.codigo_nuevo==='ONU-CATV'&&O.tv_final!==true)await actualizarModalidadTv();
      }
      EDITING=false;
      show(`✅ ${cambios.length} modificación(es) guardada(s). Inventario actualizado.`);
      await refrescarResumenGuardado(false);
      abrirIp();
      Promise.resolve().then(()=>cargarInventario()).catch(()=>{});
    }catch(e){show(e.message,'err');actualizarConteoCambiosControlado()}
  }

  function instalar(){
    const b=$('confirmarUso');
    if(!b)return false;
    if(b.dataset.guardadoFluido!=='1'){
      b.dataset.guardadoFluido='1';
      b.addEventListener('click',ev=>{
        ev.preventDefault();
        ev.stopImmediatePropagation();
        guardarSeleccionFluida();
      },true);
    }
    if(b.onclick)b.onclick=null;
    window.onuBox=onuBoxControlado;
    window.agregarOnu=agregarOnuControlada;
    window.materialesBox=materialesBoxBuscable;
    window.filtrarMaterialInst=filtrarMaterialInst;
    window.agregarMaterialSeleccionadoInst=agregarMaterialSeleccionadoInst;
    window.renderEditarGuardado=renderEditarGuardadoControlado;
    window.cambiosPendientes=cambiosPendientesControlados;
    window.actualizarConteoCambios=actualizarConteoCambiosControlado;
    window.guardarModificacionesMasivas=guardarModificacionesControladas;
    try{if(INV&&(!SAVED||ADDING||EDITING))renderInventario()}catch(e){}
    return true;
  }

  let n=0;
  const t=setInterval(()=>{
    n++;
    if(instalar()||n>40)clearInterval(t);
  },150);
})();
