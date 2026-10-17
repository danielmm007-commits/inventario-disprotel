(()=>{
if(window.__mesaTecnicaFernandoV7)return;window.__mesaTecnicaFernandoV7=true;
const BASE='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/';
const API_MESA=BASE+'inventario-mesa-tecnica',API_IP=BASE+'inventario-ip-candidatos',API_AR=BASE+'inventario-acceso-remoto';
const KEY='disprotel_login_general_v2';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const up=v=>String(v??'').toLocaleUpperCase('es-EC');
const fmt=v=>{if(!v)return'—';try{return new Date(v).toLocaleString('es-EC')}catch{return String(v)}};
const ses=()=>{try{return JSON.parse(sessionStorage.getItem(KEY)||'null')||{}}catch{return{}}};
const QS=new URLSearchParams(location.search);let FOCUS_STATE={};const DIRECT_FOCUS=!!QS.get('orden');try{const x=JSON.parse(sessionStorage.getItem('disprotel_mesa_focus_v1')||'null');if(DIRECT_FOCUS&&x&&Date.now()-Number(x.at||0)<5*60*1000)FOCUS_STATE=x;sessionStorage.removeItem('disprotel_mesa_focus_v1')}catch{}const FOCUS_OT=QS.get('orden')||FOCUS_STATE.orden_id||'',FOCUS_KIND=QS.get('focus')||FOCUS_STATE.focus||'',FOCUS_REMOTE=FOCUS_KIND==='acceso-remoto';let TAB=(QS.get('mesa_tab')||FOCUS_STATE.tab)==='SOPORTES'?'SOPORTES':'INSTALACIONES',DATA={instalaciones:[],soportes:[]},LOADING=false;
async function post(url,action,p={}){const s=ses(),r=await fetch(url+'?t='+Date.now(),{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','x-session':s.session_token||''},body:JSON.stringify({session_token:s.session_token||'',action,...p})});const d=await r.json().catch(()=>({error:'Respuesta inválida'}));if(!r.ok)throw new Error(d.error||'Error');return d}
const mesa=(a,p={})=>post(API_MESA,a,p),ipApi=(a,p={})=>post(API_IP,a,p),arApi=(a,p={})=>post(API_AR,a,p);
function ocultarLegacy(){const sec=$('secPend');if(sec)sec.style.display='none';const old=$('accesoRemotoFernando');if(old)old.style.display='none'}
function css(){if($('mesaCampoV7Style'))return;const s=document.createElement('style');s.id='mesaCampoV7Style';s.textContent=`
#mesaTecnicaFernando{border:2px solid #2d7fd1;background:#f8fbff;padding:15px}
.mesaHead{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap}.mesaHead h2{margin:0;color:#0b356f;font-size:20px}.mesaHead p{margin:4px 0 0}
.mesaTabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.mesaTab{margin:0!important;background:#e8eef1!important;color:#17313d!important}.mesaTab.on{background:#17313d!important;color:#fff!important}
.mesaStats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0}.mesaStat{padding:9px 11px;border:1px solid #d7e1e5;border-radius:11px;background:#fff}.mesaStat b{display:block;font-size:21px;color:#0b356f}.mesaStat span{font-size:9px;font-weight:900;color:#60737c}
.otMesa{background:#fff;border:1px solid #d7e1e5;border-radius:14px;margin-top:10px;overflow:hidden}.otMesa.need{border-left:5px solid #e68a00}.otMesa.wait{border-left:5px solid #8ba0aa}
.otHead{padding:12px 13px;display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap}.otTitle{font-weight:1000;font-size:15px}.otMeta{font-size:10px;color:#60737c;margin-top:4px}.statusBadge{font-size:9px;font-weight:1000;border-radius:999px;padding:5px 8px;background:#fff1d9;color:#925900}.statusBadge.ok{background:#e8f6ed;color:#17643e}.statusBadge.wait{background:#edf1f3;color:#5f6f77}
.otSteps{border-top:1px solid #e3eaee;display:grid;grid-template-columns:repeat(4,1fr)}.step{padding:11px;border-right:1px solid #e3eaee;min-height:94px}.step:last-child{border-right:0}.step b{font-size:11px}.stepState{font-size:10px;color:#60737c;margin-top:6px;line-height:1.4}.step button,.step label.btnMini{width:100%;border:0;border-radius:8px;padding:8px;margin-top:7px;background:#17313d;color:#fff;font-size:10px;font-weight:900;cursor:pointer;text-align:center;display:block}.step button.secondary{background:#e8eef1!important;color:#17313d!important}.step img{width:80px;height:55px;object-fit:cover;border-radius:7px;border:1px solid #ccd8de;margin-top:6px;cursor:pointer}
.ipCandidate{padding:7px;border:1px solid #d5e2e8;border-radius:8px;margin-top:6px;background:#f8fbfc}.ipCandidate strong{font-size:15px}.mesaReqs{padding:10px 12px;border-top:1px solid #e3eaee;background:#fbfdfe}.mesaReq{border:1px solid #d8e4ea;border-radius:10px;padding:9px;margin-top:7px;background:#fff}.mesaReq:first-child{margin-top:0}.mesaReq.done{background:#f1faf4;border-color:#b9e5ca}.mesaReqTop{display:flex;justify-content:space-between;gap:8px;align-items:flex-start;flex-wrap:wrap}.mesaReqActions{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}.mesaActionChip{display:inline-block;padding:5px 7px;border-radius:999px;background:#eaf3f8;color:#17313d;font-size:9px;font-weight:900}.mesaReq button{width:auto;margin-top:8px;padding:7px 10px;font-size:10px}.mesaRectifyControl{display:inline-block;padding:9px 12px;margin:9px 0 4px;border-radius:8px;color:#fff;background:#20577b;font-size:11px;font-weight:850;cursor:pointer;line-height:1.3}.mesaRectifyControl input{display:none}.mesaReqRemoteMeta .mesaRectifyControl{margin-top:10px}.rectificationNote{font-size:10px;color:#375a4c;margin-top:7px}.mesaReqRemoteProof{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:9px;padding:10px;border:1px solid #bbdfcd;background:#f7fcf9;border-radius:10px}
.mesaReqRemotePreview{display:block;flex:0 0 auto;width:min(230px,100%);max-width:100%;border:1px solid #c4d9d2;border-radius:8px;background:#111;overflow:hidden;line-height:0;cursor:zoom-in}
.mesaReqRemotePreview img{display:block;width:100%;height:126px;object-fit:contain}
.mesaReqRemoteMeta{flex:1;min-width:135px;font-size:11px;color:#214e3f}
.mesaReqRemoteMeta b{display:block;font-size:11px}
@media(max-width:600px){.mesaReqRemoteProof{align-items:stretch}.mesaReqRemotePreview{width:100%;max-width:300px}.mesaReqRemotePreview img{height:150px}}.emptyMesa{text-align:center;padding:24px;color:#60737c}.manualIp{margin-top:6px}.remoteLinkOptions{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:6px;margin-top:8px}.remoteLinkOptions a{display:block;padding:8px 9px;border-radius:8px;background:#17313d;color:#fff;text-decoration:none;text-align:center;font-size:10px;font-weight:800;overflow-wrap:anywhere;word-break:break-word}.remoteLinkOptions a:focus-visible{outline:3px solid #278bd2;outline-offset:2px}.remoteEvidence{margin-top:8px;padding:8px;border:1px solid #e6c26e;border-radius:10px;background:#fffaf0}.remoteEvidence img{display:block;width:100%;max-width:560px;height:auto;max-height:260px;object-fit:contain;margin:8px auto;background:#111;border-radius:8px}.remoteWide{grid-column:1/-1!important;min-width:0;background:#f9fcff}.remoteWide .remoteEvidence{max-width:620px;margin:12px auto;padding:12px}.remoteWide .remoteTools{max-width:620px;margin:8px auto}.remoteWide .remotePaste{max-width:620px;margin:8px auto}.remoteTools{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:7px}.remotePaste{position:relative;margin-top:7px;padding:9px;border:2px dashed #e89b00;border-radius:9px;background:#fffdf7;text-align:center;font-size:10px;font-weight:900;cursor:text;outline:none;caret-color:#17313d}.remotePaste:focus{border-style:solid;border-color:#17313d;background:#fff;box-shadow:0 0 0 4px rgba(23,49,61,.12)}.remotePaste:focus:after{content:'';display:inline-block;width:2px;height:16px;background:#17313d;margin-left:6px;vertical-align:-3px;animation:remoteCaretBlink .9s steps(1) infinite}@keyframes remoteCaretBlink{50%{opacity:0}}.remoteOk{background:#167348!important}.remoteDanger{background:#b42323!important;color:#fff!important}
.opticaAvisoPanel{display:grid;gap:9px;padding:11px;margin:11px 0;background:#fffaf0;border:1px solid #ebcd81;border-radius:10px}
.opticaAviso{padding:10px;border:1px solid #e9bf60;background:#fff2d5;border-radius:9px}.opticaAviso.corregido{border-color:#b3d6c3;background:#f2fbf4}
.opticaAviso b,.opticaAvisoTools b{font-size:11px}.opticaAviso p{margin:5px 0 8px;font-size:11px}
.opticaAviso a img{display:block;max-width:270px;width:100%;max-height:160px;object-fit:contain;border-radius:7px;background:#111;margin-top:6px}
.opticaAvisoTools{background:#fff;padding:9px;border:1px dashed #d9ad51;border-radius:8px}
.opticaAlerta{margin:9px 0;padding:10px;border-radius:8px;background:#fff1d7;border:1px solid #e4bb63;font-size:11px;line-height:1.4}
@media(max-width:600px){.opticaAvisoTools .remoteTools{grid-template-columns:1fr}}
.powerMirrorGrid{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(280px,.95fr);gap:10px;align-items:stretch;margin-top:8px}
.powerMirrorData,.powerMirrorEvidence{border:1px solid #d7e4ea;border-radius:8px;background:#f8fbfc;padding:9px;min-width:0}
.powerMirrorEvidence{background:#fffaf0;border-color:#e6c26e}
.powerMirrorEvidence img{display:block;width:min(100%,520px);height:160px;object-fit:contain;background:#111;border-radius:7px;border:1px solid #d7e1e5;cursor:pointer;margin:6px auto 0}
.powerMirrorEvidence .stepState{margin-top:6px}
@media(max-width:820px){.powerMirrorGrid{grid-template-columns:1fr}.powerMirrorEvidence img{width:100%;height:auto;max-height:220px}}
@media(max-width:780px){.otSteps{grid-template-columns:1fr 1fr}.step:nth-child(2){border-right:0}.step{border-bottom:1px solid #e3eaee}.mesaStats{grid-template-columns:1fr 1fr 1fr}}@media(max-width:480px){.otSteps,.mesaStats{grid-template-columns:1fr}.step{border-right:0}}
`;document.head.appendChild(s)}
function crear(){const app=$('app'),ref=$('secPend');if(!app||!ref)return;css();ocultarLegacy();let box=$('mesaTecnicaFernando');if(!box){box=document.createElement('section');box.className='card';box.id='mesaTecnicaFernando';box.innerHTML=`<div class="mesaHead"><div><h2>🧰 MESA TÉCNICA DE CAMPO</h2><p class="muted">En soportes, cada solicitud llega como un lote de acciones elegido por el técnico. Atiende únicamente lo solicitado para esa OT.</p></div><button id="recargarMesa" class="secondary" style="width:auto;margin:0">🔄 ACTUALIZAR</button></div><div class="mesaTabs"><button id="mtInst" class="mesaTab on">📡 INSTALACIONES</button><button id="mtSop" class="mesaTab">🛠️ SOPORTES</button></div><div class="mesaStats"><div class="mesaStat"><b id="mTotal">0</b><span>OT EN MESA</span></div><div class="mesaStat"><b id="mAccion">0</b><span>REQUIEREN ACCIÓN</span></div><div class="mesaStat"><b id="mEspera">0</b><span>ESPERANDO TÉCNICO</span></div></div><div id="listaMesa"></div>`;const legacy=$('mesaLegacy');if(legacy&&legacy.parentNode===app)app.insertBefore(box,legacy);else app.insertBefore(box,$('msg')||null);$('recargarMesa').onclick=()=>cargar(true);$('mtInst').onclick=()=>{TAB='INSTALACIONES';render()};$('mtSop').onclick=()=>{TAB='SOPORTES';render()};cargar(true)}
if(!document.body.dataset.mesaTabsV7){document.body.dataset.mesaTabsV7='1';$('tabPend')?.addEventListener('click',()=>setTimeout(()=>{box.style.display='';ocultarLegacy();cargar(true)},0));$('tabHist')?.addEventListener('click',()=>setTimeout(()=>{box.style.display='none'},0))}}
function badge(txt,ok=false,wait=false){return '<span class="statusBadge '+(ok?'ok':wait?'wait':'')+'">'+esc(txt)+'</span>'}
function clienteStep(o){const ok=!!o.mesa?.cliente_registrado;return `<div class="step"><b>👤 CLIENTE / SERVICIO</b><div class="stepState">${ok?'✅ Registrado por Mesa técnica':'⏳ Pendiente de registrar/activar en sistema'}</div>${ok?'':'<button onclick="confirmarClienteMesa(\''+o.id+'\')">✅ MARCAR REGISTRADO</button>'}</div>`}
function onuStep(o){
 const x=o.onu;if(!x)return '<div class="step"><b>📡 ACTIVAR / CAMBIAR ONU</b><div class="stepState">⚪ No solicitada</div></div>';
 const ok=x.estado==='CONFIRMADO',corr=x.estado==='REQUIERE_CORRECCION';
 let detalle='<div class="stepState"><b>Estado:</b> '+(ok?'✅ ACTIVADA SEGÚN EVIDENCIA':'⏳ PENDIENTE DE ACTIVACIÓN / EVIDENCIA')+'</div>';
 if(x.onu_sn)detalle+='<div class="stepState"><b>SN reportado:</b> '+esc(x.onu_sn)+'</div>';
 if(x.onu_pon)detalle+='<div class="stepState"><b>PON reportado:</b> '+esc(x.onu_pon)+'</div>';
 if(x.olt_nombre)detalle+='<div class="stepState"><b>OLT reportada:</b> '+esc(x.olt_nombre)+'</div>';
 const sel=x.onu_sn?'<div class="ipCandidate" style="margin-top:7px"><b>ONU IDENTIFICADA POR CAMPO</b><div class="stepState">'+esc(x.onu_modelo||'ONU/ONT')+' · '+esc(x.onu_sn_display||x.onu_sn||'')+'</div><button type="button" onclick="abrirRegistroOnuManual(\''+esc(o.id)+'\')" style="margin-top:8px">✍️ DATOS ADMINISTRATIVOS Y APROBACIÓN MANUAL</button></div>':'';
 const evidencia=x.evidencia_url?'<div class="stepState" style="margin-top:7px"><b>📷 EVIDENCIA SMARTOLT</b></div><img src="'+esc(x.evidencia_url)+'" onclick="window.open(this.src,\'_blank\')">':'';
 const accion=ok?'':'<div class="remoteTools"><label class="btnMini">🖼️ CARGAR ARCHIVO<input type="file" accept="image/jpeg,image/png,image/webp" style="display:none" onchange="subirOnuMesa(event,\''+o.id+'\')"></label><div class="remotePaste" tabindex="0" contenteditable="true" spellcheck="false" onclick="this.focus()" onkeydown="if(event.key!==\'v\'&&!event.ctrlKey&&!event.metaKey)event.preventDefault()" onpaste="pegarOnuMesa(event,\''+o.id+'\')">📋 PEGAR CAPTURA Ctrl+V</div></div>';
 return '<div class="step"><b>📡 ACTIVAR / CAMBIAR ONU</b><div class="stepState">'+(ok?'✅ Activación registrada con evidencia':corr?'⚠️ Requiere corrección: '+esc(x.observacion||''):'Fernando activa la ONU en SmartOLT y adjunta la captura como evidencia.')+'</div>'+detalle+sel+evidencia+accion+'</div>';
}
function ipStep(o){const q=o.ip?.solicitud,cs=o.ip?.candidatos||[];if(!q)return `<div class="step"><b>🌐 IP</b><div class="stepState">⚪ No solicitada</div></div>`;if(q.estado==='ASIGNADA')return `<div class="step"><b>🌐 IP</b><div class="stepState">✅ IP definitiva</div><div style="font-size:18px;font-weight:1000;margin-top:5px">${esc(q.ip_asignada||'—')}</div></div>`;const c=cs[0];return `<div class="step"><b>🌐 IP</b><div class="stepState">${c?'🟡 Scanner propone':'⏳ Esperando scanner / validación'}</div>${c?`<div class="ipCandidate"><strong>${esc(c.address)}</strong><div class="stepState">${esc(c.queue_name||c.comentario||'')}</div><button onclick="confirmarIpMesa('${o.id}','${c.id}')">✅ CONFIRMAR IP</button></div>`:''}<button class="secondary manualIp" onclick="ipManualMesa('${o.id}','${q.id}','${esc(c?.address||'')}')">✏️ IP MANUAL</button></div>`}
function ipAccesoRemotoMesa(o){
 // Utilizar la IP definitiva de la OT; en su ausencia, la IP del servicio ERP univoco.
 const q=o.ip?.solicitud;
 const asignada=q?.estado==='ASIGNADA'?q.ip_asignada:null;
 const servicio=!o.servicio_actual?.requiere_seleccion_servicio?o.servicio_actual?.ip:null;
 const raw=String(asignada||servicio||'').trim().replace(/\/32$/,'');
 const p=raw.split('.');
 if(p.length!==4||p.some(n=>!/^\d{1,3}$/.test(n)||Number(n)>255))return '';
 return p.map(n=>String(Number(n))).join('.');
}
function remotoStep(o){const a=o.acceso||{estado:'PENDIENTE'},ip=ipAccesoRemotoMesa(o),ev=a.evidencia||null,tipo=up(o.servicio_actual?.tipo_conexion||''),radio=tipo==='RADIO',fibra=tipo==='FIBRA',etiquetaEquipo=radio?'Antena/CPE y WiFi':fibra?'Router WiFi · ONU Bridge/CATV':'Equipo del cliente';
 if(a.estado==='CONFIRMADO')return `<div class="step remoteWide"><b>🔐 ACCESO REMOTO</b><div class="stepState">✅ Confirmado por Mesa técnica</div>${ev?.url?`<div class="remoteEvidence"><div class="stepState"><b>📷 EVIDENCIA DE ACCESO REMOTO</b></div><img src="${esc(ev.url)}" alt="Evidencia acceso remoto"></div>`:''}</div>`;
 if(a.estado==='REQUIERE_CORRECCION')return `<div class="step remoteWide"><b>🔐 ACCESO REMOTO</b><div class="stepState">⚠️ Devuelto al técnico: ${esc(a.observacion||'')}</div></div>`;
 if(a.estado!=='SOLICITADO')return `<div class="step remoteWide"><b>🔐 ACCESO REMOTO</b><div class="stepState">⚪ Aún no solicitado por el técnico</div></div>`;
 const acceso=ip?
   '<div class="stepState"><b>🌐 '+esc(etiquetaEquipo)+' · IP '+esc(ip)+'</b></div>'+
   '<div class="remoteLinkOptions">'+
   '<a href="http://'+esc(ip)+'" target="_blank" rel="noopener noreferrer">'+esc(radio?'📡 ANTENA/CPE':fibra?'📶 WIFI':'🌐 ACCESO DIRECTO')+' · http://'+esc(ip)+'</a>'+
   '<a href="http://'+esc(ip)+':5000" target="_blank" rel="noopener noreferrer">📶 WIFI · http://'+esc(ip)+':5000</a>'+
   '<a href="https://'+esc(ip)+':5000" target="_blank" rel="noopener noreferrer">🔒 WIFI · https://'+esc(ip)+':5000</a>'+
   '</div><div class="stepState">Abrir en otra pestaña. Requiere acceso a la red del cliente o VPN y un servicio web habilitado.</div>':
   '<div class="stepState">⚠️ IP no disponible o servicio ambiguo. Verificar la IP correcta antes de abrir el equipo.</div>';
 const evidencia=ev?.url?`<div class="remoteEvidence"><div class="stepState"><b>📷 EVIDENCIA DE ACCESO REMOTO</b></div><img src="${esc(ev.url)}" alt="Evidencia acceso remoto"><div class="stepState">✅ Evidencia guardada. Puedes reemplazarla o eliminarla.</div><button class="remoteDanger" onclick="eliminarAR('${o.id}')">🗑️ ELIMINAR EVIDENCIA</button></div>`:'<div class="stepState">📎 Falta evidencia. Pega una captura o carga una imagen.</div>';
 return `<div class="step remoteWide"><b>🔐 ACCESO REMOTO</b><div class="stepState">⏳ Técnico solicita confirmación</div>${acceso}${evidencia}<div class="remoteTools"><label class="btnMini">📷 CÁMARA<input type="file" accept="image/*" capture="environment" style="display:none" onchange="seleccionarAR(event,'${o.id}')"></label><label class="btnMini">🖼️ GALERÍA<input type="file" accept="image/*" style="display:none" onchange="seleccionarAR(event,'${o.id}')"></label></div><div class="remotePaste" tabindex="0" contenteditable="true" spellcheck="false" onclick="this.focus()" onkeydown="if(event.key!=='v'&&!event.ctrlKey&&!event.metaKey)event.preventDefault()" onpaste="pegarPortapapelesAR(event,'${o.id}')">📋 Clic aquí y pega con Ctrl+V</div><button class="remoteOk" ${ev?.id?'':'disabled style="opacity:.45;cursor:not-allowed"'} onclick="confirmarAR('${o.id}')">✅ CONFIRMAR ACCESO REMOTO</button><button class="secondary" onclick="corregirAR('${o.id}')">⚠️ PEDIR CORRECCIÓN</button></div>`}
const SMARTOLT_DIAG='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/smartolt-diagnostico';
const POWER_EVIDENCE_URL_CACHE=new Map();
function estabilizarUrlsPotencia(data){
  for(const group of ['instalaciones','soportes']){
    for(const o of data?.[group]||[]){
      for(const r of o.requerimientos||[]){
        const ev=r?.resultado?.evidencia_potencia,path=ev?.storage_path;
        if(!path||!ev?.url)continue;
        if(POWER_EVIDENCE_URL_CACHE.has(path))ev.url=POWER_EVIDENCE_URL_CACHE.get(path);
        else POWER_EVIDENCE_URL_CACHE.set(path,ev.url);
      }
    }
  }
  return data;
}
const ACTION_LABELS={VERIFICAR_POTENCIA:'📶 Verificar potencia óptica',ACTIVAR_CAMBIAR_ONU:'📡 Activar / cambiar ONU',CONFIRMAR_IP_ACTUAL:'🌐 Confirmar IP actual',ASIGNAR_NUEVA_IP:'🆕 Asignar nueva IP',VERIFICAR_ACCESO_REMOTO:'🔐 Verificar acceso remoto',REVISAR_RADIO_CPE:'📻 Revisar radio / CPE',VERIFICAR_CONECTIVIDAD:'🔎 Verificar conectividad',OTRA_ACCION:'🧰 Otra acción técnica'};
function avisoPotenciaHtml(o,r){
 if(r.estado==='ATENDIDO')return '';
 const x=r.resultado?.revision_potencia;
 const msg=x?'<div class="opticaAviso '+(x.estado==='CORREGIDO_EN_CAMPO'?'corregido':'')+'"><b>'+
 (x.estado==='REQUIERE_CORRECCION'?'⚠️ BRYAN DEBE CORREGIR LA POTENCIA':'✅ BRYAN CORRIGIÓ · HACER NUEVA LECTURA')+
 '</b><p>'+esc(x.observacion||'')+'</p>'+
 (x.url?'<a href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer"><img src="'+esc(x.url)+'" alt="Captura provisional"></a>':'')+
 '<div class="stepState">📷 Diagnóstico provisional. NO es la evidencia final.</div>'+
 (x.trabajo_realizado?'<div class="stepState"><b>Trabajo de Bryan:</b> '+esc(x.trabajo_realizado)+'</div>':'')+'</div>':'';
 return '<div class="opticaAvisoPanel">'+msg+
 '<div class="opticaAvisoTools"><b>📷 ENVIAR FOTO Y SOLICITAR CORRECCIÓN</b><div class="stepState">Esta captura se enviará a Bryan, sin marcar la potencia como verificada.</div>'+
 '<div class="remoteTools"><label class="btnMini">🖼️ FOTO DIAGNÓSTICA<input type="file" style="display:none" accept="image/png,image/jpeg,image/webp" onchange="seleccionarAvisoPotencia(event,\''+o.id+'\',\''+r.id+'\')"></label>'+
 '<div tabindex="0" contenteditable="true" class="remotePaste" onkeydown="if(event.key!==\'v\'&&!event.ctrlKey&&!event.metaKey)event.preventDefault()" onpaste="pegarAvisoPotencia(event,\''+o.id+'\',\''+r.id+'\')">📋 PEGAR DIAGNÓSTICO Ctrl+V</div></div></div></div>';
}
function sugerenciaPotencia(v){
 const rx=Number(v?.rx_onu_dbm),when=Date.parse(v?.leido_at||'');
 if(v?.rx_onu_dbm==null||!Number.isFinite(rx)||rx>-26||!Number.isFinite(when)||Date.now()-when>15*60000||when>Date.now()+60000)return '';
 return '<div class="opticaAlerta">⚠️ Rx ONU '+esc(rx)+' dBm: <b>sugerir revisión de puertos/conectores</b>. Referencia orientativa ≤ −26 dBm, según tolerancia del equipo. Fernando confirma; el sistema no cierra la OT automáticamente.</div>';
}
function potenciaStep(o,r){
 const archivada=(r?.resultado||{})?.verificacion_potencia||null,lectura=o.optica||null;
 const v=lectura&&(!archivada?.leido_at||Date.parse(lectura.leido_at)>Date.parse(archivada.leido_at))?lectura:(archivada||lectura);
 const done=r?.estado==='ATENDIDO',ev=(r?.resultado||{})?.evidencia_potencia||null,revision=r?.resultado?.revision_potencia;
 const solicitud=o.lectura_huawei||null,pendingHu=solicitud?.estado==='PENDIENTE'&&!solicitud?.expirada;
 const reset='';
 const accionHuawei=done?'':pendingHu?
   '<button type="button" disabled style="opacity:.65;cursor:wait">⏳ ESPERANDO LECTURA HUAWEI</button>':
   '<button type="button" onclick="solicitarPotenciaHuaweiMesa(\''+o.id+'\')">📡 CONSULTAR POTENCIA HUAWEI AHORA</button>';
 const estadoHuawei=pendingHu?'<div class="stepState">La lectura individual está solicitada; se compartirá al recibir respuesta de Huawei.</div>':solicitud?.estado==='ERROR'?'<div class="stepState" style="color:#ab401d">⚠️ Última lectura Huawei rechazada: '+esc(solicitud.error||'sin diagnóstico')+'. Puedes solicitar una nueva cuando se corrija.</div>':'';

 if(!v)return '<div class="step"><b>📶 POTENCIA ÓPTICA</b><div class="stepState">⚠️ Sin lectura óptica disponible para este servicio.</div>'+accionHuawei+estadoHuawei+reset+'</div>';
 const vals=[
   ['Estado',v.estado||'—'],['Rx ONU',v.rx_onu_dbm!=null?String(v.rx_onu_dbm)+' dBm':'—'],['Rx OLT',v.rx_olt_dbm!=null?String(v.rx_olt_dbm)+' dBm':'—'],
   ['OLT',v.olt||'—'],['PON',[v.tarjeta,v.puerto].filter(Boolean).join('/')||'—'],['ONT-ID',v.ont_id||'—'],['SN',v.sn||'—'],
   ['Distancia',v.distancia_m!=null?String(v.distancia_m)+' m':'—'],['Fuente',v.fuente||'SMARTOLT'],['Lectura',v.leido_at?fmt(v.leido_at):'—'],['Vigencia',v.leido_at&&Date.now()-Date.parse(v.leido_at)<=15*60000?'Reciente':'HISTÓRICA (sin lectura reciente)']
 ];
 const data='<div class="powerMirrorData"><div class="stepState" style="margin-top:0"><b>📊 LECTURA ÓPTICA</b></div>'+vals.map(x=>'<div style="margin-top:3px"><b>'+esc(x[0])+':</b> '+esc(x[1])+'</div>').join('')+'</div>';
 const evidenceBody=ev?.url
   ?'<img data-power-evidence="'+esc(r.id)+'" src="'+esc(ev.url)+'" alt="Evidencia potencia SmartOLT" onclick="window.open(this.src,\'_blank\')"><div class="stepState">✅ Captura SmartOLT guardada'+(ev.subido_at?' · '+esc(fmt(ev.subido_at)):'')+'</div>'
   :'<div class="stepState" style="margin-top:0">📎 Falta captura de SmartOLT. Pega un recorte o carga la imagen antes de confirmar.</div>';
 const controls=done||revision?.estado==='REQUIERE_CORRECCION'?'':'<div class="remoteTools"><label class="btnMini">🖼️ CARGAR ARCHIVO<input type="file" accept="image/jpeg,image/png,image/webp" style="display:none" onchange="seleccionarPotenciaMesa(event,\''+o.id+'\',\''+r.id+'\')"></label><div class="remotePaste" tabindex="0" contenteditable="true" spellcheck="false" onclick="this.focus()" onkeydown="if(event.key!==\'v\'&&!event.ctrlKey&&!event.metaKey)event.preventDefault()" onpaste="pegarPotenciaMesa(event,\''+o.id+'\',\''+r.id+'\')">📋 PEGAR CAPTURA Ctrl+V</div></div>';
 const evidence='<div class="powerMirrorEvidence"><div class="stepState" style="margin-top:0"><b>📷 EVIDENCIA VISUAL SMARTOLT</b></div>'+evidenceBody+controls+'</div>';
 const repetir=done&&puedeRepetirVerificacion(o,r,'VERIFICAR_POTENCIA')?'<button type="button" class="secondary" onclick="repetirVerificacionMesa(\''+o.id+'\',\''+r.id+'\')">🔄 REINICIAR VERIFICACIÓN DE POTENCIA</button>':'';
 const rectificar=done&&ev?.storage_path?
  '<div class="stepState">Puedes sustituir la captura sin alterar la lectura ni el estado ATENDIDO.</div>'+
  '<label class="mesaRectifyControl">✏️ RECTIFICAR CAPTURA ÓPTICA<input type="file" accept="image/jpeg,image/png,image/webp" onchange="rectificarPotenciaMesa(event,\''+o.id+'\',\''+r.id+'\')"></label>'+
  (ev.rectificada?'<div class="rectificationNote">📑 Evidencia rectificada; la anterior sigue en historial.</div>':''):''; 
 const confirmar=done?'':revision?.estado==='REQUIERE_CORRECCION'?'<div class="stepState" style="color:#a54b00">⏳ Esperando que Bryan corrija la potencia.</div>':'<button class="remoteOk" '+(ev?.url?'':'disabled style="opacity:.45;cursor:not-allowed"')+' onclick="confirmarPotenciaMesa(\''+o.id+'\',\''+r.id+'\')">✅ CONFIRMAR LECTURA ÓPTICA</button>';
 return '<div class="step"><b>📶 POTENCIA ÓPTICA</b><div class="stepState">'+(done?'✅ Lectura y evidencia confirmadas':'🟡 Lectura disponible para verificar')+'</div><div class="powerMirrorGrid">'+data+evidence+'</div>'+sugerenciaPotencia(v)+avisoPotenciaHtml(o,r)+accionHuawei+estadoHuawei+confirmar+rectificar+repetir+reset+'</div>';
}
function ipActualStep(o,r){
 const done=r?.estado==='ATENDIDO',v=(r?.resultado||{})?.verificacion_ip||{},sv=o?.servicio_actual||{},ip=v.ip||sv.ip||o.ip_creacion_registrada||'—',router=v.router_nombre||sv.router_nombre||'—',servicio=v.codigo_servicio||sv.codigo_servicio||'—',tipo=v.tipo_conexion||sv.tipo_conexion||'—',estado=String(v.estado||'SIN_CONSULTAR').toUpperCase(),encontrada=v.encontrada===true,ambigua=sv.requiere_seleccion_servicio===true;
 const badgeTxt=done?'✅ IP CONFIRMADA':ambigua?'⚠️ VARIOS SERVICIOS':estado==='PENDIENTE'?'⏳ CONSULTANDO MIKROTIK':estado==='OK'&&!encontrada?'❌ IP NO ENCONTRADA':estado==='ERROR'?'⚠️ ERROR DE CONSULTA':'🟡 PENDIENTE DE VERIFICACIÓN';
 let detalle='<div class="stepState"><b>Servicio:</b> '+esc(servicio)+'</div><div class="stepState"><b>Tecnología:</b> '+esc(tipo)+'</div><div class="stepState"><b>IP registrada:</b> '+esc(ip)+'</div><div class="stepState"><b>Router:</b> '+esc(router)+'</div><div class="stepState"><b>Estado:</b> '+esc(badgeTxt)+'</div>';
 if(ambigua&&Array.isArray(sv.servicios)&&sv.servicios.length)detalle+='<div class="stepState" style="margin-top:6px"><b>Servicios encontrados:</b> '+sv.servicios.map(x=>esc((x.codigo_servicio||'SIN CÓDIGO')+' · '+(x.tipo_conexion||'—')+' · '+(x.ip||'SIN IP'))).join('<br>')+'</div>';
 if(v.respondido_at)detalle+='<div class="stepState"><b>Respuesta:</b> '+esc(fmt(v.respondido_at))+'</div>';
 if(v.resultado?.queues?.length){const q=v.resultado.queues[0]||{};detalle+='<div class="stepState"><b>Queue:</b> '+esc(q.name||q.comment||'—')+(q.parent?' · <b>Plan:</b> '+esc(q.parent):'')+'</div>'}
 const btn=done?'':ambigua?'<button disabled style="opacity:.55;cursor:not-allowed">⚠️ SELECCIONA EL SERVICIO CORRECTO</button>':estado==='PENDIENTE'?'<button disabled style="opacity:.55;cursor:wait">⏳ ESPERANDO RESPUESTA DEL SCANNER</button>':'<button onclick="verificarIpActualMesa(\''+o.id+'\',\''+r.id+'\')">🔄 VERIFICAR IP EN ROUTER</button>';
 return '<div class="step"><b>🌐 CONFIRMAR IP ACTUAL</b>'+detalle+btn+'</div>';
}
function ordenarRequerimientosMesa(rows){
 return [...(rows||[])].sort((a,b)=>(Date.parse(a.solicitado_at)||0)-(Date.parse(b.solicitado_at)||0));
}
function puedeRepetirVerificacion(o,r,code){
 if(!r||r.estado!=='ATENDIDO'||r.acciones?.length!==1||r.acciones[0]!==code)return false;
 const filas=(o?.requerimientos||[]).filter(x=>x.acciones?.length===1&&x.acciones[0]===code)
 .slice().sort((a,b)=>(Date.parse(b.solicitado_at)||0)-(Date.parse(a.solicitado_at)||0));
 if(filas[0]?.id!==r.id||filas.some(x=>x.estado==='PENDIENTE'))return false;
 if(code==='VERIFICAR_ACCESO_REMOTO')return o.acceso?.estado==='CONFIRMADO'&&!!r.resultado?.verificacion_acceso_remoto?.evidencia_id;
 if(code==='VERIFICAR_POTENCIA')return !!r.resultado?.verificacion_potencia&&!!r.resultado?.evidencia_potencia?.storage_path;
 return false;
}
function evidenciaAccesoEnRequerimiento(o,r){
 const comprobante=r?.resultado?.verificacion_acceso_remoto||null,actual=o?.acceso?.evidencia||null,historica=r?.resultado?.evidencia_acceso_remoto_historica||null;
 const ev=actual?.id&&String(actual.id)===String(comprobante?.evidencia_id)?actual:historica;
 // Cada solicitud solo puede mostrar la evidencia que efectivamente confirmo esa solicitud.
 // No asociar una captura posterior o de otra solicitud a un hito anterior.
 if(comprobante?.estado!=='CONFIRMADO')return '<div class="stepState">✅ Atendido. Captura histórica no vinculada en este requerimiento.</div>';
 if(!comprobante.evidencia_id||!ev?.id||String(comprobante.evidencia_id)!==String(ev.id)||!ev.url)
   return '<div class="stepState">✅ Acceso remoto confirmado. La miniatura histórica no está disponible en esta vista.</div>';
 const url=esc(ev.url);
 return '<div class="mesaReqRemoteProof">'+
   '<a class="mesaReqRemotePreview" href="'+url+'" target="_blank" rel="noopener noreferrer" title="Abrir evidencia de acceso remoto">'+
     '<img src="'+url+'" loading="lazy" alt="Miniatura de evidencia de acceso remoto"></a>'+
   '<div class="mesaReqRemoteMeta"><b>📷 EVIDENCIA DE ACCESO REMOTO</b>'+
     '<div class="stepState">✅ Captura confirmada por Mesa Técnica</div>'+
     (comprobante.confirmado_at?'<div class="stepState">'+esc(fmt(comprobante.confirmado_at))+'</div>':'')+
     '<div class="stepState">Toca la miniatura para verla completa.</div>'+(comprobante.rectificada_at?'<div class="rectificationNote">✏️ Captura rectificada: '+esc(fmt(comprobante.rectificada_at))+'</div>':'')+(puedeRepetirVerificacion(o,r,'VERIFICAR_ACCESO_REMOTO')?'<button type="button" class="secondary" onclick="repetirVerificacionMesa(\''+o.id+'\',\''+r.id+'\')">🔄 REINICIAR VERIFICACIÓN DE ACCESO</button>':'')+
 (puedeRepetirVerificacion(o,r,'VERIFICAR_ACCESO_REMOTO')?'<label class="mesaRectifyControl">✏️ RECTIFICAR CAPTURA<input type="file" accept="image/jpeg,image/png,image/webp" onchange="rectificarAccesoRemotoMesa(event,\''+o.id+'\')"></label>':'')+'</div></div>';
}
function comprobacionesVigentesMesa(rows){
 const ordenados=[...(rows||[])].sort((a,b)=>(Date.parse(b.solicitado_at)||0)-(Date.parse(a.solicitado_at)||0));
 const usados=new Set();
 return ordenados.filter(r=>{
   const codigo=Array.isArray(r.acciones)&&r.acciones.length===1?r.acciones[0]:'';
   if(!['VERIFICAR_POTENCIA','VERIFICAR_ACCESO_REMOTO'].includes(codigo))return true;
   if(usados.has(codigo))return false;
   usados.add(codigo);return true;
 }).reverse();
}
function batchHtml(o){
 const rs=comprobacionesVigentesMesa(o.requerimientos||[]);
 if(!rs.length)return '<div class="mesaReqs"><div class="stepState">Sin requerimientos agrupados.</div></div>';
 return '<div class="mesaReqs">'+rs.map(r=>{
  const done=r.estado==='ATENDIDO',acciones=r.acciones||[],
    chips=acciones.map(x=>'<span class="mesaActionChip">'+esc(ACTION_LABELS[x]||x.replaceAll('_',' '))+'</span>').join(''),
    soloPotencia=acciones.length===1&&acciones.includes('VERIFICAR_POTENCIA'),
    soloIpActual=acciones.length===1&&acciones.includes('CONFIRMAR_IP_ACTUAL'),
    soloOnu=acciones.length===1&&acciones.includes('ACTIVAR_CAMBIAR_ONU'),
    soloRemoto=acciones.length===1&&acciones.includes('VERIFICAR_ACCESO_REMOTO');
  let detalle='';
  if(soloPotencia)detalle=potenciaStep(o,r);
  else if(soloIpActual)detalle=ipActualStep(o,r);
  else if(soloOnu)detalle=onuStep(o);
  else if(soloRemoto)detalle=done?evidenciaAccesoEnRequerimiento(o,r):'<div class="stepState">⏳ Adjunta y confirma el acceso remoto en el panel de esta OT.</div>';
  else if(!done)detalle='<button onclick="resolverReqMesa(\''+o.id+'\',\''+r.id+'\')">✅ REGISTRAR RESULTADO</button>';
  return '<div class="mesaReq '+(done?'done':'')+'"><div class="mesaReqTop"><div><b>'+
    (done?'✅ REQUERIMIENTO ATENDIDO':'⏳ REQUERIMIENTO PENDIENTE')+
    '</b><div class="stepState">'+esc(fmt(r.solicitado_at))+
    (done&&r.atendido_at?' · atendido '+esc(fmt(r.atendido_at)):'')+
    '</div></div>'+(done?badge('ATENDIDO',true):badge('PENDIENTE'))+
    '</div><div class="mesaReqActions">'+chips+'</div>'+detalle+'</div>';
 }).join('')+'</div>';
}
function supportDynamicSteps(o){const pending=(o.requerimientos||[]).filter(r=>r.estado==='PENDIENTE'),acts=new Set(pending.flatMap(r=>r.acciones||[]));let out='';if(acts.has('ASIGNAR_NUEVA_IP'))out+=ipStep(o);if(acts.has('VERIFICAR_ACCESO_REMOTO'))out+=remotoStep(o);return out}
function card(o,inst){const estado=o.requiere_accion?'REQUIERE ACCIÓN':o.espera_tecnico?'ESPERANDO TÉCNICO':'SIN ACCIÓN PENDIENTE';const cls=o.requiere_accion?'need':'wait',dir=o.cliente_direccion_final||o.cliente_direccion||'';const steps=inst?clienteStep(o)+onuStep(o)+ipStep(o)+remotoStep(o):supportDynamicSteps(o),reqs=inst?'':batchHtml(o);return `<article class="otMesa ${cls}" data-orden-id="${esc(o.id||'')}"><div class="otHead"><div><div class="otTitle">${esc(o.id_orden||'')} · ${esc(up(o.cliente_nombre_final||o.cliente_nombre||''))}</div>${dir?'<div class="otMeta"><b>📍 '+esc(up(dir))+'</b></div>':''}<div class="otMeta">${inst?'INSTALACIÓN':'SOPORTE'} · Grupo: ${esc(up(o.grupo_asignado||o.grupo_destino||'—'))} · ${esc(fmt(o.mesa?.solicitado_at))}</div></div>${badge(estado,!o.requiere_accion&&!o.espera_tecnico,o.espera_tecnico)}</div>${reqs}${steps?'<div class="otSteps" style="grid-template-columns:repeat('+Math.min(3,Math.max(1,(steps.match(/class="step"/g)||[]).length))+',1fr)">'+steps+'</div>':''}</article>`}
function render(){const list=TAB==='INSTALACIONES'?DATA.instalaciones||[]:DATA.soportes||[];$('mtInst')?.classList.toggle('on',TAB==='INSTALACIONES');$('mtSop')?.classList.toggle('on',TAB==='SOPORTES');$('mTotal').textContent=list.length;$('mAccion').textContent=list.filter(x=>x.requiere_accion).length;$('mEspera').textContent=list.filter(x=>x.espera_tecnico).length;const out=$('listaMesa');if(!out)return;out.innerHTML=list.length?list.sort((a,b)=>(b.requiere_accion?1:0)-(a.requiere_accion?1:0)||new Date(a.mesa?.solicitado_at||0)-new Date(b.mesa?.solicitado_at||0)).map(x=>card(x,TAB==='INSTALACIONES')).join(''):'<div class="emptyMesa">✅ No hay '+(TAB==='INSTALACIONES'?'instalaciones':'soportes')+' en Mesa técnica en este momento.</div>';enfocarSolicitud()}
function enfocarSolicitud(){if(!FOCUS_OT)return;setTimeout(()=>{const card=document.querySelector('.otMesa[data-orden-id="'+CSS.escape(FOCUS_OT)+'"]');if(card){card.style.boxShadow='0 0 0 4px rgba(245,158,11,.25)';card.style.borderColor='#f59e0b';card.scrollIntoView({behavior:'smooth',block:'center'})}},120)}
async function cargar(force=false){if(LOADING)return;LOADING=true;try{ocultarLegacy();const d=estabilizarUrlsPotencia(await mesa('board'));DATA=d;if(FOCUS_OT){if((d.soportes||[]).some(x=>x.id===FOCUS_OT))TAB='SOPORTES';else if((d.instalaciones||[]).some(x=>x.id===FOCUS_OT))TAB='INSTALACIONES'}const sig=JSON.stringify(d)+TAB;if($('listaMesa')?.dataset.sig!==sig){$('listaMesa').dataset.sig=sig;render()}}catch(e){if($('listaMesa'))$('listaMesa').innerHTML='<div class="msg err">'+esc(e.message)+'</div>'}finally{LOADING=false}}
window.verificarIpActualMesa=async(id,rid)=>{try{await mesa('verify-current-ip',{orden_id:id,requerimiento_id:rid});await cargar(true)}catch(e){alert(e.message)}};
window.consultarPotenciaAhora=async(id,servicioId)=>{try{const s=ses(),token=s.session_token||'';if(!token)throw new Error('Sesión no disponible');const r=await fetch(SMARTOLT_DIAG+'?t='+Date.now(),{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'live-diagnostic',session_token:token,servicio_id:servicioId})});const d=await r.json().catch(()=>({error:'Respuesta inválida'}));if(!r.ok)throw new Error(d.error||'No se pudo consultar SmartOLT');await cargar(true)}catch(e){alert(e.message)}};
window.seleccionarPotenciaMesa=async(e,id,rid)=>{const f=e.target.files?.[0];if(!f)return;try{await mesa('power-evidence-upload',{orden_id:id,requerimiento_id:rid,mime_type:f.type||'image/jpeg',base64:await dataUrl(f)});await cargar(true)}catch(err){alert(err.message)}finally{e.target.value=''}};
window.pegarPotenciaMesa=async(e,id,rid)=>{e.preventDefault();const items=[...(e.clipboardData?.items||[])],it=items.find(x=>String(x.type||'').startsWith('image/'));if(!it){alert('El portapapeles no contiene una imagen.');return}const f=it.getAsFile();if(!f)return;try{await mesa('power-evidence-upload',{orden_id:id,requerimiento_id:rid,mime_type:f.type||'image/png',base64:await dataUrl(f)});await cargar(true)}catch(err){alert(err.message)}};
window.enviarAvisoPotencia=async(file,id,rid)=>{
 if(!file)return;
 const observacion=prompt('¿Qué debe corregir Bryan?','Revisar potencia óptica y limpiar puertos/conectores');
 if(!observacion?.trim())return;
 try{await mesa('power-diagnostic-upload',{orden_id:id,requerimiento_id:rid,observacion:observacion.trim(),mime_type:file.type||'image/png',base64:await dataUrl(file)});await cargar(true)}
 catch(e){alert('No se pudo enviar el aviso: '+e.message)}
};
window.seleccionarAvisoPotencia=async(e,id,rid)=>{try{await window.enviarAvisoPotencia(e.target.files?.[0],id,rid)}finally{e.target.value=''}};
window.pegarAvisoPotencia=async(e,id,rid)=>{
 e.preventDefault();
 const it=[...(e.clipboardData?.items||[])].find(x=>String(x.type||'').startsWith('image/'));
 const file=it?.getAsFile();if(!file){alert('Pega una foto de diagnóstico');return}
 await window.enviarAvisoPotencia(file,id,rid);
};
window.solicitarPotenciaHuaweiMesa=async id=>{
 if(!confirm('¿Solicitar una lectura Huawei individual? Se reutilizará si ya existe una solicitud pendiente.'))return;
 try{
   const r=await mesa('request-huawei-optical',{orden_id:id});
   alert(r.reutilizada?'⏳ Se reutilizó la lectura pendiente de esta ONU.':'✅ Lectura Huawei solicitada; resultado compartido con el técnico.');
   await cargar(true);
 }catch(e){alert('No se pudo solicitar Huawei: '+e.message)}
};
window.repetirVerificacionMesa=async(id,rid)=>{
 if(!confirm('¿Reiniciar esta verificación? Se conserva la comprobación anterior en el historial, pero la misma etapa volverá a PENDIENTE y necesitará una nueva evidencia. No se modifica IP, ONU ni otra etapa de la OT.'))return;
 try{await mesa('repeat-support-check',{orden_id:id,requerimiento_id:rid,confirmacion:'REPETIR VERIFICACION'});await cargar(true)}
 catch(err){alert('No se pudo reiniciar la verificación: '+err.message)}
};
window.rectificarAccesoRemotoMesa=async(e,id)=>{
 const file=e.target.files?.[0];if(!file)return;
 const motivo=prompt('¿Por qué reemplazas la captura de acceso remoto?','Subí una captura equivocada');
 if(!motivo?.trim())return;
 if(!confirm('Se conservará la imagen anterior en el historial y Bryan verá la nueva. ¿Continuar?'))return;
 try{await arApi('replace-confirmed-evidence',{orden_id:id,motivo:motivo.trim(),mime_type:file.type||'image/jpeg',base64:await dataUrl(file)});await cargar(true)}
 catch(err){alert('No se pudo rectificar la captura: '+err.message)}finally{e.target.value=''}
};
window.rectificarPotenciaMesa=async(e,id,rid)=>{
 const file=e.target.files?.[0];if(!file)return;
 const motivo=prompt('¿Por qué reemplazas la captura de potencia?','Subí una captura equivocada');
 if(!motivo?.trim())return;
 if(!confirm('Se conservará la imagen anterior. No cambiarán la lectura ni el estado ATENDIDO. ¿Continuar?'))return;
 try{await mesa('power-evidence-rectify',{orden_id:id,requerimiento_id:rid,motivo:motivo.trim(),mime_type:file.type||'image/jpeg',base64:await dataUrl(file)});await cargar(true)}
 catch(err){alert('No se pudo rectificar la captura óptica: '+err.message)}finally{e.target.value=''}
};
window.confirmarPotenciaMesa=async(id,rid)=>{if(!confirm('¿Confirmar la lectura óptica junto con la captura de SmartOLT?'))return;try{await mesa('confirm-power-check',{orden_id:id,requerimiento_id:rid});await cargar(true)}catch(e){alert(e.message)}};
window.resolverReqMesa=async(id,rid)=>{if(!confirm('¿Marcar este requerimiento completo como atendido?'))return;try{await mesa('resolve-support-request',{orden_id:id,requerimiento_id:rid,canal_resolucion:'SISTEMA'});await cargar(true)}catch(e){alert(e.message)}};
window.confirmarClienteMesa=async id=>{if(!confirm('¿Confirmar que el cliente/servicio ya fue registrado o activado en el sistema?'))return;try{await mesa('confirm-client',{orden_id:id});await cargar(true)}catch(e){alert(e.message)}};
async function dataUrl(f){return await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result||''));r.onerror=rej;r.readAsDataURL(f)})}
window.subirOnuMesa=async(e,id)=>{const f=e.target.files?.[0];if(!f)return;try{await mesa('onu-upload',{orden_id:id,mime_type:f.type||'image/jpeg',base64:await dataUrl(f)});await cargar(true)}catch(err){alert(err.message)}finally{e.target.value=''}};
window.pegarOnuMesa=async(e,id)=>{e.preventDefault();const items=[...(e.clipboardData?.items||[])],it=items.find(x=>String(x.type||'').startsWith('image/'));if(!it){alert('El portapapeles no contiene una imagen.');return}const f=it.getAsFile();if(!f)return;try{await mesa('onu-upload',{orden_id:id,mime_type:f.type||'image/png',base64:await dataUrl(f)});await cargar(true)}catch(err){alert(err.message)}};
window.confirmarIpMesa=async(id,candidato)=>{if(!confirm('¿Confirmar esta IP como definitiva?'))return;try{await ipApi('confirm',{orden_id:id,candidato_id:candidato});await cargar(true)}catch(e){alert(e.message)}};
window.ipManualMesa=async(id,sol,actual)=>{const ip=prompt('IP correcta:',actual||'');if(!ip)return;const obs=prompt('Observación opcional:','')||'';try{await ipApi('assign-manual',{orden_id:id,solicitud_id:sol,ip:ip.trim(),observacion:obs});await cargar(true)}catch(e){alert(e.message)}};
window.confirmarRemotoMesa=async id=>{if(!confirm('¿Confirmar que el acceso remoto funciona correctamente?'))return;try{await arApi('confirm',{orden_id:id});await cargar(true)}catch(e){alert(e.message)}};
window.corregirRemotoMesa=async id=>{const obs=prompt('¿Qué debe corregir el técnico?');if(!obs)return;try{await arApi('correction',{orden_id:id,observacion:obs});await cargar(true)}catch(e){alert(e.message)}};

