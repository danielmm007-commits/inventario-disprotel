(()=>{
  if(window.__evidenciasModalV1)return;window.__evidenciasModalV1=true;
  let modal=null,imagen=null,historyActive=false;
  function crear(){
    if(modal)return;
    modal=document.createElement('div');
    modal.id='visorEvidenciaModal';
    modal.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(8,20,28,.94);display:none;align-items:center;justify-content:center;padding:16px';
    modal.innerHTML='<div style="width:min(960px,100%);max-height:96vh;display:flex;flex-direction:column;gap:10px"><div style="background:#fff;border-radius:14px;padding:8px;display:flex;align-items:center;justify-content:center;min-height:180px;overflow:auto"><img id="visorEvidenciaImg" alt="Evidencia ampliada" style="display:block;max-width:100%;max-height:78vh;object-fit:contain;border-radius:9px"></div><button id="visorEvidenciaCerrar" type="button" style="width:100%;border:0;border-radius:12px;padding:14px;background:#e8eef1;color:#17313d;font-size:16px;font-weight:800">← REGRESAR</button></div>';
    document.body.appendChild(modal);
    imagen=document.getElementById('visorEvidenciaImg');
    document.getElementById('visorEvidenciaCerrar').onclick=cerrar;
    modal.addEventListener('click',e=>{if(e.target===modal)cerrar()});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&abierto()){e.preventDefault();e.stopImmediatePropagation();cerrar()}},true);
  }
  function abierto(){return !!modal&&modal.style.display!=='none'}
  function limpiar(){if(!modal)return;modal.style.display='none';if(imagen)imagen.src='';document.body.style.overflow='';historyActive=false}
  function abrir(src){crear();if(!src)return;imagen.src=src;modal.style.display='flex';document.body.style.overflow='hidden';if(!historyActive){history.pushState({...history.state,__evidenciaModalV1:true},'',location.href);historyActive=true}}
  function cerrar(){if(!abierto())return;if(historyActive&&history.state?.__evidenciaModalV1){history.back();return}limpiar()}
  window.addEventListener('popstate',e=>{if(!abierto())return;e.stopImmediatePropagation();e.stopPropagation();limpiar()},true);
  function preparar(){
    document.querySelectorAll('#accEvidencias img[alt="Evidencia"]').forEach(img=>{
      img.style.cursor='zoom-in';
      img.title='Toca para ampliar';
    });
    document.querySelectorAll('#accEvidencias a').forEach(a=>{
      if((a.textContent||'').trim().toUpperCase()==='VER GRANDE')a.style.display='none';
    });
  }
  document.addEventListener('click',e=>{
    const img=e.target?.closest?.('#accEvidencias img[alt="Evidencia"]');
    if(!img)return;
    e.preventDefault();e.stopImmediatePropagation();
    if(img.src)abrir(img.src);
  },true);
  window.addEventListener('DOMContentLoaded',()=>{
    crear();preparar();
    const acc=document.getElementById('accEvidencias');
    if(acc)new MutationObserver(preparar).observe(acc,{childList:true,subtree:true});
  });
})();