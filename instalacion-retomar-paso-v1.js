(()=>{
  if(window.__disprotelRetomarInstalacion)return;
  window.__disprotelRetomarInstalacion=true;

  const PASOS=['accDatos','accDoc','accTrabajo','accIp','accEvidencias','accFinalizarReporte'];
  const $=id=>document.getElementById(id);
  const txt=id=>String($(id)?.textContent||'').toUpperCase();
  let usuarioToco=false;

  function orden(){
    try{return new URLSearchParams(location.search).get('orden')||O?.id||''}
    catch{return new URLSearchParams(location.search).get('orden')||''}
  }

  function key(){
    const oid=orden();
    return oid?'disprotel_instalacion_paso_'+oid:'';
  }

  function guardarPaso(id){
    if(!PASOS.includes(id))return;
    const k=key();
    if(!k)return;
    try{localStorage.setItem(k,id)}catch{}
  }

  function pasoGuardado(){
    const k=key();
    if(!k)return '';
    try{
      const id=localStorage.getItem(k)||'';
      return PASOS.includes(id)&&$(id)?id:'';
    }catch{return ''}
  }

  function articulosGuardados(){
    const fn=window.cantidadArticulosInstalacionGuardados;
    if(typeof fn==='function')return Number(fn())>0;
    const trabajo=txt('stTrabajo')+' '+txt('resumenGuardado');
    if(/NO SE ENCONTRARON LÍNEAS|NO SE ENCONTRARON LINEAS|SIN ARTÍCULOS|SIN ARTICULOS/.test(trabajo))return false;
    return /GUARDADO|ARTÍCULOS REGISTRADOS|ARTICULOS REGISTRADOS/.test(trabajo);
  }

  function ipDefinitiva(){
    const ip=txt('stIp')+' '+txt('ipEstado');
    return /IP DEFINITIVA|IP CONFIRMADA|✅/.test(ip)&&!/ESPERANDO IP|SOLICITUD ENVIADA|IP TENTATIVA|PENDIENTE|IP AÚN NO SOLICITADA|IP AUN NO SOLICITADA/.test(ip);
  }

  function pasoPorEstado(){
    if(document.body.classList.contains('otSoloLectura'))return null;
    const doc=txt('stDoc')+' '+txt('docEstado');
    const ip=txt('stIp')+' '+txt('ipEstado');
    const evid=txt('stEvidencias')+' '+txt('evMsg');
    const hayItemsGuardados=articulosGuardados();

    // Una IP definitiva validada por el sistema habilita continuar desde el numeral 5,
    // incluso si aún no se ha cargado ninguna fotografía.
    if(ipDefinitiva())return 'accEvidencias';
    if(hayItemsGuardados&&/ESPERANDO IP|SOLICITUD ENVIADA|IP AÚN NO SOLICITADA|IP AUN NO SOLICITADA|IP CONFIRMADA|ASIGNADA|PENDIENTE/.test(ip))return 'accIp';
    if(!hayItemsGuardados)return 'accTrabajo';
    if(!/COMPLETO|DISPONIBLE/.test(doc))return 'accDoc';
    return hayItemsGuardados?'accIp':'accTrabajo';
  }

  function objetivo(){
    const forced=new URLSearchParams(location.search).get('paso');
    const map={datos:'accDatos',documento:'accDoc',materiales:'accTrabajo',ip:'accIp',evidencias:'accEvidencias'};
    const porEstado=pasoPorEstado();
    const guardado=pasoGuardado();
    if(map[forced])return map[forced];
    if(!articulosGuardados()&&['accIp','accEvidencias','accFinalizarReporte'].includes(guardado))return porEstado||'accTrabajo';
    if(porEstado==='accEvidencias'||porEstado==='accIp')return porEstado;
    return guardado||porEstado;
  }

  function retomar(){
    if(usuarioToco)return;
    const target=objetivo();
    // La etapa pendiente puede identificarse sin abrir ningún acordeón.
    // El técnico decide cuándo desplegarla pulsando su encabezado.
    PASOS.forEach(id=>{
      const el=$(id);
      if(el)el.dataset.pasoPendiente=(id===target?'1':'0');
    });
  }

  function instalarMemoriaUsuario(){
    document.addEventListener('pointerdown',ev=>{
      if(ev.target?.closest?.('details.card>summary'))usuarioToco=true;
    },true);

    document.addEventListener('toggle',ev=>{
      const el=ev.target;
      if(!el?.matches?.('details.card')||!el.open)return;
      if(!usuarioToco)return;
      guardarPaso(el.id);
    },true);

    document.addEventListener('click',ev=>{
      // Incluye teclado (Enter/Espacio), además del toque o clic.
      if(ev.target?.closest?.('details.card>summary'))usuarioToco=true;
      const b=ev.target?.closest?.('button,a');
      if(!b)return;
      usuarioToco=true;
      const id=b.id||'';
      const t=String(b.textContent||'').toUpperCase();
      if(id==='confirmarUso'||id==='guardarCambiosMasivos'||/GUARDAR SELECCIÓN|GUARDAR SELECCION|GUARDAR TODAS LAS MODIFICACIONES/.test(t)){
        setTimeout(()=>{
          if(!window.__disprotelGuardadoMaterialesFluido)return;
          guardarPaso(articulosGuardados()?'accIp':'accTrabajo');
        },900);
      }
      if(id==='solicitar'||id==='actualizar'||/SOLICITAR IP|REVISAR DETECCIÓN|REVISAR DETECCION|ACTUALIZAR ESTADO/.test(t))guardarPaso('accIp');
      if((id==='flujoContinuar-accIp'||/EVIDENCIAS/.test(t))&&ipDefinitiva())setTimeout(()=>guardarPaso('accEvidencias'),120);
    },true);
  }

  function iniciarRetomar(){
    setTimeout(()=>{
      if(usuarioToco)return;
      // Al entrar, el numeral 5 permanece cerrado incluso cuando la IP
      // ya está asignada o se llega desde una tarjeta con ?retomar=1.
      const evidencias=$('accEvidencias');
      if(evidencias)evidencias.open=false;
      retomar();
    },180);
  }

  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    const baseListo=txt('stDoc')&&txt('stTrabajo')&&txt('stIp');
    const inventarioListo=!/CONSULTANDO/.test(txt('grupoMini'));
    if((baseListo&&inventarioListo)||tries>36){
      clearInterval(timer);
      iniciarRetomar();
    }
  },250);

  instalarMemoriaUsuario();
  window.retomarPasoInstalacion=retomar;
  window.recordarPasoInstalacion=guardarPaso;
})();
