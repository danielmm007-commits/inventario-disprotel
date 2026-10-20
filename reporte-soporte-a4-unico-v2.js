/* DISPROTEL · PDF de soporte en UNA hoja A4.
   Sólo lectura: no cierra OT, no altera inventario ni evidencias.
   Todas las evidencias vigentes se conservan; si no caben legibles, se avisa. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
let generating=false;
const clean=v=>String(v===undefined||v===null||v===''?'—':v).replace(/[\u{10000}-\u{10ffff}]/gu,'').replace(/\r/g,'').trim()||'—';
const data=id=>clean($(id)?.textContent);
const msg=(t,err=false)=>{const el=$('pdfMsg');if(el){el.textContent=t;el.style.color=err?'#9d2525':'#17613b'}};
const name=()=>('DISPROTEL_REPORTE_SOPORTE_'+data('ot').replace(/[^a-zA-Z0-9_-]/g,'_')+(window.DISPROTEL_SOPORTE_BORRADOR?'_BORRADOR':'')+'.pdf');
function asLocal(v){const d=Date.parse(v||'');return Number.isFinite(d)?new Date(d).toLocaleString('es-EC'):clean(v)}
async function jpeg(url){
 if(!url)throw Error('Una fotografía no tiene URL.');
 const resp=await fetch(url,{mode:'cors',cache:'no-store'});
 if(!resp.ok)throw Error('No se pudo leer una fotografía (HTTP '+resp.status+').');
 const img=await createImageBitmap(await resp.blob());
 try{
  const scale=Math.min(1,1100/Math.max(img.width,img.height));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(img.width*scale));
  canvas.height=Math.max(1,Math.round(img.height*scale));
  canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
  return {url:canvas.toDataURL('image/jpeg',.82),ratio:img.width/img.height};
 }finally{img.close?.()}
}
function makePdf(Klass,groups,photos,images,logo,scale){
 const pdf=new Klass({unit:'mm',format:'a4',orientation:'portrait',compress:true});
 const X=8,W=194,R=202,LIMIT=282,BLUE=[22,95,161],NAVY=[25,57,101],GREY=[102,121,136],BORDER=[212,225,235];
 const draft=!!window.DISPROTEL_SOPORTE_BORRADOR;
 const size=n=>Math.max(6,n*scale);
 const set=(n=7.7,b=false,c=NAVY)=>{pdf.setFont('helvetica',b?'bold':'normal');pdf.setFontSize(size(n));pdf.setTextColor(...c)};
 const wrapped=(value,w,n=7.7,b=false)=>{set(n,b);return pdf.splitTextToSize(clean(value),Math.max(5,w))};
 const lineHeight=n=>size(n)*0.42+0.45;
 const height=(value,w,n=7.7,b=false)=>wrapped(value,w,n,b).length*lineHeight(n);
 const draw=(value,x,baseline,w,n=7.7,b=false,c=NAVY)=>{
   const ls=wrapped(value,w,n,b);set(n,b,c);ls.forEach((line,i)=>pdf.text(line,x,baseline+i*lineHeight(n)));return ls.length*lineHeight(n);
 };
 const border=(x,y,w,h,fill=[255,255,255])=>{
   pdf.setDrawColor(...BORDER);pdf.setFillColor(...fill);pdf.roundedRect(x,y,w,h,1.5,1.5,'FD');
 };
 const within=(h)=>{if(y+h>LIMIT+0.01)throw Error('El contenido supera el espacio disponible de una hoja A4.')};
 let y=8;
 // Encabezado fijo compacto; sin pérdida de identificación.
 if(logo){const w=30,h=Math.min(14,w/logo.ratio);pdf.addImage(logo.url,'JPEG',X+1,y+Math.max(0,(14-h)/2),w,h,undefined,'FAST')}
 else {set(13,true,BLUE);pdf.text('DISPROTEL',X+1,y+9)}
 set(13.2,true,NAVY);pdf.text('REPORTE DE SOPORTE',X+39,y+6);
 set(8.4,true,BLUE);pdf.text('TÉCNICO · '+data('ot'),X+39,y+11);
 border(165,y+1,37,12,[248,251,253]);set(8.1,true,draft?[137,93,19]:[20,116,67]);pdf.text(draft?'NO FINALIZADO':'FINALIZADO',169,y+8);
 y+=18;
 // Ficha principal de seis campos, altura variable para evitar truncar.
 const six=[['OT','ot'],['Fecha/hora','fechaSolicitud'],['Solicitante','solicitado'],['Técnico','tecnico'],['Grupo','grupo'],['Estado','estado']];
 const widths=[30,32,36,33,34,29];const mh=Math.max(13,...six.map((p,i)=>8+height(data(p[1]),widths[i]-4,7,true)));
 within(mh+3);border(X,y,W,mh);
 let xx=X;for(let i=0;i<six.length;i++){
  if(i){pdf.setDrawColor(...BORDER);pdf.line(xx,y,xx,y+mh)}
  set(6.6,false,GREY);pdf.text(six[i][0],xx+2,y+4.2);
  draw(data(six[i][1]),xx+2,y+9,widths[i]-4,7,true);
  xx+=widths[i];
 }
 y+=mh+3;
 function fieldPanel(title,items,x,w){
  let h=9;const measured=[];
  for(const [label,value] of items){const textW=w-35;
   const rh=Math.max(4.2,height(value,textW,7.45)+1.0);
   measured.push([label,value,rh]);h+=rh;
  }
  return {title,items:measured,x,w,h};
 }
 function printPanel(panel,yy){
  border(panel.x,yy,panel.w,panel.h);
  set(8.7,true,BLUE);pdf.text(panel.title,panel.x+3,yy+5.7);
  let cur=yy+10;
  for(const [k,v,h] of panel.items){
   set(6.8,true,GREY);pdf.text(k,panel.x+3,cur);
   draw(v,panel.x+33,cur,panel.w-36,7.45,false);
   cur+=h;
  }
 }
 const client=fieldPanel('CLIENTE / GPS',[
  ['Cliente',data('cliente')],['Cédula',data('cedula')],['Teléfono',data('telefono')],
  ['Dirección',data('direccion')],['Correo',data('correo')],['Contacto',data('contacto')],['GPS',data('gps')]
 ],X,95);
 const service=fieldPanel('SERVICIO / ATENCIÓN',[
  ['Trabajo',data('tipoTrabajo')],['Servicio',data('servicio')],['Plan',data('plan')],
  ['Conexión',data('tipoConexion')],['IP',data('ipCliente')],['Aceptada por',data('aceptadoPor')],
  ['Aceptación',data('fechaAceptacion')],['Inicio',data('inicioTrabajo')],['Resolución',data('finTrabajo')]
 ],X+98,96);
 const block=Math.max(client.h,service.h);
 within(block+3);printPanel(client,y);printPanel(service,y);y+=block+3;
 function note(title,value,x,w){
   const h=11+height(value,w-6,8.1);return {title,value,x,w,h};
 }
 function notesRow(arr){
   const h=Math.max(...arr.map(p=>p.h));within(h+2);
   for(const p of arr){border(p.x,y,p.w,h,[249,252,254]);set(7.7,true,BLUE);pdf.text(p.title,p.x+3,y+5);
    draw(p.value,p.x+3,y+10,p.w-6,8.1);
   }y+=h+2;
 }
 notesRow([note('PROBLEMA REPORTADO',data('problema'),X,W)]);
 notesRow([note('HALLAZGO / DIAGNÓSTICO',data('diagnostico'),X,95),
           note('SOLUCIÓN APLICADA',data('solucion'),X+98,96)]);
 if(data('observacion')!=='—')notesRow([note('OBSERVACIONES',data('observacion'),X,W)]);
 const items=[...$('items').querySelectorAll('.item')].map(x=>clean(x.textContent));
 const retired=[...$('retirados').querySelectorAll('.item')].map(x=>clean(x.textContent));
 const material=items.length?items:['Sin materiales registrados'];
 const retiro=retired.length?retired:['Sin equipos retirados'];
 const listHeight=(arr,w)=>arr.reduce((sum,value)=>sum+Math.max(3.8,height('- '+value,w-6,7.2)+1),0);
 const panelH=9+Math.max(listHeight(material,95),listHeight(retiro,96));
 within(panelH+3);
 border(X,y,95,panelH);border(X+98,y,96,panelH);
 set(8.1,true,BLUE);pdf.text('MATERIALES Y EQUIPOS',X+3,y+5.6);pdf.text('EQUIPOS RETIRADOS',X+101,y+5.6);
 const list=(arr,x,w)=>{let cur=y+10;for(const v of arr){draw('- '+v,x+3,cur,w-6,7.2);cur+=Math.max(3.8,height('- '+v,w-6,7.2)+1)}};
 list(material,X,95);list(retiro,X+98,96);y+=panelH+3;
 // Galería unificada: identificamos origen en cada fotografía y preservamos todas.
 within(10);set(9,true,BLUE);pdf.text('EVIDENCIAS FOTOGRÁFICAS · '+photos.length+' foto(s)',X+2,y+5);
 y+=9;
 if(!photos.length){
  within(10);set(7.7,false,GREY);pdf.text('No hay fotografías registradas.',X+3,y+4);y+=10;
 }else{
  const cols=photos.length<=2?2:photos.length<=4?2:3;
  const rows=Math.ceil(photos.length/cols),gap=2.3,cellW=(W-gap*(cols-1))/cols;
  const available=LIMIT-y-1;const cellH=Math.min(34,(available-gap*(rows-1))/rows);
  if(cellH<20)throw Error('No caben '+photos.length+' fotografías con tamaño legible en una sola hoja A4. No se ha omitido ninguna evidencia.');
  const photoH=cellH-12;
  photos.forEach((ph,i)=>{
   const col=i%cols,row=Math.floor(i/cols),x=X+col*(cellW+gap),yy=y+row*(cellH+gap),im=images[i];
   border(x,yy,cellW,cellH,[250,252,254]);
   const iw=im.ratio>cellW/photoH?cellW:photoH*im.ratio,ih=im.ratio>cellW/photoH?cellW/im.ratio:photoH;
   pdf.addImage(im.url,'JPEG',x+(cellW-iw)/2,yy+(photoH-ih)/2,iw,ih,undefined,'FAST');
   const txt=(ph.origin==='mesa'?'MESA · ':'TÉCNICO · ')+clean(ph.label);
   const labelLines=wrapped(txt,cellW-3,6.9,true);
   if(labelLines.length>2)throw Error('El nombre de una evidencia no cabe de forma legible en el diseño A4.');
   set(6.9,true,NAVY);labelLines.forEach((l,k)=>pdf.text(l,x+2,yy+photoH+3+k*2.5));
   set(6.2,false,GREY);pdf.text(asLocal(ph.at).slice(0,29),x+2,yy+cellH-1.7);
  });
  y+=rows*(cellH+gap)-gap;
 }
 if(y>LIMIT+.01)throw Error('La galería no cabe dentro de una página A4.');
 pdf.setDrawColor(...BORDER);pdf.line(X,286,R,286);
 set(7,false,GREY);pdf.text('DISPROTEL · '+data('ot'),X,291);
 set(7.3,true,BLUE);pdf.text(draft?'VISTA PREVIA · SIN CIERRE':'REPORTE FINAL',202,291,{align:'right'});
 if(pdf.getNumberOfPages()!==1)throw Error('El PDF generado no tiene una sola página.');
 return pdf.output('blob');
}
async function generate(){
 const Klass=window.jspdf?.jsPDF;
 if(!Klass||$('sheet')?.style.display==='none')throw Error('La previsualización del reporte aún no está disponible.');
 const groups=window.DISPROTEL_SOPORTE_EVIDENCIAS;
 if(!groups?.mesa_disponible)throw Error('No se han validado las evidencias de Mesa Técnica.');
 const photos=[...(groups.tecnico||[]).map(x=>({...x,origin:'tecnico'})),...(groups.mesa||[]).map(x=>({...x,origin:'mesa'}))];
 const images=[];
 for(let i=0;i<photos.length;i++){msg('Preparando fotografía '+(i+1)+' de '+photos.length+'…');images.push(await jpeg(photos[i].url))}
 let logo=null;try{logo=await jpeg('assets/login/logo%20dispro.jpg')}catch(e){console.warn('Logotipo no disponible',e)}
 let error;
 for(const scale of [1,.94,.88,.82]){
  try{return makePdf(Klass,groups,photos,images,logo,scale)}
  catch(e){error=e}
 }
 throw Error((error?.message||'No se pudo ajustar el reporte a una hoja A4.')+' Revisa el contenido antes de generar; no se descartan fotografías ni texto.');
}
function download(blob,filename){
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),300000);
}
async function process(mode){
 if(generating)return;
 generating=true;
 const controls=['downloadPdfBtn','sharePdfBtn','printBtn'].map($).filter(Boolean);
 controls.forEach(el=>el.disabled=true);
 // Abrir la pestaña para imprimir durante el clic, antes del trabajo asíncrono.
 const tab=mode==='print'?window.open('about:blank','_blank'):null;
 try{
  msg('Preparando el PDF en una sola hoja A4…');
  const blob=await generate(),filename=name();
  if(mode==='print'){
   if(tab){const url=URL.createObjectURL(blob);tab.location.href=url;setTimeout(()=>URL.revokeObjectURL(url),300000);
    msg('Se abrió el PDF de UNA página A4. Imprímelo desde el visor del navegador.')}
   else {download(blob,filename);msg('El navegador bloqueó la pestaña; descargamos el PDF A4 para imprimir.')}
  }else if(mode==='share'){
   const file=new File([blob],filename,{type:'application/pdf'});
   if(navigator.canShare?.({files:[file]})&&navigator.share){
    try{await navigator.share({files:[file],title:'Reporte de soporte DISPROTEL'});msg('Menú de compartir abierto.')}
    catch(e){if(e?.name==='AbortError'){msg('Compartir cancelado.');return}download(blob,filename);msg('Se descargó el PDF para compartirlo.')}
   }else{download(blob,filename);msg('Se descargó el PDF para compartirlo.')}
  }else{download(blob,filename);msg('PDF A4 de una sola página descargado.')}
 }catch(e){if(tab&&!tab.closed)tab.close();console.error('PDF soporte',e);
  msg('No se pudo generar una hoja A4 completa: '+(e.message||e),true);
 }finally{generating=false;controls.forEach(el=>el.disabled=false)}
}
$('downloadPdfBtn')?.addEventListener('click',()=>process('download'));
$('sharePdfBtn')?.addEventListener('click',()=>process('share'));
$('printBtn')?.addEventListener('click',()=>process('print'));
window.DisprotelReporteSoportePdf={process,generate};
})();