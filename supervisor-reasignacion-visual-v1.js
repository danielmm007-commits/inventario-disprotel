(()=>{
  if(window.__supervisorReasignacionVisualV1)return;window.__supervisorReasignacionVisualV1=true;
  const style=document.createElement('style');style.id='supervisorReasignacionVisualStyle';style.textContent=`
    .work.supReassignPending{border-left-color:#e48a11!important;background:linear-gradient(135deg,#fffaf0,#fff)!important;box-shadow:0 0 0 2px #e8a83d24,0 8px 22px #7f530e14}.supReassignBadge{display:inline-flex;align-items:center;gap:5px;margin:0 0 7px;padding:5px 8px;border-radius:999px;background:#fff0c7;color:#8a5300;border:1px solid #efc66b;font-size:8px;font-weight:1000;animation:supReassignPulse 1.7s ease-in-out infinite}@keyframes supReassignPulse{50%{box-shadow:0 0 0 6px #e8a83d12}}
  `;document.head.appendChild(style);
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  function pendingIds(){
    const ids=new Set();
    document.querySelectorAll('#attention .supAtt,#attention .att').forEach(x=>{
      const t=norm(x.textContent);if(!t.includes('REASIGN'))return;
      const m=t.match(/OT-[A-Z0-9-]+/);if(m)ids.add(m[0]);
    });
    return ids;
  }
  function apply(){
    const ids=pendingIds();
    document.querySelectorAll('.work').forEach(card=>{
      const t=norm(card.textContent),id=[...ids].find(x=>t.includes(x)),has=!!id;
      card.classList.toggle('supReassignPending',has);
      let badge=card.querySelector('.supReassignBadge');
      if(has&&!badge){badge=document.createElement('div');badge.className='supReassignBadge';badge.textContent='⚠ REASIGNACIÓN SOLICITADA POR CAMPO';card.prepend(badge)}
      if(!has&&badge)badge.remove();
    });
  }
  setTimeout(apply,500);setInterval(apply,1500);
})();