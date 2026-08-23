(()=>{
  if(!window.state)return;
  const KEY='disprotel_grupos_responsables_v3';
  let editing={};
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function users(){
    return (state.users||[]).map((u,i)=>{
      if(Array.isArray(u)){
        const m=u[4]&&typeof u[4]==='object'?u[4]:{};
        return {id:String(m.id||m.userId||m.usuario||u[0]||i),name:String(u[0]||''),role:String(u[1]||''),raw:u};
      }
      return {id:String(u.id||u.user_id||u.usuario||u.nombre||u.name||i),name:String(u.nombre||u.name||u.usuario||''),role:String(u.rol||u.role||''),raw:u};
    }).filter(u=>u.name);
  }
  function load(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){return {}}}
  function saveMap(map){try{localStorage.setItem(KEY,JSON.stringify(map))}catch(e){}
    state.opsGroupMembers={};
    Object.values(map).forEach(r=>{if(r&&r.name)state.opsGroupMembers[r.name]=[...(r.people||[])]});
    const membership=new Map();Object.values(map).forEach(r=>(r?.people||[]).forEach(id=>membership.set(String(id),r.name)));
    users().forEach(u=>{
      const g=membership.get(String(u.id))||'';
      if(Array.isArray(u.raw)){u.raw[4]=u.raw[4]&&typeof u.raw[4]==='object'?u.raw[4]:{};u.raw[4].grupo_operativo=g;}
      else if(u.raw&&typeof u.raw==='object')u.raw.grupo_operativo=g;
    });
    try{save()}catch(e){}
  }
  function row(group){const map=load(),id='GRUPO::'+group;return map[id]||{id,name:group,people:[],confirmed:false}}
  function usedElsewhere(group){const used=new Set();Object.values(load()).forEach(r=>{if(!r||r.name===group)return;(r.people||[]).forEach(id=>used.add(String(id)))});return used}
  function names(ids){const m=new Map(users().map(u=>[String(u.id),u.name]));return (ids||[]).map(id=>m.get(String(id))).filter(Boolean)}
  function card(group){return [...document.querySelectorAll('.opCard')].find(c=>{const t=c.querySelector('.opHead b')?.textContent?.trim()||'',s=c.querySelector('.opHead small')?.textContent||'';return t===String(group).trim()&&/usuario\(s\) asignado/i.test(s)})}
  function css(){if(document.getElementById('grp-habitual-v7-style'))return;const s=document.createElement('style');s.id='grp-habitual-v7-style';s.textContent=`
    .grpHabitualV7{position:relative;z-index:8;margin-top:9px;padding:10px;border-radius:11px;border:1px solid #d6e5ee;background:#f9fcfe}
    .grpV7Top{display:flex;align-items:center;justify-content:space-between;gap:8px}.grpV7Top b{font-size:8px;color:#16436f}.grpV7Status{font-size:7px;font-weight:900;padding:5px 7px;border-radius:999px;background:#eaf8ef;border:1px solid #cbead7;color:#23734e}
    .grpV7Names{margin-top:7px;padding:8px;border-radius:8px;background:#fff;border:1px solid #e0eaf0;font-size:8px;color:#244f70}.grpV7Names strong{display:block;font-size:6px;color:#70838e;margin-bottom:3px}.grpV7Empty{color:#8b5b15}
    .grpV7Actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;margin-top:8px}.grpV7Btn{border:1px solid #bdd8e8;background:#fff;color:#185f99;border-radius:8px;padding:7px 9px;font-size:7px;font-weight:900;cursor:pointer;transition:transform .12s ease,box-shadow .16s ease}.grpV7Btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 5px 12px rgba(11,42,92,.12)}.grpV7Btn:active:not(:disabled){transform:translateY(1px) scale(.96)}.grpV7Btn.primary{background:linear-gradient(135deg,#0e67b4,#2189da);border-color:#0e67b4;color:#fff}.grpV7Btn.danger{color:#a33b46;border-color:#efc4c9}.grpV7Btn:disabled{opacity:.4;cursor:not-allowed}
    .grpV7People{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;margin-top:7px;max-height:180px;overflow:auto}.grpV7Person{display:flex;align-items:center;gap:6px;padding:7px;border-radius:8px;border:1px solid #dce8ef;background:#fff;font-size:7px;cursor:pointer;transition:.15s}.grpV7Person:hover{border-color:#8cc7eb;transform:translateX(2px)}.grpV7Person.on{background:#eaf6ff;border-color:#69afe2}.grpV7Person input{accent-color:#1f75d8}.grpV7Hint{font-size:7px;color:#6f8491;margin-top:6px}
    @media(max-width:800px){.grpV7People{grid-template-columns:1fr}}
  `;document.head.appendChild(s)}
  function editor(group,mode){const r=row(group),current=new Set((r.people||[]).map(String)),used=usedElsewhere(group);const available=users().filter(u=>current.has(String(u.id))||!used.has(String(u.id)));
    if(!available.length)return '<div class="grpV7Hint">No hay usuarios disponibles para asignar a este grupo.</div>';
    return `<div class="grpV7People">${available.map(u=>{const on=current.has(String(u.id));return `<label class="grpV7Person ${on?'on':''}"><input type="checkbox" value="${esc(u.id)}" ${on?'checked':''}><span><b>${esc(u.name)}</b>${u.role?` · ${esc(u.role)}`:''}</span></label>`}).join('')}</div><div class="grpV7Hint">Cada usuario puede pertenecer habitualmente a un solo grupo. Los usuarios asignados a otro grupo no aparecen aquí. Las rotaciones temporales se harán desde Inicio de Jornada.</div><div class="grpV7Actions"><button class="grpV7Btn" data-gv7-cancel="${esc(group)}">CANCELAR</button><button class="grpV7Btn primary" data-gv7-save="${esc(group)}">💾 GUARDAR INTEGRANTES</button></div>`}
  function view(group){const r=row(group),ps=names(r.people),has=ps.length>0;return `<div class="grpV7Top"><b>INTEGRANTES HABITUALES DEL GRUPO</b><span class="grpV7Status">${has?'✓ CONFIGURADO':'POR DEFINIR'}</span></div><div class="grpV7Names"><strong>PERSONAS ASIGNADAS</strong><span class="${has?'':'grpV7Empty'}">${esc(has?ps.join(' + '):'Ninguna persona asignada')}</span></div><div class="grpV7Actions"><button class="grpV7Btn primary" data-gv7-add="${esc(group)}">➕ AGREGAR INTEGRANTE</button><button class="grpV7Btn" data-gv7-edit="${esc(group)}" ${has?'':'disabled'}>✏️ MODIFICAR</button><button class="grpV7Btn danger" data-gv7-clear="${esc(group)}" ${has?'':'disabled'}>🗑 ELIMINAR</button></div>`}
  function decorate(){css();(state.groups||[]).forEach(group=>{const c=card(group);if(!c)return;c.querySelector('.grpCfg')?.remove();c.querySelector('.grpHabitualV7')?.remove();const b=document.createElement('div');b.className='grpHabitualV7';b.innerHTML=editing[group]?`<div class="grpV7Top"><b>${editing[group]==='add'?'AGREGAR INTEGRANTE':'MODIFICAR INTEGRANTES'}</b><span class="grpV7Status">EDICIÓN</span></div>${editor(group,editing[group])}`:view(group);const a=c.querySelector('.opActions');a?c.insertBefore(b,a):c.appendChild(b)})}
  document.addEventListener('change',e=>{const ch=e.target.closest?.('.grpV7Person input');if(ch)ch.closest('.grpV7Person')?.classList.toggle('on',ch.checked)});
  document.addEventListener('click',e=>{
    let b=e.target.closest?.('[data-gv7-add]');if(b){editing[b.dataset.gv7Add]='add';decorate();return}
    b=e.target.closest?.('[data-gv7-edit]');if(b){editing[b.dataset.gv7Edit]='edit';decorate();return}
    b=e.target.closest?.('[data-gv7-cancel]');if(b){delete editing[b.dataset.gv7Cancel];decorate();return}
    b=e.target.closest?.('[data-gv7-clear]');if(b){const g=b.dataset.gv7Clear,map=load(),id='GRUPO::'+g;map[id]={id,name:g,people:[],confirmed:true,updatedAt:new Date().toISOString()};saveMap(map);decorate();try{toast('✅ INTEGRANTES ELIMINADOS','Los usuarios vuelven a estar disponibles para otros grupos.')}catch(e){}return}
    b=e.target.closest?.('[data-gv7-save]');if(b){const g=b.dataset.gv7Save,box=b.closest('.grpHabitualV7'),people=[...box.querySelectorAll('.grpV7Person input:checked')].map(x=>x.value);if(!people.length){try{toast('⚠️ FALTAN INTEGRANTES','Selecciona al menos una persona para el grupo.')}catch(e){}return}const used=usedElsewhere(g),dup=people.find(id=>used.has(String(id)));if(dup){try{toast('⚠️ USUARIO YA ASIGNADO','Ese usuario ya pertenece habitualmente a otro grupo.')}catch(e){}return}const map=load(),id='GRUPO::'+g;map[id]={id,name:g,people,confirmed:true,updatedAt:new Date().toISOString()};saveMap(map);delete editing[g];decorate();try{toast('✅ GRUPO GUARDADO','Los integrantes habituales quedaron asignados a un solo grupo.')}catch(e){}return}
  },true);
  const prev=window.renderOps;if(typeof prev==='function')window.renderOps=function(...args){const r=prev(...args);setTimeout(decorate,20);return r};
  setTimeout(decorate,120);
})();