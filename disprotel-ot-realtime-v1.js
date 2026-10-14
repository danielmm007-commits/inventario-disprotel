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
  const CHANNEL='disprotel:ot-eventos';
  const SDK='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.95.0/dist/umd/supabase.min.js';
  let client=null,lastRevision='',lastEventAt=0;
  const read=()=>{try{return JSON.parse(sessionStorage.getItem(SESSION_KEY)||'{}')}catch{return {}}};
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
          const revision=String(payload?.payload?.revision||'');
          const now=Date.now();
          // Una unica actualizacion cuando llegan varios eventos juntos.
          if(revision&&revision===lastRevision)return;
          if(now-lastEventAt<300)return;
          lastRevision=revision;lastEventAt=now;
          emit('disprotel:ot-evento',{revision});
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
