/* Archivo SRI 2.0: HTML y tarjetas estáticas, filtros locales. */
(function(){
'use strict';
const contrib={
 '0502659378001':{nombre:'Carlos Daniel Molina Muñoz',razon:'MOLINA MUÑOZ CARLOS DANIEL'},
 '0600485015001':{nombre:'Pedro Salomón Mancero Guevara',razon:'PEDRO SALOMON MANCERO GUEVARA'}
};
const $=id=>document.getElementById(id);
const make=(tag,cl,txt)=>{const node=document.createElement(tag);if(cl)node.className=cl;if(txt!==undefined)node.textContent=String(txt);return node;};
const fmt=n=>new Intl.NumberFormat('es-EC',{style:'currency',currency:'USD'}).format(Number(n||0));
const normalize=s=>String(s??'').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const rucProv=f=>String(f.proveedor_ruc||f.ruc_emisor||(f.clave_acceso||'').slice(10,23)||'');
const nombreProv=f=>String(f.razon_social_emisor||f.proveedor_nombre||rucProv(f)||'Proveedor por identificar').trim();
let current=$('arRuc').value,saved={},seq=0,allRows=[],pendingSupplier='';
function capture(){
 return {all:$('arTodos').checked,month:$('arMes').value,from:$('arDesde').value,to:$('arHasta').value,supplier:$('arProveedor').value,search:$('arBuscar').value};
}
function restore(settings){
 $('arTodos').checked=settings.all;
 $('arMes').value=settings.month;$('arMes').disabled=settings.all;
 $('arDesde').value=settings.from;$('arHasta').value=settings.to;
 $('arBuscar').value=settings.search;
 pendingSupplier=settings.supplier;
 $('arProveedor').replaceChildren(new Option('Todos los proveedores',''));
}
function syncCardSelection(){
 $('arTitle').textContent='Facturas recibidas · '+contrib[current].nombre;
 document.querySelectorAll('#archivo .sriContribCard').forEach(card=>{
  const active=card.dataset.contrib===current;
  card.setAttribute('aria-pressed',String(active));
  if(active)card.classList.add('active');else card.classList.remove('active');
 });
}
function changeContrib(ruc){
 if(!contrib[ruc]||ruc===current)return;
 saved[current]=capture();
 current=ruc;$('arRuc').value=ruc;
 restore(saved[ruc]||{all:true,month:'2026-10',from:'',to:'',supplier:'',search:''});
 syncCardSelection();
 load();
}
function loadSuppliers(rows){
 const wanted=pendingSupplier||$('arProveedor').value;
 pendingSupplier='';
 const map=new Map();
 for(const row of rows){
  const id=rucProv(row);if(!id)continue;
  const name=nombreProv(row),e=map.get(id);
  if(!e)map.set(id,{id,name,count:1});
  else {e.count++;if(e.name===id&&name!==id)e.name=name;}
 }
 const select=$('arProveedor');select.replaceChildren(new Option('Todos los proveedores',''));
 [...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'es',{sensitivity:'base'})).forEach(p=>select.add(new Option(p.name+' · '+p.id+' ('+p.count+')',p.id)));
 if([...select.options].some(o=>o.value===wanted))select.value=wanted;
}
function render(){
 const body=$('arRows'),summary=$('arSummary'),status=$('arStatus'),desde=$('arDesde').value,hasta=$('arHasta').value;
 body.replaceChildren();summary.replaceChildren();
 if(desde&&hasta&&desde>hasta){
  window.archivoMesRows=[];status.textContent='La fecha inicial no puede ser posterior a la final. Corrige el rango.';return;
 }
 const selected=$('arProveedor').value,term=normalize($('arBuscar').value.trim());
 const filtered=allRows.filter(f=>{
  const date=String(f.fecha_emision||'').slice(0,10);
  if(desde&&date<desde)return false;
  if(hasta&&date>hasta)return false;
  if(selected&&rucProv(f)!==selected)return false;
  if(term&&!normalize([nombreProv(f),rucProv(f),f.numero||''].join(' ')).includes(term))return false;
  return true;
 });
 window.archivoMesRows=filtered;
 let authorized=0,without=0,total=0;
 for(const f of filtered){
  const tr=make('tr',''),state=f.documento==='autorizado'?'XML autorizado':f.documento==='sin_verificar'?'XML recibido · sin verificar':'Solo TXT · sin XML';
  if(f.documento==='autorizado')authorized++;else without++;
  if(f.total!=null&&Number.isFinite(Number(f.total)))total+=Number(f.total);
  const cells=[f.fecha_emision||'',nombreProv(f)+' · '+rucProv(f),f.numero||'Por identificar',f.total==null?'Por identificar':fmt(f.total),state,f.control?.modalidad==='credito'?'Crédito':f.control?.modalidad==='contado'?'Contado':'Sin clasificar'];
  cells.forEach(value=>{const td=make('td','',value);td.title=String(value);tr.append(td);});
  const cell=make('td','accionesFactura'),group=make('div','accionesGrupo');
  const view=make('button','','Ver factura');view.type='button';view.onclick=()=>f.documento==='pendiente'?verResumenTXTFactura(f):verDetalleXMLArchivo(f);
  const classify=make('button','','Clasificar');classify.type='button';classify.onclick=()=>administrarFacturaMes({...f,disponible:f.documento==='autorizado',estado:state});
  group.append(view,classify);cell.append(group);tr.append(cell);body.append(tr);
 }
 if(!filtered.length){const row=make('tr',''),cell=make('td','','No hay facturas para el período o proveedor seleccionado.');cell.colSpan=7;row.append(cell);body.append(row);}
 [
  ['Facturas encontradas',filtered.length+' / '+allRows.length],
  ['XML autorizados',authorized],
  ['Sin verificar o recuperar',without],
  ['Importe mostrado',fmt(total)]
 ].forEach(([name,value])=>{const chip=make('span','sriArchiveMetric');chip.append(document.createTextNode(name+': '),make('b','',value));summary.append(chip);});
 status.textContent=contrib[current].nombre+' · '+filtered.length+' facturas mostradas. Filtro local sin consultas al SRI. Las facturas no se consideran pagadas.';
}
async function load(){
 const request=++seq;
 // Invalida cualquier respuesta tardía de la consulta previa, incluida la versión anterior.
 if(typeof archivoSolicitud==='number')archivoSolicitud++;
 $('arRows').replaceChildren();$('arSummary').replaceChildren();allRows=[];window.archivoMesRows=[];
 $('arStatus').textContent='Cargando facturas de DISPROTEL…';
 try{
  const session=JSON.parse(sessionStorage.getItem('disprotel_login_general_v2')||'null');
  if(!session?.session_token)throw Error('Inicia sesión desde DISPROTEL.');
  const result=await fetch('https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-sri-control-pagos',{
   method:'POST',headers:{'Content-Type':'application/json','x-session':session.session_token},
   body:JSON.stringify({action:'archivo_mensual',ruc:current,mes:$('arMes').value,todos:$('arTodos').checked})
  });
  const data=await result.json();
  if(request!==seq)return;
  if(!result.ok||!data.ok)throw Error(data.error||'No se pudo consultar el archivo');
  allRows=(data.rows||[]).sort((a,b)=>String(b.fecha_emision||'').localeCompare(String(a.fecha_emision||'')));
  loadSuppliers(allRows);render();
 }catch(e){if(request===seq){$('arStatus').textContent='Error: '+e.message;$('arRows').replaceChildren();$('arSummary').replaceChildren();}}
}
function exportCsv(){
 const rows=window.archivoMesRows||[];
 if(!rows.length){alert('No hay facturas con los filtros seleccionados.');return;}
 const cols=['Fecha','Proveedor','RUC proveedor','Factura','Clave acceso','Total','Estado documento','Condición'];
 const values=[cols,...rows.map(f=>[f.fecha_emision||'',nombreProv(f),rucProv(f),f.numero||'',f.clave_acceso||'',f.total??'',f.documento||'',f.control?.modalidad||'sin_clasificar'])];
 const csv='\uFEFF'+values.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(';')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 const a=make('a','');a.href=url;
 a.download='FACTURAS_'+current+'_'+($('arTodos').checked?'2026':$('arMes').value)+'_FILTRADAS.csv';
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function init(){
 // Este diagnóstico marca explícitamente que la interacción se inicializó.
 const elements=['arRuc','arMes','arTodos','arDesde','arHasta','arProveedor','arBuscar','arLoad','arClear','arExport','arStatus','arRows','arSummary'];
 const missing=elements.filter(id=>!$(id));
 if(missing.length){
  const status=$('arStatus');if(status)status.textContent='Error al inicializar filtros: '+missing.join(', ');
  return;
 }
 document.querySelectorAll('#archivo .sriContribCard').forEach(card=>card.onclick=()=>changeContrib(card.dataset.contrib));
 $('arRuc').onchange=()=>changeContrib($('arRuc').value);
 $('arTodos').onchange=()=>{$('arMes').disabled=$('arTodos').checked;load();};
 $('arMes').onchange=load;
 $('arLoad').onclick=load;
 ['arDesde','arHasta','arProveedor'].forEach(id=>$(id).onchange=render);
 $('arBuscar').oninput=render;
 $('arClear').onclick=()=>{
  $('arTodos').checked=true;$('arMes').disabled=true;$('arMes').value='2026-10';
  $('arDesde').value='';$('arHasta').value='';$('arProveedor').value='';$('arBuscar').value='';
  load();
 };
 $('arExport').onclick=exportCsv;
 window.abrirArchivoMensual=load;
 syncCardSelection();
 $('archivo').dataset.filtrosVersion='2.0';
 load();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();