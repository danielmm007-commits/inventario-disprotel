(()=>{
if(window.__prioridadTecnicaLocalV1)return;window.__prioridadTecnicaLocalV1=true;
const KEY='disprotel_login_general_v2';
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
function ses(){try{return JSON.parse(sessionStorage.getItem(KEY)||'{}')}catch{return{}}}
function esAdminOperativoLocal(){const s=ses(),rol=norm(s.rol),suc=norm(s.sucursal);return rol==='ADMINISTRADOR'&&(suc==='LATACUNGA'||suc==='SAQUISILI')}
let autoAbierto=false;
function aplicar(){if(!esAdminOperativoLocal())return;const aside=document.querySelector('.menuAside');if(!aside)return;const buttons=[...aside.querySelectorAll('button:not(.erpMenuToggle)')];const tech=buttons.find(b=>/ÁREA TÉCNICA/i.test(b.textContent||''));if(!tech)return;const first=buttons[0];if(first&&tech!==first)aside.insertBefore(tech,first);tech.dataset.prioridadTecnicaLocal='1';if(!autoAbierto){autoAbierto=true;setTimeout(()=>{try{tech.click()}catch{}},120)}}
const obs=new MutationObserver(()=>requestAnimationFrame(aplicar));
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>{obs.observe(document.documentElement,{childList:true,subtree:true});aplicar()}):(obs.observe(document.documentElement,{childList:true,subtree:true}),aplicar());
[150,400,900,1600].forEach(ms=>setTimeout(aplicar,ms));
})();
