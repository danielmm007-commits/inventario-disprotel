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
  const Klass=window.jspdf?.jsPDF;
  if(!Klass||$('sheet')?.style.display==='none')throw Error('La previsualización PDF todavía no está disponible.');
  const groups=window.DISPROTEL_SOPORTE_EVIDENCIAS;
  if(!groups?.mesa_disponible)throw Error('Primero se deben validar las evidencias vigentes de Mesa Técnica.');
  const photos=[...(groups.tecnico||[]),...(groups.mesa||[])],images=[];
  for(let i=0;i<photos.length;i++){msg('Cargando evidencia '+(i+1)+' de '+photos.length+'...');images.push(await imageToJpeg(photos[i].url))}
  let logo=null;try{logo=await imageToJpeg('assets/login/logo%20dispro.jpg')}catch(e){console.warn('Logotipo no disponible',e)}
  const pdf=new Klass({format:'a4',orientation:'portrait',unit:'mm',compress:true}),W=192,X=9,R=201,MAX=279;
  const BLUE=[22,95,161],NAVY=[25,57,101],MUTED=[111,130,145],LINE=[215,227,235];
  const draft=!!window.DISPROTEL_SOPORTE_BORRADOR;
  let y=10;
  const clean=v=>normalize(v).replace(/[\u2014\u2013\u2192\u2022\u2705\u26A0\uFE0F]/g,'-');
  const ink=(c=NAVY)=>pdf.setTextColor(...c);
  const font=(n=8,b=false,c=NAVY)=>{pdf.setFont('helvetica',b?'bold':'normal');pdf.setFontSize(n);ink(c)};
  const lines=(v,w,n=8)=>{font(n);return pdf.splitTextToSize(clean(v),w)};
  const str=(v,x,yy,w,n=8,b=false,c=NAVY,l=3.6)=>{const ls=lines(v,w,n);font(n,b,c);let at=yy;for(const t of ls){pdf.text(t,x,at);at+=l}return Math.max(l,ls.length*l)};
  const frame=(x,yy,w,h)=>{pdf.setFillColor(255,255,255);pdf.setDrawColor(...LINE);pdf.roundedRect(x,yy,w,h,2.5,2.5,'FD')};
  const next=()=>{pdf.addPage();y=16;font(8,true,BLUE);pdf.text('DISPROTEL',X,10);font(8,false,MUTED);pdf.text('REPORTE DE SOPORTE TECNICO · '+data('ot')+' · CONTINUACION',35,10)};
  const room=h=>{if(y+h>MAX)next()};
  const hRows=(arr,w)=>arr.reduce((sum,[k,id])=>sum+Math.max(5,lines(data(id),w*.65,7.5).length*3.5+1),0);
  const rows=(arr,x,yy,w)=>{let cur=yy;for(const [k,id] of arr){font(7.2,true,[76,94,112]);pdf.text(k,x,cur);str(data(id),x+w*.34,cur,w*.65,7.5,false,NAVY,3.5);cur+=Math.max(5,lines(data(id),w*.65,7.5).length*3.5+1);pdf.setDrawColor(233,240,244);pdf.line(x,cur,x+w,cur);cur+=1}return cur};
  // 1. Encabezado blanco, logotipo, título central y estado.
  if(logo)pdf.addImage(logo.data,'JPEG',16,11,28,17,undefined,'FAST');
  else {font(15,true,BLUE);pdf.text('DISPROTEL',12,23)}
  font(15.5,true,NAVY);pdf.text('REPORTE DE SOPORTE TECNICO',69,20);
  font(8.1,false,MUTED);pdf.text('VISTA PREVIA · documento técnico de la OT',69,25);
  frame(167,11,33,13);font(8.2,true,draft?[137,93,19]:[20,116,67]);
  pdf.text(draft?'NO FINALIZADO':'FINALIZADO',170,19);
  pdf.setDrawColor(...LINE);pdf.line(X,33,R,33);
  // 2. Franja de seis datos igual al reporte de instalación.
  const six=[['OT','ot',29],['Fecha y hora','fechaSolicitud',33],['Solicitante','solicitado',34],
   ['Tecnico','tecnico',34],['Grupo tecnico','grupo',34],['Estado','estado',28]];
  frame(X,38,W,23);let xx=X;
  for(let i=0;i<six.length;i++){const [k,id,w]=six[i];if(i){pdf.setDrawColor(...LINE);pdf.line(xx,38,xx,61)}
   font(7,false,MUTED);pdf.text(k,xx+2,43);str(data(id),xx+2,49,w-4,7.25,true,NAVY,3);xx+=w}
  y=65;
  // 3. Cliente a la izquierda y GPS a la derecha.
  const cli=[['Cliente','cliente'],['Cedula','cedula'],['Telefono','telefono'],
   ['Direccion','direccion'],['Correo','correo'],['Contacto','contacto']];
  const hCli=16+hRows(cli,111)+6;room(hCli+4);frame(X,y,W,hCli);
  font(10.2,true,BLUE);pdf.text('CLIENTE / DATOS CONFIRMADOS',X+4,y+8);
  rows(cli,X+4,y+17,111);frame(130,y+13,67,Math.min(39,hCli-17));
  font(8.4,true,BLUE);pdf.text('UBICACION GPS',133,y+19);str(data('gps'),133,y+24,60,7.3,false,NAVY,3.5);
  y+=hCli+5;
  // 4. Servicio y responsable de la atención.
  const a=[['Tipo de trabajo','tipoTrabajo'],['Servicio','servicio'],['Plan','plan'],['Conexion','tipoConexion'],['IP registrada','ipCliente']];
  const b=[['Aceptada por','aceptadoPor'],['Fecha aceptacion','fechaAceptacion'],
   ['Inicio trabajo','inicioTrabajo'],['Resolucion','finTrabajo']];
  const hs=18+Math.max(hRows(a,87),hRows(b,87))+5;room(hs+4);frame(X,y,W,hs);
  font(10.2,true,BLUE);pdf.text('SERVICIO / INFORMACION DE SOPORTE',X+4,y+8);
  rows(a,X+4,y+18,87);pdf.setDrawColor(...LINE);pdf.line(104,y+16,104,y+hs-5);
  rows(b,108,y+18,88);y+=hs+5;
  // 5. Diagnóstico y solución, en paneles blancos.
  room(14);font(10.2,true,BLUE);pdf.text('DIAGNOSTICO Y TRABAJO REALIZADO',X+4,y+6);y+=11;
  for(const [name,id] of [['PROBLEMA REPORTADO','problema'],['HALLAZGO / DIAGNOSTICO','diagnostico'],
     ['SOLUCION APLICADA','solucion'],['OBSERVACIONES ADICIONALES','observacion']]){
    const h=Math.max(11,lines(data(id),182,8).length*4+9);room(h+2);
    pdf.setFillColor(249,252,254);pdf.setDrawColor(...LINE);pdf.roundedRect(X,y,W,h,2,2,'FD');
    font(8.6,true,BLUE);pdf.text(name,X+4,y+5);str(data(id),X+4,y+10,183,8,false,NAVY,4);y+=h+3;
  }
  // 6. Paneles paralelos materiales / equipos retirados.
  const material=[...$('items').querySelectorAll('.item')].map(v=>clean(v.textContent));
  const retired=[...$('retirados').querySelectorAll('.item')].map(v=>clean(v.textContent));
  const n=Math.max(1,material.length,retired.length);
  for(let i=0;i<n;i+=8){
   const l=material.slice(i,i+8),r=retired.slice(i,i+8);
   const hl=l.reduce((n,v)=>n+Math.max(5,lines(v,85,7.5).length*3.5+1),0);
   const hr=r.reduce((n,v)=>n+Math.max(5,lines(v,85,7.5).length*3.5+1),0);
   const h=18+Math.max(10,hl,hr);room(h+5);frame(X,y,94,h);frame(107,y,94,h);
   font(8.6,true,BLUE);pdf.text('MATERIALES Y EQUIPOS USADOS',12,y+7);
   pdf.text('EQUIPOS RETIRADOS / CAMBIADOS',110,y+7);
   let yy=y+14;for(const v of l)yy+=str('- '+v,12,yy,85,7.5,false,NAVY,3.5)+1;
   if(!material.length)str('Sin materiales registrados',12,yy,85,7.5,false,MUTED);
   yy=y+14;for(const v of r)yy+=str('- '+v,110,yy,85,7.5,false,NAVY,3.5)+1;
   if(!retired.length)str('Sin equipos retirados',110,yy,85,7.5,false,MUTED);
   y+=h+5;
  }
  // 7. Evidencias agrupadas por origen, tres miniaturas por fila.
  function photosSection(title,arr){
    room(15);font(10,true,BLUE);pdf.text(title,X+3,y+7);y+=12;
    if(!arr.length){font(8,false,MUTED);pdf.text('Sin fotografias en este grupo.',X+3,y+4);y+=10;return}
    for(let i=0;i<arr.length;i+=3){room(50);
     for(let j=0;j<3&&i+j<arr.length;j++){
      const ph=arr[i+j],im=images[photos.indexOf(ph)],x=X+j*65,w=61,h=33;
      frame(x,y,w,44);const iw=im.ratio>w/h?w:im.ratio*h,ih=im.ratio>w/h?w/im.ratio:h;
      pdf.addImage(im.data,'JPEG',x+(w-iw)/2,y+(h-ih)/2,iw,ih,undefined,'FAST');
      font(7.7,true,NAVY);pdf.text(lines(ph.label,w-4,7.7)[0],x+2,y+38);
      font(7,false,MUTED);pdf.text(lines(fechaLocal(ph.at),w-4,7)[0],x+2,y+42);
     }y+=49;
    }y+=3;
  }
  photosSection('EVIDENCIAS FOTOGRAFICAS / TECNICO DE CAMPO',groups.tecnico||[]);
  photosSection('EVIDENCIAS / MESA TECNICA - FERNANDO',groups.mesa||[]);
  room(12);font(8,false,MUTED);pdf.text(draft?
    'Al finalizar la OT, el reporte queda congelado y pasa a solo lectura.':
    'Reporte finalizado en DISPROTEL; se muestran evidencias vigentes.',X+3,y+5);
  // Pie de página con el mismo formato del documento de instalaciones.
  const count=pdf.getNumberOfPages();
  for(let k=1;k<=count;k++){
   pdf.setPage(k);pdf.setDrawColor(...LINE);pdf.line(X,286,R,286);
   font(7.4,false,MUTED);pdf.text('DISPROTEL · '+data('ot'),X,291);
   const t=draft?'VISTA PREVIA PARA REVISION':'REPORTE FINAL';
   font(7.5,true,BLUE);pdf.text(t,R-pdf.getTextWidth(t),291);
   font(7,false,MUTED);pdf.text(k+'/'+count,106,291);
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
