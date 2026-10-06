#!/usr/bin/env python3
# DISPROTEL - prueba segura de inventario Huawei SALCEDO
# SOLO LECTURA. No autoriza, elimina ni modifica ONTs.

import asyncio
import json
import os
import sys
import telnetlib3

HOST=os.environ.get("OLT_HOST","10.10.30.5")
PORT=int(os.environ.get("OLT_PORT","23"))
USER=os.environ.get("OLT_USER","")
PASSWORD=os.environ.get("OLT_PASSWORD","")
PROMPT=os.environ.get("OLT_PROMPT","OLT-ACC-DISPROTELSALCEDO-01#")

async def read_until(reader,text,timeout=12):
    out=""
    while text not in out:
        ch=await asyncio.wait_for(reader.read(1),timeout=timeout)
        if not ch: break
        out+=ch
    return out

async def run_command(command):
    if not USER or not PASSWORD:
        raise RuntimeError("Faltan OLT_USER / OLT_PASSWORD en esta sesion.")
    reader=writer=None
    try:
        reader,writer=await telnetlib3.open_connection(host=HOST,port=PORT,shell=None,connect_minwait=0.05)
        await read_until(reader,"User name:")
        writer.write(USER+"\n"); await writer.drain()
        await read_until(reader,"User password:")
        writer.write(PASSWORD+"\n"); await writer.drain()
        login=await read_until(reader,">")
        if ">" not in login: raise RuntimeError("No se obtuvo prompt de usuario.")
        writer.write("enable\n"); await writer.drain()
        await read_until(reader,"#")
        writer.write(command+"\n"); await writer.drain()

        response=""
        loop=asyncio.get_running_loop()
        deadline=loop.time()+35
        while loop.time()<deadline:
            try:
                chunk=await asyncio.wait_for(reader.read(2048),timeout=5)
            except asyncio.TimeoutError:
                if response:
                    break
                continue
            if not chunk: break
            response+=chunk
            if "{ <cr>||<K> }:" in response and "Command:" not in response:
                writer.write("\n"); await writer.drain(); await asyncio.sleep(0.1)
            if "Press 'Q' to break" in chunk or "More" in chunk:
                writer.write(" "); await writer.drain(); await asyncio.sleep(0.1)
            if PROMPT and PROMPT in response:
                break
        return response
    finally:
        if writer is not None:
            try:
                writer.write("quit\n"); await writer.drain()
            except Exception:
                pass
            writer.close()


async def run_sequence(commands):
    if not USER or not PASSWORD:
        raise RuntimeError("Faltan OLT_USER / OLT_PASSWORD en esta sesion.")
    reader=writer=None
    try:
        reader,writer=await telnetlib3.open_connection(host=HOST,port=PORT,shell=None,connect_minwait=0.05)
        await read_until(reader,"User name:")
        writer.write(USER+"\n"); await writer.drain()
        await read_until(reader,"User password:")
        writer.write(PASSWORD+"\n"); await writer.drain()
        login=await read_until(reader,">")
        if ">" not in login:
            raise RuntimeError("No se obtuvo prompt de usuario.")
        writer.write("enable\n"); await writer.drain()
        await read_until(reader,"#")

        results=[]
        for command in commands:
            writer.write(command+"\n"); await writer.drain()
            response=""
            loop=asyncio.get_running_loop()
            deadline=loop.time()+35
            while loop.time()<deadline:
                try:
                    chunk=await asyncio.wait_for(reader.read(2048),timeout=5)
                except asyncio.TimeoutError:
                    if response:
                        break
                    continue
                if not chunk:
                    break
                response+=chunk
                if "{ <cr>||<K> }:" in response and "Command:" not in response:
                    writer.write("\n"); await writer.drain(); await asyncio.sleep(0.1)
                if "Press 'Q' to break" in chunk or "More" in chunk:
                    writer.write(" "); await writer.drain(); await asyncio.sleep(0.1)
                if "#" in response and (
                    "(config)#" in response
                    or "(config-if-gpon-0/1)#" in response
                    or PROMPT in response
                ):
                    break
            results.append((command,response))
        return results
    finally:
        if writer is not None:
            writer.close()

async def main():
    tests=[
        ("ALARMAS_PON_6",[
            "config",
            "interface gpon 0/1",
            "display ont alarm-state 6"
        ]),
        ("ESTADO_PUERTOS",[
            "config",
            "interface gpon 0/1",
            "display port state all"
        ])
    ]
    print(json.dumps({"ok":True,"read_only":True,"host":HOST,"purpose":"leer alarmas PON y estado masivo de puertos MA5800 R018"},ensure_ascii=False))
    for label,commands in tests:
        print("\n===== "+label+" =====")
        results=await run_sequence(commands)
        for command,raw in results:
            print("\n>>> "+command)
            print(raw)
            print("<<< FIN "+command+"\n")
    return 0

if __name__=="__main__":
    try:
        sys.exit(asyncio.run(main()))
    except Exception as e:
        print(json.dumps({"ok":False,"read_only":True,"error":str(e)},ensure_ascii=False))
        sys.exit(1)
