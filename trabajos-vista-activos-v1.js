(()=>{
  const qs=new URLSearchParams(location.search),vista=qs.get('vista')||'';
  const KEY='disprotel_trabajos_test';let ses=null;try{ses=JSON.parse(sessionStorage.getItem(KEY)||'null')}catch{}
  const especial=['activos','home'].includes(vista);
  if(!ses?.usuario||!ses?.pin){
    document.documentElement.classList.remove('vistaSesionPendiente','preSession');
    if(especial)location.replace('trabajos-tecnicos.html');
    return;
  }
  const style=document.createElement('style');style.id='vistaActivosCss';style.textContent='html.vistaSesionPendiente body,html.preSession body{visibility:hidden}body.vistaActivos #app>section:nth-of-type(1),body.vistaActivos #app>section:nth-of-type(2),body.vistaActivos #app>section:nth-of-type(4){display:none!important}body.vistaActivos #login,body.vistaHome #login{display:none!important}body.vistaActivos #app,body.vistaHome #app{display:block!important}body.vistaActivos #app>section:nth-of-type(3){margin-top:0}.vistaActivosNav{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 0 10px}.vistaActivosNav a,.vistaActivosNav button{margin:0!important}@media(max-width:520px){.vistaActivosNav{grid-template-columns:1fr}}';document.head.appendChild(style);
  document.documentElement.classList.add('vistaSesionPendiente');
  function nav(){if(vista!=='activos'||document.getElementById('vistaActivosNav'))return;const wrap=document.querySelector('.wrap');if(!wrap)return;const box=document.createElement('div');box.id='vistaActivosNav';box.className='vistaActivosNav';const home=document.createElement('a');home.className='btn secondary';home.href='trabajos-tecnicos.html?vista=home';home.textContent='🏠 INICIO';const ref=document.createElement('button');ref.className='secondary';ref.type='button';ref.textContent='🔄 ACTUALIZAR ACTIVOS';ref.onclick=()=>document.getElementById('recargar')?.click();box.append(home,ref);wrap.insertBefore(box,wrap.firstChild)}
  function revelar(){document.documentElement.classList.remove('vistaSesionPendiente','preSession');if(vista==='activos')document.body?.classList.add('vistaActivos');else if(vista==='home')document.body?.classList.add('vistaHome');nav()}
  function boot(){let n=0;const t=setInterval(()=>{n++;const app=document.getElementById('app'),mios=document.getElementById('mios');if(app&&!app.classList.contains('hidden')&&mios){revelar();if(vista==='activos'){const h=[...app.querySelectorAll('section h2')].find(x=>/TRABAJOS ACTIVOS DEL GRUPO/i.test(x.textContent||''));h?.closest('section')?.scrollIntoView({block:'start'})}clearInterval(t)}else if(n>80){revelar();clearInterval(t)}},100)}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();