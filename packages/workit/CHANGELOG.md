# Change Log - @vielzeug/workit

This log was last generated on Sun, 17 May 2026 05:41:44 GMT and should not be manually modified.

## 3.0.1
Sun, 17 May 2026 05:41:44 GMT

### Patches

- Dummy patch release to republish after npm token incident.

## 3.0.0
Sun, 17 May 2026 05:10:17 GMT

### Breaking changes

- Release a new major version with worker-pool behavior and API refinements, stronger typing guarantees, and breaking contract updates.

## 2.1.0
Sat, 04 Apr 2026 13:30:02 GMT

### Minor changes

- General Improvements and Bugfixes

## 2.0.0
Tue, 24 Mar 2026 22:12:47 GMT

### Breaking changes

- Major release: Web Worker pool abstraction via createWorker() with configurable pool size (fixed or 'auto' for hardware concurrency); run() with AbortSignal cancellation and Transferable support for zero-copy transfers; per-task and pool-level timeout with TaskTimeoutError; automatic fallback to main-thread execution when Workers are unavailable; isNative flag for environment detection; external script loading via scripts option; status property (idle/running/terminated); typed WorkerHandle<TInput, TOutput> with full TypeScript inference; [Symbol.dispose]() support

