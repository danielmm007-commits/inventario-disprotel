(()=>{
  if(window.__disprotelMobileHistoryV1)return;window.__disprotelMobileHistoryV1=true;
  const isMobile=()=>matchMedia('(max-width:680px)').matches;
  if(!isMobile())return;

  const HOME='disprotel-home',GUARD='disprotel-guard',MODULE='disprotel-module',LEVEL2='disprotel-level2',CAMERA='disprotel-camera';
  let handling=false,initialized=false;

  function activeModuleKey(){
    const b=document.querySelector('.menuAside button[data-href].on');
    return b?.dataset?.href||b?.id||b?.textContent?.trim()||'module';
  }

  function closeModuleUI(){
    const aside=document.querySelector('.menuAside');
    document.body.classList.remove('moduleOpen');
    aside?.querySelectorAll('button[data-href]').forEach(x=>x.classList.remove('on'));
  }

  function restoreTab(id){
    if(!id)return;
    const tab=document.getElementById(id);
    if(tab&&!tab.classList.contains('active')){
      handling=true;
      try{tab.click()}catch{}
      setTimeout(()=>{handling=false},0);
    }
  }

  function initHistory(){
    if(initialized)return;initialized=true;
    try{
      history.replaceState({...history.state,disprotelLevel:GUARD},'',location.href);
      if(document.body.classList.contains('moduleOpen')){
        history.pushState({disprotelLevel:MODULE,moduleKey:activeModuleKey()},'',location.href);
      }else{
        history.pushState({disprotelLevel:HOME},'',location.href);
      }
    }catch{}
  }

  function markModule(){
    if(!isMobile()||handling)return;
    try{
      const key=activeModuleKey();
      const st=history.state||{};
      if(st.disprotelLevel===HOME||st.disprotelLevel===GUARD||!st.disprotelLevel){
        history.pushState({disprotelLevel:MODULE,moduleKey:key},'',location.href);
      }else if(st.disprotelLevel===MODULE){
        if(st.moduleKey!==key)history.replaceState({...st,disprotelLevel:MODULE,moduleKey:key},'',location.href);
      }else if(st.disprotelLevel===LEVEL2){
        if(st.moduleKey!==key)history.replaceState({disprotelLevel:MODULE,moduleKey:key},'',location.href);
      }
    }catch{}
  }

  function markHomeWithoutLeaving(){
    if(!isMobile()||handling)return;
    try{
      const st=history.state||{};
      if(st.disprotelLevel!==HOME)history.replaceState({disprotelLevel:HOME},'',location.href);
    }catch{}
  }

  function markLevel2(tab,previousTabId){
    if(!tab||!document.body.classList.contains('moduleOpen')||handling)return;
    try{
      const key=activeModuleKey();
      const st=history.state||{};
      if(st.disprotelLevel===MODULE){
        history.replaceState({...st,returnTabId:previousTabId||st.returnTabId||null},'',location.href);
        history.pushState({disprotelLevel:LEVEL2,moduleKey:key,tabId:tab.id||null},'',location.href);
      }else if(st.disprotelLevel===LEVEL2){
        history.replaceState({...st,moduleKey:key,tabId:tab.id||st.tabId||null},'',location.href);
      }
    }catch{}
  }

  window.DisprotelMobileNav={
    pushLevel2(name='level2'){
      if(!isMobile()||handling)return;
      const st=history.state||{};
      try{
        if(st.disprotelLevel===MODULE)history.pushState({disprotelLevel:LEVEL2,moduleKey:activeModuleKey(),name},'',location.href);
        else if(st.disprotelLevel===LEVEL2)history.replaceState({...st,name},'',location.href);
      }catch{}
    },
    back(){history.back()},
    levels:{HOME,MODULE,LEVEL2,CAMERA}
  };

  window.addEventListener('popstate',()=>{
    if(!isMobile())return;
    const st=history.state||{};

    // Un modal/cámara es el nivel superior: Atrás solo lo cierra.
    if(document.getElementById('icsOverlay')){
      window.__disprotelSerialCameraBackClose?.();
      return;
    }

    handling=true;
    if(st.disprotelLevel===MODULE){
      // Venimos de nivel 2: mantenemos el módulo y restauramos su vista previa.
      if(!document.body.classList.contains('moduleOpen'))document.body.classList.add('moduleOpen');
      restoreTab(st.returnTabId);
    }else if(st.disprotelLevel===HOME){
      // Venimos de un módulo de primer nivel: volvemos al menú principal.
      if(document.body.classList.contains('moduleOpen'))closeModuleUI();
    }else if(st.disprotelLevel===GUARD||!st.disprotelLevel){
      // En el menú principal evitamos que un Atrás accidental saque del sistema.
      if(document.body.classList.contains('moduleOpen'))closeModuleUI();
      try{history.pushState({disprotelLevel:HOME},'',location.href)}catch{}
    }
    setTimeout(()=>{handling=false},0);
  });

  document.addEventListener('click',e=>{
    if(!isMobile())return;

    const back=e.target.closest('.mobileModuleBack');
    if(back&&document.body.classList.contains('moduleOpen')){
      e.preventDefault();e.stopImmediatePropagation();history.back();return;
    }

    const tab=e.target.closest('.tabs .tab');
    if(tab&&document.body.classList.contains('moduleOpen')){
      const previous=document.querySelector('.tabs .tab.active');
      const previousId=previous&&previous!==tab?previous.id:null;
      setTimeout(()=>markLevel2(tab,previousId),0);
    }

    const moduleBtn=e.target.closest('.menuAside button[data-href]');
    if(moduleBtn)setTimeout(()=>{if(document.body.classList.contains('moduleOpen'))markModule()},0);
  },true);

  const observer=new MutationObserver(()=>{
    if(!isMobile()||handling)return;
    if(document.body.classList.contains('moduleOpen'))markModule();
    else markHomeWithoutLeaving();
  });
  observer.observe(document.body,{attributes:true,attributeFilter:['class']});

  initHistory();
})();