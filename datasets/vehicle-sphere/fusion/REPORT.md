# EG2 + DINOv3 fusion — 2026-10-26

**No general fusion replacement is supported by this experiment.** Joint PLS
helps nearby unseen views and held-out elevations, but fails to improve the
primary withheld-sector result and degrades sharply across mirrored gaps.
Small score-fusion gains over raw EG2 do not beat EG2 PLS on the primary test.

| Method | 90° sectors (primary) | Nearby views | Unseen elevations | Mirrored gaps |
| --- | ---: | ---: | ---: | ---: |
| EG2 cosine | 90.70% | 93.26% | 91.03% | 88.00% |
| DINOv3 cosine | 61.56% | 80.46% | 59.03% | 46.81% |
| Weighted cosine fusion | 91.02% | 94.64% | 91.32% | 88.29% |
| EG2 PLS | 91.48% | 96.15% | 92.48% | 81.40% |
| DINOv3 PLS | 77.21% | 91.89% | 82.87% | 46.51% |
| Joint EG2 + DINO PLS | 91.36% | 98.05% | 93.61% | 63.92% |
| Joint score calibration | 90.34% | 93.29% | 91.05% | 87.64% |

The primary result uses 43,200 queries across four held-out 90° sectors. Joint
PLS repairs 2,469 EG2-PLS mistakes but introduces 2,522 new ones: 53 fewer correct
queries (−0.12 percentage points). Weighted cosine repairs 2,748 and regresses
2,948 versus EG2 PLS. Relative to raw EG2 cosine, it adds 138 correct queries
(+0.32 points). These small differences are descriptive, not significance claims.

Nearby-view joint PLS adds 494 correct queries (762 repairs / 268 regressions,
+1.91 points). Withheld elevations add 489 (2,260 / 1,771, +1.13 points). Mirrored
gaps lose 7,551 relative to EG2 PLS (3,518 / 11,069, −17.48 points), and raw EG2
cosine itself beats EG2 PLS there. Validation selected EG2 PLS in all 13 conditions;
that selection does not guarantee performance under a larger viewpoint shift.

## Data and split boundaries

Both encoders use the same 50,400 full-catalog source rows. This experiment
uses the 43,200 nonpolar views of 20 known mesh/paint configurations, with the
exact retained observation-ladder split lists. The 7,200 polar views and 2,808
Sim2 references are excluded here; they remain in the full explorer. Each full
768D vector is normalized separately; joint input is 1536D with equal block
scaling. No 3D explorer coordinates are reused for fitting or scoring.

Gallery views alone fit PLS. Disjoint tuning views select the DINO weight
(0–1 grid) and 4/16/64 PLS components. A third set fits calibration; query labels
only score predictions. Sector training/tuning/calibration poses stay more than
5° outside test sectors. Elevation folds withhold an entire elevation. All views
at a pose remain in the same role across the 20 configurations. Nearby-view
results include 25,920 queries; each other family includes 43,200. The families
reuse views and must not be pooled as independent observations. This is an
exploratory follow-up on a previously inspected dataset, frozen before fusion
fits; it is not independent preregistration.

Raw cosine takes the maximum gallery similarity for each configuration.
Weighted score fusion combines those per-configuration maxima; the two models
may select different gallery views. Joint PLS predicts one-hot configuration
targets and does not establish separate shape/color factors. Both single-encoder
PLS controls use the same component grid and supervision.

## Complementarity and Bayesian matching

On the primary sectors, an oracle that could choose whichever raw encoder was
correct would reach 95.00%. That uses test truth and is not a usable matcher.
The measured fusion methods do not realize this upper bound. Raw DINO preserves
vehicle type much more reliably than source paint on this catalog; these metrics
do not establish disentangled factors inside the embedding.

A separate balanced logistic model jointly calibrates the two cosine scores on
calibration views. Its raw logit is a same-configuration score likelihood-ratio
surrogate under an effective 50/50 training prior. Binary probabilities in the
saved metrics apply the explicit 1/20 candidate prior. The report's class NLL
and Brier score use a 20-way softmax and are distinct from those binary metrics.
Other methods fit a scalar class temperature on calibration views only.

Joint score calibration reaches 90.34% on primary sectors, below EG2 cosine's
90.70%, and has worse class NLL (0.257 vs 0.223). Thus this calibration experiment
does not justify replacing the existing matcher. Calibration can shift with
viewpoint. Correlated encoder scores are fitted jointly, not multiplied as
independent evidence. There is no MHT runtime or physical identity validation.

The useful next test is physical-instance data containing same-type/same-paint
vehicles across separate captures, with a view-coverage-matched validation split.
Keep raw EG2 and supervised EG2 controls. Test geometry/paint-specific branches
or a learned gate only in a new frozen follow-up; this run is retained unchanged.

## Evidence and inspection

- [Interactive report](index.html), [all 91 condition/method rows](conditions.csv),
  [complete summaries and tuning choices](results.json).
- [Accuracy figure (SVG)](accuracy.svg), [PNG](accuracy.png),
  [calibration figure](calibration.svg).
- [Frozen protocol](protocol.json), [numerical verification](verification.json).
- Seven numerical/split tests passed; all 13 saved conditions replay exactly.
  Every saved PLS score was replayed from its coefficients; 832 sampled cosine
  queries were independently checked with SciPy distances. All EG2 query and
  calibration cosine arrays exactly match the retained historical baseline.
- Full score arrays, selected coefficient matrices, row IDs and frozen source
  snapshots remain local under `fusion-v1/folds/` and `fusion-v1/source/`.
- Illustrated repairs/regressions are the first two distinct true configurations
  in each sector/method/outcome, not a representative error-rate estimate.
- An initial path-setup failure occurred before protocol creation or any fits;
  it remains in the sibling `fusion-v1-setup-failed-relative-path` directory.

Protocol SHA-256: `3777a02ad03523bb322da955a98fea5cf6a78ceb0d5f7af4982c37d2a2891248`.

These are authored configuration-recognition results. They do not demonstrate
re-identification of distinct physical vehicles, cross-session generalization,
or calibrated MHT association likelihoods.
