'use strict';
(async()=>{
  const $=id=>document.getElementById(id),q=new URLSearchParams(location.search);
  async function coverage(){if(window.scanCoverageCompressed)return VehicleCompact.json('new-data/coverage.json.gz');const response=await fetch('new-data/coverage.json');if(!response.ok)throw Error('Coverage could not be loaded');return response.json();}
  const data=await coverage(),elevations=[-5,0,18,36,54,72,90],images=new Map();let generation=0;
  if(data.schema.endsWith('.v2')){const c=document.createElement('canvas');c.id='encoded';c.width=256;c.height=176;c.setAttribute('aria-label','Compressed preview of SAM 3.1 encoder input');$('encoded').replaceWith(c);const note=document.createElement('p');note.textContent='Compressed masked preview. Exact input pixels and full vectors are retained locally.';c.after(note);}
  let series=Object.hasOwn(data.series,q.get('series'))?q.get('series'):'jeep/black';
  let heading=Number(q.get('heading')||0),elevation=Number(q.get('elevation')??18);
  heading=Number.isFinite(heading)?((Math.round(heading)%360)+360)%360:0;
  elevation=elevations.reduce((a,b)=>Math.abs(b-elevation)<Math.abs(a-elevation)?b:a,elevations[0]);
  $('family').value=series.split('/')[0];for(const e of elevations)$('elevation').add(new Option(e+'°',e));
  function choices(){const family=$('family').value;$('series').replaceChildren();for(const [id,s]of Object.entries(data.series))if(id.startsWith(family+'/'))$('series').add(new Option(s.label+' · source '+id.split('/')[1],id));if(!series.startsWith(family+'/'))series=$('series').options[0].value;$('series').value=series;}
  function atlas(url){url=window.VehicleCompact?.asset(url)||url;if(!images.has(url)){const img=new Image(),promise=new Promise((resolve,reject)=>{img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Source preview unavailable: '+url));});img.src=url;images.set(url,promise);if(images.size>3)images.delete(images.keys().next().value);}return images.get(url);}
  function drawPad(){const c=$('pad'),ctx=c.getContext('2d');ctx.fillStyle='#0d1927';ctx.fillRect(0,0,c.width,c.height);ctx.font='13px system-ui';const s=data.series[series];for(let i=0;i<elevations.length;i++){const e=elevations[i],y=195-i*27;ctx.fillStyle='#a8bbcd';ctx.fillText(e+'°',0,y+4);for(let h=0;h<360;h++){ctx.fillStyle=s.completed[e+':'+h]?'#83c7ff':'#344b62';ctx.fillRect(42+h*1.82,y-3,1.5,6);}}ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.strokeRect(40+heading*1.82,189-elevations.indexOf(elevation)*27,6,12);ctx.fillStyle='#a8bbcd';for(const h of [0,90,180,270,359])ctx.fillText(h+'°',42+h*1.82-9,224);}
  async function show(){
    const version=++generation,s=data.series[series],completed=s.completed[elevation+':'+heading];
    $('heading').value=heading;$('elevation').value=elevation;$('label').textContent=s.label;
    $('angles').textContent=`${heading}° heading · ${elevation}° elevation`;
    $('source-note').textContent=`Source: ${series} · source azimuth ${(270-heading+360)%360}° · 192-pixel unmasked preview`;
    $('coverage').textContent=`${Object.keys(s.completed).length.toLocaleString()} / ${s.total.toLocaleString()} views embedded for this configuration. All ${s.total.toLocaleString()} source views are browsable. Blue marks: embeddings in this build.`;
    $('status').textContent=`Build ${data.generatedUtc.replace('T',' ').replace('Z',' UTC')} · ${data.encoded.toLocaleString()} / ${data.total.toLocaleString()} embeddings overall.`;
    $('ready').hidden=!completed;$('pending').hidden=!!completed;
    if(completed){$('encoded').dataset.ready='false';if(completed.input)$('encoded').src=completed.input;const p=new URLSearchParams({embedding:'gemma2',color:'Scans · '+series,show:'Scans · '+series,heading,elevation,elevations:'all',headings:'all'});$('plot').href='embedding.html?'+p;}
    history.replaceState(null,'','?'+new URLSearchParams({series,heading,elevation}));drawPad();
    window.sourceViewState={series,heading,elevation,sourceCount:2520,totalSourceCount:data.total,encoded:!!completed,sourceRow:completed?.source_row??null,previewReady:false};
    const image=await atlas(s.atlases[elevation]);if(version!==generation)return;
    const c=$('source'),cell=data.cell;c.getContext('2d').drawImage(image,(heading%data.columns)*cell,Math.floor(heading/data.columns)*cell,cell,cell,0,0,cell,cell);
    if(completed?.sheet){const sheet=await atlas(completed.sheet);if(version!==generation)return;const cell=completed.cell;$('encoded').getContext('2d').drawImage(sheet,(cell%8)*256,Math.floor(cell/8)*176,256,176,0,0,256,176);$('encoded').dataset.ready='true';}
    window.sourceViewState.previewReady=true;
  }
  function update(){show().catch(e=>$('error').textContent=String(e));}
  $('family').onchange=()=>{choices();update();};$('series').onchange=()=>{series=$('series').value;update();};
  $('heading').oninput=()=>{heading=Number($('heading').value);update();};$('elevation').onchange=()=>{elevation=Number($('elevation').value);update();};
  $('previous').onclick=()=>{heading=(heading+359)%360;update();};$('next').onclick=()=>{heading=(heading+1)%360;update();};
  const pick=event=>{const r=$('pad').getBoundingClientRect(),x=(event.clientX-r.left)*720/r.width,y=(event.clientY-r.top)*230/r.height;heading=Math.max(0,Math.min(359,Math.round((x-42)/1.82)));elevation=elevations[Math.max(0,Math.min(6,Math.round((195-y)/27)))];update();};
  $('pad').onpointerdown=e=>{$('pad').setPointerCapture(e.pointerId);pick(e);};$('pad').onpointermove=e=>{if(e.buttons)pick(e);};
  choices();await show();
})().catch(error=>document.getElementById('error').textContent=String(error));
