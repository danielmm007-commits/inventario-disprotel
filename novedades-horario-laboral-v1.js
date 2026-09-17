(()=>{
if(window.__disprotelHorarioNovedadesV1)return;window.__disprotelHorarioNovedadesV1=true;
const IDS=[['pfrom','start'],['pto','end'],['ufrom','start'],['uto','end'],['from','start'],['to','end']];
const pad=n=>String(n).padStart(2,'0');
const allowed=(t,kind)=>{const [h,m]=String(t||'').split(':').map(Number),x=h*60+m;if(!Number.isFinite(x))return false;return kind==='start'?((x>=540&&x<780)||(x>=840&&x<1080)):((x>540&&x<=780)||(x>840&&x<=1080))};
function slotList(kind,current=''){
 const out=[];for(let x=540;x<=1080;x+=15){if((x>780&&x<840))continue;const t=pad(Math.floor(x/60))+':'+pad(x%60);if(allowed(t,kind))out.push(t)}
 if(current&&allowed(current,kind)&&!out.includes(current))out.push(current);
 return [...new Set(out)].sort();
}
function split(v){const m=String(v||'').match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);return m?{date:m[1],time:m[2]}:{date:'',time:''}}
function convert(id,kind){
 const original=document.getElementById(id);if(!original||original.dataset.workConverted==='1')return;
 original.dataset.workConverted='1';original.type='hidden';
 const wrap=document.createElement('div');wrap.className='workDateTime';
 const date=document.createElement('input');date.type='date';date.className='workDate';date.setAttribute('aria-label','Fecha');
 const time=document.createElement('select');time.className='workTime';time.setAttribute('aria-label','Hora laboral');
 wrap.append(date,time);original.insertAdjacentElement('afterend',wrap);
 function renderTime(selected=''){time.innerHTML='<option value="">Hora</option>'+slotList(kind,selected).map(t=>`<option value="${t}">${t}</option>`).join('');if(selected&&allowed(selected,kind))time.value=selected}
 function syncHidden(){original.value=date.value&&time.value?`${date.value}T${time.value}`:''}
 function fromHidden(){const p=split(original.value);date.value=p.date;renderTime(p.time);syncHidden()}
 date.addEventListener('change',syncHidden);time.addEventListener('change',syncHidden);
 original._workSync=fromHidden;fromHidden();
}
function sync(ids){ids.forEach(id=>{const el=document.getElementById(id);if(el?._workSync)el._workSync()})}
function nextStart(){let d=new Date(),x=d.getHours()*60+d.getMinutes();x=Math.ceil(x/15)*15;if(x<540)x=540;else if(x>=780&&x<840)x=840;else if(x>=1080){d.setDate(d.getDate()+1);x=540}else if(x===780)x=840;return{d,x}}
function setValue(id,d,mins){const el=document.getElementById(id);if(!el)return;el.value=`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(Math.floor(mins/60))}:${pad(mins%60)}`;el._workSync?.()}
function defaults(){const a=nextStart(),shiftEnd=a.x<780?780:1080,b=Math.min(a.x+60,shiftEnd);['pfrom','ufrom'].forEach(id=>setValue(id,a.d,a.x));['pto','uto'].forEach(id=>setValue(id,a.d,b))}
function boot(){
 if(!document.getElementById('workScheduleCss')){const s=document.createElement('style');s.id='workScheduleCss';s.textContent='.workDateTime{display:grid;grid-template-columns:minmax(0,1fr) 102px;gap:5px;margin-top:5px}.workDateTime input,.workDateTime select{width:100%!important;margin-top:0!important}.workTime{font-weight:800;color:#244d68}@media(max-width:420px){.workDateTime{grid-template-columns:minmax(0,1fr) 92px}}';document.head.appendChild(s)}
 IDS.forEach(([id,k])=>convert(id,k));
 document.addEventListener('click',e=>{if(e.target.closest('.group'))setTimeout(defaults,0);if(e.target.closest('[data-edit]'))setTimeout(()=>sync(['from','to']),0)},true);
 window.DisprotelHorarioNovedades={sync,defaults};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();