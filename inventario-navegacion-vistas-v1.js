(()=>{
if(window.__disprotelInventarioNavegacionVistasV1)return;window.__disprotelInventarioNavegacionVistasV1=true;
const $=id=>document.getElementById(id);
const cards=['existenciasCard','cargaCard','moverCard','cantCard','ajusteCard','serialesCard','catalogoCard','inventarioInicialCard'];
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
  return null;
}
function enforce(tab){
  const id=targetFor(tab);if(!id)return;
  hideCards();clearTabs();
  tab.classList.add('active');$(id)?.classList.remove('hidden');
  const adm=$('costosCard');if(adm){adm.classList.add('hidden');document.body.style.overflow=''}
}
document.addEventListener('click',e=>{
  const tab=e.target.closest('.tabs .tab');
  if(!tab||tab.id==='tabCostos')return;
  if(!targetFor(tab))return;
  setTimeout(()=>enforce(tab),0);
},false);
function repair(){
  const active=document.querySelector('.tabs .tab.active');
  if(active&&targetFor(active))enforce(active);
}
setTimeout(repair,300);
})();