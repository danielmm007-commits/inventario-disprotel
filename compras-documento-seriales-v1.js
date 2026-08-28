(()=>{
 if(window.__disprotelPurchaseDocSerialsV1)return;window.__disprotelPurchaseDocSerialsV1=true;
 const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 const loadScript=(src,key)=>new Promise((ok,bad)=>{if(window[key])return ok(window[key]);const s=document.createElement('script');s.src=src;s.onload=()=>ok(window[key]);s.onerror=bad;document.head.appendChild(s)});
 function toastLocal(t){if(typeof window.toast==='function')return window.toast(t);const m=$('msg');if(m){m.textContent=t;m.classList.add('show');setTimeout(()=>m.classList.remove('show'),2800)}}
 function candidatesFromText(text){
  const explicit=[],generic=[],seen=new Set();
  const add=(v,arr)=>{v=String(v||'').trim().replace(/^[\s:;,#]+|[\s:;,#]+$/g,'').toUpperCase();if(v.length<5||v.length>40||seen.has(v))return;if(/^(S\/?N|SN|SERIAL|SERIALNUMBER|SERIALNO|P\/?N|PN|MAC)$/i.test(v))return;seen.add(v);arr.push(v)};
  const lines=String(text||'').replace(/\r/g,'\n').split(/\n+/).map(x=>x.trim()).filter(Boolean);
  for(const line of lines){
   const up=line.toUpperCase();
   let m;const re=/(?:^|\b)(?:S\/?N|SN|SERIAL(?:\s*(?:NUMBER|NO\.?))?)\s*[:#=\-]?\s*([A-Z0-9][A-Z0-9._\/-]{4,39})/gi;
   while((m=re.exec(line)))add(m[1],explicit);
   if(/\b(P\/?N|PART\s*NUMBER|MAC(?:\s*ADDRESS)?|MODEL|RUC|FACTURA|DOCUMENTO|INVOICE)\b/i.test(up)&&!/\b(S\/?N|SN|SERIAL)\b/i.test(up))continue;
   const toks=line.match(/[A-Z0-9][A-Z0-9._\/-]{5,39}/gi)||[];
   if(toks.length>3)continue;
   toks.forEach(v=>{
    const u=v.toUpperCase();
    if(!(/[0-9]/.test(u)))return;
    if(/^\d{1,4}[\/-]\d{1,2}[\/-]\d{1,4}$/.test(u)||/^\d{1,3}(?:\.\d{1,3}){3}$/.test(u)||/^([0-9A-F]{2}[:-]){5}[0-9A-F]{2}$/.test(u))return;
    if(/[A-Z]/.test(u)||/^\d{8,24}$/.test(u))add(u,generic);
   });
  }
  return [...explicit,...generic];
 }
 async function pdfText(file){
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js','pdfjsLib');
  pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const buf=await file.arrayBuffer(),pdf=await pdfjsLib.getDocument({data:buf}).promise;let text='';
  for(let i=1;i<=pdf.numPages;i++){const p=await pdf.getPage(i),tc=await p.getTextContent();text+='\n'+tc.items.map(x=>x.str).join(' ')}
  return {text,pdf,pages:pdf.numPages};
 }
 async function ocrImage(source,label='imagen'){
  await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js','Tesseract');
  toastLocal('Leyendo '+label+'… puede tardar unos segundos');
  const r=await Tesseract.recognize(source,'eng',{logger:m=>{if(m.status==='recognizing text'&&typeof m.progress==='number')toastLocal('Leyendo '+label+' · '+Math.round(m.progress*100)+'%')}});
  return r?.data?.text||'';
 }
 async function ocrPdfPages(pdf){
  let out='';const max=Math.min(pdf.numPages,8);
  for(let i=1;i<=max;i++){
   const p=await pdf.getPage(i),vp=p.getViewport({scale:1.6}),c=document.createElement('canvas');c.width=Math.ceil(vp.width);c.height=Math.ceil(vp.height);
   await p.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;out+='\n'+await ocrImage(c,'página '+i+' de '+max);
  }
  return out;
 }
 function ensureDialog(){
  if($('docSerialDlg'))return;
  const d=document.createElement('dialog');d.id='docSerialDlg';d.innerHTML=`<div class="modalHead"><h2>📄 Seriales detectados</h2></div><div class="modalBody"><p style="margin-top:0;color:#607583;font-size:12px">Revisa la lista. El sistema no guardará nada hasta que uses el botón normal <b>Guardar lote de seriales</b>.</p><div class="field"><label>POSIBLES SERIALES</label><textarea id="docSerialReview" style="min-height:260px;font-family:Consolas,monospace"></textarea></div><div id="docSerialInfo" style="margin-top:8px;font-size:11px;color:#607583"></div></div><div class="modalFoot"><button class="back" id="docSerialCancel">Cancelar</button><button class="primary" id="docSerialApply">Pasar a lote →</button></div>`;document.body.appendChild(d);$('docSerialCancel').onclick=()=>d.close();
 }
 let targetId='';
 function openReview(id,vals,source){ensureDialog();targetId=id;$('docSerialReview').value=vals.join('\n');$('docSerialInfo').textContent=vals.length+' candidato(s) encontrados en '+source+'. Puedes borrar, corregir o agregar líneas antes de pasarlas al lote.';$('docSerialApply').onclick=()=>{const area=$('ser-'+targetId);if(!area)return;const incoming=$('docSerialReview').value.split(/[\n,;]+/).map(x=>x.trim()).filter(Boolean),existing=area.value.split(/[\n,;]+/).map(x=>x.trim()).filter(Boolean),all=[...new Set([...existing,...incoming].map(x=>x.toUpperCase()))];area.value=all.join('\n');$('docSerialDlg').close();toastLocal(all.length+' serial(es) listos para revisar y guardar')};$('docSerialDlg').showModal()}
 async function readFile(file,id,input){
  if(!file)return;try{
   if(file.size>20*1024*1024)throw new Error('El archivo supera 20 MB.');
   let text='',source=file.name||'archivo';
   if(file.type==='application/pdf'||/\.pdf$/i.test(file.name||'')){
    toastLocal('Leyendo texto del PDF…');const r=await pdfText(file);text=r.text;let vals=candidatesFromText(text);
    if(!vals.length){toastLocal('El PDF parece escaneado. Probando lectura visual…');text+='\n'+await ocrPdfPages(r.pdf);vals=candidatesFromText(text)}
    if(!vals.length)throw new Error('No encontré candidatos claros. Puedes pegar los seriales manualmente.');openReview(id,vals,source);
   }else if(/^image\//i.test(file.type)||/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name||'')){
    text=await ocrImage(file,'foto');const vals=candidatesFromText(text);if(!vals.length)throw new Error('No encontré seriales claros en la foto.');openReview(id,vals,source);
   }else throw new Error('Usa un PDF o una imagen.');
  }catch(e){toastLocal(e.message||'No pude leer el documento')}finally{if(input)input.value=''}
 }
 function enhance(){
  document.querySelectorAll('#serialList .serialCapture').forEach(box=>{
   if(box.dataset.docReader==='1')return;const area=box.querySelector('textarea[id^="ser-"]');if(!area)return;const id=area.id.slice(4);box.dataset.docReader='1';
   const wrap=document.createElement('div');wrap.style.cssText='margin-top:10px;padding-top:10px;border-top:1px solid #d8e7ee';
   wrap.innerHTML=`<button type="button" class="captureBtn photo" style="width:100%;background:linear-gradient(135deg,#6b4a9b,#8c63b4)">📄 Leer lista desde PDF o foto</button><input type="file" accept="application/pdf,image/*" hidden><div class="scanHint">Extrae posibles seriales y los muestra para revisión. No se guardan automáticamente.</div>`;
   const btn=wrap.querySelector('button'),inp=wrap.querySelector('input');btn.onclick=()=>{inp.value='';inp.click()};inp.onchange=()=>readFile(inp.files?.[0],id,inp);box.appendChild(wrap);
  })
 }
 const original=window.serialPending;if(typeof original==='function'){window.serialPending=function(){const r=original.apply(this,arguments);setTimeout(enhance,0);return r}}
 enhance();
})();