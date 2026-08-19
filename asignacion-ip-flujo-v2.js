(()=>{
  const editando=new Set();
  const syncPendiente=new Set();

  const idSolDesdeInput=el=>el?.id?.startsWith('manual-')?el.id.slice(7):'';
  const manualCard=(req)=>[...req.querySelectorAll('.cand')].find(c=>c.querySelector('input[id^="manual-"]'));
  const inlineMsg=(card,text,tipo='err')=>{
    if(!card)return show(text,tipo);
    let el=card.querySelector('.ipInlineResult');
    if(!el){el=document.createElement('div');el.className='msg ipInlineResult';card.appendChild(el)}
    el.className='msg ipInlineResult '+(tipo==='ok'?'ok':'err');
    el.textContent=text;
  };

  async function refrescarEstados(){
    if(typeof api!=='function'||!US||!PIN)return;
    try{
      const d=await api('pending-review');
      const pausadas=new Set((d.solicitudes||[]).filter(s=>s.detector_estado==='PAUSADO_EDICION').map(s=>s.id));
      editando.clear();pausadas.forEach(x=>editando.add(x));
      aplicar();
    }catch{}
  }

  function candidatoInfo(card){
    const btn=[...card.querySelectorAll('button')].find(b=>(b.getAttribute('onclick')||'').includes('confirmar('));
    if(!btn)return null;
    const m=(btn.getAttribute('onclick')||'').match(/confirmar\('([^']+)'\s*,\s*'([^']+)'\)/);
    if(!m)return null;
    const ip=(card.querySelector('.ip')?.textContent||'').trim();
    return {orden:m[1],cand:m[2],ip,btn};
  }

  function aplicar(){
    document.querySelectorAll('#lista .req').forEach(req=>{
      const mcard=manualCard(req); if(!mcard)return;
      const inp=mcard.querySelector('input[id^="manual-"]');
      const sol=idSolDesdeInput(inp); if(!sol)return;
      mcard.style.display=editando.has(sol)?'block':'none';
      if(editando.has(sol)){
        let lock=mcard.querySelector('.scannerLock');
        if(!lock){lock=document.createElement('div');lock.className='msg scannerLock';lock.style.background='#fff3cd';lock.style.color='#725b00';lock.textContent='🔒 Scanner pausado solo para esta solicitud mientras editas.';mcard.prepend(lock)}
        const b=mcard.querySelector('b'); if(b)b.textContent='✏️ EDITAR IP DETECTADA';
        let cancelar=mcard.querySelector('.cancelarEdicion');
        if(!cancelar){cancelar=document.createElement('button');cancelar.type='button';cancelar.className='secondary cancelarEdicion';cancelar.textContent='✖ CANCELAR EDICIÓN';cancelar.onclick=()=>window.cancelarEdicionIp(sol);mcard.appendChild(cancelar)}
      }
      [...req.querySelectorAll('.cand')].forEach(card=>{
        const info=candidatoInfo(card);if(!info)return;
        info.btn.textContent='✅ CONFIRMAR IP';
        if(!card.querySelector('.editarDetectada')){
          const b=document.createElement('button');b.type='button';b.className='secondary editarDetectada';b.textContent='✏️ EDITAR IP';
          b.onclick=()=>window.editarIpDetectada(sol,info.orden,info.ip);
          info.btn.insertAdjacentElement('afterend',b);
        }
      });
    });
  }

  window.confirmar=async(orden,cand)=>{
    const card=[...document.querySelectorAll('#lista .cand')].find(c=>(c.querySelector('button')?.getAttribute('onclick')||'').includes(cand));
    if(!confirm('¿Confirmar esta IP como definitiva?'))return;
    try{
      const d=await api('confirm',{orden_id:orden,candidato_id:cand});
      inlineMsg(card,'✅ IP '+(d.ip||'')+' confirmada como definitiva.','ok');
      show('✅ IP confirmada.','ok');
      await cargar();
    }catch(e){
      inlineMsg(card,'❌ '+e.message,'err');
      show(e.message,'err');
    }
  };

  window.editarIpDetectada=async(sol,orden,ip)=>{
    if(syncPendiente.has(sol))return;syncPendiente.add(sol);
    try{
      await api('pause-edit',{solicitud_id:sol});
      editando.add(sol); aplicar();
      const inp=document.getElementById('manual-'+sol);if(inp){inp.value=ip;inp.focus();try{inp.setSelectionRange(0,inp.value.length)}catch{}}
      show('🔒 Scanner pausado solo para esta solicitud. Corrige la IP y confirma.');
    }catch(e){show(e.message,'err')}finally{syncPendiente.delete(sol)}
  };

  window.cancelarEdicionIp=async(sol)=>{
    if(syncPendiente.has(sol))return;syncPendiente.add(sol);
    try{
      await api('resume-edit',{solicitud_id:sol});
      editando.delete(sol);aplicar();
      show('▶️ Edición cancelada. El scanner seguirá verificando esta solicitud hasta que Fernando confirme.');
    }catch(e){show(e.message,'err')}finally{syncPendiente.delete(sol)}
  };

  window.manual=async(sol,orden)=>{
    if(!editando.has(sol))return show('Pulsa EDITAR IP antes de realizar una corrección manual.','err');
    const card=document.getElementById('manual-'+sol)?.closest('.cand');
    const ip=(document.getElementById('manual-'+sol)?.value||'').trim();
    const obs=(document.getElementById('obs-'+sol)?.value||'').trim();
    if(!ip)return inlineMsg(card,'❌ Ingresa la IP correcta.','err');
    if(!confirm('¿Confirmar '+ip+' como IP definitiva?'))return;
    try{
      const d=await api('assign-manual',{orden_id:orden,solicitud_id:sol,ip,observacion:obs});
      inlineMsg(card,'✅ IP '+(d.ip||ip)+' confirmada manualmente.','ok');
      show('✅ IP corregida y confirmada.','ok');
      editando.delete(sol);
      await cargar();
    }catch(e){inlineMsg(card,'❌ '+e.message,'err');show(e.message,'err')}
  };

  const obs=new MutationObserver(()=>requestAnimationFrame(aplicar));
  const iniciar=()=>{const lista=document.getElementById('lista');if(lista)obs.observe(lista,{childList:true,subtree:true});aplicar();setInterval(refrescarEstados,8000);setTimeout(refrescarEstados,500)};
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',iniciar):iniciar();
})();