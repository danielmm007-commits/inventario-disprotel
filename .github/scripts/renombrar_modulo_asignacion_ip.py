from pathlib import Path
p=Path('asignacion-ip.html')
s=p.read_text(encoding='utf-8')
s=s.replace('<title>Control de IP · DISPROTEL</title>','<title>Asignación de IP · DISPROTEL</title>')
s=s.replace('<h1>📡 Control de IP</h1>','<h1>📡 Asignación de IP</h1>')
s=s.replace("$('quien').textContent='Control IP · '+(d.me?.nombre||US);","$('quien').textContent='Asignación de IP · '+(d.me?.nombre||US);")
s=s.replace('Confirmación, corrección e historial de IP.','Asignación, reasignación e historial de IP.')
p.write_text(s,encoding='utf-8')
