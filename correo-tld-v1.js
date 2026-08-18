(()=>{
  const TLD=new Set(['com','net','org','edu','gov','mil','info','biz','io','ai','app','dev','tech','online','site','store','cloud','me','co','tv','ec','us','uk','es','mx','ar','cl','pe','br','ca','de','fr','it','nl','au','nz','jp','cn','in','ch','se','no','fi','dk','be','at','pt','ie']);
  const $=id=>document.getElementById(id);
  function estado(v){
    const c=String(v||'').trim().toLowerCase();
    if(!c)return{ok:true,empty:true,msg:'DATO FALTANTE'};
    const formato=/^[^\s@]+@([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/i.test(c);
    if(!formato)return{ok:false,empty:false,msg:c.includes('@')?'✕ Correo no válido':'⚠ Correo incompleto'};
    const tld=c.split('.').pop();
    if(!TLD.has(tld))return{ok:false,empty:false,msg:'✕ Extensión de correo no reconocida'};
    return{ok:true,empty:false,msg:'✓ Correo válido'};
  }
  function feedback(e){if(!e)return null;let f=e.parentElement?.querySelector(':scope > .campoFeedback');if(!f){f=document.createElement('div');f.className='campoFeedback';e.insertAdjacentElement('afterend',f)}return f}
  function pintar(){const e=$('correo');if(!e)return true;const f=feedback(e);e.classList.remove('campoValido','campoInvalido');if($('sinCorreo')?.checked){if(f){f.className='campoFeedback campoOk';f.textContent='✓ Cliente no dispone de correo'}return true}const st=estado(e.value);if(f){f.className='campoFeedback '+(st.empty?'campoNeutral':st.ok?'campoOk':'campoErr');f.textContent=st.msg}if(!st.empty)e.classList.add(st.ok?'campoValido':'campoInvalido');return st.ok||st.empty}
  function toast(txt){let t=$('validacionToast');if(!t){t=document.createElement('div');t.id='validacionToast';t.className='validacionToast';document.body.appendChild(t)}t.textContent=txt;t.classList.add('show');clearTimeout(window.__correoTldToast);window.__correoTldToast=setTimeout(()=>t.classList.remove('show'),3500)}
  function bloquear(ev){if($('sinCorreo')?.checked)return;const e=$('correo');if(!e)return;const st=estado(e.value);if(st.empty||st.ok)return;ev.preventDefault();ev.stopImmediatePropagation();pintar();toast(st.msg.replace(/^[✓⚠✕]\s*/,''));e.focus({preventScroll:true});e.scrollIntoView({behavior:'smooth',block:'center'})}
  function boot(){let n=0;const t=setInterval(()=>{n++;const e=$('correo'),b=$('guardarCambio');if(e){if(e.dataset.tldReady!=='1'){e.dataset.tldReady='1';e.addEventListener('input',pintar);e.addEventListener('blur',pintar);$('sinCorreo')?.addEventListener('change',pintar);pintar()}if(b&&b.dataset.tldReady!=='1'){b.dataset.tldReady='1';b.addEventListener('click',bloquear,true)}if(e&&b){clearInterval(t)}}if(n>60)clearInterval(t)},150)}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();