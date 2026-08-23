(()=>{
  const $=id=>document.getElementById(id);

  function ensure(){
    if(!window.state)return false;
    state.warehouses=Array.isArray(state.warehouses)?state.warehouses:[];
    state.groups=Array.isArray(state.groups)?state.groups:[];
    state.minis=Array.isArray(state.minis)?state.minis:[];
    state.opsMeta=state.opsMeta&&typeof state.opsMeta==='object'?state.opsMeta:{};
    for(const k of ['warehouses','groups','minis']){
      state.opsMeta[k]=state.opsMeta[k]&&typeof state.opsMeta[k]==='object'?state.opsMeta[k]:{};
    }
    return true;
  }

  function finalRender(flash){
    if(typeof window.renderOps==='function')window.renderOps(flash||'');
  }

  function add(kind,inputId,flash,label){
    if(!ensure())return;
    const input=$(inputId);
    const value=input?.value?.trim();
    if(!value)return;
    if(state[kind].includes(value)){
      try{toast('⚠️ YA EXISTE',`${label} ya está configurado.`)}catch(e){}
      return;
    }

    state[kind].push(value);
    if(kind==='warehouses')state.opsMeta.warehouses[value]={historyCount:0,active:true};
    if(kind==='groups')state.opsMeta.groups[value]={historyCount:0,active:true};
    if(kind==='minis')state.opsMeta.minis[value]={group:'',habitual:'',historyCount:0,active:true};

    try{save()}catch(e){}
    finalRender(flash);
    try{toast('✅ AGREGADO',`${value} ya aparece en la vista completa sin recargar la página.`)}catch(e){}
  }

  window.opAddWarehouse=()=>add('warehouses','opWareNew','w','Esa bodega');
  window.opAddGroup=()=>add('groups','opGroupNew','g','Ese grupo');
  window.opAddMini=()=>add('minis','opMiniNew','m','Esa minibodega');
})();