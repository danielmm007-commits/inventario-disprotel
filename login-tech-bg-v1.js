(()=>{
  if(window.__disprotelLoginTechBgV1)return;
  window.__disprotelLoginTechBgV1=true;

  const logo=document.querySelector('.logoWrap img');
  if(logo){
    logo.loading='eager';
    logo.decoding='sync';
    try{logo.fetchPriority='high'}catch(e){}
  }

  const style=document.createElement('style');
  style.id='loginTechBgStyle';
  style.textContent=`
    html{min-height:100%!important;overflow-x:hidden!important;overflow-y:auto!important}
    body{min-height:100%!important;overflow-x:hidden!important;overflow-y:auto!important}
    .scene{min-height:100svh!important;height:auto!important;overflow:hidden!important;background:radial-gradient(circle at 18% 18%,rgba(0,177,255,.14),transparent 27%),radial-gradient(circle at 82% 24%,rgba(24,111,255,.12),transparent 25%),radial-gradient(circle at 50% 110%,rgba(0,133,255,.16),transparent 34%),linear-gradient(135deg,#041329 0%,#08264a 48%,#0b3562 100%)!important}
    .scene:before{content:""!important;position:absolute!important;inset:-8%!important;background-image:linear-gradient(rgba(91,203,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(91,203,255,.07) 1px,transparent 1px)!important;background-size:46px 46px!important;background-position:0 0!important;background-repeat:repeat!important;opacity:.34!important;transform:none!important;animation:techGridDrift 22s linear infinite!important;pointer-events:none!important;z-index:0!important}
    .scene:after{content:""!important;position:absolute!important;inset:0!important;background:radial-gradient(ellipse at 50% 48%,rgba(4,18,39,.05) 0%,rgba(3,14,32,.16) 36%,rgba(2,10,24,.42) 100%),linear-gradient(90deg,rgba(1,9,23,.18),transparent 28%,transparent 72%,rgba(1,9,23,.18))!important;pointer-events:none!important;z-index:2!important}
    .center{min-height:100svh!important;height:100svh!important;display:grid!important;place-items:center!important;padding:clamp(44px,7vh,74px) 18px clamp(12px,3vh,26px)!important;overflow:hidden!important}
    .card{width:min(455px,92vw)!important;max-height:calc(100svh - 20px)!important;padding:clamp(14px,2.7vh,24px) 28px clamp(13px,2.5vh,22px)!important}
    .logoWrap{width:76%!important;max-width:clamp(190px,34vh,300px)!important;margin:0 auto clamp(2px,1vh,7px)!important}
    .divider{margin:clamp(5px,1.6vh,12px) auto clamp(8px,2.2vh,17px)!important}
    label{margin:clamp(6px,1.5vh,11px) 0 clamp(3px,.8vh,6px)!important}
    .field input{height:clamp(40px,6.2vh,49px)!important}
    .row{margin-top:clamp(6px,1.5vh,12px)!important}
    .go{height:clamp(41px,6.4vh,51px)!important;margin-top:clamp(8px,2vh,17px)!important}
    .support{height:clamp(32px,5vh,40px)!important;margin-top:clamp(5px,1.2vh,9px)!important}
    .locations{margin-top:clamp(6px,1.8vh,15px)!important;padding-top:clamp(6px,1.5vh,12px)!important}
    .secure{margin-top:clamp(4px,1.2vh,10px)!important}
    .techDecor{position:absolute;inset:0;z-index:1;overflow:hidden;pointer-events:none}
    .techOrbit{position:absolute;border:1px solid rgba(94,218,255,.24);border-radius:50%;box-shadow:0 0 38px rgba(0,169,255,.08),inset 0 0 32px rgba(0,169,255,.04);animation:techOrbit 30s linear infinite}
    .techOrbit:before,.techOrbit:after{content:"";position:absolute;border-radius:50%;border:1px dashed rgba(111,226,255,.14)}
    .techOrbit:before{inset:12%}.techOrbit:after{inset:27%}
    .techOrbit.left{width:520px;height:520px;left:-235px;top:16%}
    .techOrbit.right{width:420px;height:420px;right:-175px;top:8%;animation-direction:reverse;animation-duration:36s}

    .techBeam{position:absolute;height:2px;overflow:visible;background:linear-gradient(90deg,transparent,rgba(62,172,230,.20) 12%,rgba(86,218,255,.32) 50%,rgba(62,172,230,.18) 88%,transparent);box-shadow:0 0 8px rgba(40,188,244,.10);opacity:.82;transform-origin:left center}
    .techBeam:before{content:"";position:absolute;left:0;right:0;top:-7px;height:16px;background:repeating-linear-gradient(90deg,transparent 0 34px,rgba(91,221,255,.18) 35px 36px,transparent 37px 70px);opacity:.5}
    .techBeam:after{content:"";position:absolute;top:-2px;left:-90px;width:92px;height:6px;border-radius:999px;background:linear-gradient(90deg,transparent 0%,rgba(138,239,255,.20) 18%,#c8f8ff 48%,#61ddff 68%,transparent 100%);filter:blur(.15px) drop-shadow(0 0 5px #58dcff) drop-shadow(0 0 12px rgba(31,182,255,.95));animation:techLightRun 3.4s linear infinite;will-change:transform}
    .techBeam.b1{width:390px;left:3%;top:29%;transform:rotate(-16deg)}
    .techBeam.b1:after{animation-duration:3.15s}
    .techBeam.b2{width:350px;right:2%;bottom:25%;transform:rotate(18deg)}
    .techBeam.b2:after{animation-duration:3.9s;animation-delay:-1.4s}
    .techBeam.b3{width:285px;right:9%;top:59%;transform:rotate(-32deg)}
    .techBeam.b3:after{animation-duration:2.85s;animation-delay:-2.1s}
    .techBeam.b4{width:310px;left:7%;bottom:20%;transform:rotate(24deg)}
    .techBeam.b4:after{animation-duration:4.25s;animation-delay:-.8s}
    .techBeam.b5{width:300px;right:6%;top:31%;transform:rotate(28deg)}
    .techBeam.b5:after{animation-duration:3.55s;animation-delay:-2.6s}
    .techBeam.b6{width:245px;left:16%;top:66%;transform:rotate(-29deg)}
    .techBeam.b6:after{animation-duration:3.05s;animation-delay:-1.7s}

    .techNode{position:absolute;width:8px;height:8px;border-radius:50%;background:#78e6ff;box-shadow:0 0 0 6px rgba(104,225,255,.06),0 0 19px rgba(58,215,255,.85);animation:techNodePulse 3.2s ease-in-out infinite}
    .techNode.n1{left:10%;top:21%}.techNode.n2{left:18%;bottom:19%;animation-delay:-1.2s}.techNode.n3{right:12%;top:24%;animation-delay:-2.1s}.techNode.n4{right:20%;bottom:17%;animation-delay:-.7s}.techNode.n5{left:29%;top:37%;animation-delay:-1.8s}.techNode.n6{right:30%;top:69%;animation-delay:-2.7s}
    .techPanel{position:absolute;width:230px;height:150px;border:1px solid rgba(119,220,255,.10);border-radius:18px;background:linear-gradient(135deg,rgba(32,121,188,.035),rgba(29,205,255,.015));box-shadow:inset 0 0 35px rgba(28,183,255,.025);animation:techFloat 9s ease-in-out infinite}
    .techPanel.p1{left:3.5%;bottom:7%;transform:rotate(-7deg)}
    .techPanel.p2{right:4%;top:14%;transform:rotate(8deg);animation-delay:-4s}
    .techScan{position:absolute;inset:-30%;background:linear-gradient(112deg,transparent 46%,rgba(100,222,255,.025) 49%,rgba(112,225,255,.07) 50%,rgba(100,222,255,.025) 51%,transparent 54%);animation:techScan 11s linear infinite;opacity:.62}
    .top,.center{z-index:3!important}

    .card{isolation:isolate!important}
    .loginBorderRunner{position:absolute;inset:0;z-index:30;pointer-events:none;border-radius:inherit;overflow:hidden}
    .loginBorderRunner .edge{position:absolute;display:block;opacity:0;background:linear-gradient(90deg,transparent 0%,rgba(116,231,255,.20) 10%,#d8fbff 42%,#65ddff 68%,transparent 100%);filter:drop-shadow(0 0 4px #74e7ff) drop-shadow(0 0 11px rgba(44,194,255,.95));will-change:left,top,right,bottom,opacity}
    .loginBorderRunner .edgeTop,.loginBorderRunner .edgeBottom{width:92px;height:2px}
    .loginBorderRunner .edgeRight,.loginBorderRunner .edgeLeft{width:2px;height:92px;background:linear-gradient(180deg,transparent 0%,rgba(116,231,255,.20) 10%,#d8fbff 42%,#65ddff 68%,transparent 100%)}
    .loginBorderRunner .edgeTop{top:0;left:-100px;animation:loginEdgeTop 5.6s linear infinite}
    .loginBorderRunner .edgeRight{right:0;top:-100px;animation:loginEdgeRight 5.6s linear 1.4s infinite}
    .loginBorderRunner .edgeBottom{bottom:0;right:-100px;animation:loginEdgeBottom 5.6s linear 2.8s infinite}
    .loginBorderRunner .edgeLeft{left:0;bottom:-100px;animation:loginEdgeLeft 5.6s linear 4.2s infinite}

    @keyframes techGridDrift{from{transform:translate3d(0,0,0)}to{transform:translate3d(46px,46px,0)}}
    @keyframes techOrbit{to{transform:rotate(360deg)}}
    @keyframes techNodePulse{0%,100%{opacity:.42;transform:scale(.8);box-shadow:0 0 0 4px rgba(104,225,255,.04),0 0 11px rgba(58,215,255,.42)}50%{opacity:1;transform:scale(1.35);box-shadow:0 0 0 10px rgba(104,225,255,.07),0 0 26px rgba(58,215,255,1)}}
    @keyframes techLightRun{0%{transform:translateX(0);opacity:0}8%{opacity:1}86%{opacity:1}100%{transform:translateX(calc(100% + 390px));opacity:0}}
    @keyframes techFloat{0%,100%{translate:0 0}50%{translate:0 -12px}}
    @keyframes techScan{from{transform:translate3d(-10%,-8%,0)}to{transform:translate3d(10%,8%,0)}}
    @keyframes loginEdgeTop{0%{left:-100px;opacity:0}2%{opacity:1}23%{left:100%;opacity:1}25%,100%{left:100%;opacity:0}}
    @keyframes loginEdgeRight{0%{top:-100px;opacity:0}2%{opacity:1}23%{top:100%;opacity:1}25%,100%{top:100%;opacity:0}}
    @keyframes loginEdgeBottom{0%{right:-100px;opacity:0}2%{opacity:1}23%{right:100%;opacity:1}25%,100%{right:100%;opacity:0}}
    @keyframes loginEdgeLeft{0%{bottom:-100px;opacity:0}2%{opacity:1}23%{bottom:100%;opacity:1}25%,100%{bottom:100%;opacity:0}}

    @media(max-width:720px){
      body{overflow-y:auto!important}
      .center{height:auto!important;min-height:100svh!important;overflow:visible!important;padding:58px 12px 18px!important}
      .card{width:min(395px,94vw)!important;max-height:none!important;padding:20px 18px 18px!important}
      .logoWrap{width:72%!important;max-width:245px!important}
      .techOrbit.left{width:330px;height:330px;left:-175px;top:18%}.techOrbit.right{width:280px;height:280px;right:-145px;top:12%}.techPanel{width:150px;height:105px;opacity:.55}.techBeam{opacity:.52}.techBeam.b4,.techBeam.b6{display:none}.techNode{width:7px;height:7px}
    }
    @media(max-height:800px) and (min-width:721px){
      .top{top:9px!important}
      .center{padding:38px 18px 8px!important}
      .card{padding:16px 26px 14px!important;border-radius:21px!important}
      .logoWrap{max-width:245px!important;margin-bottom:3px!important}
      .slogan{font-size:12px!important}
      .divider{margin:7px auto 11px!important}
      label{margin:7px 0 4px!important}
      .field input{height:44px!important}
      .eye{top:4px!important;height:36px!important}
      .row{margin-top:9px!important}
      .go{height:46px!important;margin-top:11px!important}
      .support{height:35px!important;margin-top:7px!important}
      .locations{margin-top:9px!important;padding-top:8px!important}
      .secure{margin-top:6px!important}
    }
    @media(max-height:680px) and (min-width:721px){
      .top{top:6px!important}.topState span{padding:5px 8px!important}
      .center{padding:34px 14px 7px!important}
      .card{padding:10px 22px 9px!important;border-radius:18px!important}
      .logoWrap{max-width:175px!important;margin-bottom:0!important}
      .slogan{font-size:10px!important}
      .divider{margin:4px auto 6px!important}
      label{margin:4px 0 3px!important;font-size:9px!important}
      .field input{height:38px!important}
      .eye{top:3px!important;height:32px!important}
      .row{margin-top:5px!important}
      .go{height:39px!important;margin-top:7px!important;font-size:12px!important}
      .support{height:30px!important;margin-top:5px!important}
      .locations{margin-top:5px!important;padding-top:5px!important}
      .secure{margin-top:4px!important}
    }
    @media(prefers-reduced-motion:reduce){.techDecor *,.loginBorderRunner *{animation:none!important}.scene:before{animation:none!important}}
  `;
  document.head.appendChild(style);

  const mount=()=>{
    const scene=document.querySelector('.scene');
    if(!scene)return;
    if(!scene.querySelector('.techDecor')){
      const decor=document.createElement('div');
      decor.className='techDecor';
      decor.setAttribute('aria-hidden','true');
      decor.innerHTML='<span class="techOrbit left"></span><span class="techOrbit right"></span><span class="techBeam b1"></span><span class="techBeam b2"></span><span class="techBeam b3"></span><span class="techBeam b4"></span><span class="techBeam b5"></span><span class="techBeam b6"></span><span class="techNode n1"></span><span class="techNode n2"></span><span class="techNode n3"></span><span class="techNode n4"></span><span class="techNode n5"></span><span class="techNode n6"></span><span class="techPanel p1"></span><span class="techPanel p2"></span><span class="techScan"></span>';
      scene.prepend(decor);
    }
    const card=document.querySelector('.card');
    if(card&&!card.querySelector('.loginBorderRunner')){
      const border=document.createElement('div');
      border.className='loginBorderRunner';
      border.setAttribute('aria-hidden','true');
      border.innerHTML='<span class="edge edgeTop"></span><span class="edge edgeRight"></span><span class="edge edgeBottom"></span><span class="edge edgeLeft"></span>';
      card.appendChild(border);
    }
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();