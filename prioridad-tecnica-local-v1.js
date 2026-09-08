(()=>{
if(window.__prioridadTecnicaLocalV2)return;window.__prioridadTecnicaLocalV2=true;
const KEY='disprotel_login_general_v2';
const API='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-alcance-operativo';
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
function ses(){try{return JSON.parse(sessionStorage.getItem(KEY)||'{}')}catch{return{}}}
function localDesdeSesion(){const s=ses(),rol=norm(s.rol),suc=norm(s.sucursal);return rol==='ADMINISTRADOR'&&(suc==='LATACUNGA'||suc==='SAQUISILI')}
let confirmadoBackend=null,consultando=false,autoAbierto=false;
async function resolverBackend(){if(consultando||confirmadoBackend!==null)return confirmadoBackend;const s=ses();if(!s.session_token){confirmadoBackend=false;return false}consultando=true;try{const r=await fetch(API,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_token:s.session_token})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'No se pudo validar alcance');const rol=norm(d.rol),suc=norm(d.sucursal),a=d.alcance||{};confirmadoBackend=rol==='ADMINISTRADOR'&&(suc==='LATACUNGA'||suc==='SAQUISILI')&&a.activo!==false&&a.alcance_global!==true;return confirmadoBackend}catch{confirmadoBackend=false;return false}finally{consultando=false}}
function moverYAbrir(){const aside=document.querySelector('.menuAside');if(!aside)return false;const buttons=[...aside.querySelectorAll('button:not(.erpMenuToggle)')];const tech=buttons.find(b=>/ÁREA TÉCNICA/i.test(b.textContent||''));if(!tech)return false;const first=buttons[0];if(first&&tech!==first)aside.insertBefore(tech,first);tech.dataset.prioridadTecnicaLocal='1';if(!autoAbierto){autoAbierto=true;setTimeout(()=>{try{tech.click()}catch{}},120)}return true}
async function aplicar(){if(localDesdeSesion()){moverYAbrir();return}if(await resolverBackend())moverYAbrir()}
const obs=new MutationObserver(()=>requestAnimationFrame(aplicar));
const iniciar=()=>{obs.observe(document.documentElement,{childList:true,subtree:true});aplicar();[150,400,900,1600].forEach(ms=>setTimeout(aplicar,ms))};
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',iniciar):iniciar();
})();
