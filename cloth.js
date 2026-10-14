/* A subdivided textile surface. The canvas stays fixed: only its cloth vertices move. */
(() => {
  'use strict';
  const vertex = `
    precision highp float;
    attribute vec2 aUV;
    uniform vec2 viewport;
    uniform vec4 destination;
    uniform mediump float pull;
    uniform float time;
    uniform float motion;
    uniform float angle;
    varying mediump vec2 uv;
    varying mediump float light;
    varying mediump float lift;
    float ease(float x){x=clamp(x,0.,1.);return x*x*(3.-2.*x);}
    vec3 surface(vec2 p){
      // Tension reaches the grabbed corner first, then travels across the fabric.
      float delay=(1.-p.x)*.24+(1.-p.y)*.14;
      float tension=ease((pull*1.38-delay)/1.0);
      float billow=sin(tension*3.14159265);
      float settle=1.-ease((pull-.80)/.20);
      vec2 initial=(p-.5)*viewport*1.20+viewport*.5;
      vec2 local=(p-.5)*destination.zw;
      local.y+=sin(p.x*10.+p.y*5.)*destination.w*.045;
      local.x+=sin(p.y*9.-p.x*4.)*destination.z*.025;
      mat2 rotation=mat2(cos(angle),sin(angle),-sin(angle),cos(angle));
      vec2 target=destination.xy+rotation*local;
      vec2 pos=mix(initial,target,tension);
      float phase=p.x*9.+p.y*16.-pull*14.+time*.8;
      float crease=sin(phase);
      float ripple=sin(p.x*20.-p.y*11.+pull*9.-time*.62);
      float size=min(viewport.x,viewport.y);
      // A lifted ridge carries the fabric; the trailing hem curls instead of shrinking evenly.
      pos.x+=billow*size*(.085*crease+.026*ripple)*motion;
      pos.y+=billow*size*(.045*sin(phase+1.2)-.11)*motion;
      // A low breeze keeps moving through the cloth even when scroll is exactly zero.
      pos.x+=(sin(p.y*7.+p.x*2.+time*.72)*.012
         +sin(p.y*14.-time*.44)*.004)*size*settle*motion;
      pos.y+=(sin(p.x*8.+p.y*3.-time*.57)*.010
         +sin(p.x*16.+time*.37)*.003)*size*settle*motion;
      float z=(billow*size*(.13+.065*crease+.02*ripple)
         +sin(p.y*9.+p.x*4.+time*.62)*size*.032*settle
         +sin(p.x*15.+p.y*7.)*destination.w*.028*tension)*motion;
      return vec3(pos,z);
    }
    void main(){
      uv=aUV;
      vec3 p=surface(aUV);
      vec3 dx=surface(aUV+vec2(.002,0.))-p;
      vec3 dy=surface(aUV+vec2(0.,.002))-p;
      vec3 n=normalize(cross(dx,dy));
      if(n.z<0.)n=-n;
      light=.50+.50*max(0.,dot(n,normalize(vec3(-.35,-.50,1.))));
      lift=p.z/min(viewport.x,viewport.y);
      gl_Position=vec4(p.x/viewport.x*2.-1.,1.-p.y/viewport.y*2.,-p.z/2000.,1.);
    }
  `;
  const fragment = `
    precision mediump float;
    varying mediump vec2 uv;
    varying mediump float light;
    varying mediump float lift;
    uniform sampler2D fabric;
    uniform sampler2D mark;
    uniform float aspect;
    uniform mediump float pull;
    uniform float destinationAspect;
    float mask(vec2 p){
      if(p.x<0.||p.x>1.||p.y<0.||p.y>1.)return 0.;
      // Explicit monochrome RGB, never the platform-dependent SVG alpha channel.
      return texture2D(mark,p).r;
    }
    void main(){
      vec2 st=uv;
      if(aspect>1.5)st.y=(st.y-.5)*1.5/aspect+.5;
      else st.x=(st.x-.5)*aspect/1.5+.5;
      vec3 colour=texture2D(fabric,clamp(st,.001,.999)).rgb;
      float currentAspect=mix(aspect,destinationAspect,smoothstep(.35,1.,pull));
      float width=aspect<1.? .47:min(.40,.65/aspect);
      width=mix(width,.58,smoothstep(.6,1.,pull));
      vec2 size=vec2(width,width*currentAspect*.58943);
      vec2 p=(uv-vec2(.5,.465))/size+.5;
      float m=mask(p);
      // A raised, tone-on-tone relief: its face remains the very same woven fabric.
      float dx=mask(p+vec2(.014,0.))-mask(p-vec2(.014,0.));
      float dy=mask(p+vec2(0.,.020))-mask(p-vec2(0.,.020));
      float relief=dx*.40+dy*.75;
      float shadow=max(0.,mask(p+vec2(.021,.028))-m);
      colour*=1.-m*.23;
      colour*=1.-shadow*.65;
      colour*=1.-max(0.,relief)*.80;
      colour+=vec3(.115,.014,.024)*max(0.,-relief);
      colour*=light;
      colour+=vec3(.035,.006,.010)*max(0.,lift);
      gl_FragColor=vec4(colour,1.);
    }
  `;
  const markPaths=[
    'M10 53C10 24 32 5 61 5c31 0 53 20 53 48 0 19-9 31-28 46l-24 19h178v23H3l66-59c14-13 22-20 22-30 0-15-12-24-28-24S34 38 34 53H10Z',
    'M240 37 219 52c-9-16-22-24-39-24-27 0-45 19-45 45 0 27 19 45 47 45h58v23h-59c-42 0-70-28-70-68 0-39 29-68 69-68 26 0 47 11 60 32Z'
  ];
  function create(canvas,host){
    let w=1,h=1,ready=false,painted=false,failed=false;
    let gl;
    try{gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,powerPreference:'low-power'});}catch{}
    function fallback(){failed=true;document.body.classList.add('no-webgl');document.body.classList.remove('silk-ready');canvas.hidden=true;}
    if(!gl){fallback();return {resize(){},draw:drawFallback};}
    function shader(type,code){const s=gl.createShader(type);gl.shaderSource(s,code);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
    let program;
    try{
      program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
    }catch{fallback();return {resize(){},draw:drawFallback};}
    gl.useProgram(program);
    const cols=64,rows=80,vertices=[],indices=[];
    for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++)vertices.push(x/cols,y/rows);
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const a=y*(cols+1)+x,b=a+1,c=a+cols+1,d=c+1;indices.push(a,c,b,b,c,d);}
    const vertexBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
    const attr=gl.getAttribLocation(program,'aUV');gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,2,gl.FLOAT,false,0,0);
    const indexBuffer=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
    const uniforms=Object.fromEntries(['viewport','destination','pull','time','motion','angle','aspect','destinationAspect'].map(k=>[k,gl.getUniformLocation(program,k)]));
    const textures=[];
    function texture(unit,name,source){
      const tex=gl.createTexture();textures[unit]=tex;gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.uniform1i(gl.getUniformLocation(program,name),unit);
    }
    const mask=document.createElement('canvas');mask.width=984;mask.height=580;
    const ctx=mask.getContext('2d');ctx.fillStyle='#000';ctx.fillRect(0,0,984,580);ctx.scale(4,4);ctx.fillStyle='#fff';
    // Soften the height field into a rounded bevel, rather than a hard printed edge.
    ctx.filter='blur(8px)';markPaths.forEach(path=>ctx.fill(new Path2D(path)));ctx.filter='none';
    texture(1,'mark',mask);
    const photo=new Image();photo.onload=()=>{try{texture(0,'fabric',photo);ready=true;}catch{fallback();}};photo.onerror=fallback;photo.src='silk.webp';
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.clearColor(0,0,0,0);
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fallback();});
    function drawFallback(t,p,destination,angle,less){
      // Non-WebGL fallback slides a rippled hem sideways; it never scales a framed image.
      const width=host.clientWidth||innerWidth,height=host.clientHeight||innerHeight;
      if(p<.82){
        const edge=(1-p/.82)*100;
        const points=['0% 0%',`${edge}% 0%`];
        for(let i=1;i<=20;i++){const y=i*5,x=edge+Math.sin(i*.65-t*.9)*5*Math.sin(p*Math.PI);points.push(`${x}% ${y}%`);}points.push('0% 100%');
        host.style.clipPath=`polygon(${points.join(',')})`;host.style.backgroundSize='cover';host.style.backgroundPosition='center';
      }else{
        const [cx,cy,nw,nh]=destination;
        host.style.clipPath=`polygon(${cx-nw/2}px ${cy-nh/2}px,${cx+nw/2}px ${cy-nh/2+7}px,${cx+nw/2-4}px ${cy+nh/2}px,${cx-nw/2+4}px ${cy+nh/2-7}px)`;
        host.style.backgroundSize=`${nw}px ${nh}px`;host.style.backgroundPosition=`${cx-nw/2}px ${cy-nh/2}px`;host.style.backgroundRepeat='no-repeat';
      }
      const logo=host.querySelector('.cloth-fallback-mark');logo.style.opacity=String(Math.max(0,1-p*2));
    }
    return {
      resize(width,height){w=width;h=height;const dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);gl.viewport(0,0,canvas.width,canvas.height);},
      draw(t,p,dest,angle,less){
        if(failed){drawFallback(t,p,dest,angle,less);return;}if(!ready)return;
        gl.useProgram(program);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
        textures.forEach((tex,i)=>{gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,tex);});
        gl.uniform2f(uniforms.viewport,w,h);gl.uniform4f(uniforms.destination,...dest);gl.uniform1f(uniforms.pull,p);
        gl.uniform1f(uniforms.time,less?0:t);gl.uniform1f(uniforms.motion,less?.1:1);gl.uniform1f(uniforms.angle,angle);
        gl.uniform1f(uniforms.aspect,w/h);gl.uniform1f(uniforms.destinationAspect,dest[2]/dest[3]);
        gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);
        if(!painted){document.body.classList.add('silk-ready');painted=true;}
      }
    };
  }
  window.TwocommaCloth={create};
})();
