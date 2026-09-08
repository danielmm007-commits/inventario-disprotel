(()=>{
if(window.__prioridadTecnicaLocalV3)return;window.__prioridadTecnicaLocalV3=true;
const KEY='disprotel_login_general_v2';
const API='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-alcance-operativo';
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
function ses(){try{return JSON.parse(sessionStorage.getItem(KEY)||'{}')}catch{return{}}}
function territorioDesdeSucursal(v){const s=norm(v);if(s==='LATACUNGA')return'LATACUNGA';if(s==='SAQUISILI')return'SAQUISILÍ';return''}
function localDesdeSesion(){const s=ses(),rol=norm(s.rol),territorio=territorioDesdeSucursal(s.sucursal);return rol==='ADMINISTRADOR'&&territorio?{ok:true,territorio}:null}
let confirmadoBackend=null,consultando=false,autoAbierto=false;
async function resolverBackend(){if(consultando||confirmadoBackend!==null)return confirmadoBackend;const s=ses();if(!s.session_token){confirmadoBackend=false;return false}consultando=true;try{const r=await fetch(API,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_token:s.session_token})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'No se pudo validar alcance');const rol=norm(d.rol),territorio=territorioDesdeSucursal(d.sucursal),a=d.alcance||{};confirmadoBackend=rol==='ADMINISTRADOR'&&territorio&&a.activo!==false&&a.alcance_global!==true?{ok:true,territorio}:false;return confirmadoBackend}catch{confirmadoBackend=false;return false}finally{consultando=false}}
function moverYAbrir(territorio){const aside=document.querySelector('.menuAside');if(!aside)return false;const buttons=[...aside.querySelectorAll('button:not(.erpMenuToggle)')];const tech=buttons.find(b=>/ÁREA TÉCNICA/i.test(b.textContent||''));if(!tech)return false;const first=buttons[0];if(first&&tech!==first)aside.insertBefore(tech,first);tech.dataset.prioridadTecnicaLocal='1';tech.dataset.territorioTecnicoLocal=territorio;const label='Área técnica · '+territorio;const txt=[...tech.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&/ÁREA TÉCNICA/i.test(n.textContent||''));if(txt)txt.textContent=' '+label;else{const span=[...tech.querySelectorAll('span')].find(x=>/ÁREA TÉCNICA/i.test(x.textContent||''));if(span)span.textContent=label;else tech.setAttribute('aria-label',label)}if(!autoAbierto){autoAbierto=true;setTimeout(()=>{try{tech.click()}catch{}},120)}return true}
async function aplicar(){const local=localDesdeSesion();if(local){moverYAbrir(local.territorio);return}const remoto=await resolverBackend();if(remoto)moverYAbrir(remoto.territorio)}
const obs=new MutationObserver(()=>requestAnimationFrame(aplicar));
const iniciar=()=>{obs.observe(document.documentElement,{childList:true,subtree:true});aplicar();[150,400,900,1600].forEach(ms=>setTimeout(aplicar,ms))};
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',iniciar):iniciar();
})();
