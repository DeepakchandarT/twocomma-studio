(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const clamp = (n,a=0,b=1) => Math.min(b,Math.max(a,n));
  const lerp = (a,b,p) => a+(b-a)*p;
  const range = (v,a,b) => clamp((v-a)/(b-a));
  const ease = p => p*p*(3-2*p);
  const seg = (v,a,b) => ease(range(v,a,b));
  const envelope = (v,a,b,c,d) => seg(v,a,b)*(1-seg(v,c,d));
  const experience=$('#experience'), stage=$('#stage'), cloth=$('#cloth');
  const table=$('#table-world'), hero=$('#hero-copy'), approach=$('#approach'), craft=$('#craft');
  const studio=$('#studio'), studioRight=$('#studio-right'), finale=$('#finale');
  const sceneNames=['THE FIRST IMPRESSION','A PLACE AT THE TABLE','SOMETHING WORTH SAYING','A STUDIO WITH CHARACTER','YOUR NEXT CHAPTER'];
  const objects=[hero,approach,craft,studio,studioRight,finale];
  let w=innerWidth,h=innerHeight,mobile=w<=760,q=0,targetQ=0,lastQ=0,scrollLength=1;
  let reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let lastTime=0,lastPaint=0,frame=0,visible=true,mouse={x:0,y:0};
  const visibility=new WeakMap();
  function show(el,opacity){
    opacity=clamp(opacity);el.style.opacity=opacity.toFixed(4);
    const active=opacity>.04;
    if(visibility.get(el)!==active){el.style.visibility=active?'visible':'hidden';visibility.set(el,active);}
    if(objects.includes(el)){el.inert=!active;el.setAttribute('aria-hidden',String(!active));}
  }
  function resize(){w=innerWidth;h=stage.clientHeight;mobile=w<=760;scrollLength=experience.offsetHeight-h;silk.resize(w,h);readScroll();}
  function readScroll(){targetQ=clamp((scrollY-experience.offsetTop)/Math.max(1,scrollLength))*5;}
  function goToScene(value){window.scrollTo({top:experience.offsetTop+scrollLength*Number(value)/5,behavior:reduced?'instant':'smooth'});}
  $$('[data-scene]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();goToScene(el.dataset.scene);}));
  addEventListener('scroll',readScroll,{passive:true});
  addEventListener('pointermove',e=>{mouse.x=(e.clientX/w-.5)*2;mouse.y=(e.clientY/h-.5)*2;},{passive:true});

  const silk=window.TwocommaCloth.create($('#silk-canvas'),cloth);
  const story=window.TwocommaStory.create();
  let currentChapter=-1;
  function update(t){
    const pull=seg(q,.20,1.02), leave=seg(q,1.3,1.85);
    const cream=seg(q,1.5,1.95);$('.wall-light').style.opacity=cream;
    document.body.classList.toggle('light-ui',q>1.73||scrollY>scrollLength);
    const tableSize=mobile?Math.min(w*1.05,h*.54):Math.min(w*.76,h*.94);
    const rot=reduced?0:-leave*68;
    const tx=w*(mobile?.55:.68)-leave*w*.85,ty=h*(mobile?(h<740?.73:.67):.52)+leave*h*.2,scale=1-leave*.2;
    table.style.width=tableSize+'px';table.style.left=tx+'px';table.style.top=ty+'px';table.style.transform=`translate(-50%,-50%) rotate(${rot}deg) scale(${scale})`;
    show(table,seg(q,.12,.6)*(1-seg(q,1.55,1.95)));
    const rad=rot*Math.PI/180,offsetX=-tableSize*.21,offsetY=tableSize*.21;
    const napkinX=tx+(offsetX*Math.cos(rad)-offsetY*Math.sin(rad))*scale;
    const napkinY=ty+(offsetX*Math.sin(rad)+offsetY*Math.cos(rad))*scale;
    show(cloth,1-seg(q,1.55,1.95));
    if(q<1.96)silk.draw(t,pull,[napkinX,napkinY,tableSize*.33*scale,tableSize*.27*scale],(-16+rot)*Math.PI/180,reduced);
    show(hero,1-seg(q,.12,.4));hero.style.transform=`translateY(${-seg(q,.12,.5)*50}px)`;
    const av=envelope(q,.78,1.03,1.32,1.65);show(approach,av);approach.style.transform=`translateY(${(1-av)*28}px)`;
    const storyState=story.update(q,w,h,t,reduced);
    const cv=envelope(q,1.83,2.08,2.78,3.08);show(craft,cv);craft.style.transform=`translateY(${(1-cv)*25}px)`;
    const studioVis=envelope(q,3.08,3.4,3.98,4.2);show(studio,studioVis);studio.style.transform=`translateY(${(1-studioVis)*-20}px)`;
    const rightVis=envelope(q,3.35,3.68,3.98,4.2);show(studioRight,rightVis);studioRight.style.transform=`translateY(${(1-rightVis)*20}px)`;
    show(finale,storyState.finale);
    const chapter=q<.63?0:q<1.8?1:q<3.03?2:q<4.4?3:4;
    if(chapter!==currentChapter){currentChapter=chapter;$('#scene-number').textContent=`0${chapter+1} / 05`;$('#scene-name').textContent=sceneNames[chapter];$$('.chapter-dots button').forEach((el,i)=>{el.classList.toggle('active',i===chapter);if(i===chapter)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});}
    $('.progress-track i').style.transform=`scaleX(${q/5})`;
    $('.site-header').style.opacity=scrollY>experience.offsetHeight-80?'0':'1';$('.site-header').inert=scrollY>experience.offsetHeight-80;
    if(Math.abs(q-lastQ)<.3){[[.3,'cloth'],[1.94,'bottle'],[2.2,'pour'],[3.4,'paper'],[4.1,'paper'],[4.63,'land']].forEach(([at,type])=>{if(q>=at&&lastQ<at)playSound(type);});}
    lastQ=q;
  }
  function animate(time){
    frame=requestAnimationFrame(animate);
    if(!visible)return;
    const dt=Math.min((time-lastTime)/1000,.05);lastTime=time;
    q=reduced?targetQ:lerp(q,targetQ,1-Math.exp(-dt*13));if(Math.abs(q-targetQ)<.0001)q=targetQ;
    if(time-lastPaint<1000/(mobile?30:45))return;lastPaint=time;
    if(scrollY>experience.offsetHeight+100){$('.site-header').style.opacity='0';$('.site-header').inert=true;return;}
    update(time/1000);
  }
  const soundToggle=$('#sound-toggle');let audio=null,sound=false,lastSound=0;
  function playSound(type){
    if(!sound||!audio||audio.state!=='running')return;
    const now=audio.currentTime;if(now-lastSound<.18)return;lastSound=now;
    const dur=type==='pour'?.85:type==='cloth'?.52:type==='paper'?.28:.22;
    const gain=audio.createGain();gain.connect(audio.destination);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(type==='bottle'?.055:.025,now+.018);gain.gain.exponentialRampToValueAtTime(.0001,now+dur);
    if(['cloth','paper','pour'].includes(type)){
      const buffer=audio.createBuffer(1,Math.floor(audio.sampleRate*dur),audio.sampleRate);let data=buffer.getChannelData(0),last=0;for(let i=0;i<data.length;i++){last=(last+(Math.random()*2-1)*.2)/1.2;data[i]=last;}
      const source=audio.createBufferSource();source.buffer=buffer;const filter=audio.createBiquadFilter();filter.type='bandpass';filter.frequency.value=type==='pour'?420:type==='cloth'?900:2500;filter.Q.value=.6;source.connect(filter);filter.connect(gain);source.start(now);
      if(type==='pour'){for(let i=0;i<6;i++){const bubble=audio.createOscillator(),g=audio.createGain(),at=now+i*.11;bubble.frequency.setValueAtTime(180+i%3*70,at);bubble.frequency.exponentialRampToValueAtTime(90,at+.09);g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(.16,at+.012);g.gain.exponentialRampToValueAtTime(.0001,at+.1);bubble.connect(g);g.connect(gain);bubble.start(at);bubble.stop(at+.11);}}
    }else{const osc=audio.createOscillator();osc.type='sine';osc.frequency.setValueAtTime(type==='bottle'?140:90,now);osc.frequency.exponentialRampToValueAtTime(45,now+dur);osc.connect(gain);osc.start(now);osc.stop(now+dur);}
  }
  soundToggle.addEventListener('click',async()=>{
    try{if(!audio){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio){$('#sound-label').textContent='SOUND UNAVAILABLE';return;}audio=new Audio();}await audio.resume();sound=!sound;soundToggle.setAttribute('aria-pressed',String(sound));soundToggle.setAttribute('aria-label',sound?'Mute sound effects':'Enable sound effects');$('#sound-label').textContent=sound?'SOUND ON':'SOUND OFF';document.body.classList.toggle('sound-on',sound);if(sound)playSound('paper');}catch{$('#sound-label').textContent='SOUND UNAVAILABLE';}
  });
  function motionState(){document.body.classList.toggle('less-motion',reduced);$('#motion-toggle').setAttribute('aria-pressed',String(reduced));$('#motion-toggle').textContent=reduced?'FULL MOTION':'LESS MOTION';}
  $('#motion-toggle').addEventListener('click',()=>{reduced=!reduced;motionState();});motionState();
  document.addEventListener('visibilitychange',()=>{visible=!document.hidden;if(!visible&&audio)audio.suspend();else if(visible&&audio&&sound)audio.resume().catch(()=>{});});

  // Contact is an honest handoff: a copyable brief, then the studio's supplied Instagram.
  const contact=$('#contact-dialog'),serviceDialog=$('#service-dialog');let previousFocus=null;
  function openDialog(dialog){previousFocus=document.activeElement;dialog.showModal();document.body.classList.add('dialog-open');}
  function closeDialog(dialog){dialog.close();document.body.classList.remove('dialog-open');previousFocus?.focus();}
  $$('[data-contact]').forEach(el=>el.addEventListener('click',()=>openDialog(contact)));
  $$('dialog').forEach(dialog=>{
    dialog.querySelector('.close-dialog').addEventListener('click',()=>closeDialog(dialog));
    dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog(dialog);}});
    dialog.addEventListener('close',()=>document.body.classList.remove('dialog-open'));
  });
  const services={
    strategy:{number:'01 / OUR CRAFT',title:'A presence with purpose.',description:'Before the first post comes a point of view. We shape a social presence around your brand, your audience and what you want to be known for.',items:['Brand and audience direction','Content pillars and channel planning','Campaign concepts and publishing rhythm']},
    content:{number:'02 / OUR CRAFT',title:'Something worth stopping for.',description:'A good story makes people look. A consistent one makes them remember. We bring words, visuals and ideas together with intention.',items:['Social concepts and creative direction','Copywriting and brand storytelling','Short-form video concepts and campaign content']},
    brand:{number:'03 / OUR CRAFT',title:'Unmistakably you.',description:'Every detail says something. We build a coherent visual world that gives your brand its own character, on your feed and beyond.',items:['Visual direction and brand identity','Typography, colour and design systems','Social templates and campaign design']}
  };
  $$('[data-service]').forEach(button=>button.addEventListener('click',()=>{const s=services[button.dataset.service];$('#service-number').textContent=s.number;$('#service-title').textContent=s.title;$('#service-description').textContent=s.description;$('#service-deliverables').replaceChildren(...s.items.map(t=>{const li=document.createElement('li');li.textContent=t;return li;}));openDialog(serviceDialog);}));
  $('#service-contact').addEventListener('click',()=>{serviceDialog.close();openDialog(contact);});
  $('#brief-form').addEventListener('submit',e=>{e.preventDefault();const d=new FormData(e.currentTarget);$('#brief-text').value=`Hi Twocomma Studio!\n\nI’m ${String(d.get('name')).trim()} from ${String(d.get('brand')).trim()}.\n\nI’m interested in: ${d.get('service')}.\n\nHere’s what I have in mind:\n${String(d.get('goal')).trim()}\n\nI’d love to explore working together.`;$('#brief-form').hidden=true;$('#brief-result').hidden=false;$('#copy-status').textContent='Copy your brief, then paste it into an Instagram message.';$('#copy-brief').focus();});
  $('#copy-brief').addEventListener('click',async()=>{const input=$('#brief-text');try{await navigator.clipboard.writeText(input.value);$('#copy-status').textContent='Copied. Open Instagram and paste your brief into a message to @twocommastudio.';$('#copy-brief').firstChild.textContent='Brief copied ';}catch{input.focus();input.select();$('#copy-status').textContent='Select and copy the brief above, then open Instagram to send it.';}});
  $('#edit-brief').addEventListener('click',()=>{$('#brief-result').hidden=true;$('#brief-form').hidden=false;$('#brief-form input').focus();});
  addEventListener('resize',resize,{passive:true});resize();q=targetQ;update(0);frame=requestAnimationFrame(animate);
  addEventListener('pagehide',()=>{cancelAnimationFrame(frame);if(audio)audio.suspend();});
  addEventListener('pageshow',e=>{if(e.persisted){readScroll();frame=requestAnimationFrame(animate);}});
})();
