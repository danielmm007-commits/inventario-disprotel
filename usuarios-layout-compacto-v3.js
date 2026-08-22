(()=>{
  const STYLE='usuarios-layout-compacto-v3-style';
  function style(){
    if(document.getElementById(STYLE))return;
    const s=document.createElement('style');s.id=STYLE;
    s.textContent=`
      .usersWorkspaceGrid{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(300px,.85fr);gap:12px;align-items:start;width:100%}
      .usersWorkspaceGrid>.card{align-self:start;min-width:0;height:auto!important;min-height:0!important}
      .usersWorkspaceGrid #usersList{max-height:520px;overflow:auto;padding-right:4px;scrollbar-gutter:stable}
      .usersWorkspaceGrid #userImportBox{margin:0 0 10px!important;padding:9px!important}
      .usersWorkspaceGrid .userImportTableWrap{max-height:165px!important}
      .usersWorkspaceGrid .userImportPreview{max-height:235px;overflow:auto}
      .usersWorkspaceGrid .userPhotoEditor{margin-top:7px}
      .usersWorkspaceGrid .userCrop{height:180px!important}
      @media(max-width:880px){.usersWorkspaceGrid{grid-template-columns:1fr}.usersWorkspaceGrid #usersList{max-height:430px}}
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