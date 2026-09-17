(()=>{
if(window.__disprotelHorarioNovedadesV3)return;window.__disprotelHorarioNovedadesV3=true;
const IDS=[['pfrom','start'],['pto','end'],['ufrom','start'],['uto','end'],['from','start'],['to','end']];
const NOV='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-novedades-operativas';
const DEL='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-novedades-eliminar';
const KEY='disprotel_login_general_v2';
const pad=n=>String(n).padStart(2,'0');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const allowed=(t,kind)=>{const [h,m]=String(t||'').split(':').map(Number),x=h*60+m;if(!Number.isFinite(x))return false;return kind==='start'?((x>=540&&x<780)||(x>=840&&x<1080)):((x>540&&x<=780)||(x>840&&x<=1080))};
function slotList(kind,current=''){
 const out=[];for(let x=540;x<=1080;x+=15){if(x>780&&x<840)continue;const t=pad(Math.floor(x/60))+':'+pad(x%60);if(allowed(t,kind))out.push(t)}
 if(current&&allowed(current,kind)&&!out.includes(current))out.push(current);
 return [...new Set(out)].sort();
}
function split(v){const m=String(v||'').match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);return m?{date:m[1],time:m[2]}:{date:'',time:''}}
function convert(id,kind){
 const original=document.getElementById(id);if(!original||original.dataset.workConverted==='3')return;
 original.dataset.workConverted='3';original.type='hidden';
 let wrap=original.nextElementSibling?.classList?.contains('workDateTime')?original.nextElementSibling:null;
 if(!wrap){wrap=document.createElement('div');wrap.className='workDateTime';original.insertAdjacentElement('afterend',wrap)}else wrap.innerHTML='';
 const date=document.createElement('input');date.type='date';date.className='workDate';date.setAttribute('aria-label','Fecha');
 const time=document.createElement('select');time.className='workTime';time.setAttribute('aria-label','Hora laboral');
 wrap.append(date,time);
 function renderTime(selected=''){time.innerHTML='<option value="">Hora</option>'+slotList(kind,selected).map(t=>`<option value="${t}">${t}</option>`).join('');if(selected&&allowed(selected,kind))time.value=selected}
 function mode(){return original.dataset.dateOnly==='1'?'date':'time'}
 function syncHidden(){if(!date.value){original.value='';return}if(mode()==='date'){original.value=`${date.value}T${kind==='start'?'09:00':'18:00'}`}else original.value=date.value&&time.value?`${date.value}T${time.value}`:''}
 function fromHidden(){const p=split(original.value);date.value=p.date;renderTime(p.time);syncHidden()}
 function setDateOnly(on){original.dataset.dateOnly=on?'1':'0';time.style.display=on?'none':'';wrap.classList.toggle('dateOnly',on);if(on){if(!date.value){const p=split(original.value);date.value=p.date}syncHidden()}else{const p=split(original.value);if(!time.value)renderTime(p.time||(kind==='start'?'09:00':'10:00'));syncHidden()}}
 date.addEventListener('change',syncHidden);time.addEventListener('change',syncHidden);
 original._workSync=fromHidden;original._workDateOnly=setDateOnly;fromHidden();
}
function sync(ids){ids.forEach(id=>{const el=document.getElementById(id);if(el?._workSync)el._workSync()})}
function nextStart(){let d=new Date(),x=d.getHours()*60+d.getMinutes();x=Math.ceil(x/15)*15;if(x<540)x=540;else if(x>=780&&x<840)x=840;else if(x>=1080)x=540;else if(x===780)x=840;return{d,x}}
function setValue(id,d,mins){const el=document.getElementById(id);if(!el)return;el.value=`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(Math.floor(mins/60))}:${pad(mins%60)}`;el._workSync?.()}
function defaults(){const a=nextStart(),shiftEnd=a.x<780?780:1080,b=Math.min(a.x+60,shiftEnd);['pfrom','ufrom'].forEach(id=>setValue(id,a.d,a.x));['pto','uto'].forEach(id=>setValue(id,a.d,b));applyPanelType()}
function personalValueFromLegacy(type,mode){type=String(type||'').toUpperCase();mode=String(mode||'').toUpperCase();if(type==='VACACIONES')return'VACACIONES';if(type==='PERMISO_DIAS')return'PERMISO_DIAS';if(type==='PERMISO_HORAS')return'PERMISO_HORAS';return mode==='POR_HORAS'?'PERMISO_HORAS':'PERMISO_DIAS'}
function setPersonalOptions(select,value){if(!select)return;select.innerHTML='<option value="PERMISO_HORAS">PERMISO POR HORAS</option><option value="PERMISO_DIAS">PERMISO POR DÍAS</option><option value="VACACIONES">VACACIONES</option>';select.value=value||'PERMISO_HORAS'}
function setDateOnly(ids,on){ids.forEach(id=>document.getElementById(id)?._workDateOnly?.(on))}
function applyPanelType(){const s=document.getElementById('ptype');if(!s)return;const day=s.value==='PERMISO_DIAS'||s.value==='VACACIONES';setDateOnly(['pfrom','pto'],day)}
function preparePanel(){const s=document.getElementById('ptype');if(!s)return;if(!s.dataset.personalTypesV3){const legacy=s.value||'PERMISO';setPersonalOptions(s,legacy==='VACACIONES'?'VACACIONES':'PERMISO_HORAS');s.dataset.personalTypesV3='1';s.addEventListener('change',applyPanelType)}applyPanelType()}
function applyHistoryType(){const s=document.getElementById('type'),mode=document.getElementById('mode'),modeLabel=document.getElementById('modeLabel');if(!s||!mode||!modeLabel)return;const personal=modeLabel.style.display!=='none';if(!personal){setDateOnly(['from','to'],false);return}let v=s.dataset.personalChoice||personalValueFromLegacy(s.value,mode.value);setPersonalOptions(s,v);s.dataset.personalChoice=v;modeLabel.style.display='none';const day=v==='PERMISO_DIAS'||v==='VACACIONES';setDateOnly(['from','to'],day);mode.value=v==='PERMISO_HORAS'?'POR_HORAS':'VARIOS_DIAS'}
function prepareHistory(){const s=document.getElementById('type');if(!s||s.dataset.personalListenerV3)return;s.dataset.personalListenerV3='1';s.addEventListener('change',()=>{s.dataset.personalChoice=s.value;applyHistoryType()})}
function typeLabel(n){if(String(n?.tipo||'').toUpperCase()==='VACACIONES')return'VACACIONES';return String(n?.modalidad||'').toUpperCase()==='POR_HORAS'?'PERMISO POR HORAS':'PERMISO POR DÍAS'}
function ecTime(v){return new Date(v).toLocaleTimeString('es-EC',{timeZone:'America/Guayaquil',hour:'2-digit',minute:'2-digit'})}
function ecDate(v){return new Date(v).toLocaleDateString('es-EC',{timeZone:'America/Guayaquil',day:'2-digit',month:'2-digit'})}
function renderGroupToday(){
 const tabs=document.querySelector('.tabs');if(!tabs)return;
 let box=document.getElementById('groupTodayNews');if(!box){box=document.createElement('div');box.id='groupTodayNews';box.className='groupTodayNews';tabs.insertAdjacentElement('beforebegin',box)}
 let group=null,dataSet=null;try{group=typeof G!=='undefined'?G:null;dataSet=typeof DATA!=='undefined'?DATA:null}catch{}
 if(!group||!dataSet){box.innerHTML='<b>Novedades de hoy</b><span>Sin datos.</span>';return}
 const members=new Map((group.miembros||[]).map(m=>[m.id,m.nombre]));
 const personals=(dataSet.novedades||[]).filter(n=>n.grupo_habitual_id===group.id||n.grupo_operativo_id===group.id);
 const rows=personals.map(n=>{const name=members.get(n.responsable_id)||'Técnico';const period=String(n.modalidad||'').toUpperCase()==='POR_HORAS'?`${ecTime(n.inicio)}–${ecTime(n.fin)}`:`${ecDate(n.inicio)}–${ecDate(n.fin)}`;return`<span>👨‍🔧 <strong>${esc(name)}</strong> · ${esc(typeLabel(n))} · ${esc(period)}</span>`});
 if(group.unidad?.novedad){const u=group.unidad.novedad;rows.push(`<span>🚐 <strong>${esc(group.unidad.nombre||'Unidad')}</strong> · ${esc(String(u.tipo||'').replaceAll('_',' '))} · ${esc(ecTime(u.inicio))}–${esc(ecTime(u.fin))}</span>`)}
 box.innerHTML=`<b>Novedades de hoy</b>${rows.length?rows.join(''):'<span>Sin novedades registradas hoy.</span>'}`;
}
let histDecorating=false,histTimer=null;
function session(){try{return JSON.parse(sessionStorage.getItem(KEY)||'{}')}catch{return{}}}
async function decorateHistoryDeletes(){
 const list=document.getElementById('list'),date=document.getElementById('date');if(!list||!date||histDecorating)return;
 const cards=[...list.querySelectorAll('.item')];if(!cards.length||cards.every(c=>c.querySelector('[data-real-delete]')))return;
 const me=session();if(!me.session_token)return;histDecorating=true;
 try{const r=await fetch(NOV,{method:'POST',headers:{'Content-Type':'application/json','x-session':me.session_token},body:JSON.stringify({action:'history',date:date.value})}),j=await r.json();if(!r.ok||j.error)return;const items=j.items||[];cards.forEach((card,i)=>{const x=items[i];if(!x||card.querySelector('[data-real-delete]'))return;let actions=card.querySelector('.actions');if(!actions){actions=document.createElement('div');actions.className='actions';card.appendChild(actions)}const b=document.createElement('button');b.className='deleteBtn';b.dataset.realDelete=x.id;b.dataset.deleteClass=x.clase;b.textContent='🗑 ELIMINAR';actions.appendChild(b)})}finally{histDecorating=false}
}
function installHistoryDelete(){
 const list=document.getElementById('list');if(!list||list.dataset.deleteInstalled==='1')return;list.dataset.deleteInstalled='1';
 list.addEventListener('click',async e=>{const b=e.target.closest('[data-real-delete]');if(!b)return;e.preventDefault();e.stopPropagation();if(!confirm('¿Eliminar definitivamente esta novedad?\n\nCancelar conserva el registro. Eliminar lo borra.'))return;const me=session();try{b.disabled=true;const r=await fetch(DEL,{method:'POST',headers:{'Content-Type':'application/json','x-session':me.session_token},body:JSON.stringify({id:b.dataset.realDelete,clase:b.dataset.deleteClass})}),j=await r.json().catch(()=>({}));if(!r.ok||j.error)throw new Error(j.error||'No se pudo eliminar');document.getElementById('refresh')?.click()}catch(err){alert(err.message)}finally{b.disabled=false}},true);
 const ob=new MutationObserver(()=>{clearTimeout(histTimer);histTimer=setTimeout(decorateHistoryDeletes,80)});ob.observe(list,{childList:true,subtree:true});setTimeout(decorateHistoryDeletes,120)
}
function boot(){
 if(!document.getElementById('workScheduleCss')){const st=document.createElement('style');st.id='workScheduleCss';st.textContent='.workDateTime{display:grid;grid-template-columns:minmax(0,1fr) 102px;gap:5px;margin-top:5px}.workDateTime.dateOnly{grid-template-columns:1fr}.workDateTime input,.workDateTime select{width:100%!important;margin-top:0!important}.workTime{font-weight:800;color:#244d68}.groupTodayNews{margin:7px 0 2px;padding:6px 8px;border:1px solid #d8e4ea;border-radius:9px;background:#fff;display:grid;gap:3px;font-size:8px;color:#526b78}.groupTodayNews>b{font-size:8px;color:#173f60}.groupTodayNews span{display:block}.deleteBtn{background:#7c1f1f!important;color:#fff!important}@media(max-width:420px){.workDateTime{grid-template-columns:minmax(0,1fr) 92px}}';document.head.appendChild(st)}
 IDS.forEach(([id,k])=>convert(id,k));preparePanel();prepareHistory();installHistoryDelete();
 document.addEventListener('click',e=>{if(e.target.closest('.group'))setTimeout(()=>{defaults();renderGroupToday()},0);if(e.target.closest('[data-edit]'))setTimeout(()=>{const s=document.getElementById('type'),m=document.getElementById('mode');if(s&&m)s.dataset.personalChoice=personalValueFromLegacy(s.value,m.value);sync(['from','to']);applyHistoryType()},0)},true);
 window.DisprotelHorarioNovedades={sync,defaults,applyPanelType,applyHistoryType,renderGroupToday};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();