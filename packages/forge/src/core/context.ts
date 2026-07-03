import { batch as rippleBatch, signal, type Signal } from '@vielzeug/ripple';

import { assertSafeKey, flattenValues, isSafeKey } from '../_utils';
import { ForgeDisposedError } from '../errors';
import {
  type ArrayField,
  type ConnectOptions,
  type FieldState,
  type FieldValidator,
  FORM_ERROR,
  type Form,
  type FormOptions,
  type FormState,
  type FormValidator,
  type SafeParseSchema,
} from '../types';

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
 * Shared mutable state + primitives passed to every createForm() sub-module factory
 * (`createValueOps`, `createValidationOps`, `createObserveOps`, `createLifecycleOps`).
 * Mirrors the `ScopeContext` pattern already established in `internal/scope.ts`.
 * @internal
 */
export type FormContext<TValues extends Record<string, unknown> = Record<string, unknown>> = {
  arrayCache: Map<string, ArrayField>;
  baseline: Map<string, unknown>;
  batch(fn: () => void): void;
  buildFieldState(name: string): FieldState<unknown>;
  cachedErrors: Readonly<Record<string, string>> | null;
  cachedValues: TValues | null;
  computeErrors(): Readonly<Record<string, string>>;
  computeState(): FormState;
  connectDefaults: ConnectOptions;
  dirty: Set<string>;
  disposeController: AbortController;
  disposed: boolean;
  ensureNotDisposed(): void;
  fieldCtrls: Map<string, AbortController>;
  fieldErrors: Map<string, string>;
  fieldSignals: Map<string, Signal<FieldState<unknown>>>;
  fieldStateCache: Map<string, FieldState<unknown>>;
  formStateSignal: Signal<FormState>;
  formValidator: FormValidator<TValues> | undefined;
  getFieldSnapshot(name: string): FieldState<unknown>;
  getOrCreateFieldSignal(key: string): Signal<FieldState<unknown>>;
  getStateSnapshot(): FormState;
  invalidateErrors(): void;
  invalidateValues(): void;
  isSubmittingState: boolean;
  loadingState: boolean;
  requestNotify(target?: string | Iterable<string>): void;
  rippleSubs: Set<{ dispose(): void }>;
  runCtrls: Set<AbortController>;
  scopeCache: Map<string, Form<never>>;
  store: Map<string, unknown>;
  submitCount: number;
  touched: Set<string>;
  validatingRuns: Map<string, Set<symbol>>;
  validators: Map<string, FieldValidator<unknown>>;
};

