(()=>{
  const STYLE='op-resp-actions-v6-style';
  function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function rows(){
    const all={};
    try{Object.assign(all,JSON.parse(localStorage.getItem('disprotel_operacion_config_confirmada_v2')||'{}'));}catch(e){}
    if(window.state&&state.opsConfirmed&&typeof state.opsConfirmed==='object')Object.assign(all,state.opsConfirmed);
    return all;
  }
  function rowFor(id){return rows()[id]||null;}
  function assignedCount(id){return (rowFor(id)?.people||[]).length;}
  function style(){
    if(document.getElementById(STYLE))return;
    const s=document.createElement('style');s.id=STYLE;
    s.textContent=`
      .respManageActions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;margin-top:7px}
      .respManageBtn{border:1px solid #bdd8e8;background:#fff;color:#185f99;border-radius:8px;padding:7px 9px;font-size:7px;font-weight:900;cursor:pointer;transition:.15s}
      .respManageBtn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 5px 12px rgba(11,42,92,.12)}
      .respManageBtn.add{background:linear-gradient(135deg,#0e67b4,#2189da);border-color:#0e67b4;color:#fff}
      .respManageBtn.del{color:#a33b46;border-color:#efc4c9}
      .respManageBtn:disabled{opacity:.4;cursor:not-allowed}
      .respOnlyMode .cfgEditGrid,.respOnlyMode>.cfgHint,.respOnlyMode>.cfgRespAutoNote{display:none!important}
      .respOnlyMode .cfgPeopleLabel,.respOnlyMode .cfgPeople{display:grid!important}
      .respOnlyMode .cfgPeopleLabel{display:block!important}
      .respOnlyMode .respToggleRow{display:none!important}
      .respOnlyMode .cfgActions [data-loc-save]{background:linear-gradient(135deg,#0e67b4,#2189da);color:#fff}
    `;
    document.head.appendChild(s);
  }
  function locIdFromBox(box){
    return box.querySelector('[data-loc-edit]')?.getAttribute('data-loc-edit')||
           box.querySelector('input[data-person]')?.getAttribute('data-person')||
           box.querySelector('[data-loc-save]')?.getAttribute('data-loc-save')||'';
  }
  function availableFilter(box,id){
    const used=new Set();
    Object.values(rows()).forEach(r=>{
      if(!r||String(r.id||'')===String(id))return;
      (r.people||[]).forEach(u=>used.add(String(u)));
    });
    box.querySelectorAll('input[type="checkbox"][data-person]').forEach(ch=>{
      const lab=ch.closest('.cfgPerson');
      const unavailable=used.has(String(ch.value))&&!ch.checked;
      if(lab)lab.style.display=unavailable?'none':'';
    });
  }
  function openResponsibleEditor(box,id,mode){
    const edit=box.querySelector('[data-loc-edit]');
    if(!edit)return;
    edit.click();
    setTimeout(()=>{
      const target=[...document.querySelectorAll('.cfgBox.editing')].find(b=>locIdFromBox(b)===id);
      if(!target)return;
      target.classList.add('respOnlyMode');
      availableFilter(target,id);
      const label=[...target.querySelectorAll('.cfgPeopleLabel')].find(x=>/RESPONSABLE/i.test(x.textContent||''));
      if(label)label.textContent=mode==='add'?'SELECCIONA EL RESPONSABLE QUE DESEAS AGREGAR':'MODIFICA LOS RESPONSABLES DE ESTA UBICACIÓN';
      const save=target.querySelector('[data-loc-save]');if(save)save.textContent='💾 GUARDAR RESPONSABLES';
      const toggle=target.querySelector('.respToggleBtn');
      if(toggle&&!toggle.classList.contains('open'))toggle.click();
    },40);
  }
  function removeResponsible(box,id){
    const edit=box.querySelector('[data-loc-edit]');if(!edit)return;
    edit.click();
    setTimeout(()=>{
      const target=[...document.querySelectorAll('.cfgBox.editing')].find(b=>locIdFromBox(b)===id);
      if(!target)return;
      target.querySelectorAll('input[type="checkbox"][data-person]').forEach(ch=>{ch.checked=false;ch.closest('.cfgPerson')?.classList.remove('on');});
      const type=target.querySelector('[data-loc-resp]');if(type)type.value='';
      const save=target.querySelector('[data-loc-save]');if(save)save.click();
    },40);
  }
  function decorateBox(box){
    if(box.classList.contains('editing'))return;
    const id=locIdFromBox(box);if(!id||id.startsWith('GRUPO::'))return;
    let wrap=box.querySelector('.respManageActions');
    const n=assignedCount(id);
    if(!wrap){
      wrap=document.createElement('div');wrap.className='respManageActions';
      const actions=box.querySelector('.cfgActions');
      if(actions)actions.parentNode.insertBefore(wrap,actions);else box.appendChild(wrap);
    }
    wrap.innerHTML=`<button type="button" class="respManageBtn add" data-resp-add="${esc(id)}">➕ AGREGAR RESPONSABLE</button><button type="button" class="respManageBtn" data-resp-mod="${esc(id)}" ${n?'':'disabled'}>✏️ MODIFICAR</button><button type="button" class="respManageBtn del" data-resp-del="${esc(id)}" ${n?'':'disabled'}>🗑 ELIMINAR</button>`;
  }
  function run(){style();document.querySelectorAll('.cfgBox').forEach(decorateBox);document.querySelectorAll('.cfgBox.editing').forEach(b=>{if(b.classList.contains('respOnlyMode'))availableFilter(b,locIdFromBox(b));});}
  document.addEventListener('click',e=>{
    const add=e.target.closest?.('[data-resp-add]');if(add){const box=add.closest('.cfgBox');openResponsibleEditor(box,add.dataset.respAdd,'add');return;}
    const mod=e.target.closest?.('[data-resp-mod]');if(mod){const box=mod.closest('.cfgBox');openResponsibleEditor(box,mod.dataset.respMod,'mod');return;}
    const del=e.target.closest?.('[data-resp-del]');if(del){const box=del.closest('.cfgBox');removeResponsible(box,del.dataset.respDel);return;}
    if(e.target.closest?.('[data-loc-save]'))setTimeout(run,120);
  },true);
  new MutationObserver(()=>setTimeout(run,0)).observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(run,80);
})();