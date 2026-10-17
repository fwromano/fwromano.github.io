/* Static GitHub Pages adapter. New rows use existing, frozen PCA fits. */
'use strict';
window.VehicleAdditions = (() => {
  const names={original:'Original crop',sam31:'SAM 3.1',rectified:'Rectification',rectified_sam31:'Rectification + SAM 3.1'};
  const params=new URLSearchParams(location.search);
  const processing=Object.hasOwn(names,params.get('processing'))?params.get('processing'):'rectified_sam31';
  let pack;
  function extend(data) {
    pack=window.vehicleAdditionsData;
    if(!pack)return;
    // Labels are descriptions; stable category IDs still keep different assets apart.
    for(const space of [data,...Object.values(data.embeddingSpaces||{})]) {
      for(const [category,meta] of Object.entries(space.seriesMeta||{})) {
        if(pack.labels[category])meta.displayLabel=pack.labels[category];
      }
    }
    for(const [key,extra] of Object.entries(pack.spaces)) {
      const space=data.embeddingSpaces[key];if(!space)continue;
      if(space.rows.length!==extra.referenceCount)throw Error('New-data/reference row alignment changed');
      for(const item of extra.rows) {
        const variant=item.dataset==='observer' && item.variants[processing]?processing:'original';
        const chosen=item.variants[variant];
        const row={...item,...chosen,processing:variant,coords:chosen.fits.all,
          original_url:item.variants.original.cutout_url,variants:item.variants};
        space.rows.push(row);
        for(const [fitName,fit] of Object.entries(space.pcaFits))fit.coords.push(chosen.fits[fitName]);
      }
      Object.assign(space.colors,extra.colors);Object.assign(space.seriesMeta,extra.seriesMeta);
      Object.assign(space.references,extra.references);
      for(const [fitName,fit] of Object.entries(space.pcaFits)){
        fit.plotRanges=extra.ranges[fitName];
        if(fitName==='all')fit.label='All historical references';
      }
      space.plotRanges=extra.ranges.all;
    }
  }
  function label(category,D){return D.seriesMeta[category]?.displayLabel||category;}
  function count(category,n,D){const total=D.seriesMeta[category]?.totalViews;return total?`${n.toLocaleString()} / ${total.toLocaleString()}`:n;}
  function angle(value){return value==null?'?':Number(value).toFixed(1).replace(/\.0$/,'');}
  function mount(D,embeddingKey){
    if(!pack)return;
    const section=document.createElement('section');section.id='new-data-banner';section.className='new-data-banner';
    const title=document.createElement('strong');title.textContent=pack.observerCount?'New scans and simulated observer views':'Extended scans · Jeep and truck';
    const note=document.createElement('p');note.textContent=pack.observerCount?`Published snapshot ${pack.generatedUtc.slice(0,10)}: ${pack.extendedCount.toLocaleString()} / ${pack.extendedTotal.toLocaleString()} extended scans embedded, ${pack.observerCount} observer captures.`:`${pack.extendedCount.toLocaleString()} / ${pack.extendedTotal.toLocaleString()} new scan embeddings in this build (${pack.generatedUtc.replace('T',' ').replace('Z',' UTC')}). Each configuration has 2,520 source views. The graph contains completed embeddings; all source views are available below. Counts beside each color show displayed embeddings / total source views.`;
    const actions=document.createElement('div');actions.className='new-data-actions';
    for(const [text,prefix]of (pack.observerCount?[['Show observer captures','Observer'],['Show new scans','Extended']]:[['Show all extended views','Extended · '],['Show extended Jeeps','Extended · jeep/'],['Show extended trucks','Extended · truck/']])){
      const a=document.createElement('a');const q=new URLSearchParams(location.search);
      q.set('embedding','gemma2');q.set('processing',processing);q.set('elevations','all');q.set('headings','all');q.delete('show');
      const cats=Object.keys((pack.spaceMetadata||pack.spaces).gemma2.colors).filter(c=>c.startsWith(prefix));
      for(const c of cats)q.append('show',c);q.set('color',cats[0]);
      a.href='?'+q;a.textContent=text;actions.append(a);
    }
    if(!pack.observerCount){const all=document.createElement('a');all.href='source-browser.html';all.textContent='Browse all 50,400 source views';actions.append(all);}
    const methods=document.createElement('a');methods.href='new-data/README.html';methods.textContent='Processing and coverage details';actions.append(methods);
    section.append(title,note,actions);document.querySelector('header').after(section);
    if(embeddingKey==='gemma2'&&pack.observerCount){
      const control=document.createElement('label');control.textContent='Observer processing ';
      const select=document.createElement('select');select.id='observer-processing';
      for(const [key,text]of Object.entries(names))select.add(new Option(text,key));select.value=processing;
      select.onchange=()=>{const q=new URL(location.href);q.searchParams.set('processing',select.value);location.assign(q.href);};
      control.append(select);actions.append(control);
      const detail=document.createElement('p');detail.className='small';detail.textContent='Processing replaces each Jeep capture’s image and vector together. Each capture remains one point. Other captures retain their original crop.';section.append(detail);
    } else if(embeddingKey!=='gemma2') {
      const note=document.createElement('p');note.className='small';note.textContent='New captures have EG2 embeddings. Use the links above to view them; CLIP remains the historical comparison.';section.append(note);
    }
    const panel=document.createElement('section');panel.id='new-observation-details';panel.hidden=true;
    panel.innerHTML='<div class="new-before-after"><figure><img id="new-original" alt="Original observer crop"><figcaption>Original crop</figcaption></figure><figure><img id="new-processed" alt="Selected encoder input"><figcaption id="new-processing-name"></figcaption></figure></div><p id="new-view-detail"></p><div id="new-neighbors"></div><div id="new-text"></div>';
    document.querySelector('.side-info').append(panel);
  }
  function show(row,D){
    const panel=document.getElementById('new-observation-details');if(!panel)return;
    panel.hidden=!row.public_addition;
    if(!row.public_addition){
      document.getElementById('selected-view').textContent=`${label(row.category,D)} · ${angle(row.heading)}° / ${angle(row.elevation)}°`;
      document.getElementById('image-name').textContent='Source notes: '+row.category+' · '+row.image_path.split('/').at(-1);
      return;
    }
    const isObserver=row.dataset==='observer';
    panel.querySelector('.new-before-after').hidden=!isObserver;
    if(isObserver){document.getElementById('new-original').src=row.original_url;
    document.getElementById('new-processed').src=row.cutout_url;}
    document.getElementById('new-processing-name').textContent=names[row.processing];
    document.getElementById('selected-view').textContent=`${label(row.category,D)} · ${row.heading.toFixed(1)}° / ${row.elevation.toFixed(1)}°`;
    document.getElementById('image-name').textContent='Source notes: '+row.category;
    document.querySelector('.image-tag').textContent=(isObserver?'SIMULATED OBSERVER / ':'EXTENDED SCAN / ')+(isObserver?names[row.processing]:'SAM 3.1');
    document.getElementById('original').textContent=row.preview_only?'Open source and processed previews ↗':'Open exact RGB encoder input ↗';
    document.getElementById('view-note').textContent=isObserver?'Actual simulated viewing angle; nearest available capture, no interpolation.':'New scan collection; only completed, verified image/vector pairs are shown.';
    const details=isObserver?(row.rectification?'Jeep size: 4.0 × 1.9 × 2.0 m (declared simulator dimensions). Same-view camera-warp correction cannot recover hidden surfaces or missing detail.':'Original simulated crop. This asset has no rectification comparison.'):'Same frozen image encoder and reference PCA as the historical catalog; new observations do not refit the axes.';
    document.getElementById('new-view-detail').textContent=details;
    if(!isObserver&&!pack.observerCount){const a=document.createElement('a');a.href='source-browser.html?'+new URLSearchParams({series:row.source_series,heading:row.heading,elevation:row.elevation});a.textContent='Browse all 2,520 source views for this configuration ↗';document.getElementById('new-view-detail').append(document.createElement('br'),a);}
    for(const [id,title,items]of [['new-neighbors','Closest catalog appearances',row.neighbors],['new-text','Closest vehicle descriptions',row.text]]){
      const div=document.getElementById(id);div.replaceChildren();const h=document.createElement('strong');h.textContent=title+' · cosine';div.append(h);
      for(const item of (items||[]).slice(0,3)){
        const p=document.createElement('p');p.textContent=`${pack.labels[item.series]||item.text||item.series} · ${item.score.toFixed(3)}`;
        if(item.series){const note=document.createElement('small');note.textContent='Source: '+item.series;p.append(document.createElement('br'),note);}div.append(p);
      }
    }
    const evidence=document.createElement('p');evidence.className='small';evidence.textContent='Cosine is a matching score, not calibrated identity confidence. Text descriptions can be wrong.';document.getElementById('new-text').append(evidence);
  }
  function clear(){const p=document.getElementById('new-observation-details');if(p)p.hidden=true;}
  return {extend,mount,show,clear,label,count,angle,processing,names};
})();
