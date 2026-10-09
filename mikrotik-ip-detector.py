#!/usr/bin/env python3
import os, json, time, urllib.request, threading
from datetime import datetime
from zoneinfo import ZoneInfo
import routeros_api

SUPABASE_URL=os.environ.get('SUPABASE_URL','https://ajnbswrwnjpjypjiorye.supabase.co').rstrip('/')
DETECTOR_TOKEN=os.environ.get('DETECTOR_TOKEN','')
POLL_SECONDS=max(5,int(os.environ.get('POLL_SECONDS','15')))
TZ=ZoneInfo(os.environ.get('MIKROTIK_TIMEZONE','America/Guayaquil'))
SMARTOLT_AUTO_SYNC=os.environ.get('SMARTOLT_AUTO_SYNC','0').strip()=='1'
SMARTOLT_SYNC_SECONDS=max(600,int(os.environ.get('SMARTOLT_SYNC_SECONDS','600')))
GLOBAL_SNAPSHOT_SECONDS=max(30,int(os.environ.get('GLOBAL_SNAPSHOT_SECONDS','60')))
_last_smartolt_sync=0
_smartolt_sync_running=False
_last_global_snapshot={}

# Puede trabajar con uno o varios RB.
raw=os.environ.get('MIKROTIK_ROUTERS_JSON','').strip()
if raw:
    ROUTERS=json.loads(raw)
else:
    ROUTERS=[{
        'router_id':os.environ.get('RB_ROUTER_ID',''),
        'name':os.environ.get('RB_NAME','ROUTER SALCEDO'),
        'host':os.environ.get('RB_HOST','10.10.30.1'),
        'port':int(os.environ.get('RB_PORT','19573')),
        'user':os.environ.get('RB_USER','ipdetector'),
        'password':os.environ.get('RB_PASSWORD','')
    }]

if not DETECTOR_TOKEN:
    raise SystemExit('Falta DETECTOR_TOKEN en variables de entorno.')
if not ROUTERS or not any(r.get('router_id') and r.get('password') for r in ROUTERS):
    raise SystemExit('Falta configurar RB_ROUTER_ID/RB_PASSWORD o MIKROTIK_ROUTERS_JSON.')


def req_json(url,headers=None,data=None,timeout=20):
    body=json.dumps(data or {}).encode()
    h={'Accept':'application/json','Content-Type':'application/json'}
    if headers: h.update(headers)
    r=urllib.request.Request(url,data=body,headers=h,method='POST')
    with urllib.request.urlopen(r,timeout=timeout) as resp:
        raw=resp.read().decode('utf-8')
        return json.loads(raw) if raw else None


def detector_api(action,payload=None):
    h={'Authorization':'Bearer '+DETECTOR_TOKEN}
    return req_json(f'{SUPABASE_URL}/functions/v1/inventario-ip-detector',headers=h,data={'action':action,**(payload or {})})


def reportar_latido(router_id,total):
    try:
        return detector_api('detector-heartbeat',{'router_id':router_id,'total_permitidos':total})
    except Exception as e:
        print('No se pudo reportar latido scanner:',e)
        return None

def _smartolt_sync_worker():
    global _smartolt_sync_running
    try:
        h={'Authorization':'Bearer '+DETECTOR_TOKEN}
        result=req_json(f'{SUPABASE_URL}/functions/v1/smartolt-sync',headers=h,data={},timeout=120) or {}
        if result.get('ok'):
            print(datetime.now().strftime('%H:%M:%S'),'SMARTOLT SYNC ->',result.get('onus',0),'ONUs |',result.get('cambios_sn',0),'cambios SN |',result.get('conflictos',0),'conflictos')
        else:
            print(datetime.now().strftime('%H:%M:%S'),'SMARTOLT SYNC ERROR ->',result)
    except Exception as e:
        print(datetime.now().strftime('%H:%M:%S'),'SMARTOLT SYNC ERROR ->',e)
    finally:
        _smartolt_sync_running=False

