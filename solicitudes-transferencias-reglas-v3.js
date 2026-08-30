(()=>{
  if(window.__disprotelSolicitudesReglasV3)return;window.__disprotelSolicitudesReglasV3=true;
  let tries=0;
  const timer=setInterval(()=>{
    if(!window.__disprotelSolicitudesFlujoV2||!window.applyMode||!window.D){if(++tries>100)clearInterval(timer);return}
    clearInterval(timer);
    const oldApply=window.applyMode;
    window.applyMode=function(){
      oldApply();
      if(!D?.is_technician)return;
      const stock=document.getElementById('stockPanel');if(stock)stock.classList.add('hidden');
      if(mode==='ABASTECIMIENTO'){
        const matriz=(D.locations||[]).find(x=>x.codigo==='UB-001'&&x.permite_stock);
        if(matriz){
          originEl.innerHTML='<option value="'+matriz.id+'">'+esc(matriz.codigo)+' · '+esc(matriz.ubicacion)+'</option>';
          originEl.value=matriz.id;originEl.disabled=true;
          renderChoice();
          const lab=originEl.closest('.field')?.querySelector('label');if(lab)lab.textContent='BODEGA MATRIZ · ORIGEN DEL ABASTECIMIENTO';
        }
      }
    };
    try{applyMode()}catch(e){console.warn('Reglas solicitudes v3:',e)}
  },50);
})();