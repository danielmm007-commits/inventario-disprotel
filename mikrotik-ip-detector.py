#!/usr/bin/env python3
import os, json, time, urllib.request
from datetime import datetime
from zoneinfo import ZoneInfo
import routeros_api

SUPABASE_URL=os.environ.get('SUPABASE_URL','https://ajnbswrwnjpjypjiorye.supabase.co').rstrip('/')
DETECTOR_TOKEN=os.environ.get('DETECTOR_TOKEN','')
POLL_SECONDS=max(5,int(os.environ.get('POLL_SECONDS','15')))
TZ=ZoneInfo(os.environ.get('MIKROTIK_TIMEZONE','America/Guayaquil'))

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


def mikrotik_permitidos(router):
    pool=routeros_api.RouterOsApiPool(str(router['host']),username=str(router['user']),password=str(router['password']),port=int(router.get('port',8728)),plaintext_login=True,use_ssl=False)
    try:
        resource=pool.get_api().get_resource('/ip/firewall/address-list')
        rows=resource.get(list='PERMITIDOS')
        out=[]
        for x in rows:
            if str(x.get('list','')).upper()!='PERMITIDOS': continue
            if str(x.get('disabled','false')).lower()=='true': continue
            addr=x.get('address')
            if not addr: continue
            out.append({'list':'PERMITIDOS','address':addr,'comment':x.get('comment',''),'creation_time':parse_router_time(x.get('creation-time'))})
        return out
    finally:
        pool.disconnect()


def main():
    by_id={str(r['router_id']):r for r in ROUTERS if r.get('router_id') and r.get('password')}
    print(f'DISPROTEL detector IP iniciado · cada {POLL_SECONDS}s · RB configurados: {len(by_id)}')
    while True:
        try:
            d=detector_api('detector-pending') or {}
            pendientes=d.get('solicitudes',[])
            agrupadas={}
            for s in pendientes:
                rid=s.get('router_id')
                if rid: agrupadas.setdefault(str(rid),[]).append(s)
            if not pendientes: print(datetime.now().strftime('%H:%M:%S'),'Sin solicitudes esperando IP.')
            for rid,sols in agrupadas.items():
                router=by_id.get(rid)
                if not router:
                    print('Solicitud pendiente para RB no configurado:',rid)
                    continue
                try:
                    rows=mikrotik_permitidos(router)
                    print(datetime.now().strftime('%H:%M:%S'),router.get('name',rid),':',len(rows),'PERMITIDOS')
                    for s in sols:
                        result=detector_api('detector-snapshot',{'solicitud_ip_id':s['solicitud_ip_id'],'router_id':rid,'registros':rows})
                        print(' ',s['id_orden'],s['cliente_nombre'],'=>',result)
                except Exception as e:
                    print('Error leyendo',router.get('name',rid),':',e)
        except Exception as e:
            print('Error ciclo detector:',e)
        time.sleep(POLL_SECONDS)

if __name__=='__main__':
    main()
