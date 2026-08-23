(()=>{
  function clean(){
    document.querySelectorAll('.cfgBox .respManageActions').forEach(x=>x.remove());
  }

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

  function renderFinal(flash=''){
    try{if(typeof window.renderOps==='function')window.renderOps(flash)}catch(e){console.warn('Render final operación:',e)}
  }

  function add(kind,inputId,flash,label){
    if(!ensure())return;
    const input=document.getElementById(inputId);
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
    renderFinal(flash);
    try{toast('✅ AGREGADO',`${value} ya aparece en la vista completa sin recargar la página.`)}catch(e){}
  }

  const hist=(kind,name)=>Number(state.opsMeta?.[kind]?.[name]?.historyCount||0);
  const warehouseUsed=name=>Object.values(state.opsMeta?.minis||{}).some(m=>m&&m.habitual===name);
  const groupUsed=name=>{
    const inMini=Object.values(state.opsMeta?.minis||{}).some(m=>m&&m.group===name);
    const inUsers=(state.users||[]).some(u=>Array.isArray(u)&&String(u?.[4]?.grupo_operativo||'')===name);
    return inMini||inUsers;
  };

  function remove(kind,index,label){
    if(!ensure())return;
    const list=state[kind];
    const name=list?.[index];
    if(!name)return;
    if(hist(kind,name)>0){
      try{toast('🔒 CON HISTORIAL',`${name} no puede eliminarse porque ya tiene historial relacionado.`)}catch(e){}
      return;
    }
    if(kind==='warehouses'&&warehouseUsed(name)){
      try{toast('🔗 EN USO',`Reasigna primero las minibodegas abastecidas por ${name}.`)}catch(e){}
      return;
    }
    if(kind==='groups'&&groupUsed(name)){
      try{toast('🔗 EN USO',`Reasigna primero los usuarios o minibodegas vinculados a ${name}.`)}catch(e){}
      return;
    }
    if(!confirm(`¿Eliminar ${label} “${name}”?`))return;
    list.splice(index,1);
    if(state.opsMeta?.[kind])delete state.opsMeta[kind][name];
    try{save()}catch(e){}
    renderFinal();
    try{toast('🗑 ELIMINADO',`${name} fue eliminado sin recargar la página.`)}catch(e){}
  }

  function install(){
    window.opAddWarehouse=()=>add('warehouses','opWareNew','w','Esa bodega');
    window.opAddGroup=()=>add('groups','opGroupNew','g','Ese grupo');
    window.opAddMini=()=>add('minis','opMiniNew','m','Esa minibodega');
    window.opDeleteWarehouse=i=>remove('warehouses',i,'la bodega');
    window.opDeleteGroup=i=>remove('groups',i,'el grupo');
    window.opDeleteMini=i=>remove('minis',i,'la minibodega');
    clean();
  }

  install();
  setTimeout(install,120);
  new MutationObserver(()=>setTimeout(clean,0)).observe(document.documentElement,{childList:true,subtree:true});
})();