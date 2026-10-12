#!/usr/bin/env python3
"""DISPROTEL archivo local. Descarga evidencias mediante endpoint privado y verificacion SHA256.
No borra objetos remotos, no abre puertos, no toca lectores existentes.
Requiere DETECTOR_TOKEN ya presente en el entorno de la PC Scanner.
"""
import os,sys,json,hashlib,sqlite3,urllib.request,urllib.error,tempfile,time
from pathlib import Path
ROOT=Path(r"C:\DISPROTEL\REPORTES")
DB=ROOT/"CONTROL"/"archivo_manifest.sqlite3"
URL=os.getenv("SUPABASE_URL","https://ajnbswrwnjpjypjiorye.supabase.co").rstrip("/")+"/functions/v1/disprotel-archivo-lectura"
B={"instalacion-evidencias":"INSTALACIONES","soporte-evidencias":"SOPORTES","orden-documentos":"CONTROL"}
def init():
    ROOT.mkdir(parents=True,exist_ok=True); DB.parent.mkdir(parents=True,exist_ok=True)
    c=sqlite3.connect(DB,timeout=20)
    c.execute("create table if not exists archivos (bucket text not null, objeto text not null, etag text, bytes integer, sha256 text, ruta text, fecha text default current_timestamp, primary key(bucket,objeto))")
    c.commit();return c
def safe_path(bucket,name):
    if bucket not in B:raise ValueError("Bucket no permitido")
    parts=name.replace("\\","/").split("/")
    if not parts or any(x in ("",".","..") for x in parts):raise ValueError("Ruta invalida")
    p=ROOT/B[bucket]
    for segment in parts:p=p/segment
    if not p.resolve().is_relative_to((ROOT/B[bucket]).resolve()):raise ValueError("Ruta fuera de carpeta")
    return p
def api(payload,token):
    req=urllib.request.Request(URL,data=json.dumps(payload).encode(),headers={"Authorization":"Bearer "+token,"Content-Type":"application/json"},method="POST")
    with urllib.request.urlopen(req,timeout=30) as response:return json.load(response)
def main():
    conn=init()
    token=os.environ.get("DETECTOR_TOKEN","")
    if not token:
        print("DETECTOR_TOKEN no disponible en esta consola. No se hizo ninguna descarga.");return 2
    downloaded=0
    for bucket in B:
        offset=0
        while True:
            data=api({"action":"listar","bucket":bucket,"offset":offset,"limit":20},token)
            if not data.get("ok"):raise RuntimeError("Error remoto: "+str(data.get("error","Sin detalle")))
            objects=data.get("objects") or []
            if not objects:break
            for obj in objects:
                name=obj.get("name") or ""
                if not name or name.endswith("/"):continue
                path=safe_path(bucket,name)
                found=conn.execute("select bytes,sha256,ruta from archivos where bucket=? and objeto=?",(bucket,name)).fetchone()
                if found and Path(found[2]).is_file() and Path(found[2]).stat().st_size==found[0]:continue
                link=api({"action":"firmar","bucket":bucket,"name":name},token)
                if not link.get("ok") or not link.get("url"):raise RuntimeError("No se pudo autorizar archivo")
                path.parent.mkdir(parents=True,exist_ok=True)
                fd,tmp=tempfile.mkstemp(prefix=".disprotel-",dir=path.parent)
                checksum=hashlib.sha256();size=0
                try:
                    with os.fdopen(fd,"wb") as out,urllib.request.urlopen(link["url"],timeout=60) as inp:
                        while True:
                            chunk=inp.read(64*1024)
                            if not chunk:break
                            size+=len(chunk)
                            if size>20*1024*1024:raise ValueError("Archivo excede 20MB")
                            out.write(chunk);checksum.update(chunk)
                    os.replace(tmp,path)
                    conn.execute("insert or replace into archivos(bucket,objeto,bytes,sha256,ruta) values (?,?,?,?,?)",(bucket,name,size,checksum.hexdigest(),str(path)))
                    conn.commit();downloaded+=1
                    print("ARCHIVADO",bucket,name,size,"bytes",flush=True)
                finally:
                    if os.path.exists(tmp):os.unlink(tmp)
            offset+=len(objects)
            if len(objects)<20:break
    print("FINALIZADO. Nuevos archivos:",downloaded,"| Manifiesto:",DB)
    print("No se borraron objetos de Supabase. Esta copia LOCAL todavia no es respaldo independiente.")
    return 0
if __name__=="__main__":
    try:sys.exit(main())
    except Exception as exc:
        print("ERROR:",type(exc).__name__,str(exc)[:250]);sys.exit(1)
