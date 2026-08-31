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

      const stock=document.getElementById('stockPanel');
      if(stock)stock.classList.add('hidden');

      const supply=document.getElementById('supplyAction');
      const direct=document.getElementById('directAction');
      const baja=document.getElementById('bajaAction');
      if(baja)baja.style.removeProperty('display');

      if(mode!=='ABASTECIMIENTO')return;

      if(supply){
        const t=supply.querySelector('strong'),s=supply.querySelector('span');
        if(t)t.textContent='Abastecimientos y transferencias recibidas';
        if(s)s.textContent='Registra lo retirado para tu bodega y acepta transferencias que te envían.';
      }
      if(direct){
        const t=direct.querySelector('strong');
        if(t)t.textContent='Transferir desde mi bodega';
      }
      if(baja){
        const t=baja.querySelector('strong');
        if(t)t.textContent='Solicitar baja de mi inventario';
      }

      const incoming=document.getElementById('incomingPanel');
      const req=document.getElementById('reqPanel');
      const history=document.getElementById('transferHistory')?.closest('.panel');
      incoming?.classList.remove('hidden');
      req?.classList.remove('hidden');
      history?.classList.remove('hidden');

      const setTitle=(panel,title,sub)=>{if(!panel)return;const h=panel.querySelector('h2'),p=panel.querySelector('.sub');if(h)h.textContent=title;if(p)p.textContent=sub};
      setTitle(incoming,'📥 Transferencias recibidas pendientes de aceptar','Aquí aparecen únicamente transferencias que otro técnico envió hacia tu bodega.');
      setTitle(req,'📋 Mis abastecimientos pendientes de confirmación','Solo tus abastecimientos que Administración todavía no ha confirmado.');
      setTitle(history,'🧾 Historial de abastecimientos y transferencias recibidas','Abastecimientos que registraste y transferencias directas que recibiste.');

      const historyType=document.getElementById('historyType');
      if(historyType)historyType.classList.remove('hidden');
      const historyLocation=document.getElementById('historyLocation');
      if(historyLocation?.options?.length)historyLocation.options[0].textContent='Todas las bodegas involucradas';

      const locations=D.locations||[];
      const matriz=locations.find(x=>String(x.codigo||x.codigo_ubicacion||x.code||'').toUpperCase()==='UB-001')
        || locations.find(x=>/BODEGA MATRIZ/i.test(String(x.ubicacion||x.nombre||'')));
      if(matriz){
        const codigo=matriz.codigo||matriz.codigo_ubicacion||'UB-001';
        const nombre=matriz.ubicacion||matriz.nombre||'BODEGA MATRIZ';
        originEl.innerHTML='<option value="'+esc(matriz.id)+'">'+esc(codigo)+' · '+esc(nombre)+'</option>';
        originEl.value=matriz.id;
        originEl.disabled=true;
        const lab=originEl.closest('.field')?.querySelector('label');
        if(lab)lab.textContent='BODEGA MATRIZ · ORIGEN DEL ABASTECIMIENTO';
        if(typeof renderChoice==='function')renderChoice();
      }
    };
    try{applyMode()}catch(e){console.warn('Reglas solicitudes v3:',e)}
  },50);
})();