(()=>{
  if(!window.state||typeof window.renderOps!=='function')return;

  const PRECONFIG={
    warehouses:{
      'Bodega Matriz Salcedo':{habitual:''},
      'Bodega Saquisilí':{habitual:'Bodega Matriz Salcedo'}
    },
    minis:{
      'Camioneta Toyota':{group:'Grupo Salcedo · Camioneta',habitual:'Bodega Matriz Salcedo'},
      'Furgoneta':{group:'Grupo Salcedo · Furgoneta',habitual:'Bodega Matriz Salcedo'},
      'Camioneta Mazda':{group:'Grupo Saquisilí–Latacunga',habitual:'Bodega Saquisilí'}
    },
    members:{
      'Luis':'Grupo Salcedo · Camioneta',
      'Bryan':'Grupo Salcedo · Camioneta',
      'Franklin':'Grupo Salcedo · Furgoneta',
      'Jonathan':'Grupo Salcedo · Furgoneta',
      'Stalin Vilca':'Grupo Saquisilí–Latacunga',
      'Stalin Molina':'Grupo Saquisilí–Latacunga'
    }
  };

  const requiredGroups=['Grupo Salcedo · Camioneta','Grupo Salcedo · Furgoneta','Grupo Saquisilí–Latacunga'];
  const requiredWarehouses=['Bodega Matriz Salcedo','Bodega Saquisilí'];
  const requiredMinis=['Camioneta Toyota','Furgoneta','Camioneta Mazda'];

  function apply(){
    state.warehouses=Array.isArray(state.warehouses)?state.warehouses:[];
    state.groups=Array.isArray(state.groups)?state.groups:[];
    state.minis=Array.isArray(state.minis)?state.minis:[];

    requiredWarehouses.forEach(n=>{if(!state.warehouses.includes(n))state.warehouses.push(n)});
    requiredGroups.forEach(n=>{if(!state.groups.includes(n))state.groups.push(n)});
    requiredMinis.forEach(n=>{if(!state.minis.includes(n))state.minis.push(n)});
    state.minis=state.minis.filter(n=>n!=='Unidad Saquisilí–Latacunga');

    state.opsMeta=state.opsMeta&&typeof state.opsMeta==='object'?state.opsMeta:{};
    state.opsMeta.warehouses=state.opsMeta.warehouses&&typeof state.opsMeta.warehouses==='object'?state.opsMeta.warehouses:{};
    state.opsMeta.minis=state.opsMeta.minis&&typeof state.opsMeta.minis==='object'?state.opsMeta.minis:{};

    Object.entries(PRECONFIG.warehouses).forEach(([n,cfg])=>{
      const m=state.opsMeta.warehouses[n]||(state.opsMeta.warehouses[n]={historyCount:0,active:true});
      m.habitual=cfg.habitual;
    });
    Object.entries(PRECONFIG.minis).forEach(([n,cfg])=>{
      const m=state.opsMeta.minis[n]||(state.opsMeta.minis[n]={historyCount:0,active:true});
      m.group=cfg.group;
      m.habitual=cfg.habitual;
      if(m.active===undefined)m.active=true;
    });

    (state.users||[]).forEach(u=>{
      if(Array.isArray(u)&&PRECONFIG.members[u[0]])u[2]=PRECONFIG.members[u[0]];
    });

    try{save()}catch(e){}
  }

  const st=document.createElement('style');
  st.textContent=`.opFixedTag{display:inline-flex;margin-top:7px;padding:5px 8px;border-radius:999px;background:#e8f6ee;border:1px solid #bfe3cf;color:#216c49;font-size:7px;font-weight:900}.opFixedInfo{margin-top:7px;padding:7px 8px;border-radius:9px;background:#eef7ff;border:1px solid #cfe5f6;color:#37657f;font-size:8px;line-height:1.4}.opCard.opFixed select{pointer-events:none;background:#f5f9fb;color:#274f67;font-weight:800}.opCard.opFixed .opSaved,.opCard.opFixed .opSaveRelation{display:none!important}`;
  document.head.appendChild(st);

  function decorate(){
    document.querySelectorAll('.opCard').forEach(card=>{
      const title=card.querySelector('.opHead b')?.textContent?.trim()||'';
      if(PRECONFIG.minis[title]){
        card.classList.add('opFixed');
        card.querySelectorAll('select').forEach(s=>s.disabled=true);
        if(!card.querySelector('.opFixedTag')){
          const tag=document.createElement('div');
          tag.className='opFixedTag';
          tag.textContent='✓ PRECONFIGURADO PARA DISPROTEL';
          card.appendChild(tag);
        }
      }
      if(title==='Bodega Saquisilí'&&!card.querySelector('.opFixedInfo')){
        const info=document.createElement('div');
        info.className='opFixedInfo';
        info.innerHTML='<b>Abastecimiento habitual:</b> Bodega Matriz Salcedo';
        card.appendChild(info);
      }
      if(title==='Bodega Matriz Salcedo'&&!card.querySelector('.opFixedInfo')){
        const info=document.createElement('div');
        info.className='opFixedInfo';
        info.innerHTML='<b>Origen principal:</b> abastece bodegas y minibodegas de la operación.';
        card.appendChild(info);
      }
    });
  }

  const originalRender=window.renderOps;
  window.renderOps=function(...args){
    apply();
    const r=originalRender(...args);
    setTimeout(decorate,0);
    return r;
  };

  const originalSet=window.opSetMini;
  window.opSetMini=function(n,k,v){
    if(PRECONFIG.minis[n]){
      apply();
      window.renderOps();
      if(typeof window.toast==='function')window.toast('🔒 PRECONFIGURADO','Esta relación quedó escrita directamente en la plantilla DISPROTEL.');
      return;
    }
    return originalSet(n,k,v);
  };

  apply();
  window.renderOps();
  decorate();
})();