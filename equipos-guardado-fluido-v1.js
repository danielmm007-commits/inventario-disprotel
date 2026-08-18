(()=>{
  const dormir=ms=>new Promise(r=>setTimeout(r,ms));

  async function refrescarResumenGuardado(){
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
          if(acc)acc.open=true;
          return true;
        }
      }catch(e){ultimoError=e}
      await dormir(400);
    }
    if(ultimoError)throw ultimoError;
    throw new Error('Los artículos se guardaron, pero el resumen todavía no se pudo actualizar.');
  }

  async function guardarSeleccionFluida(){
    if(SAVING||(SAVED&&!ADDING))return;
    const items=Object.values(CART);
    if(!items.length){show('La canasta está vacía.','warn');return}
    const eraAgregar=ADDING;
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

      await refrescarResumenGuardado();
      show('✅ Artículos guardados correctamente. Revisa el resumen antes de continuar.');

      // La minibodega se refresca después de mostrar el resumen para no bloquear la interfaz.
      Promise.resolve().then(()=>cargarInventario()).catch(()=>{});
    }catch(e){
      SAVING=false;
      show(e.message,'err');
      if(!SAVED||ADDING)renderCart();
    }
  }

  function instalar(){
    const b=$('confirmarUso');
    if(!b)return false;
    if(b.dataset.guardadoFluido==='1')return true;
    b.dataset.guardadoFluido='1';
    b.onclick=guardarSeleccionFluida;
    return true;
  }

  let n=0;
  const t=setInterval(()=>{
    n++;
    if(instalar()||n>40)clearInterval(t);
  },150);
})();