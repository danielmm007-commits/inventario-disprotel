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



def parse_huawei_description(desc):
    raw=str(desc or "").strip()
    out={"nombre_cliente_huawei":None,"zona_huawei":None,"nap_huawei":None,"auth_huawei":None}
    if not raw:
        return out
    parts=re.split(r"_zone_",raw,maxsplit=1,flags=re.IGNORECASE)
    name_raw=parts[0] if parts else raw
    rest=parts[1] if len(parts)>1 else ""
    name=" ".join(x for x in name_raw.replace("_"," ").split() if x).strip()
    if name:
        out["nombre_cliente_huawei"]=name
    zone_part=""
    if rest:
        zone_part=re.split(r"_descr_",rest,maxsplit=1,flags=re.IGNORECASE)[0]
    zone=" ".join(x for x in zone_part.replace("_"," ").split() if x).strip()
    if zone:
        out["zona_huawei"]=zone
        if zone.upper().startswith("NAP "):
            out["nap_huawei"]=zone
        else:
            m=re.search(r"\bNAP\b.*",zone,re.IGNORECASE)
            if m:
                out["nap_huawei"]=m.group(0).strip()
    m=re.search(r"_authd_(\d{8})",raw,re.IGNORECASE)
    if m:
        d=m.group(1)
        try:
            out["auth_huawei"]=f"{d[0:4]}-{d[4:6]}-{d[6:8]}"
        except Exception:
            pass
    return out


def parse_inventory_status(text):
    """Parsea estado + Description de 'display ont info 0 all'."""
    raw=str(text or "")
    rows=[]
    by_key={}
    rx=re.compile(
        r"(\d+/\s*\d+/\d+)\s+(\d+)\s+([0-9A-Fa-f]{16})\s+"
        r"(\S+)\s+(online|offline)\s+(\S+)\s+(\S+)\s+(\S+)",
        re.IGNORECASE
    )
    for line in raw.splitlines():
        m=rx.search(line)
        if not m:
            continue
        fsp=re.sub(r"\s+","",m.group(1))
        ont_id=int(m.group(2))
        key=(fsp,ont_id)
        if key in by_key:
            continue
        row={
            "fsp":fsp,
            "ont_id":ont_id,
            "sn":m.group(3).upper(),
            "control_flag":m.group(4).lower(),
            "run_state":m.group(5).lower(),
            "config_state":m.group(6).lower(),
            "match_state":m.group(7).lower(),
            "protect_side":m.group(8).lower(),
            "descripcion":None,
            "ip_descripcion":None,
        }
        by_key[key]=row
        rows.append(row)

    # Huawei imprime después una segunda tabla:
    # F/S/P   ONT-ID   Description
    # La descripción puede continuar en una o varias líneas indentadas.
    in_desc=False
    current_key=None
    desc_parts=[]
    desc_rx=re.compile(r"^\s*(\d+)\s*/\s*(\d+)\s*/\s*(\d+)\s+(\d+)\s{2,}(.*\S)?\s*$")

    def flush_description():
        nonlocal current_key,desc_parts
        if current_key is None:
            return
        row=by_key.get(current_key)
        if row is not None:
            # El salto de línea es sólo wrap del terminal Huawei: se concatena
            # sin insertar caracteres que no existían en el comentario original.
            desc="".join(desc_parts).strip()
            if desc:
                row["descripcion"]=desc
                ipm=re.search(r"(?<!\d)(?:\d{1,3}\.){3}\d{1,3}(?!\d)",desc)
                if ipm:
                    row["ip_descripcion"]=ipm.group(0)
                row.update(parse_huawei_description(desc))
        current_key=None
        desc_parts=[]

    for raw_line in raw.splitlines():
        line=re.sub(r"\x1b\[[0-9;?]*[A-Za-z]","",raw_line)
        if "F/S/P" in line and "ONT-ID" in line and "Description" in line:
            flush_description()
            in_desc=True
            continue
        if not in_desc:
            continue
        if "Press 'Q' to break" in line or "---- More" in line:
            continue
        m=desc_rx.match(line)
        if m:
            flush_description()
            fsp=f"{int(m.group(1))}/{int(m.group(2))}/{int(m.group(3))}"
            ont_id=int(m.group(4))
            current_key=(fsp,ont_id)
            first=(m.group(5) or "").strip()
            desc_parts=[first] if first else []
            continue
        if current_key is not None:
            stripped=line.strip()
            if not stripped or set(stripped)=={"-"}:
                continue
            if stripped.startswith("In port ") or stripped.endswith("#"):
                flush_description()
                if stripped.startswith("In port "):
                    continue
                break
            # Las líneas de continuación de Description llegan fuertemente
            # indentadas y no repiten F/S/P ni ONT-ID.
            if raw_line[:1].isspace():
                desc_parts.append(stripped)

    flush_description()
    return rows


