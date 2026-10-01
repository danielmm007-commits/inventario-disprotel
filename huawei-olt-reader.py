#!/usr/bin/env python3
# Modo servicio: consulta la OLT solo cuando existe una solicitud ONU pendiente.
"""
DISPROTEL - lector Huawei OLT (fase 1, SOLO LECTURA)

Objetivo:
- Leer ONT pendientes de autorización mediante "display ont autofind all".
- Preparar la integración posterior con la OT sin autorizar, borrar ni modificar ONT.

Credenciales:
  OLT_USER
  OLT_PASSWORD

Configuración opcional:
  OLT_HOST   (default 10.10.30.5)
  OLT_PORT   (default 23)
  OLT_NAME   (default DISPROTEL SALCEDO)
  OLT_PROMPT (default OLT-ACC-DISPROTELSALCEDO-01#)

Dependencia:
  pip install telnetlib3
"""
import asyncio
import json
import os
import re
import sys
from datetime import datetime, timezone

import telnetlib3

HOST = os.environ.get("OLT_HOST", "10.10.30.5")
PORT = int(os.environ.get("OLT_PORT", "23"))
OLT_NAME = os.environ.get("OLT_NAME", "DISPROTEL SALCEDO")
PROMPT = os.environ.get("OLT_PROMPT", "OLT-ACC-DISPROTELSALCEDO-01#")
USER = os.environ.get("OLT_USER", "")
PASSWORD = os.environ.get("OLT_PASSWORD", "")


async def read_until(reader, text, timeout=12):
    output = ""
    while text not in output:
        char = await asyncio.wait_for(reader.read(1), timeout=timeout)
        if not char:
            break
        output += char
    return output


def _field(block, pattern):
    match = re.search(pattern, block, re.MULTILINE)
    return match.group(1).strip() if match else "-"


def parse_autofind(text):
    onts = []
    for block in re.split(r"(?=\s*Number\s*:)", text):
        if not re.search(r"Number\s*:", block):
            continue

        raw_sn = _field(block, r"Ont SN\s*:\s*(.+)")
        sn = raw_sn
        short_sn = "-"
        match = re.match(r"([^\s]+)\s+\(([^)]+)\)", raw_sn)
        if match:
            sn, short_sn = match.group(1), match.group(2)

        onts.append({
            "number": _field(block, r"Number\s*:\s*(.+)"),
            "fsp": _field(block, r"F/S/P\s*:\s*(.+)"),
            "sn": sn,
            "sn_id": short_sn,
            "vendor": _field(block, r"VendorID\s*:\s*(.+)"),
            "model": _field(block, r"Ont EquipmentID\s*:\s*(.+)"),
            "version": _field(block, r"Ont Version\s*:\s*(.+)"),
            "software": _field(block, r"Ont SoftwareVersion\s*:\s*(.+)"),
            "detected_at": _field(block, r"Ont autofind time\s*:\s*(.+)"),
        })
    return onts



def parse_ont_info_by_sn(text, requested_sn):
    low = text.lower()
    not_found = (
        "does not exist" in low
        or "do not exist" in low
        or "not exist" in low
        or "failure: the ont" in low
        or "failure: ont" in low
    )
    ont_id = _field(text, r"ONT-ID\s*:\s*(.+)")
    fsp = _field(text, r"F/S/P\s*:\s*(.+)")
    run_state = _field(text, r"Run state\s*:\s*(.+)")
    sn = _field(text, r"SN\s*:\s*(.+)")
    found = (not not_found) and (
        ont_id != "-" or fsp != "-" or run_state != "-" or sn != "-"
    )
    return {
        "found": found,
        "onu_sn": requested_sn.upper(),
        "ont_id": None if ont_id == "-" else ont_id,
        "pon": None if fsp == "-" else fsp,
        "run_state": None if run_state == "-" else run_state,
        "reported_sn": None if sn == "-" else sn,
        "descripcion": "ONU configurada en OLT" if found else "ONU no encontrada en configuración OLT",
    }


