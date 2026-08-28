(()=>{
  if(window.__disprotelModuleCacheV1)return;window.__disprotelModuleCacheV1=true;
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const frames=new Map();let activeFrame=null,ready=false;
  const isMobile=()=>matchMedia('(max-width:680px)').matches;
  const css=document.createElement('style');css.textContent=`
    .moduleCachedFrame{display:none!important;width:100%!important;border:0!important;background:#eef5f8}
    .moduleCachedFrame.moduleCacheActive{display:block!important}
    @media(min-width:681px){body.panelMenu.moduleOpen .moduleCachedFrame{height:calc(100vh - 88px)!important;border-radius:20px!important}}
    @media(max-width:680px){body.panelMenu.moduleOpen .menuFrame{display:block!important;width:100%!important;height:calc(100dvh - 48px)!important;border-radius:0!important;opacity:1!important}}
  `;document.head.appendChild(css);

  function directUrl(raw){
    try{
      const u=new URL(raw,location.href);
      if(u.pathname.endsWith('/modulo-integrado.html')){
        const src=u.searchParams.get('src');
        if(src){const su=new URL(src,location.href);su.searchParams.set('menu','1');return su.pathname.split('/').pop()+su.search}
      }
      return u.pathname.split('/').pop()+u.search;
    }catch{return raw}
  }
  function keyFor(btn){return directUrl(btn.dataset.href||'').replace(/([?&])v=\d+/g,'$1v=session')}

  function injectNativeSerialCamera(frame){
    if(!isMobile())return;
    try{
      const w=frame.contentWindow,d=frame.contentDocument,path=(w.location.pathname||'').toLowerCase();
      if(!(path.endsWith('/index.html')||path.endsWith('/index')))return;
      if(d.getElementById('btnCamaraNativa'))return;
      const fotoBtn=d.getElementById('btnFoto'),serial=d.getElementById('serial'),msg=d.getElementById('appMsg');
      if(!fotoBtn||!serial)return;
      const camBtn=d.createElement('button');
      camBtn.type='button';camBtn.id='btnCamaraNativa';camBtn.className='photo';camBtn.textContent='📸 Tomar foto del serial';
      camBtn.style.background='linear-gradient(135deg,#7b4ca3,#a661c2)';
      const camInput=d.createElement('input');
      camInput.id='camaraNativaInput';camInput.type='file';camInput.accept='image/*';camInput.setAttribute('capture','environment');camInput.className='hidden';
      fotoBtn.insertAdjacentElement('afterend',camBtn);camBtn.insertAdjacentElement('afterend',camInput);
      camBtn.onclick=()=>{if(serial.disabled)return;camInput.value='';camInput.click()};
      camInput.onchange=e=>{const file=e.target.files?.[0];if(file&&typeof w.prepararFoto==='function')w.prepararFoto(file,'serial',msg)};
    }catch{}
  }

  function injectMultiScanner(frame){
    if(!isMobile())return;
    try{
      const w=frame.contentWindow,d=frame.contentDocument,path=(w.location.pathname||'').toLowerCase();
      if(!(path.endsWith('/index.html')||path.endsWith('/index'))||d.__disprotelMultiScanner)return;
      const btn=d.getElementById('btnEscanear'),modal=d.getElementById('scannerModal'),video=d.getElementById('scannerVideo'),closeBtn=d.getElementById('btnCerrarScanner'),serial=d.getElementById('serial'),msg=d.getElementById('appMsg');
      if(!btn||!modal||!video||!serial)return;
      d.__disprotelMultiScanner=true;
      const box=modal.querySelector('.modalbox');
      const panel=d.createElement('div');panel.id='multiScanPanel';panel.style.cssText='margin-top:12px;padding:12px;border:1px solid #d7e4ec;border-radius:12px;background:#f8fbfd;display:none';
      panel.innerHTML='<b style="display:block;color:#0b2a5c;margin-bottom:6px">Códigos encontrados</b><div style="font-size:11px;color:#607583;margin-bottom:8px">Apunta a la etiqueta unos segundos y elige el código correcto.</div><div id="multiScanList" style="display:grid;gap:8px"></div>';
      box?.insertBefore(panel,closeBtn||null);
      let controls=null,reader=null,finishTimer=null,candidates=[];
      const stop=()=>{try{controls?.stop()}catch{}controls=null;clearTimeout(finishTimer)};
      const labelFor=v=>/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/i.test(v)?'MAC':`Código ${candidates.indexOf(v)+1}`;
      const render=()=>{const list=d.getElementById('multiScanList');if(!list)return;panel.style.display=candidates.length?'block':'none';list.innerHTML='';candidates.forEach(v=>{const b=d.createElement('button');b.type='button';b.className='secondary';b.style.cssText='margin:0;text-align:left;padding:11px 12px';b.innerHTML='<b>'+labelFor(v)+'</b><br><span style="font-size:12px">'+v.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))+'</span>';b.onclick=()=>{serial.value=v.toUpperCase();stop();modal.classList.add('hidden');if(msg){msg.className='msg ok';msg.textContent='Código seleccionado: '+v}};list.appendChild(b)})};
      const start=async()=>{
        if(serial.disabled)return;
        candidates=[];render();modal.classList.remove('hidden');
        try{
          reader=new w.ZXingBrowser.BrowserMultiFormatReader();
          controls=await reader.decodeFromConstraints({video:{facingMode:{ideal:'environment'}}},video,(res)=>{
            if(!res)return;const v=String(res.getText?res.getText():res.text||'').trim();if(!v||candidates.includes(v))return;
            candidates.push(v);render();clearTimeout(finishTimer);finishTimer=setTimeout(()=>{stop();if(!candidates.length&&msg){msg.className='msg err';msg.textContent='No se detectaron códigos'}} ,3500);
          });
          finishTimer=setTimeout(()=>{stop();if(!candidates.length&&msg){msg.className='msg err';msg.textContent='No se detectaron códigos'}} ,7000);
        }catch(e){stop();modal.classList.add('hidden');if(msg){msg.className='msg err';msg.textContent='No se pudo abrir la cámara'}}
      };
      btn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();start()},true);
      closeBtn?.addEventListener('click',()=>stop(),true);
    }catch{}
  }

  function injectPurchaseDocumentReader(frame){
    try{
      const w=frame.contentWindow,d=frame.contentDocument,path=(w.location.pathname||'').toLowerCase();
      if(!path.endsWith('/compras-ingresos.html')||d.getElementById('comprasDocumentoSerialesLoader'))return;
      const s=d.createElement('script');s.id='comprasDocumentoSerialesLoader';s.src='compras-documento-seriales-v1.js?v=20260829-1';d.body.appendChild(s);
    }catch{}
  }

  function decorateFrame(frame,btn){
    frame.classList.add('moduleCachedFrame');frame.dataset.moduleKey=keyFor(btn);frame.title=btn.querySelector('span')?.textContent||'Módulo DISPROTEL';
    frame.addEventListener('load',()=>{
      try{
        const path=frame.contentWindow.location.pathname||'';
        if(/login-general-v2\.html/i.test(path)){top.location.href='login-general-v2.html';return}
        injectNativeSerialCamera(frame);injectMultiScanner(frame);injectPurchaseDocumentReader(frame);
        const d=frame.contentDocument;
        if(!d||d.__disprotelBackHook)return;d.__disprotelBackHook=true;
        d.addEventListener('click',e=>{
          const c=e.target.closest('button,a');
          if(c&&norm(c.textContent).includes('ATRAS')){
            e.preventDefault();e.stopImmediatePropagation();goHome();
          }
        },true);
      }catch{}
    });
    return frame;
  }
  function hideAll(){frames.forEach(f=>f.classList.remove('moduleCacheActive'))}
  function show(btn){
    const stage=document.querySelector('.menuStage');if(!stage)return;
    const key=keyFor(btn);let frame=frames.get(key);
    if(!frame){
      frame=document.createElement('iframe');frame.className='menuFrame';decorateFrame(frame,btn);frames.set(key,frame);stage.appendChild(frame);frame.src=directUrl(btn.dataset.href);
    }
    hideAll();frame.classList.add('moduleCacheActive');activeFrame=frame;
    const title=document.querySelector('.mobileModuleTitle');if(title)title.textContent=btn.querySelector('span')?.textContent||'Módulo';
    document.body.classList.add('moduleOpen');
    document.querySelectorAll('.menuAside button[data-href]').forEach(x=>x.classList.toggle('on',x===btn));
  }
  function goHome(){
    const aside=document.querySelector('.menuAside');
    if(isMobile()){document.body.classList.remove('moduleOpen');aside?.querySelectorAll('button').forEach(x=>x.classList.remove('on'));return}
    const first=aside?.querySelector('button[data-href]');if(first)show(first);else document.body.classList.remove('moduleOpen');
  }
  function install(){
    if(ready)return true;
    const shell=document.querySelector('.menuShell'),aside=document.querySelector('.menuAside'),stage=document.querySelector('.menuStage'),old=document.querySelector('iframe.menuFrame');
    if(!shell||!aside||!stage||!old)return false;
    const activeBtn=aside.querySelector('button[data-href].on')||aside.querySelector('button[data-href]');
    if(activeBtn){decorateFrame(old,activeBtn);frames.set(keyFor(activeBtn),old);if(old.src&&old.src!=='about:blank'){old.classList.add('moduleCacheActive');activeFrame=old}}
    aside.addEventListener('click',e=>{
      const btn=e.target.closest('button[data-href]');if(!btn)return;
      if(isMobile())return;
      e.preventDefault();e.stopImmediatePropagation();show(btn)
    },true);
    const back=document.querySelector('.mobileModuleBack');if(back)back.addEventListener('click',e=>{
      if(isMobile())return;
      e.preventDefault();e.stopImmediatePropagation();goHome()
    },true);
    window.disprotelModuleCache={frames,openByTitle:t=>{const b=[...aside.querySelectorAll('button[data-href]')].find(x=>norm(x.textContent).includes(norm(t)));if(b){if(isMobile())b.click();else show(b)}},refreshActive:()=>{if(activeFrame)activeFrame.contentWindow.location.reload()}};
    ready=true;return true;
  }
  let tries=0;const timer=setInterval(()=>{if(install()||++tries>80)clearInterval(timer)},100);
})();