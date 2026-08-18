(()=>{
  const qs=new URLSearchParams(location.search);if(qs.get('vista')!=='activos')return;
  const KEY='disprotel_trabajos_test';let ses=null;try{ses=JSON.parse(sessionStorage.getItem(KEY)||'null')}catch{}
  const style=document.createElement('style');style.id='vistaActivosCss';style.textContent='html.vistaActivosPendiente body{visibility:hidden}body.vistaActivos #app>section:nth-of-type(2),body.vistaActivos #app>section:nth-of-type(4){display:none!important}body.vistaActivos #login{display:none!important}body.vistaActivos #app{display:block!important}body.vistaActivos #app>section:nth-of-type(3){margin-top:0}';document.head.appendChild(style);
  if(ses?.usuario&&ses?.pin)document.documentElement.classList.add('vistaActivosPendiente');
  function revelar(){document.documentElement.classList.remove('vistaActivosPendiente');document.body?.classList.add('vistaActivos')}
  function boot(){if(!ses?.usuario||!ses?.pin){revelar();return}let n=0;const t=setInterval(()=>{n++;const app=document.getElementById('app'),login=document.getElementById('login'),mios=document.getElementById('mios');if(app&&!app.classList.contains('hidden')&&mios){revelar();const h=[...app.querySelectorAll('section h2')].find(x=>/TRABAJOS ACTIVOS DEL GRUPO/i.test(x.textContent||''));h?.closest('section')?.scrollIntoView({block:'start'});clearInterval(t)}else if(n>80){revelar();clearInterval(t)}},100)}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();