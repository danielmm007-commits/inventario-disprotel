import { createClient } from 'npm:@supabase/supabase-js@2.95.0';

const origin='https://danielmm007-commits.github.io';
const headers={
  'Access-Control-Allow-Origin':origin,
  'Access-Control-Allow-Headers':'content-type,x-user,x-pin,x-session',
  'Access-Control-Allow-Methods':'POST,OPTIONS',
  'Content-Type':'application/json; charset=utf-8'
};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});

async function sha256(text:string){
  const b=new TextEncoder().encode(text);
  const h=await crypto.subtle.digest('SHA-256',b);
  return Array.from(new Uint8Array(h)).map(x=>x.toString(16).padStart(2,'0')).join('');
}
function db(){
  const raw=Deno.env.get('SUPABASE_SECRET_KEYS');
  const key=raw?JSON.parse(raw).default:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!key)throw new Error('Clave servidor no disponible');
  return createClient(Deno.env.get('SUPABASE_URL')!,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
async function auth(s:any,req:Request,body:any){
  const sessionToken=String(req.headers.get('x-session')||body.session_token||'').trim();
  if(sessionToken){
    const {data:ses,error}=await s.from('app_auth_sessions').select('id,responsable_id,expires_at,revoked_at').eq('token_hash',await sha256(sessionToken)).is('revoked_at',null).gt('expires_at',new Date().toISOString()).maybeSingle();
    if(!error&&ses){
      const {data:person,error:pErr}=await s.from('responsables').select('id,usuario,nombre,rol,activo,es_admin_principal').eq('id',ses.responsable_id).eq('activo',true).maybeSingle();
      if(!pErr&&person){await s.from('app_auth_sessions').update({last_used_at:new Date().toISOString()}).eq('id',ses.id);return person}
    }
  }
  const usuario=String(req.headers.get('x-user')||body.usuario||'').trim().toLowerCase();
  const pin=String(req.headers.get('x-pin')||body.pin||'').trim();
  if(usuario&&pin){
    const {data,error}=await s.from('responsables').select('id,usuario,nombre,rol,activo,es_admin_principal,pin_hash_prueba').ilike('usuario',usuario).maybeSingle();
    if(error)throw error;
    if(data&&data.activo&&data.pin_hash_prueba&&await sha256(pin)===data.pin_hash_prueba)return data;
  }
  throw new Error('Sesión no válida');
}
function norm(v:any){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase()}
function parseHuaweiDescription(v:any){
  const raw=String(v||'').trim();
  const out:any={nombre:null,zona:null,nap:null,ip:null,fecha:null};
  if(!raw)return out;
  const zoneSplit=raw.split(/_zone_/i);
  const nameRaw=zoneSplit[0]||'';
  out.nombre=nameRaw.replace(/_/g,' ').replace(/\s+/g,' ').trim()||null;
  const rest=zoneSplit.length>1?zoneSplit.slice(1).join('_zone_'):'';
  const descrSplit=rest.split(/_descr_/i);
  const zoneRaw=descrSplit[0]||'';
  out.zona=zoneRaw.replace(/_/g,' ').replace(/\s+/g,' ').trim()||null;
  if(out.zona){
    const m=String(out.zona).match(/\bNAP\b.*$/i);
    out.nap=m?m[0].trim():out.zona;
  }
  const ipm=raw.match(/(?<!\d)(?:\d{1,3}\.){3}\d{1,3}(?!\d)/);
  if(ipm)out.ip=ipm[0];
  const dm=raw.match(/_authd_(\d{4})(\d{2})(\d{2})/i);
  if(dm)out.fecha=`${dm[1]}-${dm[2]}-${dm[3]}`;
  return out;
}

function signalClass(v:any){
  const n=Number(v);
  if(!Number.isFinite(n))return 'SIN_DATO';
  if(n<=-27)return 'CRITICA';
  if(n<=-25)return 'ADVERTENCIA';
  return 'NORMAL';
}
function online(v:any){return /^(ONLINE|UP)$/i.test(String(v||'').trim())}
async function fetchAllHuaweiOnus(s:any){
  const pageSize=1000;
  const all:any[]=[];
  let from=0;
  while(true){
    const {data,error}=await s.from('huawei_onus_cache')
      .select('*')
      .eq('presente',true)
      .order('olt_codigo')
      .order('fsp')
      .order('ont_id')
      .range(from,from+pageSize-1);
    if(error)throw error;
    const rows=data||[];
    all.push(...rows);
    if(rows.length<pageSize)break;
    from+=pageSize;
    if(from>50000)throw new Error('Inventario Huawei excede el límite de seguridad');
  }
  return all;
}


async function metadataDisprotel(db:any,codigos:string[]){
 const codes=[...new Set(codigos.filter(Boolean))];const res=new Map<string,any>();
 if(!codes.length)return res;
 for(let inicio=0;inicio<=50000;inicio+=1000){
  const {data,error}=await db.from('onu_autorizaciones_manuales')
    .select('olt_codigo,onu_sn,nombre,nap,zona,ip_administrativa,aprobado_at,estado,updated_at')
    .in('olt_codigo',codes).neq('estado','CANCELADA')
    .order('updated_at',{ascending:false}).range(inicio,inicio+999);
  if(error)throw error;
  const rows=data||[];
  for(const r of rows){const k=norm(r.olt_codigo)+'|'+norm(r.onu_sn);if(!res.has(k))res.set(k,r);}
  if(rows.length<1000)return res;
 }
 throw new Error('Límite de autorizaciones administrativas excedido');
}
function metadataOnu(r:any,a:any){
 const h=parseHuaweiDescription(r.descripcion);
 const ipH=r.ip_descripcion||h.ip||null, ipOwn=a?.ip_administrativa?String(a.ip_administrativa):null;
 return {
  nombre:r.nombre_cliente_huawei||h.nombre||a?.nombre||('ONU '+r.ont_id),
  zona:r.zona_huawei||h.zona||a?.zona||'',
  nap:r.nap_huawei||h.nap||a?.nap||null,
  ip_detectada:ipH||ipOwn,ip_administrativa:ipOwn,
  ip_origen:ipH?'HUAWEI':ipOwn?'DISPROTEL':'SIN_DATO',
  fecha_autorizacion:r.auth_huawei||h.fecha||null,
  fecha_aprobacion_disprotel:a?.aprobado_at||null,
  estado_aprobacion_disprotel:a?.estado||null
 };
}

Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers});
  if(req.method!=='POST')return reply({error:'Método no permitido'},405);
  try{
    const body=await req.json().catch(()=>({}));
    const s=db(),me=await auth(s,req,body);
    const role=norm(me.rol);
    if(!(me.es_admin_principal||role.includes('ADMINISTRADOR')||role.includes('SUPERVISOR')||role==='TECNICO'))return reply({error:'Perfil sin acceso al monitoreo OLT'},403);

    const {data:scope}=await s.from('responsable_alcances_operativos').select('olts_permitidas,alcance_global,activo').eq('responsable_id',me.id).eq('activo',true).maybeSingle();
    const allowedOlts=scope&&scope.alcance_global!==true&&Array.isArray(scope.olts_permitidas)&&scope.olts_permitidas.length
      ? scope.olts_permitidas.map((x:any)=>String(x).trim()).filter(Boolean) : null;
    const action=String(body.action||'summary');

    const applyScope=(q:any)=>allowedOlts?q.in('olt',allowedOlts):q;

    if(action==='full-sync'){
      return reply({error:'Sincronización externa deshabilitada. El monitor usa exclusivamente caché Huawei.'},409);
    }

    if(action==='summary'){
      const h=await fetchAllHuaweiOnus(s);
      let rows=h.filter((r:any)=>!allowedOlts||allowedOlts.some((x:any)=>norm(x)===norm(r.olt_codigo)||norm(x)===norm(r.olt_nombre)));
      // Los indicadores superiores respetan los filtros estructurales de OLT/PON.
      // Sin OLT seleccionada, representan todas las OLT permitidas.
      const summaryOlt=norm(body.olt);
      if(summaryOlt)rows=rows.filter((r:any)=>norm(r.olt_codigo)===summaryOlt||norm(r.olt_nombre)===summaryOlt);
      const summaryCard=String(body.tarjeta||'').trim();
      if(summaryCard)rows=rows.filter((r:any)=>String(r.fsp||'').split('/')[1]===summaryCard);
      const summaryPort=String(body.puerto||'').trim();
      if(summaryPort)rows=rows.filter((r:any)=>String(r.fsp||'').split('/')[2]===summaryPort);

      let total=0,on=0,off=0,warn=0,critical=0,noSignal=0,los=0,powerFail=0,configFail=0;
      let latest:string|null=null;
      const byOlt=new Map<string,any>();
      for(const r of rows){
        total++; const isOn=online(r.run_state); if(isOn)on++;else off++;
        const sc=signalClass(r.rx_optical_dbm);
        if(isOn){if(sc==='CRITICA')critical++;else if(sc==='ADVERTENCIA')warn++;else if(sc==='SIN_DATO')noSignal++}
        if(r.alarma_los===true)los++;
        if(r.alarma_dying_gasp===true)powerFail++;
        if(r.alarma_config_recovery===true)configFail++;
        const read=String(r.optica_leida_at||r.ultima_lectura_at||'');
        if(read&&(!latest||read>latest))latest=read;
        const key=String(r.olt_nombre||r.olt_codigo||'SIN OLT');
        const x=byOlt.get(key)||{olt:key,codigo:r.olt_codigo,total:0,online:0,offline:0,warning:0,critical:0,no_signal:0,los:0,power_fail:0,config_fail:0,last_read:null};
        x.total++; if(isOn)x.online++;else x.offline++;
        if(isOn){if(sc==='CRITICA')x.critical++;else if(sc==='ADVERTENCIA')x.warning++;else if(sc==='SIN_DATO')x.no_signal++}
        if(r.alarma_los===true)x.los++;
        if(r.alarma_dying_gasp===true)x.power_fail++;
        if(r.alarma_config_recovery===true)x.config_fail++;
        if(read&&(!x.last_read||read>x.last_read))x.last_read=read;
        byOlt.set(key,x);
      }
      let pendingQ=s.from('olt_onu_autofind_cache').select('olt_codigo,olt_nombre,onu_sn,pon,modelo,ultima_lectura_at,presente').eq('presente',true);
      const {data:pendingRaw,error:pErr}=await pendingQ;if(pErr)throw pErr;
      let pending=(pendingRaw||[]).filter((r:any)=>!allowedOlts||allowedOlts.some((x:any)=>norm(x)===norm(r.olt_codigo)||norm(x)===norm(r.olt_nombre)));
      if(summaryOlt)pending=pending.filter((r:any)=>norm(r.olt_codigo)===summaryOlt||norm(r.olt_nombre)===summaryOlt);
      if(summaryCard)pending=pending.filter((r:any)=>String(r.pon||'').split('/')[1]===summaryCard);
      if(summaryPort)pending=pending.filter((r:any)=>String(r.pon||'').split('/')[2]===summaryPort);
      const {data:configs,error:cErr}=await s.from('olt_configuraciones').select('codigo,nombre,modelo,estado,ultima_lectura_at,ultimo_ok_at,ultimo_error,activo').eq('activo',true).order('orden');
      if(cErr)throw cErr;
      return reply({
        ok:true,read_only:true,source:'HUAWEI_DIRECT_CACHE',generated_at:new Date().toISOString(),
        summary:{total,online:on,offline:off,warning:warn,critical,no_signal:noSignal,los,power_fail:powerFail,config_fail:configFail,pending_autofind:pending.length,olts:byOlt.size,last_cache_update:latest},
        olts:[...byOlt.values()].sort((a,b)=>a.olt.localeCompare(b.olt)),
        pending,
        configs:configs||[],
        sync:{ultimo_exito_at:latest,ultimo_error:null,ultimo_modo:'HUAWEI'}
      });
    }

    if(action==='filter-options'){
      const {data:configs,error:cErr}=await s.from('olt_configuraciones')
        .select('codigo,nombre,modelo,marca,activo')
        .eq('activo',true)
        .order('orden')
        .order('codigo');
      if(cErr)throw cErr;
      const cfgRows=(configs||[]).filter((r:any)=>!allowedOlts||allowedOlts.some((x:any)=>norm(x)===norm(r.codigo)||norm(x)===norm(r.nombre)));

      const olt=norm(body.olt);
      const selectedCodes=olt
        ? cfgRows.filter((r:any)=>norm(r.codigo)===olt||norm(r.nombre)===olt).map((r:any)=>r.codigo)
        : cfgRows.map((r:any)=>r.codigo);

      let bq=s.from('huawei_olt_boards_cache')
        .select('olt_codigo,frame_id,slot_id,board_name,board_status,board_role,tecnologia,presente')
        .eq('presente',true);
      if(selectedCodes.length)bq=bq.in('olt_codigo',selectedCodes);
      const {data:boards,error:bErr}=await bq;if(bErr)throw bErr;

      let pq=s.from('huawei_olt_pon_ports_cache')
        .select('olt_codigo,frame_id,slot_id,port_id,board_name,tecnologia,optical_module_status,port_state,laser_state,temperatura_c,tx_power_dbm,wavelength_nm,presente')
        .eq('presente',true);
      if(selectedCodes.length)pq=pq.in('olt_codigo',selectedCodes);
      const {data:ports,error:pErr}=await pq;if(pErr)throw pErr;

      const tarjeta=String(body.tarjeta||'').trim();
      let filteredPorts=ports||[];
      if(tarjeta)filteredPorts=filteredPorts.filter((r:any)=>String(r.slot_id)===tarjeta);

      const nat=(a:string,b:string)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'});
      const boardMap=new Map<string,any>();
      for(const b of boards||[]){
        const role=norm(b.board_role);
        const tech=norm(b.tecnologia);
        // El filtro operativo sólo debe ofrecer tarjetas PON.
        // Las tarjetas de control/uplink/energía quedan disponibles como
        // información de hardware de la OLT, pero no como filtro de ONUs.
        if(role!=='PON' && !tech.includes('PON'))continue;
        const key=String(b.slot_id);
        if(!boardMap.has(key))boardMap.set(key,b);
      }
      const tarjetas=[...boardMap.values()]
        .sort((a,b)=>Number(a.slot_id)-Number(b.slot_id))
        .map((b:any)=>{
          const count=(ports||[]).filter((p:any)=>Number(p.slot_id)===Number(b.slot_id)).length;
          const details=[b.board_name,b.tecnologia,b.board_status].filter(Boolean).join(' · ');
          return {value:String(b.slot_id),label:'Tarjeta PON '+b.slot_id+(details?' · '+details:''),puertos_detectados:count,board_name:b.board_name,tecnologia:b.tecnologia,status:b.board_status};
        });

      const puertos=(filteredPorts||[])
        .sort((a:any,b:any)=>Number(a.port_id)-Number(b.port_id))
        .map((p:any)=>({
          value:String(p.port_id),
          label:'PON '+p.port_id+(p.tx_power_dbm==null?'':' · TX '+Number(p.tx_power_dbm).toFixed(2)+' dBm')+(p.optical_module_status?' · '+p.optical_module_status:''),
          slot_id:p.slot_id,
          board_name:p.board_name,
          tecnologia:p.tecnologia,
          tx_power_dbm:p.tx_power_dbm,
          optical_module_status:p.optical_module_status,
          port_state:p.port_state,
          laser_state:p.laser_state,
          temperatura_c:p.temperatura_c,
          wavelength_nm:p.wavelength_nm
        }));
      const olts=cfgRows.map((x:any)=>({codigo:x.codigo,nombre:x.nombre,modelo:x.modelo,marca:x.marca}));
      return reply({ok:true,read_only:true,source:'HUAWEI_DIRECT_CACHE',olts,tarjetas,puertos});
    }

    if(action==='list'){
      const limit=Math.min(100,Math.max(10,Number(body.limit)||50));
      const offset=Math.max(0,Number(body.offset)||0);
      const h=await fetchAllHuaweiOnus(s);
      let rows=h.filter((r:any)=>!allowedOlts||allowedOlts.some((x:any)=>norm(x)===norm(r.olt_codigo)||norm(x)===norm(r.olt_nombre)));

      const metas=await metadataDisprotel(s,rows.map((r:any)=>String(r.olt_codigo||'')));
      rows=rows.map((r:any)=>{
        const m=metadataOnu(r,metas.get(norm(r.olt_codigo)+'|'+norm(r.onu_sn))||null);
        const parts=String(r.fsp||'').split('/');
        const sc=signalClass(r.rx_optical_dbm);
        let causa='SIN_ALARMA';
        if(r.alarma_los===true)causa='LOS';
        else if(r.alarma_dying_gasp===true)causa='POWER_FAIL';
        else if(r.alarma_config_recovery===true)causa='CONFIG';
        return {
          onu_external_id:'HUAWEI:'+r.id,
          huawei_id:r.id,
          sn:r.onu_sn,
          nombre:m.nombre,
          direccion_comentario:r.descripcion||'',
          olt:r.olt_nombre||r.olt_codigo,
          olt_codigo:r.olt_codigo,
          tarjeta:parts[1]||'',
          puerto:parts[2]||'',
          onu_asignada:r.ont_id,
          gpon:r.fsp,
          zona:m.zona,
          nap:m.nap,
          ip_detectada:m.ip_detectada,ip_administrativa:m.ip_administrativa,ip_origen:m.ip_origen,
          estado:r.run_state,
          senal_onu_dbm:r.rx_optical_dbm,
          senal_olt_dbm:r.olt_rx_ont_dbm,
          tx_onu_dbm:r.tx_optical_dbm,
          distancia_m:r.distancia_m,
          temperatura_c:r.temperatura_c,
          voltaje_v:r.voltaje_v,
          corriente_ma:r.corriente_ma,
          alarmas:r.alarmas||[],
          alarma_los:r.alarma_los===true,
          alarma_dying_gasp:r.alarma_dying_gasp===true,
          alarma_config_recovery:r.alarma_config_recovery===true,
          causa,
          config_state:r.config_state,
          match_state:r.match_state,
          onu_type:null,
          fecha_autorizacion:m.fecha_autorizacion,fecha_aprobacion_disprotel:m.fecha_aprobacion_disprotel,estado_aprobacion_disprotel:m.estado_aprobacion_disprotel,
          contacto:null,
          updated_at:r.updated_at,
          ultima_lectura_at:r.ultima_lectura_at,
          optica_leida_at:r.optica_leida_at,
          signal_class:sc
        };
      });

      const olt=norm(body.olt);if(olt)rows=rows.filter((r:any)=>norm(r.olt)===olt||norm(r.olt_codigo)===olt);
      const tarjeta=String(body.tarjeta||'').trim();if(tarjeta)rows=rows.filter((r:any)=>String(r.tarjeta)===tarjeta);
      const puerto=String(body.puerto||'').trim();if(puerto)rows=rows.filter((r:any)=>String(r.puerto)===puerto);
      const estado=norm(body.estado);
      if(estado==='ONLINE'||estado==='OFFLINE')rows=rows.filter((r:any)=>norm(r.estado)===estado);
      else if(estado==='LOS')rows=rows.filter((r:any)=>r.alarma_los===true);
      else if(estado==='POWER FAIL'||estado==='POWER_FAIL')rows=rows.filter((r:any)=>r.alarma_dying_gasp===true);
      const signal=norm(body.signal);
      if(signal==='ADVERTENCIA')rows=rows.filter((r:any)=>r.signal_class==='ADVERTENCIA');
      else if(signal==='CRITICA')rows=rows.filter((r:any)=>r.signal_class==='CRITICA');
      else if(signal==='LOW')rows=rows.filter((r:any)=>r.signal_class==='ADVERTENCIA'||r.signal_class==='CRITICA');
      else if(signal==='NORMAL')rows=rows.filter((r:any)=>r.signal_class==='NORMAL');
      const search=norm(body.q);
      if(search)rows=rows.filter((r:any)=>[r.nombre,r.sn,r.direccion_comentario,r.ip_detectada,r.gpon].some(v=>norm(v).includes(search)));
      const sortBy=String(body.sort_by||'').trim().toLowerCase();
      const sortDir=String(body.sort_dir||'asc').trim().toLowerCase()==='desc'?-1:1;
      if(sortBy){
        const value=(r:any)=>{
          if(sortBy==='estado')return norm(r.estado);
          if(sortBy==='nombre')return norm(r.nombre);
          if(sortBy==='sn')return norm(r.sn);
          if(sortBy==='olt')return norm(r.olt)+'|'+String(r.tarjeta||'').padStart(4,'0')+'|'+String(r.puerto||'').padStart(4,'0')+'|'+String(r.onu_asignada||'').padStart(4,'0');
          if(sortBy==='zona')return norm(r.nap||r.zona);
          if(sortBy==='ip'){
            const p=String(r.ip_detectada||'').split('.').map((x:string)=>Number(x));
            return p.length===4&&p.every((x:number)=>Number.isFinite(x))?p.reduce((a:number,x:number)=>a*256+x,0):Number.MAX_SAFE_INTEGER;
          }
          if(sortBy==='senal')return r.senal_onu_dbm==null?Number.POSITIVE_INFINITY:Number(r.senal_onu_dbm);
          if(sortBy==='autorizacion'){
            const t=r.fecha_autorizacion?new Date(r.fecha_autorizacion).getTime():NaN;
            return Number.isFinite(t)?t:Number.MAX_SAFE_INTEGER;
          }
          return '';
        };
        rows.sort((a:any,b:any)=>{
          const av=value(a),bv=value(b);
          if(typeof av==='number'&&typeof bv==='number')return (av-bv)*sortDir;
          return String(av).localeCompare(String(bv),'es',{numeric:true,sensitivity:'base'})*sortDir;
        });
      }

      const total=rows.length;
      rows=rows.slice(offset,offset+limit);
      return reply({ok:true,read_only:true,source:'HUAWEI_DIRECT_CACHE',total,offset,limit,rows});
    }

    if(action==='detail'){
      const raw=String(body.onu_external_id||'').trim();
      const id=raw.startsWith('HUAWEI:')?raw.slice(7):String(body.huawei_id||'').trim();
      const sn=String(body.sn||'').trim().toUpperCase();
      if(!id&&!sn)return reply({error:'ONU requerida'},400);
      let q=s.from('huawei_onus_cache').select('*');
      q=id?q.eq('id',id):q.eq('onu_sn',sn);
      const {data:r,error}=await q.maybeSingle();if(error)throw error;if(!r)return reply({error:'ONU no encontrada'},404);
      if(allowedOlts&&!allowedOlts.some((x:any)=>norm(x)===norm(r.olt_codigo)||norm(x)===norm(r.olt_nombre)))return reply({error:'ONU fuera de tu alcance'},403);
      const metas=await metadataDisprotel(s,[String(r.olt_codigo||'')]);
      const m=metadataOnu(r,metas.get(norm(r.olt_codigo)+'|'+norm(r.onu_sn))||null);

      let vinculo:any=null,servicio:any=null;
      const {data:hv,error:hvErr}=await s.from('huawei_onu_vinculos')
        .select('id,servicio_id,metodo,confianza,ip_coincidente,orden_id,activo,verificado_at,created_at,updated_at')
        .eq('huawei_onu_id',r.id).eq('activo',true).maybeSingle();
      if(hvErr)throw hvErr;
      vinculo=hv||null;

      // Conciliación automática sólo para legado: IP Huawei = IP de servicio,
      // y la misma IP debe existir actualmente en el snapshot MikroTik.
      if(!vinculo && r.ip_descripcion){
        const ipTxt=String(r.ip_descripcion);
        const {data:services,error:sErr}=await s.from('servicios_cliente')
          .select('id,cliente_id,codigo_servicio_legacy,plan_codigo,ip_cliente,direccion,tipo_conexion,estado,activo,cliente:clientes(nombre_completo,telefono)')
          .eq('ip_cliente',ipTxt).eq('activo',true).limit(2);
        if(sErr)throw sErr;
        const {data:rbRows,error:rbErr}=await s.from('router_ip_snapshot_actual')
          .select('router_id,address,lista,comentario,snapshot_at').eq('address',ipTxt).limit(3);
        if(rbErr)throw rbErr;
        if((services||[]).length===1 && (rbRows||[]).length>=1){
          const svc:any=services![0];
          const now=new Date().toISOString();
          const payload={huawei_onu_id:r.id,servicio_id:svc.id,metodo:'CONCILIADO_IP',confianza:100,ip_coincidente:ipTxt,activo:true,verificado_at:now,updated_at:now};
          const {data:newLink,error:lErr}=await s.from('huawei_onu_vinculos').upsert(payload,{onConflict:'huawei_onu_id'}).select('id,servicio_id,metodo,confianza,ip_coincidente,orden_id,activo,verificado_at,created_at,updated_at').maybeSingle();
          if(lErr)throw lErr;
          vinculo=newLink||payload;
          servicio={...svc,router_snapshot:(rbRows||[])[0]||null};
        }
      }

      if(vinculo && !servicio){
        const {data:svc,error:svcErr}=await s.from('servicios_cliente')
          .select('id,cliente_id,codigo_servicio_legacy,plan_codigo,ip_cliente,direccion,tipo_conexion,estado,activo,cliente:clientes(nombre_completo,telefono)')
          .eq('id',vinculo.servicio_id).maybeSingle();
        if(svcErr)throw svcErr;
        servicio=svc||null;
      }

      const parts=String(r.fsp||'').split('/');
      const onu:any={
        onu_external_id:'HUAWEI:'+r.id,huawei_id:r.id,sn:r.onu_sn,
        nombre:m.nombre,
        direccion_comentario:r.descripcion||'',
        olt:r.olt_nombre||r.olt_codigo,olt_codigo:r.olt_codigo,
        tarjeta:parts[1]||'',puerto:parts[2]||'',onu_asignada:r.ont_id,gpon:r.fsp,
        zona:m.zona,nap:m.nap,ip_detectada:m.ip_detectada,ip_administrativa:m.ip_administrativa,ip_origen:m.ip_origen,
        estado:r.run_state,senal_onu_dbm:r.rx_optical_dbm,senal_olt_dbm:r.olt_rx_ont_dbm,tx_onu_dbm:r.tx_optical_dbm,
        distancia_m:r.distancia_m,temperatura_c:r.temperatura_c,voltaje_v:r.voltaje_v,corriente_ma:r.corriente_ma,
        alarmas:r.alarmas||[],alarma_los:r.alarma_los===true,alarma_dying_gasp:r.alarma_dying_gasp===true,
        alarma_config_recovery:r.alarma_config_recovery===true,config_state:r.config_state,match_state:r.match_state,
        onu_type:null,fecha_autorizacion:m.fecha_autorizacion,fecha_aprobacion_disprotel:m.fecha_aprobacion_disprotel,estado_aprobacion_disprotel:m.estado_aprobacion_disprotel,contacto:null,
        last_down_cause:r.last_down_cause,last_up_time:r.last_up_time,last_down_time:r.last_down_time,last_dying_gasp_time:r.last_dying_gasp_time,
        ultima_lectura_at:r.ultima_lectura_at,optica_leida_at:r.optica_leida_at,updated_at:r.updated_at,
        signal_class:signalClass(r.rx_optical_dbm)
      };

      return reply({ok:true,read_only:true,source:'HUAWEI_DIRECT_CACHE',onu,vinculo,servicio});
    }

    return reply({error:'Acción no válida'},400);
  }catch(e){
    const m=String((e as any)?.message||e);
    return reply({error:m},m==='Sesión no válida'?401:500);
  }
});