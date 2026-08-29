(()=>{
if(window.__disprotelInventarioExistenciasLimpiezaV1)return;window.__disprotelInventarioExistenciasLimpiezaV1=true;
const $=id=>document.getElementById(id);
function limpiar(){const card=$('existenciasCard');if(!card)return;const nodes=[...card.querySelectorAll('button,a,.hint,.inventoryHint > *')];for(const el of nodes){const t=String(el.textContent||'').trim().toLowerCase();if(t.includes('inventario inicial')||t.includes('regularización')||t.includes('regularizacion')){if(el.closest('#existenciasCard'))el.remove();}}
 const hint=card.querySelector('.inventoryHint');if(hint&&!hint.children.length)hint.remove();
}
const tab=$('tabExistencias');if(tab)tab.addEventListener('click',()=>setTimeout(limpiar,0));
const obs=new MutationObserver(()=>{if(!$('existenciasCard')?.classList.contains('hidden'))limpiar()});
if($('existenciasCard'))obs.observe($('existenciasCard'),{childList:true,subtree:true});
limpiar();
})();