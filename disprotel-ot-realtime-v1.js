/* DISPROTEL OT Realtime V1 - eventos privados SIN datos personales.
   Requiere migracion de RLS+trigger, y sesion de Supabase Auth del login.
   Falla de forma segura: los paneles mantienen consultas de respaldo. */
(()=>{
  'use strict';
  if(window.__disprotelOtRealtimeV1)return;
  window.__disprotelOtRealtimeV1=true;
  window.DISPROTEL_OT_RT_CONNECTED=false;
  const URL='https://ajnbswrwnjpjypjiorye.supabase.co';
  const KEY="sb_publishable_PUj8G-mCFGniennS16O7UQ_eIeL482Y";
  const SESSION_KEY='disprotel_login_general_v2';
  // Piloto habilitado exclusivamente para los perfiles seleccionados.
  const PILOT_IDS=new Set([
    '986f9610-5144-42d6-b467-cace9ea8983f',
    '8c68e659-bc2d-4ee9-a435-cd0cb5691b12'
  ]);
  const CHANNEL='disprotel:ot-eventos';
  const SDK='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  let client=null,lastRevision='',notifyTimer=null;
  const read=()=>{try{return JSON.parse(sessionStorage.getItem(SESSION_KEY)||'{}')}catch{return {}}};
  window.DISPROTEL_OT_RT_PILOT=PILOT_IDS.has(String(read().id||''));
  const emit=(type,detail)=>window.dispatchEvent(new CustomEvent(type,{detail}));
  function connection(ok){
    const previous=window.DISPROTEL_OT_RT_CONNECTED;
    window.DISPROTEL_OT_RT_CONNECTED=ok===true;
    if(previous!==window.DISPROTEL_OT_RT_CONNECTED){
      emit('disprotel:ot-conexion',{connected:window.DISPROTEL_OT_RT_CONNECTED});
    }
  }
  async function loadSdk(){
    if(window.supabase?.createClient)return;
    await new Promise((resolve,reject)=>{
      const el=document.createElement('script');
      el.src=SDK;el.async=true;
      const timeout=setTimeout(()=>reject(new Error('Tiempo de carga de Realtime agotado')),10000);
      el.onload=()=>{clearTimeout(timeout);window.supabase?.createClient?resolve():reject(new Error('SDK Realtime no disponible'))};
      el.onerror=()=>{clearTimeout(timeout);reject(new Error('No se pudo descargar Realtime'))};
      document.head.appendChild(el);
    });
  }
  function storeAuth(session){
    if(!session?.access_token||!session?.refresh_token)return;
    const existing=read();if(!existing?.session_token)return;
    sessionStorage.setItem(SESSION_KEY,JSON.stringify({
      ...existing,ot_auth_session:{
        access_token:session.access_token,refresh_token:session.refresh_token
      }
    }));
  }
  async function init(){
    if(!window.DISPROTEL_OT_RT_PILOT)return;
    const initial=read();
    const tokens=initial.ot_auth_session;
    if(!initial.session_token||!tokens?.access_token||!tokens?.refresh_token)return;
    try{
      await loadSdk();
      client=window.supabase.createClient(URL,KEY,{
        auth:{persistSession:false,autoRefreshToken:true,detectSessionInUrl:false}
      });
      client.auth.onAuthStateChange((_event,session)=>{
        if(session?.access_token){
          storeAuth(session);
          client.realtime.setAuth(session.access_token);
        }
      });
      const {data,error}=await client.auth.setSession({
        access_token:tokens.access_token,refresh_token:tokens.refresh_token
      });
      if(error||!data?.session?.access_token)throw error||new Error('Sesión Auth no disponible');
      storeAuth(data.session);
      client.realtime.setAuth(data.session.access_token);
      client.channel(CHANNEL,{config:{private:true}})
        .on('broadcast',{event:'ot_changed'},payload=>{
          const raw=payload?.payload||{};
          const revision=String(raw.revision||'');
          if(revision&&revision===lastRevision)return;
          lastRevision=revision;
          // Alertas de Mesa Tecnica: SIN refrescar el dashboard por cada evento.
          // Mensajes sin IP, SN, notas ni datos del cliente, en canal privado.
          if(raw.fuente==='MESA'){
            emit('disprotel:mesa-hito',{
              revision,
              area:String(raw.area||'').slice(0,20),
              ot:String(raw.ot||'').slice(0,64),
              grupo:String(raw.grupo||'').slice(0,120),
              tipo:String(raw.tipo||'').slice(0,90),
              estado:String(raw.estado||'').slice(0,50),
              anterior:String(raw.anterior||'').slice(0,50),
              actor:String(raw.actor||'').slice(0,60),
              destino:String(raw.destino||'').slice(0,20),
              destinatario:String(raw.destinatario||'').slice(0,64),
              acciones:Array.isArray(raw.acciones)?raw.acciones.map(x=>String(x).slice(0,40)).slice(0,8):[]
            });
            return;
          }
          // Un evento individual por hito para las notificaciones de Fernando.
          // El refresco general permanece agrupado para reducir invocaciones.
          if(raw.ot&&raw.estado){
            emit('disprotel:ot-hito',{
              revision,
              ot:String(raw.ot).slice(0,64),
              estado:String(raw.estado).slice(0,64),
              anterior:String(raw.anterior||'').slice(0,64),
              grupo:String(raw.grupo||'').slice(0,120),
              actor:String(raw.actor||'').slice(0,60),
              accion:String(raw.accion||'').slice(0,12)
            });
          }
          clearTimeout(notifyTimer);
          notifyTimer=setTimeout(()=>emit('disprotel:ot-evento',{revision:lastRevision}),400);
        })
        .subscribe(status=>{
          connection(status==='SUBSCRIBED');
          if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){
            console.warn('DISPROTEL OT: canal privado no disponible; siguen los sondeos de respaldo');
          }
        });
    }catch(e){
      connection(false);
      console.warn('DISPROTEL OT: Realtime deshabilitado, funcionan las consultas de respaldo:',e?.message||e);
    }
  }
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden)emit('disprotel:ot-sincronizar',{motivo:'volver_a_pagina'});
  });
  window.addEventListener('online',()=>emit('disprotel:ot-sincronizar',{motivo:'red_reconectada'}));
  init();
})();
