(()=>{
  if(window.__disprotelInventarioProductoUnicoV1)return;
  window.__disprotelInventarioProductoUnicoV1=true;
  const path=(location.pathname||'').toLowerCase();
  const KEY='disprotel_producto_creado_desde_inventario';

  if(path.endsWith('/index.html')||path.endsWith('/index')){
    function closeCreator(){
      document.getElementById('inventoryProductCreatorOverlay')?.remove();
      document.body.style.overflow='';
    }
    function openCreator(serial){
      closeCreator();
      const wrap=document.createElement('div');
      wrap.id='inventoryProductCreatorOverlay';
      wrap.style.cssText='position:fixed;inset:0;z-index:70000;background:rgba(7,29,56,.55);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:14px';
      const frame=document.createElement('iframe');
      frame.title='Crear producto';
      frame.src='compras-ingresos.html?crear_producto=1&embedded=1&serial='+(serial?'1':'0');
      frame.style.cssText='width:min(980px,96vw);height:min(90vh,820px);border:0;border-radius:18px;background:transparent;box-shadow:0 24px 70px rgba(3,18,40,.35)';
      wrap.appendChild(frame);
      document.body.appendChild(wrap);
      document.body.style.overflow='hidden';
    }
    document.addEventListener('click',e=>{
      const b=e.target.closest?.('#newProd');
      if(!b)return;
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      const serial=document.getElementById('inventarioInicialCard')?.dataset.mode==='serial';
      openCreator(serial);
    },true);

    async function recuperar(){
      const id=sessionStorage.getItem(KEY);
      if(!id)return;
      sessionStorage.removeItem(KEY);
      let n=0;
      const t=setInterval(()=>{
        const sel=document.getElementById('iniProd');
        if(sel&&[...sel.options].some(o=>o.value===id)){
          sel.value=id;
          sel.dispatchEvent(new Event('change',{bubbles:true}));
          clearInterval(t);
        }else if(++n>60)clearInterval(t);
      },150);
    }
    addEventListener('message',e=>{
      if(e.origin!==location.origin||!e.data)return;
      if(e.data.type==='disprotel:producto-guardado'){
        const id=String(e.data.id||'').trim();
        if(id)sessionStorage.setItem(KEY,id);
        closeCreator();
        setTimeout(()=>{
          document.getElementById('tabCarga')?.click();
          setTimeout(recuperar,120);
        },50);
      }
      if(e.data.type==='disprotel:producto-cancelado')closeCreator();
    });
    setTimeout(recuperar,300);
    return;
  }

  if(path.endsWith('/compras-ingresos.html')){
    const q=new URLSearchParams(location.search);
    if(q.get('crear_producto')!=='1')return;
    const volver=q.get('volver_inventario')==='1';
    const embedded=q.get('embedded')==='1';
    const serial=q.get('serial')==='1';
    let savedId='';
    if(embedded){
      document.documentElement.classList.add('embeddedProductCreator');
      const st=document.createElement('style');
      st.textContent='.embeddedProductCreator body{background:transparent!important}.embeddedProductCreator .top,.embeddedProductCreator main,.embeddedProductCreator #msg{display:none!important}.embeddedProductCreator dialog{max-width:min(900px,94vw)!important;max-height:88vh!important}.embeddedProductCreator dialog::backdrop{background:rgba(7,29,56,.10)!important}';
      document.head.appendChild(st);
    }

    function abrir(){
      if(typeof window.openProduct!=='function'||!document.getElementById('productDlg'))return false;
      document.querySelectorAll('.tab,.pane').forEach(x=>x.classList.remove('on'));
      document.querySelector('.tab[data-p="productos"]')?.classList.add('on');
      document.getElementById('productos')?.classList.add('on');
      window.openProduct();
      const type=document.getElementById('pType'),ser=document.getElementById('pSerial');
      if(type)type.value=serial?'EQUIPO':'MATERIAL';
      if(ser)ser.value=serial?'true':'false';
      return true;
    }

    window.addEventListener('disprotel:producto-guardado',e=>{
      const id=String(e?.detail?.id||'').trim();
      if(id){savedId=id;sessionStorage.setItem(KEY,id)}
      if(embedded){parent.postMessage({type:'disprotel:producto-guardado',id},location.origin);return}
      if(volver)setTimeout(()=>history.back(),180);
    },{once:true});

    productDlg?.addEventListener('close',()=>{
      if(embedded&&!savedId){parent.postMessage({type:'disprotel:producto-cancelado'},location.origin);return}
      if(!volderPendiente()&&volver&&!savedId)setTimeout(()=>history.back(),80);
    },{once:true});

    function volderPendiente(){
      return !!sessionStorage.getItem(KEY);
    }

    let n=0;const t=setInterval(()=>{if(abrir()||++n>50)clearInterval(t)},150);
  }
})();