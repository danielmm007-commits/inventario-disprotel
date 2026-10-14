(()=>{'use strict';
if(window.__supAvisosOtV1)return;window.__supAvisosOtV1=true;
let me={};try{me=JSON.parse(sessionStorage.getItem('disprotel_login_general_v2')||'{}')}catch{}
if(me.id!=='986f9610-5144-42d6-b467-cace9ea8983f'||!window.DISPROTEL_OT_RT_PILOT)return;
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim().replace(/[\s-]+/g,'_');
const recent=new Map(),waiting=[],orderDetails=new Map();
function message(d){
 const state=norm(d.estado),group=String(d.grupo||'Grupo técnico');
 const short=group.toUpperCase().includes('CAMIONETA')?'Grupo Camioneta':group.toUpperCase().includes('FURGONETA')?'Grupo Furgoneta':group;
 const rawActor=String(d.actor||'').trim();
 const actor=rawActor?(rawActor.charAt(0).toLocaleUpperCase('es-EC')+rawActor.slice(1).toLocaleLowerCase('es-EC')):short;
 const actions={
 PENDIENTE:['📋','Nueva orden pendiente'],CREADA:['📋','Nueva orden creada'],
 ASIGNADA:['📌','Orden asignada a '+short],
 ACEPTADA:['✅',actor+' confirmó la recepción de la OT'],
 TOMADA:['✅',actor+' confirmó la recepción de la OT'],
 EN_CAMINO:['🚗',short+' está en camino'],
 EN_SITIO:['📍',actor+' llegó al cliente'],
 LLEGADA_EN_SITIO:['📍',actor+' llegó al cliente'],
 EN_PROCESO:['🛠️',short+' inició la atención'],
 EN_EJECUCION:['🛠️',short+' inició el trabajo'],
 PAUSADA:['⏸️','La OT fue pausada'],
 REPROGRAMADA:['📆','La OT fue reprogramada'],REPROGRAMADO:['📆','La OT fue reprogramada'],
 COMPLETADA:['🏁',short+' finalizó el trabajo'],FINALIZADA:['🏁',short+' finalizó el trabajo'],
 CANCELADA:['⚠️','La OT fue cancelada'],CANCELADA_EN_SITIO:['⚠️','OT cancelada en sitio'],
 NO_EJECUTADA_CLIENTE:['⚠️','La OT no pudo ejecutarse']
 };
 if(state===norm(d.anterior)&&d.accion!=='INSERT')return null;
 return actions[state]||null;
}
function stack(){
 let root=document.getElementById('supOtAvisosFlotantes');
 if(root)return root;
 const css=document.createElement('style');css.textContent=`
 #supOtAvisosFlotantes{position:fixed;top:78px;right:14px;width:min(370px,calc(100vw - 28px));
 z-index:2147483000;display:grid;gap:9px;pointer-events:none}
 .supOtAviso{position:relative;pointer-events:auto;background:white;color:#183b55;border:1px solid #b9d5e7;
 border-left:5px solid #1688bd;border-radius:12px;padding:12px 33px 12px 12px;box-shadow:0 10px 26px #17395435;
 font:600 12px/1.4 system-ui,Arial,sans-serif;animation:otAvisoIn .24s ease-out}
 .supOtAviso b{font-size:13px}.supOtAviso small{display:block;color:#69808e;margin:5px 0 0 30px}
 .supOtAvisoDetails{border-top:1px solid #dbe7ee;margin-top:8px;padding:7px 0 0 0;
   display:grid;gap:4px;font-size:11px;color:#31526a;font-weight:500}
 .supOtAvisoDetails[hidden]{display:none}
 .supOtAvisoDetails div{overflow-wrap:anywhere}
 .supOtAvisoDetails strong{color:#163e58;font-weight:750}
 .supOtAviso button{position:absolute;right:5px;top:5px;background:none;border:0;font-size:19px;
 cursor:pointer;color:#546b78}
 @keyframes otAvisoIn{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:none}}
 @media(max-width:680px){#supOtAvisosFlotantes{top:65px;right:8px;width:calc(100vw - 16px)}}
 `;document.head.append(css);
 root=document.createElement('div');root.id='supOtAvisosFlotantes';document.body.append(root);return root;
}
function readableType(raw){
 const n=norm(raw),labels={
   SOPORTE_TECNICO:'Soporte técnico',
   INSTALACION:'Instalación',
   INSTALACION_NUEVA:'Instalación nueva',
   REUBICACION:'Reubicación',
   MUDANZA:'Mudanza',
   CAMBIO_EQUIPOS:'Cambio de equipos',
   CAMBIO_EQUIPO:'Cambio de equipo'
 };
 return labels[n]||String(raw||'').replace(/_/g,' ').trim().toLocaleLowerCase('es-EC').replace(/^./,c=>c.toLocaleUpperCase('es-EC'));
}
function decorate(card){
 const meta=orderDetails.get(String(card.dataset.otCode||'')),box=card.querySelector('.supOtAvisoDetails');
 if(!box)return;
 box.replaceChildren();
 if(!meta){box.hidden=true;return}
 const rows=[['Cliente',meta.cliente],['Tipo de trabajo',readableType(meta.tipo)]].filter(x=>x[1]);
 box.hidden=!rows.length;
 for(const [label,value] of rows){
   const line=document.createElement('div'),strong=document.createElement('strong');
   strong.textContent=label+': ';
   line.append(strong,document.createTextNode(value));
   box.append(line);
 }
}
window.addEventListener('disprotel:ot-resumen',event=>{
 const list=event?.detail?.orders;
 if(!Array.isArray(list))return;
 orderDetails.clear();
 for(const row of list.slice(0,300)){
   if(!row||!row.ot)continue;
   orderDetails.set(String(row.ot),{
     cliente:String(row.cliente||'').trim().slice(0,160),
     tipo:String(row.tipo||'').trim().slice(0,90)
   });
 }
 document.querySelectorAll('#supOtAvisosFlotantes .supOtAviso').forEach(decorate);
});
function show(d){
 const info=message(d);if(!info)return;
 const root=stack(),card=document.createElement('div');card.className='supOtAviso';card.setAttribute('role','status');
 const title=document.createElement('b');title.textContent=info[0]+' '+info[1];
 const sub=document.createElement('small');sub.textContent=String(d.ot||'OT')+' · '+String(d.grupo||'');
 const close=document.createElement('button');close.textContent='×';close.title='Cerrar aviso';close.setAttribute('aria-label','Cerrar aviso');
 let t;close.onclick=()=>{clearTimeout(t);card.remove()};
 card.dataset.otCode=String(d.ot||'');
 const details=document.createElement('div');details.className='supOtAvisoDetails';details.hidden=true;
 card.append(title,sub,details,close);root.prepend(card);
 decorate(card);
 while(root.children.length>4)root.lastElementChild.remove();
 t=setTimeout(()=>card.remove(),14000);
}
window.addEventListener('disprotel:ot-hito',event=>{
 const d=event.detail||{};if(!d.ot||!d.estado)return;
 if(!message(d))return;
 const key=[d.ot,norm(d.estado),d.grupo].join('|'),now=Date.now();
 for(const [k,time] of recent)if(now-time>60000)recent.delete(k);
 if(recent.has(key)&&now-recent.get(key)<4000)return;
 recent.set(key,now);
 if(document.hidden){waiting.push(d);if(waiting.length>8)waiting.shift()}else show(d);
});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)waiting.splice(0).forEach(show)});
})();