def _num_or_none(value, as_int=False):
    text=str(value or "").strip()
    if not text or text=="-":
        return None
    try:
        return int(float(text)) if as_int else float(text)
    except Exception:
        return None


def parse_optical_all(text, frame, slot, port):
    rows=[]
    rx=re.compile(
        r"^\s*(\d+)\s+(-?\d+(?:\.\d+)?|-)\s+(-?\d+(?:\.\d+)?|-)\s+"
        r"(-?\d+(?:\.\d+)?|-)\s+(-?\d+(?:\.\d+)?|-)\s+"
        r"(-?\d+(?:\.\d+)?|-)\s+(-?\d+(?:\.\d+)?|-)\s+(\d+|-)\s*$"
    )
    read_at=datetime.now(timezone.utc).isoformat()
    for line in str(text or "").splitlines():
        m=rx.match(line)
        if not m:
            continue
        rows.append({
            "fsp":f"{frame}/{slot}/{port}",
            "ont_id":int(m.group(1)),
            "rx_optical_dbm":_num_or_none(m.group(2)),
            "tx_optical_dbm":_num_or_none(m.group(3)),
            "olt_rx_ont_dbm":_num_or_none(m.group(4)),
            "temperatura_c":_num_or_none(m.group(5)),
            "voltaje_v":_num_or_none(m.group(6)),
            "corriente_ma":_num_or_none(m.group(7)),
            "distancia_m":_num_or_none(m.group(8),as_int=True),
            "optica_leida_at":read_at,
        })
    return rows



def parse_optical_individual(text, frame, slot, port, ont_id):
    """Parsea display ont optical-info <port> <ont-id> de MA5600/MA5608 y compatibles."""
    raw=str(text or "")
    def field(label):
        m=re.search(r"^\s*"+re.escape(label)+r"\s*:\s*(.+?)\s*$",raw,re.MULTILINE|re.IGNORECASE)
        return m.group(1).strip() if m else None
    def n(label,as_int=False):
        v=field(label)
        if not v or v=="-":
            return None
        m=re.search(r"-?\d+(?:\.\d+)?",v)
        if not m:
            return None
        try:
            x=float(m.group(0))
            return int(round(x)) if as_int else x
        except Exception:
            return None
    rx=n("Rx optical power(dBm)")
    tx=n("Tx optical power(dBm)")
    olt_rx=n("OLT Rx ONT optical power(dBm)")
    temp=n("Temperature(C)")
    voltage=n("Voltage(V)")
    current=n("Laser bias current(mA)")
    # Algunas versiones no muestran distancia en optical-info individual.
    distance=n("ONT distance(m)",as_int=True)
    if rx is None and tx is None and olt_rx is None and temp is None and voltage is None:
        return None
    return {
        "fsp":f"{frame}/{slot}/{port}",
        "ont_id":int(ont_id),
        "rx_optical_dbm":rx,
        "tx_optical_dbm":tx,
        "olt_rx_ont_dbm":olt_rx,
        "temperatura_c":temp,
        "voltaje_v":voltage,
        "corriente_ma":current,
        "distancia_m":distance,
        "optica_leida_at":datetime.now(timezone.utc).isoformat(),
    }


