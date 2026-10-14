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
 // El panel principal conserva la notificacion cuando un modulo abre en iframe.
 if(window.self!==window.top)return;
 const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim().replace(/[\s-]+/g,'_');
 const seen=new Map(),pending=[],orderDetails=new Map(),requests=new Map();
 const STORE='disprotel_mesa_pendientes_fernando_v1';
 const AUDIO_STORE='disprotel_mesa_sonido_v1';
 const REMIND_MS=5*60*1000,WORKING_MS=15*60*1000,MAX_AGE=12*60*60*1000;
 let audio=null,audioRequested=false,lastBeep=0;
 try{audioRequested=sessionStorage.getItem(AUDIO_STORE)==='true'}catch{}
 const keyFor=d=>norm(d.area)+'|'+String(d.solicitud_id||d.ot||'');
 function save(){
   if(id!==FERNANDO)return;
   try{sessionStorage.setItem(STORE,JSON.stringify([...requests.values()].slice(-30)))}catch{}
 }
 function restore(){
   if(id!==FERNANDO)return;
   try{
     const rows=JSON.parse(sessionStorage.getItem(STORE)||'[]'),now=Date.now();
     if(Array.isArray(rows))for(const r of rows){
       if(!r||!r.key||!r.created||now-r.created>MAX_AGE)continue;
       if(!r.data||!r.data.ot)continue;
       requests.set(r.key,{key:String(r.key),created:Number(r.created),
         due:Number(r.due)||now+REMIND_MS,phase:String(r.phase||'pendiente'),data:r.data});
     }
   }catch{}
 }
 function keyStatus(d){
   const a=norm(d.area),st=norm(d.estado);
   const open=(a==='IP'&&st==='PENDIENTE')||
      (a==='ONU'&&st==='SOLICITADO')||
      (a==='REMOTO'&&st==='SOLICITADO')||
      (a==='MESA'&&st==='PENDIENTE');
   const closed=(a==='IP'&&['ASIGNADA','CANCELADA'].includes(st))||
      (a==='ONU'&&['CONFIRMADO','REQUIERE_CORRECCION'].includes(st))||
      (a==='REMOTO'&&['CONFIRMADO','REQUIERE_CORRECCION'].includes(st))||
      (a==='MESA'&&st==='ATENDIDO');
   return{open,closed};
 }
 function track(d){
   if(id!==FERNANDO||!d.ot||!d.area)return;
   const key=keyFor(d),status=keyStatus(d),now=Date.now();
   if(norm(d.destino)==='SUPERVISOR'&&status.open){
     if(!requests.has(key)){
       requests.set(key,{key,created:now,due:now+REMIND_MS,phase:'pendiente',
         data:{area:d.area,ot:d.ot,orden_uuid:d.orden_uuid||'',solicitud_id:d.solicitud_id||'',
           grupo:d.grupo||'',tipo:d.tipo||'',estado:d.estado,actor:d.actor||'',
           destino:'SUPERVISOR',acciones:Array.isArray(d.acciones)?d.acciones:[]}});
       save();
     }
   }
   if(norm(d.destino)==='TECNICO'&&status.closed){
     if(requests.delete(key))save();
     for(const toast of document.querySelectorAll('#disprotelMesaToastStack .disprotelMesaToast')){
       if(toast.dataset.reqKey===key)toast.remove();
     }
   }
   updateBadge();
 }
 function defer(key,ms,phase){
   const r=requests.get(key);if(!r)return;
   r.due=Date.now()+ms;r.phase=phase;save();updateBadge();
 }
 async function playSound(force=false){
   if(!force&&!audioRequested)return;
   if(!force&&Date.now()-lastBeep<3000)return;
   try{
     const Audio=window.AudioContext||window.webkitAudioContext;
     if(!Audio)return;
     audio=audio||new Audio();
     if(audio.state==='suspended'){
       // Los navegadores exigen un gesto de usuario antes de reproducir audio.
       if(force)await audio.resume();
       else{audio.resume().catch(()=>{});return}
     }
     if(audio.state!=='running')return;
     lastBeep=Date.now();
     for(const [offset,freq] of [[0,660],[.16,880]]){
       const osc=audio.createOscillator(),gain=audio.createGain(),start=audio.currentTime+offset;
       osc.type='sine';osc.frequency.setValueAtTime(freq,start);
       gain.gain.setValueAtTime(.0001,start);
       gain.gain.exponentialRampToValueAtTime(.07,start+.02);
       gain.gain.exponentialRampToValueAtTime(.0001,start+.19);
       osc.connect(gain);gain.connect(audio.destination);osc.start(start);osc.stop(start+.21);
     }
   }catch(e){console.debug('DISPROTEL Mesa audio',e)}
 }
 function enableAudio(){
   audioRequested=true;
   try{sessionStorage.setItem(AUDIO_STORE,'true')}catch{}
   playSound(true);
   for(const button of document.querySelectorAll('.disprotelMesaEnableSound'))button.remove();
 }
 function openRequirement(d){
   const uuid=String(d.orden_uuid||'');
   if(!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(uuid)){
     // No adivinar IDs de OT; conservar la alerta para atención manual.
     location.href='panel-supervisor-vivo-v2.html';
     return;
   }
   const tab=norm(d.tipo).startsWith('INSTALACION')?'INSTALACIONES':'SOPORTES';
   try{sessionStorage.setItem('disprotel_mesa_focus_v1',JSON.stringify({
     orden_id:uuid,focus:norm(d.area)==='REMOTO'?'acceso-remoto':'mesa-ot',tab,at:Date.now()
   }))}catch{}
   const focus=norm(d.area)==='REMOTO'?'acceso-remoto':'mesa-ot';
   // Mismo enlace que utiliza el boton ATENDER de Supervisión Técnica.
   const url='asignacion-ip.html?mesa_tab='+encodeURIComponent(tab)+
      '&focus='+encodeURIComponent(focus)+'&orden='+encodeURIComponent(uuid);
   location.assign(url);
 }
 function updateBadge(){
   const badge=document.getElementById('disprotelMesaPendientesBadge');
   if(!badge)return;
   if(id!==FERNANDO||!requests.size){badge.hidden=true;return}
   const count=[...requests.values()].filter(r=>r.phase!=='en_gestion').length;
   badge.textContent='🔔 Mesa: '+requests.size+' sin resolver'+(count?' · '+count+' por atender':' · en gestión');
   badge.hidden=false;
 }
 function checkReminders(){
   if(id!==FERNANDO)return;
   const now=Date.now();let shown=0,dirty=false;
   for(const [key,r] of requests){
     if(now-r.created>MAX_AGE){requests.delete(key);dirty=true;continue}
     if(now<r.due||document.hidden)continue;
     r.due=now+(r.phase==='en_gestion'?WORKING_MS:REMIND_MS);
     if(shown++<2){show(r.data,true);playSound()}
     dirty=true;
   }
   if(dirty)save();updateBadge();
 }
 restore();
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
    #disprotelMesaToastStack.supervisor{top:244px}
    .disprotelMesaToast.ok{border-left-color:#159467}
    .disprotelMesaToast.warn{border-left-color:#d6a029}
    .disprotelMesaTitle{font-size:13px;font-weight:800}
    .disprotelMesaMeta{font-size:10px;color:#587587;margin-top:4px}
    .disprotelMesaDetails{margin-top:8px;padding-top:7px;border-top:1px solid #e0ebf0;
      font-size:11px;font-weight:500;display:grid;gap:4px;overflow-wrap:anywhere}
    .disprotelMesaDetails strong{font-weight:800}
    .disprotelMesaActions{display:flex;flex-wrap:wrap;gap:5px;margin-top:9px}
    .disprotelMesaActions button{border:1px solid #cadee8;border-radius:8px;padding:6px 9px;
      background:#f1f7fb;color:#184965;font:700 11px system-ui;cursor:pointer}
    .disprotelMesaActions button.primary{background:#156a9d;border-color:#156a9d;color:#fff}
    .disprotelMesaActions button:hover{filter:brightness(.94)}
    .disprotelMesaSoundEnable{background:#eef6fc;color:#155a84;border:1px solid #c4dde9;
      border-radius:8px;padding:7px 10px;font:700 11px system-ui;pointer-events:auto;cursor:pointer}
    #disprotelMesaPendientesBadge{padding:7px 10px;background:#fff8db;color:#62460d;
      border:1px solid #e6c775;border-radius:9px;font:700 11px system-ui;pointer-events:auto}
    .disprotelMesaClose{position:absolute;right:5px;top:3px;font-size:22px;line-height:1;
      background:transparent;border:0;padding:5px 8px;cursor:pointer;color:#587080}
    @keyframes disprotelMesaIn{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:none}}
    @media(max-width:680px){#disprotelMesaToastStack{top:64px;right:8px;width:calc(100vw - 16px)}#disprotelMesaToastStack.supervisor{top:185px}}
    @media(prefers-reduced-motion:reduce){.disprotelMesaToast{animation:none}}
   `;
   document.head.append(s);root=document.createElement('div');root.id='disprotelMesaToastStack';
   root.setAttribute('aria-label','Notificaciones de Mesa Técnica');
   if(id===FERNANDO){
     root.className='supervisor';
     const badge=document.createElement('div');badge.id='disprotelMesaPendientesBadge';badge.hidden=true;
     root.append(badge);
   }
   if(!audioRequested){
     const enable=document.createElement('button');enable.type='button';
     enable.textContent='🔊 Activar sonido de Mesa';enable.className='disprotelMesaSoundEnable disprotelMesaEnableSound';
     enable.onclick=enableAudio;root.append(enable);
   }
   document.body.append(root);updateBadge();return root;
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
 function show(d,reminder=false){
   const info=describe(d);if(!info)return;
   const root=ensure(),card=document.createElement('section');card.className='disprotelMesaToast '+info.tone;
   card.setAttribute('role','status');card.dataset.ot=info.ot;card._mesaInfo=info;
   const title=document.createElement('div');title.className='disprotelMesaTitle';
   const entry=requests.get(keyFor(d));
   title.textContent=(reminder?(entry?.phase==='en_gestion'?'⏰ Sigue en gestión: ':'⏰ Recordatorio: '):'')+info.icon+' '+info.title;
   const meta=document.createElement('div');meta.className='disprotelMesaMeta';meta.textContent=info.ot+(info.grupo?' · '+info.grupo:'');
   const extra=document.createElement('div');extra.className='disprotelMesaDetails';extra.hidden=true;
   const close=document.createElement('button');close.type='button';close.className='disprotelMesaClose';
   close.textContent='×';close.setAttribute('aria-label','Cerrar aviso');
   let timeout;const remove=()=>{clearTimeout(timeout);card.remove()};
   close.onclick=remove;card.append(title,meta,extra,close);
   if(id===FERNANDO&&norm(d.destino)==='SUPERVISOR'&&keyStatus(d).open){
     const key=keyFor(d);
     card.dataset.reqKey=key;
     const actions=document.createElement('div');actions.className='disprotelMesaActions';
     const make=(label,primary,onClick)=>{
       const b=document.createElement('button');b.type='button';b.textContent=label;
       if(primary)b.className='primary';b.onclick=onClick;actions.append(b);return b;
     };
     make('Atender →',true,()=>{
       defer(key,WORKING_MS,'en_gestion');remove();openRequirement(d);
     });
     make('En gestión',false,()=>{
       defer(key,WORKING_MS,'en_gestion');remove();
     });
     make('Recordar en 5 min',false,()=>{
       defer(key,REMIND_MS,'pendiente');remove();
     });
     if(!audioRequested)make('🔊 Activar sonido',false,enableAudio).classList.add('disprotelMesaEnableSound');
     card.append(actions);
   }else if(!audioRequested){
     const actions=document.createElement('div');actions.className='disprotelMesaActions';
     const b=document.createElement('button');b.type='button';b.textContent='🔊 Activar sonido';
     b.className='disprotelMesaEnableSound';b.onclick=enableAudio;actions.append(b);card.append(actions);
   }
   root.prepend(card);enrich(card);
   while([...root.children].filter(el=>el.classList?.contains('disprotelMesaToast')).length>4){
     const oldest=[...root.children].filter(el=>el.classList?.contains('disprotelMesaToast')).at(-1);
     oldest?.remove();
   }
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
   const d=event?.detail||{};
   track(d);
   const info=describe(d);if(!info||!info.ot)return;
   const key=[info.ot,norm(d.area),norm(d.estado),norm(d.destino)].join('|'),now=Date.now();
   for(const [key,at] of seen)if(now-at>60000)seen.delete(key);
   if(seen.has(key)&&now-seen.get(key)<5000)return;
   seen.set(key,now);
   if(document.hidden){pending.push(d);if(pending.length>8)pending.shift()}
   else{show(d);playSound()}
 });
 document.addEventListener('visibilitychange',()=>{
   if(document.hidden)return;
   pending.splice(0,8).forEach(d=>{show(d);playSound()});
   checkReminders();
 });
 // Los recordatorios se gestionan SOLO en el navegador y no consultan Supabase.
 ensure(); // Permite activar el sonido ANTES de que llegue el primer requerimiento.
 if(id===FERNANDO){
   setInterval(checkReminders,15000);
   if(requests.size)checkReminders();
 }
})();