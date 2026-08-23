(()=>{
  if(window.__disprotelUsuariosSyncDirecto)return;
  window.__disprotelUsuariosSyncDirecto=true;
  if(!window.state||!Array.isArray(state.users))return;
  const API='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-usuarios-config';
  const session=(()=>{try{return JSON.parse(sessionStorage.getItem('disprotel_login_general_v2')||'null')}catch{return null}})();
  if(!session?.usuario||(!session?.session_token&&!session?.pin))return;
  let syncing=false,ready=false,lastSig='';
  const meta=u=>{if(!u[4]||typeof u[4]!=='object')u[4]={historyCount:0,active:true};return u[4]};
  const headers=()=>({'Content-Type':'application/json','x-user':session.usuario,'x-pin':session.pin||'','x-session':session.session_token||''});
  async function call(body){const r=await fetch(API,{method:'POST',headers:headers(),body:JSON.stringify(body)});const d=await r.json().catch(()=>({error:'Respuesta inválida'}));if(!r.ok||d?.error)throw new Error(d?.error||'No se pudo sincronizar usuarios');return d}
  function payload(){return state.users.map(u=>{const m=meta(u);if(!m.perfil_uid)m.perfil_uid=String(m.cedula||m.id||crypto.randomUUID());return {perfil_uid:m.perfil_uid,nombre:String(u[0]||'').trim(),rol:String(u[1]||'Administrador'),area:String(m.area??u[2]??'').trim(),cedula:String(m.cedula||m.id||'').trim(),correo:String(m.correo||'').trim(),telefono:String(m.telefono||'').trim(),cargo:String(m.cargo||'').trim(),sucursal:String(m.sucursal||'').trim(),bodega_asociada:String(m.bodega_asociada||'').trim(),grupo_operativo:String(m.grupo_operativo||'').trim(),activo:m.active!==false,perfil_extras:{importado_excel:!!m.importado_excel,avatar_style:String(m.avatar_style||'')}}}).filter(x=>x.nombre)}
  const sig=()=>JSON.stringify(payload());
  function inject(){const list=document.getElementById('usersList');if(!list)return null;let d=document.getElementById('usersBackendStatus');if(!d){d=document.createElement('div');d.id='usersBackendStatus';d.style.cssText='margin:0 0 9px;padding:7px 10px;border:1px solid #cfe1ec;border-radius:10px;background:#f3f9fd;color:#496b7e;font-size:8px;font-weight:900;letter-spacing:.02em';const host=list.closest('.card')||list.parentElement;host.insertBefore(d,list)}return d}
  function status(t,ok=true){const d=inject();if(!d)return;d.textContent='USUARIOS · '+t;d.style.color=ok?'#23734e':'#9a4a34';d.style.borderColor=ok?'#bfe1cf':'#efc4ba';d.style.background=ok?'#eff9f3':'#fff4f1'}
  function photoFor(x){const key=String(x.cedula||x.perfil_uid||'');const f=state.users.find(u=>{const m=meta(u);return key&&String(m.cedula||m.perfil_uid||m.id||'')===key});return f?.[3]&&typeof f[3]==='object'?f[3]:{data:'',zoom:1,x:0,y:0,w:1,h:1}}
  function fromBackend(x){const m={historyCount:0,active:x.activo!==false,id:x.cedula||x.perfil_uid||x.id,cedula:x.cedula||'',correo:x.correo_recuperacion||'',telefono:x.telefono||'',cargo:x.cargo||'',area:x.area||'',sucursal:x.sucursal||'',bodega_asociada:x.bodega_asociada||'',grupo_operativo:x.unidad_grupo||'',perfil_uid:x.perfil_uid||x.cedula||x.id,importado_excel:!!x.perfil_extras?.importado_excel,avatar_style:String(x.perfil_extras?.avatar_style||''),backend_id:x.id,perfil_base:x.perfil_base||x.rol};return [x.nombre||'',x.perfil_visible||x.rol||'Administrador',x.area||'',photoFor(x),m]}
  async function sync(force=false){if(syncing||!ready)return;const s=sig();if(!force&&s===lastSig)return;syncing=true;status('GUARDANDO EN SUPABASE…');try{const d=await call({action:'sync',users:payload()});lastSig=sig();status(`GUARDADO EN SUPABASE · ${d.count||0} USUARIO(S)`)}catch(e){status('ERROR DE SINCRONIZACIÓN',false);console.error('Usuarios sync directo:',e)}finally{syncing=false}}
  async function init(){status('CONECTANDO SUPABASE…');try{const d=await call({action:'list'});if(Array.isArray(d.users)&&d.users.length){state.users=d.users.map(fromBackend);try{save();window.renderUsers?.()}catch{}lastSig=sig();ready=true;status(`CARGADOS DESDE SUPABASE · ${d.users.length} USUARIO(S)`)}else{ready=true;lastSig='';if(state.users.length)await sync(true);else status('SIN USUARIOS TODAVÍA')}}catch(e){ready=true;status('ERROR DE CONEXIÓN',false);console.error('Usuarios sync directo:',e)}}
  const oldSave=window.save;if(typeof oldSave==='function')window.save=function(...args){const r=oldSave.apply(this,args);setTimeout(()=>sync(),300);return r};
  setInterval(()=>{if(ready&&!syncing){try{if(sig()!==lastSig)sync()}catch{}}},1200);
  new MutationObserver(inject).observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(init,120);
})();