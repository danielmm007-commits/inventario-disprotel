(()=>{
  const ASSIGNED=new Set(['ASIGNADA','ASIGNADO','PENDIENTE_RECEPCION','PENDIENTE_CONFIRMACION']);
  let view='available',busy=false;
  const css=`
  .attentionSwitch{display:none;grid-template-columns:repeat(3,1fr);gap:10px;margin:13px 0}
  .attentionSwitch.show{display:grid}
  .attentionTab{position:relative;text-align:left;background:#fff;color:#17313d;border:2px solid #cfe0e8;border-radius:15px;padding:13px 14px;box-shadow:0 5px 16px #082b5c0b}
  .attentionTab.on{border-color:#176fc4;background:#eaf5ff;color:#082b5c}
  .attentionTab.needsAttention:not(.on){animation:attentionPulse 1.7s ease-in-out infinite}
  .attentionTab strong{display:block;font-size:14px}.attentionTab small{display:block;color:#687f8b;margin-top:4px}
  .attentionCount{position:absolute;right:12px;top:11px;min-width:27px;height:27px;padding:0 7px;border-radius:999px;display:grid;place-items:center;background:#17313d;color:#fff;font-size:13px;font-weight:900}
  @keyframes attentionPulse{0%,100%{box-shadow:0 0 0 0 #f59e0b55}50%{box-shadow:0 0 0 7px #f59e0b12;border-color:#f59e0b}}
  .workGrid.attentionMode{grid-template-columns:1fr}.workGrid.attentionMode .workPanel{display:none}.workGrid.attentionMode .workPanel.boardVisible{display:block}.workGrid.attentionMode .workPanel.history{display:block}
  .attentionMode .job{padding:11px 12px}.attentionMode .job:not(.expanded) .infoLine,.attentionMode .job:not(.expanded) .clientData,.attentionMode .job:not(.expanded)>.msg,.attentionMode .job:not(.expanded)>.grid,.attentionMode .job:not(.expanded)>button:not(.jobToggle){display:none}
  .jobToggle{width:100%;margin-top:9px;padding:9px 11px!important;background:#eaf2f6!important;color:#17313d!important}
  .jobQuickMeta{font-size:11px;color:#60737c;font-weight:800;margin-top:5px}
  @media(max-width:620px){.attentionSwitch{grid-template-columns:1fr}.attentionTab{padding:11px 13px}}
  `;
  function state(job){return String(job.querySelector('.badge')?.textContent||'').trim().toUpperCase()}
  function jobs(id){return [...document.querySelectorAll('#'+id+' .job')]}
  function isAssigned(job){return ASSIGNED.has(state(job))}
  function counts(){return{available:jobs('disponibles').length,assigned:jobs('mios').filter(isAssigned).length,active:jobs('mios').filter(x=>!isAssigned(x)).length}}
  function compact(job){
    if(job.dataset.compactReady)return;
    job.dataset.compactReady='1';
    const type=job.querySelector('.infoLine .infoValue')?.textContent?.trim()||'';
    if(type){const m=document.createElement('div');m.className='jobQuickMeta';m.textContent=type;job.querySelector('.badge')?.after(m)}
    const b=document.createElement('button');b.type='button';b.className='jobToggle';b.textContent='VER TRABAJO Y ACCIONES';
    b.onclick=()=>{job.classList.toggle('expanded');b.textContent=job.classList.contains('expanded')?'OCULTAR DETALLE':'VER TRABAJO Y ACCIONES'};
    job.appendChild(b);
  }
  function ensure(){
    const grid=document.querySelector('.workGrid'),catalog=document.querySelector('.catalogPanel');if(!grid||!catalog)return null;
    let nav=document.getElementById('attentionSwitch');
    if(!nav){nav=document.createElement('section');nav.id='attentionSwitch';nav.className='attentionSwitch';nav.innerHTML=`
      <button class="attentionTab" data-view="available">🔔 <strong>Disponibles</strong><small>Órdenes libres para tomar</small><span class="attentionCount">0</span></button>
      <button class="attentionTab" data-view="assigned">📥 <strong>Asignados</strong><small>Pendientes de recibir</small><span class="attentionCount">0</span></button>
      <button class="attentionTab" data-view="active">🛠️ <strong>En ejecución</strong><small>Aceptados o en proceso</small><span class="attentionCount">0</span></button>`;
      grid.before(nav);nav.querySelectorAll('.attentionTab').forEach(b=>b.onclick=()=>{view=b.dataset.view;apply()});
    }return{grid,nav}
  }
  function attentionSelected(){const on=document.querySelector('.familyCard.on');return !!on&&/ATENCIÓN CLIENTES/i.test(on.textContent||'')}
  function apply(){
    if(busy)return;busy=true;
    const ui=ensure();if(!ui){busy=false;return}
    const mode=attentionSelected(),c=counts(),available=document.querySelector('.workPanel.available'),mine=document.querySelector('.workPanel.active');
    ui.nav.classList.toggle('show',mode);ui.grid.classList.toggle('attentionMode',mode);
    ui.nav.querySelectorAll('.attentionTab').forEach(b=>{const k=b.dataset.view,n=c[k],count=b.querySelector('.attentionCount');b.classList.toggle('on',k===view);b.classList.toggle('needsAttention',n>0);if(count.textContent!==String(n))count.textContent=n});
    available?.classList.toggle('boardVisible',mode&&view==='available');mine?.classList.toggle('boardVisible',mode&&view!=='available');
    jobs('mios').forEach(j=>j.style.display=!mode||(view==='assigned'?isAssigned(j):view==='active'?!isAssigned(j):true)?'':'none');
    [...jobs('disponibles'),...jobs('mios')].forEach(compact);
    const title=mine?.querySelector('h2'),desc=mine?.querySelector('.workHead p');
    if(mode&&view==='assigned'){if(title&&title.textContent!=='Trabajos asignados')title.textContent='Trabajos asignados';if(desc&&desc.textContent!=='Órdenes dirigidas al grupo pendientes de recepción.')desc.textContent='Órdenes dirigidas al grupo pendientes de recepción.'}
    else if(mode&&view==='active'){if(title&&title.textContent!=='Trabajos en ejecución')title.textContent='Trabajos en ejecución';if(desc&&desc.textContent!=='Órdenes aceptadas, en camino, en sitio o en proceso.')desc.textContent='Órdenes aceptadas, en camino, en sitio o en proceso.'}
    else if(!mode){if(title&&title.textContent!=='Trabajos activos')title.textContent='Trabajos activos';if(desc&&desc.textContent!=='Órdenes recibidas o tomadas por tu grupo.')desc.textContent='Órdenes recibidas o tomadas por tu grupo.'}
    busy=false;
  }
  const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);
  document.addEventListener('click',e=>{if(e.target.closest('.familyCard,#familyAll'))setTimeout(apply,0)},true);
  new MutationObserver(()=>setTimeout(apply,0)).observe(document.documentElement,{subtree:true,childList:true});
  window.addEventListener('load',apply);setTimeout(apply,300);
})();
