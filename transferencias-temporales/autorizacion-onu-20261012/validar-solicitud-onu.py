#!/usr/bin/env python3
"""DISPROTEL bloque 3: validacion local previa a autorizacion ONU.
No accede a redes, no tiene credenciales, no envia comandos Huawei.
"""
import re, json, argparse
from datetime import datetime, timezone

SN_RE=re.compile(r"^[A-Z]{4}[0-9A-F]{8}$")
PON_RE=re.compile(r"^\d{1,2}/\d{1,2}/\d{1,2}$")
def validar(sol):
    problemas=[]
    def required(field):
        v=sol.get(field)
        if v is None or str(v).strip()=="":problemas.append("Falta "+field)
        return v
    required("orden_id")
    required("solicitud_id")
    sn=str(required("onu_sn") or "").strip().upper()
    pon=str(required("onu_pon") or "").strip()
    if not SN_RE.fullmatch(sn):problemas.append("Serial Huawei no valido")
    if not PON_RE.fullmatch(pon):problemas.append("Puerto PON no valido")
    if sol.get("estado") not in ("CONFIRMADA","APROBADA"):
        problemas.append("Solicitud sin aprobacion confirmada")
    if not sol.get("confirmado_por_id") or not sol.get("confirmado_at"):
        problemas.append("Falta responsable o fecha de aprobacion")
    if not sol.get("storage_path"):
        problemas.append("Falta evidencia de serial")
    if str(sol.get("olt_codigo") or "").strip().upper() not in ("SALCEDO","LATACUNGA"):
        problemas.append("OLT no habilitada para pruebas")
    if sol.get("onu_ont_id") not in (None,""):
        problemas.append("ONT-ID ya asignado: requiere revision manual")
    return {"listo_para_revision":not problemas,"motivos":problemas,"solo_validacion":True,"ejecucion_huawei":False}

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("archivo",nargs="?",help="JSON local sin claves ni tokens")
    args=parser.parse_args()
    if args.archivo:
        with open(args.archivo,encoding="utf-8") as f:data=json.load(f)
    else:
        data={"orden_id":"OT-DEMO","solicitud_id":"DEMO","onu_sn":"HWTC430E079B","onu_pon":"0/2/0","estado":"PENDIENTE","olt_codigo":"SALCEDO"}
    print(json.dumps(validar(data),ensure_ascii=False,indent=2))
