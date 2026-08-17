from pathlib import Path

p=Path('ip-servicio-v2.js')
s=p.read_text(encoding='utf-8')

old="""if(!q){$('ipEstado').innerHTML=`<span class=\"badge\">IP AÚN NO SOLICITADA</span><div class=\"row\" style=\"margin-top:10px\"><div class=\"item\"><div class=\"label\">Cliente</div><div class=\"value\">${esc(up(O?.cliente_nombre||'—'))}</div></div><div class=\"item\"><div class=\"label\">Plan real</div><div class=\"value\">SE LEERÁ DEL ROUTER</div></div></div><div class=\"muted\" style=\"margin-top:8px\">Cuando termines la parte física, solicita la IP. El buscador comparará los registros nuevos de MikroTik con el nombre del cliente y el queue.</div>`;$('solicitar').classList.remove('hidden');$('solicitar').textContent='📡 SOLICITAR IP';$('actualizar').classList.add('hidden');$('stIp').textContent='PENDIENTE';return}"""
new="""if(!q){const respaldo=limpiarPlan(O?.plan_final||O?.plan_solicitado||'PLAN PENDIENTE');$('ipEstado').innerHTML=`<span class=\"badge\">IP AÚN NO SOLICITADA</span><div class=\"row\" style=\"margin-top:10px\"><div class=\"item\"><div class=\"label\">Cliente</div><div class=\"value\">${esc(up(O?.cliente_nombre||'—'))}</div></div><div class=\"item\"><div class=\"label\">Plan de respaldo</div><div class=\"value\">${esc(respaldo)}</div></div></div><div class=\"muted\" style=\"margin-top:8px\">Cuando termines la parte física, solicita la IP. Si el escáner está disponible se comparará MikroTik; si no, se conservarán los datos iniciales de la OT.</div>`;$('solicitar').classList.remove('hidden');$('solicitar').textContent='📡 SOLICITAR IP';$('actualizar').classList.add('hidden');$('stIp').textContent='PENDIENTE';return}"""
if old not in s: raise SystemExit('bloque inicial no encontrado')
s=s.replace(old,new,1)

old2="""if(!cs.length)$('candidatos').innerHTML='<div class=\"msg warn\">Todavía no aparece una coincidencia suficientemente confiable en MikroTik.</div>';else $('candidatos').innerHTML=cs.map(candidatoTecnico).join('')}catch(e){show(e.message,'err')}};"""
new2="""if(!cs.length){const respaldo=limpiarPlan(O?.plan_final||O?.plan_solicitado||'PLAN PENDIENTE');$('candidatos').innerHTML=`<div class=\"msg warn\">Todavía no aparece una coincidencia suficientemente confiable en MikroTik. Si el escáner está apagado o sin comunicación, usa el modo de contingencia.</div><div class=\"candidate\"><span class=\"badge wait\">🛟 MODO CONTINGENCIA</span><div style=\"margin-top:8px\"><div class=\"label\">CLIENTE</div><div class=\"value\">${esc(up(O?.cliente_nombre||'—'))}</div></div><div style=\"margin-top:8px\"><div class=\"label\">PLAN DE RESPALDO</div><div class=\"value\">${esc(respaldo)}</div></div><div class=\"muted\" style=\"margin-top:8px\">Cuando Fernando confirme la IP por su medio habitual, regístrala aquí. Quedará auditado que Fernando la confirmó y el técnico solo la digitó.</div><div class=\"pickRow\" style=\"margin-top:8px\"><input id=\"ipFernando\" inputmode=\"decimal\" autocomplete=\"off\" placeholder=\"Ej. 172.25.1.120\"><button type=\"button\" onclick=\"registrarIpFernando()\">✅ REGISTRAR IP CONFIRMADA POR FERNANDO</button></div></div>`}else $('candidatos').innerHTML=cs.map(candidatoTecnico).join('')}catch(e){show(e.message,'err')}};"""
if old2 not in s: raise SystemExit('bloque sin candidatos no encontrado')
s=s.replace(old2,new2,1)

anchor="""  window.solicitarIp=async function(){try{await post(API_O,'request-ip',{orden_id:ordenId(),plan_final:'',tv_final:Boolean(O.tv_final??O.tv_solicitada)});show('✅ Solicitud de IP enviada. El buscador MikroTik ya está revisando candidatos.');await window.estadoIp()}catch(e){show(e.message,'err')}};\n"""
extra="""  window.solicitarIp=async function(){try{await post(API_O,'request-ip',{orden_id:ordenId(),plan_final:'',tv_final:Boolean(O.tv_final??O.tv_solicitada)});show('✅ Solicitud de IP enviada. El buscador MikroTik ya está revisando candidatos.');await window.estadoIp()}catch(e){show(e.message,'err')}};\n  window.registrarIpFernando=async function(){const ip=String($('ipFernando')?.value||'').trim();if(!ip){show('Ingresa la IP confirmada por Fernando.','warn');return}if(!ipv4Valida(ip)){show('La IP no es una IPv4 válida.','warn');return}if(!confirm(`¿Registrar ${ip} como IP confirmada por Fernando?`))return;try{await post(API_IP,'register-fernando-ip',{orden_id:ordenId(),ip});show('✅ IP registrada como confirmada por Fernando.');await window.estadoIp()}catch(e){show(e.message,'err')}};\n"""
if anchor not in s: raise SystemExit('ancla solicitar no encontrada')
s=s.replace(anchor,extra,1)
p.write_text(s,encoding='utf-8')

p=Path('instalacion-ejecucion.html')
s=p.read_text(encoding='utf-8')
import re
s=re.sub(r'ip-servicio-v2\.js\?v=[^\"\']+','ip-servicio-v2.js?v=20260817-1542',s,count=1)
p.write_text(s,encoding='utf-8')
