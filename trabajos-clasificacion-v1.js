(()=>{
  const ASSIGNED=new Set(['ASIGNADA','ASIGNADO','PENDIENTE_RECEPCION','PENDIENTE_CONFIRMACION']);
  let view='available',busy=false,autoFocused=false;
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
  .attentionMode .job{padding:11px 12px}
  .attentionMode .job.jobSupport{border-color:#f59e0b;box-shadow:inset 4px 0 0 #f59e0b}
  .attentionMode .job.jobInstall{border-color:#176fc4;box-shadow:inset 4px 0 0 #176fc4}
  .workKind{display:inline-block;margin:0 0 6px;padding:5px 9px;border-radius:999px;font-size:11px;font-weight:900;letter-spacing:.2px}
  .jobSupport .workKind{background:#fff3dc;color:#9a5a00}
  .jobInstall .workKind{background:#eaf5ff;color:#075da8}
  .attentionMode .job.jobCompact:not(.expanded)>:not(.workKind):not(.jobTitle):not(.badge):not(.jobQuickMeta):not(.jobToggle){display:none!important}
  .jobToggle{width:100%;margin-top:9px;padding:9px 11px!important;background:#eaf2f6!important;color:#17313d!important}
  .jobQuickMeta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 10px;font-size:11px;color:#17313d;font-weight:800;margin-top:7px}
  .jobQuickMeta span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.jobQuickMeta b{color:#60737c}
  @media(max-width:620px){.attentionSwitch{grid-template-columns:1fr}.attentionTab{padding:11px 13px}}
  `;
  function state(job){return String(job.querySelector('.badge')?.textContent||'').trim().toUpperCase()}
  function jobs(id){return [...document.querySelectorAll('#'+id+' .job')]}
  function isAssigned(job){return ASSIGNED.has(state(job))}
  function counts(){return{available:jobs('disponibles').length,assigned:jobs('mios').filter(isAssigned).length,active:jobs('mios').filter(x=>!isAssigned(x)).length}}
  function clean(v){return String(v||'').replace(/\s+/g,' ').trim()}
  function field(job,label){
    const wanted=label.toUpperCase();
    for(const row of job.querySelectorAll('.otField,.infoLine')){
      const k=clean(row.querySelector('b,.infoLabel')?.textContent).toUpperCase();
      if(k.includes(wanted))return clean(row.querySelector('span,.infoValue')?.textContent);
    }
    return '';
  }
  function quick(job){
    const client=field(job,'NOMBRE DEL CLIENTE')||clean(job.querySelector('.clientName')?.textContent);
    const type=field(job,'TIPO DE TRABAJO')||field(job,'SERVICIO / PLAN');
    const damage=field(job,'DETALLE')||field(job,'DESCRIPCIÓN')||field(job,'DANO')||field(job,'DAÑO');
    const place=field(job,'DIRECCIÓN')||field(job,'SECTOR');
    const by=field(job,'SOLICITADO POR');
    return [
      client&&['Cliente:',client],
      type&&['Tipo:',type],
      damage&&['Detalle:',damage],
      place&&['Ubicación:',place],
      by&&['Solicitado:',by]
    ].filter(Boolean);
  }
  function addQuickMeta(job,items){
    if(!items.length)return;
    const m=document.createElement('div');m.className='jobQuickMeta';
    items.forEach(([label,value])=>{
      const s=document.createElement('span'),b=document.createElement('b');
      b.textContent=label+' ';
      s.appendChild(b);
      s.appendChild(document.createTextNode(value));
      m.appendChild(s);
    });
    job.querySelector('.badge')?.after(m);
  }
  function kind(job){
    const t=clean(field(job,'TIPO DE TRABAJO')||field(job,'SERVICIO / PLAN')).toUpperCase();
    if(t.includes('INSTAL'))return ['jobInstall','INSTALACIÓN'];
    if(t.includes('SOPORTE'))return ['jobSupport','SOPORTE'];
    return ['', ''];
  }
  function compact(job){
    job.classList.add('jobCompact');
    if(job.dataset.compactReady)return;
    job.dataset.compactReady='1';
    const [cls,label]=kind(job);
    if(cls){job.classList.add(cls);const k=document.createElement('span');k.className='workKind';k.textContent=label;job.prepend(k)}
    addQuickMeta(job,quick(job));
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
  function familySelected(){return !!document.querySelector('.familyCard.on')}
  function focusAttentionOnce(){
    if(autoFocused)return false;
    const all=document.getElementById('familyAll');
    const attention=[...document.querySelectorAll('.familyCard')].find(x=>/ATENCIÓN CLIENTES/i.test(x.textContent||''));
    if(!all?.classList.contains('on')||!attention)return false;
    autoFocused=true;
    attention.click();
    return true;
  }
  function apply(){
    if(busy)return;busy=true;
    const ui=ensure();if(!ui){busy=false;return}
    if(focusAttentionOnce()){busy=false;return}
    const mode=familySelected(),c=counts(),available=document.querySelector('.workPanel.available'),mine=document.querySelector('.workPanel.active');
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
