(()=>{
  if(window.__disprotelErpSidebarV1)return;window.__disprotelErpSidebarV1=true;
  const mq=window.matchMedia('(max-width:680px)');

  function paintToggle(btn){
    if(!btn)return;
    if(mq.matches){
      const open=document.body.classList.contains('erpMobileMenuOpen');
      btn.classList.toggle('isActive',open);
      btn.setAttribute('aria-pressed',open?'true':'false');
      btn.title=open?'Cerrar navegación':'Abrir navegación';
      const s=btn.querySelector('.erpToggleState');if(s)s.textContent=open?'ABIERTO':'MENÚ';
      return;
    }
    const pinned=document.body.classList.contains('erpSidebarPinned');
    btn.classList.toggle('isActive',pinned);
    btn.setAttribute('aria-pressed',pinned?'true':'false');
    btn.title=pinned?'Menú fijado · clic para modo automático':'Modo automático · clic para fijar menú';
    const s=btn.querySelector('.erpToggleState');if(s)s.textContent=pinned?'FIJO':'AUTO';
  }

  function install(){
    const aside=document.querySelector('.menuAside');
    const shell=document.querySelector('.menuShell');
    if(!aside||!shell)return false;
    document.body.classList.add('erpSidebarReady');
    let title=aside.querySelector('.sideTitle');
    let btn=title&&title.querySelector('.erpMenuToggle');
    if(title&&!btn){
      btn=document.createElement('button');
      btn.type='button';btn.className='erpMenuToggle';btn.setAttribute('aria-label','Abrir o compactar navegación');
      btn.innerHTML='<span class="erpToggleIcon">☰</span><small class="erpToggleState">AUTO</small>';
      title.appendChild(btn);
      btn.addEventListener('click',e=>{
        e.stopPropagation();
        if(mq.matches){
          document.body.classList.toggle('erpMobileMenuOpen');
        }else{
          const pinned=document.body.classList.toggle('erpSidebarPinned');
          localStorage.setItem('disprotel_sidebar_pinned',pinned?'1':'0');
        }
        paintToggle(btn);
      });
    }
    if(!mq.matches&&localStorage.getItem('disprotel_sidebar_pinned')==='1')document.body.classList.add('erpSidebarPinned');
    paintToggle(btn);
    aside.addEventListener('mouseenter',()=>{if(!mq.matches)document.body.classList.add('erpSidebarHover')});
    aside.addEventListener('mouseleave',()=>document.body.classList.remove('erpSidebarHover'));
    aside.querySelectorAll('button:not(.erpMenuToggle)').forEach(b=>b.addEventListener('click',()=>{
      if(mq.matches){document.body.classList.remove('erpMobileMenuOpen');paintToggle(btn)}
    }));
    return true;
  }

  let n=0;const t=setInterval(()=>{if(install()||++n>40)clearInterval(t)},150);
  window.addEventListener('resize',()=>{
    if(!mq.matches)document.body.classList.remove('erpMobileMenuOpen');
    paintToggle(document.querySelector('.erpMenuToggle'));
  });

  function compactFrame(frame){
    try{
      const d=frame.contentDocument;
      const w=frame.contentWindow;
      if(!d||!w)return;
      const path=(w.location.pathname||'').toLowerCase();
      const isFinalInventory=path.endsWith('/index.html')||path.endsWith('/index');

      if(!d.getElementById('erpCompactInjected')){
        const s=d.createElement('style');
        s.id='erpCompactInjected';
        s.textContent=`
          .hero{padding:12px 18px!important;min-height:0!important;border-radius:10px!important;margin-bottom:8px!important}
          .hero h1{font-size:22px!important;margin:2px 0 3px!important}
          .hero p{font-size:11px!important;margin:0!important;line-height:1.3!important}
          .eyebrow{font-size:8px!important;margin-bottom:2px!important}
          .statusBar,.connectionBar,.onlineBar,.supabaseStatus{min-height:28px!important;padding:5px 10px!important;margin-bottom:6px!important;font-size:8px!important;border-radius:7px!important}
          .pageHeader,.moduleHeader,.innerHeader{padding-top:7px!important;padding-bottom:7px!important;min-height:0!important}
          .tabs,.tabbar,.subnav,.toolbar{margin-top:6px!important;margin-bottom:6px!important;gap:6px!important}
          .tabs button,.tabbar button,.subnav button,.toolbar button{min-height:34px!important;padding:7px 10px!important;font-size:10px!important;border-radius:7px!important}
          .main,.content,.container{padding-top:8px!important}
          .sectionTitle{margin-top:12px!important}

          body.erpInventoryFinal .invHero{
            min-height:0!important;
            padding:10px 18px!important;
            margin:6px 0 7px!important;
            border-radius:10px!important;
            box-shadow:0 4px 12px rgba(7,59,80,.08)!important;
          }
          body.erpInventoryFinal .invHero>small{display:none!important}
          body.erpInventoryFinal .invHero h1{
            font-size:20px!important;
            line-height:1.1!important;
            margin:0 0 3px!important;
          }
          body.erpInventoryFinal .invHero p{
            font-size:11px!important;
            line-height:1.2!important;
            margin:0!important;
          }
          body.erpInventoryFinal .tabs{
            margin:7px 0!important;
            gap:7px!important;
          }
          body.erpInventoryFinal .tab{
            min-width:130px!important;
            padding:10px 11px!important;
            font-size:11px!important;
            border-radius:9px!important;
          }

          @media(max-width:680px){
            .hero{padding:10px 12px!important}.hero h1{font-size:18px!important}.hero p{font-size:10px!important}
            body.erpInventoryFinal .invHero{padding:8px 11px!important;margin:4px 0 6px!important;border-radius:8px!important}
            body.erpInventoryFinal .invHero h1{font-size:17px!important}
            body.erpInventoryFinal .invHero p{font-size:9.5px!important}
            body.erpInventoryFinal .tabs{margin:5px 0!important;gap:5px!important}
            body.erpInventoryFinal .tab{min-width:120px!important;padding:8px 7px!important;font-size:10px!important}
          }
        `;
        d.head.appendChild(s);
      }

      if(isFinalInventory){
        d.body?.classList.add('erpInventoryFinal');
        const firstLine=d.querySelector('.invHero>small');
        if(firstLine)firstLine.style.setProperty('display','none','important');
      }
    }catch(e){}
  }

  const hooked=new WeakSet();
  const hookFrame=f=>{
    if(hooked.has(f))return;
    hooked.add(f);
    f.addEventListener('load',()=>compactFrame(f));
    compactFrame(f);
  };
  const obs=new MutationObserver(()=>document.querySelectorAll('iframe.menuFrame').forEach(hookFrame));
  obs.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>document.querySelectorAll('iframe.menuFrame').forEach(hookFrame),800);
})();