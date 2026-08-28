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
      const d=frame.contentDocument;if(!d)return;
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

          body.erpInventoryCompact .hero{
            display:block!important;
            min-height:0!important;
            padding:7px 14px!important;
            margin:5px 0 6px!important;
            border-radius:9px!important;
            box-shadow:0 4px 12px rgba(7,59,80,.08)!important;
          }
          body.erpInventoryCompact .hero .heroTop{align-items:center!important}
          body.erpInventoryCompact .hero h1{
            font-size:17px!important;
            line-height:1.08!important;
            margin:0 0 2px!important;
          }
          body.erpInventoryCompact .hero p{
            font-size:9.5px!important;
            line-height:1.15!important;
            margin:0!important;
          }
          body.erpInventoryCompact .hero .eyebrow{display:none!important}
          body.erpInventoryCompact .hero .badge{padding:5px 8px!important;font-size:8px!important}
          body.erpInventoryCompact .tabs,
          body.erpInventoryCompact .tabbar,
          body.erpInventoryCompact .subnav,
          body.erpInventoryCompact .toolbar{margin-top:3px!important}

          @media(max-width:680px){
            .hero{padding:10px 12px!important}.hero h1{font-size:18px!important}.hero p{font-size:10px!important}
            body.erpInventoryCompact .hero{padding:7px 10px!important;margin:4px 0 5px!important;border-radius:8px!important}
            body.erpInventoryCompact .hero h1{font-size:15px!important}
            body.erpInventoryCompact .hero p{font-size:9px!important}
          }
        `;
        d.head.appendChild(s);
      }

      const markInventory=()=>{
        const txt=(d.body?.innerText||'').toLowerCase();
        const isInventory=txt.includes('centro de inventario')&&txt.includes('control central de existencias');
        if(isInventory){d.body.classList.add('erpInventoryCompact');return true;}
        return false;
      };

      if(!markInventory()){
        let tries=0;
        const timer=setInterval(()=>{if(markInventory()||++tries>25)clearInterval(timer)},150);
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