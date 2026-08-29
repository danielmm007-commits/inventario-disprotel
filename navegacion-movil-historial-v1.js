(()=>{
  if(window.__disprotelMobileHistoryV1)return;window.__disprotelMobileHistoryV1=true;
  const isMobile=()=>matchMedia('(max-width:680px)').matches;
  if(!isMobile())return;

  const HOME='disprotel-home',GUARD='disprotel-guard',MODULE='disprotel-module';
  let handling=false,initialized=false;

  function closeModuleUI(){
    const aside=document.querySelector('.menuAside');
    document.body.classList.remove('moduleOpen');
    aside?.querySelectorAll('button[data-href]').forEach(x=>x.classList.remove('on'));
  }

  function initHistory(){
    if(initialized)return;initialized=true;
    try{
      history.replaceState({...history.state,disprotelLevel:GUARD},'',location.href);
      history.pushState({disprotelLevel:HOME},'',location.href);
      if(document.body.classList.contains('moduleOpen')){
        history.pushState({disprotelLevel:MODULE},'',location.href);
      }
    }catch{}
  }

  function markModule(){
    if(!isMobile()||handling)return;
    try{
      const lvl=history.state?.disprotelLevel;
      if(lvl!==MODULE)history.pushState({disprotelLevel:MODULE},'',location.href);
    }catch{}
  }

  function markHomeWithoutLeaving(){
    if(!isMobile())return;
    try{
      const lvl=history.state?.disprotelLevel;
      if(lvl===MODULE)history.replaceState({disprotelLevel:HOME},'',location.href);
    }catch{}
  }

  window.addEventListener('popstate',()=>{
    if(!isMobile())return;
    handling=true;
    const lvl=history.state?.disprotelLevel;
    if(document.body.classList.contains('moduleOpen'))closeModuleUI();
    if(lvl===GUARD||!lvl){
      try{history.pushState({disprotelLevel:HOME},'',location.href)}catch{}
    }
    setTimeout(()=>{handling=false},0);
  });

  document.addEventListener('click',e=>{
    if(!isMobile())return;
    const back=e.target.closest('.mobileModuleBack');
    if(back&&document.body.classList.contains('moduleOpen')){
      e.preventDefault();e.stopImmediatePropagation();
      if(history.state?.disprotelLevel===MODULE)history.back();else closeModuleUI();
      return;
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