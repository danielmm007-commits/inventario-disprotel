(()=>{
function aplicar(){
  const cont=document.getElementById('contenido');if(!cont)return;
  document.querySelectorAll('.evidenceGrid .evCard').forEach(card=>{
    const cap=card.querySelector('.evCap');
    if(!cap)return;
    const txt=(cap.textContent||'').trim().toUpperCase().replace(/\s+/g,' ');
    if(txt.includes('ACCESO REMOTO')||txt.includes('ACCESO_REMOTO')){
      card.classList.add('evAccesoConfirmado');
      cap.textContent='✅ ACCESO REMOTO CONFIRMADO';
    }
  });
  document.querySelectorAll('.idGrid').forEach(grid=>{
    if(grid.previousElementSibling?.classList?.contains('docIdentidadTitle'))return;
    const t=document.createElement('div');t.className='docIdentidadTitle';t.textContent='🪪 CÉDULA / DOCUMENTO DE IDENTIDAD';grid.parentNode.insertBefore(t,grid);
  });
  if(!document.getElementById('validacionVisualCss')){
    const s=document.createElement('style');s.id='validacionVisualCss';s.textContent='.evAccesoConfirmado{border:2px solid #2ca55a!important;background:#f2fbf5!important;box-shadow:0 0 0 1px rgba(44,165,90,.08)!important}.evAccesoConfirmado .evCap{background:#2ca55a!important;color:#fff!important}.docIdentidadTitle{font-size:7.4px;font-weight:900;color:#173b70;margin:0 0 1.4mm 0;padding-bottom:1mm;border-bottom:1px solid #d9e3ea;grid-column:1/-1}.serviceGrid>div:has(.idGrid){align-self:start}';document.head.appendChild(s)
  }
  if(typeof ajustarHojaA4==='function')setTimeout(ajustarHojaA4,50);
}
const ob=new MutationObserver(()=>requestAnimationFrame(aplicar));
window.addEventListener('DOMContentLoaded',()=>{const c=document.getElementById('contenido');if(c)ob.observe(c,{childList:true,subtree:true});setTimeout(aplicar,450)});
window.addEventListener('load',()=>setTimeout(aplicar,700));
})();