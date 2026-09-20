(()=>{
  if(window.__disprotelInventarioProductoUnicoV1)return;
  window.__disprotelInventarioProductoUnicoV1=true;
  const path=(location.pathname||'').toLowerCase();
  const KEY='disprotel_producto_creado_desde_inventario';

  if(path.endsWith('/index.html')||path.endsWith('/index')){
    // Inventario inicial ya tiene su propio creador de producto.
    // No interceptar #newProd ni navegar a Compras e ingresos.
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