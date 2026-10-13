#!/usr/bin/env python3
"""DISPROTEL: lectura puntual de perfiles de ONU existentes. No modifica la OLT ni V3."""
import asyncio
import getpass
import importlib.util
import json
import os
from pathlib import Path
import re
import sys
from datetime import datetime

BASE=Path(__file__).resolve().parent
LECTOR=BASE/"huawei-olt-reader.py"
OLT="SALCEDO"
PON="0/2/0"
PREFERIDO=3
ALLOW_FIELDS=re.compile(r"(profile|gem|t.cont|dba|vlan|traffic|tag.transform|mapping|ethernet|port|service.port|type|mode)", re.I)

def _batch_vars():
    """Carga solo ajustes SET existentes, nunca ejecuta .bat ni imprime secretos."""
    allowed={"DETECTOR_TOKEN","SUPABASE_URL","OLT_USER","OLT_PASSWORD",
             "OLT_SALCEDO_USER","OLT_SALCEDO_PASSWORD"}
    for fname in ("init-huawei-olt.bat","init-multirouter.bat.bat"):
        bat=BASE/fname
        if not bat.exists():
            continue
        for raw in bat.read_text(encoding="utf-8-sig",errors="replace").splitlines():
            match=re.match(r'^\s*set\s+"?([A-Za-z_][A-Za-z0-9_]*)=(.*?)"?\s*$',raw,re.I)
            if match:
                key=match.group(1).upper()
                value=match.group(2).strip()
                if key in allowed and value and not value.startswith("%") and not os.environ.get(key):
                    os.environ[key]=value

def cargar_lector():
    if not LECTOR.is_file():
        raise RuntimeError("No encuentro huawei-olt-reader.py junto a este archivo. Copia esta herramienta a la misma carpeta.")
    spec=importlib.util.spec_from_file_location("disprotel_huawei_lib_consulta",str(LECTOR))
    mod=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

def obtener_cfg(mod):
    # La misma configuracion existente en DISPROTEL, si el launcher dejo token disponible.
    if os.environ.get("DETECTOR_TOKEN"):
        data=mod.olt_config_call("scanner-list")
        cfg=next((v for v in data.get("olts",[]) if str(v.get("codigo","")).upper()==OLT),None)
        if cfg:
            u,p=mod.local_credentials(cfg)
            if u and p:
                print("Usando configuracion existente de SALCEDO (credenciales ocultas).")
                return cfg
    print("No se pudo utilizar automaticamente la configuracion central.")
    print("Ingresa las credenciales Huawei en esta consola. No se guardaran.")
    user=input("Usuario Huawei: ").strip()
    pwd=getpass.getpass("Clave Huawei (oculta): ")
    if not user or not pwd:
        raise RuntimeError("Faltan las credenciales para consultar.")
    host=input("IP de SALCEDO [10.10.30.5]: ").strip() or "10.10.30.5"
    if not re.fullmatch(r"\d{1,3}(?:\.\d{1,3}){3}",host):
        raise RuntimeError("IP no valida")
    return {"codigo":OLT,"host":host,"puerto":23,"protocolo":"TELNET",
            "usuario":user,"password":pwd}

def limpio(raw):
    lines=[]
    for line in str(raw).splitlines():
        if re.search(r"(password|secret|username|login|serial\s*number|description|customer|client|address)",line,re.I):
            continue
        if ALLOW_FIELDS.search(line):
            lines.append(line.strip()[:180])
        if len(lines)>=35:
            break
    return lines

def campo(raw,expr):
    m=re.search(expr,str(raw),flags=re.I)
    return int(m.group(1)) if m else None

def profiles(raw):
    return (campo(raw,r"(?:ONT\s*)?line\s*profile\s*(?:ID)?\s*:\s*(\d+)"),
            campo(raw,r"(?:ONT\s*)?(?:service|srv)\s*profile\s*(?:ID)?\s*:\s*(\d+)"))

def error_comando(raw):
    return bool(re.search(r"(unknown command|unrecognized command|parameter error|error:|failure:)",str(raw),re.I))

