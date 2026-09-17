(()=>{
if(window.__disprotelHorarioNovedadesV2)return;window.__disprotelHorarioNovedadesV2=true;
const IDS=[['pfrom','start'],['pto','end'],['ufrom','start'],['uto','end'],['from','start'],['to','end']];
const pad=n=>String(n).padStart(2,'0');
const allowed=(t,kind)=>{const [h,m]=String(t||'').split(':').map(Number),x=h*60+m;if(!Number.isFinite(x))return false;return kind==='start'?((x>=540&&x<780)||(x>=840&&x<1080)):((x>540&&x<=780)||(x>840&&x<=1080))};
function slotList(kind,current=''){
 const out=[];for(let x=540;x<=1080;x+=15){if(x>780&&x<840)continue;const t=pad(Math.floor(x/60))+':'+pad(x%60);if(allowed(t,kind))out.push(t)}
 if(current&&allowed(current,kind)&&!out.includes(current))out.push(current);
 return [...new Set(out)].sort();
}
function split(v){const m=String(v||'').match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);return m?{date:m[1],time:m[2]}:{date:'',time:''}}
function convert(id,kind){
 const original=document.getElementById(id);if(!original||original.dataset.workConverted==='2')return;
 original.dataset.workConverted='2';original.type='hidden';
 let wrap=original.nextElementSibling?.classList?.contains('workDateTime')?original.nextElementSibling:null;
 if(!wrap){wrap=document.createElement('div');wrap.className='workDateTime';original.insertAdjacentElement('afterend',wrap)}else wrap.innerHTML='';
 const date=document.createElement('input');date.type='date';date.className='workDate';date.setAttribute('aria-label','Fecha');
 const time=document.createElement('select');time.className='workTime';time.setAttribute('aria-label','Hora laboral');
 wrap.append(date,time);
 function renderTime(selected=''){time.innerHTML='<option value="">Hora</option>'+slotList(kind,selected).map(t=>`<option value="${t}">${t}</option>`).join('');if(selected&&allowed(selected,kind))time.value=selected}
 function mode(){return original.dataset.dateOnly==='1'?'date':'time'}
 function syncHidden(){if(!date.value){original.value='';return}if(mode()==='date'){original.value=`${date.value}T${kind==='start'?'09:00':'18:00'}`}else original.value=date.value&&time.value?`${date.value}T${time.value}`:''}
 function fromHidden(){const p=split(original.value);date.value=p.date;renderTime(p.time);syncHidden()}
 function setDateOnly(on){original.dataset.dateOnly=on?'1':'0';time.style.display=on?'none':'';wrap.classList.toggle('dateOnly',on);if(on){if(!date.value){const p=split(original.value);date.value=p.date}syncHidden()}else{const p=split(original.value);if(!time.value)renderTime(p.time|| (kind==='start'?'09:00':'10:00'));syncHidden()}}
 date.addEventListener('change',syncHidden);time.addEventListener('change',syncHidden);
 original._workSync=fromHidden;original._workDateOnly=setDateOnly;fromHidden();
}
function sync(ids){ids.forEach(id=>{const el=document.getElementById(id);if(el?._workSync)el._workSync()})}
function nextStart(){let d=new Date(),x=d.getHours()*60+d.getMinutes();x=Math.ceil(x/15)*15;if(x<540)x=540;else if(x>=780&&x<840)x=840;else if(x>=1080){x=540}else if(x===780)x=840;return{d,x}}
function setValue(id,d,mins){const el=document.getElementById(id);if(!el)return;el.value=`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(Math.floor(mins/60))}:${pad(mins%60)}`;el._workSync?.()}
function defaults(){const a=nextStart(),shiftEnd=a.x<780?780:1080,b=Math.min(a.x+60,shiftEnd);['pfrom','ufrom'].forEach(id=>setValue(id,a.d,a.x));['pto','uto'].forEach(id=>setValue(id,a.d,b));applyPanelType()}
function personalValueFromLegacy(type,mode){type=String(type||'').toUpperCase();mode=String(mode||'').toUpperCase();if(type==='VACACIONES')return'VACACIONES';if(type==='PERMISO_DIAS')return'PERMISO_DIAS';if(type==='PERMISO_HORAS')return'PERMISO_HORAS';return mode==='POR_HORAS'?'PERMISO_HORAS':'PERMISO_DIAS'}
function setPersonalOptions(select,value){if(!select)return;select.innerHTML='<option value="PERMISO_HORAS">PERMISO POR HORAS</option><option value="PERMISO_DIAS">PERMISO POR DÍAS</option><option value="VACACIONES">VACACIONES</option>';select.value=value||'PERMISO_HORAS'}
function setDateOnly(ids,on){ids.forEach(id=>document.getElementById(id)?._workDateOnly?.(on))}
function applyPanelType(){const s=document.getElementById('ptype');if(!s)return;const day=s.value==='PERMISO_DIAS'||s.value==='VACACIONES';setDateOnly(['pfrom','pto'],day);const note=document.getElementById('msg');if(note&&!day&&note.textContent.includes('fecha inicial'))note.textContent=''}
function preparePanel(){const s=document.getElementById('ptype');if(!s)return;if(!s.dataset.personalTypesV2){const legacy=s.value||'PERMISO';setPersonalOptions(s,legacy==='VACACIONES'?'VACACIONES':'PERMISO_HORAS');s.dataset.personalTypesV2='1';s.addEventListener('change',applyPanelType)}applyPanelType()}
function applyHistoryType(){const s=document.getElementById('type'),mode=document.getElementById('mode'),modeLabel=document.getElementById('modeLabel');if(!s||!mode||!modeLabel)return;const personal=modeLabel.style.display!=='none';if(!personal){setDateOnly(['from','to'],false);return}let v=s.dataset.personalChoice||personalValueFromLegacy(s.value,mode.value);setPersonalOptions(s,v);s.dataset.personalChoice=v;modeLabel.style.display='none';const day=v==='PERMISO_DIAS'||v==='VACACIONES';setDateOnly(['from','to'],day);mode.value=v==='PERMISO_HORAS'?'POR_HORAS':'VARIOS_DIAS'}
function prepareHistory(){const s=document.getElementById('type');if(!s||s.dataset.personalListenerV2)return;s.dataset.personalListenerV2='1';s.addEventListener('change',()=>{s.dataset.personalChoice=s.value;applyHistoryType()})}
function boot(){
 if(!document.getElementById('workScheduleCss')){const st=document.createElement('style');st.id='workScheduleCss';st.textContent='.workDateTime{display:grid;grid-template-columns:minmax(0,1fr) 102px;gap:5px;margin-top:5px}.workDateTime.dateOnly{grid-template-columns:1fr}.workDateTime input,.workDateTime select{width:100%!important;margin-top:0!important}.workTime{font-weight:800;color:#244d68}@media(max-width:420px){.workDateTime{grid-template-columns:minmax(0,1fr) 92px}}';document.head.appendChild(st)}
 IDS.forEach(([id,k])=>convert(id,k));preparePanel();prepareHistory();
 document.addEventListener('click',e=>{if(e.target.closest('.group'))setTimeout(defaults,0);if(e.target.closest('[data-edit]'))setTimeout(()=>{const s=document.getElementById('type'),m=document.getElementById('mode');if(s&&m){s.dataset.personalChoice=personalValueFromLegacy(s.value,m.value)}sync(['from','to']);applyHistoryType()},0)},true);
 window.DisprotelHorarioNovedades={sync,defaults,applyPanelType,applyHistoryType};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();