/**
 * Builds the raw mutable state + shared primitives for a form. This is the "Core state" +
 * "Notification helpers" sections of the original monolithic `createForm()` body, factored
 * out so `internal/values.ts`, `internal/validation.ts`, `internal/observe.ts`, and
 * `internal/lifecycle.ts` can each operate on the same shared state without closing over
 * ad-hoc free variables.
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
  const connectDefaults: ConnectOptions = init.connect ?? {};

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
   * Symbol-based ref-counting for concurrent validation runs per field.
   * Each runValidationCore() call mints a unique symbol and adds it to the field's Set.
   * The field leaves `validatingFields` only when its Set is empty — impossible to miscount.
   */
  const validatingRuns = new Map<string, Set<symbol>>();
  const runCtrls = new Set<AbortController>();
  const fieldCtrls = new Map<string, AbortController>();
  const disposeController = new AbortController();

  /* ---- Caches ---- */

  let cachedValues: TValues | null = null;
  let cachedErrors: Readonly<Record<string, string>> | null = null;
  const fieldStateCache = new Map<string, FieldState<unknown>>();
  const arrayCache = new Map<string, ArrayField>();
  const scopeCache = new Map<string, Form<never>>();

  /* ---- Submission state ---- */

  let isSubmittingState = false;
  let submitCount = 0;

  /* ---- Lifecycle ---- */

  let disposed = false;

  /* ---- Reactive signals ---- */

  const fieldSignals = new Map<string, Signal<FieldState<unknown>>>();
  const rippleSubs = new Set<{ dispose(): void }>();

  function getOrCreateFieldSignal(key: string): Signal<FieldState<unknown>> {
    if (!fieldSignals.has(key)) {
      fieldSignals.set(
        key,
        signal<FieldState<unknown>>(buildFieldState(key), {
          equals: (a, b) =>
            a.value === b.value &&
            a.error === b.error &&
            a.hasError === b.hasError &&
            a.touched === b.touched &&
            a.dirty === b.dirty,
        }),
      );
    }

    return fieldSignals.get(key)!;
  }

  /* ======== Notification helpers ======== */

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
      isValidating: validatingRuns.size > 0,
      submitCount,
      touchedFields: Object.freeze([...touched]) as readonly string[],
      validatingFields: Object.freeze([...validatingRuns.keys()]) as readonly string[],
    });
  }

  const formStateSignal = signal<FormState>(computeState());

  function getStateSnapshot(): FormState {
    return formStateSignal.value;
  }

  function buildFieldState(name: string): FieldState<unknown> {
    const error = fieldErrors.get(name);

    return {
      dirty: dirty.has(name),
      error,
      hasError: error !== undefined,
      touched: touched.has(name),
      value: store.get(name),
    };
  }

  function getFieldSnapshot(name: string): FieldState<unknown> {
    const cached = fieldStateCache.get(name);

    if (cached) return cached;

    const snap = Object.freeze(buildFieldState(name));

    fieldStateCache.set(name, snap);

    return snap;
  }

  /**
   * R4: Unified notification — replaces requestNotify(field?) + requestNotifyFields(fields).
   * - undefined  → full-form refresh (all field signals + form signal)
   * - string     → single field + form signal
   * - Iterable   → targeted set of fields + form signal
   * rippleBatch deduplicates signal writes within the synchronous call stack.
   */
  function requestNotify(target?: string | Iterable<string>): void {
    if (disposed) return;

    invalidateValues();
    cachedErrors = null;

    if (target === undefined) {
      fieldStateCache.clear();
      rippleBatch(() => {
        formStateSignal.value = computeState();

        for (const [name, sig] of fieldSignals) sig.value = buildFieldState(name);
      });
    } else if (typeof target === 'string') {
      fieldStateCache.delete(target);
      rippleBatch(() => {
        formStateSignal.value = computeState();

        const sig = fieldSignals.get(target);

        if (sig) sig.value = buildFieldState(target);
      });
    } else {
      // Materialize before rippleBatch so the iterable isn't consumed inside the callback.
      const fields = [...target];

      for (const field of fields) fieldStateCache.delete(field);

      rippleBatch(() => {
        formStateSignal.value = computeState();

        for (const field of fields) {
          const sig = fieldSignals.get(field);

          if (sig) sig.value = buildFieldState(field);
        }
      });
    }
  }

  /* ======== Lifecycle guards ======== */

  function ensureNotDisposed(): void {
    if (disposed) throw new ForgeDisposedError();
  }

  /* ======== Batch ======== */

  function batch(fn: () => void): void {
    ensureNotDisposed();

    try {
      rippleBatch(fn);
    } catch (e) {
      // rippleBatch clears its pending-subscriber queue on error to prevent
      // stale flushes on future unrelated writes. Re-notify here so subscribers
      // still see the partial mutations that succeeded before the throw.
      requestNotify();
      throw e;
    }
  }

  return {
    arrayCache,
    baseline,
    batch,
    buildFieldState,
    get cachedErrors() {
      return cachedErrors;
    },
    set cachedErrors(value) {
      cachedErrors = value;
    },
    get cachedValues() {
      return cachedValues;
    },
    set cachedValues(value) {
      cachedValues = value;
    },
    computeErrors,
    computeState,
    connectDefaults,
    dirty,
    disposeController,
    get disposed() {
      return disposed;
    },
    set disposed(value) {
      disposed = value;
    },
    ensureNotDisposed,
    fieldCtrls,
    fieldErrors,
    fieldSignals,
    fieldStateCache,
    formStateSignal,
    formValidator,
    getFieldSnapshot,
    getOrCreateFieldSignal,
    getStateSnapshot,
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
    requestNotify,
    rippleSubs,
    runCtrls,
    scopeCache,
    store,
    get submitCount() {
      return submitCount;
    },
    set submitCount(value) {
      submitCount = value;
    },
    touched,
    validatingRuns,
    validators,
  };
}
