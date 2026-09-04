(()=>{
  if(window.__disprotelRetomarInstalacion)return;
  window.__disprotelRetomarInstalacion=true;

  const $=id=>document.getElementById(id);
  const txt=id=>String($(id)?.textContent||'').toUpperCase();

  function abrir(id){
    ['accDatos','accDoc','accTrabajo','accIp','accEvidencias'].forEach(x=>{
      const el=$(x);
      if(el)el.open=x===id;
    });
    setTimeout(()=>$(id)?.scrollIntoView({behavior:'smooth',block:'start'}),80);
  }

  function pasoPendiente(){
    if(document.body.classList.contains('otSoloLectura'))return null;
    if(!/COMPLETO|DISPONIBLE/.test(txt('stDoc')))return 'accDoc';
    if(!/GUARDADO|MODIFICANDO|AGREGANDO/.test(txt('stTrabajo')))return 'accTrabajo';
    if(!/IP CONFIRMADA|✅|ASIGNADA/.test(txt('stIp')))return 'accIp';
    return 'accEvidencias';
  }

  function retomar(){
    const forced=new URLSearchParams(location.search).get('paso');
    const map={datos:'accDatos',documento:'accDoc',materiales:'accTrabajo',ip:'accIp',evidencias:'accEvidencias'};
    const target=map[forced]||pasoPendiente();
    if(target)abrir(target);
  }

  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    const listo=txt('stDoc')&&txt('stTrabajo')&&txt('stIp')&&!/CONSULTANDO|CARGANDO/.test(document.body.textContent.toUpperCase());
    if(listo||tries>30){
      clearInterval(timer);
      setTimeout(retomar,350);
      setTimeout(retomar,1100);
    }
  },250);

  window.retomarPasoInstalacion=retomar;
})();
