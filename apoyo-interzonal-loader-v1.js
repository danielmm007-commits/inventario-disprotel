(()=>{
  function injectInto(win){try{const d=win.document,p=win.location.pathname||'';if(/solicitudes-oficina\.html$/i.test(p)&&!d.getElementById('apoyoInterzonalOficinaScript')){const s=d.createElement('script');s.id='apoyoInterzonalOficinaScript';s.src='apoyo-interzonal-oficina-v1.js?v=20260908-0235';d.head.appendChild(s)}for(const f of d.querySelectorAll('iframe')){try{if(f.contentWindow)injectInto(f.contentWindow)}catch{}}}catch{}}
  function scan(){injectInto(window)}
  window.addEventListener('load',()=>setTimeout(scan,600));setInterval(scan,1200);
})();