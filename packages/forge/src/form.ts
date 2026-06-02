import { isAbortError } from '@vielzeug/arsenal';
import { batch as rippleBatch, signal, type Signal, watch } from '@vielzeug/ripple';

import { createArrayField } from './internal/array';
import { createScopedForm, type ScopeContext } from './internal/scope';
import {
  type ArrayField,
  type ConnectionResult,
  type ConnectOptions,
  type ErrorKeyOf,
  type FieldState,
  type FieldValidator,
  type FlatKeyOf,
  type Form,
  FORM_ERROR,
  type FormOptions,
  type FormSnapshot,
  type FormState,
  type FormValidator,
  type MaybePromise,
  type RegisterFieldOptions,
  type SafeParseSchema,
  type ScopedValues,
  type SetOptions,
  type SubmitResult,
  type SubscribeOptions,
  type TypeAtPath,
  type Unsubscribe,
  type ValidateResult,
} from './types';
import { anySignal, flattenValues, isSafeKey, unflattenValues } from './utils';

/* -------------------- Private helpers -------------------- */

/** R2: Single assertion helper — replaces 5 copy-pasted guard blocks. */
function assertSafeKey(key: string): void {
  if (!isSafeKey(key))
    throw new Error(`[forge] Unsafe key '${key}': segments __proto__, constructor, and prototype are reserved.`);
}

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

      if (!errors[key]) errors[key] = issue.message;
    }

    return errors as Partial<Record<ErrorKeyOf<TValues>, string>>;
  };
}

/* -------------------- createForm -------------------- */