def parse_alarm_state_all(text, frame, slot, port, known_ont_ids=None):
    read_at=datetime.now(timezone.utc).isoformat()
    rows={}
    for ont_id in known_ont_ids or []:
        rows[int(ont_id)]={
            "fsp":f"{frame}/{slot}/{port}",
            "ont_id":int(ont_id),
            "alarmas":[],
            "alarma_los":False,
            "alarma_dying_gasp":False,
            "alarma_config_recovery":False,
            "alarmas_leidas_at":read_at,
        }

    blocks=re.split(r"(?=\s*ONT ID\s*:)",str(text or ""))
    for block in blocks:
        m=re.search(r"ONT ID\s*:\s*(\d+)",block)
        if not m:
            continue
        ont_id=int(m.group(1))
        alarm_part=block.split("Active Alarm List",1)[1] if "Active Alarm List" in block else ""
        alarm_part=re.split(r"\n\s*-{5,}",alarm_part,maxsplit=1)[0]
        lines=[]
        current=""
        for raw in alarm_part.splitlines():
            line=raw.strip()
            if not line or line==":":
                continue
            numbered=re.match(r"^\(\d+\)\s*(.*)$",line)
            if numbered:
                if current:
                    lines.append(current.strip())
                current=numbered.group(1).strip()
            elif current:
                current+=" "+line
        if current:
            lines.append(current.strip())
        joined=" | ".join(lines).lower()
        rows[ont_id]={
            "fsp":f"{frame}/{slot}/{port}",
            "ont_id":ont_id,
            "alarmas":lines,
            "alarma_los":("losi/lobi" in joined or "distribute fiber is broken" in joined or "cannot receive expected optical signals from the ont" in joined),
            "alarma_dying_gasp":("dying-gasp" in joined or "dying gasp" in joined),
            "alarma_config_recovery":("configuration recovery fails" in joined),
            "alarmas_leidas_at":read_at,
        }
    return list(rows.values())



def _board_kind(board_name):
    name=str(board_name or "").upper()
    if not name:
        return ("DESCONOCIDA", None)
    if any(x in name for x in ("GPH","GPF","GPS","GPBD","GPFD","GPBH","GPHF","EPHF")):
        return ("PON", "GPON")
    if any(x in name for x in ("XGH","XGHD","TWED","XGSP","XG-PON","XGS")):
        return ("PON", "XG/XGS-PON")
    if any(x in name for x in ("MPLA","MPLB","MPU","SCUN","SCUH","SCUK")):
        return ("CONTROL/UPLINK", None)
    if any(x in name for x in ("PILA","PILD","POWER")):
        return ("ENERGIA", None)
    if any(x in name for x in ("ETH","OXH","NXE","XEHD","CIUA","EDSH")):
        return ("UPLINK/SERVICIO", None)
    return ("OTRA", None)


def parse_board_overview(text):
    """Parsea 'display board 0' sin asumir un modelo concreto de MA5800."""
    rows=[]
    seen=set()
    for raw in str(text or "").splitlines():
        line=re.sub(r"\x1b\[[0-9;?]*[A-Za-z]","",raw).strip()
        if not line or line.startswith("-") or "SlotID" in line or line.lower().startswith("command:"):
            continue
        m=re.match(r"^(\d+)\s+([A-Za-z][A-Za-z0-9_-]+)\s+([^\s]+)",line)
        if not m:
            continue
        slot=int(m.group(1)); board=m.group(2).strip(); status=m.group(3).strip()
        if slot in seen:
            continue
        seen.add(slot)
        role,tech=_board_kind(board)
        rows.append({
            "frame_id":0,
            "slot_id":slot,
            "board_name":board,
            "board_status":status,
            "board_role":role,
            "tecnologia":tech,
        })
    return rows


