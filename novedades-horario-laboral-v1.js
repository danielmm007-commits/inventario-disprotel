(()=>{
if(window.__disprotelHorarioNovedadesV2)return;window.__disprotelHorarioNovedadesV2=true;
const IDS=[['pfrom','start'],['pto','end'],['ufrom','start'],['uto','end'],['from','start'],['to','end']];
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const allowed=(t,kind)=>{const [h,m]=String(t||'').split(':').map(Number),x=h*60+m;if(!Number.isFinite(x))return false;return kind==='start'?((x>=540&&x<780)||(x>=840&&x<1080)):((x>540&&x<=780)||(x>840&&x<=1080))};
function slotList(kind,current=''){
 const out=[];for(let x=540;x<=1080;x+=15){if(x>780&&x<840)continue;const t=pad(Math.floor(x/60))+':'+pad(x%60);if(allowed(t,kind))out.push(t)}
 if(current&&allowed(current,kind)&&!out.includes(current))out.push(current);
 return [...new Set(out)].sort();
}
function split(v){const m=String(v||'').match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);return m?{date:m[1],time:m[2]}:{date:'',time:''}}
function convert(id,kind){
 const original=document.getElementById(id);if(!original||original.dataset.workConverted==='1')return;
 original.dataset.workConverted='1';original.type='hidden';
 const wrap=document.createElement('div');wrap.className='workDateTime';wrap.dataset.source=id;
 const date=document.createElement('input');date.type='date';date.className='workDate';date.setAttribute('aria-label','Fecha');
 const time=document.createElement('select');time.className='workTime';time.setAttribute('aria-label','Hora laboral');
 wrap.append(date,time);original.insertAdjacentElement('afterend',wrap);
 function renderTime(selected=''){time.innerHTML='<option value="">Hora</option>'+slotList(kind,selected).map(t=>`<option value="${t}">${t}</option>`).join('');if(selected&&allowed(selected,kind))time.value=selected}
 function syncHidden(){original.value=date.value&&time.value?`${date.value}T${time.value}`:''}
 function fromHidden(){const p=split(original.value);date.value=p.date;renderTime(p.time);syncHidden()}
 date.addEventListener('change',syncHidden);time.addEventListener('change',syncHidden);
 original._workSync=fromHidden;original._workDate=date;original._workTime=time;original._workKind=kind;fromHidden();
}
function sync(ids){ids.forEach(id=>{const el=document.getElementById(id);if(el?._workSync)el._workSync()})}
function setHidden(id,date,time){const el=document.getElementById(id);if(!el)return;el.value=date?`${date}T${time}`:'';el._workSync?.()}
function currentEcParts(){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Guayaquil',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date());const get=t=>parts.find(x=>x.type===t)?.value||'';return{date:`${get('year')}-${get('month')}-${get('day')}`,mins:Number(get('hour'))*60+Number(get('minute'))}}
function permissionDefaults(){
 const n=currentEcParts();let x=Math.ceil(n.mins/15)*15;
 if(x<540)x=540;else if(x>=780&&x<840)x=840;else if(x>=1080)x=540;else if(x===780)x=840;
 let end=x+60;if(x<780)end=Math.min(end,780);else end=Math.min(end,1080);if(end<=x)end=x<780?780:1080;
 ['pfrom'].forEach(id=>setHidden(id,n.date,pad(Math.floor(x/60))+':'+pad(x%60)));
 ['pto'].forEach(id=>setHidden(id,n.date,pad(Math.floor(end/60))+':'+pad(end%60)));
}
function unitDefaults(){
 const n=currentEcParts();let x=Math.ceil(n.mins/15)*15;
 if(x<540)x=540;else if(x>=780&&x<840)x=840;else if(x>=1080)x=540;else if(x===780)x=840;
 let end=x+60;if(x<780)end=Math.min(end,780);else end=Math.min(end,1080);
 setHidden('ufrom',n.date,pad(Math.floor(x/60))+':'+pad(x%60));setHidden('uto',n.date,pad(Math.floor(end/60))+':'+pad(end%60));
}
function personalType(){return String(document.getElementById('ptype')?.value||document.getElementById('type')?.value||'PERMISO').toUpperCase()}
function vacationMode(){return personalType()==='VACACIONES'}
function setVacationFields(ids,on){
 ids.forEach((id,i)=>{const el=document.getElementById(id);if(!el?._workDate||!el?._workTime)return;el._workTime.style.display=on?'none':'';el._workDate.style.gridColumn=on?'1/-1':'';const wrap=el._workDate.closest('.workDateTime');if(wrap)wrap.classList.toggle('vacationDates',on);if(on){let p=split(el.value),date=p.date||currentEcParts().date;el.value=`${date}T${i===0?'09:00':'18:00'}`;el._workSync?.()}}
 );
}
function applyPersonalType(){
 const type=personalType(),isVac=type==='VACACIONES';
 const ptype=document.getElementById('ptype');if(ptype){const current=ptype.value;ptype.innerHTML='<option value="PERMISO">PERMISO</option><option value="VACACIONES">VACACIONES</option>';ptype.value=current==='VACACIONES'?'VACACIONES':'PERMISO'}
 const editType=document.getElementById('type');if(editType&&document.getElementById('who')){const current=editType.value;if(['PERMISO','VACACIONES'].includes(current)){editType.innerHTML='<option value="PERMISO">PERMISO</option><option value="VACACIONES">VACACIONES</option>';editType.value=current}}
 setVacationFields(['pfrom','pto'],isVac);
 if(document.getElementById('who'))setVacationFields(['from','to'],isVac);
 const modeLabel=document.getElementById('modeLabel');if(modeLabel)modeLabel.style.display='none';
 document.querySelectorAll('.workScheduleHint').forEach(x=>x.remove());
 const target=(document.getElementById('ptype')?.closest('.form')||document.getElementById('type')?.closest('.form'));
 if(target){const note=document.createElement('div');note.className='workScheduleHint full';note.textContent=isVac?'Vacaciones: selecciona únicamente la fecha inicial y la fecha final.':'Permiso: selecciona fecha y horario real del permiso entre 09:00–13:00 o 14:00–18:00. Puede registrarse después, incluso fuera del horario laboral.';target.appendChild(note)}
 if(isVac){const ids=document.getElementById('ptype')?['pfrom','pto']:['from','to'];ids.forEach((id,i)=>{const el=document.getElementById(id);if(!el)return;const p=split(el.value),date=p.date||currentEcParts().date;setHidden(id,date,i===0?'09:00':'18:00')})}
}
function defaults(){permissionDefaults();unitDefaults();const p=document.getElementById('ptype');if(p)p.value='PERMISO';applyPersonalType()}
function hookTypes(){
 const p=document.getElementById('ptype');if(p&&!p.dataset.onlyLeaveTypes){p.dataset.onlyLeaveTypes='1';p.innerHTML='<option value="PERMISO">PERMISO</option><option value="VACACIONES">VACACIONES</option>';p.addEventListener('change',applyPersonalType)}
 const t=document.getElementById('type');if(t&&!t.dataset.leaveTypeHook){t.dataset.leaveTypeHook='1';t.addEventListener('change',applyPersonalType)}
}
function boot(){
 if(!document.getElementById('workScheduleCss')){const s=document.createElement('style');s.id='workScheduleCss';s.textContent='.workDateTime{display:grid;grid-template-columns:minmax(0,1fr) 102px;gap:5px;margin-top:5px}.workDateTime input,.workDateTime select{width:100%!important;margin-top:0!important}.workTime{font-weight:800;color:#244d68}.workDateTime.vacationDates{grid-template-columns:1fr}.workScheduleHint{margin-top:2px;padding:6px 8px;border-radius:8px;background:#f1f6f9;color:#607783;font-size:8px;line-height:1.35}@media(max-width:420px){.workDateTime{grid-template-columns:minmax(0,1fr) 92px}}';document.head.appendChild(s)}
 IDS.forEach(([id,k])=>convert(id,k));hookTypes();applyPersonalType();
 document.addEventListener('click',e=>{if(e.target.closest('.group'))setTimeout(defaults,0);if(e.target.closest('[data-edit]'))setTimeout(()=>{sync(['from','to']);hookTypes();applyPersonalType()},0)},true);
 window.DisprotelHorarioNovedades={sync,defaults,applyPersonalType};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();