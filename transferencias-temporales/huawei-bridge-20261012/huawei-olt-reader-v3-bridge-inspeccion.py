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
    desc = _field(text, r"Description\s*:\s*(.+)")
    if desc == "-":
        desc = None

    ip_descripcion = None
    if desc:
        ipm = re.search(r"(?<!\d)(?:\d{1,3}\.){3}\d{1,3}(?!\d)", desc)
        if ipm:
            ip_descripcion = ipm.group(0)

    found = (not not_found) and (
        ont_id != "-" or fsp != "-" or run_state != "-" or sn != "-"
    )
    result = {
        "found": found,
        "onu_sn": requested_sn.upper(),
        "ont_id": None if ont_id == "-" else ont_id,
        "pon": None if fsp == "-" else fsp,
        "run_state": None if run_state == "-" else run_state,
        "reported_sn": None if sn == "-" else sn,
        "descripcion": desc if found and desc else ("ONU configurada en OLT" if found else "ONU no encontrada en configuración OLT"),
        "ip_descripcion": ip_descripcion,
    }
    if desc:
        result.update(parse_huawei_description(desc))
    return result

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



async def configured_read_ont_by_sn(cfg, sn):
    """Lectura puntual LIVE de una ONU en la OLT configurada. Solo display/read-only."""
    requested=str(sn or "").strip().upper()
    if not requested:
        raise RuntimeError("SN vacío para consulta OLT.")
    reader=writer=None
    try:
        reader,writer=await open_configured_olt(cfg)
        info_text=await _session_command(reader,writer,f"display ont info by-sn {requested}",timeout=35)
        info=parse_ont_info_by_sn(info_text,requested)
        info["olt"]=cfg.get("nombre")
        info["olt_codigo"]=cfg.get("codigo")
        info["read_at"]=datetime.now(timezone.utc).isoformat()
        if not info.get("found"):
            return info

        fsp=str(info.get("pon") or "").strip()
        parts=fsp.split("/")
        try:
            ont_id=int(info.get("ont_id"))
        except Exception:
            ont_id=None
        if len(parts)==3 and ont_id is not None:
            frame,slot,port=(int(parts[0]),int(parts[1]),int(parts[2]))
            await _session_command(reader,writer,"config",timeout=15)
            iface=await _session_command(reader,writer,f"interface gpon {frame}/{slot}",timeout=15)
            low=iface.lower()
            if not any(x in low for x in ("unknown command","parameter error","failure:")):
                optical=await _session_command(reader,writer,f"display ont optical-info {port} {ont_id}",timeout=30)
                op=parse_optical_individual(optical,frame,slot,port,ont_id)
                if op:
                    info.update({
                        "rx_optical_dbm":op.get("rx_optical_dbm"),
                        "tx_optical_dbm":op.get("tx_optical_dbm"),
                        "olt_rx_ont_dbm":op.get("olt_rx_ont_dbm"),
                        "temperatura_c":op.get("temperatura_c"),
                        "voltaje_v":op.get("voltaje_v"),
                        "corriente_ma":op.get("corriente_ma"),
                        "distancia_m":op.get("distancia_m"),
                        "optica_leida_at":op.get("optica_leida_at"),
                    })
        return info
    finally:
        if writer is not None:
            try: writer.close()
            except Exception: pass


