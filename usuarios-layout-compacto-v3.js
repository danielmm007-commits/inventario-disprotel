(()=>{
  const STYLE='usuarios-layout-compacto-v3-style';
  function style(){
    if(document.getElementById(STYLE))return;
    const s=document.createElement('style');s.id=STYLE;
    s.textContent=`
      .usersWorkspaceGrid{grid-column:1/-1!important;display:grid!important;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr)!important;gap:14px!important;align-items:start!important;width:100%!important;max-width:none!important}
      .usersWorkspaceGrid>.card{align-self:start!important;min-width:0!important;width:100%!important;max-width:none!important;height:auto!important;min-height:0!important;margin:0!important}
      .usersWorkspaceGrid #usersList{max-height:540px!important;overflow:auto!important;padding-right:5px!important;scrollbar-gutter:stable}
      .usersWorkspaceGrid #userImportBox{margin:0 0 10px!important;padding:10px!important}
      .usersWorkspaceGrid .userImportTableWrap{max-height:165px!important}
      .usersWorkspaceGrid .userImportPreview{max-height:235px!important;overflow:auto!important}
      .usersWorkspaceGrid .userPhotoEditor{margin-top:7px!important}
      .usersWorkspaceGrid .userCrop{height:190px!important}
      .usersWorkspaceGrid .userRow{grid-template-columns:auto minmax(0,1fr) auto auto!important}
      .usersWorkspaceGrid .userRow small{white-space:normal!important;line-height:1.25!important}
      @media(min-width:1100px){.usersWorkspaceGrid{grid-template-columns:minmax(520px,1.12fr) minmax(430px,.88fr)!important}}
      @media(max-width:900px){.usersWorkspaceGrid{grid-template-columns:1fr!important}.usersWorkspaceGrid #usersList{max-height:430px!important}}
    `;
    document.head.appendChild(s);
  }
  function arrange(){
    style();
    const list=document.getElementById('usersList');
    const name=document.getElementById('uName');
    if(!list||!name)return;
    const listCard=list.closest('.card');
    const editorCard=name.closest('.card');
    if(!listCard||!editorCard||listCard===editorCard)return;
    let grid=document.getElementById('usersWorkspaceGrid');
    if(!grid){
      grid=document.createElement('div');grid.id='usersWorkspaceGrid';grid.className='usersWorkspaceGrid';
      const parent=listCard.parentNode;
      parent.insertBefore(grid,listCard);
      grid.appendChild(listCard);
      grid.appendChild(editorCard);
    }else{
      if(listCard.parentNode!==grid)grid.appendChild(listCard);
      if(editorCard.parentNode!==grid)grid.appendChild(editorCard);
    }
    const parent=grid.parentElement;
    if(parent){
      grid.style.gridColumn='1 / -1';
      grid.style.width='100%';
      grid.style.maxWidth='none';
    }
    const imp=document.getElementById('userImportBox');
    if(imp&&imp.parentNode!==listCard){
      const title=listCard.querySelector('h3');
      if(title&&title.nextSibling)listCard.insertBefore(imp,title.nextSibling);else listCard.insertBefore(imp,listCard.firstChild);
    }
  }
  document.addEventListener('click',e=>{
    if(e.target?.id==='confirmUsersImport')setTimeout(()=>{
      const p=document.getElementById('userImportPreview');if(p){p.style.display='none';p.innerHTML=''}
      const st=document.getElementById('userImportStatus');if(st){st.textContent='✓ Usuarios importados correctamente';st.style.display='block'}
      arrange();
    },50);
  },true);
  new MutationObserver(()=>setTimeout(arrange,0)).observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(arrange,60);
})();