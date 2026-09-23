#!/usr/bin/env python3
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
def send_snapshot(payload):
    import urllib.request
    base=os.environ.get("SUPABASE_URL","").rstrip("/")
    token=os.environ.get("DETECTOR_TOKEN","")
    olt_codigo=os.environ.get("OLT_CODIGO","SALCEDO")
    if not base or not token:
        return None
    body=json.dumps({
        "action":"scanner-snapshot",
        "olt_codigo":olt_codigo,
        "olt_nombre":OLT_NAME,
        "onts":payload.get("onts",[])
    }).encode()
    req=urllib.request.Request(
        base+"/functions/v1/inventario-onu-detector",
        data=body,
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


async def service_loop():
    seconds=max(5,int(os.environ.get("OLT_POLL_SECONDS","10")))
    while True:
        try:
            print(json.dumps(await run_once(),ensure_ascii=False))
        except Exception as exc:
            print(json.dumps({"ok":False,"olt":OLT_NAME,"error":str(exc)},ensure_ascii=False))
        await asyncio.sleep(seconds)


async def main():
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