def parse_port_state_all(text, board_name=None, tecnologia=None):
    """Parsea bloques de 'display port state all' dentro de interface gpon."""
    raw=str(text or "")
    blocks=re.split(r"(?=\s*F/S/P\s+\d+/\d+/\d+)",raw)
    rows=[]
    def val(block,label):
        m=re.search(r"^\s*"+re.escape(label)+r"\s+(.+?)\s*$",block,re.MULTILINE|re.IGNORECASE)
        return m.group(1).strip() if m else None
    def numval(block,label):
        v=val(block,label)
        if v is None or v in ("-",""):
            return None
        m=re.search(r"-?\d+(?:\.\d+)?",v)
        if not m:
            return None
        try:return float(m.group(0))
        except Exception:return None
    for block in blocks:
        m=re.search(r"F/S/P\s+(\d+)\s*/\s*(\d+)\s*/\s*(\d+)",block,re.IGNORECASE)
        if not m:
            continue
        frame,slot,port=map(int,m.groups())
        tx=numval(block,"TX power(dBm)")
        # Algunos módulos reportan 21474836.47 como valor inválido.
        if tx is not None and abs(tx)>100:
            tx=None
        rows.append({
            "frame_id":frame,
            "slot_id":slot,
            "port_id":port,
            "board_name":board_name,
            "tecnologia":tecnologia,
            "optical_module_status":val(block,"Optical Module status"),
            "port_state":val(block,"Port state"),
            "laser_state":val(block,"Laser state"),
            "temperatura_c":numval(block,"Temperature(C)"),
            "tx_bias_ma":numval(block,"TX Bias current(mA)"),
            "voltaje_v":numval(block,"Supply Voltage(V)"),
            "tx_power_dbm":tx,
            "wavelength_nm":numval(block,"Wave length(nm)") or numval(block,"Wavelength(nm)"),
            "max_distance_km":numval(block,"Max Distance(Km)"),
            "raw_excerpt":"\n".join(block.strip().splitlines()[:35])[:4000],
        })
    return rows


async def _session_command(reader,writer,command,timeout=60):
    writer.write(command+"\n"); await writer.drain()
    response=""
    cr_sent=False
    loop=asyncio.get_running_loop()
    deadline=loop.time()+timeout
    while loop.time()<deadline:
        try:
            chunk=await asyncio.wait_for(reader.read(4096),timeout=8)
        except asyncio.TimeoutError:
            if response and cr_sent:
                continue
            if response:
                break
            continue
        if not chunk:
            break
        response+=chunk
        if "{ <cr>" in response and "Command:" not in response and not cr_sent:
            writer.write("\n"); await writer.drain(); await asyncio.sleep(0.1)
            cr_sent=True
            continue
        if "Press 'Q' to break" in chunk or "More" in chunk:
            writer.write(" "); await writer.drain(); await asyncio.sleep(0.03)
        # El prompt Huawei de cualquier modo termina en '#'.
        tail=response.rstrip()
        if tail.endswith("#"):
            break
    return response


async def configured_telemetry(cfg, inventory):
    """Potencias y alarmas masivas por PON para cualquier OLT Huawei configurada."""
    ports={}
    for row in inventory:
        parts=str(row.get("fsp") or "").split("/")
        if len(parts)!=3:
            continue
        try:
            frame,slot,port=map(int,parts)
        except Exception:
            continue
        ports.setdefault((frame,slot,port),[]).append(int(row.get("ont_id")))

    telemetry={}
    slots=sorted(set((f,s) for f,s,p in ports))
    for frame,slot in slots:
        reader=writer=None
        try:
            reader,writer=await open_configured_olt(cfg)
            await _session_command(reader,writer,"config",timeout=20)
            iface=await _session_command(reader,writer,f"interface gpon {frame}/{slot}",timeout=20)
            if "Unknown command" in iface or "Parameter error" in iface:
                raise RuntimeError(f"No se pudo entrar a GPON {frame}/{slot}")
            for f,s,port in sorted(k for k in ports if k[0]==frame and k[1]==slot):
                optical=await _session_command(reader,writer,f"display ont optical-info {port} all",timeout=90)
                bulk_items=parse_optical_all(optical,f,s,port)
                for item in bulk_items:
                    telemetry.setdefault((item["fsp"],item["ont_id"]),{}).update(item)

                # MA5608T/GPFD y otras generaciones pueden no entregar una tabla
                # compatible con "... optical-info <port> all". Si el parser masivo
                # no obtiene filas, consultamos cada ONT del PON con el comando
                # individual documentado por la propia CLI.
                if not bulk_items:
                    for ont_id in sorted(set(ports[(f,s,port)])):
                        individual=await _session_command(reader,writer,f"display ont optical-info {port} {ont_id}",timeout=30)
                        item=parse_optical_individual(individual,f,s,port,ont_id)
                        if item:
                            telemetry.setdefault((item["fsp"],item["ont_id"]),{}).update(item)

                alarms=await _session_command(reader,writer,f"display ont alarm-state {port} all",timeout=90)
                for item in parse_alarm_state_all(alarms,f,s,port,ports[(f,s,port)]):
                    telemetry.setdefault((item["fsp"],item["ont_id"]),{}).update(item)
        finally:
            if writer is not None:
                try: writer.close()
                except Exception: pass
    return list(telemetry.values())


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




