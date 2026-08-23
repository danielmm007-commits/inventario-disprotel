(()=>{
  if(!window.state||!Array.isArray(state.users))return;
  const $=id=>document.getElementById(id);
  let editing=-1;
  const meta=u=>{if(!u[4]||typeof u[4]!=='object')u[4]={historyCount:0,active:true};return u[4]};
  const defaultStyle=u=>{const r=String(u?.[1]||'').toUpperCase();return r.includes('TÉCNICO')||r.includes('TECNICO')||r.includes('PASANTE')||r.includes('AYUDANTE')||r.includes('SUPERVISOR')||r.includes('SUPREMO')?'MASCULINO':'FEMENINO'};
  const initials=n=>String(n||'?').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
  function inject(){
    if($('uAvatarStyle'))return;
    const role=$('uRole'); if(!role)return;
    const grid=role.closest('.grid2'); if(!grid)return;
    const f=document.createElement('div');f.className='field';f.innerHTML='<label>AVATAR</label><select id="uAvatarStyle"><option value="MASCULINO">Masculino</option><option value="FEMENINO">Femenino</option><option value="NEUTRO">Neutro</option></select>';
    grid.appendChild(f);grid.style.gridTemplateColumns='repeat(3,minmax(0,1fr))';
  }
  function svg(style,role){
    if(style==='NEUTRO')return `<div class="userAvatar autoAvatar roleAvatar avatarNeutral" title="Avatar neutro"><span style="font-size:13px;font-weight:1000">👤</span></div>`;
    if(style==='FEMENINO')return `<div class="userAvatar autoAvatar roleAvatar roleAdmin" title="Avatar femenino"><svg viewBox="0 0 64 64" aria-hidden="true"><g class="avBody"><path class="avBlouse" d="M12 62c2-13 9-19 20-19s18 6 20 19z"/><path class="avHair avHairBack" d="M17 31c0-14 6-22 15-22s15 8 15 22v15c-4-2-7-6-8-10-5 5-10 5-15 0-1 4-3 8-7 10z"/><circle class="avSkin" cx="32" cy="27" r="12"/><path class="avHair avHairFront" d="M20 25c2-11 7-15 14-15 7 0 12 5 11 14-4-4-8-6-13-6s-9 2-12 7z"/><g class="avGlasses"><rect x="21" y="25" width="10" height="6" rx="2"/><rect x="33" y="25" width="10" height="6" rx="2"/><path d="M31 28h2"/></g><path class="avSmile" d="M27 35c3 3 7 3 10 0"/></g></svg></div>`;
    const tech=/TÉCNICO|TECNICO|PASANTE|AYUDANTE/.test(String(role||'').toUpperCase());
    if(tech)return `<div class="userAvatar autoAvatar roleAvatar roleTech" title="Avatar masculino"><svg viewBox="0 0 64 64" aria-hidden="true"><g class="avBody"><path class="avShirt" d="M15 62c1-12 7-18 17-18s16 6 17 18z"/><path class="avVest" d="M20 48h24l3 14H17z"/><circle class="avSkin" cx="32" cy="28" r="13"/><path class="avHair" d="M19 29c0-12 5-18 13-18 9 0 14 6 13 18-4-4-8-6-13-6s-9 2-13 6z"/><path class="avHelmet" d="M18 23c1-10 6-15 14-15s13 5 14 15H18z"/><rect class="avHelmetBand" x="16" y="21" width="32" height="5" rx="2.5"/><circle class="avEye" cx="27" cy="29" r="1.4"/><circle class="avEye" cx="37" cy="29" r="1.4"/><path class="avSmile" d="M27 35c3 3 7 3 10 0"/></g></svg></div>`;
    return `<div class="userAvatar autoAvatar roleAvatar roleLeader" title="Avatar masculino"><svg viewBox="0 0 64 64" aria-hidden="true"><g class="avBody"><path class="avJacket" d="M12 62c2-13 9-19 20-19s18 6 20 19z"/><path class="avShirt" d="M25 44h14l-2 18H27z"/><path class="avTie" d="M30 46h4l2 12-4 4-4-4z"/><circle class="avSkin" cx="32" cy="27" r="13"/><path class="avHair" d="M19 27c1-11 6-17 14-17 8 0 13 6 12 16-5-4-10-6-15-5-4 1-7 3-11 6z"/><g class="avGlasses"><rect x="22" y="25" width="9" height="6" rx="2"/><rect x="33" y="25" width="9" height="6" rx="2"/><path d="M31 28h2"/></g><path class="avSmile" d="M27 35c3 2 7 2 10 0"/></g></svg></div>`;
  }
  function avatar(u){const p=u[3]||{};if(p.data)return `<div class="userAvatar userAvatarPhoto"><img src="${p.data}" style="width:${p.w}px;height:${p.h}px;transform:translate(calc(-50% + ${p.x}px),calc(-50% + ${p.y}px)) scale(${p.zoom});"></div>`;const m=meta(u);return svg(m.avatar_style||defaultStyle(u),u[1])}
  function render(){const list=$('usersList');if(!list)return;list.innerHTML=state.users.map((u,i)=>{const m=meta(u),hist=Number(m.historyCount||0),active=m.active!==false;return `<div class="row userRow ${active?'':'inactiveUser'}">${avatar(u)}<div><b>${u[0]||''}</b><small>${u[1]||'Sin rol'} · Área: ${u[2]||'Sin asignar'}${hist?` · ${hist} registro(s)`:''}</small></div><span class="tag ${active?'':'inactiveTag'}">${active?'ACTIVO':'INACTIVO'}</span><div class="userActions"><button class="smallBtn userEdit" data-user-edit="${i}">✏️ EDITAR</button><button class="smallBtn userDeactivate" onclick="toggleUserActive(${i})">${active?'⏸ DESACTIVAR':'▶ ACTIVAR'}</button><button class="smallBtn userDelete" ${hist?'disabled title="Tiene historial: no se puede eliminar"':''} onclick="deleteUserSafe(${i})">🗑 ELIMINAR</button></div></div>`}).join('')}
  inject();
  const oldOpen=window.openUserPhoto;
  window.openUserPhoto=i=>{editing=i;oldOpen?.(i);inject();const u=state.users[i];if(u&&$('uAvatarStyle'))$('uAvatarStyle').value=meta(u).avatar_style||defaultStyle(u)};
  $('newUserBtn')?.addEventListener('click',()=>{editing=-1;setTimeout(()=>{inject();if($('uAvatarStyle'))$('uAvatarStyle').value='NEUTRO'},0)});
  document.addEventListener('click',e=>{if(e.target?.id!=='saveUserBtn')return;const choice=$('uAvatarStyle')?.value||'NEUTRO';const name=$('uName')?.value?.trim();const idx=editing;setTimeout(()=>{let target=idx>=0?state.users[idx]:null;if(!target&&name){for(let i=state.users.length-1;i>=0;i--){if(String(state.users[i]?.[0]||'').trim()===name){target=state.users[i];break}}}if(target){meta(target).avatar_style=choice;try{save()}catch{}render()}editing=-1},0)},true);
  window.renderUsers=render;
  render();
})();