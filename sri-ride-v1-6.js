/* SRI RIDE v1.6. Sobrescribe exclusivamente la presentación: no altera datos, permisos ni clasificación. */
(function(){
 'use strict';
 const e=(tag,cls,text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined&&text!==null)x.textContent=String(text);return x};
 const fmt=n=>(n===undefined||n===null||n==='')?'No disponible':new Intl.NumberFormat('es-EC',{style:'currency',currency:'USD'}).format(Number(n));
 const show=v=>(v===undefined||v===null||v==='')?'No disponible':String(v);
 const fecha=v=>{const s=String(v||'');return /^\d{4}-\d{2}-\d{2}$/.test(s)?s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4):show(s)};
 function campo(parent,label,value,extra){
  const row=e('div','sriRField');
  row.append(e('span','sriRLabel',label),e('span','sriRValue'+(extra?' '+extra:''),show(value)));
  parent.append(row);
 }
 window.crearHojaFactura=function(d,autorizado,soloTxt=false){
  const hoja=e('article','sriHoja'),head=e('div','sriRHead');
  const emisor=e('section','sriRPanel'),numero=e('section','sriRPanel');
  emisor.append(e('p','sriRCaption','Datos del emisor'),e('h2','sriRCompany',show(d.proveedor)));
  campo(emisor,'RUC',d.ruc_emisor);
  campo(emisor,'Dirección matriz',soloTxt?'No disponible sin XML':d.direccion_matriz||d.direccion_emisor);
  if(!soloTxt&&d.direccion_emisor&&d.direccion_matriz&&d.direccion_emisor!==d.direccion_matriz)campo(emisor,'Sucursal',d.direccion_emisor);
  if(!soloTxt&&d.obligado_contabilidad)campo(emisor,'Lleva contabilidad',d.obligado_contabilidad);
  numero.append(e('p','sriRCaption','Comprobante electrónico'),e('div','sriRDocType','FACTURA'));
  campo(numero,'No.',d.numero);
  campo(numero,'Clave de acceso',d.clave_acceso,'sriRKey');
  if(!soloTxt&&autorizado&&d.fecha_autorizacion)campo(numero,'Fecha autorización',d.fecha_autorizacion);
  campo(numero,'Ambiente',soloTxt?'No disponible sin XML':d.ambiente==='2'?'PRODUCCIÓN':d.ambiente==='1'?'PRUEBAS':d.ambiente);
  campo(numero,'Emisión',soloTxt?'No disponible sin XML':d.emision==='1'?'NORMAL':d.emision);
  head.append(emisor,numero);hoja.append(head);
  hoja.append(e('div','sriRStatus'+(soloTxt?' isTxt':autorizado?' isAuthorized':''),
   soloTxt?'Solo TXT SRI · XML pendiente de recuperar · Resumen incompleto':autorizado?'XML autorizado importado · Representación informativa':'XML recibido · Autorización pendiente de verificar · No acredita autorización SRI'));
  const buyer=e('section','sriRBuyer'),buyerFields=e('div','sriRBuyerFields');
  buyer.append(e('h3','sriRTitle','Datos del comprador'));
  campo(buyerFields,soloTxt?'Contribuyente consultado':'Razón social / Nombres',d.comprador);
  campo(buyerFields,soloTxt?'RUC consultado':'Identificación',d.identificacion_comprador);
  campo(buyerFields,'Fecha de emisión',fecha(d.fecha));
  campo(buyerFields,'Moneda',soloTxt?'No confirmada sin XML':d.moneda||'USD');
  if(!soloTxt&&d.direccion_comprador)campo(buyerFields,'Dirección',d.direccion_comprador);
  buyer.append(buyerFields);hoja.append(buyer);
  const items=soloTxt?[]:Array.isArray(d.items)?d.items:[];
  const cod=items.some(x=>x.codigo||x.codigo_principal);
  const headers=[...(cod?['Cód. principal']:[]),'Descripción','Cantidad','P. unitario','Descuento','Precio total'];
  const widths=cod?['12%','37%','10%','16%','12%','13%']:['45%','10%','17%','13%','15%'];
  const wrap=e('div','sriRTableWrap'),tbl=e('table','sriRItems'),cols=e('colgroup','');
  widths.forEach(w=>{const col=e('col','');col.style.width=w;cols.append(col)});
  const thead=e('thead',''),headerRow=e('tr','');
  headers.forEach((h,i)=>headerRow.append(e('th',i>=headers.length-3?'sriRMoney':h==='Cantidad'?'sriRQty':'',h)));
  thead.append(headerRow);tbl.append(cols,thead);
  const body=e('tbody','');
  if(!items.length){const tr=e('tr',''),td=e('td','sriREmpty',soloTxt?'Sin XML: no se conocen productos, cantidades, precios ni impuestos.':'No existen líneas de productos disponibles en el XML.');td.colSpan=headers.length;tr.append(td);body.append(tr)}
  for(const it of items){
   const row=e('tr',''),description=String(it.descripcion||'')+(it.detalle_adicional?' · '+it.detalle_adicional:'');
   const values=[...(cod?[show(it.codigo||it.codigo_principal)]:[]),description,show(it.cantidad),fmt(it.precio_unitario),fmt(it.descuento),fmt(it.subtotal)];
   values.forEach((v,i)=>row.append(e('td',i>=values.length-3?'sriRMoney':i===values.length-4?'sriRQty':'',v)));
   body.append(row);
  }
  tbl.append(body);wrap.append(tbl);hoja.append(wrap);
  const footGrid=e('div','sriRBottom'),left=e('div',''),info=e('section','sriRExtra');
  info.append(e('h3','sriRTitle','Información adicional'));
  if(!soloTxt&&Array.isArray(d.info_adicional)&&d.info_adicional.length){
   d.info_adicional.forEach(x=>campo(info,x.nombre||'Dato',x.valor));
  }else{
   info.append(e('p','sriRHint',soloTxt?'Pendiente de recuperar XML.':'No disponible en los datos de esta vista.'));
  }
  left.append(info);
  if(!soloTxt&&Array.isArray(d.formas_pago)&&d.formas_pago.length){
   const pagos=e('section','sriRExtra');pagos.append(e('h3','sriRTitle','Formas de pago'));
   d.formas_pago.forEach(p=>campo(pagos,p.forma||'Forma de pago',fmt(p.total)));left.append(pagos);
  }
  const total=e('table','sriRTotals'),totalBody=e('tbody','');
  const rows=soloTxt?
   [['Subtotal sin impuestos','No disponible sin XML'],['Impuestos','No disponibles sin XML'],['VALOR TOTAL SEGÚN TXT',fmt(d.total)]]:
   [['Subtotal sin impuestos',fmt(d.subtotal)],
    ...(items.length?[['Descuento total',fmt(items.reduce((acc,it)=>acc+Number(it.descuento||0),0))]]:[]),
    ...(Array.isArray(d.impuestos)?d.impuestos.map(x=>['Impuesto · tarifa '+show(x.porcentaje||x.codigo),fmt(x.valor)]):[]),
    ['VALOR TOTAL',fmt(d.total)]];
  rows.forEach(([name,value],i)=>{const tr=e('tr',i===rows.length-1?'sriRGrand':'');tr.append(e('td','',name),e('td','',value));totalBody.append(tr)});
  total.append(totalBody);footGrid.append(left,total);hoja.append(footGrid);
  hoja.append(e('p','sriRFooter',soloTxt?'Solo resumen TXT del SRI: no hay XML, no se reconstruyen líneas ni tributos y esto no sustituye la factura original.':'Representación informativa a partir del XML disponible en DISPROTEL. La verificación de autorización es independiente y esta vista no sustituye el RIDE original.'));
  return hoja;
 };
 window.imprimirHojaFactura=function(hoja){
  const w=window.open('','_blank');
  if(!w){alert('Habilita ventanas emergentes para imprimir');return}
  const url=new URL('sri-ride-v1-6.css?v=1.6',window.location.href).href;
  w.document.open();w.document.write('<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Factura - DISPROTEL</title></head><body>'+hoja.outerHTML+'</body></html>');w.document.close();
  const link=w.document.createElement('link');link.rel='stylesheet';link.href=url;
  let done=false;const print=()=>{if(done)return;done=true;w.focus();w.setTimeout(()=>w.print(),350)};
  link.onload=print;link.onerror=print;w.document.head.append(link);
  w.setTimeout(print,3000);
 };
})();
