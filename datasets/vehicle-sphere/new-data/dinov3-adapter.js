/* DINOv3 uses the same complete catalog, source-view IDs and camera controls. */
'use strict';
(() => {
  const originalLoad = VehicleCompact.load;
  const root = 'new-data/dinov3/';
  const hash = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
    .map(value => value.toString(16).padStart(2, '0')).join('');
  VehicleCompact.load = async () => {
    const data = await originalLoad();
    const reference = data.embeddingSpaces.gemma2;
    data.embeddingOptions.push({key: 'dinov3', label: 'DINOv3 B/16 · 768D'});
    // Model navigation needs the common categories before the large payload loads.
    data.embeddingSpaces.dinov3 = {colors: {...reference.colors}, embeddingFamily: 'dinov3', featureDimensions: 768};
    if (new URLSearchParams(location.search).get('embedding') !== 'dinov3') return data;
    document.getElementById('status').textContent = 'Loading DINOv3 vehicle views…';
    const metadata = await VehicleCompact.json(root + 'metadata.json.gz');
    const pack = window.vehicleAdditionsData, catalog = pack.spaceMetadata.gemma2;
    if (!metadata.complete || metadata.rows.length !== 50400 || reference.rows.length !== 2808)
      throw Error('Incomplete DINOv3 catalog');
    if (metadata.referenceIds.some((id, i) => id !== reference.rows[i].embedding_row))
      throw Error('DINOv3 reference row alignment changed');
    const response = await fetch(VehicleCompact.asset(metadata.coordinates.url));
    if (!response.ok) throw Error('DINOv3 coordinates could not load: ' + response.status);
    const compressed = await response.arrayBuffer();
    if (await hash(compressed) !== metadata.coordinates.sha256) throw Error('DINOv3 coordinate hash mismatch');
    const bytes = await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    const values = new Float32Array(bytes), stride = metadata.coordinates.columns;
    if (values.length !== 53208 * stride || !values.every(Number.isFinite)) throw Error('DINOv3 coordinate dimensions changed');
    const rows = reference.rows.map(row => ({...row}));
    metadata.rows.forEach(([sourceRow, category, heading, elevation], j) => {
      const source = pack.categories[category];
      rows.push({embedding_row: catalog.rowIdOffset + j, source_embedding_row: sourceRow,
        dataset: 'extended', category: 'Scans · ' + source, source_series: source,
        heading, elevation, azimuth_defined: elevation !== 90, processing: 'original',
        preview_sheet: VehicleCompact.asset(pack.assetBase + pack.previewSheets[Math.floor(j / 64)]),
        preview_cell: j % 64, public_addition: true, preview_only: true,
        image_path: `masked-${sourceRow}.png`, mask_method: 'sam31', uncertainty: 0,
        cutout_url: 'source-browser.html?' + new URLSearchParams({series: source, heading, elevation}),
        neighbors: [], text: []});
    });
    const fits = metadata.fits;
    Object.values(fits).forEach((fit, index) => {
      fit.coords = rows.map((_, i) => Array.from(values.subarray(i * stride + index * 3, i * stride + index * 3 + 3)));
      fit.projectionUrl = root + fit.projectionFile;
    });
    rows.forEach((row, i) => {row.coords = fits.all.coords[i]; row.cos_to_front = values[i * stride + stride - 1];});
    const space = {...reference, rows, embeddingFamily: 'dinov3', featureDimensions: 768,
      basisDimensions: 768, modelLabel: 'DINOv3 B/16', model: metadata.model,
      defaultSeries: 'Scans · truck/yellow', defaultPcaFit: 'all', pcaFits: fits,
      ratio: fits.all.ratio, plotRanges: fits.all.plotRanges, projectionUrl: fits.all.projectionUrl,
      colors: {...reference.colors, ...catalog.colors},
      seriesMeta: structuredClone({...reference.seriesMeta, ...catalog.seriesMeta}),
      references: {...reference.references, ...catalog.references}, cameraSamples: [],
      cacheUrl: root + 'publication.json', labelsUrl: root + 'publication.json',
      methodsUrl: root + 'README.html', presentation: {
        title: 'SAM 3.1 VEHICLE MASKS + SIM2 REFERENCE / DINOV3 B/16',
        intro: 'Explore the complete vehicle catalog in DINOv3 feature space.',
        plotTitle: 'DINOv3 B/16 · 768D',
        basisDescription: 'DINOv3 PCA and supervised PLS use the complete current catalog and the same fitting cohorts as EG2.'}};
    data.embeddingSpaces.dinov3 = space;
    return data;
  };

  const originalMount = VehicleAdditions.mount;
  VehicleAdditions.mount = (data, model) => {
    originalMount(data, model);
    if (model !== 'dinov3') return;
    const banner = document.getElementById('new-data-banner');
    banner.querySelector('p').textContent = '50,400 / 50,400 DINOv3 scan embeddings, plus 2,808 Sim2 original/masked views. Each scan configuration has 2,520 source views. Counts beside each color show displayed embeddings / total source views.';
    banner.querySelectorAll('.small').forEach(note => {
      note.textContent = 'DINOv3 uses all 768 features. EG2’s nested sizes are available when EG2 is selected. PCA/PLS use the same cohorts and targets as EG2.';
    });
    document.getElementById('labels-link').textContent = 'DINOv3 provenance ↗';
    document.getElementById('cache-link').textContent = 'DINOv3 data ↗';
    banner.querySelector('a[href="new-data/README.html"]').href = root + 'README.html';
    banner.querySelectorAll('a').forEach(link => {
      const url = new URL(link.href);
      if (url.searchParams.get('embedding') === 'gemma2') {url.searchParams.set('embedding', 'dinov3'); link.href = url;}
    });
  };
  const originalShow = VehicleAdditions.show;
  VehicleAdditions.show = (row, data) => {
    originalShow(row, data);
    if (data.embeddingFamily !== 'dinov3') return;
    document.querySelector('.image-tag').textContent = (row.dataset === 'extended' ? 'SCAN / SAM 3.1' : row.dataset === 'sim2_sam31' ? 'SIM2 / SAM 3.1' : 'SIM2 CROP') + ' / DINOv3 B/16 · 768D';
    for (const id of ['new-neighbors', 'new-text']) document.getElementById(id).hidden = true;
    if (row.public_addition) document.getElementById('new-view-detail').firstChild.textContent = 'DINOv3 PCA/PLS use the complete scan collection. Cosine is computed in the DINOv3 feature space and is not calibrated identity confidence.';
  };
})();
