/**
 * FormCore — the shared internal context passed to each sub-module (validation, subscriptions, lifecycle).
 * All Maps and Sets are shared by reference. Scalar state is read/written via accessor functions
 * to avoid stale closures across sub-module boundaries.
 *
 * F1 split architecture: form.ts creates one FormCore and passes it to all sub-modules.
 * Sub-modules import only what they need from here.
 */

import type { FieldState, FieldValidator, FormState, SetOptions } from '../types';

export interface FormCore {
  /* ---- Raw state containers ---- */
  readonly store: Map<string, unknown>;
  readonly baseline: Map<string, unknown>;
  readonly validators: Map<string, FieldValidator<unknown>>;
  readonly fieldErrors: Map<string, string>;
  readonly touched: Set<string>;
  readonly dirty: Set<string>;

  /* ---- Validation abort control ---- */
  readonly fieldCtrls: Map<string, AbortController>;
  readonly runCtrls: Set<AbortController>;
  /** R8: each in-flight run for a field holds one Symbol token */
  readonly validatingRuns: Map<string, Set<symbol>>;
  readonly disposeController: AbortController;

  /* ---- Debounce timers (R3) ---- */
  readonly debounceTimers: Map<string, ReturnType<typeof setTimeout>>;

  /* ---- Scalar state accessors ---- */
  getIsSubmitting(): boolean;
  setIsSubmitting(v: boolean): void;
  getSubmitCount(): number;
  incrementSubmitCount(): void;
  resetSubmitCount(): void;
  getIsDisposed(): boolean;
  getIsLoading(): boolean;
  setIsLoading(v: boolean): void;

  /* ---- Cache invalidation ---- */
  invalidateState(): void;
  invalidateValues(): void;
  invalidateErrors(): void;

  /* ---- Snapshot helpers ---- */
  getStateSnapshot(): FormState;
  getFieldSnapshot(name: string): FieldState<unknown>;
  buildFieldState(name: string): FieldState<unknown>;

  /* ---- Notification ---- */
  requestNotify(target?: string | Iterable<string>): void;

  /* ---- Batch ---- */
  getBatchDepth(): number;
  incrementBatchDepth(): void;
  decrementBatchDepth(): void;
  flushNotifications(): void;

  /* ---- Guards ---- */
  ensureNotDisposed(): void;

  /* ---- Field ops (needed by lifecycle sub-module) ---- */
  set(name: string, value: unknown, options?: SetOptions): void;
  touch(name: string): void;
  untouch(name: string): void;
  values(): Record<string, unknown>;
}
