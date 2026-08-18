from pathlib import Path
import re
p=Path('reporte-trabajo.html')
s=p.read_text(encoding='utf-8')
# Mantener una hoja A4 física.
s=s.replace('.sheet{width:210mm;min-height:297mm;', '.sheet{width:210mm;height:297mm;min-height:297mm;max-height:297mm;')
# En móvil NO refluye el documento: se conserva la composición A4 y se escala completo.
s=re.sub(r'@media\(max-width:900px\)\{.*?\}@media print', '@media(max-width:900px){html,body{width:100%;max-width:100%;overflow-x:hidden}body{padding:8px;background:#dfe5ea}.toolbar{width:calc(100% - 4px);max-width:520px;grid-template-columns:1fr;gap:6px;margin:0 auto 10px}.toolbar button{font-size:13px;padding:10px 8px}.sheet{width:210mm!important;height:297mm!important;min-height:297mm!important;max-height:297mm!important;padding:9mm 10mm!important;margin:0!important}.header{grid-template-columns:72mm 1fr!important}.logo{width:66mm!important}.summary{grid-template-columns:repeat(4,1fr)!important}.service,.panels{grid-template-columns:1fr 1fr!important}.svcCol+.svcCol{border-left:1px solid #d7e2ea!important;border-top:0!important;padding-left:6mm!important;margin-top:0!important;padding-top:0!important}.evidenceGrid{grid-template-columns:repeat(5,1fr)!important}.evImg,.evMissing{height:31mm!important}.a4-stage{position:relative;overflow:hidden;margin:0 auto 14px!important}}@media print', s, flags=re.S)
# Quitar parche previo para regenerarlo sin duplicados.
s=re.sub(r'<style id="a4PreviewPatch">.*?</script>', '', s, flags=re.S)
addon='''<style id="a4PreviewPatch">
.a4-stage{position:relative;margin:0 auto 18px;overflow:hidden}.sheet{transform-origin:top left}.preview-note{max-width:210mm;margin:0 auto 8px;text-align:center;color:#667985;font-size:12px}
@media print{
  @page{size:A4 portrait;margin:0}
  html,body{width:210mm!important;height:297mm!important;margin:0!important;padding:0!important;overflow:hidden!important;background:#fff!important}
  .toolbar,.preview-note{display:none!important}
  .a4-stage{width:210mm!important;height:297mm!important;margin:0!important;padding:0!important;overflow:hidden!important;display:block!important}
  .sheet{width:210mm!important;height:297mm!important;min-height:297mm!important;max-height:297mm!important;margin:0!important;padding:7mm 8mm!important;box-shadow:none!important;transform:none!important;overflow:hidden!important}
  .sheet:after{display:none!important}
  #contenido{transform-origin:top left!important}
  .section,.panel,.evCard,.summary,.service{break-inside:avoid!important;page-break-inside:avoid!important}
}
</style>
<script id="a4PreviewLogic">
function asegurarStageA4(){const hoja=document.querySelector('.sheet');if(!hoja)return null;let stage=hoja.parentElement;if(!stage.classList.contains('a4-stage')){stage=document.createElement('div');stage.className='a4-stage';hoja.parentNode.insertBefore(stage,hoja);stage.appendChild(hoja)}return {hoja,stage}}
function ajustarContenidoUnaPagina(){const x=asegurarStageA4();if(!x)return;const {hoja}=x;const cont=document.getElementById('contenido');if(!cont)return;cont.style.zoom='1';requestAnimationFrame(()=>{const disponible=Math.max(1,hoja.clientHeight-4);const usado=Math.max(1,cont.scrollHeight);if(usado>disponible){const z=Math.max(.58,Math.min(1,disponible/usado));cont.style.zoom=String(z)}})}
function ajustarHojaA4(){const x=asegurarStageA4();if(!x)return;const {hoja,stage}=x;hoja.style.transform='none';hoja.style.transformOrigin='top left';stage.style.width='auto';stage.style.height='auto';const naturalW=hoja.offsetWidth,naturalH=hoja.offsetHeight;const viewport=Math.max(280,document.documentElement.clientWidth||window.innerWidth);const margen=16;const escala=Math.min(1,(viewport-margen)/naturalW);stage.style.width=Math.floor(naturalW*escala)+'px';stage.style.height=Math.ceil(naturalH*escala)+'px';stage.style.marginLeft='auto';stage.style.marginRight='auto';hoja.style.transform='scale('+escala+')';ajustarContenidoUnaPagina()}
function prepararImpresionA4(){const x=asegurarStageA4();if(!x)return;const {hoja,stage}=x;hoja.style.transform='none';stage.style.width='210mm';stage.style.height='297mm';const cont=document.getElementById('contenido');if(!cont)return;cont.style.zoom='1';void cont.offsetHeight;const disponible=Math.max(1,hoja.clientHeight-4);const usado=Math.max(1,cont.scrollHeight);const z=Math.min(1,disponible/usado);if(z<1)cont.style.zoom=String(Math.max(.58,z*.985))}
window.addEventListener('beforeprint',prepararImpresionA4);
window.addEventListener('afterprint',()=>setTimeout(ajustarHojaA4,80));
window.addEventListener('resize',()=>requestAnimationFrame(ajustarHojaA4));
window.addEventListener('orientationchange',()=>setTimeout(ajustarHojaA4,120));
window.addEventListener('load',()=>setTimeout(ajustarHojaA4,250));
const _obs=new MutationObserver(()=>setTimeout(ajustarHojaA4,30));
window.addEventListener('DOMContentLoaded',()=>{const c=document.getElementById('contenido');if(c)_obs.observe(c,{childList:true,subtree:true})});
</script>'''
if '</body>' in s:
    s=s.replace('</body>',addon+'</body>',1)
p.write_text(s,encoding='utf-8')
