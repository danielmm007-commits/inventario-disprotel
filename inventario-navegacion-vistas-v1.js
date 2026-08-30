(()=>{
if(window.__disprotelInventarioNavegacionVistasV1)return;window.__disprotelInventarioNavegacionVistasV1=true;
const $=id=>document.getElementById(id);
const cards=['existenciasCard','cargaCard','moverCard','cantCard','ajusteCard','serialesCard','catalogoCard','costosCard','inventarioInicialCard'];
function applyCostosLayout(){
  if($('inventarioCostosInlineStyle'))return;
  const s=document.createElement('style');s.id='inventarioCostosInlineStyle';s.textContent=`
    #costosCard.catalogModal{position:static!important;inset:auto!important;z-index:auto!important;margin-bottom:15px!important;padding:20px!important;border-radius:18px!important;background:#fff!important;overflow:visible!important;box-shadow:0 9px 26px #092b5c0d!important}
    #costosCard.catalogModal>.catalogModalPanel{max-width:none!important;margin:0!important;background:transparent!important;border-radius:0!important;padding:0!important;box-shadow:none!important}
    #costosCard .catalogModalClose{display:none!important}
    #costosCard .catalogModalHead{align-items:flex-start!important}
    @media(max-width:700px){#costosCard.catalogModal{padding:15px!important}#costosCard .catalogModalActions{width:100%!important;display:grid!important;grid-template-columns:1fr!important}}
  `;document.head.appendChild(s);
}
function hideCards(){cards.forEach(id=>$(id)?.classList.add('hidden'))}
function clearTabs(){document.querySelectorAll('.tabs .tab').forEach(x=>x.classList.remove('active'))}
function targetFor(tab){
  if(!tab)return null;
  if(tab.id==='tabExistencias')return 'existenciasCard';
  if(tab.id==='tabCarga')return $('inventarioInicialCard')?'inventarioInicialCard':'cargaCard';
  if(tab.id==='tabMover')return $('serialesCard')?'serialesCard':'moverCard';
  if(tab.id==='tabCant')return 'cantCard';
  if(tab.id==='tabAjuste')return 'ajusteCard';
  if(tab.id==='tabCatalogo')return 'catalogoCard';
  if(tab.id==='tabCostos')return 'costosCard';
  return null;
}
function enforce(tab){
  const id=targetFor(tab);if(!id)return;
  applyCostosLayout();hideCards();clearTabs();
  tab.classList.add('active');$(id)?.classList.remove('hidden');
  document.body.style.overflow='';
}
document.addEventListener('click',e=>{
  const tab=e.target.closest('.tabs .tab');
  if(!tab||!targetFor(tab))return;
  setTimeout(()=>enforce(tab),0);
},false);
function repair(){
  applyCostosLayout();
  const active=document.querySelector('.tabs .tab.active');
  if(active&&targetFor(active))enforce(active);
}
setTimeout(repair,300);
})();