async def read_ont_by_sn(sn):
    if not USER or not PASSWORD:
        raise RuntimeError("Faltan OLT_USER / OLT_PASSWORD en variables de entorno.")

    requested = str(sn or "").strip().upper()
    if not requested:
        raise RuntimeError("SN vacío para consulta OLT.")

    reader = writer = None
    try:
        reader, writer = await telnetlib3.open_connection(
            host=HOST,
            port=PORT,
            shell=None,
            connect_minwait=0.05,
        )

        await read_until(reader, "User name:")
        writer.write(USER + "\n")
        await writer.drain()

        await read_until(reader, "User password:")
        writer.write(PASSWORD + "\n")
        await writer.drain()

        login = await read_until(reader, ">")
        if ">" not in login:
            raise RuntimeError("No se obtuvo prompt de usuario de la OLT.")

        writer.write("enable\n")
        await writer.drain()
        await read_until(reader, "#")

        writer.write(f"display ont info by-sn {requested}\n")
        await writer.drain()

        response = ""
        while PROMPT not in response:
            chunk = await asyncio.wait_for(reader.read(1024), timeout=12)
            if not chunk:
                break
            response += chunk
            if "{ <cr>||<K> }:" in response and "Command:" not in response:
                writer.write("\n")
                await writer.drain()
                await asyncio.sleep(0.15)
            if "Press 'Q' to break" in chunk or "More" in chunk:
                writer.write(" ")
                await writer.drain()
                await asyncio.sleep(0.15)

        result = parse_ont_info_by_sn(response, requested)
        result["raw_excerpt"] = response[-1200:]
        return result
    finally:
        if writer is not None:
            try:
                writer.write("quit\n")
                await writer.drain()
                answer = await read_until(reader, "(y/n)[n]:", timeout=3)
                if "(y/n)[n]:" in answer:
                    writer.write("y\n")
                    await writer.drain()
            except Exception:
                pass
            writer.close()


async def read_autofind():
    if not USER or not PASSWORD:
        raise RuntimeError("Faltan OLT_USER / OLT_PASSWORD en variables de entorno.")

    reader = writer = None
    try:
        reader, writer = await telnetlib3.open_connection(
            host=HOST,
            port=PORT,
            shell=None,
            connect_minwait=0.05,
        )

        await read_until(reader, "User name:")
        writer.write(USER + "\n")
        await writer.drain()

        await read_until(reader, "User password:")
        writer.write(PASSWORD + "\n")
        await writer.drain()

        login = await read_until(reader, ">")
        if ">" not in login:
            raise RuntimeError("No se obtuvo prompt de usuario de la OLT.")

        writer.write("enable\n")
        await writer.drain()
        await read_until(reader, "#")

        writer.write("display ont autofind all\n")
        await writer.drain()

        response = ""
        while PROMPT not in response:
            chunk = await asyncio.wait_for(reader.read(1024), timeout=12)
            if not chunk:
                break
            response += chunk

            # Huawei solicita Enter antes de entregar la salida del comando.
            if "{ <cr>||<K> }:" in response and "Command:" not in response:
                writer.write("\n")
                await writer.drain()
                await asyncio.sleep(0.15)

            # Paginación Huawei.
            if "Press 'Q' to break" in chunk or "More" in chunk:
                writer.write(" ")
                await writer.drain()
                await asyncio.sleep(0.15)

        if "Failure: The automatically found ONTs do not exist" in response:
            return []

        return parse_autofind(response)
    finally:
        if writer is not None:
            try:
                writer.write("quit\n")
                await writer.drain()
                answer = await read_until(reader, "(y/n)[n]:", timeout=3)
                if "(y/n)[n]:" in answer:
                    writer.write("y\n")
                    await writer.drain()
            except Exception:
                pass
            writer.close()


async def main():
    try:
        onts = await read_autofind()
        payload = {
            "ok": True,
            "read_only": True,
            "olt": OLT_NAME,
            "host": HOST,
            "read_at": datetime.now(timezone.utc).isoformat(),
            "pending_count": len(onts),
            "onts": onts,
        }
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    except Exception as exc:
        print(json.dumps({
            "ok": False,
            "read_only": True,
            "olt": OLT_NAME,
            "host": HOST,
            "error": str(exc),
        }, ensure_ascii=False, indent=2))
        return 1
    return 0




