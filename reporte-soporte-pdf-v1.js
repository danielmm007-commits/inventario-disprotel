/* DISPROTEL - PDF auténtico de soporte con fotos por ocurrencia.
 * No finaliza OT ni aplica inventario; el archivo definitivo todavía no se archiva en Storage.
 * Usa jsPDF local del repositorio y la fuente de evidencia vigente validada por Mesa.
 */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 let generating=false;
 function normalize(v){
   const s=String(v===null||v===undefined||v===''?'—':v);
   return s.replace(/[\u{10000}-\u{10ffff}]/gu,'').replace(/\r/g,'').trim()||'—';
 }
 function data(id){return normalize($(id)?.textContent);}
 function fechaLocal(v){
   const n=Date.parse(v||'');return Number.isFinite(n)?new Date(n).toLocaleString('es-EC'):normalize(v);
 }
 function msg(t,error=false){
   const node=$('pdfMsg');if(node){
     node.textContent=t;node.style.color=error?'#9d2525':'#17613b';
   }
 }
 function fileName(){
   const id=data('ot').replace(/[^a-zA-Z0-9_-]/g,'_');
   return 'DISPROTEL_REPORTE_SOPORTE_'+id+(window.DISPROTEL_SOPORTE_BORRADOR?'_BORRADOR':'')+'.pdf';
 }
 async function imageToJpeg(url){
   if(!url)throw Error('Una evidencia no tiene enlace a su fotografía.');
   const response=await fetch(url,{mode:'cors',cache:'no-store'});
   if(!response.ok)throw Error('No fue posible cargar una imagen del informe (HTTP '+response.status+').');
   const blob=await response.blob();
   let image;
   try{
     image=await createImageBitmap(blob);
     const w=image.width,h=image.height;
     if(!w||!h)throw Error('Fotografía inválida.');
     const scale=Math.min(1,1200/Math.max(w,h));
     const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));
     canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
     return {data:canvas.toDataURL('image/jpeg',.82),ratio:w/h};
   }finally{image?.close?.()}
 }
 async function generate(){
   const klass=window.jspdf?.jsPDF;
   if(!klass)throw Error('No se pudo cargar el generador PDF. Recarga la página.');
   if($('sheet')?.style.display==='none')throw Error('Espera a que se cargue la previsualización.');
   const groups=window.DISPROTEL_SOPORTE_EVIDENCIAS;
   if(!groups||!groups.mesa_disponible)
     throw Error('Mesa Técnica aún no validó sus evidencias. Recarga el reporte antes de descargarlo.');
   const photos=[...(groups.tecnico||[]),...(groups.mesa||[])];
   for(const p of photos){
     if(!p.url)throw Error('Falta la imagen vigente de '+normalize(p.label)+'. No se generará un PDF incompleto.');
   }
   const photoData=[];
   for(let i=0;i<photos.length;i++){
     msg('Preparando fotografía '+(i+1)+' de '+photos.length+'...');
     photoData.push(await imageToJpeg(photos[i].url));
   }
   const pdf=new klass({orientation:'portrait',unit:'mm',format:'a4',compress:true});
   const left=15,right=195,bottom=277,usable=180;
   let y=20;
   const draft=Boolean(window.DISPROTEL_SOPORTE_BORRADOR);
   function nextPage(){
     pdf.addPage();y=20;
     pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.setTextColor(105,120,129);
     pdf.text('DISPROTEL - '+data('ot')+(draft?' - BORRADOR':''),left,12);
   }
   function reserve(h){if(y+h>bottom)nextPage()}
   function text(t,size=10,bold=false,indent=left,max=usable){
     pdf.setFont('helvetica',bold?'bold':'normal');pdf.setFontSize(size);
     pdf.setTextColor(24,52,79);
     const lineH=size>=12?5.8:size>=10?4.8:4.2;
     for(const line of pdf.splitTextToSize(normalize(t),max)){
       reserve(lineH);
       pdf.text(line,indent,y);y+=lineH;
     }
   }
   function title(t){
     reserve(15);y+=3;
     pdf.setFillColor(9,57,102);pdf.roundedRect(left,y-5,usable,10,1.5,1.5,'F');
     pdf.setFontSize(11);pdf.setFont('helvetica','bold');pdf.setTextColor(255,255,255);
     pdf.text(normalize(t),left+4,y+1.7);y+=10;
   }
   function field(k,v){text(k+': '+v,9,false)}
   pdf.setFillColor(7,53,101);pdf.rect(0,0,210,33,'F');
   try{
     const logo=await imageToJpeg('assets/login/logo%20dispro.jpg');
     pdf.addImage(logo.data,'JPEG',176,4,19,19,undefined,'FAST');
   }catch(e){console.warn('Logotipo opcional no disponible',e)}
   pdf.setFont('helvetica','bold');pdf.setFontSize(17);pdf.setTextColor(255,255,255);
   pdf.text('DISPROTEL',left,14);pdf.setFontSize(12);
   pdf.text('REPORTE DE SOPORTE TECNICO',left,23);
   if(draft){pdf.setTextColor(255,223,125);pdf.setFontSize(9);pdf.text('PREVISUALIZACION - NO ES UN CIERRE OFICIAL',left,29)}
   else{pdf.setTextColor(212,243,218);pdf.setFontSize(9);pdf.text('REPORTE FINAL',left,29)}
   y=41;
   title('INFORMACION DE LA ORDEN Y ATENCION');
   for(const [k,id] of [
     ['Orden','ot'],['Estado','estado'],['Tipo de trabajo','tipoTrabajo'],['Creada por','solicitado'],
     ['Fecha de solicitud','fechaSolicitud'],['Aceptada por','aceptadoPor'],['Grupo que atendio','grupo'],
     ['Fecha y hora de aceptacion','fechaAceptacion'],['Inicio de atencion','inicioTrabajo'],
     ['Fecha y hora de resolucion','finTrabajo']])field(k,data(id));
   title('DATOS DEL CLIENTE Y SERVICIO');
   for(const [k,id] of [
     ['Cliente','cliente'],['Identificacion','cedula'],['Telefono','telefono'],['Correo','correo'],
     ['Direccion','direccion'],['Contacto de visita','contacto'],['Codigo de servicio','servicio'],
     ['Plan','plan'],['Tipo de conexion','tipoConexion'],['IP registrada','ipCliente']])field(k,data(id));
   title('HALLAZGO Y TRABAJO REALIZADO');
   field('Problema reportado',data('problema'));field('Diagnostico',data('diagnostico'));
   field('Solucion',data('solucion'));field('Observaciones adicionales',data('observacion'));
   title('UBICACION GPS');text(data('gps'),9,false);
   title('MATERIALES Y EQUIPOS');
   const lines=[...$('items').querySelectorAll('.item')].map(x=>normalize(x.textContent));
   if(lines.length)for(const ln of lines)text('• '+ln,9);else text('Sin materiales utilizados.',9);
   title('EQUIPOS RETIRADOS O REEMPLAZADOS');
   const retirados=[...$('retirados').querySelectorAll('.item')].map(x=>normalize(x.textContent));
   if(retirados.length)for(const ln of retirados)text('• '+ln,9);else text('Sin equipos retirados.',9);
   async function photosSection(header,entries){
     title(header);
     if(!entries.length){text('No se registraron evidencias en este grupo.',9);return}
     for(let i=0;i<entries.length;i+=2){
       const row=entries.slice(i,i+2);
       reserve(64);
       for(let j=0;j<row.length;j++){
         const photo=row[j],file=photoData[photos.indexOf(photo)];
         const x=left+j*92,slotW=86,slotH=48;
         const aspect=file.ratio;
         let w=slotW,h=slotH;
         if(aspect>slotW/slotH)h=w/aspect;else w=h*aspect;
         pdf.setDrawColor(211,226,234);pdf.roundedRect(x,y,slotW,slotH,2,2,'S');
         pdf.addImage(file.data,'JPEG',x+(slotW-w)/2,y+(slotH-h)/2,w,h,undefined,'FAST');
         pdf.setFont('helvetica','bold');pdf.setFontSize(8);pdf.setTextColor(28,54,76);
         pdf.text(pdf.splitTextToSize(normalize(photo.label),slotW)[0],x,y+53);
         pdf.setFont('helvetica','normal');pdf.setFontSize(7);pdf.setTextColor(100,117,129);
         pdf.text(pdf.splitTextToSize(fechaLocal(photo.at),slotW)[0],x,y+57);
       }
       y+=64;
     }
   }
   await photosSection('EVIDENCIAS DEL TECNICO - EN ORDEN DE OCURRENCIA',groups.tecnico||[]);
   await photosSection('EVIDENCIAS DE MESA TECNICA - EN ORDEN DE OCURRENCIA',groups.mesa||[]);
   reserve(12);y+=6;
   text(draft?'BORRADOR PARA REVISION. NO CONFIRMA CIERRE NI DESCUENTA INVENTARIO.':
     'Documento de soporte finalizado en DISPROTEL.',8,false);
   const pages=pdf.getNumberOfPages();
   for(let page=1;page<=pages;page++){
     pdf.setPage(page);pdf.setDrawColor(219,228,234);pdf.line(left,286,right,286);
     pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.setTextColor(120,133,141);
     pdf.text('DISPROTEL - '+data('ot')+'  |  '+page+'/'+pages,left,291);
   }
   return pdf.output('blob');
 }
 function downloadBlob(blob,name){
   const href=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=href;a.download=name;document.body.appendChild(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(href),30000);
 }
 async function process(mode){
   if(generating)return;
   generating=true;const download=$('downloadPdfBtn'),share=$('sharePdfBtn');
   if(download)download.disabled=true;if(share)share.disabled=true;
   try{
     msg('Preparando el PDF con todas las evidencias...');
     const blob=await generate(),name=fileName();
     if(mode==='share'){
       const file=new File([blob],name,{type:'application/pdf'});
       if(navigator.canShare?.({files:[file]})&&typeof navigator.share==='function'){
         try{
           await navigator.share({files:[file],title:'Reporte de soporte DISPROTEL',text:name});
           msg('Se completó el menú para compartir el PDF.');
         }catch(e){
           if(e?.name==='AbortError')throw e;
           downloadBlob(blob,name);
           msg('El navegador no permitió abrir Compartir. Se descargó el PDF para enviarlo desde Archivos.');
         }
       }else{
         downloadBlob(blob,name);
         msg('Este navegador no permite compartir archivos PDF. Se descargó el archivo para compartirlo desde tu teléfono.');
       }
     }else{
       downloadBlob(blob,name);
       msg('PDF preparado para descargar.');
     }
   }catch(e){
     if(e?.name==='AbortError'){msg('Compartir cancelado.');return}
     console.error('DISPROTEL PDF',e);
     msg('No se pudo crear el PDF completo: '+(e?.message||String(e))+' Puedes usar Imprimir / Guardar PDF.',true);
   }finally{
     generating=false;if(download)download.disabled=false;if(share)share.disabled=false;
   }
 }
 $('downloadPdfBtn')?.addEventListener('click',()=>process('download'));
 $('sharePdfBtn')?.addEventListener('click',()=>process('share'));
 window.DisprotelReporteSoportePdf={process};
})();
