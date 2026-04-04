# Change Log - @vielzeug/workit

This log was last generated on Tue, 24 Mar 2026 22:12:47 GMT and should not be manually modified.

## 2.0.0
Tue, 24 Mar 2026 22:12:47 GMT

### Breaking changes

- Major release: Web Worker pool abstraction via createWorker() with configurable concurrency (fixed or 'auto' for hardware concurrency); run() with AbortSignal cancellation and Transferable support for zero-copy transfers; per-task timeout with TaskTimeoutError and worker recycle semantics; status property (idle/running/terminated); typed WorkerHandle<TInput, TOutput> with full TypeScript inference; [Symbol.dispose]() support
