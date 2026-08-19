(()=>{
// Cámara nativa global: no interceptar los <input type="file" capture="environment">.
// El navegador/sistema operativo abre la cámara del teléfono con sus herramientas propias,
// exactamente como en Rubi > Nueva solicitud > 3. Cédula/documento.
if(window.__camaraTraseraV1)return;
window.__camaraTraseraV1=true;
window.CamaraTrasera={
  abrir(input){
    if(!input)return false;
    input.click();
    return true;
  },
  cerrar(){}
};
})();