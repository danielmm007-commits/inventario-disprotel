(()=>{
  const $=id=>document.getElementById(id);
  const norm=v=>String(v??'').trim().toLocaleUpperCase('es-EC');
  function aplicar(){
    try{
      if(typeof O==='undefined'||!O)return false;
      const chk=$('otroContacto');
      if(!chk||chk.dataset.contactoFinalOk==='1')return false;
      const nombreCliente=norm(O.cliente_nombre_final||O.cliente_nombre||'');
      const telCliente=String(O.cliente_telefono_final||O.cliente_telefono||'').trim();
      const nombreContacto=norm(O.contacto_visita_nombre_final||O.contacto_visita_nombre||nombreCliente);
      const telContacto=String(O.contacto_visita_telefono_final||O.contacto_visita_telefono||telCliente).trim();
      const esOtro=Boolean((nombreContacto&&nombreContacto!==nombreCliente)||(telContacto&&telContacto!==telCliente));
      chk.checked=esOtro;
      const box=$('contactoBox');
      if(box)box.classList.toggle('hidden',!esOtro);
      if(esOtro){
        const n=$('contactoNombre'),t=$('contactoTelefono');
        if(n)n.value=nombreContacto;
        if(t)t.value=telContacto;
      }else{
        const n=$('contactoNombre'),t=$('contactoTelefono');
        if(n)n.value='';
        if(t)t.value='';
      }
      chk.dataset.contactoFinalOk='1';
      return true;
    }catch{return false}
  }
  function boot(){let i=0;const timer=setInterval(()=>{i++;if(aplicar()||i>40)clearInterval(timer)},200)}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();