async def consulta(mod,cfg):
    reader=writer=None
    out={"ok":False,"olt":OLT,"pon":PON,"modo":"SOLO LECTURA","ont":[],"perfiles_linea":{},
         "perfiles_servicio":{},"avisos":[],"fecha":datetime.now().isoformat(timespec="seconds")}
    try:
        reader,writer=await mod.open_configured_olt(cfg)
        async def cmd(c,secs=35):
            return await mod._session_command(reader,writer,c,timeout=secs)
        c=await cmd("config")
        if error_comando(c): raise RuntimeError("No se pudo entrar en modo de consultas GPON.")
        c=await cmd("interface gpon 0/2")
        if error_comando(c): raise RuntimeError("No se pudo acceder a la tarjeta GPON 0/2.")
        overview=await cmd("display ont info 0 all",65)
        if error_comando(overview): raise RuntimeError("La OLT rechazo display ont info 0 all.")
        ons=[x for x in mod.parse_inventory_status(overview) if x.get("fsp")==PON and x.get("run_state")=="online"]
        ids=[int(x["ont_id"]) for x in ons]
        # Maximo tres consultas de ONU existentes: incluye ONT-ID 3 si esta online.
        chosen=([PREFERIDO] if PREFERIDO in ids else [])+[v for v in ids if v!=PREFERIDO][:3]
        chosen=chosen[:3]
        if not chosen: raise RuntimeError("No se encontraron ONU online en el PON 0/2/0.")
        for oid in chosen:
            info=await cmd(f"display ont info 0 {oid}")
            if error_comando(info):
                out["avisos"].append(f"ONT-ID {oid}: consulta individual no disponible")
                continue
            line,srv=profiles(info)
            out["ont"].append({"ont_id":oid,"line_profile_id":line,"srv_profile_id":srv,
                               "resumen":limpio(info)})
        await cmd("quit",15)
        for o in out["ont"]:
            oid=o["ont_id"]
            svc=await cmd(f"display service-port port 0/2/0 ont {oid}",40)
            o["service_port_disponible"]=not error_comando(svc)
            o["service_ports"]=limpio(svc)
            if error_comando(svc):
                out["avisos"].append(f"No se pudo leer service-port ONT-ID {oid}; revisar sintaxis de firmware")
        for line_id in sorted({o["line_profile_id"] for o in out["ont"] if o["line_profile_id"] is not None}):
            res=await cmd(f"display ont-lineprofile gpon profile-id {line_id}",35)
            out["perfiles_linea"][str(line_id)]={"disponible":not error_comando(res),"resumen":limpio(res)}
        for srv_id in sorted({o["srv_profile_id"] for o in out["ont"] if o["srv_profile_id"] is not None}):
            res=await cmd(f"display ont-srvprofile gpon profile-id {srv_id}",35)
            out["perfiles_servicio"][str(srv_id)]={"disponible":not error_comando(res),"resumen":limpio(res)}
        out["ok"]=True
        out["avisos"].append("Estos perfiles no confirman por si solos que todas las ONU examinadas sean BRIDGE.")
        return out
    finally:
        if writer:
            try:writer.close()
            except Exception:pass

def main():
    os.chdir(BASE)
    _batch_vars()
    mod=cargar_lector()
    cfg=obtener_cfg(mod)
    print("Consultando Huawei SALCEDO, PON 0/2/0, sin detener V3 ni modificar configuraciones...")
    result=asyncio.run(consulta(mod,cfg))
    output=BASE/"huawei_perfiles_bridge_salcedo.json"
    output.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding="utf-8")
    print("RESULTADO:", "OK" if result["ok"] else "ERROR")
    for onu in result["ont"]:
        print("ONT-ID",onu["ont_id"],"| LINE",onu["line_profile_id"],"| SERVICE",onu["srv_profile_id"],
              "| service-ports",len(onu["service_ports"]))
    print("Archivo:",output)
    print("Comparte ese JSON (no compartas claves).")

if __name__=="__main__":
    try:main()
    except (Exception,KeyboardInterrupt) as exc:
        print("ERROR:",str(exc))
        sys.exit(1)
