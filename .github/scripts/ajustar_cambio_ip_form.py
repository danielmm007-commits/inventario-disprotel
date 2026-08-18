from pathlib import Path

p=Path('asignacion-ip.html')
s=p.read_text(encoding='utf-8')

s=s.replace(".hist .meta{font-size:12px;color:#60737c;margin-top:4px}", ".hist .meta{font-size:12px;color:#60737c;margin-top:4px}.changeBox{margin-top:10px;padding:12px;border:1px solid #d7e1e5;border-radius:12px;background:#f8fbfd}.changeActions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.changeActions button{margin-top:8px}.fieldError{border-color:#c83d3d!important;background:#fff6f6}.inlineErr{color:#9d2525;font-size:12px;font-weight:700;margin-top:6px}")

old_btn="<button onclick=\"cambiarIp('${x.orden_id}','${esc(x.ip_asignada||'')}')\">✏️ CAMBIAR IP CONFIRMADA</button></div>"
new_btn="<button onclick=\"mostrarCambioIp('${x.orden_id}','${esc(x.ip_asignada||'')}')\">✏️ CAMBIAR IP CONFIRMADA</button><div id=\"cambio-${x.orden_id}\"></div></div>"
if old_btn not in s:
    raise SystemExit('No se encontro boton de cambio IP esperado')
s=s.replace(old_btn,new_btn,1)

start=s.find("async function cambiarIp(orden,actual){")
end=s.find("async function entrar(){", start)
if start<0 or end<0:
    raise SystemExit('No se encontro funcion cambiarIp')

new_funcs=r'''function mostrarCambioIp(orden,actual){const box=$('cambio-'+orden);if(!box)return;box.innerHTML=`<div class="changeBox"><b>✏️ CAMBIAR IP CONFIRMADA</b><div class="muted" style="margin-top:5px">IP ACTUAL: <b>${esc(actual)}</b></div><input id="nueva-${orden}" inputmode="decimal" placeholder="Nueva IP" style="margin-top:9px"><input id="motivo-${orden}" placeholder="Motivo del cambio (obligatorio)" style="margin-top:7px"><div id="err-${orden}" class="inlineErr"></div><div class="changeActions"><button type="button" onclick="guardarCambioIp('${orden}','${esc(actual)}')">✅ GUARDAR CAMBIO</button><button type="button" class="secondary" onclick="cancelarCambioIp('${orden}')">✖ CANCELAR</button></div></div>`;setTimeout(()=>{const i=$('nueva-'+orden);if(i)i.focus()},0)}function cancelarCambioIp(orden){const box=$('cambio-'+orden);if(box)box.innerHTML=''}async function guardarCambioIp(orden,actual){const ipEl=$('nueva-'+orden),motivoEl=$('motivo-'+orden),err=$('err-'+orden);const nueva=(ipEl?.value||'').trim(),motivo=(motivoEl?.value||'').trim();if(ipEl)ipEl.classList.remove('fieldError');if(motivoEl)motivoEl.classList.remove('fieldError');if(err)err.textContent='';if(!nueva){if(ipEl)ipEl.classList.add('fieldError');if(err)err.textContent='Ingresa la nueva IP.';ipEl?.focus();return}if(!motivo){if(motivoEl)motivoEl.classList.add('fieldError');if(err)err.textContent='El motivo del cambio es obligatorio.';motivoEl?.focus();return}if(!confirm('¿Cambiar '+actual+' por '+nueva+'?'))return;try{await api('change-confirmed-ip',{orden_id:orden,ip:nueva,motivo});show('✅ IP cambiada y registrada en historial.');await buscarHist()}catch(e){if(err)err.textContent=e.message;else show(e.message,'err')}}'''

s=s[:start]+new_funcs+s[end:]
p.write_text(s,encoding='utf-8')
