# Change Log - @vielzeug/workit

This log was last generated on Tue, 24 Mar 2026 22:12:47 GMT and should not be manually modified.

## 2.0.0
Tue, 24 Mar 2026 22:12:47 GMT

### Breaking changes

- Major release: Web Worker pool abstraction via createWorker() with configurable pool size (fixed or 'auto' for hardware concurrency); run() with AbortSignal cancellation and Transferable support for zero-copy transfers; per-task and pool-level timeout with TaskTimeoutError; automatic fallback to main-thread execution when Workers are unavailable; isNative flag for environment detection; external script loading via scripts option; status property (idle/running/terminated); typed WorkerHandle<TInput, TOutput> with full TypeScript inference; [Symbol.dispose]() support

