(()=>{
  if(window.__grupoDestinoNormalizadorV1)return;
  window.__grupoDestinoNormalizadorV1=true;

  const GRUPOS=[
    {value:'',label:'Disponible para cualquier grupo técnico'},
    {value:'CAMIONETA',label:'Grupo Salcedo · Camioneta'},
    {value:'FURGONETA',label:'Grupo Salcedo · Furgoneta'},
    {value:'SAQUISILÍ',label:'Grupo Saquisilí'}
  ];

  function sinAcentos(v){
    return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleUpperCase('es-EC').trim();
  }

  function normalizarGrupoTecnico(v){
    const raw=String(v||'').trim();
    const n=sinAcentos(raw);
    if(!n)return '';
    if(n.includes('CAMIONETA'))return 'CAMIONETA';
    if(n.includes('FURGONETA'))return 'FURGONETA';
    if(n.includes('SAQUISILI'))return 'SAQUISILÍ';
    return raw;
  }

  function normalizarPayload(data){
    if(!data||typeof data!=='object')return data;
    ['grupo_destino','grupo_asignado'].forEach(k=>{
      if(Object.prototype.hasOwnProperty.call(data,k))data[k]=normalizarGrupoTecnico(data[k]);
    });
    return data;
  }

  const nativeFetch=window.fetch;
  window.fetch=function(input,init){
    try{
      const url=typeof input==='string'?input:(input&&input.url)||'';
      if(/inventario-(ordenes|soporte)/.test(url)&&init&&typeof init.body==='string'){
        const data=JSON.parse(init.body);
        init={...init,body:JSON.stringify(normalizarPayload(data))};
      }
    }catch(_){}
    return nativeFetch.call(this,input,init);
  };

  function pintarSelectorGrupo(){
    const sel=document.getElementById('grupo');
    if(!sel||sel.dataset.gruposNormalizados==='1')return;
    const actual=normalizarGrupoTecnico(sel.value);
    sel.innerHTML=GRUPOS.map(g=>`<option value="${g.value}">${g.label}</option>`).join('');
    sel.value=actual;
    sel.dataset.gruposNormalizados='1';
  }

  window.normalizarGrupoTecnico=normalizarGrupoTecnico;
  document.addEventListener('DOMContentLoaded',pintarSelectorGrupo);
  setTimeout(pintarSelectorGrupo,300);
})();
