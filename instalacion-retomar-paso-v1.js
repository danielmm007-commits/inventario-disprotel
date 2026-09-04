(()=>{
  if(window.__disprotelRetomarInstalacion)return;
  window.__disprotelRetomarInstalacion=true;

  const PASOS=['accDatos','accDoc','accTrabajo','accIp','accEvidencias'];
  const $=id=>document.getElementById(id);
  const txt=id=>String($(id)?.textContent||'').toUpperCase();
  let abriendo=false;

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

  function abrir(id){
    if(!PASOS.includes(id)||!$(id))return;
    abriendo=true;
    PASOS.forEach(x=>{
      const el=$(x);
      if(el)el.open=x===id;
    });
    setTimeout(()=>$(id)?.scrollIntoView({behavior:'smooth',block:'start'}),80);
    setTimeout(()=>{abriendo=false},220);
  }

  function pasoPorEstado(){
    if(document.body.classList.contains('otSoloLectura'))return null;
    const doc=txt('stDoc')+' '+txt('docEstado');
    const trabajo=txt('stTrabajo')+' '+txt('resumenGuardado');
    const ip=txt('stIp')+' '+txt('ipEstado');
    const evid=txt('stEvidencias')+' '+txt('evMsg');

    if(/SUBIDA|CARGADA|EVIDENCIA|FOTO|GPS|CIERRE/.test(evid))return 'accEvidencias';
    if(/ESPERANDO IP|SOLICITUD ENVIADA|IP AÚN NO SOLICITADA|IP AUN NO SOLICITADA|IP CONFIRMADA|ASIGNADA/.test(ip)&&/GUARDADO|ARTÍCULOS REGISTRADOS|ARTICULOS REGISTRADOS/.test(trabajo))return 'accIp';
    if(!/GUARDADO|ARTÍCULOS REGISTRADOS|ARTICULOS REGISTRADOS|MODIFICANDO|AGREGANDO/.test(trabajo))return 'accTrabajo';
    if(!/COMPLETO|DISPONIBLE/.test(doc))return 'accDoc';
    return 'accTrabajo';
  }

  function objetivo(){
    const forced=new URLSearchParams(location.search).get('paso');
    const map={datos:'accDatos',documento:'accDoc',materiales:'accTrabajo',ip:'accIp',evidencias:'accEvidencias'};
    return map[forced]||pasoGuardado()||pasoPorEstado();
  }

  function retomar(){
    const target=objetivo();
    if(target)abrir(target);
  }

  function instalarMemoriaUsuario(){
    document.addEventListener('toggle',ev=>{
      const el=ev.target;
      if(abriendo||!el?.matches?.('details.card')||!el.open)return;
      guardarPaso(el.id);
    },true);

    document.addEventListener('click',ev=>{
      const b=ev.target?.closest?.('button,a');
      if(!b)return;
      const id=b.id||'';
      const t=String(b.textContent||'').toUpperCase();
      if(id==='confirmarUso'||id==='guardarCambiosMasivos'||/GUARDAR SELECCIÓN|GUARDAR SELECCION|GUARDAR TODAS LAS MODIFICACIONES/.test(t)){
        setTimeout(()=>{if(window.__disprotelGuardadoMaterialesFluido)guardarPaso('accIp')},900);
      }
      if(id==='solicitar'||id==='actualizar'||/SOLICITAR IP|REVISAR DETECCIÓN|REVISAR DETECCION|ACTUALIZAR ESTADO/.test(t))guardarPaso('accIp');
      if(id==='flujoContinuar-accIp'||/EVIDENCIAS/.test(t))setTimeout(()=>guardarPaso('accEvidencias'),120);
    },true);
  }

  function iniciarRetomar(){
    const tiempos=[250,700,1400,2600,4300];
    tiempos.forEach(ms=>setTimeout(retomar,ms));
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