def lanzar_smartolt_sync_si_corresponde():
    global _last_smartolt_sync,_smartolt_sync_running
    if not SMARTOLT_AUTO_SYNC:
        return
    now=time.time()
    if _smartolt_sync_running or now-_last_smartolt_sync<SMARTOLT_SYNC_SECONDS:
        return
    _last_smartolt_sync=now
    _smartolt_sync_running=True
    threading.Thread(target=_smartolt_sync_worker,daemon=True).start()


def parse_router_time(value):
    if not value: return None
    v=str(value).strip()
    for fmt in ('%Y-%m-%d %H:%M:%S','%Y-%m-%dT%H:%M:%S'):
        try: return datetime.strptime(v,fmt).replace(tzinfo=TZ).isoformat()
        except ValueError: pass
    try:
        d=datetime.fromisoformat(v.replace('Z','+00:00'))
        if d.tzinfo is None: d=d.replace(tzinfo=TZ)
        return d.isoformat()
    except Exception: return None


def _es_lista_cliente(nombre):
    n=' '.join(str(nombre or '').upper().replace('_',' ').split())
    return n.startswith('PERMITIDOS') or n.startswith('MOROSOS')


def mikrotik_clientes_snapshot(router):
    """Lectura completa de clientes para conciliación: PERMITIDOS* + MOROSOS*."""
    pool=routeros_api.RouterOsApiPool(str(router['host']),username=str(router['user']),password=str(router['password']),port=int(router.get('port',8728)),plaintext_login=True,use_ssl=False)
    try:
        resource=pool.get_api().get_resource('/ip/firewall/address-list')
        rows=resource.get()
        out=[]
        for x in rows:
            lista=str(x.get('list','')).strip()
            if not _es_lista_cliente(lista): continue
            if str(x.get('disabled','false')).lower()=='true': continue
            addr=x.get('address')
            if not addr: continue
            out.append({'list':lista,'address':addr,'comment':x.get('comment',''),'creation_time':parse_router_time(x.get('creation-time'))})
        return out
    finally:
        pool.disconnect()


def mikrotik_permitidos(router):
    """Compatibilidad con el flujo histórico de asignación de IP."""
    return [x for x in mikrotik_clientes_snapshot(router) if str(x.get('list','')).upper()=='PERMITIDOS']


def actualizar_snapshot_global_si_corresponde(router):
    rid=str(router.get('router_id') or '')
    if not rid:
        return
    now=time.time()
    last=float(_last_global_snapshot.get(rid,0) or 0)
    if now-last<GLOBAL_SNAPSHOT_SECONDS:
        return
    rows=mikrotik_clientes_snapshot(router)
    result=detector_api('detector-global-snapshot',{'router_id':rid,'registros':rows})
    _last_global_snapshot[rid]=now
    print(datetime.now().strftime('%H:%M:%S'),'SNAPSHOT CLIENTES ->',router.get('name',rid),':',len(rows),'registros PERMITIDOS*/MOROSOS*',result or '')


def _ip_base(value):
    return str(value or '').strip().split('/')[0]

def _target_has_ip(value, target):
    raw=str(value or '').replace(';',',')
    parts=[]
    for chunk in raw.split(','):
        parts.extend(chunk.strip().split())
    return any(_ip_base(x)==target for x in parts if x)

def mikrotik_live_ip(router, ip):
    target=str(ip or '').strip()
    if not target:
        raise RuntimeError('IP vacía para consulta en vivo.')
    pool=routeros_api.RouterOsApiPool(str(router['host']),username=str(router['user']),password=str(router['password']),port=int(router.get('port',8728)),plaintext_login=True,use_ssl=False)
    try:
        api=pool.get_api()
        address_rows=api.get_resource('/ip/firewall/address-list').get()
        matches=[]
        for x in address_rows:
            if _ip_base(x.get('address'))!=target:
                continue
            matches.append({
                'list':x.get('list'),
                'address':x.get('address'),
                'comment':x.get('comment',''),
                'disabled':str(x.get('disabled','false')).lower()=='true',
                'dynamic':str(x.get('dynamic','false')).lower()=='true',
                'creation_time':parse_router_time(x.get('creation-time'))
            })
        queues=[]
        try:
            for q in api.get_resource('/queue/simple').get():
                qtarget=str(q.get('target',''))
                if _target_has_ip(qtarget,target):
                    queues.append({
                        'name':q.get('name'),
                        'target':qtarget,
                        'parent':q.get('parent'),
                        'max_limit':q.get('max-limit'),
                        'disabled':str(q.get('disabled','false')).lower()=='true',
                        'comment':q.get('comment','')
                    })
        except Exception as exc:
            queues=[{'error':'No se pudo leer Simple Queues: '+str(exc)}]
        return {
            'router_id':str(router.get('router_id') or ''),
            'router_nombre':str(router.get('name') or ''),
            'ip':target,
            'address_lists':matches,
            'queues':queues,
            'encontrada':bool(matches or queues),
            'read_at':datetime.now(TZ).isoformat()
        }
    finally:
        pool.disconnect()