# Integración opcional con DISPROTEL.
# Si se definen SUPABASE_URL y DETECTOR_TOKEN, además de imprimir la lectura
# puede enviarse el snapshot al backend inventario-onu-detector.
def backend_call(action, payload=None):
    import urllib.request
    base=os.environ.get("SUPABASE_URL","https://ajnbswrwnjpjypjiorye.supabase.co").rstrip("/")
    token=os.environ.get("DETECTOR_TOKEN","")
    olt_codigo=os.environ.get("OLT_CODIGO","SALCEDO")
    if not base or not token:
        return None
    data={"action":action,"olt_codigo":olt_codigo}
    if payload:
        data.update(payload)
    req=urllib.request.Request(
        base+"/functions/v1/inventario-onu-detector",
        data=json.dumps(data).encode(),
        headers={
            "Authorization":"Bearer "+token,
            "Content-Type":"application/json",
            "Accept":"application/json"
        },
        method="POST"
    )
    with urllib.request.urlopen(req,timeout=20) as resp:
        raw=resp.read().decode("utf-8")
        return json.loads(raw) if raw else {"ok":True}


def send_snapshot(payload):
    return backend_call("scanner-snapshot",{
        "olt_nombre":OLT_NAME,
        "onts":payload.get("onts",[])
    })


def baja_backend_call(action, payload=None):
    import urllib.request
    base=os.environ.get("SUPABASE_URL","").rstrip("/")
    token=os.environ.get("DETECTOR_TOKEN","")
    olt_codigo=os.environ.get("OLT_CODIGO","SALCEDO")
    if not base or not token:
        return None
    data={"action":action,"olt_codigo":olt_codigo}
    if payload:
        data.update(payload)
    req=urllib.request.Request(
        base+"/functions/v1/inventario-bajas-servicio",
        data=json.dumps(data).encode(),
        headers={
            "Authorization":"Bearer "+token,
            "Content-Type":"application/json",
            "Accept":"application/json"
        },
        method="POST"
    )
    with urllib.request.urlopen(req,timeout=20) as resp:
        raw=resp.read().decode("utf-8")
        return json.loads(raw) if raw else {"ok":True}


async def process_live_requests():
    pending=backend_call("scanner-live-pending") or {}
    rows=pending.get("solicitudes") or []
    results=[]
    for row in rows:
        req_id=str(row.get("id") or "")
        sn=str(row.get("onu_sn") or "").strip().upper()
        if not req_id or not sn:
            continue
        try:
            info=await read_ont_by_sn(sn)
            payload={
                "id":req_id,
                "ok":True,
                "resultado":{
                    "onu_sn":sn,
                    "found":bool(info.get("found")),
                    "run_state":info.get("run_state"),
                    "pon":info.get("pon"),
                    "ont_id":info.get("ont_id"),
                    "reported_sn":info.get("reported_sn"),
                    "descripcion":info.get("descripcion"),
                    "olt":OLT_NAME,
                    "read_at":datetime.now(timezone.utc).isoformat(),
                }
            }
            sent=backend_call("scanner-live-result",payload) or {}
            results.append({"id":req_id,"sn":sn,"olt":info,"backend":sent})
        except Exception as exc:
            try:
                backend_call("scanner-live-result",{"id":req_id,"ok":False,"error":str(exc)})
            except Exception:
                pass
            results.append({"id":req_id,"sn":sn,"error":str(exc)})
    return {"pending_count":len(rows),"results":results}


async def process_baja_requests():
    pending=baja_backend_call("scanner-pending") or {}
    rows=pending.get("solicitudes") or []
    results=[]
    for row in rows:
        req_id=str(row.get("id") or "")
        sn=str(row.get("onu_sn") or "").strip().upper()
        if not req_id or not sn:
            continue
        try:
            info=await read_ont_by_sn(sn)
            payload={
                "id":req_id,
                "onu_sn":sn,
                "found":bool(info.get("found")),
                "run_state":info.get("run_state"),
                "pon":info.get("pon"),
                "ont_id":info.get("ont_id"),
                "descripcion":info.get("descripcion"),
            }
            sent=baja_backend_call("scanner-result",payload) or {}
            results.append({"id":req_id,"sn":sn,"olt":info,"backend":sent})
        except Exception as exc:
            results.append({"id":req_id,"sn":sn,"error":str(exc)})
    return {"pending_count":len(rows),"results":results}

