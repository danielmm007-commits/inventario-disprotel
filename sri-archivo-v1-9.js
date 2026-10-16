/* DISPROTEL SRI V1.9: tarjetas legales y filtros locales de facturas. No consulta al SRI. */
(function(){
'use strict';
const parties={
 '0502659378001':{name:'Carlos Daniel Molina Muñoz',legal:'MOLINA MUÑOZ CARLOS DANIEL',initials:'CM'},
 '0600485015001':{name:'Pedro Salomón Mancero Guevara',legal:'PEDRO SALOMON MANCERO GUEVARA',initials:'PM'}
};
const $=id=>document.getElementById(id);
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
const normal=s=>String(s??'').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const rucEmisor=f=>String(f.proveedor_ruc||f.ruc_emisor||(f.clave_acceso||'').slice(10,23)||'');
const proveedor=f=>String(f.razon_social_emisor||f.proveedor_nombre||rucEmisor(f)||'Proveedor por identificar').trim();
const moneyLocal=n=>new Intl.NumberFormat('es-EC',{style:'currency',currency:'USD'}).format(Number(n||0));
let requestSeq=0, allRows=[], currentRuc=$('arRuc')?.value||'0502659378001', saved={}, wantedSupplier='';
let ui={};
function capture(){
 return {all:$('arTodos').checked,month:$('arMes').value,from:ui.from.value,to:ui.to.value,supplier:ui.supplier.value,search:ui.search.value};
}
function restore(s){
 $('arTodos').checked=s.all;$('arMes').value=s.month;$('arMes').disabled=s.all;
 ui.from.value=s.from;ui.to.value=s.to;ui.search.value=s.search;
 wantedSupplier=s.supplier;ui.supplier.replaceChildren(new Option('Todos los proveedores',''));
}
function makeField(label,node,css){
 const container=el('label','sriFilterField');container.textContent=label;container.append(node);
 if(css)container.style.cssText=css;return container;
}
function showCards(){
 document.querySelectorAll('#archivo .sriContribCard').forEach(b=>{
  const selected=b.dataset.contrib===currentRuc;
  b.setAttribute('aria-pressed',String(selected));
 });
 $('arTitle').textContent='Facturas recibidas · '+parties[currentRuc].name;
}
function chooseParty(ruc){
 if(!parties[ruc]||ruc===currentRuc)return;
 saved[currentRuc]=capture();currentRuc=ruc;$('arRuc').value=ruc;
 restore(saved[ruc]||{all:true,month:'2026-10',from:'',to:'',supplier:'',search:''});
 showCards();load();
}
function refillSuppliers(rows){
 const prev=wantedSupplier||ui.supplier.value;wantedSupplier='';
 const map=new Map();
 for(const f of rows){
  const id=rucEmisor(f),name=proveedor(f);if(!id)continue;
  const was=map.get(id);
  if(!was)map.set(id,{id,name,count:0});
  else if(was.name===id&&name!==id)was.name=name;
  map.get(id).count++;
 }
 ui.supplier.replaceChildren(new Option('Todos los proveedores',''));
 [...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'es',{sensitivity:'base'})).forEach(p=>ui.supplier.add(new Option(p.name+' · '+p.id+' ('+p.count+')',p.id)));
 if([...ui.supplier.options].some(o=>o.value===prev))ui.supplier.value=prev;
}
function render(){
 const list=$('arRows'),status=$('arStatus'),metrics=$('arSummary');
 list.replaceChildren();metrics.replaceChildren();
 const from=ui.from.value,to=ui.to.value;
 if(from&&to&&from>to){window.archivoMesRows=[];status.textContent='La fecha inicial es posterior a la final. Corrige el rango de días.';return;}
 const selected=ui.supplier.value,needle=normal(ui.search.value.trim());
 const filtered=allRows.filter(f=>{
  const date=String(f.fecha_emision||'').slice(0,10);
  return (!from||date>=from)&&(!to||date<=to)&&(!selected||rucEmisor(f)===selected)&&(!needle||normal([proveedor(f),rucEmisor(f),f.numero||''].join(' ')).includes(needle));
 });
 window.archivoMesRows=filtered;
 let authorized=0,pending=0,amount=0;
 for(const f of filtered){
  const tr=el('tr','');
  const state=f.documento==='autorizado'?'XML autorizado':f.documento==='sin_verificar'?'XML recibido · sin verificar':'Solo TXT · sin XML';
  if(f.documento==='autorizado')authorized++;else pending++;
  if(f.total!==null&&f.total!==undefined&&Number.isFinite(Number(f.total)))amount+=Number(f.total);
  for(const v of [f.fecha_emision||'',proveedor(f)+' · '+rucEmisor(f),f.numero||'Por identificar',f.total==null?'Por identificar':moneyLocal(f.total),state,f.control?.modalidad==='credito'?'Crédito':f.control?.modalidad==='contado'?'Contado':'Sin clasificar']){
   const td=el('td','',String(v));td.title=String(v);tr.append(td);
  }
  const td=el('td','accionesFactura'),group=el('div','accionesGrupo');
  const view=el('button','','Ver factura');view.type='button';view.onclick=()=>f.documento==='pendiente'?verResumenTXTFactura(f):verDetalleXMLArchivo(f);
  const classify=el('button','','Clasificar');classify.type='button';classify.onclick=()=>administrarFacturaMes({...f,disponible:f.documento==='autorizado',estado:state});
  group.append(view,classify);td.append(group);tr.append(td);list.append(tr);
 }
 if(!filtered.length){const tr=el('tr',''),td=el('td','','No hay facturas con los filtros actuales. Prueba otra fecha o proveedor.');td.colSpan=7;tr.append(td);list.append(tr);}
 for(const [label,value] of [['Facturas',filtered.length+' / '+allRows.length],['XML autorizados',authorized],['Sin verificar o recuperar',pending],['Importe de facturas mostradas',moneyLocal(amount)]]){
  const item=el('span','sriArchiveMetric'),b=el('b','',String(value));item.append(document.createTextNode(label+': '),b);metrics.append(item);
 }
 status.textContent=parties[currentRuc].name+' · '+filtered.length+' documentos mostrados. Filtros aplicados sobre DISPROTEL, sin consultar al SRI. No se interpretan como pagados.';
}
async function load(){
 const seq=++requestSeq;
 // El visor anterior pudo haber iniciado una consulta al cargar la página:
 // invalídala para que sus resultados no sobrescriban los filtros nuevos.
 if(typeof archivoSolicitud==='number')archivoSolicitud++;
 $('arRows').replaceChildren();$('arSummary').replaceChildren();allRows=[];window.archivoMesRows=[];
 $('arStatus').textContent='Consultando facturas guardadas en DISPROTEL…';
 try{
  const session=JSON.parse(sessionStorage.getItem('disprotel_login_general_v2')||'null');
  if(!session?.session_token)throw Error('Inicia sesión en DISPROTEL.');
  const response=await fetch('https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-sri-control-pagos',{
   method:'POST',headers:{'Content-Type':'application/json','x-session':session.session_token},
   body:JSON.stringify({action:'archivo_mensual',ruc:currentRuc,mes:$('arMes').value,todos:$('arTodos').checked})
  });
  const result=await response.json();
  if(seq!==requestSeq)return;
  if(!response.ok||!result.ok)throw Error(result.error||'Error al consultar Supabase');
  allRows=(result.rows||[]).sort((a,b)=>String(b.fecha_emision||'').localeCompare(String(a.fecha_emision||'')));
  refillSuppliers(allRows);render();
 }catch(err){if(seq===requestSeq){$('arStatus').textContent='Error: '+err.message;$('arRows').replaceChildren();$('arSummary').replaceChildren();}}
}
function init(){
 const section=$('archivo'),ruc=$('arRuc'),mes=$('arMes'),all=$('arTodos'),loadBtn=$('arLoad'),exportBtn=$('arExport');
 if(!section||!ruc||!mes||!all||!loadBtn||!exportBtn||$('sriContribCards'))return;
 const tabs=[...document.querySelectorAll('.tabs button[data-tab="archivo"][data-contrib]')];
 if(tabs.length>=1){
  const first=tabs[0],clean=first.cloneNode(false);clean.className=first.className;clean.textContent='Facturas recibidas';
  clean.removeAttribute('data-contrib');
  clean.onclick=()=>{document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('on',b===clean));document.querySelectorAll('section.tab').forEach(s=>s.classList.toggle('on',s.id==='archivo'));};
  first.replaceWith(clean);tabs.slice(1).forEach(b=>b.remove());
 }
 const title=$('arTitle');
 title.textContent='Facturas recibidas · '+parties[currentRuc].name;
 const hint=title.nextElementSibling;
 if(hint&&hint.classList.contains('hint'))hint.textContent='Explora las facturas recibidas por contribuyente, mes, días y proveedor. Los filtros usan el archivo de DISPROTEL sin hacer consultas al SRI. Las autorizaciones siguen diferenciadas de los XML sin verificar.';
 const cards=el('div','sriContribCards');cards.id='sriContribCards';cards.setAttribute('role','group');cards.setAttribute('aria-label','Elegir contribuyente');
 Object.entries(parties).forEach(([ruc,p])=>{
  const card=el('button','sriContribCard');card.type='button';card.dataset.contrib=ruc;
  const head=el('span','sriContribCardHead');
  head.append(el('span','sriContribIcon',p.initials),el('span','sriContribMicro','PERSONA NATURAL · REGISTRO TRIBUTARIO'),el('span','sriContribSelected','Seleccionado ✓'));
  card.append(head,el('span','sriContribName',p.name));
  for(const [label,value] of [['RAZÓN SOCIAL',p.legal],['RUC',ruc]]){
   const line=el('span','sriContribDetail');line.append(el('strong','',label),document.createTextNode(' '+value));card.append(line);
  }
  card.onclick=()=>chooseParty(ruc);cards.append(card);
 });
 title.insertAdjacentElement('afterend',cards);
 const legacyBar=ruc.closest('div');legacyBar.style.display='none';
 const panel=el('div','sriArchiveFilters'),heading=el('div','sriFilterHeading');
 heading.append(el('strong','','Filtrar facturas'),el('span','','Filtra por fecha o proveedor sin nuevas consultas al SRI'));
 panel.append(heading);
 const fields=el('div','sriFilterGrid');
 fields.append(makeField('Mes',mes));
 ui.from=el('input','');ui.from.type='date';ui.from.min='2026-01-01';ui.from.max='2026-12-31';fields.append(makeField('Desde el día',ui.from));
 ui.to=el('input','');ui.to.type='date';ui.to.min='2026-01-01';ui.to.max='2026-12-31';fields.append(makeField('Hasta el día',ui.to));
 ui.supplier=el('select','');ui.supplier.append(new Option('Todos los proveedores',''));fields.append(makeField('Proveedor',ui.supplier));
 panel.append(fields);
 const actions=el('div','sriFilterActions'),allLabel=el('label','sriCheckLabel');
 allLabel.append(all,document.createTextNode('Todos los meses de 2026'));actions.append(allLabel);
 ui.search=el('input','');ui.search.type='search';ui.search.autocomplete='off';ui.search.placeholder='Ej. CNT, farmacia, 001-020…';
 actions.append(makeField('Buscar proveedor, RUC o factura',ui.search,'flex:1;min-width:min(100%,220px);max-width:400px'));
 loadBtn.textContent='Actualizar facturas';exportBtn.textContent='Exportar CSV filtrado';
 ui.clear=el('button','','Limpiar filtros');ui.clear.id='arClear';ui.clear.type='button';
 actions.append(loadBtn,ui.clear,exportBtn);panel.append(actions);
 legacyBar.insertAdjacentElement('afterend',panel);
 const summary=el('div','');summary.id='arSummary';summary.setAttribute('aria-live','polite');
 $('arStatus').insertAdjacentElement('beforebegin',summary);
 // Reasignar los controladores originales: ahora filtran y exportan las filas mostradas.
 all.onchange=()=>{mes.disabled=all.checked;load();};
 mes.onchange=load;
 loadBtn.onclick=load;
 ui.from.onchange=render;ui.to.onchange=render;ui.supplier.onchange=render;ui.search.oninput=render;
 ui.clear.onclick=()=>{all.checked=true;mes.disabled=true;mes.value='2026-10';ui.from.value='';ui.to.value='';ui.supplier.value='';ui.search.value='';load()};
 exportBtn.onclick=()=>{
  const rows=window.archivoMesRows||[];if(!rows.length){alert('No hay facturas para exportar con esos filtros.');return;}
  const cols=['Fecha','Proveedor','RUC proveedor','Factura','Clave acceso','Total','Estado documento','Condición'];
  const data=[cols,...rows.map(f=>[f.fecha_emision||'',proveedor(f),rucEmisor(f),f.numero||'',f.clave_acceso||'',f.total??'',f.documento||'',f.control?.modalidad||'sin_clasificar'])];
  const csv='\uFEFF'+data.map(row=>row.map(x=>'"'+String(x??'').replace(/"/g,'""')+'"').join(';')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const a=el('a','');a.href=url;a.download='FACTURAS_'+currentRuc+'_'+(all.checked?'2026':mes.value)+'_FILTRADAS.csv';
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
 };
 showCards();load();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
