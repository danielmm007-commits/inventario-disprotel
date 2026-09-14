(()=>{
  if(window.__disprotelLoginTechBgV1)return;
  window.__disprotelLoginTechBgV1=true;

  const style=document.createElement('style');
  style.id='loginTechBgStyle';
  style.textContent=`
    .scene{background:radial-gradient(circle at 18% 18%,rgba(0,177,255,.14),transparent 27%),radial-gradient(circle at 82% 24%,rgba(24,111,255,.12),transparent 25%),radial-gradient(circle at 50% 110%,rgba(0,133,255,.16),transparent 34%),linear-gradient(135deg,#041329 0%,#08264a 48%,#0b3562 100%)!important}
    .scene:before{content:""!important;position:absolute!important;inset:-8%!important;background-image:linear-gradient(rgba(91,203,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(91,203,255,.07) 1px,transparent 1px)!important;background-size:46px 46px!important;background-position:0 0!important;background-repeat:repeat!important;opacity:.34!important;transform:none!important;animation:techGridDrift 22s linear infinite!important;pointer-events:none!important;z-index:0!important}
    .scene:after{content:""!important;position:absolute!important;inset:0!important;background:radial-gradient(ellipse at 50% 48%,rgba(4,18,39,.05) 0%,rgba(3,14,32,.16) 36%,rgba(2,10,24,.42) 100%),linear-gradient(90deg,rgba(1,9,23,.18),transparent 28%,transparent 72%,rgba(1,9,23,.18))!important;pointer-events:none!important;z-index:2!important}
    .techDecor{position:absolute;inset:0;z-index:1;overflow:hidden;pointer-events:none}
    .techOrbit{position:absolute;border:1px solid rgba(94,218,255,.24);border-radius:50%;box-shadow:0 0 38px rgba(0,169,255,.08),inset 0 0 32px rgba(0,169,255,.04);animation:techOrbit 30s linear infinite}
    .techOrbit:before,.techOrbit:after{content:"";position:absolute;border-radius:50%;border:1px dashed rgba(111,226,255,.14)}
    .techOrbit:before{inset:12%}.techOrbit:after{inset:27%}
    .techOrbit.left{width:520px;height:520px;left:-235px;top:16%}
    .techOrbit.right{width:420px;height:420px;right:-175px;top:8%;animation-direction:reverse;animation-duration:36s}
    .techBeam{position:absolute;height:1px;background:linear-gradient(90deg,transparent,rgba(82,220,255,.72),rgba(63,149,255,.52),transparent);filter:drop-shadow(0 0 7px rgba(48,202,255,.55));opacity:.55;transform-origin:left center;animation:techBeamPulse 5.5s ease-in-out infinite}
    .techBeam.b1{width:360px;left:4%;top:31%;transform:rotate(-18deg)}
    .techBeam.b2{width:320px;right:3%;bottom:27%;transform:rotate(20deg);animation-delay:-2s}
    .techBeam.b3{width:250px;right:11%;top:62%;transform:rotate(-34deg);animation-delay:-3.7s}
    .techNode{position:absolute;width:8px;height:8px;border-radius:50%;background:#78e6ff;box-shadow:0 0 0 6px rgba(104,225,255,.06),0 0 19px rgba(58,215,255,.85);animation:techNodePulse 3.2s ease-in-out infinite}
    .techNode.n1{left:10%;top:21%}.techNode.n2{left:18%;bottom:19%;animation-delay:-1.2s}.techNode.n3{right:12%;top:24%;animation-delay:-2.1s}.techNode.n4{right:20%;bottom:17%;animation-delay:-.7s}
    .techPanel{position:absolute;width:230px;height:150px;border:1px solid rgba(119,220,255,.10);border-radius:18px;background:linear-gradient(135deg,rgba(32,121,188,.035),rgba(29,205,255,.015));box-shadow:inset 0 0 35px rgba(28,183,255,.025);animation:techFloat 9s ease-in-out infinite}
    .techPanel.p1{left:3.5%;bottom:7%;transform:rotate(-7deg)}
    .techPanel.p2{right:4%;top:14%;transform:rotate(8deg);animation-delay:-4s}
    .techScan{position:absolute;inset:-30%;background:linear-gradient(112deg,transparent 46%,rgba(100,222,255,.035) 49%,rgba(112,225,255,.10) 50%,rgba(100,222,255,.035) 51%,transparent 54%);animation:techScan 11s linear infinite;opacity:.75}
    .top,.center{z-index:3!important}
    @keyframes techGridDrift{from{transform:translate3d(0,0,0)}to{transform:translate3d(46px,46px,0)}}
    @keyframes techOrbit{to{transform:rotate(360deg)}}
    @keyframes techNodePulse{0%,100%{opacity:.45;transform:scale(.82)}50%{opacity:1;transform:scale(1.28)}}
    @keyframes techBeamPulse{0%,100%{opacity:.22}50%{opacity:.72}}
    @keyframes techFloat{0%,100%{translate:0 0}50%{translate:0 -12px}}
    @keyframes techScan{from{transform:translate3d(-10%,-8%,0)}to{transform:translate3d(10%,8%,0)}}
    @media(max-width:720px){.techOrbit.left{width:330px;height:330px;left:-175px;top:18%}.techOrbit.right{width:280px;height:280px;right:-145px;top:12%}.techPanel{width:150px;height:105px;opacity:.65}.techBeam{opacity:.34}.techNode{width:7px;height:7px}}
    @media(prefers-reduced-motion:reduce){.techDecor *{animation:none!important}.scene:before{animation:none!important}}
  `;
  document.head.appendChild(style);

  const mount=()=>{
    const scene=document.querySelector('.scene');
    if(!scene||scene.querySelector('.techDecor'))return;
    const decor=document.createElement('div');
    decor.className='techDecor';
    decor.setAttribute('aria-hidden','true');
    decor.innerHTML='<span class="techOrbit left"></span><span class="techOrbit right"></span><span class="techBeam b1"></span><span class="techBeam b2"></span><span class="techBeam b3"></span><span class="techNode n1"></span><span class="techNode n2"></span><span class="techNode n3"></span><span class="techNode n4"></span><span class="techPanel p1"></span><span class="techPanel p2"></span><span class="techScan"></span>';
    scene.prepend(decor);
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();