async def run_once():
    onts=await read_autofind()
    payload={
        "ok":True,"read_only":True,"olt":OLT_NAME,"host":HOST,
        "read_at":datetime.now(timezone.utc).isoformat(),
        "pending_count":len(onts),"onts":onts
    }
    sent=send_snapshot(payload)
    if sent is not None:
        payload["backend"]=sent
    return payload



# ===== AGENTE MULTI OLT DINÁMICO =====
# Activar con OLT_MULTI_MODE=1.
# La configuración no sensible (IP, puerto, nombre, intervalo) viene del sistema.
# Las credenciales permanecen locales en la PC scanner:
#   OLT_<CODIGO>_USER / OLT_<CODIGO>_PASSWORD
# Ejemplo: OLT_LATACUNGA_USER / OLT_LATACUNGA_PASSWORD

def olt_config_call(action, payload=None):
    import urllib.request
    base=os.environ.get("SUPABASE_URL","https://ajnbswrwnjpjypjiorye.supabase.co").rstrip("/")
    token=os.environ.get("DETECTOR_TOKEN","")
    if not token:
        raise RuntimeError("Falta DETECTOR_TOKEN para modo multi OLT.")
    data={"action":action}
    if payload:
        data.update(payload)
    req=urllib.request.Request(
        base+"/functions/v1/inventario-olts-config",
        data=json.dumps(data).encode(),
        headers={
            "Authorization":"Bearer "+token,
            "Content-Type":"application/json",
            "Accept":"application/json"
        },
        method="POST"
    )
    with urllib.request.urlopen(req,timeout=25) as resp:
        raw=resp.read().decode("utf-8")
        return json.loads(raw) if raw else {"ok":True}


def local_credentials(cfg):
    remote_user=str(cfg.get("usuario") or "")
    remote_password=str(cfg.get("password") or "")
    if remote_user and remote_password:
        return remote_user,remote_password
    code=re.sub(r"[^A-Z0-9]+","_",str(cfg.get("codigo") or "").upper()).strip("_")
    user=os.environ.get(f"OLT_{code}_USER","")
    password=os.environ.get(f"OLT_{code}_PASSWORD","")
    if code=="SALCEDO":
        user=user or os.environ.get("OLT_USER","")
        password=password or os.environ.get("OLT_PASSWORD","")
    return user,password

async def open_configured_olt(cfg):
    protocol=str(cfg.get("protocolo") or "TELNET").upper()
    if protocol!="TELNET":
        raise RuntimeError("El agente actual soporta TELNET; SSH todavía no está habilitado.")
    user,password=local_credentials(cfg)
    if not user or not password:
        raise RuntimeError("Credenciales locales no configuradas para "+str(cfg.get("codigo") or "OLT"))
    host=str(cfg.get("host") or "").strip()
    port=int(cfg.get("puerto") or 23)
    reader,writer=await telnetlib3.open_connection(host=host,port=port,shell=None,connect_minwait=0.05)
    await read_until(reader,"User name:")
    writer.write(user+"\n"); await writer.drain()
    await read_until(reader,"User password:")
    writer.write(password+"\n"); await writer.drain()
    login=await read_until(reader,">")
    if ">" not in login:
        writer.close()
        raise RuntimeError("No se obtuvo prompt de usuario de la OLT.")
    writer.write("enable\n"); await writer.drain()
    enable=await read_until(reader,"#")
    if "#" not in enable:
        writer.close()
        raise RuntimeError("No se obtuvo prompt privilegiado de la OLT.")
    return reader,writer


async def configured_autofind(cfg):
    reader=writer=None
    try:
        reader,writer=await open_configured_olt(cfg)
        writer.write("display ont autofind all\n"); await writer.drain()
        response=""
        prompt=str(cfg.get("prompt") or "").strip()
        while True:
            chunk=await asyncio.wait_for(reader.read(1024),timeout=15)
            if not chunk:
                break
            response+=chunk
            if "{ <cr>||<K> }:" in response and "Command:" not in response:
                writer.write("\n"); await writer.drain(); await asyncio.sleep(0.15)
            if "Press 'Q' to break" in chunk or "More" in chunk:
                writer.write(" "); await writer.drain(); await asyncio.sleep(0.15)
            if prompt and prompt in response:
                break
            if not prompt and response.rstrip().endswith("#"):
                break
        if "Failure: The automatically found ONTs do not exist" in response:
            return []
        return parse_autofind(response)
    finally:
        if writer is not None:
            try:
                writer.write("quit\n"); await writer.drain()
            except Exception:
                pass
            try:
                writer.close()
            except Exception:
                pass


