const API='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-conciliacion-tecnica',KEY='disprotel_login_general_v2';
let me={};try{me=JSON.parse(sessionStorage.getItem(KEY)||'{}')}catch{}
const H=()=>({'Content-Type':'application/json','x-user':me.usuario||'','x-pin':me.pin||'','x-session':me.session_token||''});
const n=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase(),e=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let rows=[],lote=null,meta=null,currentGroup={codigo:'AUTO',nombre:'Por detectar'},sourceSheet='';
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
clear.onclick=()=>{rows=[];lote=null;file.value='';currentGroup={codigo:'AUTO',nombre:'Por detectar'};sourceSheet='';stats();preview();save.disabled=true;reconcile.disabled=true;document.getElementById('groupDetected').innerHTML='';msg('Sin archivo cargado.')};
function cls(r){return /^OK_/.test(r)?'ok':/SIN_|DUPLICADA|OTRA|REVISAR/.test(r)?'warn':''}
function render(a,l){const c={};a.forEach(x=>c[x.resultado||'SIN_RESULTADO']=(c[x.resultado||'SIN_RESULTADO']||0)+1);resultCards.innerHTML=Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([k,v])=>'<div class="card"><strong>'+v+'</strong><span>'+e(k.replaceAll('_',' '))+'</span></div>').join('');resultSub.textContent=l?(l.archivo_nombre+' · '+(l.grupo_nombre||'')+' · '+a.length+' servicios'):'';results.innerHTML=a.length?a.map(x=>'<tr><td><span class="badge '+cls(x.resultado||'')+'">'+e(x.resultado||'—')+'</span></td><td>'+e(x.codigo_servicio)+'</td><td>'+e(x.cliente)+'</td><td>'+e(x.tipo_conexion)+'</td><td>'+e(x.ip_cliente)+'</td><td>'+e(x.rb_encontrado?((x.rb_comentario||'Encontrado')+' · '+(x.rb_lista||'')):'NO')+'</td><td>'+e(x.huawei_encontrado?((x.huawei_olt_codigo||'')+' · '+(x.huawei_fsp||'')+' · '+(x.huawei_onu_sn||'')):'NO')+'</td><td>'+e(x.detalle||'')+'</td></tr>').join(''):'<tr><td colspan="8">Sin resultados.</td></tr>'}
async function openLote(id){const d=await call({action:'detail',lote_id:id});lote=id;render(d.rows,d.lote);reconcile.disabled=false}
async function history(){const d=await call({action:'list-lotes'});document.getElementById('history').innerHTML=(d.lotes||[]).length?d.lotes.map(x=>'<div class="histItem"><div><b>'+e(x.archivo_nombre)+'</b><small>'+e(x.grupo_nombre||'Sin grupo')+' · '+e(x.cargado_por_nombre||'')+' · '+new Date(x.created_at).toLocaleString('es-EC')+' · '+x.filas_total+' servicios · '+e(x.estado)+'</small></div><button class="btn alt" onclick="openLote(\''+x.id+'\').then(()=>show(\'result\')).catch(x=>msg(x.message,\'err\'))">Abrir</button></div>').join(''):'<div class="status">Aún no hay cargas.</div>'}
function show(v){previewView.style.display=v==='preview'?'block':'none';resultView.style.display=v==='result'?'block':'none';document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('on',b.dataset.view===v))}
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>show(b.dataset.view));history().catch(x=>history.innerHTML='<div class="status err">'+e(x.message)+'</div>');