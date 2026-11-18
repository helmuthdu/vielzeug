# Change Log - @vielzeug/stage

This log was last generated on Wed, 18 Nov 2026 14:27:22 GMT and should not be manually modified.

## 26.11.24

Wed, 18 Nov 2026 14:27:22 GMT

### Minor changes

- toBlob gains region and scale options for cropped, high-resolution export on both main-thread and worker stages
## 26.11.23

Wed, 18 Nov 2026 09:39:29 GMT

### Minor changes

- feat(stage): retained-mode layered canvas engine (cached per-layer surfaces, dirty repaints, DPR-aware world transforms, flushing toBlob) plus a worker subpath (createWorkerStage/serveStage over a transferred OffscreenCanvas with a typed scene channel and a shared StageController type)