export function createForm<TInit extends object>(
  init: Omit<FormOptions<TInit & Record<string, unknown>>, 'defaultValues'> & {
    defaultValues: TInit | (() => Promise<TInit>);
  },
): Form<TInit & Record<string, unknown>>;
export function createForm<TValues extends Record<string, unknown> = Record<string, unknown>>(
  init?: FormOptions<TValues>,
): Form<TValues>;
export function createForm<TValues extends Record<string, unknown> = Record<string, unknown>>(
  init: FormOptions<TValues> = {},
): Form<TValues> {
  /* ---- Validators ---- */

  const validators = new Map<string, FieldValidator<unknown>>();

  for (const [name, validator] of Object.entries(init.validators ?? {})) {
    assertSafeKey(name);
    validators.set(name, validator as FieldValidator<unknown>);
  }

  const formValidator: FormValidator<TValues> | undefined = resolveFormValidator(init.validator);
  const connectDefaults: ConnectOptions = init.connect ?? {};

  /* ---- Core state ---- */

  let loadingState = false;

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
            a.value === b.value && a.error === b.error && a.touched === b.touched && a.dirty === b.dirty,
        }),
      );
    }

    return fieldSignals.get(key)!;
  }

  /* ---- Async defaultValues ---- */

  if (typeof init.defaultValues === 'function') {
    loadingState = true;
    void init
      .defaultValues()
      .then((resolved) => {
        loadingState = false;
        replace(resolved);
      })
      .catch(() => {
        loadingState = false;
        requestNotify();
      });
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
    }) as unknown as FormState;
  }

  const formStateSignal = signal<FormState>(computeState());

  function getStateSnapshot(): FormState {
    return formStateSignal.value;
  }

  function buildFieldState(name: string): FieldState<unknown> {
    return {
      dirty: dirty.has(name),
      error: fieldErrors.get(name),
      touched: touched.has(name),
      value: store.get(name),
    };
  }

  function getFieldSnapshot(name: string): FieldState<unknown> {
    const cached = fieldStateCache.get(name);

    if (cached) return cached;

    const snap = Object.freeze(buildFieldState(name)) as unknown as FieldState<unknown>;

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
    if (disposed) throw new Error('Cannot modify a disposed form');
  }

  /* ======== Batch ======== */

  function batch(fn: () => void): void {
    ensureNotDisposed();
    rippleBatch(fn);
  }

  /* ======== Value access ======== */

  function get<K extends FlatKeyOf<TValues>>(name: K): TypeAtPath<TValues, K> {
    return store.get(name as string) as TypeAtPath<TValues, K>;
  }

  function values(): TValues {
    return (cachedValues ??= unflattenValues(Object.fromEntries(store)) as TValues);
  }

  /* ======== Dirty tracking ======== */

  function trackDirty(name: string, value: unknown): void {
    if (baseline.get(name) === value) dirty.delete(name);
    else dirty.add(name);
  }

  /* ======== Field mutation ======== */

  function set<K extends FlatKeyOf<TValues>>(name: K, value: TypeAtPath<TValues, K>, options: SetOptions = {}): void {
    ensureNotDisposed();

    const key = name as string;

    assertSafeKey(key);
    store.set(key, value);
    trackDirty(key, value);

    if (options.touched) touched.add(key);

    requestNotify(key);
  }

  function field<K extends FlatKeyOf<TValues>>(name: K): FieldState<TypeAtPath<TValues, K>> {
    return getFieldSnapshot(name as string) as FieldState<TypeAtPath<TValues, K>>;
  }

  function setError(name: ErrorKeyOf<TValues>, message: string): void {
    ensureNotDisposed();

    const key = name as string;

    assertSafeKey(key);
    fieldErrors.set(key, message);
    invalidateErrors();
    requestNotify(key);
  }

  function clearError(name: ErrorKeyOf<TValues>): void {
    ensureNotDisposed();

    if (fieldErrors.delete(name as string)) {
      invalidateErrors();
      requestNotify(name as string);
    }
  }

  function resetErrors(nextErrors: Partial<Record<ErrorKeyOf<TValues>, string | undefined>> = {}): void {
    ensureNotDisposed();

    fieldErrors.clear();

    for (const [key, message] of Object.entries(nextErrors)) {
      if (typeof message === 'string') fieldErrors.set(key, message);
    }

    invalidateErrors();
    requestNotify();
  }

  function setValidator(name: FlatKeyOf<TValues>, validator?: FieldValidator<unknown>): void {
    ensureNotDisposed();

    const key = name as string;

    assertSafeKey(key);

    if (import.meta.env.DEV && /\.\d+(\.|$)/.test(key) && !store.has(key)) {
      const displayKey = key.replace(/\p{C}/gu, '?').slice(0, 80);

      console.warn(
        `[forge] setValidator('${displayKey}'): path looks like an array item key. ` +
          `Array items are stored as whole arrays — register the validator on the parent key instead.`,
      );
    }

    fieldCtrls.get(key)?.abort();
    fieldCtrls.delete(key);

    if (validator) {
      validators.set(key, validator);
    } else {
      validators.delete(key);

      if (fieldErrors.delete(key)) {
        invalidateErrors();
        requestNotify(key);
      }
    }
  }

  /* ======== Dynamic field registration ======== */

  function registerField<K extends FlatKeyOf<TValues>>(
    name: K,
    options: RegisterFieldOptions<TypeAtPath<TValues, K>> = {},
  ): Unsubscribe {
    ensureNotDisposed();

    const key = name as string;

    assertSafeKey(key);

    if (options.validator !== undefined) setValidator(name, options.validator as FieldValidator<unknown>);

    if (options.defaultValue !== undefined && !store.has(key)) {
      store.set(key, options.defaultValue);
      baseline.set(key, options.defaultValue);
      requestNotify(key);
    }

    return () => {
      if (!disposed) removeField(name);
    };
  }

  /* ======== Touch ======== */

  function touch(name: FlatKeyOf<TValues>): void {
    ensureNotDisposed();
    touched.add(name as string);
    requestNotify(name as string);
  }

  function untouch(name: FlatKeyOf<TValues>): void {
    ensureNotDisposed();

    if (touched.delete(name as string)) requestNotify(name as string);
  }

  function touchAll(): void {
    ensureNotDisposed();

    for (const name of store.keys()) touched.add(name);
    for (const name of validators.keys()) touched.add(name);

    requestNotify();
  }

  function untouchAll(): void {
    ensureNotDisposed();
    touched.clear();
    requestNotify();
  }

  /* ======== Validation ======== */

  async function runFieldValidator(name: string, signal: AbortSignal): Promise<string | undefined> {
    const validator = validators.get(name);

    if (!validator) return undefined;

    if (signal.aborted) throw signal.reason;

    const result = await validator(store.get(name), signal);

    return typeof result === 'string' ? result : undefined;
  }

  async function runFormValidator(signal: AbortSignal): Promise<Record<string, string>> {
    if (!formValidator) return {};

    if (signal.aborted) throw signal.reason;

    const result = await formValidator(values(), signal);
    const errors: Record<string, string> = {};

    if (result) {
      for (const [key, message] of Object.entries(result)) {
        if (typeof message === 'string') errors[key] = message;
      }
    }

    return errors;
  }

  function applyFieldErrors(
    fieldSet: Set<string>,
    nextErrors: Record<string, string>,
    formErrors: Record<string, string>,
    scope: 'full' | 'partial',
  ): void {
    if (scope === 'full') {
      fieldErrors.clear();

      for (const [key, message] of Object.entries(formErrors)) {
        if (nextErrors[key] === undefined) nextErrors[key] = message;
      }

      for (const [key, message] of Object.entries(nextErrors)) fieldErrors.set(key, message);

      invalidateErrors();
      requestNotify();
    } else {
      const changedFields = new Set<string>();

      for (const name of fieldSet) {
        const next = nextErrors[name];
        const previous = fieldErrors.get(name);

        if (next !== undefined) {
          fieldErrors.set(name, next);

          if (previous !== next) changedFields.add(name);
        } else if (fieldErrors.delete(name)) {
          changedFields.add(name);
        }
      }

      if (changedFields.size > 0) invalidateErrors();

      requestNotify(changedFields);
    }
  }

  async function runValidationCore(
    fields: string[],
    scope: 'full' | 'partial',
    signal?: AbortSignal,
  ): Promise<ValidateResult & { aborted: boolean }> {
    const fieldSet = new Set(fields);
    const fieldRunCtrls = new Map<string, AbortController>();

    for (const name of fieldSet) {
      fieldCtrls.get(name)?.abort();

      const ctrl = new AbortController();

      fieldCtrls.set(name, ctrl);
      fieldRunCtrls.set(name, ctrl);
    }

    const runCtrl = new AbortController();
    const runSignal = anySignal(runCtrl.signal, signal, disposeController.signal)!;

    runCtrls.add(runCtrl);

    // Symbol-based ref-counting: each run gets a unique token per field.
    // The field leaves validatingFields only when its Set empties — impossible to miscount.
    const runId = Symbol();

    for (const name of fieldSet) {
      let runs = validatingRuns.get(name);

      if (!runs) {
        runs = new Set<symbol>();
        validatingRuns.set(name, runs);
      }

      runs.add(runId);
    }

    requestNotify();

    try {
      const results = await Promise.all(
        [...fieldSet].map(async (name) => {
          const fieldSignal = scope === 'partial' ? anySignal(fieldRunCtrls.get(name)!.signal, runSignal)! : runSignal;

          return [name, await runFieldValidator(name, fieldSignal)] as const;
        }),
      );

      if (runSignal.aborted) {
        return { aborted: true, errors: Object.fromEntries(fieldErrors), valid: fieldErrors.size === 0 };
      }

      const nextErrors: Record<string, string> = {};

      for (const [name, message] of results) {
        if (message !== undefined) nextErrors[name] = message;
      }

      const formErrors = scope === 'full' ? await runFormValidator(runSignal) : {};

      applyFieldErrors(fieldSet, nextErrors, formErrors, scope);

      return { aborted: false, errors: Object.fromEntries(fieldErrors), valid: fieldErrors.size === 0 };
    } catch (error) {
      if (isAbortError(error)) {
        return { aborted: true, errors: Object.fromEntries(fieldErrors), valid: fieldErrors.size === 0 };
      }

      throw error;
    } finally {
      runCtrls.delete(runCtrl);

      for (const name of fieldSet) {
        const runs = validatingRuns.get(name);

        if (runs) {
          runs.delete(runId);

          if (runs.size === 0) validatingRuns.delete(name);
        }
      }

      requestNotify();

      for (const [name, ctrl] of fieldRunCtrls) {
        if (fieldCtrls.get(name) === ctrl) fieldCtrls.delete(name);
      }
    }
  }

  async function validate(signal?: AbortSignal): Promise<ValidateResult> {
    ensureNotDisposed();

    const result = await runValidationCore([...validators.keys()], 'full', signal);

    return { errors: result.errors, valid: result.valid };
  }

  async function validateFields(fields: FlatKeyOf<TValues>[], signal?: AbortSignal): Promise<ValidateResult> {
    ensureNotDisposed();

    const result = await runValidationCore(fields as string[], 'partial', signal);

    return { errors: result.errors, valid: result.valid };
  }

  async function validateField(name: FlatKeyOf<TValues>, signal?: AbortSignal): Promise<string | undefined> {
    await validateFields([name], signal);

    return fieldErrors.get(name as string);
  }

  /* ======== Submit ======== */

  async function submit<TResult = void>(
    handler: (values: TValues) => MaybePromise<TResult>,
  ): Promise<SubmitResult<TResult>> {
    ensureNotDisposed();

    if (isSubmittingState) throw new Error('submit() called while a submission is already in progress');

    batch(() => {
      submitCount++;
      isSubmittingState = true;
      touchAll();
    });

    try {
      const validation = await runValidationCore([...validators.keys()], 'full');

      ensureNotDisposed();

      if (!validation.valid) {
        return { errors: validation.errors, ok: false, type: 'validation' };
      }

      return { ok: true, value: await handler(values()) };
    } finally {
      isSubmittingState = false;

      if (!disposed) requestNotify();
    }
  }

  /* ======== Subscriptions ======== */

  function subscribe(listener: (state: FormState) => void, options?: SubscribeOptions): Unsubscribe {
    if (disposed) return () => {};

    // Wrap listener so it always returns void — ripple watch throws on non-function returns.
    const sub = watch(formStateSignal, (state) => {
      listener(state);
    });

    rippleSubs.add(sub);

    if (options?.sync) listener(formStateSignal.value);

    return () => {
      sub.dispose();
      rippleSubs.delete(sub);
    };
  }

  function subscribeField<K extends FlatKeyOf<TValues>>(
    name: K,
    listener: (state: FieldState<TypeAtPath<TValues, K>>) => void,
    options?: SubscribeOptions,
  ): Unsubscribe {
    if (disposed) return () => {};

    const key = name as string;
    const sig = getOrCreateFieldSignal(key);
    // Wrap listener so it always returns void — ripple watch throws on non-function returns.
    const sub = watch(sig, (state) => {
      (listener as (state: FieldState<unknown>) => void)(state);
    });

    rippleSubs.add(sub);

    if (options?.sync) listener(sig.value as FieldState<TypeAtPath<TValues, K>>);

    return () => {
      sub.dispose();
      rippleSubs.delete(sub);
    };
  }

  /* ======== R5: Connect — per-binding debounce timer ======== */

  function connect<K extends FlatKeyOf<TValues>>(
    name: K,
    config?: ConnectOptions,
  ): ConnectionResult<TypeAtPath<TValues, K>> {
    ensureNotDisposed();

    const key = name as string;
    const touchOnBlur = config?.touchOnBlur ?? connectDefaults.touchOnBlur ?? false;
    const validateOnBlur = config?.validateOnBlur ?? connectDefaults.validateOnBlur ?? false;
    const validateOnChange = config?.validateOnChange ?? connectDefaults.validateOnChange ?? false;
    const validateOnTouch = config?.validateOnTouch ?? connectDefaults.validateOnTouch ?? false;
    const debounceMs = config?.debounce ?? connectDefaults.debounce ?? 0;

    // R5: each connect() call owns its own timer — cancelling one binding never affects another.
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    function scheduleValidation(): void {
      if (debounceMs > 0) {
        if (debounceTimer !== null) clearTimeout(debounceTimer);

        debounceTimer = setTimeout(() => {
          debounceTimer = null;

          if (disposed) return;

          void validateField(name).catch((err) => {
            if (!isAbortError(err)) throw err;
          });
        }, debounceMs);
      } else {
        void validateField(name).catch((err) => {
          if (!isAbortError(err)) throw err;
        });
      }
    }

    return {
      get dirty() {
        return dirty.has(key);
      },
      /** Cancels this binding's own debounce timer. Does not affect other bindings for the same field. */
      disconnect() {
        if (debounceTimer !== null) {
          clearTimeout(debounceTimer);
          debounceTimer = null;
        }
      },
      get error() {
        return fieldErrors.get(key);
      },
      onBlur: () => {
        if (disposed) return;

        if (touchOnBlur) touch(name);

        if (validateOnBlur) scheduleValidation();
      },
      onChange: (value: TypeAtPath<TValues, K>) => {
        if (disposed) return;

        set(name, value);

        const shouldValidate = validateOnChange || (validateOnTouch && touched.has(key));

        if (shouldValidate) scheduleValidation();
      },
      get touched() {
        return touched.has(key);
      },
      get value() {
        return store.get(key) as TypeAtPath<TValues, K>;
      },
    };
  }

  /* ======== Array helpers ======== */

  function array(name: FlatKeyOf<TValues>): ArrayField {
    ensureNotDisposed();

    const key = name as string;
    const cached = arrayCache.get(key);

    if (cached) return cached;

    const helpers = createArrayField(name, store, set as (name: string, value: unknown) => void);

    arrayCache.set(key, helpers);

    return helpers;
  }

  /* ======== Lifecycle: field operations ======== */

  function resetField(name: FlatKeyOf<TValues>): void {
    ensureNotDisposed();

    const key = name as string;

    fieldCtrls.get(key)?.abort();
    fieldCtrls.delete(key);
    store.set(key, baseline.get(key));
    dirty.delete(key);
    touched.delete(key);

    if (fieldErrors.delete(key)) invalidateErrors();

    requestNotify(key);
  }

  function removeField(name: FlatKeyOf<TValues>): void {
    ensureNotDisposed();

    const key = name as string;

    store.delete(key);
    baseline.delete(key);
    dirty.delete(key);
    touched.delete(key);
    validators.delete(key);
    arrayCache.delete(key);
    fieldCtrls.get(key)?.abort();
    fieldCtrls.delete(key);

    if (fieldErrors.delete(key)) invalidateErrors();

    requestNotify(key);
  }

  function reset(): void {
    ensureNotDisposed();

    for (const ctrl of runCtrls) ctrl.abort();
    for (const ctrl of fieldCtrls.values()) ctrl.abort();

    runCtrls.clear();
    fieldCtrls.clear();
    validatingRuns.clear();
    store.clear();
    fieldErrors.clear();
    touched.clear();
    dirty.clear();
    submitCount = 0;
    invalidateErrors();

    for (const [name, value] of baseline) store.set(name, value);

    requestNotify();
  }

  function replace(newValues: TValues): void {
    ensureNotDisposed();

    for (const ctrl of runCtrls) ctrl.abort();
    for (const ctrl of fieldCtrls.values()) ctrl.abort();

    runCtrls.clear();
    fieldCtrls.clear();
    validatingRuns.clear();

    const flat = flattenValues(newValues as Record<string, unknown>);

    store.clear();
    baseline.clear();
    fieldErrors.clear();
    touched.clear();
    dirty.clear();
    submitCount = 0;
    invalidateErrors();

    for (const [name, value] of Object.entries(flat)) {
      store.set(name, value);
      baseline.set(name, value);
    }

    requestNotify();
  }

  function patch(partial: Record<string, unknown>): void {
    ensureNotDisposed();

    const flat = flattenValues(partial);

    for (const [key, value] of Object.entries(flat)) {
      baseline.set(key, value);
      store.set(key, value);
      dirty.delete(key);
    }

    requestNotify(Object.keys(flat));
  }

  function dispose(): void {
    disposed = true;
    disposeController.abort();

    for (const ctrl of fieldCtrls.values()) ctrl.abort();

    fieldCtrls.clear();
    runCtrls.clear();
    arrayCache.clear();
    scopeCache.clear();

    for (const sub of rippleSubs) sub.dispose();

    rippleSubs.clear();
    fieldSignals.clear();
  }

  /* ======== Snapshot / Restore ======== */

  function snapshot(): FormSnapshot<TValues> {
    ensureNotDisposed();

    return Object.freeze({
      baseline: Object.freeze(Object.fromEntries(baseline)),
      dirty: Object.freeze([...dirty]),
      errors: Object.freeze(Object.fromEntries(fieldErrors)),
      store: Object.freeze(Object.fromEntries(store)),
      submitCount,
      touched: Object.freeze([...touched]),
    }) as unknown as FormSnapshot<TValues>;
  }

  function restore(snap: FormSnapshot<TValues>): void {
    ensureNotDisposed();

    for (const ctrl of runCtrls) ctrl.abort();
    for (const ctrl of fieldCtrls.values()) ctrl.abort();

    runCtrls.clear();
    fieldCtrls.clear();
    validatingRuns.clear();
    store.clear();
    baseline.clear();
    fieldErrors.clear();
    touched.clear();
    dirty.clear();

    for (const [k, v] of Object.entries(snap.store)) store.set(k, v);
    for (const [k, v] of Object.entries(snap.baseline)) baseline.set(k, v);
    for (const [k, v] of Object.entries(snap.errors)) fieldErrors.set(k, v);
    for (const t of snap.touched) touched.add(t);
    for (const d of snap.dirty) dirty.add(d);

    submitCount = snap.submitCount;

    invalidateErrors();
    invalidateValues();
    requestNotify();
  }

  /* ======== validateStream ======== */

  function validateStream(signal?: AbortSignal): AsyncIterableIterator<{ error: string | undefined; field: string }> {
    ensureNotDisposed();

    const fields = [...validators.keys()];
    const ctrl = new AbortController();
    const combined = signal
      ? anySignal(ctrl.signal, signal, disposeController.signal)!
      : anySignal(ctrl.signal, disposeController.signal)!;

    type Item = { error: string | undefined; field: string };
    type Resolver = (result: IteratorResult<Item, undefined>) => void;
    type Rejecter = (err: unknown) => void;

    const queue: Item[] = [];
    let waitingResolve: Resolver | null = null;
    let waitingReject: Rejecter | null = null;
    let done = false;

    function enqueue(item: Item): void {
      if (waitingResolve) {
        const resolve = waitingResolve;

        waitingResolve = null;
        waitingReject = null;
        resolve({ done: false, value: item });
      } else {
        queue.push(item);
      }
    }

    function fail(err: unknown): void {
      done = true;
      ctrl.abort();

      if (waitingReject) {
        const reject = waitingReject;

        waitingResolve = null;
        waitingReject = null;
        reject(err);
      }
    }

    function finish(): void {
      if (done) return;

      done = true;
      ctrl.abort();

      if (waitingResolve) {
        const resolve = waitingResolve;

        waitingResolve = null;
        waitingReject = null;
        resolve({ done: true, value: undefined });
      }
    }

    // Run validators read-only — does NOT write to fieldErrors or fire requestNotify.
    // Each result is yielded as it settles; the form-level validator is yielded last.
    Promise.all(
      fields.map(async (f) => {
        if (combined.aborted) return;

        try {
          const error = await runFieldValidator(f, combined);

          if (!combined.aborted) enqueue({ error, field: f });
        } catch (err) {
          if (!isAbortError(err)) throw err;

          // aborted or disposed — skip this field
        }
      }),
    )
      .then(async () => {
        // Yield the form-level validator result last (F4: streams _form key too)
        if (formValidator && !combined.aborted) {
          try {
            const formErrors = await runFormValidator(combined);
            const formError = formErrors[FORM_ERROR];

            if (!combined.aborted) enqueue({ error: formError, field: FORM_ERROR });
          } catch {
            // aborted
          }
        }
      })
      .catch((err) => {
        if (!isAbortError(err)) fail(err);
      })
      .finally(() => finish());

    return {
      next(): Promise<IteratorResult<Item, undefined>> {
        if (queue.length > 0) return Promise.resolve({ done: false, value: queue.shift()! });

        if (done) return Promise.resolve({ done: true, value: undefined });

        return new Promise<IteratorResult<Item, undefined>>((resolve, reject) => {
          waitingResolve = resolve;
          waitingReject = reject;
        });
      },

      return(): Promise<IteratorResult<Item, undefined>> {
        finish();

        return Promise.resolve({ done: true, value: undefined });
      },

      [Symbol.asyncIterator]() {
        return this;
      },
    };
  }

  /* ======== Async iterator (for await...of form) ======== */

  function createAsyncIterator(): AsyncIterableIterator<FormState> {
    type Resolver = (result: IteratorResult<FormState, undefined>) => void;

    let pending: FormState[] = [getStateSnapshot()];
    let waitingResolve: Resolver | null = null;
    let done = false;

    const unsubscribe = subscribe((state) => {
      if (done) return;

      if (waitingResolve) {
        const resolve = waitingResolve;

        waitingResolve = null;
        resolve({ done: false, value: state });
      } else {
        pending.push(state);
      }
    });

    disposeController.signal.addEventListener(
      'abort',
      () => {
        done = true;
        unsubscribe();

        if (waitingResolve) {
          const resolve = waitingResolve;

          waitingResolve = null;
          resolve({ done: true, value: undefined } as IteratorResult<FormState, undefined>);
        }

        pending = [];
      },
      { once: true },
    );

    return {
      next(): Promise<IteratorResult<FormState, undefined>> {
        if (pending.length > 0) return Promise.resolve({ done: false, value: pending.shift()! });

        if (done) return Promise.resolve({ done: true, value: undefined });

        return new Promise<IteratorResult<FormState, undefined>>((resolve) => {
          waitingResolve = resolve;
        });
      },

      return(): Promise<IteratorResult<FormState, undefined>> {
        done = true;
        unsubscribe();

        if (waitingResolve) {
          const resolve = waitingResolve;

          waitingResolve = null;
          resolve({ done: true, value: undefined });
        }

        pending = [];

        return Promise.resolve({ done: true, value: undefined });
      },

      [Symbol.asyncIterator]() {
        return this;
      },
    };
  }

  /* ======== Public form object ======== */

  // `scope` is defined as a method on publicForm so that `const publicForm` can capture itself
  // via closure without a forward-reference lint disable.
  const publicForm: Form<TValues> = {
    array,
    batch,
    clearError,
    connect,
    dispose,
    get disposed() {
      return disposed;
    },
    field,
    get,
    get isLoading() {
      return loadingState;
    },
    get isSubmitting() {
      return isSubmittingState;
    },
    patch: patch as Form<TValues>['patch'],
    registerField,
    removeField,
    replace,
    reset,
    resetErrors,
    resetField,
    restore,
    scope<P extends FlatKeyOf<TValues>>(prefix: P): Form<ScopedValues<TValues, P>> {
      const key = prefix as string;
      const cached = scopeCache.get(key);

      if (cached) return cached as Form<ScopedValues<TValues, P>>;

      const ctx: ScopeContext<TValues> = {
        baseline,
        dirty,
        ensureNotDisposed,
        fieldCtrls,
        fieldErrors,
        getStateSnapshot,
        incrementSubmitCount: () => {
          submitCount++;
        },
        invalidateErrors,
        isDisposed: () => disposed,
        isSubmitting: () => isSubmittingState,
        requestNotify,
        root: publicForm,
        runValidationCore,
        setSubmitting: (v) => {
          isSubmittingState = v;
        },
        store,
        touched,
        validators,
      };

      const scoped = createScopedForm<TValues, P>(ctx, prefix as unknown as P) as Form<ScopedValues<TValues, P>>;

      scopeCache.set(key, scoped as Form<never>);

      return scoped;
    },
    set,
    setError,
    setValidator,
    snapshot,
    get state() {
      return getStateSnapshot();
    },
    submit,
    subscribe,
    subscribeField,
    // On a root form, subscribeScoped behaves identically to subscribe — no prefix filtering.
    subscribeScoped: subscribe,
    [Symbol.asyncIterator]: createAsyncIterator,
    touch,
    touchAll,
    untouch,
    untouchAll,
    validate,
    validateField,
    validateFields,
    validateStream,
    values,
  };

  return publicForm;
}