const MANUAL_ONU_API=BASE+'inventario-onu-autorizacion-manual';
async function manualOnu(action,orden_id,payload={}){
 const token=ses().session_token||'';
 if(!token)throw Error('Sesión general requerida');
 // Petición CORS simple: evitar OPTIONS en navegadores de escritorio.
 const r=await fetch(MANUAL_ONU_API,{method:'POST',cache:'no-store',headers:{'Content-Type':'text/plain;charset=UTF-8'},
   body:JSON.stringify({action,orden_id,session_token:token,...payload})});
 const d=await r.json().catch(()=>({}));
 if(!r.ok||d.error)throw Error(d.error||('Error HTTP '+r.status));
 return d;
}
function crearModalOnuManual(){
 let wrap=$('onuManualDialog');
 if(wrap)return wrap;
 wrap=document.createElement('div');wrap.id='onuManualDialog';
 wrap.style.cssText='position:fixed;inset:0;z-index:999999;background:rgba(0,25,42,.69);display:none;overflow-y:auto;padding:30px 12px';
 wrap.innerHTML='<section style="max-width:660px;margin:auto;background:#fff;border-radius:14px;padding:18px;color:#163649;box-shadow:0 20px 70px #0004">'+
 '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px"><h3 style="margin:0;font-size:20px">📡 Autorizar ONU Huawei (manual)</h3><button type="button" id="onuMCerrar" style="width:auto;padding:8px 12px">Cerrar</button></div>'+
 '<p id="onuMInfo" style="font-size:12px;background:#eaf4f9;padding:10px;border-radius:7px">Cargando datos…</p>'+
 '<form id="onuMForm" style="display:grid;gap:10px">'+
 '<label style="display:grid;gap:4px">Nombre / descripción ONU * <input id="onuMNombre" maxlength="120" required placeholder="Cliente o identificación de la ONU" style="padding:10px;border:1px solid #bdd0de;border-radius:7px"></label>'+
 '<label style="display:grid;gap:4px">NAP <input id="onuMNap" maxlength="80" placeholder="NAP identificada por el técnico" style="padding:10px;border:1px solid #bdd0de;border-radius:7px"></label>'+
 '<label style="display:grid;gap:4px">Zona <input id="onuMZona" maxlength="80" placeholder="Zona o sector" style="padding:10px;border:1px solid #bdd0de;border-radius:7px"></label>'+
 '<label style="display:grid;gap:4px">IP (solo referencia administrativa) <input id="onuMIp" placeholder="172.25.x.x — no se configura en la ONU" style="padding:10px;border:1px solid #bdd0de;border-radius:7px"></label>'+
 '<div style="font-size:11px;background:#fff2d9;padding:10px;border-radius:7px">Se requiere NAP o zona. La IP es opcional e informativa. El serial, modelo, OLT y PON vienen del detector Huawei. No se copian a mano.</div>'+
 '<button type="submit" id="onuMGuardar" style="background:#116a89;color:white;border:0;border-radius:8px;padding:12px;cursor:pointer">Guardar datos administrativos</button>'+
 '<button type="button" id="onuMAprobar" disabled style="background:#cfd8de;color:#52616d;border:0;border-radius:8px;padding:12px">APROBAR AUTORIZACIÓN MANUAL</button>'+
 '<p id="onuMEstado" style="font-size:12px;font-weight:700"></p></form></section>';
 document.body.appendChild(wrap);
 $('onuMCerrar').onclick=()=>wrap.style.display='none';
 wrap.addEventListener('click',e=>{if(e.target===wrap)wrap.style.display='none'});
 return wrap;
}
let ONU_MANUAL_ID='';
window.abrirRegistroOnuManual=async ordenId=>{
 const ot=[...(DATA.instalaciones||[]),...(DATA.soportes||[])].find(x=>x.id===ordenId);
 if(!ot?.onu?.onu_sn){alert('El técnico debe identificar primero la ONU mediante Huawei');return}
 const wrap=crearModalOnuManual();ONU_MANUAL_ID=ordenId;
 wrap.style.display='block';
 $('onuMInfo').textContent='OLT: '+(ot.onu.olt_codigo||'—')+' · PON: '+(ot.onu.onu_pon||'—')+' · Modelo: '+(ot.onu.onu_modelo||'—')+' · SN: '+ot.onu.onu_sn;
 $('onuMEstado').textContent='Consultando datos administrativos…';
 $('onuMAprobar').disabled=true;
 ['onuMNombre','onuMNap','onuMZona','onuMIp'].forEach(id=>$(id).value='');
 try{
  const d=await manualOnu('status',ordenId);
  if(ONU_MANUAL_ID!==ordenId)return;
  const r=d.registro;
  if(r){
   $('onuMNombre').value=r.nombre||'';
   $('onuMNap').value=r.nap||'';
   $('onuMZona').value=r.zona||'';
   $('onuMIp').value=r.ip_administrativa||'';
   $('onuMEstado').textContent='Estado: '+r.estado+(r.estado==='APROBADA_PENDIENTE_EJECUCION'?' · aún NO ejecutada en Huawei':'');
   $('onuMAprobar').disabled=r.estado!=='DATOS_REGISTRADOS';
   if(r.estado!=='DATOS_REGISTRADOS')$('onuMGuardar').disabled=true;
   else $('onuMGuardar').disabled=false;
  }else{
   $('onuMGuardar').disabled=false;
   $('onuMEstado').textContent='Ingresa nombre, NAP o zona y la IP opcional. Después guarda y aprueba.';
  }
 }catch(e){$('onuMEstado').textContent='Error: '+e.message}
};
function bloquearManualOnu(b){$('onuMGuardar').disabled=b;$('onuMAprobar').disabled=b;}
document.addEventListener('submit',async e=>{
 if(e.target?.id!=='onuMForm')return;
 e.preventDefault();const id=ONU_MANUAL_ID;if(!id)return;
 bloquearManualOnu(true);
 try{
  const d=await manualOnu('register',id,{nombre:$('onuMNombre').value,nap:$('onuMNap').value,zona:$('onuMZona').value,ip_administrativa:$('onuMIp').value});
  $('onuMEstado').textContent='✅ Datos guardados. Puedes aprobar manualmente. Huawei permanece sin cambios.';
  $('onuMAprobar').disabled=false;
 }catch(err){$('onuMEstado').textContent='Error: '+err.message}
 finally{$('onuMGuardar').disabled=false}
});
document.addEventListener('click',async e=>{
 if(e.target?.id!=='onuMAprobar')return;
 const id=ONU_MANUAL_ID;if(!id)return;
 if(!confirm('¿Confirmas la aprobación MANUAL de esta ONU? Se registrará una solicitud para Huawei, pero el ejecutor aún está deshabilitado y NO se activará automáticamente.'))return;
 bloquearManualOnu(true);
 try{
  const d=await manualOnu('approve',id);
  $('onuMEstado').textContent='✅ '+(d.nota||'Aprobación registrada. Pendiente de ejecución Huawei.');
  $('onuMAprobar').disabled=true;$('onuMGuardar').disabled=true;
 }catch(err){$('onuMEstado').textContent='Error al aprobar: '+err.message;$('onuMAprobar').disabled=false;$('onuMGuardar').disabled=false}
});