async def configured_inventory(cfg):
    """Inventario autorizado completo. Solo lectura."""
    reader=writer=None
    try:
        reader,writer=await open_configured_olt(cfg)
        writer.write("display ont info 0 all\n"); await writer.drain()
        response=""
        prompt=str(cfg.get("prompt") or "").strip()
        while True:
            try:
                chunk=await asyncio.wait_for(reader.read(4096),timeout=20)
            except asyncio.TimeoutError:
                if response:
                    break
                raise
            if not chunk:
                break
            response+=chunk
            if "{ <cr>||<K> }:" in response and "Command:" not in response:
                writer.write("\n"); await writer.drain(); await asyncio.sleep(0.1)
            if "Press 'Q' to break" in chunk or "More" in chunk:
                writer.write(" "); await writer.drain(); await asyncio.sleep(0.05)
            if prompt and prompt in response:
                break
            if not prompt and response.rstrip().endswith("#"):
                break
        rows=parse_inventory_status(response)
        if not rows:
            raise RuntimeError("Huawei no devolvió ONTs autorizadas en el inventario.")
        return rows
    finally:
        if writer is not None:
            try:
                writer.close()
            except Exception:
                pass



async def configured_hardware(cfg, inventory):
    """Inventario físico de tarjetas y estado/óptica de puertos PON. Solo lectura."""
    reader=writer=None
    boards=[]
    ports=[]
    try:
        reader,writer=await open_configured_olt(cfg)
        await _session_command(reader,writer,"config",timeout=20)
        board_text=await _session_command(reader,writer,"display board 0",timeout=40)
        boards=parse_board_overview(board_text)

        inventory_slots=set()
        for row in inventory or []:
            parts=str(row.get("fsp") or "").split("/")
            if len(parts)==3:
                try: inventory_slots.add(int(parts[1]))
                except Exception: pass

        for board in boards:
            slot=int(board.get("slot_id"))
            role=str(board.get("board_role") or "")
            # Consultamos boards PON reconocidas y también slots observados en ONT,
            # para soportar nombres de tarjeta Huawei que todavía no conozcamos.
            if role!="PON" and slot not in inventory_slots:
                continue
            iface=await _session_command(reader,writer,f"interface gpon 0/{slot}",timeout=20)
            low=iface.lower()
            if "unknown command" in low or "parameter error" in low or "failure:" in low:
                continue
            state=await _session_command(reader,writer,"display port state all",timeout=90)
            parsed=parse_port_state_all(state,board.get("board_name"),board.get("tecnologia") or "GPON")
            if parsed:
                ports.extend(parsed)
                if board.get("board_role")!="PON":
                    board["board_role"]="PON"
                    board["tecnologia"]=board.get("tecnologia") or "GPON"
            # Volvemos a config para entrar limpiamente al siguiente slot.
            await _session_command(reader,writer,"quit",timeout=10)
        return {"boards":boards,"ports":ports}
    finally:
        if writer is not None:
            try: writer.close()
            except Exception: pass


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


