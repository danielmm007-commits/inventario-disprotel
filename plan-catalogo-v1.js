(()=>{
 const API_DOM='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-instalacion-domicilio';
 function listo(){try{return typeof O!=='undefined'&&O&&typeof post==='function'&&typeof ordenId==='function'}catch{return false}}
 async function sincronizar(){
   if(!listo())return;
   try{
     const d=await post(API_DOM,'get',{orden_id:ordenId()});
     if(d.orden){
       O.plan_final=d.orden.plan_final??O.plan_final;
       O.plan_solicitado=d.orden.plan_solicitado??O.plan_solicitado;
       sessionStorage.setItem(INSTKEY,JSON.stringify(O));
     }
     const viejo=document.getElementById('planCatalogoBox');
     if(viejo)viejo.remove();
     window.dispatchEvent(new CustomEvent('plan-catalogo-listo'));
   }catch{}
 }
 function boot(){let n=0;const t=setInterval(()=>{n++;if(listo()){sincronizar();clearInterval(t)}if(n>40)clearInterval(t)},250)}
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();