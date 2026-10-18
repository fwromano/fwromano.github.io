'use strict';
window.VehicleCompact = (()=>{
  // Dev serves the same committed atlas bytes locally. Production uses the
  // declared GitHub asset host; no alternate plot data or synthetic points.
  function asset(url){
    const frozenPreview=/^\/candidate\/[0-9a-f]{40}\/datasets\/vehicle-sphere\//.test(location.pathname);
    return frozenPreview||location.hostname==='127.0.0.1'||location.hostname==='localhost'
      ?url.replace('https://raw.githubusercontent.com/fwromano/fwromano.github.io/main/datasets/vehicle-sphere/',''):url;
  }
  async function json(url){
    const r=await fetch(url);if(!r.ok)throw Error(`Cannot load ${url}: ${r.status}`);
    return new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).json();
  }
  async function load(){
    document.getElementById('status').textContent='Loading vehicle views…';
    const [data,pack]=await Promise.all([json('new-data/historical.json.gz'),json('new-data/catalog.json.gz')]);
    const p=new URLSearchParams(location.search),model=p.get('embedding')||'gemma2';
    // Preserve bookmarked Extended selections using their new stable display names.
    let changed=false;for(const field of ['color','show']){const values=p.getAll(field);if(values.some(v=>v.startsWith('Extended · '))){p.delete(field);for(const v of values)p.append(field,v.replace(/^Extended · /,'Scans · '));changed=true;}}
    if(!p.has('embedding')){p.set('embedding','gemma2');changed=true;}
    if(changed)history.replaceState(null,'','?'+p+location.hash);
    const requested=Number(p.get('dimensions')??data.embeddingSpaces?.[model]?.featureDimensions??768);
    const d=[128,256,512,768].includes(requested)?requested:768,key=d===768?'gemma2':`gemma2-${d}`;
    for(const [name,space]of Object.entries(pack.spaces)){
      Object.assign(data.embeddingSpaces[name].colors,space.colors);
      Object.assign(data.embeddingSpaces[name].seriesMeta,space.seriesMeta);
    }
    const extras={};
    if(model?.startsWith('gemma2')){
      const values=await json(`new-data/space-${d}.json.gz`),extra=pack.spaces[key],fits=pack.fits[key];
      if(values.length!==pack.rows.length)throw Error('Embedding row count mismatch');
      extra.rows=pack.rows.map(([sourceRow,cat,heading,elevation],j)=>{
        const source=pack.categories[cat],n=values[j],coordinates={};
        fits.forEach((fit,i)=>coordinates[fit]=n.slice(i*3,i*3+3));const k=fits.length*3;
        const v={vector_row:j,preview_sheet:asset(pack.assetBase+pack.previewSheets[Math.floor(j/64)]),preview_cell:j%64,
          cutout_url:'source-browser.html?'+new URLSearchParams({series:source,heading,elevation}),
          image_path:`masked-${sourceRow}.png`,mask_method:'sam31',uncertainty:0,fits:coordinates,cos_to_front:n[k],
          neighbors:[0,1,2].map(i=>({series:pack.neighborLabels[n[k+1+i*2]],score:n[k+2+i*2]})),
          text:[0,1,2].map(i=>({text:pack.textLabels[n[k+7+i*2]],score:n[k+8+i*2]}))};
        return {dataset:'extended',category:(pack.categoryPrefix||'Extended · ')+source,source_series:source,source_embedding_row:sourceRow,
          heading,elevation,azimuth_defined:elevation!==90,embedding_row:(extra.rowIdOffset??extra.referenceCount)+j,public_addition:true,
          preview_only:true,variants:{original:v}};
      });extras[key]=extra;
    }
    // Keep metadata for navigation without materializing four copies of every row.
    pack.spaceMetadata=pack.spaces;pack.spaces=extras;delete pack.rows;
    window.vehicleAdditionsData=pack;return data;
  }
  return {load,json,asset};
})();
