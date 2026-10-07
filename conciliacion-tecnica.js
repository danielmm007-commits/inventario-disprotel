const API='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-conciliacion-tecnica',KEY='disprotel_login_general_v2';
let me={};try{me=JSON.parse(sessionStorage.getItem(KEY)||'{}')}catch{}
const H=()=>({'Content-Type':'application/json','x-user':me.usuario||'','x-pin':me.pin||'','x-session':me.session_token||''});
const n=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase(),e=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let rows=[],lote=null,meta=null,currentGroup={codigo:'AUTO',nombre:'Por detectar'},sourceSheet='',lastResultRows=[],lastLote=null;
async function call(b){const r=await fetch(API,{method:'POST',headers:H(),body:JSON.stringify(b)}),d=await r.json().catch(()=>({}));if(!r.ok||d.error)throw Error(d.error||'Error');return d}
function msg(t,k=''){const x=document.getElementById('msg');x.textContent=t;x.className='status '+k}
function map(o){const m={};for(const k of Object.keys(o||{}))m[n(k).replace(/[^A-Z0-9]/g,'')]=k;return m}
function pick(o,m,ks){for(const k of ks){const z=m[k];if(z!=null&&String(o[z]??'').trim())return o[z]}return ''}
function one(o,i){const m=map(o),router=pick(o,m,['ROUTER','ROUTERLEGACY','ROUTERACTUALSUGERIDO','RB','NODO']);return{fila_origen:i,codigo_servicio:pick(o,m,['CODSERVICIO','CODIGOSERVICIOLEGACY','CODIGOSERVICIO','CODIGO','SERVICIO','IDSERVICIO']),identificacion:pick(o,m,['IDENTIFICACION','CEDULA','RUC','DOCUMENTO']),cliente:pick(o,m,['CLIENTE','NOMBRECLIENTE','NOMBRE','TITULAR']),router,ciudad:pick(o,m,['CIUDAD','CANTON','ZONA']),tipo_conexion:pick(o,m,['TIPOCONEXION','TIPOSERVICIO','CONEXION','TIPO']),ip_cliente:String(pick(o,m,['IPCLIENTE','IP','DIRECCIONIP','ADDRESS'])||'').replace(/\/\d+$/,'').trim(),plan:pick(o,m,['PLAN','PLANCODIGO','PLANINTERNET','VELOCIDAD']),direccion:pick(o,m,['DIRECCION','DIRECCIONSERVICIO','DOMICILIO']),raw:o}}
function stats(){const f=rows.filter(x=>/FIBRA|GPON|FTTH/i.test(x.tipo_conexion)).length,r=rows.filter(x=>/RADIO|ANTENA|WIRELESS/i.test(x.tipo_conexion)).length,rs=new Set(rows.map(x=>n(x.router)).filter(Boolean));cTotal.textContent=rows.length;cFibra.textContent=f;cRadio.textContent=r;cRouters.textContent=rs.size}
function preview(){document.getElementById('preview').innerHTML=rows.length?rows.slice(0,300).map(x=>'<tr><td>'+x.fila_origen+'</td><td>'+e(x.codigo_servicio)+'</td><td>'+e(x.cliente)+'</td><td>'+e(x.router)+'</td><td>'+e(x.tipo_conexion)+'</td><td>'+e(x.ip_cliente)+'</td><td>'+e(x.plan)+'</td><td>'+e(x.direccion)+'</td></tr>').join(''):'<tr><td colspan="8">Sin filas.</td></tr>'}
function headerScore(arr){
 const ks=(arr||[]).map(x=>n(x).replace(/[^A-Z0-9]/g,''));
 const wanted=['CODSERVICIO','CLIENTE','ROUTER','TIPOCONEXION','IPCLIENTE','PLAN','DIRECCION'];
 return wanted.filter(w=>ks.includes(w)).length;
}
function detectGroupFromRows(data){
 const routers=[...new Set(data.map(x=>n(x.router)).filter(Boolean))];
 const city=v=>{const z=n(v).replace(/^ROUTER[-_ ]?/,'').replace(/^RB[-_ ]?/,'');if(z.includes('SALCEDO')||z.includes('SANTANA'))return'SALCEDO';if(z.includes('MULALILLO'))return'MULALILLO';if(z.includes('CHAMBAPONGO'))return'CHAMBAPONGO';if(z.includes('LATACUNGA'))return'LATACUNGA';if(z.includes('SAQUISILI'))return'SAQUISILI';if(z.includes('CUICUNO'))return'CUICUNO';return z};
 const cities=routers.map(city),g1=new Set(['SALCEDO','MULALILLO','CHAMBAPONGO']),g2=new Set(['LATACUNGA','SAQUISILI','CUICUNO']);
 if(cities.length&&cities.every(x=>g1.has(x)))return{codigo:'SALCEDO',nombre:'Salcedo · Mulalillo · Chambapongo',routers};
 if(cities.length&&cities.every(x=>g2.has(x)))return{codigo:'LATACUNGA_SAQUISILI',nombre:'Latacunga · Saquisilí · Cuicuno',routers};
 return{codigo:'MIXTO',nombre:'Routers mixtos / por revisar',routers};
}
function rowsFromWorkbook(wb){
 let best=null;
 for(const sheetName of wb.SheetNames){
   const grid=XLSX.utils.sheet_to_json(wb.Sheets[sheetName],{header:1,defval:'',raw:false});
   let headerIndex=-1,bestScore=0;
   for(let i=0;i<Math.min(grid.length,40);i++){const s=headerScore(grid[i]);if(s>bestScore){bestScore=s;headerIndex=i}}
   if(headerIndex<0||bestScore<4)continue;
   const headers=grid[headerIndex].map(x=>String(x||'').trim());
   const objects=[];
   for(let r=headerIndex+1;r<grid.length;r++){
     const vals=grid[r]||[],obj={};headers.forEach((h,i)=>{if(h)obj[h]=vals[i]??''});
     const parsed=one(obj,r+1);
     if(parsed.codigo_servicio||parsed.cliente||parsed.ip_cliente)objects.push(parsed);
   }
   if(!best||objects.length>best.rows.length)best={rows:objects,sheetName,headerRow:headerIndex+1,score:bestScore};
 }
 return best;
}
async function readFile(f){
 msg('Leyendo '+f.name+'…');meta={name:f.name,type:f.type};currentGroup={codigo:'AUTO',nombre:'Por detectar'};sourceSheet='';
 const b=await f.arrayBuffer(),wb=XLSX.read(b,{type:'array'});
 const detected=rowsFromWorkbook(wb);
 if(!detected)throw Error('No encontré la fila de encabezados del reporte. Busco columnas como Cod. Servicio, Cliente, Router, Tipo Conexión e IP Cliente.');
 rows=detected.rows;lote=null;sourceSheet=detected.sheetName;currentGroup=detectGroupFromRows(rows);
 stats();preview();save.disabled=!rows.length;reconcile.disabled=true;
 const gd=document.getElementById('groupDetected');
 gd.innerHTML='<div class="groupDetected">Grupo detectado: '+e(currentGroup.nombre)+' · Hoja: '+e(sourceSheet)+' · Encabezados en fila '+detected.headerRow+' · Routers: '+e(currentGroup.routers.join(' · '))+'</div>';
 msg('Archivo listo: '+rows.length+' servicios reconocidos.','ok');
}
file.onchange=()=>file.files[0]&&readFile(file.files[0]).catch(x=>msg(x.message,'err'));
['dragenter','dragover'].forEach(v=>drop.addEventListener(v,x=>{x.preventDefault();drop.classList.add('drag')}));['dragleave','drop'].forEach(v=>drop.addEventListener(v,x=>{x.preventDefault();drop.classList.remove('drag')}));drop.ondrop=x=>{const f=x.dataTransfer.files[0];if(f)readFile(f).catch(y=>msg(y.message,'err'))};
save.onclick=async()=>{try{save.disabled=true;save.textContent='Guardando…';const d=await call({action:'upload',archivo_nombre:meta?.name||'archivo.xlsx',archivo_tipo:meta?.type||'',grupo_codigo:currentGroup.codigo,grupo_nombre:currentGroup.nombre,rows});lote=d.lote_id;reconcile.disabled=false;msg('Lote guardado. Ya puedes conciliar.','ok');await history()}catch(x){msg(x.message,'err')}finally{save.disabled=false;save.textContent='Guardar lote'}};
reconcile.onclick=async()=>{try{if(!lote)throw Error('Primero guarda el lote');reconcile.disabled=true;reconcile.textContent='Conciliando…';await call({action:'reconcile',lote_id:lote});await openLote(lote);show('result');msg('Conciliación terminada.','ok');await history()}catch(x){msg(x.message,'err')}finally{reconcile.disabled=false;reconcile.textContent='Ejecutar conciliación'}};
clear.onclick=()=>{rows=[];lote=null;lastResultRows=[];lastLote=null;file.value='';currentGroup={codigo:'AUTO',nombre:'Por detectar'};sourceSheet='';stats();preview();save.disabled=true;reconcile.disabled=true;exportIssues.disabled=true;exportIssuesPdf.disabled=true;exportResultExcel.disabled=true;exportResultPdf.disabled=true;document.getElementById('groupDetected').innerHTML='';msg('Sin archivo cargado.')};
function cls(r){return /^OK_/.test(r)?'ok':/SIN_|DUPLICADA|OTRA|REVISAR/.test(r)?'warn':''}
function render(a,l){lastResultRows=a||[];lastLote=l||null;const has=lastResultRows.length>0,hasIssues=lastResultRows.some(x=>!/^OK_/.test(String(x.resultado||'')));document.getElementById('exportIssues').disabled=!hasIssues;document.getElementById('exportIssuesPdf').disabled=!hasIssues;document.getElementById('exportResultExcel').disabled=!has;document.getElementById('exportResultPdf').disabled=!has;const c={};a.forEach(x=>c[x.resultado||'SIN_RESULTADO']=(c[x.resultado||'SIN_RESULTADO']||0)+1);resultCards.innerHTML=Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([k,v])=>'<div class="card"><strong>'+v+'</strong><span>'+e(k.replaceAll('_',' '))+'</span></div>').join('');resultSub.textContent=l?(l.archivo_nombre+' · '+(l.grupo_nombre||'')+' · '+a.length+' servicios'):'';results.innerHTML=a.length?a.map(x=>'<tr><td><span class="badge '+cls(x.resultado||'')+'">'+e(x.resultado||'—')+'</span></td><td>'+e(x.codigo_servicio)+'</td><td>'+e(x.cliente)+'</td><td>'+e(x.tipo_conexion)+'</td><td>'+e(x.ip_cliente)+'</td><td>'+e(x.rb_encontrado?((x.rb_comentario||'Encontrado')+' · '+(x.rb_lista||'')):'NO')+'</td><td>'+e(x.huawei_encontrado?((x.huawei_olt_codigo||'')+' · '+(x.huawei_fsp||'')+' · '+(x.huawei_onu_sn||'')):'NO')+'</td><td>'+e(x.detalle||'')+'</td></tr>').join(''):'<tr><td colspan="8">Sin resultados.</td></tr>'}
async function openLote(id){const d=await call({action:'detail',lote_id:id});lote=id;render(d.rows,d.lote);reconcile.disabled=false}
async function history(){const d=await call({action:'list-lotes'});document.getElementById('history').innerHTML=(d.lotes||[]).length?d.lotes.map(x=>'<div class="histItem"><div><b>'+e(x.archivo_nombre)+'</b><small>'+e(x.grupo_nombre||'Sin grupo')+' · '+e(x.cargado_por_nombre||'')+' · '+new Date(x.created_at).toLocaleString('es-EC')+' · '+x.filas_total+' servicios · '+e(x.estado)+'</small></div><button class="btn alt" onclick="openLote(\''+x.id+'\').then(()=>show(\'result\')).catch(x=>msg(x.message,\'err\'))">Abrir</button></div>').join(''):'<div class="status">Aún no hay cargas.</div>'}
function exportInconsistencias(){
 const bad=(lastResultRows||[]).filter(x=>!/^OK_/.test(String(x.resultado||'')));
 if(!bad.length){msg('No hay inconsistencias para exportar.','ok');return}
 const out=bad.map(x=>({
   Resultado:x.resultado||'',
   Detalle:x.detalle||'',
   Codigo_Servicio:x.codigo_servicio||'',
   Cliente:x.cliente||'',
   Identificacion:x.identificacion||'',
   Tipo_Conexion:x.tipo_conexion||'',
   IP:x.ip_cliente||'',
   Router_Archivo:x.router||'',
   Router_RB:x.rb_encontrado?(x.rb_comentario||'ENCONTRADO'):'NO',
   Lista_RB:x.rb_lista||'',
   OLT_Esperada:x.olt_esperada||'',
   OLT_Huawei:x.huawei_olt_codigo||'',
   FSP:x.huawei_fsp||'',
   ONT_ID:x.huawei_ont_id??'',
   SN_Huawei:x.huawei_onu_sn||'',
   Confianza:x.confianza??''
 }));
 const ws=XLSX.utils.json_to_sheet(out),wb=XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb,ws,'Inconsistencias');
 const group=(currentGroup?.codigo||'CONCILIACION').replace(/[^A-Z0-9_-]/gi,'_');
 const date=new Date().toISOString().slice(0,10);
 XLSX.writeFile(wb,'INCONSISTENCIAS_'+group+'_'+date+'.xlsx');
 msg('Archivo de inconsistencias generado localmente. No se guarda en el servidor.','ok');
}
document.getElementById('exportIssues').onclick=exportInconsistencias;
function exportRows(rowsToExport,kind){
 const out=(rowsToExport||[]).map(x=>({
   Resultado:x.resultado||'',
   Detalle:x.detalle||'',
   Codigo_Servicio:x.codigo_servicio||'',
   Cliente:x.cliente||'',
   Identificacion:x.identificacion||'',
   Tipo_Conexion:x.tipo_conexion||'',
   IP:x.ip_cliente||'',
   Router_Archivo:x.router||'',
   RB_Encontrado:x.rb_encontrado?'SI':'NO',
   Comentario_RB:x.rb_comentario||'',
   Lista_RB:x.rb_lista||'',
   OLT_Esperada:x.olt_esperada||'',
   Huawei_Encontrado:x.huawei_encontrado?'SI':'NO',
   OLT_Huawei:x.huawei_olt_codigo||'',
   FSP:x.huawei_fsp||'',
   ONT_ID:x.huawei_ont_id??'',
   SN_Huawei:x.huawei_onu_sn||'',
   Confianza:x.confianza??''
 }));
 const ws=XLSX.utils.json_to_sheet(out),wb=XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb,ws,kind==='INCONSISTENCIAS'?'Inconsistencias':'Resultado');
 const group=(lastLote?.grupo_codigo||currentGroup?.codigo||'CONCILIACION').replace(/[^A-Z0-9_-]/gi,'_');
 const date=new Date().toISOString().slice(0,10);
 XLSX.writeFile(wb,kind+'_'+group+'_'+date+'.xlsx');
 msg('Excel generado localmente. No se guarda en el servidor.','ok');
}
function exportPdf(rowsToExport,kind){
 const jsPDFCtor=window.jspdf?.jsPDF;
 if(!jsPDFCtor)throw Error('No se pudo cargar el generador PDF');
 const doc=new jsPDFCtor({orientation:'landscape',unit:'mm',format:'a4'});
 const group=lastLote?.grupo_nombre||currentGroup?.nombre||'Conciliación';
 const fileGroup=(lastLote?.grupo_codigo||currentGroup?.codigo||'CONCILIACION').replace(/[^A-Z0-9_-]/gi,'_');
 const date=new Date().toISOString().slice(0,10);
 doc.setFontSize(14);doc.text('DISPROTEL · Conciliación técnica',10,10);
 doc.setFontSize(9);doc.text((kind==='INCONSISTENCIAS'?'Inconsistencias':'Resultado completo')+' · '+group+' · '+date,10,16);
 const body=(rowsToExport||[]).map(x=>[
   x.resultado||'',x.codigo_servicio||'',x.cliente||'',x.tipo_conexion||'',x.ip_cliente||'',
   x.rb_encontrado?'SI':'NO',x.huawei_encontrado?((x.huawei_olt_codigo||'')+' '+(x.huawei_fsp||'')):'NO',
   x.detalle||''
 ]);
 doc.autoTable({startY:20,head:[['Resultado','Código','Cliente','Tipo','IP','RB','Huawei','Detalle']],body,styles:{fontSize:6,cellPadding:1.3},headStyles:{fontSize:6},columnStyles:{2:{cellWidth:42},7:{cellWidth:68}}});
 doc.save(kind+'_'+fileGroup+'_'+date+'.pdf');
 msg('PDF generado localmente. No se guarda en el servidor.','ok');
}
document.getElementById('exportResultExcel').onclick=()=>exportRows(lastResultRows,'RESULTADO_CONCILIACION');
document.getElementById('exportResultPdf').onclick=()=>{try{exportPdf(lastResultRows,'RESULTADO_CONCILIACION')}catch(x){msg(x.message,'err')}};
document.getElementById('exportIssuesPdf').onclick=()=>{try{exportPdf(lastResultRows.filter(x=>!/^OK_/.test(String(x.resultado||''))),'INCONSISTENCIAS')}catch(x){msg(x.message,'err')}};

