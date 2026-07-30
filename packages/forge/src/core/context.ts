import { batch as rippleBatch } from '@vielzeug/ripple';

import { assertSafeKey, flattenValues, isSafeKey } from '../_utils';
import { ForgeDisposedError } from '../errors';
import {
  type ArrayField,
  type FieldState,
  type FieldValidator,
  FORM_ERROR,
  type FormOptions,
  type FormState,
  type FormValidator,
  type SafeParseSchema,
  type SubscribeOptions,
  type Unsubscribe,
} from '../types';
import { createNotifier } from './notifier';

/**
 * Resolves the `validator` option to a FormValidator.
 * Auto-detects SafeParseSchema objects (duck-typed via `safeParse`) and wraps them,
 * enabling direct use of @vielzeug/spell, Zod, Valibot schemas without an explicit wrapper call.
 */
function resolveFormValidator<TValues extends Record<string, unknown>>(
  raw: FormValidator<TValues> | SafeParseSchema | undefined,
): FormValidator<TValues> | undefined {
  if (!raw) return undefined;

  if (typeof raw === 'function') return raw;

  const schema = raw as SafeParseSchema;

  return (values, signal) => {
    if (signal?.aborted) return undefined;

    const result = schema.safeParse(values);

    if (result.success) return undefined;

    const errors: Partial<Record<string, string>> = {};

    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || FORM_ERROR;

      // Security: `issue.path` is schema-controlled (untrusted duck-typed input, per
      // SafeParseSchema) — reject reserved segments before it can become an error key.
      if (!isSafeKey(key)) continue;

      if (!errors[key]) errors[key] = issue.message;
    }

    return errors as Partial<Record<string, string>>;
  };
}

/**
 * Shared mutable state for the field/validator Maps + lifecycle primitives, passed to every
 * `createForm()` sub-module factory (`createFieldOps`, `createObserveOps`, `createLifecycleOps`).
 * The single shared bag every ops module and the form view (core/view.ts) reads/writes.
 *
 * Notably absent: signals, subscriptions, and derived-state caching. Those have no dependency
 * on the field/validator Maps below — only on "what does current state look like," computed
 * here via `computeState`/`buildFieldState` — so they live in their own `Notifier` instance
 * (`core/notifier.ts`) instead of this shared bag. `requestNotify`/`getStateSnapshot`/
 * `getFieldSnapshot`/`subscribe`/`subscribeField` below are thin pass-throughs to that
 * notifier, kept on `FormContext` purely so the other ops modules don't need two objects.
 * @internal
 */
export type FormContext<TValues extends Record<string, unknown> = Record<string, unknown>> = {
  arrayCache: Map<string, ArrayField>;
  baseline: Map<string, unknown>;
  batch(fn: () => void): void;
  cachedValues: TValues | null;
  computeErrors(): Readonly<Record<string, string>>;
  dirty: Set<string>;
  dispose(): void;
  disposeController: AbortController;
  disposed: boolean;
  ensureNotDisposed(op?: string): void;
  fieldCtrls: Map<string, AbortController>;
  fieldErrors: Map<string, string>;
  formValidator: FormValidator<TValues> | undefined;
  getFieldSnapshot(name: string): FieldState<unknown>;
  getStateSnapshot(): FormState;
  invalidateErrors(): void;
  invalidateValues(): void;
  isSubmittingState: boolean;
  loadingState: boolean;
  requestNotify(target?: string | Iterable<string>): void;
  runCtrls: Set<AbortController>;
  store: Map<string, unknown>;
  submitCount: number;
  subscribe(listener: (state: FormState) => void, options?: SubscribeOptions): Unsubscribe;
  subscribeField(name: string, listener: (state: FieldState<unknown>) => void, options?: SubscribeOptions): Unsubscribe;
  touched: Set<string>;
  validatingCount: Map<string, number>;
  validators: Map<string, FieldValidator<unknown>>;
};

/**
 * Builds the raw mutable state + shared primitives for a form: the field/validator Maps,
 * the notifier that turns mutations into signal updates, and the caches derived from both.
 */
