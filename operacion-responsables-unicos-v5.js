(()=>{
  const STYLE='op-responsables-unicos-v5-style';
  function style(){
    if(document.getElementById(STYLE))return;
    const s=document.createElement('style');s.id=STYLE;
    s.textContent=`
      .cfgRespTypeHidden{display:none!important}
      .cfgPersonUnavailable{display:none!important}
      .cfgRespAutoNote{margin-top:6px;padding:7px 8px;border-radius:8px;background:#f7fbfe;border:1px solid #dce8ef;font-size:7px;color:#5f7786}
      .cfgRespAutoNote b{color:#244f70}
    `;
    document.head.appendChild(s);
  }
  function savedLocations(){
    const all={};
    try{Object.assign(all,JSON.parse(localStorage.getItem('disprotel_operacion_config_confirmada_v2')||'{}'))}catch(e){}
    if(window.state&&state.opsConfirmed&&typeof state.opsConfirmed==='object')Object.assign(all,state.opsConfirmed);
    return all;
  }
  function usedElsewhere(currentId){
    const used=new Set();
    const rows=savedLocations();
    Object.values(rows).forEach(r=>{
      if(!r||String(r.id||'')===String(currentId))return;
      (r.people||[]).forEach(id=>used.add(String(id)));
    });
    return used;
  }
  function applyAutoResponsibility(box){
    const checks=[...box.querySelectorAll('input[type="checkbox"][data-person]')];
    if(!checks.length)return;
    const currentId=checks[0].getAttribute('data-person')||'';
    const type=box.querySelector('[data-loc-resp]');
    if(type){
      const field=type.closest('.cfgEditField');if(field)field.classList.add('cfgRespTypeHidden');
    }
    const used=usedElsewhere(currentId);
    checks.forEach(ch=>{
      const lab=ch.closest('.cfgPerson');
      const unavailable=used.has(String(ch.value))&&!ch.checked;
      if(lab)lab.classList.toggle('cfgPersonUnavailable',unavailable);
      if(!ch.dataset.uniqueRespBound){
        ch.dataset.uniqueRespBound='1';
        ch.addEventListener('change',()=>{
          const count=checks.filter(x=>x.checked).length;
          if(type)type.value=count>1?'COMPARTIDA':count===1?'INDIVIDUAL':'';
          checks.forEach(x=>x.closest('.cfgPerson')?.classList.toggle('on',x.checked));
          updateNote(box,count);
        });
      }
    });
    const count=checks.filter(x=>x.checked).length;
    if(type)type.value=count>1?'COMPARTIDA':count===1?'INDIVIDUAL':'';
    const label=[...box.querySelectorAll('.cfgPeopleLabel')].find(x=>/PERSONAS RESPONSABLES/i.test(x.textContent||''));
    if(label)label.textContent='SELECCIONA RESPONSABLE(S) DE ESTA UBICACIÓN';
    updateNote(box,count);
    const toggle=box.querySelector('.respToggleBtn');
    if(toggle&&!toggle.classList.contains('open'))toggle.textContent='👥 ASIGNAR RESPONSABLE';
  }
  function updateNote(box,count){
    let note=box.querySelector('.cfgRespAutoNote');
    if(!note){
      note=document.createElement('div');note.className='cfgRespAutoNote';
      const actions=box.querySelector('.cfgActions');
      if(actions)actions.parentNode.insertBefore(note,actions);
    }
    if(!note)return;
    const type=count>1?'COMPARTIDA':count===1?'INDIVIDUAL':'SIN RESPONSABLE';
    note.innerHTML=`Responsabilidad automática: <b>${type}</b>. Una persona asignada aquí deja de estar disponible como responsable habitual en otras bodegas o minibodegas.`;
  }
  function run(){
    style();
    document.querySelectorAll('.cfgBox.editing').forEach(applyAutoResponsibility);
    document.querySelectorAll('.respToggleBtn').forEach(btn=>{
      if(!btn.classList.contains('open')&&!/OCULTAR/i.test(btn.textContent||''))btn.textContent='👥 ASIGNAR RESPONSABLE';
    });
  }
  document.addEventListener('click',e=>{
    const save=e.target?.closest?.('[data-loc-save]');
    if(save){
      const box=save.closest('.cfgBox');
      if(box){
        const checks=[...box.querySelectorAll('input[type="checkbox"][data-person]')];
        const type=box.querySelector('[data-loc-resp]');
        const count=checks.filter(x=>x.checked).length;
        if(type)type.value=count>1?'COMPARTIDA':count===1?'INDIVIDUAL':'';
      }
      setTimeout(run,80);
    }
  },true);
  new MutationObserver(()=>setTimeout(run,0)).observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(run,80);
})();