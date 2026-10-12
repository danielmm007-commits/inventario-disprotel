#!/usr/bin/env python3
"""Diagnostico de trafico Huawei DISPROTEL. Solo lectura; no cambia V3."""
import os, re, sys, asyncio, importlib.util
from pathlib import Path

BASE=Path(__file__).resolve().parent
BAT=BASE/'init-huawei-olt.bat'
READER=BASE/'huawei-olt-reader.py'
SN='HWTCC8BFCE42'
OLT='SALCEDO'

def load_batch_env():
    if not BAT.is_file(): return
    # Lee SOLO variables necesarias; no ejecuta BAT ni arranca otro lector.
    allowed={'DETECTOR_TOKEN','SUPABASE_URL','OLT_SALCEDO_USER','OLT_SALCEDO_PASSWORD','OLT_USER','OLT_PASSWORD'}
    for raw in BAT.read_text(encoding='utf-8-sig',errors='replace').splitlines():
        line=raw.strip()
        m=re.match(r'^set\s+(?:"([^"=]+)=([^"]*)"|([^=\s]+)=(.*))$',line,re.I)
        if m:
            key=(m.group(1) or m.group(3) or '').upper()
            val=m.group(2) if m.group(1) else m.group(4)
            if key in allowed and val and not os.environ.get(key):
                os.environ[key]=os.path.expandvars(val.strip())
def module():
    spec=importlib.util.spec_from_file_location('disprotel_huawei_diag_lib',str(READER))
    mod=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod
async def run(mod,cfg):
    reader=writer=None
    try:
        reader,writer=await mod.open_configured_olt(cfg)
        first=await mod._session_command(reader,writer,f'display ont info by-sn {SN}',timeout=35)
        info=mod.parse_ont_info_by_sn(first,SN)
        if not info.get('found'):
            print('ONU no encontrada. Respuesta (sin credenciales):')
            print(first[-2500:])
            return
        pon=str(info.get('pon') or '')
        oid=info.get('ont_id')
        print('ONU localizada:',SN,'PON:',pon,'ONT-ID:',oid)
        chunks=pon.split('/')
        if len(chunks)!=3 or not str(oid).isdigit():
            print('No se pudo confirmar PON e ID; no se enviara comando de trafico.')
            return
        frame,slot,port=map(int,chunks)
        r1=await mod._session_command(reader,writer,'config',timeout=15)
        r2=await mod._session_command(reader,writer,f'interface gpon {frame}/{slot}',timeout=15)
        if any(x in r2.lower() for x in ('unknown command','parameter error','failure:','error:')):
            print('No se pudo acceder al contexto gpon:',r2[-1200:]);return
        cmd=f'display ont traffic {port} {int(oid)}'
        print('Comando SOLO LECTURA:',cmd)
        answer=await mod._session_command(reader,writer,cmd,timeout=25)
        print('\n===== RESPUESTA HUAWEI =====')
        print(answer[-5000:].strip() or '[sin respuesta]')
        print('===== FIN =====')
    finally:
        if writer is not None:
            try:writer.close()
            except Exception:pass
def main():
    if not READER.is_file():
        print('ERROR: huawei-olt-reader.py no esta en',BASE);return 2
    load_batch_env()
    mod=module()
    if not os.environ.get('DETECTOR_TOKEN'):
        print('FALTA DETECTOR_TOKEN en la sesion y en init-huawei-olt.bat.')
        print('No se ha realizado ninguna conexion. No pegues credenciales aqui.')
        return 3
    try:
        data=mod.olt_config_call('scanner-list')
        cfg=next((x for x in data.get('olts',[]) if str(x.get('codigo','')).upper()==OLT),None)
        if not cfg: raise RuntimeError('SALCEDO no aparece en scanner-list')
        user,password=mod.local_credentials(cfg)
        if not user or not password:
            print('La configuracion central no entrego usuario/password a este proceso.')
            print('No se enviaron comandos a la OLT.');return 4
        print('Conexion independiente de prueba; Huawei V3 no se detiene.')
        asyncio.run(run(mod,cfg));return 0
    except Exception as ex:
        msg=str(ex)
        msg=re.sub(r'(?i)(password|token|authorization)\s*[:=]\s*\S+',r'\1=[OCULTO]',msg)
        print('ERROR DE DIAGNOSTICO:',msg[:350]);return 1
if __name__=='__main__':
    sys.exit(main())