export function createFormContext<TValues extends Record<string, unknown> = Record<string, unknown>>(
  init: FormOptions<TValues>,
): FormContext<TValues> {
  /* ---- Validators ---- */

  const validators = new Map<string, FieldValidator<unknown>>();

  for (const [name, validator] of Object.entries(init.validators ?? {})) {
    assertSafeKey(name);
    validators.set(name, validator as FieldValidator<unknown>);
  }

  const formValidator: FormValidator<TValues> | undefined = resolveFormValidator(init.validator);

  /* ---- Core state ---- */

  let loadingState = typeof init.defaultValues === 'function';

  const staticValues = typeof init.defaultValues !== 'function' ? init.defaultValues : undefined;
  const baseline = new Map<string, unknown>(Object.entries(flattenValues(staticValues ?? {})));
  const store = new Map<string, unknown>(baseline);
  const fieldErrors = new Map<string, string>();
  const touched = new Set<string>();
  const dirty = new Set<string>();

  /* ---- Validation tracking ---- */

  /**
   * Per-field count of in-flight validation runs. Incremented before a run starts and
   * decremented in its `finally` — the field leaves `validatingFields` when the count
   * returns to zero. (Replaces an earlier symbol-token Set per field: same invariant,
   * no ceremony.)
   */
  const validatingCount = new Map<string, number>();
  const runCtrls = new Set<AbortController>();
  const fieldCtrls = new Map<string, AbortController>();
  const disposeController = new AbortController();

  /* ---- Caches ---- */

  let cachedValues: TValues | null = null;
  let cachedErrors: Readonly<Record<string, string>> | null = null;
  const arrayCache = new Map<string, ArrayField>();

  /* ---- Submission state ---- */

  let isSubmittingState = false;
  let submitCount = 0;

  /* ---- Lifecycle ---- */

  let disposed = false;

  /* ======== Derived state (fed to the notifier below) ======== */

  function invalidateValues(): void {
    cachedValues = null;
  }

  function invalidateErrors(): void {
    cachedErrors = null;
  }

  function computeErrors(): Readonly<Record<string, string>> {
    return (cachedErrors ??= Object.freeze(Object.fromEntries(fieldErrors)));
  }

  function computeState(): FormState {
    return Object.freeze({
      errors: computeErrors(),
      isDirty: dirty.size > 0,
      isLoading: loadingState,
      isSubmitting: isSubmittingState,
      isTouched: touched.size > 0,
      isValid: fieldErrors.size === 0,
      isValidating: validatingCount.size > 0,
      submitCount,
      touchedFields: Object.freeze([...touched]) as readonly string[],
      validatingFields: Object.freeze([...validatingCount.keys()]) as readonly string[],
    });
  }

  function buildFieldState(name: string): FieldState<unknown> {
    const error = fieldErrors.get(name);

    return {
      dirty: dirty.has(name),
      error,
      touched: touched.has(name),
      value: store.get(name),
    };
  }

  const notifier = createNotifier({
    buildFieldState,
    computeState,
    invalidateCaches() {
      invalidateValues();
      invalidateErrors();
    },
  });

  /* ======== Lifecycle guards ======== */

  function ensureNotDisposed(op?: string): void {
    if (disposed) throw new ForgeDisposedError(op);
  }

  /* ======== Batch ======== */

  function batch(fn: () => void): void {
    ensureNotDisposed('batch');

    try {
      rippleBatch(fn);
    } catch (e) {
      // rippleBatch clears its pending-subscriber queue on error to prevent
      // stale flushes on future unrelated writes. Re-notify here so subscribers
      // still see the partial mutations that succeeded before the throw.
      notifier.requestNotify();
      throw e;
    }
  }

  function dispose(): void {
    disposed = true;
    disposeController.abort();

    for (const ctrl of fieldCtrls.values()) ctrl.abort();

    fieldCtrls.clear();
    runCtrls.clear();
    arrayCache.clear();
    notifier.dispose();
  }

  return {
    arrayCache,
    baseline,
    batch,
    get cachedValues() {
      return cachedValues;
    },
    set cachedValues(value) {
      cachedValues = value;
    },
    computeErrors,
    dirty,
    dispose,
    disposeController,
    get disposed() {
      return disposed;
    },
    ensureNotDisposed,
    fieldCtrls,
    fieldErrors,
    formValidator,
    getFieldSnapshot: notifier.getFieldSnapshot,
    getStateSnapshot: notifier.getStateSnapshot,
    invalidateErrors,
    invalidateValues,
    get isSubmittingState() {
      return isSubmittingState;
    },
    set isSubmittingState(value) {
      isSubmittingState = value;
    },
    get loadingState() {
      return loadingState;
    },
    set loadingState(value) {
      loadingState = value;
    },
    requestNotify: notifier.requestNotify,
    runCtrls,
    store,
    get submitCount() {
      return submitCount;
    },
    set submitCount(value) {
      submitCount = value;
    },
    subscribe: notifier.subscribe,
    subscribeField: notifier.subscribeField,
    touched,
    validatingCount,
    validators,
  };
}