_TELEMETRY_LAST_MONO={}


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
        inventory_saved=None
        telemetry_saved=None
        inventory=[]
        telemetry=[]

        # Inventario + telemetría para cualquier OLT Huawei activa devuelta por
        # scanner-list. De esta forma una nueva OLT se agrega desde
        # Configuración de OLT sin modificar de nuevo este agente.
        inventory=await configured_inventory(cfg)
        inventory_saved=olt_config_call("scanner-inventory-snapshot",{
            "olt_id":cfg.get("id"),
            "olt_codigo":cfg.get("codigo"),
            "olt_nombre":cfg.get("nombre"),
            "onts":inventory
        })
        telemetry_interval=max(300,int(os.environ.get("OLT_TELEMETRY_INTERVAL_SECONDS","900")))
        telemetry_key=str(cfg.get("id") or cfg.get("codigo") or "")
        telemetry_now=asyncio.get_running_loop().time()
        telemetry_last=_TELEMETRY_LAST_MONO.get(telemetry_key)
        telemetry_due=(telemetry_last is None) or ((telemetry_now-telemetry_last)>=telemetry_interval)
        if telemetry_due:
            telemetry=await configured_telemetry(cfg,inventory)
            # Evita una petición HTTP enorme: enviar en bloques de 250.
            saved_count=0
            for i in range(0,len(telemetry),250):
                part=olt_config_call("scanner-telemetry-snapshot",{
                    "olt_codigo":cfg.get("codigo"),
                    "rows":telemetry[i:i+250]
                }) or {}
                saved_count+=int(part.get("updated") or 0)
            telemetry_saved={"ok":True,"updated":saved_count,"interval_seconds":telemetry_interval}
            _TELEMETRY_LAST_MONO[telemetry_key]=asyncio.get_running_loop().time()
        else:
            telemetry_saved={"ok":True,"skipped":True,"reason":"INTERVALO_TELEMETRIA","interval_seconds":telemetry_interval}

        hardware_interval=max(3600,int(os.environ.get("OLT_HARDWARE_INTERVAL_SECONDS","86400")))
        hardware_age=cfg.get("hardware_age_seconds")
        hardware_due=(hardware_age is None) or (int(hardware_age)>=hardware_interval)
        hardware={"boards":[],"ports":[]}
        hardware_saved={"ok":True,"skipped":True,"reason":"CACHE_VIGENTE","age_seconds":hardware_age,"interval_seconds":hardware_interval}
        if hardware_due:
            hardware=await configured_hardware(cfg,inventory)
            hardware_saved=olt_config_call("scanner-hardware-snapshot",{
                "olt_codigo":cfg.get("codigo"),
                "boards":hardware.get("boards") or [],
                "ports":hardware.get("ports") or []
            })
        return {
            "ok":True,"read_only":True,
            "codigo":cfg.get("codigo"),"olt":cfg.get("nombre"),
            "pending_count":len(onts),
            "inventory_total":len(inventory) if inventory else None,
            "inventory_online":sum(1 for x in inventory if x.get("run_state")=="online") if inventory else None,
            "inventory_offline":sum(1 for x in inventory if x.get("run_state")=="offline") if inventory else None,
            "telemetry_refreshed":telemetry_due,
            "telemetry_rows":len(telemetry) if telemetry_due else None,
            "telemetry_los":sum(1 for x in telemetry if x.get("alarma_los") is True) if telemetry_due else None,
            "telemetry_dying_gasp":sum(1 for x in telemetry if x.get("alarma_dying_gasp") is True) if telemetry_due else None,
            "hardware_refreshed":hardware_due,
            "hardware_age_seconds":hardware_age,
            "hardware_boards":len(hardware.get("boards") or []) if hardware_due else None,
            "hardware_pon_ports":len(hardware.get("ports") or []) if hardware_due else None,
            "backend":saved,
            "inventory_backend":inventory_saved,
            "telemetry_backend":telemetry_saved,
            "hardware_backend":hardware_saved
        }
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
