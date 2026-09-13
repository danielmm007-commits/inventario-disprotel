(()=>{
  document.getElementById('panelBootCover')?.remove();

  if(!document.getElementById('panelAtomicPaint')){
    const st=document.createElement('style');
    st.id='panelAtomicPaint';
    st.textContent='body{visibility:hidden!important}body.panelAtomicReady{visibility:visible!important}';
    document.head.appendChild(st);
  }

  if(!window.__disprotelMenuStartupGuard){
    window.__disprotelMenuStartupGuard=true;
    let startup=true;
    const stopAuto=e=>{
      const btn=e.target?.closest?.('.menuAside button[data-href]');
      if(startup&&btn&&!e.isTrusted){e.preventDefault();e.stopImmediatePropagation()}
    };
    document.addEventListener('click',stopAuto,true);
    const release=()=>{
      if(!startup)return;
      startup=false;
      document.removeEventListener('click',stopAuto,true)
    };
    const mo=new MutationObserver(()=>{
      if(document.body.classList.contains('panelMenu')&&document.querySelectorAll('.menuAside button[data-href]').length){
        mo.disconnect();
        setTimeout(release,800)
      }
    });
    mo.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    setTimeout(()=>{mo.disconnect();release()},5000)
  }

  let stableFrames=0,finished=false;
  const reveal=()=>{
    if(finished)return;
    finished=true;
    document.body.classList.add('panelAtomicReady');
    requestAnimationFrame(()=>document.getElementById('panelAtomicPaint')?.remove())
  };
  const ready=()=>{
    if(!document.body.classList.contains('panelMenu'))return false;
    const shell=document.querySelector('.menuShell');
    const aside=document.querySelector('.menuAside');
    const dash=document.querySelector('.menuDashboard');
    const buttons=aside?.querySelectorAll('button[data-href]');
    if(!shell||!aside||!dash||!buttons?.length)return false;
    const sr=shell.getBoundingClientRect(),ar=aside.getBoundingClientRect(),dr=dash.getBoundingClientRect();
    return sr.width>400&&sr.height>200&&ar.width>60&&ar.height>120&&dr.width>200&&getComputedStyle(aside).display!=='none'&&getComputedStyle(dash).display!=='none'
  };
  const paint=()=>{
    if(finished)return;
    stableFrames=ready()?stableFrames+1:0;
    if(stableFrames>=3)return reveal();
    requestAnimationFrame(paint)
  };
  requestAnimationFrame(paint);
  setTimeout(reveal,4500);

  const v='20260823-2048';
  const map={"Administración de usuarios":"admin-usuarios-visual.html?v="+v,"Perfiles y módulos":"perfiles-modulos-visual.html?v="+v,"Grupos y minibodegas":"grupos-minibodegas-visual.html?v="+v};
  const old=window.pendiente;
  window.pendiente=function(nombre){if(map[nombre]){location.href=map[nombre];return}if(typeof old==='function')return old(nombre)};
  const rutas={"index.html":"modulo-integrado.html?src=index.html&titulo=Inventario","trabajos-tecnicos.html":"trabajos-tecnicos.html?v=20260824-2258","solicitudes-oficina.html":"modulo-integrado.html?src=solicitudes-oficina.html&titulo=Solicitudes","asignacion-ip.html":"modulo-integrado.html?src=asignacion-ip.html&titulo=IP%20y%20acceso%20remoto"};
  document.querySelectorAll('a.btn[href]').forEach(a=>{const h=a.getAttribute('href');if(rutas[h])a.setAttribute('href',rutas[h]+'&v='+v)});
  if(!document.getElementById('supervisorPrioridadScript')){const s=document.createElement('script');s.id='supervisorPrioridadScript';s.src='supervisor-prioridad-v1.js?v=20260907-1640';document.head.appendChild(s)}
  if(!document.getElementById('apoyoInterzonalLoader')){const s=document.createElement('script');s.id='apoyoInterzonalLoader';s.src='apoyo-interzonal-loader-v1.js?v=20260908-0235';document.head.appendChild(s)}
})();