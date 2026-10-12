#!/usr/bin/env python3
"""DISPROTEL: interruptor LOCAL de diagnosticos temporales. No abre conexiones."""
import argparse, datetime as dt, getpass, hashlib, hmac, json, os, secrets, sys
from pathlib import Path

ROOT=Path(os.environ.get("LOCALAPPDATA",str(Path.home())))/"DISPROTEL"/"diagnostico_temporal"
SECRET=ROOT/"control.json"
STATUS=ROOT/"estado.json"
TTL=24*3600

def lock_down(p):
    # ACL heredada del perfil local; no incluir contrasenas en texto plano.
    if os.name=="nt":
        import subprocess
        subprocess.run(["icacls",str(p),"/inheritance:r","/grant:r",f"{os.environ.get('USERNAME','')}:(R,W)","SYSTEM:(F)"],capture_output=True,check=False)

def write(path, data):
    ROOT.mkdir(parents=True,exist_ok=True)
    tmp=path.with_suffix(".tmp")
    tmp.write_text(json.dumps(data),encoding="utf-8")
    os.replace(tmp,path)
    lock_down(path)

def key(pw,salt):
    return hashlib.pbkdf2_hmac("sha256",pw.encode(),bytes.fromhex(salt),600000).hex()

def setup():
    if SECRET.exists():
        print("Ya existe contraseña. No se sobrescribe.");return 1
    p=getpass.getpass("Nueva contraseña local (mínimo 14 caracteres): ")
    q=getpass.getpass("Repetir contraseña: ")
    if p!=q or len(p)<14:
        print("Contraseñas no coinciden o son demasiado cortas.");return 1
    salt=secrets.token_hex(16)
    write(SECRET,{"salt":salt,"hash":key(p,salt)})
    write(STATUS,{"active_until":0})
    print("Control creado. Todavía no existe conexión remota.");return 0

def status():
    data=json.loads(STATUS.read_text()) if STATUS.exists() else {"active_until":0}
    left=int(data.get("active_until",0)-dt.datetime.now(dt.timezone.utc).timestamp())
    print("ACTIVADO (control local)" if left>0 else "DESACTIVADO")
    if left>0:print(f"Tiempo restante: {left//3600}h {(left%3600)//60}min")
    print("Esto NO inicia ningún agente remoto.")
    return 0

def enable():
    if not SECRET.exists():
        print("Primero ejecuta: configurar");return 1
    saved=json.loads(SECRET.read_text())
    entered=getpass.getpass("Contraseña de activación: ")
    if not hmac.compare_digest(key(entered,saved["salt"]),saved["hash"]):
        print("Contraseña incorrecta.");return 1
    until=int(dt.datetime.now(dt.timezone.utc).timestamp())+TTL
    write(STATUS,{"active_until":until})
    print("Control local habilitado por 24 horas. No se ha iniciado agente remoto.")
    return 0

def disable():
    write(STATUS,{"active_until":0})
    print("Control local desactivado.");return 0

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("accion",choices=["configurar","activar","desactivar","estado"])
    args=parser.parse_args()
    sys.exit({"configurar":setup,"activar":enable,"desactivar":disable,"estado":status}[args.accion]())
