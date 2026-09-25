(()=>{
  if(window.__DISPROTEL_GPS_ROUTE_MODULE__)return;
  window.__DISPROTEL_GPS_ROUTE_MODULE__=true;

  const KEY='disprotel_login_general_v2';
  const PANEL='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-panel-supervisor';
  const GPS_PANEL='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-panel-gps';
  const GPS_HITOS='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-gps-orden';

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
  const token=()=>{try{return JSON.parse(sessionStorage.getItem(KEY)||'{}').session_token||''}catch{return''}};
  const fmt=v=>{try{return new Date(v).toLocaleTimeString('es-EC',{hour:'2-digit',minute:'2-digit'})}catch{return'—'}};

  async function call(url,body={}){
    const r=await fetch(url,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','x-session':token()},body:JSON.stringify(body)});
    const j=await r.json().catch(()=>({}));
    if(!r.ok||j.error)throw new Error(j.error||'No se pudo consultar GPS');
    return j;
  }

  function addStyle(){
    if(document.getElementById('supGpsRouteStyle'))return;
    const s=document.createElement('style');
    s.id='supGpsRouteStyle';
    s.textContent=`
      #supGpsRouteOv{position:fixed;inset:0;z-index:1200;background:#071a38b8;display:none;align-items:center;justify-content:center;padding:16px}
      #supGpsRouteOv.show{display:flex}
      .supGpsRouteBox{width:min(1180px,97vw);max-height:92vh;overflow:auto;background:#fff;border-radius:20px;padding:16px;box-shadow:0 25px 70px #071a3866}
      .supGpsRouteHead{display:flex;align-items:center;gap:12px}.supGpsRouteHead>div{flex:1}
      .supGpsRouteHead b{font-size:19px;color:#173b63}.supGpsRouteHead small{display:block;margin-top:3px;color:#70838e}
      .supGpsRouteClose{border:1px solid #d7e3ea;background:#fff;border-radius:10px;padding:8px 10px;cursor:pointer}
      .supGpsRouteList{display:grid;grid-template-columns:1fr;gap:14px;margin-top:12px}
      .supGpsRouteItem{overflow:hidden;border:1px solid #d7e3ea;border-radius:15px;background:#fff}
      .supGpsRouteMap{position:relative;height:430px;background:#eaf2f6;overflow:hidden}
      .supGpsRouteMap iframe{width:100%;height:100%;border:0;display:block}
      .supGpsRouteOverlay{position:absolute;inset:0;pointer-events:none}
      .supGpsRouteOverlay svg{position:absolute;inset:0;width:100%;height:100%}
      .supGpsRouteLine{fill:none;stroke:#176eb7;stroke-width:1.1;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:2 1}
      .supGpsRouteDot{position:absolute;transform:translate(-50%,-50%);width:17px;height:17px;border:3px solid #fff;border-radius:50%;box-shadow:0 3px 9px #071a3866;background:#176eb7}
      .supGpsRouteDot.start{background:#22a763}.supGpsRouteDot.road{background:#f59e0b}.supGpsRouteDot.last{background:#e32929;animation:supGpsRoutePulse 1.25s ease-out infinite}
      .supGpsRouteLabel{position:absolute;left:11px;top:-18px;padding:4px 6px;border-radius:7px;background:#071a38df;color:#fff;font-size:8px;font-weight:900;white-space:nowrap}
      .supGpsRouteInfo{padding:12px 14px}.supGpsRouteInfo>b{display:block;color:#123d70;font-size:14px}.supGpsRouteInfo small{display:block;margin-top:4px;color:#6d818c}
      .supGpsRouteLegend{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.supGpsRouteLegend span{padding:5px 8px;border-radius:999px;background:#edf5fa;color:#31566c;font-size:9px;font-weight:900}
      .supGpsRouteLink{display:inline-flex;margin-top:10px;padding:9px 11px;border-radius:9px;background:#176eb7;color:#fff;text-decoration:none;font-size:9px;font-weight:1000}
      .supGpsRouteNote{margin-top:7px;color:#7b8c95;font-size:9px}
      .supGpsRouteEmpty{padding:70px 15px;text-align:center;color:#7892a4}
      @keyframes supGpsRoutePulse{0%{box-shadow:0 0 0 0 #e3292966,0 3px 9px #071a3866}70%{box-shadow:0 0 0 18px #e3292900,0 3px 9px #071a3866}100%{box-shadow:0 0 0 0 #e3292900,0 3px 9px #071a3866}}
      @media(max-width:700px){.supGpsRouteMap{height:340px}.supGpsRouteBox{padding:12px}.supGpsRouteLabel{font-size:7px}}
    `;
    document.head.appendChild(s);
  }

  function ensureOverlay(){
    let ov=document.getElementById('supGpsRouteOv');
    if(ov)return ov;
    ov=document.createElement('div');
    ov.id='supGpsRouteOv';
    ov.innerHTML='<div class="supGpsRouteBox"><div class="supGpsRouteHead"><div><b>📍 Mapa operativo</b><small>Ruta aproximada entre hitos GPS reales del grupo</small></div><button class="supGpsRouteClose">✕</button></div><div id="supGpsRouteBody"><div class="supGpsRouteEmpty">Cargando GPS…</div></div></div>';
    document.body.appendChild(ov);
    ov.querySelector('.supGpsRouteClose').onclick=()=>ov.classList.remove('show');
    ov.onclick=e=>{if(e.target===ov)ov.classList.remove('show')};
    return ov;
  }

  function valid(x){return Number.isFinite(Number(x?.latitud))&&Number.isFinite(Number(x?.longitud))}
  function googleUrl(p){return 'https://www.google.com/maps?q='+encodeURIComponent(Number(p.latitud)+','+Number(p.longitud))}

  function routePoints(hitos,latest){
    const good=(hitos||[]).filter(h=>valid(h)&&norm(h.estado_gps||'REGISTRADO')==='REGISTRADO').sort((a,b)=>new Date(a.capturado_at)-new Date(b.capturado_at));
    const out=[];
    const add=(x,label)=>{
      if(!x)return;
      const item={...x,label};
      if(out.some(p=>p.capturado_at===item.capturado_at&&Number(p.latitud)===Number(item.latitud)&&Number(p.longitud)===Number(item.longitud)))return;
      out.push(item);
    };
    const acceptance=good.find(x=>norm(x.tipo_evento)==='ACEPTACION');
    const road=good.find(x=>norm(x.tipo_evento)==='INICIO_TRASLADO');
    const arrival=good.find(x=>norm(x.tipo_evento)==='LLEGADA');
    add(acceptance||good[0],'INICIO');
    if(road && (!out.length||road!==good[0]))add(road,'EN CAMINO');
    if(arrival)add(arrival,'FINAL');
    if(valid(latest)){
      const tLatest=new Date(latest.capturado_at||0).getTime();
      const tLast=out.length?new Date(out[out.length-1].capturado_at||0).getTime():0;
      if(!out.length||tLatest>tLast)add({...latest,estado_gps:'REGISTRADO'},'ÚLTIMA');
    }
    if(out.length===1)out[0].label='ÚLTIMA';
    return out;
  }

  function bounds(points){
    let minLat=Math.min(...points.map(p=>Number(p.latitud))),maxLat=Math.max(...points.map(p=>Number(p.latitud)));
    let minLon=Math.min(...points.map(p=>Number(p.longitud))),maxLon=Math.max(...points.map(p=>Number(p.longitud)));
    const spanLat=Math.max(maxLat-minLat,.0025),spanLon=Math.max(maxLon-minLon,.0025);
    minLat-=spanLat*.4;maxLat+=spanLat*.4;minLon-=spanLon*.4;maxLon+=spanLon*.4;
    return{minLat,maxLat,minLon,maxLon};
  }

  function mapHtml(points,group){
    if(!points.length)return'<div class="supGpsRouteEmpty">Sin hitos GPS válidos para esta OT.</div>';
    const b=bounds(points),dx=b.maxLon-b.minLon,dy=b.maxLat-b.minLat;
    const pos=points.map(p=>({x:(Number(p.longitud)-b.minLon)/dx*100,y:(b.maxLat-Number(p.latitud))/dy*100}));
    const poly=pos.map(q=>q.x.toFixed(2)+','+q.y.toFixed(2)).join(' ');
    const bbox=[b.minLon,b.minLat,b.maxLon,b.maxLat].join('%2C');
    const url='https://www.openstreetmap.org/export/embed.html?bbox='+bbox+'&layer=mapnik';
    const dots=points.map((p,i)=>{
      const q=pos[i],last=i===points.length-1;
      const cls=last?'last':p.label==='INICIO'?'start':p.label==='EN CAMINO'?'road':'';
      return '<div class="supGpsRouteDot '+cls+'" style="left:'+q.x+'%;top:'+q.y+'%"><span class="supGpsRouteLabel">'+esc(p.label)+' · '+fmt(p.capturado_at)+'</span></div>';
    }).join('');
    return '<div class="supGpsRouteMap"><iframe title="Ruta aproximada '+esc(group||'grupo')+'" src="'+url+'" loading="lazy" referrerpolicy="no-referrer"></iframe><div class="supGpsRouteOverlay"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline class="supGpsRouteLine" points="'+poly+'"></polyline></svg>'+dots+'</div></div>';
  }

  async function show(){
    addStyle();
    const ov=ensureOverlay(),body=document.getElementById('supGpsRouteBody');
    ov.classList.add('show');
    body.innerHTML='<div class="supGpsRouteEmpty">Cargando GPS…</div>';
    try{
      const [g,d]=await Promise.all([call(GPS_PANEL,{}),call(PANEL,{action:'dashboard'})]);
      const latest=(g.puntos||[]).filter(valid);
      const orders=d.orders||[];
      if(!latest.length){body.innerHTML='<div class="supGpsRouteEmpty">Sin ubicaciones GPS registradas.</div>';return}
      const cards=[];
      for(const p of latest){
        const o=orders.find(x=>norm(x.id_orden)===norm(p.id_orden))||orders.find(x=>norm(x.grupo_asignado||x.grupo_destino)===norm(p.grupo));
        let hitos=[];
        if(o?.id){
          try{const h=await call(GPS_HITOS,{orden_id:o.id,action:'hitos'});hitos=h.hitos||[]}catch{}
        }
        const route=routePoints(hitos,p);
        const legend=route.map((x,i)=>'<span>'+(i===route.length-1?'🔴 ':x.label==='INICIO'?'🟢 ':x.label==='EN CAMINO'?'🟠 ':'🔵 ')+esc(x.label)+' · '+fmt(x.capturado_at)+'</span>').join('');
        cards.push('<article class="supGpsRouteItem">'+mapHtml(route,p.grupo)+'<div class="supGpsRouteInfo"><b>📍 '+esc(p.grupo||'Grupo')+'</b><small>'+esc(p.id_orden||'Sin OT')+' · '+esc(p.cliente||'Sin cliente')+'</small><small>Última captura: '+(p.capturado_at?fmt(p.capturado_at):'—')+(p.capturado_por?' · '+esc(p.capturado_por):'')+'</small><div class="supGpsRouteLegend">'+legend+'</div><div class="supGpsRouteNote">Trayecto aproximado entre posiciones registradas; no representa seguimiento continuo del vehículo.</div><a class="supGpsRouteLink" href="'+googleUrl(p)+'" target="_blank" rel="noopener">ABRIR EN GOOGLE MAPS</a></div></article>');
      }
      body.innerHTML='<div class="supGpsRouteList">'+cards.join('')+'</div>';
    }catch(e){
      body.innerHTML='<div class="supGpsRouteEmpty">⚠ '+esc(e.message)+'</div>';
    }
  }

  function bind(){
    const card=document.getElementById('supGpsCard');
    if(!card||card.dataset.routeGpsBound==='1')return;
    card.dataset.routeGpsBound='1';
    card.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();show()},true);
  }

  addStyle();
  const mo=new MutationObserver(bind);
  mo.observe(document.body,{childList:true,subtree:true});
  bind();
})();