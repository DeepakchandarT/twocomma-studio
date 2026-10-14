/* Scroll choreography for a pouring bottle and a real, continuous falling card. */
(() => {
  'use strict';
  const clamp=x=>Math.max(0,Math.min(1,x));
  const mix=(a,b,p)=>a+(b-a)*p;
  const range=(x,a,b)=>clamp((x-a)/(b-a));
  const ease=x=>x*x*(3-2*x);
  const part=(x,a,b)=>ease(range(x,a,b));
  const windowAt=(x,a,b,c,d)=>part(x,a,b)*(1-part(x,c,d));
  function compute(q,w,h,t,less=false){
    const mobile=w<=760;
    const roll=part(q,1.62,2.08),pourTilt=part(q,2.05,2.2);
    const bh=mobile?Math.min(h*.27,w*.56):Math.min(h*.45,w*.32,460);
    const angle=less?mix(88,118,pourTilt):mix(-272,88,roll)+30*pourTilt;
    const cx=mix(w*(mobile?.62:.74),w*(mobile?.39:.63),roll);
    const cy=mix(-bh*.68,h*(mobile?.50:.30),roll);
    const rad=angle*Math.PI/180,mx=-bh/3*.025,my=-bh*.478;
    const mouth={x:cx+mx*Math.cos(rad)-my*Math.sin(rad),y:cy+mx*Math.sin(rad)+my*Math.cos(rad)};
    const pool={x:w*(mobile?.56:.73),y:h*(mobile?.745:.66),rx:w*(mobile?.45:.235),ry:h*(mobile?.139:.18)};
    const impact={x:mouth.x+(mobile?9:15),y:pool.y-pool.ry*.45};
    const rollExit=part(q,2.84,3.12);
    const fanIn=part(q,3.02,3.38),fanOut=part(q,3.94,4.26);
    const fan=part(q,3.2,3.72),pick=part(q,3.9,4.1);
    const release=range(q,4.1,4.59),fall=less?ease(release):release*release;
    const landing=range(q,4.59,4.86);
    const bounce=less?0:-Math.abs(Math.sin(landing*Math.PI*2))*Math.pow(1-landing,2)*h*.026;
    const startY=h*(mobile?.565:.53)-(1-fanIn)*h*.16;
    const releaseY=h*.25;
    const landY=h*.51;
    const y=release>0?mix(releaseY,landY,fall)+bounce:mix(startY,releaseY,pick);
    const baseW=mobile?Math.min(w*.63,350):Math.min(w*.31,460);
    const finalW=mobile?Math.min(w*.82,440):Math.min(w*.43,660);
    const size=mix(baseW,finalW,part(q,4.13,4.59));
    const flutter=less?0:Math.sin(release*Math.PI)*30;
    const x=w*.5+(less?0:Math.sin(release*Math.PI)*w*.052);
    const card={x,y,w:size,h:size*.625,rotation:mix(-5,-4,part(q,4.1,4.59))+flutter,
      tiltX:less?0:Math.sin(release*Math.PI)*24,
      flip:part(q,4.12,4.57)*180,
      alpha:part(q,3.05,3.32)};
    const float=less?0:Math.sin(t*.75)*3;
    const sideW=baseW*.91;
    return {
      wine:{alpha:windowAt(q,1.58,1.88,2.86,3.13),bh,cx,cy:cy+rollExit*h*.14,angle,
        yaw:less?0:Math.sin(roll*Math.PI)*38,mouth,impact,pool,
        stream:part(q,2.12,2.24)*(1-part(q,2.72,2.85)),reach:part(q,2.12,2.27),growth:part(q,2.23,2.57),
        message:windowAt(q,2.27,2.56,2.85,3.1)},
      fan:{alpha:fanIn*(1-fanOut),w:sideW,h:sideW*.625,
        leftX:w*.5-baseW*(.12+fan*(mobile?.29:.52))-fanOut*w*.17,
        rightX:w*.5+baseW*(.12+fan*(mobile?.29:.52))+fanOut*w*.17,
        y:h*(mobile?.555:.53)+baseW*.05+float-fanOut*h*.26,
        leftAngle:-7-21*fan-18*fanOut,rightAngle:7+18*fan+18*fanOut},
      card,shadow:{alpha:part(q,4.1,4.6)*.31,w:size*.94,y:landY+card.h*.52,blur:mix(28,8,fall)},
      finale:part(q,4.65,4.87)
    };
  }
  function liquid(ctx,state,t,w,h,less){
    if(!ctx)return;
    ctx.clearRect(0,0,w,h);
    const {pool,mouth,impact,growth,stream,reach}=state;
    if(growth>.001){
      const scale=.16+.84*Math.sqrt(growth),rx=pool.rx*scale,ry=pool.ry*scale;
      const px=mix(impact.x,pool.x,ease(growth)),py=mix(impact.y,pool.y,ease(growth));
      ctx.save();ctx.shadowColor='rgba(60,15,18,.20)';ctx.shadowBlur=12;ctx.shadowOffsetY=7;
      ctx.beginPath();
      const count=100;
      for(let i=0;i<=count;i++){
        const a=i/count*Math.PI*2;
        const edge=1+.045*Math.sin(a*3+1.4)+.03*Math.cos(a*5-.3)+.018*Math.sin(a*9);
        const shimmer=less?0:Math.sin(a*7+t*.8)*.006*stream;
        const x=px+Math.cos(a)*rx*(edge+shimmer),y=py+Math.sin(a)*ry*(edge+shimmer);
        i?ctx.lineTo(x,y):ctx.moveTo(x,y);
      }
      ctx.closePath();
      const fill=ctx.createRadialGradient(px-rx*.35,py-ry*.4,0,px,py,rx);
      fill.addColorStop(0,'#781c35');fill.addColorStop(.4,'#590d24');fill.addColorStop(.82,'#390617');fill.addColorStop(1,'#25030e');
      ctx.fillStyle=fill;ctx.fill();ctx.shadowColor='transparent';ctx.strokeStyle='rgba(152,58,72,.48)';ctx.lineWidth=1.2;ctx.stroke();
      ctx.beginPath();ctx.ellipse(px-rx*.1,py-ry*.75,rx*.50,ry*.085,-.08,Math.PI*1.08,Math.PI*1.93);
      ctx.strokeStyle='rgba(255,225,198,.25)';ctx.lineWidth=1.3;ctx.stroke();
      if(stream>.1){
        for(let i=0;i<3;i++){
          const phase=((t*.8+i*.33)%1),r=6+phase*(w<=760?24:42);
          ctx.beginPath();ctx.ellipse(impact.x,impact.y,r,r*.38,0,0,Math.PI*2);ctx.strokeStyle=`rgba(236,176,169,${(1-phase)*.17*stream})`;ctx.lineWidth=1;ctx.stroke();
        }
      }
      ctx.restore();
    }
    if(stream>.001){
      const endY=mix(mouth.y,impact.y,reach),endX=mix(mouth.x,impact.x,reach);
      const length=endY-mouth.y,sw=(w<=760?4.4:7)*stream;
      ctx.save();ctx.beginPath();
      const left=[],right=[];
      for(let i=0;i<=40;i++){
        const p=i/40,y=mouth.y+length*p;
        const jiggle=less?0:Math.sin(p*13-t*8)*p*(1-p)*(w<=760?2:3);
        const x=mix(mouth.x,endX,p)+Math.sin(p*Math.PI)*sw*.5+jiggle;
        const width=sw*(.8+p*.38);
        left.push([x-width/2,y]);right.push([x+width/2,y]);
      }
      ctx.moveTo(...left[0]);left.slice(1).forEach(p=>ctx.lineTo(...p));right.reverse().forEach(p=>ctx.lineTo(...p));ctx.closePath();
      const flow=ctx.createLinearGradient(mouth.x-sw,mouth.y,mouth.x+sw,mouth.y);flow.addColorStop(0,'#380416');flow.addColorStop(.45,'#931f3c');flow.addColorStop(.64,'#c55465');flow.addColorStop(1,'#400415');ctx.fillStyle=flow;ctx.fill();
      if(reach>.98){
        for(let i=0;i<7;i++){
          const phase=(t*1.2+i*.147)%1,side=i%2?1:-1;
          const x=impact.x+side*Math.sin(phase*Math.PI)*sw*(1.5+i*.23),y=impact.y-Math.sin(phase*Math.PI)*sw*(2+i*.24);
          ctx.beginPath();ctx.ellipse(x,y,sw*.16,sw*.26,side*.3,0,Math.PI*2);ctx.fillStyle='rgba(109,14,42,.7)';ctx.fill();
        }
      }
      ctx.restore();
    }
  }
  function create(){
    const $=s=>document.querySelector(s),world=$('#pour-world'),canvas=$('#wine-canvas'),bottle=$('#wine-bottle'),message=$('#wine-message');
    const creative=$('#creative-world'),left=$('#idea-left'),right=$('#idea-right'),card=$('#falling-card'),inner=$('.falling-card-inner'),shadow=$('#card-shadow');
    const ctx=canvas.getContext('2d');let cw=0,ch=0,dpr=1;
    if(!ctx)document.body.classList.add('no-liquid');
    const show=(el,a,semantic=false)=>{el.style.opacity=a;el.style.visibility=a>.015?'visible':'hidden';if(semantic){el.inert=a<.04;el.setAttribute('aria-hidden',String(a<.04));}};
    return {update(q,w,h,t,less){
      const s=compute(q,w,h,t,less),wine=s.wine;
      if(cw!==w||ch!==h){cw=w;ch=h;dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);if(ctx)ctx.setTransform(dpr,0,0,dpr,0,0);}
      show(world,wine.alpha);show(message,wine.message,true);
      if(wine.alpha>.001)liquid(ctx,wine,less?0:t,w,h,less);
      bottle.style.width=(wine.bh/3)+'px';bottle.style.height=wine.bh+'px';bottle.style.left=wine.cx+'px';bottle.style.top=wine.cy+'px';
      bottle.style.transform=`translate(-50%,-50%) rotate(${wine.angle}deg) rotateY(${wine.yaw}deg)`;
      message.style.left=wine.pool.x+'px';message.style.top=wine.pool.y+'px';
      message.style.transform=`translate(-50%,-50%) translateY(${(1-wine.message)*14}px)`;
      show(creative,s.fan.alpha);
      [[left,s.fan.leftX,s.fan.leftAngle],[right,s.fan.rightX,s.fan.rightAngle]].forEach(([el,x,angle])=>{el.style.width=s.fan.w+'px';el.style.height=s.fan.h+'px';el.style.left=x+'px';el.style.top=s.fan.y+'px';el.style.transform=`translate(-50%,-50%) rotate(${less?angle*.2:angle}deg)`;});
      show(card,s.card.alpha);card.style.width=s.card.w+'px';card.style.height=s.card.h+'px';card.style.left=s.card.x+'px';card.style.top=s.card.y+'px';
      card.style.transform=`translate(-50%,-50%) rotate(${s.card.rotation}deg)`;inner.style.transform=`rotateX(${s.card.tiltX}deg) rotateY(${s.card.flip}deg)`;
      show(shadow,s.shadow.alpha);shadow.style.width=s.shadow.w+'px';shadow.style.top=s.shadow.y+'px';shadow.style.filter=`blur(${s.shadow.blur}px)`;
      return s;
    }};
  }
  window.TwocommaStory={create,compute,liquid};
})();