def detector_call_for_olt(action, olt_codigo, payload=None):
    import urllib.request
    base=os.environ.get("SUPABASE_URL","https://ajnbswrwnjpjypjiorye.supabase.co").rstrip("/")
    token=os.environ.get("DETECTOR_TOKEN","")
    if not token:
        raise RuntimeError("Falta DETECTOR_TOKEN.")
    data={"action":action,"olt_codigo":str(olt_codigo or "").strip().upper()}
    if payload:
        data.update(payload)
    req=urllib.request.Request(
        base+"/functions/v1/inventario-onu-detector",
        data=json.dumps(data).encode(),
        headers={"Authorization":"Bearer "+token,"Content-Type":"application/json","Accept":"application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req,timeout=20) as resp:
        raw=resp.read().decode("utf-8")
        return json.loads(raw) if raw else {"ok":True}


async def process_configured_live_requests(cfg):
    codigo=str(cfg.get("codigo") or "").strip().upper()
    pending=detector_call_for_olt("scanner-live-pending",codigo) or {}
    rows=pending.get("solicitudes") or []
    results=[]
    for row in rows:
        req_id=str(row.get("id") or "")
        sn=str(row.get("onu_sn") or "").strip().upper()
        if not req_id or not sn:
            continue
        try:
            info=await configured_read_ont_by_sn(cfg,sn)
            sent=detector_call_for_olt("scanner-live-result",codigo,{
                "id":req_id,"ok":True,"resultado":info
            }) or {}
            results.append({"id":req_id,"sn":sn,"ok":True,"backend":sent})
        except Exception as exc:
            try:
                detector_call_for_olt("scanner-live-result",codigo,{"id":req_id,"ok":False,"error":str(exc)})
            except Exception:
                pass
            results.append({"id":req_id,"sn":sn,"ok":False,"error":str(exc)})
    return {"pending_count":len(rows),"results":results}


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


# ===== REALTIME HUAWEI V2 =====
# Solo lectura. No modifica comandos de la OLT ni el inventario.
import ctypes
from ctypes import wintypes
from pathlib import Path as _Path
import urllib.request as _urllib_request
import time as _time

HUAWEI_REALTIME_TOPIC='realtime:disprotel:huawei:trabajos'
HUAWEI_REALTIME_KEY=os.environ.get('SUPABASE_PUBLISHABLE_KEY','sb_publishable_PUj8G-mCFGniennS16O7UQ_eIeL482Y')
HUAWEI_REALTIME_EMAIL=os.environ.get('REALTIME_EMAIL','danielmm007+scanner@gmail.com')
HUAWEI_AUTH_STORE=_Path(os.environ.get('LOCALAPPDATA',str(_Path.home()))) / 'DISPROTEL' / 'scanner_realtime_auth.bin'

class _HuaweiBlob(ctypes.Structure):
    _fields_=[('cbData',wintypes.DWORD),('pbData',ctypes.POINTER(ctypes.c_byte))]

def _huawei_dpapi_password():
    if os.name!='nt':
        raise RuntimeError('Credencial DPAPI solo disponible en la PC Windows')
    raw=HUAWEI_AUTH_STORE.read_bytes()
    mem=ctypes.create_string_buffer(raw)
    source=_HuaweiBlob(len(raw),ctypes.cast(mem,ctypes.POINTER(ctypes.c_byte)))
    target=_HuaweiBlob()
    if not ctypes.windll.crypt32.CryptUnprotectData(ctypes.byref(source),None,None,None,None,0x01,ctypes.byref(target)):
        raise ctypes.WinError()
    try:
        return ctypes.string_at(target.pbData,target.cbData).decode('utf-8')
    finally:
        ctypes.windll.kernel32.LocalFree(target.pbData)

def _huawei_auth_call(grant,password_or_refresh):
    base=os.environ.get('SUPABASE_URL','https://ajnbswrwnjpjypjiorye.supabase.co').rstrip('/')
    if grant=='password':
        payload={'email':HUAWEI_REALTIME_EMAIL,'password':password_or_refresh}
    else:
        payload={'refresh_token':password_or_refresh}
    req=_urllib_request.Request(
        base+'/auth/v1/token?grant_type='+grant,
        data=json.dumps(payload).encode(),
        headers={'apikey':HUAWEI_REALTIME_KEY,'Content-Type':'application/json'},method='POST')
    with _urllib_request.urlopen(req,timeout=20) as resp:
        return json.loads(resp.read().decode())

async def _huawei_realtime_events(event, state):
    from websockets.asyncio.client import connect
    base=os.environ.get('SUPABASE_URL','https://ajnbswrwnjpjypjiorye.supabase.co').rstrip('/')
    url=base.replace('https://','wss://')+'/realtime/v1/websocket?apikey='+HUAWEI_REALTIME_KEY+'&vsn=1.0.0'
    auth=None
    while True:
        try:
            if auth is None:
                password=await asyncio.to_thread(_huawei_dpapi_password)
                try: auth=await asyncio.to_thread(_huawei_auth_call,'password',password)
                finally: del password
            else:
                auth=await asyncio.to_thread(_huawei_auth_call,'refresh_token',auth['refresh_token'])
            expiry=_time.monotonic()+max(60,int(auth.get('expires_in',3600))-180)
            async with connect(url,additional_headers={'apikey':HUAWEI_REALTIME_KEY},ping_interval=20,open_timeout=15) as ws:
                await ws.send(json.dumps({'topic':HUAWEI_REALTIME_TOPIC,'event':'phx_join','payload':{'config':{'private':True,'broadcast':{'ack':False,'self':False}},'access_token':auth['access_token']},'ref':'1'}))
                joined=False
                hb=_time.monotonic()+20
                join_limit=_time.monotonic()+15
                while _time.monotonic()<expiry:
                    now=_time.monotonic()
                    if not joined and now>join_limit: raise RuntimeError('Tiempo agotado al conectar canal Huawei')
                    if now>=hb:
                        await ws.send(json.dumps({'topic':'phoenix','event':'heartbeat','payload':{},'ref':'hb'}))
                        hb=now+20
                    try: message=json.loads(await asyncio.wait_for(ws.recv(),timeout=1))
                    except asyncio.TimeoutError: continue
                    typ=message.get('event')
                    if typ=='phx_reply' and message.get('ref')=='1':
                        if (message.get('payload') or {}).get('status')!='ok':
                            raise RuntimeError('Sin permiso para canal privado Huawei')
                        joined=True
                        state['connected']=True
                        event.set()  # recuperar solicitudes al conectar/reconectar
                        print(json.dumps({'ok':True,'huawei_realtime':'CONECTADO'}),flush=True)
                    elif typ=='broadcast' and joined:
                        p=message.get('payload') or {}
                        if p.get('event')=='trabajo_olt_pendiente':
                            event.set()
                    elif typ in ('phx_error','phx_close'):
                        raise RuntimeError('WebSocket Huawei cerrado')
            state['connected']=False
        except asyncio.CancelledError:
            state['connected']=False
            raise
        except Exception as exc:
            state['connected']=False
            print(json.dumps({'ok':False,'huawei_realtime':'RECONECTANDO','error':str(exc)}),flush=True)
            # Aun desconectado, el ciclo local usa sondeo LIVE a 5s.
            # Ante fallo de refresh se vuelve a autenticar desde DPAPI.
            auth=None
            await asyncio.sleep(5)

async def multi_olt_service_loop():
    # Tres tareas independientes: Realtime, LIVE y mantenimiento.
    # Las operaciones síncronas HTTP/Telnet se ejecutan fuera del event loop
    # para evitar bloquear la recepción del WebSocket.
    tick=max(2,int(os.environ.get("OLT_MULTI_TICK_SECONDS","5")))
    config_interval=max(30,int(os.environ.get("OLT_CONFIG_REFRESH_SECONDS","300")))
    tests_interval=max(5,int(os.environ.get("OLT_TEST_REFRESH_SECONDS","30")))
    rt_enabled=os.environ.get("OLT_REALTIME_MODE","1")=="1"
    rt_event=asyncio.Event()
    rt_state={"connected":False}
    olts=[]
    # No se sobrecarga la OLT con múltiples inventarios simultáneos.
    inventory_jobs={}
    schedule={}
    limits={}
    stop=asyncio.Event()

    async def execute_live(cfg):
        codigo=str(cfg.get("codigo") or "")
        # to_thread: el HTTP síncrono nunca bloquea el WebSocket ni otras tareas.
        # La consulta LIVE abre una conexión Telnet individual independiente.
        try:
            result=await asyncio.to_thread(lambda: asyncio.run(process_configured_live_requests(cfg)))
            if result.get("pending_count"):
                print(json.dumps({"ok":True,"codigo":codigo,"trigger":"CONSULTA_CLIENTE_LIVE", "consultas_live":result},ensure_ascii=False),flush=True)
        except Exception as exc:
            print(json.dumps({"ok":False,"fase":"LIVE","codigo":codigo,"error":str(exc)},ensure_ascii=False),flush=True)




# ================================================================
# PROVISIONAMIENTO BRIDGE (INACTIVO EN PRODUCCION)
#
# Requiere simultaneamente:
#   1. Aprobacion de supervisor y perfil completo/validado en Supabase
#   2. HUAWEI_ONU_WRITES_ENABLED=true en el servidor
#   3. OLT_ONU_WRITES_ENABLED=1 en PC Scanner
# Se trabaja en una sesion Telnet independiente al inventario de V3.
# NUNCA configurar IP administrativa dentro de la ONU.
# ================================================================
def _onu_bridge_profile(job):
    if not isinstance(job,dict) or not isinstance(job.get("perfil"),dict):
        raise ValueError("Falta perfil GPON aprobado")
    p=job["perfil"]
    serial=str(job.get("onu_sn") or "").strip().upper()
    fsp=str(job.get("onu_pon") or "").strip()
    match=re.fullmatch(r"(\d{1,2})/(\d{1,2})/(\d{1,2})",fsp)
    if not re.fullmatch(r"[0-9A-F]{16}",serial) or not match:
        raise ValueError("Serial o puerto PON Huawei no validos")
    frame,slot,port=map(int,match.groups())
    if frame>31 or slot>31 or port>31:
        raise ValueError("PON fuera de rango")
    if str(p.get("tipo_onu") or "").upper()!="BRIDGE":
        raise ValueError("Autorizacion no permitida para WIFI o CATV")
    if str(p.get("modelo_clave") or "").upper()!=str(job.get("onu_modelo") or "").upper():
        raise ValueError("Modelo de ONU no coincide con su perfil")
    if p.get("habilitado") is not True:
        raise ValueError("El perfil aun no esta habilitado por revision tecnica")
    integer={}
    fields={"vlan_servicio":(1,4094),"vlan_usuario":(1,4094),
            "line_profile_id":(0,4095),"service_profile_id":(0,4095),
            "gemport":(0,4095),"traffic_in_id":(0,2147483647),
            "traffic_out_id":(0,2147483647)}
    for key,(lo,hi) in fields.items():
        val=p.get(key)
        if not isinstance(val,int) or isinstance(val,bool) or not lo<=val<=hi:
            raise ValueError("Perfil incompleto o invalido: "+key)
        integer[key]=val
    tag=str(p.get("tag_transform") or "").lower()
    if tag!="translate":
        raise ValueError("Se requiere confirmar tag-transform translate en Huawei antes de habilitar otros modos")
    for key in ("nombre","nap","zona"):
        if any(c in str(job.get(key) or "") for c in ("\r","\n","\"","'",";","\x1b")):
            raise ValueError("Caracteres peligrosos en descripcion administrativa")
    # El texto es exclusivamente nombre/sector/NAP. La IP nunca se envía a Huawei.
    clean=lambda x: re.sub(r"[^A-Za-z0-9_-]","_",str(x or "").strip()).strip("_")[:32]
    name=clean(job.get("nombre"))
    zone=clean(job.get("zona"))
    nap=clean(job.get("nap"))
    if not name or not (nap or zone):
        raise ValueError("Se requiere nombre y NAP o zona")
    desc=(name+("_zone_"+zone if zone else "")+("_NAP_"+nap if nap else ""))[:75]
    add=f'ont add {port} sn-auth "{serial}" omci ont-lineprofile-id {integer["line_profile_id"]} ont-srvprofile-id {integer["service_profile_id"]} desc "{desc}"'
    return {"frame":frame,"slot":slot,"port":port,"fsp":fsp,
            "serial":serial,"profile":integer,"description":desc,
            "ont_add_command":add,"tag":tag}


def _onu_parse_added_id(response):
    raw=str(response or "")
    if _bridge_invalid(raw) or re.search(r"(?i)(^\s*%.*(?:error|invalid)|too many parameters|unknown command|already exists)",raw,re.M):
        raise RuntimeError("Huawei rechazo el registro de la ONU")
    if not re.search(r"(?i)(success\s*:\s*1\b|added?\s+successfully|successfully\s+added)",raw):
        raise RuntimeError("No se confirmo exito del ont add; verificar manualmente antes de reintentar")
    m=re.search(r"(?im)^\s*(?:ONT\s*-?\s*ID|ONTID)\s*:\s*(\d+)\s*$",raw)
    if not m:
        raise RuntimeError("ONT agregado posiblemente, pero Huawei no devolvio ONT-ID; requiere verificacion manual")
    return int(m.group(1))


def _onu_service_command(params,ont_id):
    if not isinstance(ont_id,int) or not (0<=ont_id<=1023):
        raise ValueError("ONT-ID no valido")
    p=params["profile"]
    return (f'service-port vlan {p["vlan_servicio"]} gpon {params["fsp"]} '
            f'ont {ont_id} gemport {p["gemport"]} multi-service '
            f'user-vlan {p["vlan_usuario"]} tag-transform {params["tag"]} '
            f'inbound traffic-table index {p["traffic_in_id"]} '
            f'outbound traffic-table index {p["traffic_out_id"]}')


def onu_bridge_dry_run(job,ont_id_ejemplo=0):
    """Genera comandos para revision tecnica. NO se conecta ni ejecuta Huawei."""
    params=_onu_bridge_profile(job)
    return {"solo_previsualizacion":True,"escrituras_ejecutadas":0,
            "ip_incluida":False,"tipo":"BRIDGE",
            "comandos":[f'interface gpon {params["frame"]}/{params["slot"]}',
                        params["ont_add_command"],"quit",
                        _onu_service_command(params,ont_id_ejemplo)],
            "advertencia":"ONT-ID del service-port es provisional: Huawei debe devolver el ONT-ID real."}


async def onu_bridge_apply_controlled(cfg,job):
    """Solo después de doble habilitacion; nunca se llama desde lectura normal."""
    if os.environ.get("OLT_ONU_WRITES_ENABLED","0")!="1":
        raise PermissionError("Escrituras ONU deshabilitadas localmente")
    params=_onu_bridge_profile(job)
    if str(cfg.get("codigo") or "").upper()!=str(job.get("olt_codigo") or "").upper():
        raise ValueError("OLT de la orden no coincide con el agente")
    reader=writer=None
    steps=[]
    ont_added=None
    try:
        reader,writer=await open_configured_olt(cfg)
        async def issue(command,timeout=50):
            result=await _session_command(reader,writer,command,timeout=timeout)
            if _bridge_invalid(result) or re.search(r"(?i)(^\s*%.*(?:error|invalid)|too many parameters|unknown command|parameter error)",result,re.M):
                raise RuntimeError("Huawei rechazo un comando de provisioning")
            if not result.rstrip().endswith("#"):
                raise RuntimeError("Prompt Huawei no confirmado; requiere revision manual")
            return result
        await issue("config",20)
        autofind=await issue("display ont autofind all",70)
        matches=[x for x in parse_autofind(autofind)
                 if str(x.get("sn") or "").upper()==params["serial"]
                 and re.sub(r"\s+","",str(x.get("fsp") or ""))==params["fsp"]]
        if len(matches)!=1:
            raise RuntimeError("La ONU ya no figura exactamente una vez en autofind")
        await issue(f'interface gpon {params["frame"]}/{params["slot"]}',20)
        inv=await issue(f'display ont info {params["port"]} all',65)
        existing=parse_inventory_status(inv)
        if any(x.get("sn")==params["serial"] for x in existing):
            raise RuntimeError("ONU ya registrada en PON; evitar duplicado")
        # Primer comando de escritura: si la respuesta es incierta no hay reintento automatico.
        add_resp=await issue(params["ont_add_command"],70)
        ont_added=_onu_parse_added_id(add_resp)
        steps.append("ont_add")
        await issue("quit",20)
        # Segundo comando de escritura: se usa el ONT-ID devuelto por Huawei.
        service_cmd=_onu_service_command(params,ont_added)
        sv_resp=await issue(service_cmd,70)
        if not re.search(r"(?i)(success|service-port|^\s*%?\s*command)",sv_resp):
            raise RuntimeError("Service-port no confirmado; revisar manualmente")
        steps.append("service_port")
        # La verificacion se hace en vivo y en la misma sesion independiente.
        svc=await issue(f'display service-port port {params["fsp"]} ont {ont_added}',45)
        profile=params["profile"]
        # Verificar en una sola fila: VLAN, F/S/P, ONT-ID, GEM, VLAN de usuario, RX, TX y UP.
        port_pattern=(
            r"^\\s*\\d+\\s+"+str(profile["vlan_servicio"])+
            r"\\s+\\S+\\s+gpon\\s+"+str(params["frame"])+
            r"\\s*/\\s*"+str(params["slot"])+r"\\s*/\\s*"+str(params["port"])+
            r"\\s+"+str(ont_added)+r"\\s+"+str(profile["gemport"])+
            r"\\s+vlan\\s+"+str(profile["vlan_usuario"])+
            r"\\s+"+str(profile["traffic_in_id"])+
            r"\\s+"+str(profile["traffic_out_id"])+r"\\s+up\\s*$"
        )
        if not any(re.search(port_pattern,row,re.I) for row in svc.splitlines()):
            raise RuntimeError("La OLT no confirma VLAN/GEM/traffic table/UP del service-port")
        await issue(f'interface gpon {params["frame"]}/{params["slot"]}',20)
        verified=False
        for i in range(12):
            info=await issue(f'display ont info {params["port"]} {ont_added}',35)
            snm=re.search(r"(?im)^\s*SN\s*:\s*([A-Fa-f0-9]{16})\b",info)
            online=bool(re.search(r"(?im)^\s*Run state\s*:\s*online\b",info))
            if snm and snm.group(1).upper()!=params["serial"]:
                raise RuntimeError("Huawei devolvio otro serial: requiere investigacion")
            if snm and online:
                verified=True
                break
            await asyncio.sleep(10)
        if not verified:
            raise RuntimeError("ONU creada, pero aun no figura ONLINE; requiere revision manual")
        # NO se hace save por defecto, pues puede pedir confirmación interactiva.
        return {"verified_online":True,"serial_verificado":params["serial"],"ont_id":ont_added,
                "guardado_permanente":False,"motivo":"Provisionamiento verificado en running-config; guardar persistencia Huawei en ventana aprobada"}
    except Exception as exc:
        # Jamás borrar/crear ONT automáticamente para recuperarse de fallo parcial.
        raise RuntimeError("Autorizacion incompleta; sin reintento automatico; pasos="+",".join(steps)+
                           ("; ONT-ID="+str(ont_added) if ont_added is not None else "")+
                           "; detalle="+str(exc)) from exc
    finally:
        if writer is not None:
            try: writer.close()
            except Exception: pass

# ================================================================
# AUTORIZACIONES MANUALES: LECTURA DE COLA, SIN ESCRITURA HUAWEI
# No se mezcla con CONFIRMADO (evidencia SmartOLT).
# Aun cuando una ONU este aprobada, NO se ejecuta 'ont add'.
# ================================================================
def leer_autorizaciones_manual_aprobadas(olt_codigo):
    import urllib.request
    code=str(olt_codigo or "").strip().upper()
    if not re.fullmatch(r"[A-Z0-9_-]{2,32}",code):
        raise ValueError("OLT no permitida")
    token=os.environ.get("DETECTOR_TOKEN","")
    if not token:
        raise RuntimeError("Falta token de agente")
    base=os.environ.get("SUPABASE_URL","https://ajnbswrwnjpjypjiorye.supabase.co").rstrip("/")
    payload=json.dumps({"action":"scanner-pending","olt_codigo":code}).encode("utf-8")
    req=urllib.request.Request(
        base+"/functions/v1/inventario-onu-autorizacion-scanner",
        data=payload,
        headers={"Authorization":"Bearer "+token,"Content-Type":"application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req,timeout=20) as resp:
        data=json.loads(resp.read().decode("utf-8"))
    if data.get("ok") is not True:
        raise RuntimeError("Error al leer cola de autorización")
    return data

    async def bridge_local_worker():
        """Solicitud local opcional de lectura GPON, no genera sondeo a Supabase."""
        basedir=_Path(os.environ.get("LOCALAPPDATA",str(_Path.home()))) / "DISPROTEL" / "bridge_inspeccion"
        try:
            basedir.mkdir(parents=True,exist_ok=True)
        except Exception as exc:
            print(json.dumps({"fase":"BRIDGE_INSPECT_SETUP","error":str(exc)}),flush=True)
            return
        request=basedir / "solicitud.json"
        processing=basedir / "solicitud.procesando"
        output=basedir / "resultado.json"
        while not stop.is_set():
            if request.is_file():
                try:
                    request.replace(processing)
                    data=json.loads(processing.read_text(encoding="utf-8"))
                    code=str(data.get("olt_codigo") or "").strip().upper()
                    pon=str(data.get("pon") or "").strip()
                    result=await asyncio.to_thread(lambda: asyncio.run(bridge_inspect(code,pon)))
                    temp=output.with_suffix(".tmp")
                    temp.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding="utf-8")
                    temp.replace(output)
                    print(json.dumps({"fase":"BRIDGE_INSPECT_OK","olt_codigo":code,"pon":pon,
                                      "onu_revisadas":len(result.get("onu_revisadas",[]))},ensure_ascii=False),flush=True)
                except Exception as exc:
                    result={"ok":False,"solo_lectura":True,"error":str(exc)}
                    try:
                        output.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding="utf-8")
                    except Exception:
                        pass
                    print(json.dumps({"fase":"BRIDGE_INSPECT_ERROR","error":str(exc)}),flush=True)
                finally:
                    try: processing.unlink(missing_ok=True)
                    except Exception: pass
            try:
                await asyncio.wait_for(stop.wait(),timeout=2)
            except asyncio.TimeoutError:
                pass

    async def live_worker():
        # La cola LIVE permanece atendible mientras un inventario tarda minutos.
        while not stop.is_set():
            try:
                now=asyncio.get_running_loop().time()
                wake=rt_event.is_set()
                rt_event.clear()
                # Respaldo conservador: 5s cuando no hay Realtime, 30s conectado.
                if wake or now>=limits.get("next_live",0) or not rt_state['connected']:
                    limits['next_live']=now+(30 if rt_enabled and rt_state['connected'] else tick)
                    for cfg in list(olts):
                        await execute_live(cfg)
            except Exception as exc:
                print(json.dumps({"ok":False,"fase":"LIVE_WORKER","error":str(exc)},ensure_ascii=False),flush=True)
            try:
                await asyncio.wait_for(rt_event.wait(),timeout=tick)
            except asyncio.TimeoutError:
                pass

    async def inventory_worker(cfg):
        codigo=str(cfg.get('codigo') or '')
        start=asyncio.get_running_loop().time()
        print(json.dumps({"ok":True,"fase":"INVENTARIO_INICIO","codigo":codigo},ensure_ascii=False),flush=True)
        try:
            # No asyncio.wait_for: cancelaría la espera pero no el hilo Telnet.
            # Impedimos iniciar otro inventario mientras el anterior siga vivo.
            result=await asyncio.to_thread(lambda: asyncio.run(poll_configured_olt(cfg)))
            print(json.dumps(result,ensure_ascii=False),flush=True)
        except Exception as exc:
            print(json.dumps({"ok":False,"fase":"INVENTARIO","codigo":codigo,"error":str(exc)},ensure_ascii=False),flush=True)
        finally:
            print(json.dumps({"fase":"INVENTARIO_FIN","codigo":codigo,
                "segundos":round(asyncio.get_running_loop().time()-start,1)},ensure_ascii=False),flush=True)

    rt_task=asyncio.create_task(_huawei_realtime_events(rt_event,rt_state)) if rt_enabled else None
    live_task=asyncio.create_task(live_worker())
    bridge_task=asyncio.create_task(bridge_local_worker())
    print(json.dumps({"ok":True,"multi_olt":True,"read_only":True,
        "message":"Huawei V3: LIVE independiente de inventario",
        "tick_seconds":tick,"config_refresh_seconds":config_interval,
        "test_refresh_seconds":tests_interval},ensure_ascii=False),flush=True)
    next_cfg=next_tests=0.0
    try:
        while True:
            now=asyncio.get_running_loop().time()
            if now>=next_cfg:
                try:
                    data=await asyncio.to_thread(olt_config_call,"scanner-list")
                    if data and data.get('ok') is not False:
                        fresh=data.get('olts') or []
                        old={str(x.get('id')):x for x in olts}
                        olts[:]=fresh
                        for i,cfg in enumerate(fresh):
                            oid=str(cfg.get('id') or '')
                            if oid not in schedule:
                                seconds=max(60,int(cfg.get('intervalo_seg') or 300))
                                schedule[oid]=now+i*seconds/max(1,len(fresh))
                        rt_event.set()  # detectar solicitudes incluso tras reconexión
                        # Consulta de autorizaciones acoplada al refresco 5 min existente.
                        # No agrega sondeo cada 5 s, y jamás escribe a las OLT.
                        if os.environ.get("OLT_MANUAL_AUTORIZACIONES_PREVIEW","0")=="1":
                            for cfg_ap in fresh:
                                codigo_ap=str(cfg_ap.get("codigo") or "").strip().upper()
                                try:
                                    cola_ap=await asyncio.to_thread(leer_autorizaciones_manual_aprobadas,codigo_ap)
                                    items_ap=cola_ap.get("jobs") or []
                                    resumen_ap={"fase":"ONU_APROBADAS_PREVIEW","olt":codigo_ap,
                                                "cantidad":len(items_ap),
                                                "listas":sum(1 for x in items_ap if x.get("listo") is True),
                                                "bloqueadas":[{"motivo":x.get("motivo")} for x in items_ap if x.get("listo") is not True],
                                                "ejecucion":False}
                                    if items_ap:
                                        print(json.dumps(resumen_ap,ensure_ascii=False),flush=True)
                                except Exception as exc:
                                    print(json.dumps({"fase":"ONU_APROBADAS_PREVIEW_ERROR","olt":codigo_ap,
                                                      "error":str(exc)},ensure_ascii=False),flush=True)
                        print(json.dumps({"fase":"CONFIG_OK","olts":[x.get('codigo') for x in fresh]},ensure_ascii=False),flush=True)
                    next_cfg=asyncio.get_running_loop().time()+config_interval
                except Exception as exc:
                    print(json.dumps({"fase":"CONFIG_ERROR","error":str(exc)},ensure_ascii=False),flush=True)
                    next_cfg=asyncio.get_running_loop().time()+30
            if now>=next_tests:
                try:
                    tests=await asyncio.to_thread(lambda: asyncio.run(handle_olt_test_queue()))
                    if tests:print(json.dumps({"trigger":"PRUEBAS_OLT","tests":tests},ensure_ascii=False),flush=True)
                except Exception as exc:
                    print(json.dumps({"fase":"PRUEBAS_OLT","error":str(exc)},ensure_ascii=False),flush=True)
                next_tests=asyncio.get_running_loop().time()+tests_interval
            for cfg in list(olts):
                oid=str(cfg.get('id') or '')
                if not oid: continue
                job=inventory_jobs.get(oid)
                if job and not job.done():
                    continue
                if now>=schedule.get(oid,now):
                    interval=max(60,int(cfg.get('intervalo_seg') or 300))
                    inventory_jobs[oid]=asyncio.create_task(inventory_worker(cfg))
                    schedule[oid]=now+interval
            await asyncio.sleep(tick)
    finally:
        stop.set()
        live_task.cancel()
        bridge_task.cancel()
        if rt_task:rt_task.cancel()
        for task in inventory_jobs.values():task.cancel()


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
    if len(sys.argv)>=2 and sys.argv[1]=="--bridge-inspect":
        if len(sys.argv)!=4:
            print("Uso: --bridge-inspect CODIGO_OLT F/S/P",flush=True)
            return 2
        try:
            resultado=await bridge_inspect(sys.argv[2],sys.argv[3])
            print(json.dumps(resultado,ensure_ascii=False,indent=2),flush=True)
            return 0 if resultado.get("ok") else 1
        except Exception as exc:
            print(json.dumps({"ok":False,"solo_lectura":True,"error":str(exc)},ensure_ascii=False),flush=True)
            return 1
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



# Windows: evita que la selección de texto (QuickEdit) suspenda todo el lector.
def _huawei_disable_console_quickedit():
    if os.name != "nt":
        return
    try:
        import ctypes
        from ctypes import wintypes
        kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
        kernel32.GetStdHandle.argtypes = [wintypes.DWORD]
        kernel32.GetStdHandle.restype = wintypes.HANDLE
        kernel32.GetConsoleMode.argtypes = [wintypes.HANDLE, ctypes.POINTER(wintypes.DWORD)]
        kernel32.GetConsoleMode.restype = wintypes.BOOL
        kernel32.SetConsoleMode.argtypes = [wintypes.HANDLE, wintypes.DWORD]
        kernel32.SetConsoleMode.restype = wintypes.BOOL
        STD_INPUT_HANDLE = 0xFFFFFFF6
        ENABLE_QUICK_EDIT_MODE = 0x0040
        ENABLE_EXTENDED_FLAGS = 0x0080
        handle = kernel32.GetStdHandle(STD_INPUT_HANDLE)
        mode = wintypes.DWORD()
        if kernel32.GetConsoleMode(handle, ctypes.byref(mode)):
            new_mode = (mode.value | ENABLE_EXTENDED_FLAGS) & ~ENABLE_QUICK_EDIT_MODE
            if kernel32.SetConsoleMode(handle, new_mode):
                print('HUAWEI: QuickEdit desactivado; seleccionar texto no pausa el lector', flush=True)
    except Exception as exc:
        print('HUAWEI: no se pudo modificar QuickEdit: ' + str(exc), flush=True)

# Registro local con rotación: conserva salida de consola y añade un archivo.
def _huawei_setup_log():
    import io
    import logging
    from logging.handlers import RotatingFileHandler
    from pathlib import Path
    import threading

    class ConsoleAndLog(io.TextIOBase):
        def __init__(self, stream, logger, level):
            self.stream, self.logger, self.level = stream, logger, level
            self.lock = threading.RLock()
            self.partial = ""

        def write(self, msg):
            with self.lock:
                self.stream.write(msg)
                self.stream.flush()
                self.partial += msg
                while "\n" in self.partial:
                    line, self.partial = self.partial.split("\n", 1)
                    if line.strip():
                        try:
                            self.logger.log(self.level, line.rstrip("\r"))
                        except Exception:
                            pass
            return len(msg)

        def flush(self):
            with self.lock:
                self.stream.flush()
                if self.partial.strip():
                    try:
                        self.logger.log(self.level, self.partial.rstrip("\r"))
                    except Exception:
                        pass
                self.partial = ""

        def isatty(self):
            return self.stream.isatty()

        @property
        def encoding(self):
            return self.stream.encoding

    try:
        base = Path(os.environ.get('LOCALAPPDATA') or Path.home()) / 'DISPROTEL' / 'logs'
        base.mkdir(parents=True, exist_ok=True)
        path = base / 'huawei-lector.log'
        logger = logging.getLogger('disprotel.huawei.console')
        logger.setLevel(logging.INFO)
        logger.propagate = False
        logger.handlers.clear()
        handler = RotatingFileHandler(path, maxBytes=5*1024*1024, backupCount=3, encoding='utf-8')
        handler.setFormatter(logging.Formatter('%(asctime)s | %(levelname)s | %(message)s'))
        logger.addHandler(handler)
        sys.stdout = ConsoleAndLog(sys.stdout, logger, logging.INFO)
        sys.stderr = ConsoleAndLog(sys.stderr, logger, logging.ERROR)
        print(f'HUAWEI: registro habilitado en {path}', flush=True)
    except Exception as exc:
        print(f'HUAWEI: no se pudo iniciar el registro: {exc}', file=sys.__stderr__, flush=True)


# ============================================================
# DISPROTEL / HUAWEI V3: INSPECCION DE PERFILES BRIDGE
# Ejecutar una sola vez: python script.py --bridge-inspect SALCEDO 0/2/0
# TODAS LAS ORDENES HUAWEI DE ESTE MODULO SON 'display'.
# La lectura no registra ni modifica ONU. La autorizacion de
# escritura queda pendiente hasta confirmar perfiles reales.
# ============================================================
def _bridge_field(raw, patterns):
    for pattern in patterns:
        match=re.search(pattern, str(raw),re.I|re.M)
        if match:
            return int(match.group(1))
    return None

def _bridge_invalid(text):
    return bool(re.search(r"(?i)(unknown command|unrecognized command|parameter error|invalid parameter|failure:)",str(text)))

def _bridge_profile_summary(raw,kind):
    value=str(raw or "")
    if _bridge_invalid(value):
        return {"disponible":False,"aviso":"Comando de consulta no compatible en esta OLT"}
    lines=[]
    # Nunca devolver descripciones de clientes, cuentas o IP.
    for row in value.splitlines():
        if re.search(r"(?i)(gem(port)?|t.cont|mapping|vlan|traffic.table|port eth|dba.profile|profile.name|profile.id|mapping.mode)",row) or re.match(r"^\s*\d+\s+\d+\s+\d+",row):
            cleaned=row.strip()[:160]
            if re.search(r"(?i)(password|login|username|secret|description|serial|auth)",cleaned):
                continue
            lines.append(cleaned)
        if len(lines)>=22:
            break
    return {"disponible":True,"tipo":kind,"lineas":lines}

async def bridge_inspect(olt_codigo, fsp):
    """Consulta 2 ONU vecinas en UNA PON. No modifica Huawei ni Supabase."""
    code=str(olt_codigo).strip().upper()
    if code not in ("SALCEDO","LATACUNGA"):
        raise ValueError("OLT no habilitada para inspeccion inicial")
    match=re.fullmatch(r"(\d{1,2})/(\d{1,2})/(\d{1,2})",str(fsp))
    if not match:
        raise ValueError("PON debe expresarse F/S/P, por ejemplo 0/2/0")
    frame,slot,port=map(int,match.groups())
    if any(x>31 for x in (frame,slot,port)):
        raise ValueError("PON fuera de limites")
    config=await asyncio.to_thread(olt_config_call,"scanner-list")
    olts=config.get("olts") if isinstance(config,dict) else None
    cfg=next((o for o in (olts or []) if str(o.get("codigo") or "").strip().upper()==code),None)
    if not cfg:
        raise ValueError("No existe OLT activa con ese codigo en scanner-list")
    reader=writer=None
    results={"ok":False,"solo_lectura":True,"escrituras_ejecutadas":0,
        "olt_codigo":code,"pon":f"{frame}/{slot}/{port}",
        "onu_revisadas":[],"line_profiles":{},"service_profiles":{},
        "advertencias":[]}
    try:
        reader,writer=await open_configured_olt(cfg)
        cmd=await _session_command(reader,writer,"config",timeout=20)
        if _bridge_invalid(cmd):
            raise RuntimeError("No fue posible entrar a modo config de lectura")
        cmd=await _session_command(reader,writer,f"interface gpon {frame}/{slot}",timeout=20)
        if _bridge_invalid(cmd):
            raise RuntimeError("Tarjeta GPON no accesible")
        overview=await _session_command(reader,writer,f"display ont info {port} all",timeout=60)
        if _bridge_invalid(overview):
            raise RuntimeError("El puerto no permite consulta display ont info")
        neighbors=[r for r in parse_inventory_status(overview)
                   if r.get("fsp")==f"{frame}/{slot}/{port}" and r.get("run_state")=="online"]
        if not neighbors:
            results["advertencias"].append("No se encontraron ONU online en esta PON; no es posible inferir perfiles")
        # El objetivo es descubrir perfiles utilizados, NO clonar datos de clientes.
        for neighbor in neighbors[:2]:
            ont_id=int(neighbor["ont_id"])
            detail=await _session_command(reader,writer,f"display ont info {port} {ont_id}",timeout=35)
            line_id=_bridge_field(detail,[r"(?:ONT\s+)?line\s*profile\s*ID\s*:\s*(\d+)",r"Line\s*profile\s*:\s*(\d+)"])
            srv_id=_bridge_field(detail,[r"(?:ONT\s+)?(?:srv|service)\s*profile\s*ID\s*:\s*(\d+)",r"Service\s*profile\s*:\s*(\d+)"])
            if _bridge_invalid(detail):
                results["advertencias"].append(f"No se pudo consultar ONT-ID {ont_id}")
                continue
            results["onu_revisadas"].append({
                "ont_id":ont_id,"line_profile_id":line_id,"srv_profile_id":srv_id,
                "equipo_online":True,"serial_final":str(neighbor.get("sn") or "")[-4:]})
        # El service-port se consulta desde modo global.
        await _session_command(reader,writer,"quit",timeout=15)
        for row in results["onu_revisadas"]:
            ident=row["ont_id"]
            port_info=await _session_command(reader,writer,
                f"display service-port port {frame}/{slot}/{port} ont {ident}",timeout=35)
            row["service_port"]=_bridge_profile_summary(port_info,"service-port")
        line_ids={r["line_profile_id"] for r in results["onu_revisadas"] if r.get("line_profile_id") is not None}
        srv_ids={r["srv_profile_id"] for r in results["onu_revisadas"] if r.get("srv_profile_id") is not None}
        for profile_id in sorted(line_ids):
            info=await _session_command(reader,writer,
                f"display ont-lineprofile gpon profile-id {profile_id}",timeout=30)
            results["line_profiles"][str(profile_id)]=_bridge_profile_summary(info,"line-profile")
        for profile_id in sorted(srv_ids):
            info=await _session_command(reader,writer,
                f"display ont-srvprofile gpon profile-id {profile_id}",timeout=30)
            results["service_profiles"][str(profile_id)]=_bridge_profile_summary(info,"srv-profile")
        results["ok"]=True
        results["advertencias"].append(
           "Este reporte no acredita el perfil BRIDGE: contrastar modelo, GEM y VLAN antes de cualquier ont add.")
        return results
    finally:
        if writer is not None:
            try: writer.close()
            except Exception: pass


if __name__ == "__main__":
    _huawei_setup_log()
    _huawei_disable_console_quickedit()
    sys.exit(asyncio.run(main()))