def atender_consultas_en_vivo(router):
    rid=str(router.get('router_id') or '')
    pending=detector_api('detector-live-pending',{'router_id':rid}) or {}
    rows=pending.get('solicitudes') or []
    for row in rows:
        req_id=str(row.get('id') or '')
        ip=str(row.get('ip_cliente') or '').strip()
        if not req_id or not ip:
            continue
        try:
            result=mikrotik_live_ip(router,ip)
            detector_api('detector-live-result',{'id':req_id,'ok':True,'resultado':result})
            listas=', '.join([str(x.get('list') or '') for x in result.get('address_lists',[]) if x.get('list')]) or 'SIN LISTA'
            limites=', '.join([str(x.get('max_limit') or '') for x in result.get('queues',[]) if x.get('max_limit')]) or 'SIN MAX-LIMIT'
            print(' ',router.get('name',rid),'LIVE',ip,'=> LISTA:',listas,'| MAX-LIMIT:',limites,'| QUEUES:',len(result.get('queues',[])))
        except Exception as exc:
            detector_api('detector-live-result',{'id':req_id,'ok':False,'error':str(exc)})
            print(' Error LIVE',router.get('name',rid),ip,':',exc)


def main():
    by_id={str(r['router_id']):r for r in ROUTERS if r.get('router_id') and r.get('password')}
    print(f'DISPROTEL detector IP iniciado · cada {POLL_SECONDS}s · RB configurados: {len(by_id)} · snapshot clientes cada {GLOBAL_SNAPSHOT_SECONDS}s · SmartOLT auto-sync: {"ACTIVO" if SMARTOLT_AUTO_SYNC else "DESACTIVADO"}')
    while True:
        try:
            lanzar_smartolt_sync_si_corresponde()
            d=detector_api('detector-pending') or {}
            pendientes=d.get('solicitudes',[])
            agrupadas={}
            for s in pendientes:
                rid=s.get('router_id')
                if rid: agrupadas.setdefault(str(rid),[]).append(s)
            if not pendientes: print(datetime.now().strftime('%H:%M:%S'),'Sin solicitudes de IP. Esperando consultas LIVE.')
            for rid,router in by_id.items():
                sols=agrupadas.get(rid,[])
                try:
                    actualizar_snapshot_global_si_corresponde(router)
                except Exception as e:
                    print('Error snapshot global',router.get('name',rid),':',e)
                try:
                    atender_consultas_en_vivo(router)
                except Exception as e:
                    print('Error consulta LIVE',router.get('name',rid),':',e)
                if not sols:
                    continue
                try:
                    rows=mikrotik_permitidos(router)
                    print(datetime.now().strftime('%H:%M:%S'),'SOLICITUD IP ->',router.get('name',rid),': leyendo',len(rows),'PERMITIDOS')
                    reportar_latido(rid,len(rows))
                    for s in sols:
                        result=detector_api('detector-snapshot',{'solicitud_ip_id':s['solicitud_ip_id'],'router_id':rid,'registros':rows})
                        print(' ',s['id_orden'],s['cliente_nombre'],'=>',result)
                except Exception as e:
                    print('Error leyendo',router.get('name',rid),':',e)
            for rid in sorted(set(agrupadas)-set(by_id)):
                print('Solicitud pendiente para RB no configurado:',rid)
        except Exception as e:
            print('Error ciclo detector:',e)
        time.sleep(POLL_SECONDS)

if __name__=='__main__':
    main()
