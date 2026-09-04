(()=> {
  const API='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-ordenes';
  const map=new Map();
  let panel=null,busy=false;
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function creds(){
    const keys=['disprotel_ordenes_oficina_test','disprotel_trabajos_test','disprotel_login_general_v2'];
    for(const k of keys){
      try{const s=JSON.parse(sessionStorage.getItem(k)||'null');if(s?.session_token||s?.usuario)return s}catch{}
    }
    return {};
  }
  function collect(x){
    if(!x||typeof x!=='object')return;
    if(x.id&&x.id_orden&&x.permitir_reset_prueba){
      map.set(String(x.id_orden),{id:x.id,id_orden:x.id_orden,cliente:x.cliente_nombre||'',tipo:x.tipo_trabajo||'',estado:x.estado||''});
    }
    if(Array.isArray(x))x.forEach(collect);
    else for(const v of Object.values(x))if(v&&typeof v==='object')collect(v);
  }
  function ensureStyle(){
    if(document.getElementById('resetOtPruebaStyle'))return;
    const st=document.createElement('style');
    st.id='resetOtPruebaStyle';
    st.textContent=`
      .resetOtPruebaPanel{position:fixed;right:18px;bottom:88px;z-index:99999;width:min(360px,calc(100vw - 28px));border:1px solid #f59e0b;border-radius:14px;background:#fffdf2;box-shadow:0 16px 45px #071a382e;overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:#17313d}
      .resetOtPruebaHead{display:flex;align-items:center;gap:8px;padding:11px 12px;background:linear-gradient(135deg,#fff7d6,#ffe08a);font-weight:1000;color:#5d3b00;font-size:12px}
      .resetOtPruebaHead button{margin-left:auto;width:auto;border:0;border-radius:9px;background:#17313d;color:#fff;padding:7px 9px;font-size:11px;font-weight:900;cursor:pointer}
      .resetOtPruebaBody{display:grid;gap:8px;padding:10px;max-height:260px;overflow:auto}
      .resetOtPruebaItem{border:1px solid #f4c55b;border-radius:11px;background:#fff;padding:9px}
      .resetOtPruebaItem b{display:block;font-size:12px;color:#062f63}
      .resetOtPruebaItem small{display:block;margin-top:3px;color:#60737c;font-size:10px;line-height:1.35}
      .resetOtPruebaItem button{width:100%;margin:8px 0 0;border:0;border-radius:10px;background:#b45309;color:#fff;padding:9px;font-size:11px;font-weight:1000;cursor:pointer}
      .resetOtPruebaItem button:disabled{opacity:.55;cursor:wait}
      .resetOtPruebaHint{padding:0 10px 10px;color:#725b00;font-size:10px}
      @media(max-width:700px){.resetOtPruebaPanel{right:8px;left:8px;bottom:70px;width:auto}}
    `;
    document.head.appendChild(st);
  }
  function render(){
    const rows=[...map.values()];
    if(!rows.length){panel?.remove();panel=null;return}
    ensureStyle();
    if(!panel){
      panel=document.createElement('section');
      panel.className='resetOtPruebaPanel';
      document.body.appendChild(panel);
    }
    panel.innerHTML='<div class="resetOtPruebaHead"><span>🧪 RESET DE OTS DE PRUEBA</span><button type="button" data-reset-refresh>Actualizar</button></div><div class="resetOtPruebaBody">'+rows.map(o=>`
      <div class="resetOtPruebaItem">
        <b>${esc(o.id_orden)} · ${esc(o.estado||'')}</b>
        <small>${esc(o.cliente||'SIN CLIENTE')}<br>${esc(o.tipo||'TIPO NO DEFINIDO')}</small>
        <button type="button" data-reset-ot="${esc(o.id)}" data-reset-label="${esc(o.id_orden)}">RESETEAR ESTA OT</button>
      </div>`).join('')+'</div><div class="resetOtPruebaHint">Visible solo para pruebas. En producción se oculta.</div>';
  }
  function clearLocalFlow(id){
    const keys=['disprotel_ot_pausadas_tecnico_v1','disprotel_ot_reprogramadas_local_v1'];
    for(const k of keys){
      try{
        const data=JSON.parse(sessionStorage.getItem(k)||'{}')||{};
        if(id)delete data[id];
        sessionStorage.setItem(k,JSON.stringify(data));
      }catch{sessionStorage.removeItem(k)}
    }
    try{
      if(sessionStorage.getItem('disprotel_instalacion_orden_test')?.includes(id))sessionStorage.removeItem('disprotel_instalacion_orden_test');
    }catch{}
    window.__disprotelOpenJobId='';
  }
  async function reset(id,label,btn){
    if(busy)return;
    if(!confirm('¿Resetear '+label+' y borrar historial operativo de prueba?'))return;
    busy=true;if(btn)btn.disabled=true;
    const s=creds();
    try{
      const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'reset-test-order',orden_id:id,session_token:s.session_token||'',usuario:s.usuario||'',pin:s.pin||''})});
      const d=await r.json().catch(()=>({error:'Respuesta inválida'}));
      if(!r.ok||d.error)throw new Error(d.error||'No se pudo resetear');
      clearLocalFlow(id);
      map.clear();
      if(typeof window.cargar==='function')await window.cargar();
      else location.reload();
      setTimeout(render,250);
    }catch(e){alert(e.message)}
    finally{busy=false;if(btn)btn.disabled=false}
  }
  const nativeFetch=window.fetch?.bind(window);
  if(nativeFetch&&!window.__resetOtPruebaFetch){
    window.__resetOtPruebaFetch=true;
    window.fetch=async(input,init={})=>{
      const res=await nativeFetch(input,init);
      try{
        const url=String(typeof input==='string'?input:input?.url||'');
        if(url.includes('/inventario-ordenes')){
          res.clone().json().then(d=>{collect(d);setTimeout(render,80)}).catch(()=>{});
        }
      }catch{}
      return res;
    };
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-reset-ot]');
    if(b){e.preventDefault();reset(b.dataset.resetOt,b.dataset.resetLabel||'OT',b);return}
    if(e.target.closest('[data-reset-refresh]')){e.preventDefault();location.reload()}
  });
  setTimeout(render,500);
})();
