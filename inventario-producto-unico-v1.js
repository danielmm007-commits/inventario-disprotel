(()=>{
  if(window.__disprotelInventarioProductoUnicoV1)return;
  window.__disprotelInventarioProductoUnicoV1=true;
  const path=(location.pathname||'').toLowerCase();
  const KEY='disprotel_producto_creado_desde_inventario';

  if(path.endsWith('/index.html')||path.endsWith('/index')){
    document.addEventListener('click',e=>{
      const b=e.target.closest?.('#newProd');
      if(!b)return;
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      const serial=document.getElementById('inventarioInicialCard')?.dataset.mode==='serial';
      location.href='compras-ingresos.html?crear_producto=1&volver_inventario=1&serial='+(serial?'1':'0');
    },true);

    async function recuperar(){
      const id=sessionStorage.getItem(KEY);
      if(!id)return;
      sessionStorage.removeItem(KEY);
      const tab=document.getElementById('tabCarga');
      if(!tab)return;
      tab.click();
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
    addEventListener('pageshow',()=>setTimeout(recuperar,80));
    setTimeout(recuperar,300);
    return;
  }

  if(path.endsWith('/compras-ingresos.html')){
    const q=new URLSearchParams(location.search);
    if(q.get('crear_producto')!=='1')return;
    const volver=q.get('volver_inventario')==='1';
    const serial=q.get('serial')==='1';
    let savedId='';

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

    const originalApi=window.api;
    if(typeof originalApi==='function'){
      window.api=async function(body){
        const d=await originalApi.apply(this,arguments);
        if(body?.action==='save_product'&&!body?.product?.id&&d?.id){savedId=String(d.id);sessionStorage.setItem(KEY,savedId)}
        return d;
      };
    }

    const originalSave=window.saveProduct;
    if(typeof originalSave==='function'){
      window.saveProduct=async function(){
        savedId='';
        const r=await originalSave.apply(this,arguments);
        if(volver&&savedId)setTimeout(()=>history.back(),180);
        return r;
      };
    }

    let n=0;const t=setInterval(()=>{if(abrir()||++n>50)clearInterval(t)},150);
  }
})();