window.addEventListener('disprotel:remote-updated',()=>cargar(true));
const iniciar=()=>{
  const app=$('app');
  if(app){
    const obs=new MutationObserver(()=>{
      if(!app.classList.contains('hidden')&&!$('mesaTecnicaFernando'))crear();
    });
    // Un cambio de visibilidad: no observar fotos, botones y repintados del DOM completo.
    obs.observe(app,{attributes:true,attributeFilter:['class']});
  }
  if(!$('mesaTecnicaFernando'))setTimeout(crear,0);
};
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',iniciar):iniciar();
// El panel se actualiza por eventos privados; respaldo espaciado en lugar de 7 s.
let mesaEventTimer=null;
function mesaEventoActualizado(){
 if(document.hidden||!$('mesaTecnicaFernando')||$('mesaTecnicaFernando').style.display==='none')return;
 clearTimeout(mesaEventTimer);
 mesaEventTimer=setTimeout(()=>cargar(true),800);
}
window.addEventListener('disprotel:mesa-hito',mesaEventoActualizado);
window.addEventListener('disprotel:mesa-dato',mesaEventoActualizado);
window.addEventListener('disprotel:huawei-resultado',mesaEventoActualizado);
window.addEventListener('disprotel:ot-sincronizar',mesaEventoActualizado);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)mesaEventoActualizado()});
setInterval(()=>{const box=$('mesaTecnicaFernando');if(!document.hidden&&box&&box.style.display!=='none')cargar(false)},120000);
})();