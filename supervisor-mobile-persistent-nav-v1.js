(()=>{
  /* Compatibilidad: la navegación persistente anterior queda desactivada.
     El menú móvil ligero vive ahora en supervisor-mobile-compact-v1.js. */
  document.getElementById('supPersistentNav')?.remove();
  document.getElementById('supervisorPersistentNavV1Style')?.remove();
})();