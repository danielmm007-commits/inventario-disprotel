(()=>{
  if(window.__disprotelMobileHistoryV1)return;window.__disprotelMobileHistoryV1=true;
  const isMobile=()=>matchMedia('(max-width:680px)').matches;
  if(!isMobile())return;

  const HOME='disprotel-home',GUARD='disprotel-guard',MODULE='disprotel-module',LEVEL2='disprotel-level2',CAMERA='disprotel-camera';
  let handling=false,initialized=false,currentLevel=null;

  function activeModuleKey(){
    const b=document.querySelector('.menuAside button[data-href].on');
    return b?.dataset?.href||b?.id||b?.textContent?.trim()||'module';
  }

  function closeModuleUI(){
    const aside=document.querySelector('.menuAside');
    document.body.classList.remove('moduleOpen');
    document.body.classList.remove('erpMobileMenuOpen');
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

  function replaceState(state){
    history.replaceState(state,'',location.href);
    currentLevel=state?.disprotelLevel||null;
  }
  function pushState(state){
    history.pushState(state,'',location.href);
    currentLevel=state?.disprotelLevel||null;
  }

  function initHistory(){
    if(initialized)return;initialized=true;
    try{
      replaceState({...history.state,disprotelLevel:GUARD});
      if(document.body.classList.contains('moduleOpen'))pushState({disprotelLevel:MODULE,moduleKey:activeModuleKey()});
      else pushState({disprotelLevel:HOME});
    }catch{}
  }

  function markModule(){
    if(!isMobile()||handling)return;
    try{
      const key=activeModuleKey();
      const st=history.state||{};
      if(st.disprotelLevel===HOME||st.disprotelLevel===GUARD||!st.disprotelLevel){
        pushState({disprotelLevel:MODULE,moduleKey:key});
      }else if(st.disprotelLevel===MODULE){
        if(st.moduleKey!==key)replaceState({...st,disprotelLevel:MODULE,moduleKey:key});
        else currentLevel=MODULE;
      }else if(st.disprotelLevel===LEVEL2){
        replaceState({disprotelLevel:MODULE,moduleKey:key});
      }
    }catch{}
  }

  function markHomeWithoutLeaving(){
    if(!isMobile()||handling)return;
    try{
      const st=history.state||{};
      if(st.disprotelLevel!==HOME)replaceState({disprotelLevel:HOME});
      else currentLevel=HOME;
    }catch{}
  }

  function markLevel2(tab,previousTabId){
    if(!tab||!document.body.classList.contains('moduleOpen')||handling)return;
    try{
      const key=activeModuleKey();
      const st=history.state||{};
      if(st.disprotelLevel===MODULE){
        replaceState({...st,returnTabId:previousTabId||st.returnTabId||null});
        pushState({disprotelLevel:LEVEL2,moduleKey:key,tabId:tab.id||null});
      }else if(st.disprotelLevel===LEVEL2){
        replaceState({...st,moduleKey:key,tabId:tab.id||st.tabId||null});
      }
    }catch{}
  }

  // Los iframes forman parte del historial conjunto del navegador. panel-experiencia
  // limpia el módulo con about:blank y Android puede caer primero en ese estado.
  // Si eso ocurre mientras el módulo todavía figura abierto, lo tratamos como HOME.
  function hookMenuFrame(frame){
    if(!frame||frame.__disprotelMobileHistoryHooked)return;
    frame.__disprotelMobileHistoryHooked=true;
    frame.addEventListener('load',()=>{
      if(!isMobile()||!document.body.classList.contains('moduleOpen'))return;
      let blank=false;
      try{
        const href=String(frame.contentWindow?.location?.href||'');
        blank=!href||href==='about:blank';
      }catch{}
      if(!blank)return;
      handling=true;
      closeModuleUI();
      try{replaceState({disprotelLevel:HOME})}catch{currentLevel=HOME}
      setTimeout(()=>{handling=false},0);
    });
  }

  function installFrameGuard(){
    document.querySelectorAll('iframe.menuFrame').forEach(hookMenuFrame);
    const mo=new MutationObserver(()=>document.querySelectorAll('iframe.menuFrame').forEach(hookMenuFrame));
    mo.observe(document.documentElement,{childList:true,subtree:true});
  }

  window.DisprotelMobileNav={
    pushLevel2(name='level2'){
      if(!isMobile()||handling)return;
      const st=history.state||{};
      try{
        if(st.disprotelLevel===MODULE)pushState({disprotelLevel:LEVEL2,moduleKey:activeModuleKey(),name});
        else if(st.disprotelLevel===LEVEL2)replaceState({...st,name});
      }catch{}
    },
    back(){history.back()},
    levels:{HOME,MODULE,LEVEL2,CAMERA}
  };

  window.addEventListener('popstate',()=>{
    if(!isMobile())return;
    const st=history.state||{};
    const from=currentLevel;
    const to=st.disprotelLevel||null;

    if(document.getElementById('icsOverlay')){
      currentLevel=to;
      window.__disprotelSerialCameraBackClose?.();
      return;
    }

    handling=true;

    if(from===LEVEL2&&to===MODULE){
      currentLevel=MODULE;
      if(!document.body.classList.contains('moduleOpen'))document.body.classList.add('moduleOpen');
      restoreTab(st.returnTabId);
    }else if(from===MODULE){
      closeModuleUI();
      try{replaceState({disprotelLevel:HOME})}catch{currentLevel=HOME}
    }else if(to===HOME){
      currentLevel=HOME;
      if(document.body.classList.contains('moduleOpen'))closeModuleUI();
    }else if(to===GUARD||!to){
      if(document.body.classList.contains('moduleOpen'))closeModuleUI();
      try{pushState({disprotelLevel:HOME})}catch{currentLevel=HOME}
    }else{
      currentLevel=to;
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

  installFrameGuard();
  initHistory();
})();