(()=>{
  if(window.__disprotelComprasSerialesUnificadoV1)return;window.__disprotelComprasSerialesUnificadoV1=true;
  const $=id=>document.getElementById(id), esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const toastU=t=>{if(typeof toast==='function')toast(t);else alert(t)};
  const loadScript=(src,key)=>new Promise((ok,bad)=>{if(window[key])return ok(window[key]);const s=document.createElement('script');s.src=src;s.onload=()=>ok(window[key]);s.onerror=bad;document.head.appendChild(s)});
  let selectedPurchase='', selectedLine='';

  function pendingRows(){
    try{return data.compras.filter(x=>x.productos?.requiere_serial&&x.estado!=='INGRESADO'&&Math.max(0,Number(x.cantidad||0)-(x.seriales?.length||0))>0)}catch{return []}
  }
  function groups(){const g={};pendingRows().forEach(x=>(g[x.id_compra]??=[]).push(x));return g}
  function currentRow(){const g=groups();const rows=g[selectedPurchase]||[];return rows.find(x=>String(x.id)===String(selectedLine))||rows[0]||null}
  function remaining(x){return Math.max(0,Number(x?.cantidad||0)-(x?.seriales?.length||0))}

  function styles(){if($('serialUnifiedStyle'))return;const s=document.createElement('style');s.id='serialUnifiedStyle';s.textContent=`
    .su-shell{background:#fff;border:1px solid var(--line);border-radius:18px;padding:16px;box-shadow:0 9px 25px #0b2a5c10}
    .su-selects{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}.su-selects label,.su-label{display:block;font-size:10px;color:#446577;font-weight:900;margin-bottom:5px}.su-selects select,.su-input,.su-text{width:100%;border:1px solid #c9dbe6;border-radius:10px;padding:11px;background:#fff}.su-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin:12px 0}.su-stat{border:1px solid #d9e7ee;border-radius:13px;padding:11px;background:#f8fbfd}.su-stat b{display:block;font-size:22px;color:#0b2a5c}.su-stat span{font-size:9px;color:#647b88;font-weight:900}.su-methods{display:grid;grid-template-columns:repeat(2,1fr);gap:9px;margin:12px 0}.su-btn{border:0;border-radius:11px;padding:12px 14px;font-weight:900;color:#fff;cursor:pointer}.su-blue{background:linear-gradient(135deg,#0b356f,#1a75cf)}.su-green{background:linear-gradient(135deg,#147746,#25a063)}.su-purple{background:linear-gradient(135deg,#6b4a9b,#8c63b4)}.su-gray{background:linear-gradient(135deg,#315f82,#6298b7)}.su-lot{margin-top:13px;padding-top:13px;border-top:1px solid #d8e7ee}.su-text{min-height:210px;font-family:Consolas,monospace;resize:vertical}.su-note{font-size:10px;color:#607782;line-height:1.45;margin-top:6px}.su-review{border:1px solid #d8e7ee;background:#f8fbfd;border-radius:13px;padding:12px;margin-top:10px}.su-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:10px}.su-secondary{border:1px solid #c8dce6;background:#fff;color:#0b356f;border-radius:10px;padding:10px 12px;font-weight:900;cursor:pointer}
    @media(max-width:700px){.su-selects,.su-methods,.su-stats{grid-template-columns:1fr}.su-btn{width:100%}}
  `;document.head.appendChild(s)}

  function render(){
    const host=$('serialList');if(!host)return;styles();const g=groups(),keys=Object.keys(g);
    if(!keys.length){host.innerHTML='<div class="empty">No existen seriales pendientes.</div>';return}
    if(!selectedPurchase||!g[selectedPurchase])selectedPurchase=keys[0];
    const lines=g[selectedPurchase]||[];if(!selectedLine||!lines.some(x=>String(x.id)===String(selectedLine)))selectedLine=String(lines[0]?.id||'');
    const row=currentRow();if(!row)return;
    const done=row.seriales?.length||0,pend=remaining(row);
    host.innerHTML=`<div class="su-shell">
      <div class="head"><div><h2>Carga de seriales por compra</h2><p>Selecciona primero la compra y el producto. Todos los métodos de carga quedarán asociados a esa línea de compra.</p></div><span class="tag pending">${pend} PENDIENTES</span></div>
      <div class="su-selects"><div><label>COMPRA *</label><select id="suPurchase">${keys.map(k=>`<option value="${esc(k)}" ${k===selectedPurchase?'selected':''}>${esc(k)}</option>`).join('')}</select></div><div><label>PRODUCTO / LÍNEA *</label><select id="suLine">${lines.map(x=>`<option value="${esc(x.id)}" ${String(x.id)===String(selectedLine)?'selected':''}>${esc(x.productos?.codigo)} · ${esc(x.productos?.producto)} · faltan ${remaining(x)}</option>`).join('')}</select></div></div>
      <div class="su-stats"><div class="su-stat"><b>${Number(row.cantidad||0)}</b><span>COMPRADOS</span></div><div class="su-stat"><b>${done}</b><span>REGISTRADOS</span></div><div class="su-stat"><b>${pend}</b><span>FALTANTES</span></div></div>
      <div class="field"><label>SERIAL INDIVIDUAL</label><input id="suSingle" class="su-input" autocomplete="off" placeholder="Escanea o escribe el serial"></div>
      <div class="su-methods"><button id="suScan" class="su-btn su-green">📷 Escanear serial con cámara</button><button id="suPhotoOne" class="su-btn su-gray">🖼️ Leer UN serial desde foto</button><button id="suRegister" class="su-btn su-blue">Registrar serial escrito</button><button id="suDoc" class="su-btn su-purple">📄 Extraer LISTA desde PDF o foto</button></div>
      <input id="suCamInput" type="file" accept="image/*" capture="environment" hidden><input id="suPhotoInput" type="file" accept="image/*" hidden><input id="suDocInput" type="file" accept="application/pdf,image/*" hidden>
      <div class="su-note">Cámara/foto individual = un equipo. PDF/foto de documento = lectura OCR de una lista completa. Nada se guarda automáticamente.</div>
      <div id="suReview"></div>
      <div class="su-lot"><div class="su-label">LOTE DE SERIALES · UNO POR LÍNEA</div><textarea id="suBatch" class="su-text" placeholder="SERIAL001&#10;SERIAL002"></textarea><div class="su-actions"><button id="suClear" class="su-secondary">Limpiar</button><button id="suSaveBatch" class="su-btn su-blue">Guardar lote de seriales</button></div><div class="su-note">Máximo permitido en esta línea: ${pend} serial(es) pendientes. Supabase seguirá validando duplicados antes de guardar.</div></div>
    </div>`;
    $('suPurchase').onchange=e=>{selectedPurchase=e.target.value;selectedLine='';render()};
    $('suLine').onchange=e=>{selectedLine=e.target.value;render()};
    $('suRegister').onclick=()=>saveValues([$('suSingle').value]);
    $('suScan').onclick=()=>{const i=$('suCamInput');i.value='';i.click()};$('suCamInput').onchange=()=>readOneBarcode($('suCamInput').files?.[0],$('suCamInput'));
    $('suPhotoOne').onclick=()=>{const i=$('suPhotoInput');i.value='';i.click()};$('suPhotoInput').onchange=()=>readOneBarcode($('suPhotoInput').files?.[0],$('suPhotoInput'));
    $('suDoc').onclick=()=>{const i=$('suDocInput');i.value='';i.click()};$('suDocInput').onchange=()=>readDocument($('suDocInput').files?.[0],$('suDocInput'));
    $('suClear').onclick=()=>{$('suBatch').value='';$('suReview').innerHTML=''};
    $('suSaveBatch').onclick=()=>saveValues($('suBatch').value.split(/[\n,;]+/));
  }

  async function saveValues(values){
    const row=currentRow();if(!row)return;const vals=[...new Set(values.map(x=>String(x||'').trim().toUpperCase()).filter(Boolean))];if(!vals.length)return toastU('Ingresa al menos un serial');const pend=remaining(row);if(vals.length>pend)return toastU(`Esta compra solo tiene ${pend} serial(es) pendientes. Revisa el lote antes de guardar.`);
    try{const d=await api({action:'add_serials',compra_id:row.id,seriales:vals});toastU((d.agregados??vals.length)+' serial(es) guardados');selectedLine=String(row.id);await load();setTimeout(render,30)}catch(e){toastU(e.message)}
  }

  async function readOneBarcode(file,input){if(!file)return;try{
    if(!('BarcodeDetector'in window))throw new Error('Este navegador no puede leer códigos de barras desde una foto. Usa escaneo en móvil, escritura manual o carga documental OCR.');
    const supported=BarcodeDetector.getSupportedFormats?await BarcodeDetector.getSupportedFormats():[],pref=['code_128','code_39','code_93','codabar','itf','ean_13','ean_8','upc_a','upc_e','data_matrix','qr_code'],fmts=supported.length?pref.filter(x=>supported.includes(x)):pref,det=new BarcodeDetector(fmts.length?{formats:fmts}:undefined),bm=await createImageBitmap(file),codes=await det.detect(bm);bm.close?.();if(!codes.length)throw new Error('No se detectó un código legible.');const vals=[...new Set(codes.map(x=>String(x.rawValue||'').trim()).filter(Boolean))];if(vals.length===1){$('suSingle').value=vals[0].toUpperCase();toastU('Código detectado. Revísalo antes de registrar.')}else showCandidates(vals)
  }catch(e){toastU(e.message)}finally{if(input)input.value=''}}
  function showCandidates(vals){const box=$('suReview');if(!box)return;box.innerHTML=`<div class="su-review"><b>Códigos encontrados</b><div class="su-note">Elige cuál corresponde al S/N.</div>${vals.map((v,i)=>`<button class="su-secondary" style="width:100%;margin-top:7px;text-align:left" data-v="${esc(v)}">Código ${i+1}: ${esc(v)}</button>`).join('')}</div>`;box.querySelectorAll('button[data-v]').forEach(b=>b.onclick=()=>{$('suSingle').value=b.dataset.v.toUpperCase();box.innerHTML='';toastU('Código seleccionado')})}

  function extractCandidates(text){
    const all=[],seen=new Set(),stop=/^(SERIE|SERIAL|SERIALNUMBER|CODIGO|CODIGOMARCA|MARCA|CAJA|CANTIDAD|TOTAL|RUC|FACTURA|DOCUMENTO|INFORME|MERCUSYS)$/i;
    const add=v=>{v=String(v||'').trim().replace(/^[^A-Z0-9]+|[^A-Z0-9._\/-]+$/gi,'').toUpperCase();if(v.length<7||v.length>32||seen.has(v)||stop.test(v)||!/[0-9]/.test(v))return;if(/^\d{1,4}[\/-]\d{1,2}[\/-]\d{1,4}$/.test(v)||/^\d+(?:\.\d+)?$/.test(v)&&v.length<9)return;seen.add(v);all.push(v)};
    const explicit=/(?:S\/?N|SN|SERIE|SERIAL(?:\s*(?:NUMBER|NO\.?)?)?)\s*[:#=\-]?\s*([A-Z0-9][A-Z0-9._\/-]{6,31})/gi;let m;while((m=explicit.exec(text)))add(m[1]);
    (String(text||'').match(/[A-Z0-9][A-Z0-9._\/-]{7,31}/gi)||[]).forEach(v=>{const u=v.toUpperCase();if(/[A-Z]/.test(u)&&/[0-9]/.test(u))add(u)});return all
  }
  async function ocrImage(src,label='imagen'){await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js','Tesseract');toastU('Leyendo '+label+'…');const r=await Tesseract.recognize(src,'eng',{logger:m=>{if(m.status==='recognizing text'&&typeof m.progress==='number')toastU('Leyendo '+label+' · '+Math.round(m.progress*100)+'%')}});return r?.data?.text||''}
  async function pdfContent(file){await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js','pdfjsLib');pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;let text='';for(let i=1;i<=pdf.numPages;i++){const p=await pdf.getPage(i),tc=await p.getTextContent();text+='\n'+tc.items.map(x=>x.str).join(' ')}return {pdf,text}}
  async function readDocument(file,input){if(!file)return;try{if(file.size>20*1024*1024)throw new Error('El archivo supera 20 MB.');let text='';if(file.type==='application/pdf'||/\.pdf$/i.test(file.name||'')){toastU('Leyendo PDF…');const r=await pdfContent(file);text=r.text;let vals=extractCandidates(text);if(!vals.length){const max=Math.min(r.pdf.numPages,8);for(let i=1;i<=max;i++){const p=await r.pdf.getPage(i),vp=p.getViewport({scale:1.7}),c=document.createElement('canvas');c.width=Math.ceil(vp.width);c.height=Math.ceil(vp.height);await p.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;text+='\n'+await ocrImage(c,'página '+i+' de '+max)}vals=extractCandidates(text)}showDocumentReview(vals,file.name||'PDF')}else{text=await ocrImage(file,'foto');showDocumentReview(extractCandidates(text),file.name||'foto')}}catch(e){toastU(e.message||'No pude leer el documento')}finally{if(input)input.value=''}}
  function showDocumentReview(vals,source){if(!vals.length)return toastU('No encontré seriales claros en el documento.');const row=currentRow(),pend=remaining(row),box=$('suReview');box.innerHTML=`<div class="su-review"><b>📄 ${vals.length} posible(s) serial(es) encontrados</b><div class="su-note">Fuente: ${esc(source)} · Esta compra admite ${pend} pendiente(s). Revisa, corrige o elimina antes de pasar al lote.</div><textarea id="suDocReview" class="su-text" style="margin-top:9px">${esc(vals.join('\n'))}</textarea><div class="su-actions"><button id="suDocCancel" class="su-secondary">Cancelar</button><button id="suDocApply" class="su-btn su-purple">Pasar a lote →</button></div></div>`;$('suDocCancel').onclick=()=>box.innerHTML='';$('suDocApply').onclick=()=>{const incoming=$('suDocReview').value.split(/[\n,;]+/).map(x=>x.trim()).filter(Boolean),existing=$('suBatch').value.split(/[\n,;]+/).map(x=>x.trim()).filter(Boolean),all=[...new Set([...existing,...incoming].map(x=>x.toUpperCase()))];$('suBatch').value=all.join('\n');box.innerHTML='';toastU(all.length+' serial(es) listos en el lote')}}

  const original=window.serialPending;if(typeof original==='function')window.serialPending=function(){const r=original.apply(this,arguments);setTimeout(render,0);return r};
  const tryStart=()=>{if($('serialList'))render()};tryStart();setTimeout(tryStart,300);setTimeout(tryStart,1200);
})();