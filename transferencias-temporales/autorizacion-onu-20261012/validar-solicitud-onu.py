#!/usr/bin/env python3
"""DISPROTEL - prevalidacion ONU sin conexiones ni comandos a equipos.
Utiliza campos reales de orden_onu_solicitudes y olt_onu_autofind_cache.
"""
import re,json,argparse
from datetime import datetime,timezone,timedelta

SN=re.compile(r"^[A-Z]{4}[0-9A-F]{8}$")
PON=re.compile(r"^\d+/\d+/\d+$")

def fecha(v):
    try:return datetime.fromisoformat(v.replace("Z","+00:00")).astimezone(timezone.utc)
    except (ValueError,TypeError,AttributeError):return None

def validar(sol,cache,aprobador,now=None):
    now=now or datetime.now(timezone.utc)
    errores=[]
    def comprobar(ok,mensaje):
        if not ok: errores.append(mensaje)
    sn=str(sol.get("onu_sn") or "").upper().strip()
    pon=str(sol.get("onu_pon") or "").strip()
    comprobar(bool(sol.get("id") and sol.get("orden_id")),"Solicitud y OT requeridas")
    comprobar(sol.get("estado") in ("CONFIRMADO","CONFIRMADA","APROBADO","APROBADA"),"Aprobacion pendiente")
    comprobar(bool(sol.get("confirmado_por_id") and sol.get("confirmado_at")),"Sin aprobacion registrada")
    comprobar(aprobador.get("id")==sol.get("confirmado_por_id") and aprobador.get("activo") is True,"Aprobador no valido")
    comprobar(aprobador.get("autorizador_onu") is True,"Aprobador sin permiso explicito")
    comprobar(bool(sol.get("storage_path")),"Falta foto de serial")
    comprobar(bool(SN.fullmatch(sn)),"Serial ONU invalido")
    comprobar(bool(PON.fullmatch(pon)),"PON invalido")
    comprobar(cache.get("olt_codigo")==sol.get("olt_codigo") and cache.get("onu_sn")==sn,"Serial/OLT no coincide con autofind")
    comprobar(cache.get("pon")==pon and cache.get("presente") is True,"ONU no aparece en autofind")
    pedido,lectura,aprobacion=map(fecha,(sol.get("solicitado_at"),cache.get("ultima_lectura_at"),sol.get("confirmado_at")))
    comprobar(bool(pedido and lectura and lectura>=pedido),"Lectura anterior a solicitud")
    comprobar(bool(aprobacion and timedelta(0)<=now-aprobacion<=timedelta(minutes=10)),"Aprobacion vencida o futura")
    comprobar(sol.get("onu_ont_id") is None,"ONU ya tiene ONT-ID, requiere revision")
    comprobar(sol.get("onu_estado_olt") in (None,"PENDING_AUTOFIND"),"ONU ya procesada")
    return {"apto_para_revision":not errores,"errores":errores,"simulacion":True,"comandos_olt_enviados":False}

def demo():
    n=datetime.now(timezone.utc)
    fmt=lambda sec:(n+timedelta(seconds=sec)).isoformat()
    sol={"id":"demo","orden_id":"demo","onu_sn":"HWTC430E079B","onu_pon":"0/2/0","olt_codigo":"SALCEDO","estado":"CONFIRMADA","solicitado_at":fmt(-300),"confirmado_at":fmt(-60),"confirmado_por_id":"supervisor","storage_path":"demo.jpg","onu_ont_id":None,"onu_estado_olt":"PENDING_AUTOFIND"}
    cache={"onu_sn":"HWTC430E079B","olt_codigo":"SALCEDO","pon":"0/2/0","presente":True,"ultima_lectura_at":fmt(-120)}
    autor={"id":"supervisor","activo":True,"autorizador_onu":True}
    return sol,cache,autor,n

def test():
    a,b,c,n=demo()
    assert validar(a,b,c,n)["apto_para_revision"]
    for key,val in (("storage_path",None),("confirmado_por_id",None),("onu_sn","HWTC00000001"),("onu_ont_id",3),("estado","SOLICITADO"),("onu_estado_olt","online")):
        v={**a,key:val}
        assert not validar(v,b,c,n)["apto_para_revision"],key
    assert not validar(a,b,{**c,"autorizador_onu":False},n)["apto_para_revision"]
    assert not validar({**a,"confirmado_at":(n-timedelta(minutes=11)).isoformat()},b,c,n)["apto_para_revision"]
    print("9/9 pruebas aprobadas. NINGUNA orden enviada a Huawei.")

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--test",action="store_true")
    args=p.parse_args()
    if args.test:test()
    else:
        a,b,c,n=demo()
        print(json.dumps(validar(a,b,c,n),ensure_ascii=False,indent=2))
