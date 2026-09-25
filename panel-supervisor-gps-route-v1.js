
(()=>{
  if(window.__DISPROTEL_GPS_ROUTE_MODULE__)return;
  window.__DISPROTEL_GPS_ROUTE_MODULE__=true;

  const KEY='disprotel_login_general_v2';
  const PANEL='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-panel-supervisor';
  const GPS_PANEL='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-panel-gps';
  const GPS_HITOS='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-gps-orden';
  const LEAFLET_JS='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  const LEAFLET_CSS='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  const COLORS=['#176eb7','#e57a12','#7a4fd0','#1f8c5a','#c23b67','#8a6d15'];

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
  const token=()=>{try{return JSON.parse(sessionStorage.getItem(KEY)||'{}').session_token||''}catch{return''}};
  const fmt=v=>{try{return new Date(v).toLocaleTimeString('es-EC',{hour:'2-digit',minute:'2-digit'})}catch{return'—'}};
  const valid=x=>Number.isFinite(Number(x?.latitud))&&Number.isFinite(Number(x?.longitud));

  let activeMap=null;
  let activeBounds=null;

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
    s.textContent=[
      '#supGpsRouteOv{position:fixed;inset:0;z-index:1200;background:#071a38b8;display:none;align-items:center;justify-content:center;padding:16px}',
      '#supGpsRouteOv.show{display:flex}',
      '.supGpsRouteBox{width:min(1180px,97vw);max-height:94vh;overflow:auto;background:#fff;border-radius:20px;padding:16px;box-shadow:0 25px 70px #071a3866}',
      '.supGpsRouteHead{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.supGpsRouteHead>div{flex:1;min-width:220px}',
      '.supGpsRouteHead b{font-size:19px;color:#173b63}.supGpsRouteHead small{display:block;margin-top:3px;color:#70838e}',
      '.supGpsRouteBtn,.supGpsRouteClose{border:1px solid #d7e3ea;background:#fff;border-radius:10px;padding:8px 10px;cursor:pointer;font-weight:900;color:#173b63}',
      '.supGpsRouteBtn{background:#eef7ff;border-color:#bdd8eb}.supGpsRouteBtn:hover,.supGpsRouteClose:hover{filter:brightness(.98)}',
      '.supGpsRouteStage{position:relative;height:560px;margin-top:12px;border:1px solid #d7e3ea;border-radius:16px;overflow:hidden;background:#eaf2f6}',
      '#supGpsLeafletMap{position:absolute;inset:0}',
      '.supGpsRouteLegend{position:absolute;left:12px;top:12px;z-index:500;display:flex;flex-direction:column;gap:7px;max-width:min(340px,58%)}',
      '.supGpsLegendItem{display:grid;grid-template-columns:12px 1fr;gap:8px;align-items:start;padding:8px 10px;border-radius:11px;background:#ffffffec;box-shadow:0 5px 16px #071a3828;border:1px solid #dce7ed;cursor:pointer}',
      '.supGpsLegendDot{width:10px;height:10px;border-radius:50%;margin-top:3px}.supGpsLegendItem b{font-size:10px;color:#173b63}.supGpsLegendItem small{display:block;margin-top:2px;color:#6d818c;font-size:8px}',
      '.supGpsRouteFooter{display:flex;gap:8px;flex-wrap:wrap;padding-top:10px}.supGpsRouteNote{font-size:9px;color:#7b8c95;flex:1;min-width:220px}',
      '.supGpsLastIcon{position:relative;display:flex;align-items:center;gap:6px}',
      '.supGpsPulseCore{width:16px;height:16px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px #071a3866;animation:supGpsRoutePulse 1.25s ease-out infinite}',
      '.supGpsLastLabel{padding:4px 7px;border-radius:8px;background:#071a38e8;color:#fff;font-size:9px;font-weight:1000;white-space:nowrap;box-shadow:0 4px 12px #071a3833}',
      '.supGpsHitoIcon{width:12px;height:12px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 7px #071a3855}',
      '.leaflet-tooltip.supGpsTooltip{background:#071a38e8;color:#fff;border:0;border-radius:7px;box-shadow:0 3px 9px #071a3833;font-size:8px;font-weight:900;padding:4px 6px}',
      '.leaflet-tooltip.supGpsTooltip:before{display:none}',
      '@keyframes supGpsRoutePulse{0%{box-shadow:0 0 0 0 currentColor,0 2px 8px #071a3866}70%{box-shadow:0 0 0 16px transparent,0 2px 8px #071a3866}100%{box-shadow:0 0 0 0 transparent,0 2px 8px #071a3866}}',
      '@media(max-width:700px){.supGpsRouteStage{height:470px}.supGpsRouteBox{padding:12px}.supGpsRouteLegend{max-width:72%;left:8px;top:8px}.supGpsLegendItem{padding:6px 8px}.supGpsRouteHead b{font-size:16px}}'
    ].join('');
    document.head.appendChild(s);
  }

  function ensureOverlay(){
    let ov=document.getElementById('supGpsRouteOv');
    if(ov)return ov;
    ov=document.createElement('div');
    ov.id='supGpsRouteOv';
    ov.innerHTML='<div class="supGpsRouteBox"><div class="supGpsRouteHead"><div><b>📍 Mapa operativo</b><small>Ubicaciones y trayectos aproximados por grupo técnico</small></div><button id="supGpsRestore" class="supGpsRouteBtn">↺ RESTAURAR UBICACIONES</button><button class="supGpsRouteClose">✕</button></div><div id="supGpsRouteBody"><div class="supGpsRouteEmpty">Cargando GPS…</div></div></div>';
    document.body.appendChild(ov);
    ov.querySelector('.supGpsRouteClose').onclick=()=>ov.classList.remove('show');
    ov.onclick=e=>{if(e.target===ov)ov.classList.remove('show')};
    ov.querySelector('#supGpsRestore').onclick=()=>restoreLocations();
    return ov;
  }

  function loadLeaflet(){
    if(window.L)return Promise.resolve(window.L);
    return new Promise((resolve,reject)=>{
      if(!document.querySelector('link[data-disprotel-leaflet]')){
        const link=document.createElement('link');
        link.rel='stylesheet';
        link.href=LEAFLET_CSS;
        link.dataset.disprotelLeaflet='1';
        document.head.appendChild(link);
      }
      let script=document.querySelector('script[data-disprotel-leaflet]');
      if(script){
        if(window.L){resolve(window.L);return}
        script.addEventListener('load',()=>window.L?resolve(window.L):reject(new Error('Leaflet no quedó disponible')),{once:true});
        script.addEventListener('error',()=>reject(new Error('No se pudo cargar el mapa interactivo')),{once:true});
        return;
      }
      script=document.createElement('script');
      script.src=LEAFLET_JS;
      script.dataset.disprotelLeaflet='1';
      script.async=true;
      script.onload=()=>window.L?resolve(window.L):reject(new Error('Leaflet no quedó disponible'));
      script.onerror=()=>reject(new Error('No se pudo cargar el mapa interactivo'));
      document.head.appendChild(script);
    });
  }

  function routeOrderFor(orders,p){
    return orders.find(o=>norm(o.id_orden)===norm(p.id_orden))
      ||orders.find(o=>norm(o.grupo_asignado||o.grupo_destino)===norm(p.grupo));
  }

  function routePoints(hitos,latest){
    const good=(hitos||[]).filter(h=>valid(h)&&norm(h.estado_gps||'REGISTRADO')==='REGISTRADO')
      .sort((a,b)=>new Date(a.capturado_at)-new Date(b.capturado_at));
    const out=[];
    const add=(x,label)=>{
      if(!x)return;
      const item={...x,label,latitud:Number(x.latitud),longitud:Number(x.longitud)};
      if(out.some(p=>p.capturado_at===item.capturado_at&&p.latitud===item.latitud&&p.longitud===item.longitud))return;
      out.push(item);
    };
    const acceptance=good.find(x=>norm(x.tipo_evento)==='ACEPTACION');
    const road=good.find(x=>norm(x.tipo_evento)==='INICIO_TRASLADO');
    const arrival=good.find(x=>norm(x.tipo_evento)==='LLEGADA');
    add(acceptance||good[0],'INICIO');
    if(road&&(!out.length||road!==good[0]))add(road,'EN CAMINO');
    if(arrival)add(arrival,'FINAL');
    if(valid(latest)){
      const tLatest=new Date(latest.capturado_at||0).getTime();
      const tLast=out.length?new Date(out[out.length-1].capturado_at||0).getTime():0;
      if(!out.length||tLatest>tLast)add({...latest,estado_gps:'REGISTRADO'},'ÚLTIMA');
    }
    if(out.length===1)out[0].label='ÚLTIMA';
    return out;
  }

  function popupHtml(group,p,latest){
    return '<b>'+esc(group)+'</b><br>'+esc(p.label||'GPS')+' · '+fmt(p.capturado_at)
      +(latest?.id_orden?'<br>'+esc(latest.id_orden):'')
      +(latest?.cliente?'<br>'+esc(latest.cliente):'');
  }

  function restoreLocations(){
    if(!activeMap||!activeBounds)return;
    try{
      if(activeBounds.isValid()&&activeBounds.getNorthEast().equals(activeBounds.getSouthWest())){
        activeMap.setView(activeBounds.getCenter(),16,{animate:true});
      }else{
        activeMap.fitBounds(activeBounds,{padding:[42,42],maxZoom:16,animate:true});
      }
    }catch{}
  }

  async function renderInteractive(groups){
    const L=await loadLeaflet();
    if(activeMap){
      try{activeMap.remove()}catch{}
      activeMap=null;
    }
    activeBounds=L.latLngBounds([]);
    activeMap=L.map('supGpsLeafletMap',{zoomControl:true,attributionControl:true});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      maxZoom:19,
      attribution:'&copy; OpenStreetMap'
    }).addTo(activeMap);

    const legend=document.getElementById('supGpsRouteLegend');
    legend.innerHTML='';

    groups.forEach((g,idx)=>{
      const color=COLORS[idx%COLORS.length];
      const coords=g.route.map(p=>[Number(p.latitud),Number(p.longitud)]);
      coords.forEach(ll=>activeBounds.extend(ll));

      if(coords.length>1){
        L.polyline(coords,{color:color,weight:4,opacity:.8,dashArray:'8 7'}).addTo(activeMap);
      }

      g.route.forEach((p,i)=>{
        const last=i===g.route.length-1;
        const ll=[Number(p.latitud),Number(p.longitud)];
        if(last){
          const icon=L.divIcon({
            className:'',
            html:'<div class="supGpsLastIcon"><span class="supGpsPulseCore" style="background:'+color+';color:'+color+'"></span><span class="supGpsLastLabel">'+esc(g.latest.grupo||'Grupo')+'</span></div>',
            iconSize:[190,30],
            iconAnchor:[8,15]
          });
          L.marker(ll,{icon:icon,zIndexOffset:1000}).addTo(activeMap)
            .bindPopup(popupHtml(g.latest.grupo||'Grupo',p,g.latest));
        }else{
          const icon=L.divIcon({
            className:'',
            html:'<div class="supGpsHitoIcon" style="background:'+color+'"></div>',
            iconSize:[12,12],
            iconAnchor:[6,6]
          });
          L.marker(ll,{icon:icon}).addTo(activeMap)
            .bindTooltip(esc(p.label)+' · '+fmt(p.capturado_at),{direction:'top',className:'supGpsTooltip'})
            .bindPopup(popupHtml(g.latest.grupo||'Grupo',p,g.latest));
        }
      });

      const item=document.createElement('div');
      item.className='supGpsLegendItem';
      item.innerHTML='<span class="supGpsLegendDot" style="background:'+color+'"></span><div><b>'+esc(g.latest.grupo||'Grupo')+'</b><small>'+esc(g.latest.id_orden||'Sin OT')+' · '+esc(g.latest.cliente||'Sin cliente')+'</small><small>Último GPS: '+fmt(g.latest.capturado_at)+(g.latest.capturado_por?' · '+esc(g.latest.capturado_por):'')+'</small></div>';
      item.onclick=()=>{
        const last=g.route[g.route.length-1];
        if(last)activeMap.setView([Number(last.latitud),Number(last.longitud)],16,{animate:true});
      };
      legend.appendChild(item);
    });

    setTimeout(()=>{
      try{
        activeMap.invalidateSize();
        restoreLocations();
      }catch{}
    },80);
  }

  async function show(){
    addStyle();
    const ov=ensureOverlay();
    const body=document.getElementById('supGpsRouteBody');
    ov.classList.add('show');
    body.innerHTML='<div class="supGpsRouteEmpty">Cargando GPS…</div>';
    try{
      const data=await Promise.all([call(GPS_PANEL,{}),call(PANEL,{action:'dashboard'})]);
      const latest=(data[0].puntos||[]).filter(valid);
      const orders=data[1].orders||[];
      if(!latest.length){
        body.innerHTML='<div class="supGpsRouteEmpty">Sin ubicaciones GPS registradas.</div>';
        return;
      }

      const groups=[];
      for(const p of latest){
        const o=routeOrderFor(orders,p);
        let hitos=[];
        if(o?.id){
          try{
            const h=await call(GPS_HITOS,{orden_id:o.id,action:'hitos'});
            hitos=h.hitos||[];
          }catch(e){
            console.warn('Hitos GPS no disponibles',e);
          }
        }
        const route=routePoints(hitos,p);
        if(!route.length&&valid(p))route.push({...p,label:'ÚLTIMA'});
        groups.push({latest:p,route:route});
      }

      body.innerHTML='<div class="supGpsRouteStage"><div id="supGpsLeafletMap"></div><div id="supGpsRouteLegend" class="supGpsRouteLegend"></div></div><div class="supGpsRouteFooter"><div class="supGpsRouteNote">Cada grupo se identifica por nombre y color. Las líneas unen únicamente hitos GPS registrados y representan un trayecto aproximado, no seguimiento continuo.</div></div>';
      await renderInteractive(groups);
    }catch(e){
      body.innerHTML='<div class="supGpsRouteEmpty">⚠ '+esc(e.message)+'</div>';
    }
  }

  function bind(){
    const card=document.getElementById('supGpsCard');
    if(!card||card.dataset.routeGpsBound==='1')return;
    card.dataset.routeGpsBound='1';
    card.addEventListener('click',e=>{
      e.preventDefault();
      e.stopImmediatePropagation();
      show();
    },true);
  }

  addStyle();
  const mo=new MutationObserver(bind);
  mo.observe(document.body,{childList:true,subtree:true});
  bind();
})();
