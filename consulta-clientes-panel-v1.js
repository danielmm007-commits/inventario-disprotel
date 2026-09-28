(()=>{if(window.__consultaClientesPanelV1)return;window.__consultaClientesPanelV1=true;
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
function session(){try{return JSON.parse(sessionStorage.getItem('disprotel_login_general_v2')||'{}')}catch{return{}}}
function permitido(me){const r=norm(me?.rol);return me?.es_admin_principal===true||r==='ADMINISTRADOR SUPREMO'||r==='ADMINISTRADOR'||r==='SUPERVISOR TECNICO'||r==='TECNICO'}
function aplicar(){
 const me=session();if(!permitido(me))return;
 const mods=document.querySelector('.modules');if(!mods)return;
 if([...mods.querySelectorAll('.module h3')].some(h=>norm(h.textContent)==='CONSULTA DE CLIENTES'))return;
 const card=document.createElement('article');card.className='module';card.dataset.consultaClientes='1';
 card.innerHTML='<div class="mhead"><div class="ico">🔎</div><h3>Consulta de clientes</h3></div><p>Ficha técnica del servicio con MikroTik, SmartOLT/ONT, acceso remoto, equipos registrados y últimos trabajos.</p><a class="btn" href="consulta-clientes.html">Abrir consulta →</a>';
 const area=[...mods.querySelectorAll('.module')].find(x=>norm(x.querySelector('h3')?.textContent)==='AREA TECNICA');
 if(area?.nextSibling)mods.insertBefore(card,area.nextSibling);else mods.prepend(card);
}
document.addEventListener('DOMContentLoaded',()=>{aplicar();setTimeout(aplicar,700);setTimeout(aplicar,1800)});
window.addEventListener('disprotel:permissions-ready',aplicar);
})();