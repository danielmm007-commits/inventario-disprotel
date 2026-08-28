(()=>{
  if(window.__disprotelErpSidebarV1)return;window.__disprotelErpSidebarV1=true;
  const root=document.documentElement;
  const mq=window.matchMedia('(max-width:680px)');
  function install(){
    const aside=document.querySelector('.menuAside');
    const shell=document.querySelector('.menuShell');
    if(!aside||!shell)return false;
    document.body.classList.add('erpSidebarReady');
    let title=aside.querySelector('.sideTitle');
    if(title&&!title.querySelector('.erpMenuToggle')){
      const btn=document.createElement('button');
      btn.type='button';btn.className='erpMenuToggle';btn.setAttribute('aria-label','Abrir o compactar navegación');btn.title='Abrir / compactar menú';btn.innerHTML='<span>☰</span>';
      title.appendChild(btn);
      btn.addEventListener('click',e=>{e.stopPropagation();
        if(mq.matches){document.body.classList.toggle('erpMobileMenuOpen');}
        else{
          const pinned=document.body.classList.toggle('erpSidebarPinned');
          localStorage.setItem('disprotel_sidebar_pinned',pinned?'1':'0');
        }
      });
    }
    if(!mq.matches&&localStorage.getItem('disprotel_sidebar_pinned')==='1')document.body.classList.add('erpSidebarPinned');
    aside.addEventListener('mouseenter',()=>{if(!mq.matches)document.body.classList.add('erpSidebarHover')});
    aside.addEventListener('mouseleave',()=>document.body.classList.remove('erpSidebarHover'));
    aside.querySelectorAll('button:not(.erpMenuToggle)').forEach(b=>b.addEventListener('click',()=>{if(mq.matches)document.body.classList.remove('erpMobileMenuOpen')}));
    return true;
  }
  let n=0;const t=setInterval(()=>{if(install()||++n>40)clearInterval(t)},150);
  window.addEventListener('resize',()=>{if(!mq.matches)document.body.classList.remove('erpMobileMenuOpen')});

  function compactFrame(frame){
    try{
      const d=frame.contentDocument;if(!d||d.getElementById('erpCompactInjected'))return;
      const s=d.createElement('style');s.id='erpCompactInjected';s.textContent=`
        .hero{padding:12px 18px!important;min-height:0!important;border-radius:10px!important;margin-bottom:8px!important}
        .hero h1{font-size:22px!important;margin:2px 0 3px!important}.hero p{font-size:11px!important;margin:0!important;line-height:1.3!important}.eyebrow{font-size:8px!important;margin-bottom:2px!important}
        .statusBar,.connectionBar,.onlineBar,.supabaseStatus{min-height:28px!important;padding:5px 10px!important;margin-bottom:6px!important;font-size:8px!important;border-radius:7px!important}
        .pageHeader,.moduleHeader,.innerHeader{padding-top:7px!important;padding-bottom:7px!important;min-height:0!important}
        .tabs,.tabbar,.subnav,.toolbar{margin-top:6px!important;margin-bottom:6px!important;gap:6px!important}.tabs button,.tabbar button,.subnav button,.toolbar button{min-height:34px!important;padding:7px 10px!important;font-size:10px!important;border-radius:7px!important}
        .main,.content,.container{padding-top:8px!important}.sectionTitle{margin-top:12px!important}
        @media(max-width:680px){.hero{padding:10px 12px!important}.hero h1{font-size:18px!important}.hero p{font-size:10px!important}}
      `;d.head.appendChild(s);
    }catch(e){}
  }
  const obs=new MutationObserver(()=>document.querySelectorAll('iframe.menuFrame').forEach(f=>{f.addEventListener('load',()=>compactFrame(f),{once:false});compactFrame(f)}));
  obs.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>document.querySelectorAll('iframe.menuFrame').forEach(f=>{f.addEventListener('load',()=>compactFrame(f));compactFrame(f)}),800);
})();