async def test_configured_olt(cfg):
    reader=writer=None
    try:
        reader,writer=await open_configured_olt(cfg)
        return {"ok":True,"codigo":cfg.get("codigo"),"host":cfg.get("host"),"read_at":datetime.now(timezone.utc).isoformat()}
    finally:
        if writer is not None:
            try: writer.close()
            except Exception: pass


async def handle_olt_test_queue():
    data=olt_config_call("scanner-test-pending") or {}
    results=[]
    for row in data.get("tests") or []:
        cfg=row.get("olt")
        if isinstance(cfg,list):
            cfg=cfg[0] if cfg else None
        if not cfg:
            continue
        user,password=local_credentials(cfg)
        try:
            result=await test_configured_olt(cfg)
            olt_config_call("scanner-test-result",{"id":row.get("id"),"ok":True,"resultado":result,"credentials_ready":bool(user and password)})
            results.append({"codigo":cfg.get("codigo"),"ok":True})
        except Exception as exc:
            olt_config_call("scanner-test-result",{"id":row.get("id"),"ok":False,"error":str(exc),"credentials_ready":bool(user and password)})
            results.append({"codigo":cfg.get("codigo"),"ok":False,"error":str(exc)})
    return results


async def poll_configured_olt(cfg):
    user,password=local_credentials(cfg)
    try:
        onts=await configured_autofind(cfg)
        saved=olt_config_call("scanner-snapshot",{
            "olt_id":cfg.get("id"),
            "olt_codigo":cfg.get("codigo"),
            "olt_nombre":cfg.get("nombre"),
            "onts":onts,
            "credentials_ready":bool(user and password)
        })
        return {"ok":True,"read_only":True,"codigo":cfg.get("codigo"),"olt":cfg.get("nombre"),"pending_count":len(onts),"backend":saved}
    except Exception as exc:
        try:
            olt_config_call("scanner-heartbeat",{"olt_id":cfg.get("id"),"ok":False,"error":str(exc),"credentials_ready":bool(user and password)})
        except Exception:
            pass
        return {"ok":False,"read_only":True,"codigo":cfg.get("codigo"),"olt":cfg.get("nombre"),"error":str(exc)}


async def multi_olt_service_loop():
    tick=max(2,int(os.environ.get("OLT_MULTI_TICK_SECONDS","5")))
    next_due={}
    signature=None
    print(json.dumps({"ok":True,"multi_olt":True,"read_only":True,"message":"Agente Huawei multi OLT iniciado","tick_seconds":tick},ensure_ascii=False))
    while True:
        try:
            tests=await handle_olt_test_queue()
            if tests:
                print(json.dumps({"ok":True,"trigger":"PRUEBAS_OLT","tests":tests},ensure_ascii=False))
            cfg_data=olt_config_call("scanner-list") or {}
            olts=cfg_data.get("olts") or []
            now=asyncio.get_running_loop().time()
            current=tuple((str(x.get("id")),int(x.get("intervalo_seg") or 300),int(x.get("orden") or 0)) for x in olts)
            if current!=signature:
                next_due={}
                count=max(1,len(olts))
                for index,cfg in enumerate(olts):
                    interval=max(60,int(cfg.get("intervalo_seg") or 300))
                    next_due[str(cfg.get("id"))]=now+(index*(interval/count))
                signature=current
                print(json.dumps({"ok":True,"multi_olt":True,"configured":len(olts),"schedule":[{"codigo":x.get("codigo"),"intervalo_seg":x.get("intervalo_seg")} for x in olts]},ensure_ascii=False))
            for cfg in olts:
                oid=str(cfg.get("id") or "")
                if not oid:
                    continue
                due=next_due.get(oid,now)
                if now<due:
                    continue
                result=await poll_configured_olt(cfg)
                print(json.dumps(result,ensure_ascii=False))
                interval=max(60,int(cfg.get("intervalo_seg") or 300))
                next_due[oid]=max(due+interval,asyncio.get_running_loop().time()+1)
        except Exception as exc:
            print(json.dumps({"ok":False,"multi_olt":True,"error":str(exc)},ensure_ascii=False))
        await asyncio.sleep(tick)


