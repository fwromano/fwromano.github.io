/* Shared interaction math for the vehicle embedding plots. No data fitting. */
'use strict';
window.VehicleViewControls=(()=>{
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function projector(ranges,mode,yaw,pitch,zoom,panX,panY,width,height){
    const mx=(ranges[0][0]+ranges[0][1])/2,my=(ranges[1][0]+ranges[1][1])/2,mz=(ranges[2][0]+ranges[2][1])/2;
    const cx=width*(.5+panX),cy=height*(.5+panY);
    if(mode!=='3d'){
      const a=+mode[0],b=+mode[1],mid=[mx,my,mz],s=Math.min((width-104)/(ranges[a][1]-ranges[a][0]),(height-104)/(ranges[b][1]-ranges[b][0]))*zoom;
      return v=>({x:cx+(v[a]-mid[a])*s,y:cy-(v[b]-mid[b])*s,depth:0});
    }
    const co=Math.cos(yaw),si=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
    const s=Math.min(width*.56,height*.60)*zoom/Math.max(...ranges.map(r=>r[1]-r[0]));
    return v=>{const x=v[0]-mx,y=v[1]-my,z=v[2]-mz,ry=si*x+co*y;return{x:cx+(co*x-si*y)*s,y:cy-(sp*ry+cp*z)*s,depth:cp*ry-sp*z};};
  }
  function drawPoints(ctx,points,mode){
    // Positive camera depth is nearer. Stable source-ID ties remove group-order bias.
    if(mode==='3d')points.sort((a,b)=>a.depth-b.depth||a.row.embedding_row-b.row.embedding_row);
    ctx.globalAlpha=1;
    for(const p of points){ctx.fillStyle=p.fill;ctx.beginPath();ctx.arc(p.x,p.y,p.radius,0,Math.PI*2);ctx.fill();}
  }
  function renderer(canvas,preference='auto'){
    let gl=null,program=null,failed=false,buffer=null,capacity=0,array=new Float32Array(0);const colors=new Map();
    canvas.style.pointerEvents='none';canvas.style.zIndex='1';
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();failed=true;canvas.style.display='none';});
    canvas.addEventListener('webglcontextrestored',()=>{failed=false;gl=null;program=null;capacity=0;});
    function init(){
      if(failed)return false;if(program)return true;
      try{
        gl=canvas.getContext('webgl2',{alpha:true,antialias:false,premultipliedAlpha:false,preserveDrawingBuffer:false});if(!gl){failed=true;return false;}
        const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
        const vertex=shader(gl.VERTEX_SHADER,`#version 300 es
          in vec3 position;in vec4 appearance;uniform vec4 viewport;uniform vec2 depths;out vec3 rgb;
          void main(){gl_Position=vec4(position.x/viewport.x*2.-1.,1.-position.y/viewport.y*2.,-.9+1.8*(depths.y-position.z)/max(depths.y-depths.x,.00001),1.);gl_PointSize=appearance.w*viewport.z;rgb=appearance.xyz;}`);
        const fragment=shader(gl.FRAGMENT_SHADER,`#version 300 es
          precision highp float;in vec3 rgb;out vec4 pixel;
          void main(){if(length(gl_PointCoord-vec2(.5))>.5)discard;pixel=vec4(rgb,1.);}`);
        program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);
        if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
        gl.useProgram(program);buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
        for(const [name,size,offset]of [['position',3,0],['appearance',4,12]]){const a=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,size,gl.FLOAT,false,28,offset);}
        gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clearColor(0,0,0,0);return true;
      }catch(error){failed=true;program=null;return false;}
    }
    return {draw(ctx,points,mode,width,height){
      // Measured crossover is checked by the retained full-catalog benchmark.
      const gpu=points.length>0&&preference!=='canvas'&&(preference==='webgl'||points.length>=10000)&&init();
      canvas.style.display=gpu?'':'none';
      if(!gpu){drawPoints(ctx,points,mode);return failed?'canvas fallback':'depth-sorted canvas';}
      if(mode==='3d')points.sort((a,b)=>a.depth-b.depth||a.row.embedding_row-b.row.embedding_row);
      const dpr=devicePixelRatio||1,w=Math.round(width*dpr),h=Math.round(height*dpr);
      if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}gl.viewport(0,0,w,h);
      if(array.length<points.length*7)array=new Float32Array(points.length*7);if(colors.size>8192)colors.clear();
      let min=Infinity,max=-Infinity;
      for(let i=0;i<points.length;i++){
        const p=points[i];min=Math.min(min,p.depth);max=Math.max(max,p.depth);let rgb=colors.get(p.fill);
        if(!rgb){rgb=p.fill.startsWith('#')?[1,3,5].map(k=>parseInt(p.fill.slice(k,k+2),16)/255):(p.fill.match(/[\d.]+/g)||[1,1,1]).slice(0,3).map(v=>Number(v)/255);colors.set(p.fill,rgb);}
        const j=i*7;array[j]=p.x;array[j+1]=p.y;array[j+2]=p.depth;array[j+3]=rgb[0];array[j+4]=rgb[1];array[j+5]=rgb[2];array[j+6]=p.radius*2;
      }
      gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);if(capacity<array.byteLength){gl.bufferData(gl.ARRAY_BUFFER,array.byteLength,gl.DYNAMIC_DRAW);capacity=array.byteLength;}
      gl.bufferSubData(gl.ARRAY_BUFFER,0,array.subarray(0,points.length*7));gl.uniform4f(gl.getUniformLocation(program,'viewport'),width,height,dpr,0);gl.uniform2f(gl.getUniformLocation(program,'depths'),min,max);
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.drawArrays(gl.POINTS,0,points.length);return 'WebGL2 depth buffer';
    },get graphics(){return gl;}};
  }
  function closest(points,x,y){
    // Test the foreground glyph first; a hidden rear point must not win by center distance.
    for(let i=points.length-1;i>=0;i--){const p=points[i];if((p.x-x)**2+(p.y-y)**2<=(p.radius+2)**2)return p.row;}
    return null;
  }
  function orientation(ctx,width,height,yaw,pitch,caption){
    const co=Math.cos(yaw),si=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch),cx=width-53,cy=height-43;
    const axes=[[co,-sp*si],[ -si,-sp*co],[0,-cp]],colors=['#ed8686','#7dd7b3','#8facff'];
    ctx.save();ctx.font='10px system-ui';ctx.lineWidth=1.5;ctx.textAlign='center';
    axes.forEach(([x,y],i)=>{ctx.strokeStyle=colors[i];ctx.fillStyle=colors[i];ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+x*27,cy+y*27);ctx.stroke();ctx.fillText(caption(i).split(' · ')[0],cx+x*37,cy+y*37+3);});ctx.restore();
  }
  function positions(params,names,low,high){
    const defaults={bottomLeft:[0,low],topLeft:[0,high],topRight:[180,high],bottomRight:[180,low]};
    let saved={};try{saved=JSON.parse(localStorage.getItem('vehicle-view-anchor-positions')||'{}')}catch{}
    const explicit=names.some(n=>params.has('anchor-pos-'+n));
    const valid=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&p[0]>=0&&p[0]<=360&&p[1]>=low&&p[1]<=high;
    const points=Object.fromEntries(names.map(n=>{const p=explicit?(params.has('anchor-pos-'+n)?params.get('anchor-pos-'+n).split(',').map(Number):defaults[n]):saved[n];return[n,valid(p)?p.slice():defaults[n].slice()];}));
    const distance=(a,b)=>{const h=Math.abs(a[0]-b[0])%360;return (Math.min(h,360-h)/180)**2+((a[1]-b[1])/(high-low))**2;};
    // Invalid saved/URL collisions fall back as a group to a reproducible default.
    if(names.some((n,i)=>names.slice(i+1).some(m=>distance(points[n],points[m])<1e-8)))for(const n of names)points[n]=defaults[n].slice();
    const api={points,low,high,distance,get custom(){return names.some(n=>points[n].some((v,i)=>v!==defaults[n][i]));},
      move(n,h,e){if(!Number.isFinite(h)||!Number.isFinite(e))return false;const p=[clamp(h,0,360),clamp(e,low,high)];if(names.some(m=>m!==n&&distance(p,points[m])<1e-8))return false;points[n]=p;return true;},
      reset(){for(const n of names)points[n]=defaults[n].slice();api.save();},
      save(){try{localStorage.setItem('vehicle-view-anchor-positions',JSON.stringify(points))}catch{}},
      write(q){for(const n of names){q.delete('anchor-pos-'+n);if(api.custom)q.set('anchor-pos-'+n,points[n].join(','));}}
    };return api;
  }
  function prepareHsv(colors,state,toHsv,names){
    const hsv=Object.fromEntries(names.map(n=>[n,toHsv(colors[n])]));
    const colored=names.filter(n=>hsv[n][1]>0&&hsv[n][2]>0);
    for(const n of names)if(hsv[n][1]===0&&colored.length){const near=colored.reduce((a,b)=>state.distance(state.points[n],state.points[b])<state.distance(state.points[n],state.points[a])?b:a);hsv[n][0]=hsv[near][0];if(hsv[n][2]===0)hsv[n][1]=hsv[near][1];}
    let best=null,cost=Infinity;const first=hsv[names[0]][0];
    for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)for(let c=-1;c<=1;c++){
      const h=[first,hsv[names[1]][0]+360*a,hsv[names[2]][0]+360*b,hsv[names[3]][0]+360*c];let value=0;
      for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)value+=(h[i]-h[j])**2/(.05+state.distance(state.points[names[i]],state.points[names[j]]));
      if(value<cost){cost=value;best=h;}
    }
    names.forEach((n,i)=>hsv[n][0]=best[i]);return hsv;
  }
  function color(heading,elevation,state,hsv,fromHsv,names){
    const query=[heading,elevation===null?(state.low+state.high)/2:elevation],d=names.map(n=>state.distance(query,state.points[n]));
    const exact=d.findIndex(v=>v<1e-12);if(exact>=0)return `rgb(${fromHsv(hsv[names[exact]]).join(' ')})`;
    const weights=d.map(v=>1/v),sum=weights.reduce((a,b)=>a+b,0);
    return `rgb(${fromHsv([0,1,2].map(i=>names.reduce((v,n,j)=>v+weights[j]*hsv[n][i]/sum,0))).join(' ')})`;
  }
  function mountAnchors({pad,names,state,colors,onChange}){
    const svg=pad.querySelector('svg'),ns='http://www.w3.org/2000/svg';
    const panel=document.createElement('details');panel.className='anchor-position-editor';panel.id='anchor-position-editor';
    const summary=document.createElement('summary');summary.textContent='Place colors on the view map';panel.append(summary);
    const tools=document.createElement('div');tools.className='anchor-tools';
    const toggle=document.createElement('button');toggle.type='button';toggle.id='move-color-anchors';toggle.textContent='Move colors on map';toggle.setAttribute('aria-pressed','false');
    const reset=document.createElement('button');reset.type='button';reset.id='reset-color-positions';reset.textContent='Reset positions';
    const help=document.createElement('p');help.className='small';help.id='anchor-position-help';help.textContent='Drag A–D while editing, or enter heading/elevation below. Colors stay tied to viewing pose; 0° and 360° agree.';
    tools.append(toggle,reset);panel.append(tools,help);document.getElementById('view-color-anchors').after(panel);
    const handles=document.createElementNS(ns,'g');handles.id='color-anchor-handles';handles.style.display='none';svg.append(handles);
    let active=null,frame=0;const inputs={},nodes={};const api={editing:false,sync};
    function schedule(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;onChange();sync();});}
    function change(n,h,e){if(!state.move(n,h,e)){help.textContent='Keep color anchors at distinct positions.';sync();return;}help.textContent='Movable HSV blend · circular heading. Drag A–D, or enter their angles below.';state.save();sync();schedule();}
    names.forEach((n,i)=>{
      const letter=String.fromCharCode(65+i),row=document.createElement('div');row.className='anchor-position-row';
      const name=document.createElement('strong');name.textContent=letter;row.append(name);inputs[n]=[];
      for(const [j,title,min,max]of [[0,'Heading',0,360],[1,'Elevation',state.low,state.high]]){
        const label=document.createElement('label');label.textContent=title+' ';const input=document.createElement('input');input.type='number';input.min=min;input.max=max;input.step='1';input.setAttribute('aria-label',`Color ${letter} ${title.toLowerCase()}`);input.onchange=()=>change(n,j===0?input.valueAsNumber:state.points[n][0],j===1?input.valueAsNumber:state.points[n][1]);label.append(input);row.append(label);inputs[n].push(input);
      }panel.append(row);
      const g=document.createElementNS(ns,'g');g.dataset.anchorHandle=n;g.setAttribute('tabindex','0');g.setAttribute('role','button');g.setAttribute('aria-label','Move color '+letter);
      const circle=document.createElementNS(ns,'circle');circle.setAttribute('r','8');const text=document.createElementNS(ns,'text');text.textContent=letter;text.setAttribute('text-anchor','middle');text.setAttribute('y','3');g.append(circle,text);handles.append(g);nodes[n]=g;
      g.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();e.stopPropagation();const p=state.points[n],step=e.shiftKey?10:1;change(n,p[0]+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0),p[1]+(e.key==='ArrowUp'?step:e.key==='ArrowDown'?-step:0));});
      const colorInput=document.querySelector(`[data-view-anchor=${n}]`);colorInput.parentElement.replaceChildren(colorInput);const caption=document.createElement('span');caption.className='anchor-caption';colorInput.parentElement.append(caption);colorInput.setAttribute('aria-label','Color '+letter);
    });
    function sync(){const box=svg.getBoundingClientRect();names.forEach((n,i)=>{const [h,e]=state.points[n];inputs[n][0].value=Number(h.toFixed(1));inputs[n][1].value=Number(e.toFixed(1));nodes[n].setAttribute('transform',`translate(${42+400*h/360} ${120-106*(e-state.low)/(state.high-state.low)}) scale(${460/Math.max(1,box.width)} ${154/Math.max(1,box.height)})`);nodes[n].querySelector('circle').setAttribute('fill',`rgb(${colors()[n].join(' ')})`);document.querySelector(`[data-view-anchor=${n}]`).nextElementSibling.textContent=`${String.fromCharCode(65+i)} · ${Number(h.toFixed(1))}°, ${Number(e.toFixed(1))}°`;});}
    toggle.onclick=()=>{api.editing=!api.editing;toggle.setAttribute('aria-pressed',String(api.editing));toggle.textContent=api.editing?'Done moving colors':'Move colors on map';handles.style.display=api.editing?'':'none';svg.setAttribute('aria-hidden',String(!api.editing));svg.setAttribute('role','group');svg.setAttribute('aria-label','Color positions on the heading and elevation map');pad.classList.toggle('editing-colors',api.editing);onChange();};
    reset.onclick=()=>{state.reset();help.textContent='Default corner positions restored. Your chosen colors are unchanged.';sync();schedule();};
    function move(e){if(!active)return;const r=pad.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*460,y=(e.clientY-r.top)/r.height*154;change(active,Math.round((x-42)/400*360),Math.round(state.low+(120-y)/106*(state.high-state.low)));}
    pad.addEventListener('pointerdown',e=>{if(!api.editing||e.button!==0)return;const g=e.target.closest('[data-anchor-handle]');if(!g)return;active=g.dataset.anchorHandle;pad.setPointerCapture(e.pointerId);e.preventDefault();},true);
    pad.addEventListener('pointermove',e=>{if(active){e.preventDefault();move(e);}},true);
    pad.addEventListener('pointerup',e=>{if(active){move(e);active=null;}},true);pad.addEventListener('pointercancel',()=>active=null);
    panel.addEventListener('toggle',()=>{if(!panel.open&&api.editing)toggle.click();});new ResizeObserver(sync).observe(pad);sync();return api;
  }
  return {projector,drawPoints,renderer,closest,orientation,positions,prepareHsv,color,mountAnchors};
})();
