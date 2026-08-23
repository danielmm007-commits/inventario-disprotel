(()=>{
  const BASE=new Set(['ADMINISTRADOR SUPREMO','ADMINISTRADOR','SUPERVISOR TÉCNICO','TÉCNICO','PASANTE / AYUDANTE']);
  const TEMPLATES=['SUPERVISOR TÉCNICO','ADMINISTRADOR','TÉCNICO','PASANTE / AYUDANTE'];
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const same=(a,b)=>String(a||'').trim().toUpperCase()===String(b||'').trim().toUpperCase();

  function isBase(r){return BASE.has(String(r?.[0]||'').trim().toUpperCase())&&!r?.[2]}
  function usedByUsers(name){return (state.users||[]).some(u=>Array.isArray(u)&&same(u[1],name))}

  function syncUserRoleOptions(){
    const sel=document.getElementById('uRole');
    if(!sel)return;
    const current=sel.value;
    const roles=(state.roles||[]).filter(r=>r?.[1]).map(r=>String(r[0]||'').trim()).filter(Boolean);
    sel.innerHTML=[...new Set(roles)].map(n=>`<option>${esc(n)}</option>`).join('');
    if(roles.includes(current))sel.value=current;
  }

  window.renderRoles=function(){
    const box=document.getElementById('rolesList');
    if(!box)return;
    box.innerHTML=(state.roles||[]).map((r,i)=>{
      const base=isBase(r);
      const inUse=usedByUsers(r[0]);
      const buttons=base
        ? `<button class="smallBtn" onclick="toggleRole(${i})">${r[1]?'ACTIVO':'INACTIVO'}</button>`
        : `<div style="display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end"><button class="smallBtn" onclick="toggleRole(${i})">${r[1]?'ACTIVO':'INACTIVO'}</button><button class="smallBtn" onclick="editVisibleRole(${i})">✏️ EDITAR</button><button class="smallBtn" style="color:#a33b46;border-color:#efc4c9" onclick="deleteVisibleRole(${i})" ${inUse?'disabled title="Reasigna primero los usuarios que usan este perfil"':''}>🗑 ELIMINAR</button></div>`;
      const detail=base?'Perfil base del sistema':`Perfil visible · base ${esc(r[2]||'ADMINISTRADOR')}${inUse?' · EN USO':''}`;
      return `<div class="row" style="grid-template-columns:auto 1fr auto"><div class="ico">🛡️</div><div><b>${esc(r[0])}</b><small>${detail}</small></div>${buttons}</div>`;
    }).join('');
    syncUserRoleOptions();
  };

  window.addRole=function(){
    const input=document.getElementById('roleName');
    const base=document.getElementById('roleBase');
    const name=input?.value?.trim();
    if(!name)return;
    if((state.roles||[]).some(r=>same(r[0],name))){try{toast('⚠️ YA EXISTE','Ya existe un perfil con ese nombre.')}catch(e){}return}
    state.roles.push([name,1,base?.value||'ADMINISTRADOR']);
    if(input)input.value='';
    try{save()}catch(e){}
    renderRoles();
    try{toast('✅ PERFIL CREADO',`${name} ya puede usarse en Usuarios.`)}catch(e){}
  };

  window.editVisibleRole=function(i){
    const r=state.roles?.[i];
    if(!r||isBase(r))return;
    const oldName=r[0];
    const newName=prompt('Nombre del perfil:',oldName)?.trim();
    if(!newName)return;
    if((state.roles||[]).some((x,j)=>j!==i&&same(x[0],newName))){try{toast('⚠️ YA EXISTE','Ya existe otro perfil con ese nombre.')}catch(e){}return}
    const menu=TEMPLATES.map((x,n)=>`${n+1}. ${x}`).join('\n');
    const current=Math.max(0,TEMPLATES.findIndex(x=>same(x,r[2])));
    const pick=prompt(`Plantilla base:\n${menu}`,String(current+1));
    if(pick===null)return;
    const base=TEMPLATES[Math.max(0,Math.min(TEMPLATES.length-1,Number(pick)-1))]||r[2]||'ADMINISTRADOR';
    r[0]=newName;
    r[2]=base;
    (state.users||[]).forEach(u=>{if(Array.isArray(u)&&same(u[1],oldName))u[1]=newName});
    try{save()}catch(e){}
    renderRoles();
    if(typeof renderUsers==='function')renderUsers();
    try{toast('✅ PERFIL ACTUALIZADO',`${oldName} → ${newName}`)}catch(e){}
  };

  window.deleteVisibleRole=function(i){
    const r=state.roles?.[i];
    if(!r||isBase(r))return;
    const name=r[0];
    if(usedByUsers(name)){try{toast('🔗 PERFIL EN USO','Reasigna primero los usuarios que tienen este perfil.')}catch(e){}return}
    if(!confirm(`¿Eliminar el perfil “${name}”?`))return;
    state.roles.splice(i,1);
    try{save()}catch(e){}
    renderRoles();
    try{toast('🗑 PERFIL ELIMINADO',name)}catch(e){}
  };

  const originalToggle=window.toggleRole;
  window.toggleRole=function(i){
    if(typeof originalToggle==='function')originalToggle(i);
    else{state.roles[i][1]=state.roles[i][1]?0:1;try{save()}catch(e){};renderRoles()}
    syncUserRoleOptions();
  };

  renderRoles();
})();