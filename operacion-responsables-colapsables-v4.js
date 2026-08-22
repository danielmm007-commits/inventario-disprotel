(()=>{
  const STYLE_ID='op-resp-colapsables-v4-style';
  function injectStyle(){
    if(document.getElementById(STYLE_ID))return;
    const s=document.createElement('style');s.id=STYLE_ID;
    s.textContent=`.respCollapsed{display:none!important}.respToggleRow{display:flex;justify-content:flex-end;margin-top:8px}.respToggleBtn{border:1px solid #bdd8e8;background:#fff;color:#185f99;border-radius:8px;padding:7px 9px;font-size:7px;font-weight:900;cursor:pointer;transition:.15s}.respToggleBtn:hover{transform:translateY(-2px);box-shadow:0 5px 12px rgba(11,42,92,.12)}.respToggleBtn.open{background:#eef8ff;border-color:#77b9e6}`;
    document.head.appendChild(s);
  }
  function collapseLocationPeople(box){
    if(!box.classList.contains('editing')||box.dataset.respCollapseReady==='1')return;
    const label=[...box.querySelectorAll('.cfgPeopleLabel')].find(x=>/PERSONAS RESPONSABLES DE ESTA UBICACIÓN/i.test(x.textContent||''));
    if(!label)return;
    const people=label.nextElementSibling;
    if(!people||!people.classList.contains('cfgPeople'))return;
    box.dataset.respCollapseReady='1';
    label.classList.add('respCollapsed');
    people.classList.add('respCollapsed');
    const row=document.createElement('div');row.className='respToggleRow';
    const btn=document.createElement('button');btn.type='button';btn.className='respToggleBtn';btn.textContent='👥 ASIGNAR RESPONSABLES';
    btn.onclick=()=>{
      const open=people.classList.contains('respCollapsed');
      label.classList.toggle('respCollapsed',!open);
      people.classList.toggle('respCollapsed',!open);
      btn.classList.toggle('open',open);
      btn.textContent=open?'▲ OCULTAR RESPONSABLES':'👥 ASIGNAR RESPONSABLES';
    };
    row.appendChild(btn);
    label.parentNode.insertBefore(row,label);
  }
  function run(){injectStyle();document.querySelectorAll('.cfgBox').forEach(collapseLocationPeople);}
  const obs=new MutationObserver(()=>setTimeout(run,0));
  obs.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(run,0);
})();