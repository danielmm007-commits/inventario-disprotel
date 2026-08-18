(()=>{
const API_GPS_ACEPTACION='https://ajnbswrwnjpjypjiorye.supabase.co/functions/v1/inventario-gps-orden';
async function guardarGpsAceptacion(ordenId,payload){
  const r=await fetch(API_GPS_ACEPTACION,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({usuario:US,pin:PIN,action:'aceptacion',orden_id:ordenId,...payload})});
  const d=await r.json().catch(()=>({error:'Respuesta inválida'}));
  if(!r.ok)throw new Error(d.error||'No se pudo registrar GPS');
  return d;
}
function obtenerGpsAceptacion(){
  return new Promise(resolve=>{
    if(!navigator.geolocation){resolve({estado_gps:'NO_DISPONIBLE',detalle:'Geolocalización no disponible en este dispositivo'});return}
    navigator.geolocation.getCurrentPosition(
      p=>resolve({estado_gps:'REGISTRADO',latitud:p.coords.latitude,longitud:p.coords.longitude,precision_m:p.coords.accuracy}),
      e=>resolve({estado_gps:e.code===1?'PERMISO_DENEGADO':e.code===2?'NO_DISPONIBLE':'ERROR',detalle:String(e.message||'No se pudo obtener ubicación').slice(0,250)}),
      {enableHighAccuracy:true,timeout:12000,maximumAge:0}
    );
  });
}
const aceptarBase=aceptar;
aceptar=async function(id){
  try{
    await api('accept-order',{orden_id:id});
    showMsg('Trabajo aceptado. Registrando ubicación informativa…',true);
    const gps=await obtenerGpsAceptacion();
    try{
      await guardarGpsAceptacion(id,gps);
      if(gps.estado_gps==='REGISTRADO') showMsg('Trabajo aceptado. 📍 GPS de aceptación registrado.',true);
      else showMsg('Trabajo aceptado. GPS no disponible; el trabajo continúa normalmente.',true);
    }catch(e){
      console.warn('GPS de aceptación no registrado',e);
      showMsg('Trabajo aceptado. No se pudo guardar el GPS, pero el trabajo continúa normalmente.',true);
    }
    await cargar();
  }catch(e){showMsg(e.message)}
};
})();