function show(v){previewView.style.display=v==='preview'?'block':'none';resultView.style.display=v==='result'?'block':'none';document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('on',b.dataset.view===v))}
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>show(b.dataset.view));history().catch(x=>history.innerHTML='<div class="status err">'+e(x.message)+'</div>');

/* ===== Conciliación manual ERP ↔ SmartOLT (solo FIBRA) ===== */
let smartErpRows=[],smartRows=[],smartResult=[];

function smartMsgSet(t,k=''){const x=document.getElementById('smartMsg');x.textContent=t;x.className='status '+k}
function compact(v){return n(v).replace(/[^A-Z0-9]/g,'')}
function normIp(v){
  const raw=String(v??'').replace(/\s+/g,'');
  const m=raw.match(/(?:\d{1,3}\.){3}\d{1,3}/);
  if(!m)return '';
  const p=m[0].split('.').map(Number);
  return p.length===4&&p.every(x=>x>=0&&x<=255)?p.join('.'):'';
}
function nameTokens(v){
  const stop=new Set(['DE','DEL','LA','LAS','LOS','Y']);
  return n(v).replace(/[^A-Z0-9Ñ ]/g,' ').split(/\s+/).filter(x=>x&&x.length>1&&!stop.has(x));
}
function nameSimilarity(a,b){
  const A=nameTokens(a),B=nameTokens(b);if(!A.length||!B.length)return 0;
  const bs=new Set(B),common=A.filter(x=>bs.has(x)).length;
  return common/Math.max(A.length,B.length);
}
function branchOfRouter(v){
  const z=n(v);
  if(z.includes('SALCEDO')||z.includes('SANTANA'))return'SALCEDO';
  if(z.includes('LATACUNGA'))return'LATACUNGA';
  if(z.includes('SAQUISILI')||z.includes('CUICUNO'))return'SAQUISILI';
  return '';
}
function smartHeaderScore(arr){
  const ks=(arr||[]).map(x=>compact(x));
  const patterns=['NAME','NOMBRE','CLIENT','DESCRIPTION','DESCRIPCION','IP','ADDRESS','SN','SERIAL','OLT','ZONE','ZONA'];
  return patterns.filter(p=>ks.some(k=>k.includes(p))).length;
}
function smartOne(o,i){
  const m=map(o);
  const get=ks=>pick(o,m,ks);
  const name=get(['NAME','NOMBRE','CLIENTE','CLIENT','ONUNAME','ONTNAME','DESCRIPTION','DESCRIPCION','DESCR']);
  const ipRaw=get(['IP','IPADDRESS','ADDRESS','IPCLIENTE','IPADDRESSDESCRIPTION','DESCRIPTIONIP']);
  return {
    fila:i,
    nombre:String(name||'').trim(),
    ip_raw:String(ipRaw||'').trim(),
    ip:normIp(ipRaw),
    sn:get(['SN','SERIAL','SERIALNUMBER','ONUSN','ONTSN']),
    olt:get(['OLT','OLTNAME','NODO']),
    zona:get(['ZONE','ZONA','NAP','AREA']),
    raw:o
  };
}
function smartRowsFromWorkbook(wb){
  let best=null;
  for(const sheetName of wb.SheetNames){
    const grid=XLSX.utils.sheet_to_json(wb.Sheets[sheetName],{header:1,defval:'',raw:false});
    let headerIndex=-1,bestScore=0;
    for(let i=0;i<Math.min(grid.length,50);i++){const s=smartHeaderScore(grid[i]);if(s>bestScore){bestScore=s;headerIndex=i}}
    if(headerIndex<0||bestScore<2)continue;
    const headers=grid[headerIndex].map(x=>String(x||'').trim()),objects=[];
    for(let r=headerIndex+1;r<grid.length;r++){
      const vals=grid[r]||[],obj={};headers.forEach((h,i)=>{if(h)obj[h]=vals[i]??''});
      const p=smartOne(obj,r+1);
      if(p.nombre||p.ip||p.sn)objects.push(p);
    }
    if(!best||objects.length>best.rows.length)best={rows:objects,sheetName,headerRow:headerIndex+1};
  }
  return best;
}
async function loadSmartErp(f){
  const b=await f.arrayBuffer(),wb=XLSX.read(b,{type:'array'}),det=rowsFromWorkbook(wb);
  if(!det)throw Error('No pude reconocer el archivo ERP.');
  const suc=document.getElementById('smartSucursal').value;
  smartErpRows=det.rows.filter(x=>/FIBRA|GPON|FTTH/i.test(x.tipo_conexion)&&branchOfRouter(x.router)===suc);
  document.getElementById('sErp').textContent=smartErpRows.length;
  smartMsgSet('ERP listo: '+smartErpRows.length+' servicios FIBRA de '+suc+'.','ok');
  smartReady();
}
async function loadSmartOlt(f){
  const b=await f.arrayBuffer(),wb=XLSX.read(b,{type:'array'}),det=smartRowsFromWorkbook(wb);
  if(!det)throw Error('No pude reconocer las columnas del archivo SmartOLT.');
  smartRows=det.rows;
  document.getElementById('sSmart').textContent=smartRows.length;
  smartMsgSet('SmartOLT listo: '+smartRows.length+' registros.','ok');
  smartReady();
}
function smartReady(){document.getElementById('smartRun').disabled=!(smartErpRows.length&&smartRows.length)}
function reconcileSmart(){
  const used=new Set(),out=[];
  const byIp=new Map();
  smartRows.forEach((s,i)=>{if(s.ip){if(!byIp.has(s.ip))byIp.set(s.ip,[]);byIp.get(s.ip).push({s,i})}});
  for(const erp of smartErpRows){
    const eip=normIp(erp.ip_cliente),ename=erp.cliente;
    let candidates=eip?(byIp.get(eip)||[]):[],chosen=null,result='',detail='',score=0;
    if(candidates.length===1){
      chosen=candidates[0];
      const sim=nameSimilarity(ename,chosen.s.nombre);
      if(sim>=0.75){result='OK_IP_NOMBRE';detail='IP exacta y nombre consistente.';score=100}
      else if(sim>=0.4){result='OK_IP_NOMBRE_PARCIAL';detail='IP exacta; nombre SmartOLT parcial/incompleto.';score=95}
      else if(chosen.s.nombre){result='IP_COINCIDE_NOMBRE_DIFERENTE';detail='La IP coincide, pero el nombre de SmartOLT no parece corresponder.';score=80}
      else{result='OK_IP_SMARTOLT_SIN_NOMBRE';detail='IP exacta; SmartOLT no tiene nombre útil.';score=90}
    }else if(candidates.length>1){
      result='IP_DUPLICADA_SMARTOLT';detail='La misma IP aparece varias veces en SmartOLT.';score=50;
    }else{
      const nameCands=[];
      smartRows.forEach((s,i)=>{
        const sim=nameSimilarity(ename,s.nombre);
        if(sim>=0.6)nameCands.push({s,i,sim});
      });
      nameCands.sort((a,b)=>b.sim-a.sim);
      if(nameCands.length===1 || (nameCands.length>1 && nameCands[0].sim-nameCands[1].sim>=0.2)){
        chosen=nameCands[0];
        if(chosen.s.ip && eip && chosen.s.ip!==eip){
          result='IP_DIFERENTE';detail='Nombre coincide, pero la IP es diferente en SmartOLT.';score=85;
        }else if(!chosen.s.ip && /\d/.test(chosen.s.ip_raw||'')){
          result='IP_SMARTOLT_INCOMPLETA';detail='Nombre coincide; la IP de SmartOLT está incompleta o mal formateada.';score=85;
        }else{
          result='OK_NOMBRE_SMARTOLT_SIN_IP';detail='Nombre coincide; SmartOLT no contiene una IP utilizable.';score=80;
        }
      }else if(nameCands.length>1){
        chosen=nameCands[0];result='POSIBLE_COINCIDENCIA_REVISAR';detail='Hay varias coincidencias parciales por nombre en SmartOLT.';score=55;
      }else{
        result='CLIENTE_NO_ENCONTRADO_SMARTOLT';detail='No se encontró coincidencia confiable por IP ni por nombre.';score=20;
      }
    }
    if(chosen)used.add(chosen.i);
    out.push({resultado:result,codigo_servicio:erp.codigo_servicio,erp_nombre:ename,erp_ip:eip,smart_nombre:chosen?.s.nombre||'',smart_ip:chosen?.s.ip||'',smart_ip_raw:chosen?.s.ip_raw||'',smart_sn:chosen?.s.sn||'',detalle:detail,confianza:score});
  }
  smartRows.forEach((s,i)=>{if(!used.has(i))out.push({resultado:'ONU_SMARTOLT_SIN_CLIENTE_ERP',codigo_servicio:'',erp_nombre:'',erp_ip:'',smart_nombre:s.nombre,smart_ip:s.ip,smart_ip_raw:s.ip_raw,smart_sn:s.sn,detalle:'Registro SmartOLT sin correspondencia en los servicios FIBRA ERP de la sucursal seleccionada.',confianza:70})});
  smartResult=out;renderSmart();
}
function smartIsOk(r){return /^OK_/.test(String(r||''))}
function renderSmart(){
  const c={};smartResult.forEach(x=>c[x.resultado]=(c[x.resultado]||0)+1);
  const ok=smartResult.filter(x=>smartIsOk(x.resultado)).length,issues=smartResult.length-ok;
  document.getElementById('sOk').textContent=ok;document.getElementById('sIssue').textContent=issues;
  document.getElementById('smartCards').innerHTML=Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([k,v])=>'<div class="card"><strong>'+v+'</strong><span>'+e(k.replaceAll('_',' '))+'</span></div>').join('');
  document.getElementById('smartResults').innerHTML=smartResult.length?smartResult.map(x=>'<tr><td><span class="badge '+(smartIsOk(x.resultado)?'ok':'warn')+'">'+e(x.resultado)+'</span></td><td>'+e(x.codigo_servicio)+'</td><td>'+e(x.erp_nombre)+'</td><td>'+e(x.erp_ip)+'</td><td>'+e(x.smart_nombre)+'</td><td>'+e(x.smart_ip||x.smart_ip_raw)+'</td><td>'+e(x.detalle)+'</td></tr>').join(''):'<tr><td colspan="7">Sin resultados.</td></tr>';
  document.getElementById('smartExcel').disabled=!smartResult.length;
  document.getElementById('smartIssuesExcel').disabled=!issues;
  document.getElementById('smartPdf').disabled=!issues;
  document.getElementById('smartSub').textContent=document.getElementById('smartSucursal').value+' · '+smartResult.length+' filas de resultado';
  smartMsgSet('Conciliación ERP ↔ SmartOLT terminada. No se almacenó ningún archivo.','ok');
}
function smartExport(kind,issuesOnly=false){
  const data=issuesOnly?smartResult.filter(x=>!smartIsOk(x.resultado)):smartResult;
  const out=data.map(x=>({Resultado:x.resultado,Codigo_Servicio:x.codigo_servicio,Cliente_ERP:x.erp_nombre,IP_ERP:x.erp_ip,Nombre_SmartOLT:x.smart_nombre,IP_SmartOLT:x.smart_ip||x.smart_ip_raw,SN_SmartOLT:x.smart_sn,Detalle:x.detalle,Confianza:x.confianza}));
  const ws=XLSX.utils.json_to_sheet(out),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,issuesOnly?'Inconsistencias':'Resultado');
  XLSX.writeFile(wb,kind+'_'+document.getElementById('smartSucursal').value+'_'+new Date().toISOString().slice(0,10)+'.xlsx');
}
function smartExportPdf(){
  const data=smartResult.filter(x=>!smartIsOk(x.resultado)),Ctor=window.jspdf?.jsPDF;if(!Ctor)throw Error('No se pudo cargar PDF');
  const doc=new Ctor({orientation:'landscape',unit:'mm',format:'a4'}),suc=document.getElementById('smartSucursal').value,date=new Date().toISOString().slice(0,10);
  doc.setFontSize(14);doc.text('DISPROTEL · Conciliación ERP ↔ SmartOLT',10,10);doc.setFontSize(9);doc.text('Sucursal '+suc+' · Solo inconsistencias · '+date,10,16);
  doc.autoTable({startY:20,head:[['Resultado','Código','ERP','IP ERP','SmartOLT','IP SmartOLT','Detalle']],body:data.map(x=>[x.resultado,x.codigo_servicio,x.erp_nombre,x.erp_ip,x.smart_nombre,x.smart_ip||x.smart_ip_raw,x.detalle]),styles:{fontSize:6,cellPadding:1.2},columnStyles:{2:{cellWidth:42},4:{cellWidth:42},6:{cellWidth:65}}});
  doc.save('INCONSISTENCIAS_ERP_SMARTOLT_'+suc+'_'+date+'.pdf');
}
document.getElementById('erpSmartFile').onchange=()=>erpSmartFile.files[0]&&loadSmartErp(erpSmartFile.files[0]).catch(x=>smartMsgSet(x.message,'err'));
document.getElementById('smartOltFile').onchange=()=>smartOltFile.files[0]&&loadSmartOlt(smartOltFile.files[0]).catch(x=>smartMsgSet(x.message,'err'));
document.getElementById('smartRun').onclick=()=>{try{reconcileSmart()}catch(x){smartMsgSet(x.message,'err')}};
document.getElementById('smartExcel').onclick=()=>smartExport('RESULTADO_ERP_SMARTOLT',false);
document.getElementById('smartIssuesExcel').onclick=()=>smartExport('INCONSISTENCIAS_ERP_SMARTOLT',true);
document.getElementById('smartPdf').onclick=()=>{try{smartExportPdf()}catch(x){smartMsgSet(x.message,'err')}};
document.getElementById('smartClear').onclick=()=>{smartErpRows=[];smartRows=[];smartResult=[];erpSmartFile.value='';smartOltFile.value='';sErp.textContent='0';sSmart.textContent='0';sOk.textContent='0';sIssue.textContent='0';smartRun.disabled=true;smartExcel.disabled=true;smartIssuesExcel.disabled=true;smartPdf.disabled=true;smartCards.innerHTML='';smartResults.innerHTML='<tr><td colspan="7">Sin resultados.</td></tr>';smartMsgSet('Carga los dos archivos para comenzar.')};
document.getElementById('smartSucursal').onchange=()=>{if(erpSmartFile.files[0])loadSmartErp(erpSmartFile.files[0]).catch(x=>smartMsgSet(x.message,'err'))};

document.getElementById('modeRed').onclick=()=>{
  redMode.style.display='block';smartMode.style.display='none';
  modeRed.classList.add('on');modeSmart.classList.remove('on');
  modeBanner.className='modeBanner red';
  modeBanner.textContent='MODO ACTIVO: CONCILIACIÓN DE RED · ERP/Base ↔ MikroTik ↔ Huawei';
  window.scrollTo({top:0,behavior:'smooth'});
};
document.getElementById('modeSmart').onclick=()=>{
  redMode.style.display='none';smartMode.style.display='block';
  modeSmart.classList.add('on');modeRed.classList.remove('on');
  modeBanner.className='modeBanner smart';
  modeBanner.textContent='MODO ACTIVO: CONCILIACIÓN DE DATOS FIBRA · carga manual ERP ↔ archivo SmartOLT';
  window.scrollTo({top:0,behavior:'smooth'});
};
