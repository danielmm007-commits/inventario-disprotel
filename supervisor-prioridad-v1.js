(()=>{
if(window.__supervisorPrioridadV1)return;window.__supervisorPrioridadV1=true;
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
function ses(){try{return JSON.parse(sessionStorage.getItem('disprotel_login_general_v2')||'{}')}catch{return{}}}
function aplicar(){const s=ses(),rol=norm(s.perfil_efectivo?.nombre||s.rol||'');if(!rol.includes('SUPERVISOR'))return;const mods=document.querySelector('.modules');if(!mods)return;const cards=[...mods.querySelectorAll('.module')];const area=cards.find(c=>norm(c.querySelector('h3')?.textContent)==='AREA TECNICA');if(!area)return;if(mods.firstElementChild!==area)mods.insertBefore(area,mods.firstElementChild);const link=area.querySelector('a.btn');if(link){link.href='asignacion-ip.html';link.textContent='Abrir mesa técnica →'}const p=area.querySelector('p');if(p)p.textContent='Mesa operativa de instalaciones: IP, activación ONU, acceso remoto y seguimiento del trabajo en campo.';const ip=cards.find(c=>norm(c.querySelector('h3')?.textContent)==='IP Y ACCESO REMOTO');if(ip&&ip!==area){const l=ip.querySelector('a.btn');if(l)l.href='asignacion-ip.html';const pp=ip.querySelector('p');if(pp)pp.textContent='Acceso secundario a la misma mesa técnica para consulta de IP y acceso remoto.'}}
window.addEventListener('disprotel:permissions-ready',()=>setTimeout(aplicar,0));
const obs=new MutationObserver(()=>requestAnimationFrame(aplicar));
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>{obs.observe(document.body,{childList:true,subtree:true});aplicar()}):(obs.observe(document.body,{childList:true,subtree:true}),aplicar());
[200,600,1200,2500].forEach(ms=>setTimeout(aplicar,ms));
})();
