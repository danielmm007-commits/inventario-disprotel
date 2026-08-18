(()=>{
 const escLocal=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function aplicar(){
   try{
     if(typeof O==='undefined'||!O)return false;
     const nombre=String(O.cliente_nombre_final||O.cliente_nombre||'').toLocaleUpperCase('es-EC');
     const ident=String(O.cliente_identificacion_final||O.cliente_identificacion||'').trim();
     const texto=ident?`${nombre} · ${ident}`:nombre;
     const ctx=document.querySelector('[data-contexto-ejecucion]');
     if(ctx){const rows=[...ctx.querySelectorAll('.techRow')];const r=rows.find(x=>String(x.querySelector('.techLabel')?.textContent||'').trim()==='CLIENTE');const v=r?.querySelector('.techValue');if(v)v.textContent=texto||'CLIENTE'}
     const datos=document.getElementById('datos');
     if(datos){const labels=[...datos.querySelectorAll('.label')];const l=labels.find(x=>String(x.textContent||'').trim()==='Apellidos y Nombres');const v=l?.parentElement?.querySelector('.value');if(v)v.innerHTML=escLocal(texto||'—')}
     return true;
   }catch{return false}
 }
 function boot(){let n=0;const t=setInterval(()=>{n++;if(aplicar()&&n>15)clearInterval(t);if(n>60)clearInterval(t)},200)}
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();