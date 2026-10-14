/* DISPROTEL: avisos Mesa Tecnica en ambas direcciones, PILOTO Fernando/Bryan.
   Cero fetch: datos minimos de Broadcast privado; cliente solo de resumen local autenticado. */
(()=>{
 'use strict';
 if(window.__disprotelMesaAvisosV1)return;window.__disprotelMesaAvisosV1=true;
 const KEY='disprotel_login_general_v2';
 const FERNANDO='986f9610-5144-42d6-b467-cace9ea8983f';
 const BRYAN='8c68e659-bc2d-4ee9-a435-cd0cb5691b12';
 let me={};try{me=JSON.parse(sessionStorage.getItem(KEY)||'{}')}catch{}
 const id=String(me.id||'');
 if(![FERNANDO,BRYAN].includes(id)||!window.DISPROTEL_OT_RT_PILOT)return;
 const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim().replace(/[\s-]+/g,'_');
 const seen=new Map(),pending=[],orderDetails=new Map();
 const actionLabels={
   VERIFICAR_POTENCIA:'verificar potencia óptica',
   ACTIVAR_CAMBIAR_ONU:'revisar activación/cambio de ONU',
   CONFIRMAR_IP_ACTUAL:'confirmar IP actual',
   ASIGNAR_NUEVA_IP:'asignar nueva IP',
   VERIFICAR_ACCESO_REMOTO:'verificar acceso remoto',
   REVISAR_RADIO_CPE:'revisar radio/CPE',
   VERIFICAR_CONECTIVIDAD:'verificar conectividad',
   OTRA_ACCION:'otra asistencia técnica'
 };
 function typeLabel(v){
   const s=norm(v);
   return ({SOPORTE_TECNICO:'Soporte técnico',INSTALACION:'Instalación',
     INSTALACION_NUEVA:'Instalación nueva',REUBICACION:'Reubicación',
     CAMBIO_EQUIPOS:'Cambio de equipos',MUDANZA:'Mudanza'})[s]||
     String(v||'').replace(/_/g,' ').toLocaleLowerCase('es-EC');
 }
 function actor(v,fallback){
   const raw=String(v||'').trim();
   return raw?raw.charAt(0).toLocaleUpperCase('es-EC')+raw.slice(1).toLocaleLowerCase('es-EC'):fallback;
 }
 function group(v){const s=String(v||'').trim();if(norm(s).includes('CAMIONETA'))return 'Grupo Camioneta';if(norm(s).includes('FURGONETA'))return 'Grupo Furgoneta';return s||'El equipo técnico'}
 function describe(d){
   const area=norm(d.area),estado=norm(d.estado),to=norm(d.destino);
   if(to==='SUPERVISOR'&&id!==FERNANDO)return null;
   if(to==='TECNICO'&&(id!==BRYAN||String(d.destinatario||'')!==id))return null;
   if(!['SUPERVISOR','TECNICO'].includes(to))return null;
   const who=actor(d.actor,group(d.grupo));
   const actions=Array.isArray(d.acciones)?d.acciones.map(a=>actionLabels[norm(a)]).filter(Boolean):[];
   const detail=actions.length?actions.join(' · '):'';
   let title='',icon='🔔',tone='info';
   if(to==='SUPERVISOR'){
     if(area==='IP'&&estado==='PENDIENTE'){icon='🌐';title=who+' solicitó asignación de IP'}
     else if(area==='ONU'&&estado==='SOLICITADO'){icon='📡';title=who+' solicitó revisión de ONU'}
     else if(area==='REMOTO'&&estado==='SOLICITADO'){icon='💻';title=who+' solicitó acceso remoto'}
     else if(area==='MESA'&&estado==='PENDIENTE'){icon='🧰';title=who+' solicitó apoyo de Mesa Técnica'}
   }else{
     if(area==='IP'&&estado==='ASIGNADA'){icon='✅';tone='ok';title='IP asignada para tu OT'}
     else if(area==='IP'&&estado==='CANCELADA'){icon='⚠️';tone='warn';title='Solicitud de IP cancelada'}
     else if(area==='ONU'&&estado==='CONFIRMADO'){icon='✅';tone='ok';title='ONU confirmada en DISPROTEL'}
     else if(area==='ONU'&&estado==='REQUIERE_CORRECCION'){icon='⚠️';tone='warn';title='Mesa Técnica solicitó corregir la ONU'}
     else if(area==='REMOTO'&&estado==='CONFIRMADO'){icon='✅';tone='ok';title='Acceso remoto confirmado'}
     else if(area==='REMOTO'&&estado==='REQUIERE_CORRECCION'){icon='⚠️';tone='warn';title='Mesa Técnica solicitó corregir el acceso remoto'}
     else if(area==='MESA'&&estado==='ATENDIDO'){icon='✅';tone='ok';title='Mesa Técnica atendió tu requerimiento'}
   }
   if(!title)return null;
   return {title,icon,tone,detail,ot:String(d.ot||'').slice(0,64),
     grupo:String(d.grupo||'').slice(0,120),tipo:String(d.tipo||'').slice(0,90)};
 }
 function ensure(){
   let root=document.getElementById('disprotelMesaToastStack');if(root)return root;
   const s=document.createElement('style');s.id='disprotelMesaToastCss';
   s.textContent=`
    #disprotelMesaToastStack{position:fixed;top:77px;right:13px;width:min(385px,calc(100vw - 26px));
      z-index:2147483001;display:grid;gap:9px;pointer-events:none}
    .disprotelMesaToast{pointer-events:auto;position:relative;background:#fff;color:#18394f;
      border:1px solid #bfd5e2;border-left:5px solid #1379ac;border-radius:13px;
      box-shadow:0 12px 28px #19395538;padding:12px 32px 12px 13px;font:600 12px/1.4 system-ui,sans-serif;
      animation:disprotelMesaIn .24s ease-out}
    .disprotelMesaToast.ok{border-left-color:#159467}
    .disprotelMesaToast.warn{border-left-color:#d6a029}
    .disprotelMesaTitle{font-size:13px;font-weight:800}
    .disprotelMesaMeta{font-size:10px;color:#587587;margin-top:4px}
    .disprotelMesaDetails{margin-top:8px;padding-top:7px;border-top:1px solid #e0ebf0;
      font-size:11px;font-weight:500;display:grid;gap:4px;overflow-wrap:anywhere}
    .disprotelMesaDetails strong{font-weight:800}
    .disprotelMesaClose{position:absolute;right:5px;top:3px;font-size:22px;line-height:1;
      background:transparent;border:0;padding:5px 8px;cursor:pointer;color:#587080}
    @keyframes disprotelMesaIn{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:none}}
    @media(max-width:680px){#disprotelMesaToastStack{top:64px;right:8px;width:calc(100vw - 16px)}}
    @media(prefers-reduced-motion:reduce){.disprotelMesaToast{animation:none}}
   `;
   document.head.append(s);root=document.createElement('div');root.id='disprotelMesaToastStack';
   root.setAttribute('aria-label','Notificaciones de Mesa Técnica');document.body.append(root);return root;
 }
 function enrich(card){
   const code=String(card.dataset.ot||''),meta=orderDetails.get(code)||{},
     details=card.querySelector('.disprotelMesaDetails');
   if(!details)return;
   details.replaceChildren();
   const info=card._mesaInfo||{};
   const rows=[
     ['Cliente',meta.cliente||''],
     ['Tipo de trabajo',typeLabel(meta.tipo||info.tipo||'')],
     ['Acciones',info.detail||'']
   ].filter(([,v])=>v);
   details.hidden=rows.length===0;
   for(const [label,value] of rows){
     const line=document.createElement('div'),strong=document.createElement('strong');
     strong.textContent=label+': ';line.append(strong,document.createTextNode(value));details.append(line);
   }
 }
 function show(d){
   const info=describe(d);if(!info)return;
   const root=ensure(),card=document.createElement('section');card.className='disprotelMesaToast '+info.tone;
   card.setAttribute('role','status');card.dataset.ot=info.ot;card._mesaInfo=info;
   const title=document.createElement('div');title.className='disprotelMesaTitle';title.textContent=info.icon+' '+info.title;
   const meta=document.createElement('div');meta.className='disprotelMesaMeta';meta.textContent=info.ot+(info.grupo?' · '+info.grupo:'');
   const extra=document.createElement('div');extra.className='disprotelMesaDetails';extra.hidden=true;
   const close=document.createElement('button');close.type='button';close.className='disprotelMesaClose';
   close.textContent='×';close.setAttribute('aria-label','Cerrar aviso');
   let timeout;const remove=()=>{clearTimeout(timeout);card.remove()};
   close.onclick=remove;card.append(title,meta,extra,close);root.prepend(card);enrich(card);
   while(root.children.length>4)root.lastElementChild.remove();
   timeout=setTimeout(remove,16000);
 }
 window.addEventListener('disprotel:ot-resumen',event=>{
   const list=event?.detail?.orders;if(!Array.isArray(list))return;
   for(const o of list.slice(0,300))if(o?.ot)orderDetails.set(String(o.ot),{
     cliente:String(o.cliente||'').trim().slice(0,160),tipo:String(o.tipo||'').trim().slice(0,90)
   });
   document.querySelectorAll('#disprotelMesaToastStack .disprotelMesaToast').forEach(enrich);
 });
 window.addEventListener('disprotel:mesa-hito',event=>{
   const d=event?.detail||{},info=describe(d);if(!info||!info.ot)return;
   const key=[info.ot,norm(d.area),norm(d.estado),norm(d.destino)].join('|'),now=Date.now();
   for(const [key,at] of seen)if(now-at>60000)seen.delete(key);
   if(seen.has(key)&&now-seen.get(key)<5000)return;
   seen.set(key,now);
   if(document.hidden){pending.push(d);if(pending.length>8)pending.shift()}else show(d);
 });
 document.addEventListener('visibilitychange',()=>{
   if(document.hidden)return;
   pending.splice(0,8).forEach(show);
 });
})();