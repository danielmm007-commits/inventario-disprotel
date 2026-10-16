/* Diagnostico SRI PC Scanner v1.7 — solo lectura, sin reclamar trabajo ni acceder al SRI. */
(function(){
 'use strict';
 const api='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-sri-control-pagos';
 function make(tag,text){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e}
 function setup(){
  const reference=document.getElementById('sriAgentEnrollResult');
  if(!reference||document.getElementById('sriAgentStatePanel'))return;
  const parent=reference.closest('.panel');
  if(!parent)return;
  const panel=make('div');panel.id='sriAgentStatePanel';panel.className='panel';
  panel.style.cssText='margin:10px 0;padding:13px;border:1px solid #b9cddb;background:#f6fafe';
  const title=make('strong','Estado de recuperación de XML · PC Scanner');
  const explanation=make('p','Comprobación en Supabase. La credencial activa no significa que la PC esté ejecutando el agente. El contacto se mide desde la activación de este diagnóstico.');explanation.className='hint';
  const button=make('button','Consultar estado');button.type='button';
  button.style.cssText='margin-bottom:8px';
  const status=make('p','Aún no se ha consultado el estado del agente.');status.className='hint';status.setAttribute('role','status');
  const table=make('div');table.style.cssText='display:flex;flex-wrap:wrap;gap:8px;margin:8px 0';
  const categories=[['pendiente','Pendientes'],['procesando','En proceso'],['importado','Importadas'],['error','Errores']];
  function refreshCounts(counts){table.replaceChildren();categories.forEach(([id,label])=>{const cell=make('div');cell.style.cssText='border:1px solid #d2dce4;border-radius:8px;padding:7px 10px;min-width:100px;background:#fff';
   const strong=make('strong',String(counts[id]??0));strong.style.cssText='display:block;font-size:19px';cell.append(strong,make('small',label));table.append(cell)})}
  async function refresh(){
   button.disabled=true;status.textContent='Consultando el servidor…';
   try{
    const session=JSON.parse(sessionStorage.getItem('disprotel_login_general_v2')||'null');
    if(!session?.session_token)throw new Error('Primero inicia sesión desde DISPROTEL.');
    const response=await fetch(api,{method:'POST',headers:{'Content-Type':'application/json','x-session':session.session_token},body:JSON.stringify({action:'agent_status'})});
    const result=await response.json();
    if(!response.ok||!result.ok)throw new Error(result.error||'No se pudo consultar el estado.');
    refreshCounts(result.queue||{});
    const last=result.last_contact?new Date(result.last_contact).toLocaleString('es-EC'):'Sin contacto registrado';
    const label=result.agent_online?'Contacto reciente (<5 minutos)':result.agent_configured?'Sin contacto reciente':'Agente sin credencial activa';
    status.textContent=label+' · Último contacto: '+last+'. '+(result.message||'');
   }catch(e){status.textContent='Consulta no disponible: '+(e.message||String(e))}
   finally{button.disabled=false}
  }
  button.onclick=refresh;
  panel.append(title,explanation,button,status,table);
  parent.insertAdjacentElement('afterend',panel);
  document.querySelectorAll('[data-tab="setup"]').forEach(x=>x.addEventListener('click',refresh));
  if(document.getElementById('setup')?.classList.contains('on'))refresh();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
