(()=>{
  let modal=null, imagen=null;
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
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.style.display!=='none')cerrar()});
  }
  function abrir(src){crear();imagen.src=src;modal.style.display='flex';document.body.style.overflow='hidden'}
  function cerrar(){if(!modal)return;modal.style.display='none';if(imagen)imagen.src='';document.body.style.overflow=''}
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
    e.preventDefault();e.stopPropagation();
    if(img.src)abrir(img.src);
  },true);
  window.addEventListener('DOMContentLoaded',()=>{
    crear();preparar();
    const acc=document.getElementById('accEvidencias');
    if(acc)new MutationObserver(preparar).observe(acc,{childList:true,subtree:true});
  });
})();