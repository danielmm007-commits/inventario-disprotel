(()=>{
if(window.__mesaTecnicaFernandoV6)return;window.__mesaTecnicaFernandoV6=true;

const API_REMOTE='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-acceso-remoto';
const API_IP='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-ip-candidatos';
const KEY='disprotel_login_general_v2';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const up=v=>String(v??'').toLocaleUpperCase('es-EC');
const ses=()=>{try{return JSON.parse(sessionStorage.getItem(KEY)||'null')||{}}catch{return{}}};
const fmt=v=>{if(!v)return'—';try{return new Date(v).toLocaleString('es-EC')}catch{return String(v)}};

async function post(url,action,p={}){
  const s=ses();
  const r=await fetch(url+'?t='+Date.now(),{
    method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({session_token:s.session_token||'',usuario:s.usuario||'',pin:'',action,...p})
  });
  const d=await r.json().catch(()=>({error:'Respuesta inválida'}));
  if(!r.ok)throw new Error(d.error||'Error');
  return d;
}
const apiRemote=(action,p={})=>post(API_REMOTE,action,p);
const apiIp=(action,p={})=>post(API_IP,action,p);

function ocultarLegacy(){
  const sec=document.getElementById('secPend');if(sec)sec.style.display='none';
  const viejo=document.getElementById('accesoRemotoFernando');if(viejo)viejo.style.display='none';
}
function style(){
  if(document.getElementById('mesaCampoV6Style'))return;
  const s=document.createElement('style');s.id='mesaCampoV6Style';s.textContent=`
    #mesaTecnicaFernando{border:2px solid #2d7fd1;background:#f8fbff}
    .mesaHead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}
    .mesaHead h2{margin:0;color:#0b356f}
    .mesaHead p{margin:5px 0 0}
    .mesaStats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}
    .mesaStat{padding:10px 12px;border:1px solid #d7e1e5;border-radius:12px;background:#fff}
    .mesaStat b{display:block;font-size:22px;color:#0b356f}.mesaStat span{font-size:10px;font-weight:800;color:#60737c}
    .campoReq{border:1px solid #d7e1e5;border-left:5px solid #2d7fd1;border-radius:14px;padding:13px;margin-top:10px;background:#fff}
    .campoReq.remote{border-left-color:#e68a00}.campoReq.wait{border-left-color:#9aaab3;background:#fafcfd}
    .campoTop{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap}
    .campoType{font-size:12px;font-weight:1000;color:#0b356f}.campoReq.remote .campoType{color:#9a5c00}
    .campoMeta{font-size:11px;color:#60737c;margin-top:4px}.campoTitle{font-size:15px;font-weight:900;margin-top:3px}
    .campoBadge{display:inline-block;padding:5px 8px;border-radius:999px;background:#e8f2fb;color:#0b5d9b;font-size:9px;font-weight:1000}
    .campoBadge.remote{background:#fff1d9;color:#925900}.campoBadge.wait{background:#edf1f3;color:#5f6f77}
    .campoActions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:10px}
    .campoReq button{margin-top:7px}.campoActions button{margin-top:0}
    .candMini{margin-top:9px;padding:10px;border:1px solid #d7e1e5;border-radius:11px;background:#f9fcfd}
    .ipBig{font-size:19px;font-weight:1000;margin:4px 0}
    .remoteLinks{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:9px}
    .remoteLinks a{display:block;text-align:center;text-decoration:none;border-radius:10px;padding:10px;background:#17313d;color:#fff;font-weight:800}
    .remoteLinks a:last-child{background:#167348}
    .eviBox{margin-top:9px;padding:10px;border:1px solid #e4b341;border-radius:11px;background:#fffaf0}
    .eviRow{display:flex;gap:9px;align-items:center}.eviRow img{width:90px;height:64px;object-fit:cover;border-radius:8px;border:2px solid #e4b341;cursor:pointer}
    .emptyMesa{padding:22px 10px;text-align:center;color:#60737c}
    @media(max-width:650px){.mesaStats{grid-template-columns:1fr}.campoActions,.remoteLinks{grid-template-columns:1fr}}
  `;document.head.appendChild(s);
}
function crear(){
  const app=document.getElementById('app'),ref=document.getElementById('secPend');if(!app||!ref)return;
  style();ocultarLegacy();
  let box=document.getElementById('mesaTecnicaFernando');
  if(!box){
    box=document.createElement('section');box.className='card';box.id='mesaTecnicaFernando';
    box.innerHTML=`
      <div class="mesaHead"><div><h2>🧰 MESA TÉCNICA · REQUERIMIENTOS DE CAMPO</h2>
      <p class="muted">Aquí aparecen únicamente las solicitudes que requieren intervención de Fernando desde campo.</p></div>
      <button id="recargarMesa" class="secondary" style="width:auto;margin:0">🔄 ACTUALIZAR</button></div>
      <div class="mesaStats">
        <div class="mesaStat"><b id="mesaTotal">0</b><span>REQUIEREN ACCIÓN</span></div>
        <div class="mesaStat"><b id="mesaIpCount">0</b><span>SOLICITUDES DE IP</span></div>
        <div class="mesaStat"><b id="mesaRemoteCount">0</b><span>ACCESOS REMOTOS</span></div>
      </div>
      <div id="listaMesa"></div>`;
    ref.parentNode.insertBefore(box,ref);
    document.getElementById('recargarMesa').onclick=()=>cargar(true);
    cargar(true);
  }
  if(!document.body.dataset.mesaTabsV6){
    document.body.dataset.mesaTabsV6='1';
    document.getElementById('tabPend')?.addEventListener('click',()=>setTimeout(()=>{box.style.display='';ocultarLegacy();cargar(true)},0));
    document.getElementById('tabHist')?.addEventListener('click',()=>setTimeout(()=>{box.style.display='none'},0));
  }
}
function scannerInfo(s){
  const h=s.scanner_heartbeat||{};
  if(!h.updated_at)return'Scanner sin latido registrado para este router';
  const mins=Number(h.minutos_sin_latido||0);
  const estado=h.estado_operativo==='OPERATIVO'?'🟢 Scanner operativo':'🔴 Scanner sin señal';
  return estado+' · último latido '+(mins<=0?'hace menos de 1 min':'hace '+mins+' min');
}
function ipCard(s){
  const o=s.orden||{},sol=s.solicitante||{},cs=s.candidatos||[];
  const cands=cs.length?cs.map(c=>`
    <div class="candMini"><div class="muted">IP detectada por scanner</div><div class="ipBig">${esc(c.address)}</div>
    <div class="muted">${esc(c.queue_name||c.comentario||'Sin comentario')}</div>
    <button onclick="confirmarIpMesa('${o.id}','${c.id}')" style="background:#167348">✅ CONFIRMAR ESTA IP</button></div>`).join(''):
    `<div class="candMini"><div class="muted">⏳ Aún sin candidata confiable.</div><div class="muted" style="margin-top:4px">${esc(scannerInfo(s))}</div></div>`;
  return `<article class="campoReq"><div class="campoTop"><div><div class="campoType">🌐 SOLICITUD DE IP</div>
    <div class="campoTitle">${esc(o.id_orden||'')} · ${esc(up(o.cliente_nombre||''))}</div>
    <div class="campoMeta">Solicitó: ${esc(up(sol.nombre||'—'))} · Grupo: ${esc(up(o.grupo_asignado||sol.unidad_grupo||'—'))}</div>
    <div class="campoMeta">${esc(fmt(s.solicitado_at))}</div></div><span class="campoBadge">PENDIENTE FERNANDO</span></div>
    ${cands}
    <button class="secondary" onclick="corregirIpMesa('${s.id}','${o.id}','${esc(cs[0]?.address||'')}')">✏️ INGRESAR / CORREGIR IP MANUAL</button>
  </article>`;
}
function remoteEvidence(x){
  const ev=x.evidencia;
  return `<div class="eviBox"><b>📸 Evidencia de acceso remoto</b>
    ${ev?.url?`<div class="eviRow" style="margin-top:8px"><img src="${esc(ev.url)}" onclick="window.open(this.src,'_blank')"><div><b>✅ Evidencia cargada</b><div class="muted">${esc(ev.registrado_por||'usuario autorizado')}</div></div></div>`:'<div class="muted" style="margin-top:5px">Sin evidencia adjunta.</div>'}
    <label class="secondary" style="display:flex;align-items:center;justify-content:center;border-radius:11px;padding:11px;font-weight:800;cursor:pointer;margin-top:8px">🖼️ CARGAR EVIDENCIA<input type="file" accept="image/jpeg,image/png,image/webp" style="display:none" onchange="subirArMesa(event,'${x.orden_id}')"></label>
  </div>`;
}
function remoteCard(x){
  const espera=x.estado==='REQUIERE_CORRECCION';
  const links=x.ip_asignada&&x.urls_acceso?`<div class="remoteLinks"><a href="${esc(x.urls_acceso.http)}" target="_blank" rel="noopener">🔗 ABRIR HTTP</a><a href="${esc(x.urls_acceso.https)}" target="_blank" rel="noopener">🔒 ABRIR HTTPS</a></div>`:
    '<div class="muted" style="margin-top:8px">La OT todavía no tiene una IP definitiva para abrir acceso.</div>';
  return `<article class="campoReq remote ${espera?'wait':''}"><div class="campoTop"><div><div class="campoType">🔐 ACCESO REMOTO</div>
    <div class="campoTitle">${esc(x.id_orden||'')} · ${esc(up(x.cliente_nombre||''))}</div>
    <div class="campoMeta">Grupo: ${esc(up(x.grupo_asignado||'—'))} · ${esc(fmt(x.solicitado_at))}</div>
    ${x.ip_asignada?`<div class="campoMeta">IP: <b>${esc(x.ip_asignada)}</b> · puerto 5000</div>`:''}</div>
    <span class="campoBadge ${espera?'wait':'remote'}">${espera?'ESPERANDO CORRECCIÓN EN CAMPO':'PENDIENTE FERNANDO'}</span></div>
    ${x.observacion?`<div class="msg ${espera?'err':'ok'}">${esc(x.observacion)}</div>`:''}
    ${links}${remoteEvidence(x)}
    ${espera?'':`<div class="campoActions"><button onclick="confirmarRemotoMesa('${x.orden_id}')" style="background:#167348">✅ CONFIRMAR ACCESO</button><button class="secondary" onclick="corregirRemotoMesa('${x.orden_id}')">⚠️ PEDIR CORRECCIÓN</button></div>`}
  </article>`;
}
async function cargar(forzar=false){
  const out=document.getElementById('listaMesa');if(!out)return;
  try{
    ocultarLegacy();
    const [ipd,ard]=await Promise.all([apiIp('pending-review'),apiRemote('pending')]);
    const ips=ipd.solicitudes||[],remotos=ard.solicitudes||[];
    const accionesRemoto=remotos.filter(x=>x.estado==='SOLICITADO');
    document.getElementById('mesaIpCount').textContent=ips.length;
    document.getElementById('mesaRemoteCount').textContent=accionesRemoto.length;
    document.getElementById('mesaTotal').textContent=ips.length+accionesRemoto.length;
    const items=[
      ...ips.map(x=>({t:new Date(x.solicitado_at||0).getTime(),html:ipCard(x)})),
      ...accionesRemoto.map(x=>({t:new Date(x.solicitado_at||0).getTime(),html:remoteCard(x)})),
      ...remotos.filter(x=>x.estado==='REQUIERE_CORRECCION').map(x=>({t:new Date(x.solicitado_at||0).getTime()+1e15,html:remoteCard(x)}))
    ].sort((a,b)=>a.t-b.t);
    const sig=JSON.stringify([ips.map(x=>[x.id,x.detector_estado,x.candidatos?.map(c=>[c.id,c.address])]),remotos.map(x=>[x.orden_id,x.estado,x.observacion,x.evidencia?.id,x.ip_asignada])]);
    if(!forzar&&out.dataset.sig===sig)return;
    out.dataset.sig=sig;
    out.innerHTML=items.length?items.map(x=>x.html).join(''):'<div class="emptyMesa">✅ No hay requerimientos de campo pendientes.<br><span class="muted">Cuando un técnico solicite IP o confirmación de acceso remoto, aparecerá aquí.</span></div>';
  }catch(e){out.innerHTML='<div class="msg err">'+esc(e.message)+'</div>'}
}
window.confirmarIpMesa=async(orden,cand)=>{
  if(!confirm('¿Confirmar esta IP como definitiva?'))return;
  try{const d=await apiIp('confirm',{orden_id:orden,candidato_id:cand});if(typeof show==='function')show('✅ IP '+(d.ip||'')+' confirmada.','ok');await cargar(true)}
  catch(e){if(typeof show==='function')show(e.message,'err');else alert(e.message)}
};
window.corregirIpMesa=async(sol,orden,actual)=>{
  if(!sol){alert('La solicitud de IP aún no está disponible para edición manual.');return}
  const ip=prompt('IP correcta:',actual||'');if(!ip)return;
  const observacion=prompt('Observación opcional:','')||'';
  if(!confirm('¿Confirmar '+ip.trim()+' como IP definitiva?'))return;
  try{const d=await apiIp('assign-manual',{orden_id:orden,solicitud_id:sol,ip:ip.trim(),observacion});if(typeof show==='function')show('✅ IP '+(d.ip||ip.trim())+' confirmada.','ok');await cargar(true)}
  catch(e){if(typeof show==='function')show(e.message,'err');else alert(e.message)}
};
async function dataUrl(f){return await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result||''));r.onerror=rej;r.readAsDataURL(f)})}
window.subirArMesa=async(e,id)=>{
  const f=e.target.files?.[0];if(!f)return;
  try{await apiRemote('upload',{orden_id:id,mime_type:f.type||'image/jpeg',base64:await dataUrl(f)});if(typeof show==='function')show('✅ Evidencia cargada.','ok');await cargar(true)}
  catch(err){if(typeof show==='function')show(err.message,'err');else alert(err.message)}
  finally{e.target.value=''}
};
window.confirmarRemotoMesa=async id=>{
  if(!confirm('¿Confirmar que el acceso remoto funciona correctamente?'))return;
  try{await apiRemote('confirm',{orden_id:id});await cargar(true);if(typeof show==='function')show('✅ Acceso remoto confirmado.','ok')}
  catch(e){if(typeof show==='function')show(e.message,'err');else alert(e.message)}
};
window.corregirRemotoMesa=async id=>{
  const observacion=prompt('¿Qué debe corregir el técnico?');if(!observacion)return;
  try{await apiRemote('correction',{orden_id:id,observacion});await cargar(true);if(typeof show==='function')show('⚠️ Corrección enviada al técnico.','ok')}
  catch(e){if(typeof show==='function')show(e.message,'err');else alert(e.message)}
};

const obs=new MutationObserver(()=>{ocultarLegacy();if(!document.getElementById('app')?.classList.contains('hidden'))crear()});
const iniciar=()=>{obs.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});setTimeout(crear,250)};
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',iniciar):iniciar();
setInterval(()=>{ocultarLegacy();const box=document.getElementById('mesaTecnicaFernando');if(box&&box.style.display!=='none')cargar(false)},8000);
})();