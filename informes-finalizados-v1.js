(()=>{
if(window.__informesFinalizadosV1)return;window.__informesFinalizadosV1=true;
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
function decorar(frame){
  try{
    const w=frame.contentWindow,d=frame.contentDocument;
    if(!w||!d||!/trabajos-tecnicos\.html/i.test(w.location.pathname||''))return;
    const run=()=>{
      let hist=[];
      try{hist=w.eval('HISTORY_JOBS')}catch{}
      if(!Array.isArray(hist))return;
      const map=new Map(hist.map(o=>[norm(o.id_orden),o]));
      d.querySelectorAll('#historial .job').forEach(card=>{
        if(card.querySelector('.verInformeFinal'))return;
        const key=norm(card.querySelector('.orderId')?.textContent||'');
        const o=map.get(key);
        const tipo=norm(o?.tipo_trabajo),estado=norm(o?.estado);
        if(!o?.id||estado!=='COMPLETADA'||!tipo.startsWith('INSTALACION'))return;
        const b=d.createElement('button');
        b.type='button';
        b.className='secondary verInformeFinal';
        b.textContent='📄 VER INFORME';
        b.style.marginTop='10px';
        b.onclick=()=>{w.location.href='reporte-trabajo.html?orden='+encodeURIComponent(o.id)};
        card.appendChild(b);
      });
    };
    run();
    if(frame.dataset.informesObs==='1')return;
    frame.dataset.informesObs='1';
    let tm=null;
    new w.MutationObserver(()=>{clearTimeout(tm);tm=setTimeout(run,120)}).observe(d.body,{childList:true,subtree:true});
  }catch{}
}
function enganchar(){
  document.querySelectorAll('iframe').forEach(f=>{
    if(!f.dataset.informesLoad){f.dataset.informesLoad='1';f.addEventListener('load',()=>setTimeout(()=>decorar(f),180))}
    decorar(f);
  });
}
new MutationObserver(enganchar).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('DOMContentLoaded',enganchar);
setTimeout(enganchar,400);
})();
