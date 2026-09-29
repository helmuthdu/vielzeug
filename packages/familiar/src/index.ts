export { type BatchOptions, runBatch } from './_pool.js';
export {
  FamiliarError,
  FamiliarInvalidOptionsError,
  FamiliarQueueFullError,
  FamiliarRuntimeError,
  FamiliarTaskError,
  FamiliarTerminatedError,
  FamiliarTimeoutError,
} from './errors.js';
export type {
  DrainOptions,
  FamiliarTapEvent,
  PoolBase,
  RunOptions,
  StreamWorkerPool,
  WorkerOptions,
  WorkerPool,
  WorkerStats,
  WorkerStatus,
} from './types.js';
export { createStreamWorker, createWorker } from './worker.js';
