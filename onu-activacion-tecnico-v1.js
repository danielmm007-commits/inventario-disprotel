(()=>{
if(window.__onuActivacionTecnicoV2)return;window.__onuActivacionTecnicoV2=true;
const BASE='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/';
const API_MESA=BASE+'inventario-mesa-tecnica',API_DET=BASE+'inventario-onu-detector',API_EV=BASE+'inventario-evidencias-orden';
const KEY='disprotel_login_general_v2';
const orden=()=>new URLSearchParams(location.search).get('orden')||'';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>{if(!v)return'—';try{return new Date(v).toLocaleString('es-EC',{timeZone:'America/Guayaquil'})}catch{return String(v)}};
function ses(){try{return JSON.parse(sessionStorage.getItem(KEY)||'null')||JSON.parse(sessionStorage.getItem('disprotel_trabajos_test')||'null')||{}}catch{return{}}}
async function post(url,payload){const s=ses(),r=await fetch(url+'?t='+Date.now(),{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','x-session':s.session_token||''},body:JSON.stringify({session_token:s.session_token||'',...payload})});const d=await r.json().catch(()=>({error:'Respuesta inválida'}));if(!r.ok)throw new Error(d.error||'Error');return d}
const mesa=()=>post(API_MESA,{action:'status',orden_id:orden()});
const detectar=()=>post(API_DET,{action:'pending-list',orden_id:orden()});
const evidencia=()=>post(API_EV,{action:'context',orden_id:orden()});
function crear(){
 const ip=document.getElementById('ipEstado');if(!ip||document.getElementById('onuActivadaTecnico'))return;
 const box=document.createElement('div');box.id='onuActivadaTecnico';box.className='box';box.style.cssText='margin-top:12px;border:2px solid #f59e0b;background:#fffaf0';
 box.innerHTML='<b>📡 ONU / ONT · APOYO DE CAMPO</b><div id="estadoOnuTecnico" class="muted" style="margin-top:6px">Consultando Mesa técnica...</div><div id="fotoConfirmacionOnu" style="margin-top:10px"></div><hr style="border:0;border-top:1px solid #e5d8b0;margin:12px 0"><div id="serialOnuCampo"></div><input id="fotoSerialOnuInput" type="file" accept="image/*" capture="environment" style="display:none"><button id="fotoSerialOnuBtn" type="button" class="secondary" style="margin-top:8px">📷 FOTO DEL SERIAL DE LA ONU</button><div id="detectorOnuCampo" style="margin-top:12px"></div>';
 ip.insertAdjacentElement('afterend',box);
 document.getElementById('fotoSerialOnuBtn').onclick=()=>document.getElementById('fotoSerialOnuInput').click();
 document.getElementById('fotoSerialOnuInput').onchange=e=>subirSerial(e.target.files?.[0]);
 revisar(true);
}
async function jpeg(file){
 const u=URL.createObjectURL(file);try{
  const img=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=u});
  const scale=Math.min(1,1600/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);
  return await new Promise((ok,no)=>c.toBlob(b=>b?ok(b):no(new Error('No se pudo preparar la foto')),'image/jpeg',.82));
 }finally{URL.revokeObjectURL(u)}
}
function b64(blob){return new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(String(r.result).split(',')[1]);r.onerror=no;r.readAsDataURL(blob)})}
async function subirSerial(file){
 if(!file)return;const btn=document.getElementById('fotoSerialOnuBtn'),inp=document.getElementById('fotoSerialOnuInput');
 try{
  btn.disabled=true;btn.textContent='SUBIENDO FOTO...';
  const bl=await jpeg(file);
  await post(API_EV,{action:'upload',orden_id:orden(),tipo:'SERIAL_EQUIPO',mime_type:'image/jpeg',base64:await b64(bl),tomada_at:new Date().toISOString()});
  await revisar(true);
 }catch(e){alert('No se pudo guardar la foto del serial: '+e.message)}
 finally{btn.disabled=false;btn.textContent='📷 FOTO DEL SERIAL DE LA ONU';if(inp)inp.value=''}
}
async function elegir(sn,btn){
 try{
  btn.disabled=true;btn.textContent='IDENTIFICANDO...';
  await post(API_DET,{action:'identify',orden_id:orden(),onu_sn:sn});
  await revisar(true);
 }catch(e){alert(e.message);btn.disabled=false;btn.textContent='ESTA ES MI ONU'}
}
window.identificarOnuCampo=elegir;
function renderMesa(d){
 const box=document.getElementById('onuActivadaTecnico'),est=document.getElementById('estadoOnuTecnico'),foto=document.getElementById('fotoConfirmacionOnu'),onu=d.onu||null;
 const ev=onu?.evidencia_url?{url:onu.evidencia_url,created_at:onu.confirmado_at}:null;
 if(ev){box.style.border='2px solid #2ca55a';box.style.background='#f2fbf5';est.innerHTML='<b style="color:#167348">✅ ONU ACTIVADA / CONFIRMADA POR MESA TÉCNICA</b><div class="muted" style="margin-top:4px">'+esc(fmt(ev.created_at))+'</div>';foto.innerHTML='<img src="'+esc(ev.url)+'" alt="Confirmación ONU" style="width:110px;height:76px;object-fit:cover;border-radius:8px;border:1px solid #9bc9aa;cursor:pointer" onclick="window.open(this.src,\'_blank\')">'}
 else if(onu){est.innerHTML='<b>⏳ ONU SOLICITADA A MESA TÉCNICA</b><div class="muted" style="margin-top:4px">El lector Huawei revisará esta solicitud cuando el servicio local esté encendido.</div>';foto.innerHTML=''}
 else{est.innerHTML='<b>⚪ AÚN NO SOLICITADA</b><div class="muted" style="margin-top:4px">Se activará al pulsar SOLICITAR ACTIVACIÓN A MESA TÉCNICA.</div>';foto.innerHTML=''}
}
function renderEvidencia(d){
 const c=document.getElementById('serialOnuCampo'),ev=(d.evidencias||[]).find(x=>x.tipo_foto==='SERIAL');
 if(ev?.url)c.innerHTML='<b>📷 SERIAL ENVIADO POR CAMPO</b><div style="display:flex;gap:10px;align-items:center;margin-top:7px"><img src="'+esc(ev.url)+'" style="width:110px;height:76px;object-fit:cover;border-radius:8px;border:1px solid #ccd8de;cursor:pointer" onclick="window.open(this.src,\'_blank\')"><div class="muted">'+esc(fmt(ev.fecha_hora_captura))+'<br>Esta foto queda ligada a la OT para Mesa Técnica.</div></div>';
 else c.innerHTML='<b>📷 SERIAL DE LA ONU</b><div class="muted" style="margin-top:4px">Toma una foto clara de la etiqueta posterior. Sirve para que Fernando identifique la ONU cuando haya varias.</div>';
}
function renderDetector(d){
 const c=document.getElementById('detectorOnuCampo');if(!c)return;
 if(d.supported===false){c.innerHTML='<b>📡 DETECTOR HUAWEI</b><div class="muted" style="margin-top:4px">El lector automático todavía no está configurado para la OLT de esta OT.</div>';return}
 if(!d.requested){c.innerHTML='<b>📡 DETECTOR HUAWEI</b><div class="muted" style="margin-top:4px">Esperando que envíes la solicitud de activación a Mesa Técnica.</div>';return}
 if(d.waiting){c.innerHTML='<b>📡 DETECTOR HUAWEI</b><div class="muted" style="margin-top:4px">⏳ Solicitud enviada. Esperando la lectura de la OLT...</div>';return}
 const items=d.items||[];
 if(!items.length){c.innerHTML='<b>📡 DETECTOR HUAWEI</b><div class="muted" style="margin-top:4px">La lectura respondió, pero no encontró ONU/ONT en autofind.</div>';return}
 c.innerHTML='<b>📡 ONU/ONT DETECTADAS EN ESTA LECTURA</b><div class="muted" style="margin-top:4px">Si aparecen varias, elige la que corresponde a tu instalación.</div>'+items.map(o=>{
  const sel=d.selected_sn&&String(d.selected_sn).toUpperCase()===String(o.onu_sn).toUpperCase();
  return '<div style="border:1px solid #d6e1e6;border-radius:10px;padding:9px;margin-top:8px;background:#fff"><b>'+esc(o.modelo||'ONU/ONT')+' · '+esc(o.onu_sn_display||o.onu_sn||'—')+'</b><div class="muted" style="margin-top:4px">SN: '+esc(o.onu_sn||'—')+' · PON: '+esc(o.pon||'—')+' · '+esc(o.vendor||'')+'</div>'+(sel?'<div style="margin-top:7px;font-weight:900;color:#167348">✅ ESTA ES LA ONU DE ESTA OT</div>':'<button type="button" style="margin-top:7px" onclick="window.identificarOnuCampo(\''+esc(o.onu_sn||'')+'\',this)">ESTA ES MI ONU</button>')+'</div>'
 }).join('');
}
async function revisar(){
 if(!document.getElementById('onuActivadaTecnico'))return;
 const results=await Promise.allSettled([mesa(),evidencia(),detectar()]);
 if(results[0].status==='fulfilled')renderMesa(results[0].value);else document.getElementById('estadoOnuTecnico').textContent='No se pudo consultar Mesa Técnica: '+results[0].reason?.message;
 if(results[1].status==='fulfilled')renderEvidencia(results[1].value);
 if(results[2].status==='fulfilled')renderDetector(results[2].value);else document.getElementById('detectorOnuCampo').innerHTML='<b>📡 DETECTOR HUAWEI</b><div class="muted">'+esc(results[2].reason?.message||'No disponible')+'</div>';
}
const obs=new MutationObserver(()=>crear());
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>{obs.observe(document.body,{childList:true,subtree:true});setTimeout(crear,300)}):(obs.observe(document.body,{childList:true,subtree:true}),setTimeout(crear,200));
setInterval(()=>{if(document.visibilityState==='visible'&&document.getElementById('onuActivadaTecnico'))revisar()},5000);
})();