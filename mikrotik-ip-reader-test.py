#!/usr/bin/env python3
import os,time
from datetime import datetime
import routeros_api

HOST=os.environ.get('RB_HOST','10.10.30.1')
PORT=int(os.environ.get('RB_PORT','19573'))
USER=os.environ.get('RB_USER','ipdetector')
PASSWORD=os.environ.get('RB_PASSWORD','')
INTERVAL=max(3,int(os.environ.get('RB_INTERVAL','8')))

if not PASSWORD:
    raise SystemExit('Falta RB_PASSWORD en variables de entorno.')


def leer():
    pool=routeros_api.RouterOsApiPool(HOST,username=USER,password=PASSWORD,port=PORT,plaintext_login=True,use_ssl=False)
    try:
        api=pool.get_api()
        r=api.get_resource('/ip/firewall/address-list')
        rows=r.get(list='PERMITIDOS')
        out=[]
        for x in rows:
            if str(x.get('list','')).upper()!='PERMITIDOS': continue
            if str(x.get('disabled','false')).lower()=='true': continue
            out.append({
                'id':x.get('id'),
                'address':x.get('address'),
                'comment':x.get('comment',''),
                'creation-time':x.get('creation-time','')
            })
        return out
    finally:
        pool.disconnect()

print(f'DISPROTEL · lector PERMITIDOS {HOST}:{PORT} · cada {INTERVAL}s')
conocidos=set()
primera=True
while True:
    try:
        rows=leer()
        actuales={str(x.get('id') or x.get('address')) for x in rows}
        if primera:
            conocidos=actuales
            primera=False
            print(datetime.now().strftime('%H:%M:%S'),f'Conectado. {len(rows)} PERMITIDOS actuales. Esperando nuevos registros...')
        else:
            nuevos=[x for x in rows if str(x.get('id') or x.get('address')) not in conocidos]
            for x in nuevos:
                print('\n*** NUEVO PERMITIDO ***')
                print('IP:',x['address'])
                print('Cliente:',x['comment'])
                print('Creado:',x['creation-time'])
            conocidos=actuales
        time.sleep(INTERVAL)
    except KeyboardInterrupt:
        print('\nDetector detenido por usuario.')
        break
    except Exception as e:
        print(datetime.now().strftime('%H:%M:%S'),'Error:',e)
        time.sleep(INTERVAL)
