(()=>{
  if(!window.state||!Array.isArray(state.users))return;
  const API='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-usuarios-config';
  const session=(()=>{try{return JSON.parse(sessionStorage.getItem('disprotel_login_general_v2')||'null')}catch{return null}})();
  if(!session?.usuario||!session?.pin)return;
  let ready=false,syncing=false,timer=null,lastSig='';
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function headers(){return {'Content-Type':'application/json','x-user':session.usuario,'x-pin':session.pin}}
  async function call(body){const r=await fetch(API,{method:'POST',headers:headers(),body:JSON.stringify(body)});const d=await r.json().catch(()=>({error:'Respuesta inválida'}));if(!r.ok||d?.error)throw new Error(d?.error||'No se pudo sincronizar usuarios');return d}
  function uiRole(r){const x=String(r||'').toUpperCase();if(x.includes('SUPREMO'))return'Administrador Supremo';if(x.includes('SUPERVISOR'))return'Supervisor Técnico';if(x.includes('PASANTE')||x.includes('AYUDANTE'))return'Pasante / Ayudante';if(x.includes('TÉCNICO')||x.includes('TECNICO'))return'Técnico';return'Administrador'}
  function meta(u){if(!u[4]||typeof u[4]!=='object')u[4]={historyCount:0,active:true};return u[4]}
  function ensureUid(u){const m=meta(u);if(!m.perfil_uid)m.perfil_uid=String(m.cedula||m.id||crypto.randomUUID());return m.perfil_uid}
  function payload(){return state.users.map(u=>{const m=meta(u);return {perfil_uid:ensureUid(u),nombre:String(u[0]||'').trim(),rol:String(u[1]||'Administrador'),area:String(m.area??u[2]??'').trim(),cedula:String(m.cedula||m.id||'').trim(),correo:String(m.correo||'').trim(),telefono:String(m.telefono||'').trim(),cargo:String(m.cargo||'').trim(),sucursal:String(m.sucursal||'').trim(),bodega_asociada:String(m.bodega_asociada||'').trim(),grupo_operativo:String(m.grupo_operativo||'').trim(),activo:m.active!==false,perfil_extras:{importado_excel:!!m.importado_excel}}}).filter(x=>x.nombre)}
  function signature(){return JSON.stringify(payload())}
  function injectStatus(){const list=document.getElementById('usersList');if(!list||document.getElementById('usersBackendStatus'))return;const d=document.createElement('div');d.id='usersBackendStatus';d.style.cssText='margin:0 0 9px;padding:7px 10px;border:1px solid #cfe1ec;border-radius:10px;background:#f3f9fd;color:#496b7e;font-size:8px;font-weight:900;letter-spacing:.02em';d.textContent='USUARIOS · CONECTANDO SUPABASE…';const host=list.closest('.card')||list.parentElement;host.insertBefore(d,list)}
  function status(t,ok=true){injectStatus();const d=document.getElementById('usersBackendStatus');if(!d)return;d.textContent='USUARIOS · '+t;d.style.color=ok?'#23734e':'#9a4a34';d.style.borderColor=ok?'#bfe1cf':'#efc4ba';d.style.background=ok?'#eff9f3':'#fff4f1'}
  function currentPhotoFor(x){const key=String(x.cedula||x.perfil_uid||'');const found=state.users.find(u=>{const m=meta(u);return key&&String(m.cedula||m.perfil_uid||m.id||'')===key})||state.users.find(u=>String(u[0]||'').trim().toLowerCase()===String(x.nombre||'').trim().toLowerCase());return found?.[3]&&typeof found[3]==='object'?found[3]:{data:'',zoom:1,x:0,y:0,w:1,h:1}}
  function fromBackend(x){const m={historyCount:0,active:x.activo!==false,id:x.cedula||x.perfil_uid||x.id,cedula:x.cedula||'',correo:x.correo_recuperacion||'',telefono:x.telefono||'',cargo:x.cargo||'',area:x.area||'',sucursal:x.sucursal||'',bodega_asociada:x.bodega_asociada||'',grupo_operativo:x.unidad_grupo||'',perfil_uid:x.perfil_uid||x.cedula||x.id,importado_excel:!!x.perfil_extras?.importado_excel,backend_id:x.id};return [x.nombre||'',uiRole(x.rol),x.area||'',currentPhotoFor(x),m]}
  async function syncNow(force=false){if(!ready||syncing)return;const sig=signature();if(!force&&sig===lastSig)return;syncing=true;status('GUARDANDO EN SUPABASE…');try{const d=await call({action:'sync',users:payload()});lastSig=sig;status(`GUARDADO EN SUPABASE · ${d.count||0} USUARIO(S)`)}catch(e){status('PENDIENTE DE SINCRONIZAR',false);console.warn('Usuarios backend:',e)}finally{syncing=false}}
  function schedule(){clearTimeout(timer);timer=setTimeout(()=>syncNow(),550)}
  async function init(){injectStatus();status('CONECTANDO SUPABASE…');try{const d=await call({action:'list'});if(Array.isArray(d.users)&&d.users.length){state.users=d.users.map(fromBackend);try{save();window.renderUsers?.()}catch(e){}ready=true;lastSig=signature();status(`CARGADOS DESDE SUPABASE · ${d.users.length} USUARIO(S)`)}else{ready=true;lastSig='';if(state.users.length)await syncNow(true);else status('SIN USUARIOS TODAVÍA')} }catch(e){ready=true;status('MODO LOCAL · SIN CONEXIÓN',false);console.warn('Usuarios backend:',e)}
  const oldSave=window.save;
  if(typeof oldSave==='function'){window.save=function(...args){const r=oldSave.apply(this,args);if(ready)schedule();return r}}
  setInterval(()=>{if(!ready||syncing)return;let sig='';try{sig=signature()}catch{return}if(sig!==lastSig)schedule()},900);
  new MutationObserver(injectStatus).observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(init,80);
})();