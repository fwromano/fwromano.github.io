# CLIP, EG2 and DINOv3 matched comparison

Completed 6,335 matched views; 339 pose folds, five probes per fold. DINOv3 inference is new; CLIP and EG2 use hash-verified retained features. All analyses were fitted again.

On masked vehicle scans, DINOv3 raw cosine retains 99.93% vehicle-type accuracy, but paint accuracy is 72.25%; the combined category score is 72.21%. The deficit is primarily paint discrimination. Category-supervised PLS raises its combined score to 88.03%, compared with 96.63% for CLIP and 96.33% for EG2. This dataset therefore does not support replacing the existing features with DINOv3 on the assumption of universally better view invariance.

The public timm DINOv3 B/16 conversion is pinned to `c6a5fb7d12bbd3cf3b0079253141c3332aaed7da`. CLS pooling is explicit; register/patch tokens are excluded. RoPE periods are rounded through bfloat16 as documented by timm. Features and inference use float32.

## Held-out category retrieval

All values are percentages. Categories mean authored vehicle type + paint. Each query appears exactly once across six guarded angle folds. PCA128 is fitted on gallery rows. PLS dimensions are selected using only the inner validation split.

| Cohort | Model | Cosine | PCA128 cosine | PLS cosine | Cosine ≥90° |
|---|---|---:|---:|---:|---:|
| Original Sim2 crops | CLIP B/16 | 99.86 | 99.72 | 99.79 | 99.79 |
| Original Sim2 crops | EmbeddingGemma 2 | 99.93 | 99.93 | 99.93 | 99.93 |
| Original Sim2 crops | DINOv3 B/16 | 87.96 | 87.68 | 93.23 | 73.22 |
| Masked Sim2 crops | CLIP B/16 | 99.07 | 99.43 | 99.57 | 99.57 |
| Masked Sim2 crops | EmbeddingGemma 2 | 99.93 | 99.93 | 99.93 | 99.93 |
| Masked Sim2 crops | DINOv3 B/16 | 88.60 | 88.39 | 95.23 | 75.50 |
| Masked vehicle scans | CLIP B/16 | 93.22 | 93.25 | 96.63 | 90.84 |
| Masked vehicle scans | EmbeddingGemma 2 | 89.75 | 90.61 | 96.33 | 88.59 |
| Masked vehicle scans | DINOv3 B/16 | 72.21 | 69.43 | 88.03 | 60.77 |

## Held-out heading

Mean absolute circular error in degrees; lower is better. PCA includes a ridge readout. PLS is a separately supervised pose probe, distinct from the category-supervised retrieval projection.

| Cohort | Model | PCA3 | Tuned PCA | PLS | Full ridge |
|---|---|---:|---:|---:|---:|
| Original Sim2 crops | CLIP B/16 | 157.87 | 85.39 | 65.01 | 86.96 |
| Original Sim2 crops | EmbeddingGemma 2 | 147.81 | 84.74 | 65.51 | 81.59 |
| Original Sim2 crops | DINOv3 B/16 | 101.88 | 70.21 | 68.90 | 58.31 |
| Masked Sim2 crops | CLIP B/16 | 157.78 | 52.62 | 46.95 | 44.34 |
| Masked Sim2 crops | EmbeddingGemma 2 | 160.90 | 80.74 | 55.41 | 89.11 |
| Masked Sim2 crops | DINOv3 B/16 | 101.19 | 73.34 | 68.06 | 65.52 |
| Masked vehicle scans | CLIP B/16 | 161.69 | 75.34 | 62.24 | 66.36 |
| Masked vehicle scans | EmbeddingGemma 2 | 163.27 | 86.81 | 84.68 | 84.62 |
| Masked vehicle scans | DINOv3 B/16 | 157.26 | 80.49 | 57.50 | 48.82 |

## Evidence and interpretation limits

- Same source views, masks, labels, folds and probe grids. Native preprocessing differs: CLIP masked crops were square-padded; EG2 and DINO begin from native masked RGB. DINOv3 uses 256px; this is not a compute or pixel-budget matched comparison.
- Native dimensions are CLIP512, EG2 768 and DINOv3 768. The PCA128 retrieval control gives all models the same learned dimension budget. No arbitrary DINO coordinate prefixes are used.
- View invariance is useful only if category discrimination survives. High cosine can reflect collapse. Pose prediction tests retained pose information and is not itself an invariance score.
- All-row PCA and category-PLS plots in the explorer are descriptive. Held-out results use independent training-only fits and do not use display coordinates.
- All paint/vehicle transfer, elevation and polar-rotation results are retained in `pose.csv` and `results.json`; nadir rotation is not viewing-ray azimuth. Sim2 elevation is unknown.
- These are synthetic categories, not independently labeled physical instances. This study does not establish Bayesian-MHT likelihood calibration or tracker improvements.
- `protocol.json`, `scope.json`, model encoding evidence, `analysis-config.json`, hash-bound fold predictions and replay checks retain the full provenance. The scope amendment removes optional DINOv2 without altering the frozen data or methods.

Source: https://huggingface.co/timm/vit_base_patch16_dinov3.lvd1689m
