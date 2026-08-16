#!/usr/bin/env python3
import os, json, time, urllib.request
from datetime import datetime
from zoneinfo import ZoneInfo
import routeros_api

SUPABASE_URL=os.environ.get('SUPABASE_URL','').rstrip('/')
SERVICE_KEY=os.environ.get('SUPABASE_SERVICE_ROLE_KEY','')
ROUTERS=json.loads(os.environ.get('MIKROTIK_ROUTERS_JSON','[]'))
POLL_SECONDS=max(3,int(os.environ.get('POLL_SECONDS','8')))
TZ=ZoneInfo(os.environ.get('MIKROTIK_TIMEZONE','America/Guayaquil'))

if not SUPABASE_URL or not SERVICE_KEY:
    raise SystemExit('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en variables de entorno.')
if not ROUTERS:
    raise SystemExit('MIKROTIK_ROUTERS_JSON está vacío.')


def req_json(url,method='GET',headers=None,data=None,timeout=12):
    body=None if data is None else json.dumps(data).encode()
    h={'Accept':'application/json'}
    if headers: h.update(headers)
    if body is not None: h['Content-Type']='application/json'
    r=urllib.request.Request(url,data=body,headers=h,method=method)
    with urllib.request.urlopen(r,timeout=timeout) as resp:
        raw=resp.read().decode('utf-8')
        return json.loads(raw) if raw else None


def sb_rpc(name,payload):
    h={'apikey':SERVICE_KEY,'Authorization':'Bearer '+SERVICE_KEY}
    return req_json(f'{SUPABASE_URL}/rest/v1/rpc/{name}',method='POST',headers=h,data=payload)


def parse_router_time(value):
    if not value:
        return None
    v=str(value).strip()
    for fmt in ('%Y-%m-%d %H:%M:%S','%Y-%m-%dT%H:%M:%S'):
        try:
            return datetime.strptime(v,fmt).replace(tzinfo=TZ).isoformat()
        except ValueError:
            pass
    try:
        d=datetime.fromisoformat(v.replace('Z','+00:00'))
        if d.tzinfo is None:
            d=d.replace(tzinfo=TZ)
        return d.isoformat()
    except Exception:
        return None


def mikrotik_permitidos(router):
    pool=routeros_api.RouterOsApiPool(
        str(router['host']),
        username=str(router['user']),
        password=str(router['password']),
        port=int(router.get('port',8728)),
        plaintext_login=True,
        use_ssl=False
    )
    try:
        api=pool.get_api()
        resource=api.get_resource('/ip/firewall/address-list')
        # La consulta al RB ya filtra por lista; luego volvemos a validar localmente.
        rows=resource.get(list='PERMITIDOS')
        out=[]
        for x in rows:
            if str(x.get('list','')).upper()!='PERMITIDOS':
                continue
            if str(x.get('disabled','false')).lower()=='true':
                continue
            addr=x.get('address')
            if not addr:
                continue
            out.append({
                'list':'PERMITIDOS',
                'address':addr,
                'comment':x.get('comment',''),
                'creation_time':parse_router_time(x.get('creation-time'))
            })
        return out
    finally:
        pool.disconnect()


def main():
    by_id={str(r['router_id']):r for r in ROUTERS}
    print(f'DISPROTEL detector IP iniciado. Poll: {POLL_SECONDS}s. Routers configurados: {len(by_id)}')
    while True:
        try:
            pendientes=sb_rpc('detector_solicitudes_pendientes',{}) or []
            agrupadas={}
            for s in pendientes:
                rid=s.get('router_id')
                if rid:
                    agrupadas.setdefault(str(rid),[]).append(s)
            if not pendientes:
                print('Sin solicitudes esperando IP.')
            for rid,sols in agrupadas.items():
                router=by_id.get(rid)
                if not router:
                    print('Sin configuración local para router',rid)
                    continue
                try:
                    rows=mikrotik_permitidos(router)
                    print(router.get('name',rid),':',len(rows),'PERMITIDOS leídos')
                    for s in sols:
                        result=sb_rpc('procesar_candidatos_ip_snapshot',{
                            'p_solicitud_ip_id':s['solicitud_ip_id'],
                            'p_router_id':rid,
                            'p_registros':rows
                        })
                        print(s['id_orden'],s['cliente_nombre'],'=>',result)
                except Exception as e:
                    print('Error leyendo',router.get('name',rid),':',e)
        except Exception as e:
            print('Error ciclo detector:',e)
        time.sleep(POLL_SECONDS)

if __name__=='__main__':
    main()
