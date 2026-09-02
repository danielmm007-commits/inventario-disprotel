(()=>{
  if(window.__disprotelSoporteResilienteV1)return;
  window.__disprotelSoporteResilienteV1=true;

  const nativeFetch=window.fetch.bind(window);
  const supportPath='/functions/v1/inventario-soporte';
  const optionsPath='/functions/v1/inventario-soporte-opciones';

  function urlOf(input){return typeof input==='string'?input:String(input?.url||'')}
  function inventoryFallback(){
    return new Response(JSON.stringify({
      cantidades:[],
      seriales:[],
      ubicacion:{codigo:'',ubicacion:'INVENTARIO TEMPORALMENTE NO DISPONIBLE'},
      degraded:true
    }),{status:200,headers:{'Content-Type':'application/json'}})
  }

  window.fetch=async function(input,init={}){
    const url=urlOf(input);
    if(!url.includes(supportPath))return nativeFetch(input,init);

    let lastError=null;
    for(let attempt=0;attempt<2;attempt++){
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),12000);
      try{
        const response=await nativeFetch(input,{...init,signal:controller.signal});
        if(response.status<500)return response;
        lastError=new Error('El servidor de soporte no respondió correctamente.');
        if(attempt===1)break;
      }catch(error){
        lastError=error;
        if(attempt===0)await new Promise(resolve=>setTimeout(resolve,450));
      }finally{clearTimeout(timeout)}
    }

    if(url.includes(optionsPath)){
      console.warn('Canasta de soporte temporalmente no disponible:',lastError);
      return inventoryFallback();
    }
    throw new Error('No se pudo conectar con el servicio de evidencias. Intenta nuevamente.');
  };
})();