async def service_loop():
    seconds=max(5,int(os.environ.get("OLT_POLL_SECONDS","10")))
    print(json.dumps({
        "ok": True,
        "diagnostico_inicio": True,
        "olt": OLT_NAME,
        "olt_codigo": os.environ.get("OLT_CODIGO","SALCEDO"),
        "supabase_url": os.environ.get("SUPABASE_URL","https://ajnbswrwnjpjypjiorye.supabase.co"),
        "detector_token_configurado": bool(os.environ.get("DETECTOR_TOKEN","")),
        "service_mode": os.environ.get("OLT_SERVICE_MODE","0"),
        "poll_seconds": seconds
    }, ensure_ascii=False))
    while True:
        try:
            pending=backend_call("scanner-pending") or {}
            count=int(pending.get("pending_count",0) or 0)
            live=await process_live_requests()
            live_count=int(live.get("pending_count",0) or 0)
            baja=await process_baja_requests()
            baja_count=int(baja.get("pending_count",0) or 0)
            if count>0:
                payload=await run_once()
                payload["trigger"]="SOLICITUD_OT"
                payload["requests"]=count
                payload["consultas_live"]=live
                payload["bajas"]=baja
                print(json.dumps(payload,ensure_ascii=False))
            elif live_count>0:
                print(json.dumps({
                    "ok":True,
                    "read_only":True,
                    "olt":OLT_NAME,
                    "trigger":"CONSULTA_CLIENTE_LIVE",
                    "consultas_live":live
                },ensure_ascii=False))
            elif baja_count>0:
                print(json.dumps({
                    "ok":True,
                    "read_only":True,
                    "olt":OLT_NAME,
                    "trigger":"VERIFICACION_BAJA",
                    "bajas":baja
                },ensure_ascii=False))
            else:
                print(json.dumps({
                    "ok":True,
                    "read_only":True,
                    "olt":OLT_NAME,
                    "waiting":True,
                    "pending_requests":0,
                    "pending_live":0,
                    "pending_bajas":0,
                    "message":"Sin solicitudes ONU, consultas en vivo ni verificaciones de baja pendientes. No se consulta la OLT."
                },ensure_ascii=False))
        except Exception as exc:
            print(json.dumps({"ok":False,"olt":OLT_NAME,"error":str(exc)},ensure_ascii=False))
        await asyncio.sleep(seconds)


def self_test_parser():
    """Prueba local del parser de baja. No conecta a la OLT ni al backend."""
    sample_found = """
F/S/P               : 0/1/12
ONT-ID              : 6
SN                  : HWTC3D4AEE32
Run state           : online
"""
    sample_missing = """
Failure: The ONT does not exist
"""
    found = parse_ont_info_by_sn(sample_found, "HWTC3D4AEE32")
    missing = parse_ont_info_by_sn(sample_missing, "HWTC00000000")
    ok_found = (
        found.get("found") is True
        and found.get("ont_id") == "6"
        and found.get("pon") == "0/1/12"
        and str(found.get("run_state") or "").lower() == "online"
    )
    ok_missing = missing.get("found") is False
    return {
        "ok": bool(ok_found and ok_missing),
        "read_only": True,
        "self_test": True,
        "network_used": False,
        "found_case": found,
        "missing_case": missing,
    }


async def main():
    if "--self-test" in sys.argv:
        result = self_test_parser()
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0 if result.get("ok") else 1
    if os.environ.get("OLT_MULTI_MODE","0")=="1":
        await multi_olt_service_loop()
        return 0
    if os.environ.get("OLT_SERVICE_MODE","0")=="1":
        await service_loop()
        return 0
    try:
        print(json.dumps(await run_once(),ensure_ascii=False,indent=2))
        return 0
    except Exception as exc:
        print(json.dumps({"ok":False,"read_only":True,"olt":OLT_NAME,"host":HOST,"error":str(exc)},ensure_ascii=False,indent=2))
        return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
