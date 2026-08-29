(()=>{
if(window.__disprotelComprasProductoCamaraLocalV1)return;window.__disprotelComprasProductoCamaraLocalV1=true;
const $=id=>document.getElementById(id);let stream=null,seq=0;
function stop(){try{stream?.getTracks?.().forEach(t=>t.stop())}catch{}stream=null;$('cpfLocalCam')?.remove()}
function style(){if($('cpfLocalCamStyle'))return;const s=document.createElement('style');s.id='cpfLocalCamStyle';s.textContent=`
#cpfRemote{display:none!important}
#cpfBox .cpf-actions button{position:relative;overflow:hidden;transition:transform .16s ease,box-shadow .16s ease,filter .16s ease;box-shadow:0 5px 14px #0b2a5c18}
#cpfBox .cpf-actions button:hover{transform:translateY(-2px);box-shadow:0 10px 22px #0b2a5c25;filter:brightness(1.06)}
#cpfBox .cpf-actions button:active{transform:translateY(1px) scale(.98)}
#cpfBox .cpf-actions button::after{content:'';position:absolute;top:-80%;left:-35%;width:24%;height:260%;background:linear-gradient(90deg,transparent,#ffffff73,transparent);transform:rotate(18deg);transition:left .45s ease;pointer-events:none}
#cpfBox .cpf-actions button:hover::after{left:120%}
.cpf-local-o{position:fixed;inset:0;z-index:999999;background:#061d3ddd;display:flex;align-items:center;justify-content:center;padding:12px}
.cpf-local-b{width:min(760px,100%);background:#fff;border-radius:18px;padding:14px;box-shadow:0 24px 70px #0006}
.cpf-local-b h3{margin:0 0 8px;color:#0b2a5c}.cpf-local-v{width:100%;max-height:65vh;object-fit:contain;background:#000;border-radius:13px}
.cpf-local-a{display:flex;gap:8px;margin-top:10px}.cpf-local-a button{flex:1;border:0;border-radius:11px;padding:12px;font-weight:900;cursor:pointer}.cpf-shot{background:linear-gradient(135deg,#147746,#25a063);color:#fff}.cpf-close{background:#edf3f6;color:#274a5d}
@media(max-width:600px){.cpf-local-a{display:grid}}
`;document.head.appendChild(s)}
async function openCamera(){style();stop();if(!navigator.mediaDevices?.getUserMedia){alert('Este navegador no permite abrir la cámara directamente. Usa “Elegir fotos”.');return}try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});const o=document.createElement('div');o.id='cpfLocalCam';o.className='cpf-local-o';o.innerHTML=`<div class="cpf-local-b"><h3>📷 Cámara del equipo</h3><video id="cpfLocalVideo" class="cpf-local-v" autoplay playsinline muted></video><div class="cpf-local-a"><button id="cpfLocalShot" class="cpf-shot">📸 Capturar foto</button><button id="cpfLocalClose" class="cpf-close">Cerrar cámara</button></div><div id="cpfLocalMsg" style="font-size:11px;color:#607583;margin-top:8px">Puedes capturar varias fotos seguidas. Se irán agregando al producto.</div></div>`;document.body.appendChild(o);$('cpfLocalVideo').srcObject=stream;$('cpfLocalClose').onclick=stop;$('cpfLocalShot').onclick=capture}catch(e){alert('No pude abrir la cámara. Revisa el permiso de cámara del navegador.');stop()}}
async function capture(){const v=$('cpfLocalVideo'),msg=$('cpfLocalMsg'),input=$('cpfInput');if(!v||!input||!v.videoWidth)return;const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.88));if(!blob)return;const file=new File([blob],`captura-producto-${Date.now()}-${++seq}.jpg`,{type:'image/jpeg'});const dt=new DataTransfer();dt.items.add(file);input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));if(msg)msg.textContent='✅ Foto capturada y agregada. Puedes tomar otra.'}
function apply(){style();$('cpfQrOverlay')?.remove();const r=$('cpfRemote');if(r)r.remove();const b=$('cpfCameraBtn');if(b&&!b.dataset.localCam){b.dataset.localCam='1';b.textContent='📷 Abrir cámara';b.onclick=e=>{e.preventDefault();e.stopImmediatePropagation();openCamera()}}const dlg=$('productDlg');if(dlg&&!dlg.dataset.localCamClose){dlg.dataset.localCamClose='1';dlg.addEventListener('close',stop)}}
new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true});setInterval(apply,700);apply();
})();