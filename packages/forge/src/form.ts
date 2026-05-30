import { type Debounced, anySignal, debounce, isAbortError } from '@vielzeug/arsenal';
import { batch as rippleBatch, signal, type Signal, watch } from '@vielzeug/ripple';

import { createArrayField } from './internal/array';
import { type ScopeContext, createScopedForm } from './internal/scope';
import {
  FORM_ERROR,
  type ArrayField,
  type ConnectOptions,
  type ConnectionResult,
  type ErrorKeyOf,
  type FieldState,
  type FieldValidator,
  type FlatKeyOf,
  type Form,
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
import { flattenValues, isSafeKey, unflattenValues } from './utils';

/* -------------------- Private helpers -------------------- */

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

  // Duck-type: object with a `safeParse` method -> wrap as a FormValidator
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

export function createForm<TValues extends Record<string, unknown> = Record<string, unknown>>(
  init: FormOptions<TValues> = {},
): Form<TValues> {
  /* ---- Validators ---- */

  const validators = new Map<string, FieldValidator<unknown>>();

  for (const [name, validator] of Object.entries(init.validators ?? {})) {
    if (!isSafeKey(name)) {
      throw new Error(
        `[forge] Unsafe key '${name}' in validators: segments __proto__, constructor, and prototype are reserved.`,
      );
    }

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

  const validatingFieldCounts = new Map<string, number>();
  const runCtrls = new Set<AbortController>();
  const fieldCtrls = new Map<string, AbortController>();
  const disposeController = new AbortController();

  /* ---- Caches ---- */

  let cachedValues: TValues | null = null;
  let cachedErrors: Readonly<Record<string, string>> | null = null;
  const fieldStateCache = new Map<string, FieldState<unknown>>();
  const arrayCache = new Map<string, ArrayField>();

  /* ---- Debounced validators (one per field, lazily created) ---- */
  const debouncedValidators = new Map<string, Debounced<() => void>>();

  /* ---- Submission state ---- */

  let isSubmitting = false;
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
      isSubmitting,
      isTouched: touched.size > 0,
      isValid: fieldErrors.size === 0,
      isValidating: validatingFieldCounts.size > 0,
      submitCount,
      touchedFields: Object.freeze([...touched]) as readonly string[],
      validatingFields: Object.freeze([...validatingFieldCounts.keys()]) as readonly string[],
    }) as unknown as FormState;
  }

  /* Initialised here; computeState() and buildFieldState() are function declarations, so they are hoisted. */
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

    const snapshot = Object.freeze(buildFieldState(name)) as unknown as FieldState<unknown>;

    fieldStateCache.set(name, snapshot);

    return snapshot;
  }

  /**
   * F2: Notify field listeners only when the field state has actually changed.
   * Shallow-compares all four FieldState properties to skip spurious notifications
   * that arise when only form-level state (isValidating, isSubmitting) changed but
   * individual field values/errors/touched/dirty did not.
   */
  /**
   * Push form-level and optionally field-level updates into the ripple signal graph.
   * `rippleBatch` deduplicates signal writes within the synchronous call stack when
   * `batch()` is active; outside a batch it flushes watchers immediately.
   */
  function requestNotify(field?: string): void {
    if (disposed) return;

    invalidateValues();
    cachedErrors = null;

    if (field === undefined) {
      fieldStateCache.clear();
      rippleBatch(() => {
        formStateSignal.value = computeState();

        for (const [name, sig] of fieldSignals) {
          sig.value = buildFieldState(name);
        }
      });
    } else {
      fieldStateCache.delete(field);
      rippleBatch(() => {
        formStateSignal.value = computeState();

        const sig = fieldSignals.get(field);

        if (sig) sig.value = buildFieldState(field);
      });
    }
  }

  /** Notify form listeners + a specific set of field listeners (partial validation results). */
  function requestNotifyFields(fields: Iterable<string>): void {
    if (disposed) return;

    invalidateValues();
    cachedErrors = null;

    rippleBatch(() => {
      formStateSignal.value = computeState();

      for (const field of fields) {
        fieldStateCache.delete(field);

        const sig = fieldSignals.get(field);

        if (sig) sig.value = buildFieldState(field);
      }
    });
  }

  /* ======== Lifecycle guards ======== */

  function ensureNotDisposed(): void {
    if (disposed) throw new Error('Cannot modify a disposed form');
  }

  /* ======== Batch ======== */

  function batch(fn: () => void): void {
    ensureNotDisposed();
    // Always flush even when fn() throws: state may have been partially mutated
    // before the exception and subscribers should see the current (post-mutation) state.
    rippleBatch(fn);
  }

  /* ======== Value access ======== */

  function get<K extends FlatKeyOf<TValues>>(name: K): TypeAtPath<TValues, K> {
    return store.get(name as string) as TypeAtPath<TValues, K>;
  }

  function values(): TValues {
    return (cachedValues ??= unflattenValues(Object.fromEntries(store)) as TValues);
  }

  /* ======== Dirty tracking — reference equality for all types ======== */

  function trackDirty(name: string, value: unknown): void {
    if (baseline.get(name) === value) dirty.delete(name);
    else dirty.add(name);
  }

  /* ======== Field mutation ======== */

  // R7: SetOptions.dirty removed — set() always tracks dirty via reference equality.
  function set<K extends FlatKeyOf<TValues>>(name: K, value: TypeAtPath<TValues, K>, options: SetOptions = {}): void {
    ensureNotDisposed();

    const key = name as string;

    if (!isSafeKey(key)) {
      throw new Error(`[forge] Unsafe key '${key}': segments __proto__, constructor, and prototype are reserved.`);
    }

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

    if (!isSafeKey(key)) {
      throw new Error(`[forge] Unsafe key '${key}': segments __proto__, constructor, and prototype are reserved.`);
    }

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

    if (!isSafeKey(key)) {
      throw new Error(`[forge] Unsafe key '${key}': segments __proto__, constructor, and prototype are reserved.`);
    }

    if (import.meta.env.DEV && /\.\d+(\.|$)/.test(key) && !store.has(key)) {
      const displayKey = key.replace(/\p{C}/gu, '?').slice(0, 80);

      console.warn(
        `[forge] setValidator('${displayKey}'): path looks like an array item key. ` +
          `Array items are stored as whole arrays - register the validator on the parent key instead.`,
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

  /* ======== F1: Dynamic field registration ======== */

  function registerField<K extends FlatKeyOf<TValues>>(
    name: K,
    options: RegisterFieldOptions<TypeAtPath<TValues, K>> = {},
  ): Unsubscribe {
    ensureNotDisposed();

    const key = name as string;

    if (!isSafeKey(key)) {
      throw new Error(`[forge] Unsafe key '${key}': segments __proto__, constructor, and prototype are reserved.`);
    }

    if (options.validator !== undefined) {
      setValidator(name, options.validator as FieldValidator<unknown>);
    }

    // Only set default value if the field doesn't exist yet.
    // Write to both store and baseline so the field starts clean (not dirty).
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

      requestNotifyFields(changedFields);
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

    for (const name of fieldSet) {
      validatingFieldCounts.set(name, (validatingFieldCounts.get(name) ?? 0) + 1);
    }

    // R5: requestNotify() replaces requestStateNotify(). F2 shallow equality gating ensures
    // field listeners only fire when their FieldState actually changed, not just because
    // isValidating toggled on the parent FormState.
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
      if (isAbortError(error) && (scope === 'partial' || runSignal.aborted)) {
        return { aborted: true, errors: Object.fromEntries(fieldErrors), valid: fieldErrors.size === 0 };
      }

      throw error;
    } finally {
      runCtrls.delete(runCtrl);

      for (const name of fieldSet) {
        const n = validatingFieldCounts.get(name) ?? 0;

        if (n <= 1) validatingFieldCounts.delete(name);
        else validatingFieldCounts.set(name, n - 1);
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

    if (isSubmitting) throw new Error('submit() called while a submission is already in progress');

    batch(() => {
      submitCount++;
      isSubmitting = true;
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
      // Always reset isSubmitting even if the form was disposed mid-flight;
      // otherwise state.isSubmitting stays true forever in any captured snapshot.
      isSubmitting = false;

      if (!disposed) requestNotify();
    }
  }

  /* ======== Subscriptions ======== */

  function subscribe(listener: (state: FormState) => void, options?: SubscribeOptions): Unsubscribe {
    if (disposed) return () => {};

    const sub = watch(formStateSignal, listener);

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
    const sub = watch(sig, listener as (state: FieldState<unknown>) => void);

    rippleSubs.add(sub);

    if (options?.sync) listener(sig.value as FieldState<TypeAtPath<TValues, K>>);

    return () => {
      sub.dispose();
      rippleSubs.delete(sub);
    };
  }

  /* ======== Connect ======== */

  function connect<K extends FlatKeyOf<TValues>>(
    name: K,
    config?: ConnectOptions,
  ): ConnectionResult<TypeAtPath<TValues, K>> {
    ensureNotDisposed();

    const key = name as string;
    const touchOnBlur = config?.touchOnBlur ?? connectDefaults.touchOnBlur ?? true;
    const validateOnBlur = config?.validateOnBlur ?? connectDefaults.validateOnBlur ?? false;
    const validateOnChange = config?.validateOnChange ?? connectDefaults.validateOnChange ?? false;
    const validateOnTouch = config?.validateOnTouch ?? connectDefaults.validateOnTouch ?? false;
    const debounceMs = config?.debounce ?? connectDefaults.debounce ?? 0;

    // Use arsenal.debounce so dispose()/reset()/resetField() can cancel pending
    // validation via .cancel() without manual timer bookkeeping.
    function scheduleValidation(): void {
      if (debounceMs > 0) {
        let fn = debouncedValidators.get(key);

        if (!fn) {
          fn = debounce(() => {
            if (disposed) return;

            void validateField(name).catch((err) => {
              if (!isAbortError(err)) throw err;
            });
          }, debounceMs);

          debouncedValidators.set(key, fn);
        }

        fn();
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
      /** R6: cancel any pending debounce timer for this field binding on unmount. */
      disconnect() {
        debouncedValidators.get(key)?.cancel();
      },
      get error() {
        return fieldErrors.get(key);
      },
      // R1: silent no-op after dispose instead of throwing
      onBlur: () => {
        if (disposed) return;

        if (touchOnBlur) touch(name);

        if (validateOnBlur) scheduleValidation();
      },
      // R1: silent no-op after dispose instead of throwing
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

    // cancel any pending debounced validation for this field
    debouncedValidators.get(key)?.cancel();
    debouncedValidators.delete(key);

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

    // cancel any pending debounced validation for this field
    debouncedValidators.get(key)?.cancel();
    debouncedValidators.delete(key);

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

    // cancel all pending debounced validations
    for (const fn of debouncedValidators.values()) fn.cancel();
    debouncedValidators.clear();

    for (const ctrl of runCtrls) ctrl.abort();
    for (const ctrl of fieldCtrls.values()) ctrl.abort();

    fieldCtrls.clear();
    store.clear();
    fieldErrors.clear();
    touched.clear();
    dirty.clear();
    invalidateErrors();

    for (const [name, value] of baseline) store.set(name, value);

    requestNotify();
  }

  function replace(newValues: TValues): void {
    ensureNotDisposed();

    // cancel all pending debounced validations
    for (const fn of debouncedValidators.values()) fn.cancel();
    debouncedValidators.clear();

    for (const ctrl of runCtrls) ctrl.abort();
    for (const ctrl of fieldCtrls.values()) ctrl.abort();

    fieldCtrls.clear();

    const flat = flattenValues(newValues as Record<string, unknown>);

    store.clear();
    baseline.clear();
    fieldErrors.clear();
    touched.clear();
    dirty.clear();
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

    batch(() => {
      for (const [key, value] of Object.entries(flat)) {
        baseline.set(key, value);
        store.set(key, value);
        dirty.delete(key);
        requestNotify(key);
      }
    });
  }

  function dispose(): void {
    disposed = true;
    disposeController.abort();

    // cancel all pending debounced validations
    for (const fn of debouncedValidators.values()) fn.cancel();
    debouncedValidators.clear();

    for (const ctrl of fieldCtrls.values()) ctrl.abort();

    fieldCtrls.clear();
    runCtrls.clear();
    arrayCache.clear();

    for (const sub of rippleSubs) sub.dispose();

    rippleSubs.clear();
    fieldSignals.clear();
  }

  /* ======== F5: Snapshot / Restore ======== */

  function snapshot(): FormSnapshot<TValues> {
    ensureNotDisposed();

    return {
      baseline: Object.fromEntries(baseline),
      dirty: [...dirty],
      errors: Object.fromEntries(fieldErrors),
      store: Object.fromEntries(store),
      submitCount,
      touched: [...touched],
    };
  }

  function restore(snap: FormSnapshot<TValues>): void {
    ensureNotDisposed();

    // cancel all in-flight validation
    for (const fn of debouncedValidators.values()) fn.cancel();
    debouncedValidators.clear();
    for (const ctrl of runCtrls) ctrl.abort();
    for (const ctrl of fieldCtrls.values()) ctrl.abort();
    fieldCtrls.clear();

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

  /* ======== F4: validateStream ======== */

  function validateStream(signal?: AbortSignal): AsyncIterableIterator<{ error: string | undefined; field: string }> {
    ensureNotDisposed();

    const fields = [...validators.keys()];
    const ctrl = new AbortController();
    const combined = signal
      ? anySignal(ctrl.signal, signal, disposeController.signal)!
      : anySignal(ctrl.signal, disposeController.signal)!;

    let done = false;

    type Resolver = (result: IteratorResult<{ error: string | undefined; field: string }, undefined>) => void;

    const queue: Array<{ error: string | undefined; field: string }> = [];
    let waitingResolve: Resolver | null = null;

    function enqueue(item: { error: string | undefined; field: string }): void {
      if (waitingResolve) {
        const resolve = waitingResolve;

        waitingResolve = null;
        resolve({ done: false, value: item });
      } else {
        queue.push(item);
      }
    }

    function finish(): void {
      if (done) return;

      done = true;
      ctrl.abort();

      if (waitingResolve) {
        const resolve = waitingResolve;

        waitingResolve = null;
        resolve({ done: true, value: undefined });
      }
    }

    // run validators in parallel, streaming results as each settles
    Promise.all(
      fields.map(async (field) => {
        if (combined.aborted) return;

        try {
          const error = await validateField(field as FlatKeyOf<TValues>, combined);

          if (!combined.aborted) enqueue({ error, field });
        } catch {
          // aborted or disposed — stop streaming
        }
      }),
    ).finally(() => finish());

    return {
      next(): Promise<IteratorResult<{ error: string | undefined; field: string }, undefined>> {
        if (queue.length > 0) return Promise.resolve({ done: false, value: queue.shift()! });

        if (done) return Promise.resolve({ done: true, value: undefined });

        return new Promise<IteratorResult<{ error: string | undefined; field: string }, undefined>>((resolve) => {
          waitingResolve = resolve;
        });
      },

      return(): Promise<IteratorResult<{ error: string | undefined; field: string }, undefined>> {
        finish();

        return Promise.resolve({ done: true, value: undefined });
      },

      [Symbol.asyncIterator]() {
        return this;
      },
    };
  }

  /* ======== F4: Async iterator ======== */

  function createAsyncIterator(): AsyncIterableIterator<FormState> {
    type Resolver = (result: IteratorResult<FormState, undefined>) => void;

    let pending: FormState[] = [getStateSnapshot()]; // yield the current state first
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

    // Terminate any pending `for await` loop when the form is disposed.
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
        if (pending.length > 0) {
          return Promise.resolve({ done: false, value: pending.shift()! });
        }

        if (done) {
          return Promise.resolve({ done: true, value: undefined });
        }

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

  /* ======== R1: Scoped sub-form ======== */

  function scope<P extends FlatKeyOf<TValues>>(prefix: P): Form<ScopedValues<TValues, P>> {
    // Build the ScopeContext, capturing this closure's mutable scalars via getter/setters.
    // Maps and Sets are shared by reference — mutations are visible to both root and scope.
    const ctx: ScopeContext = {
      array: (name) => array(name as FlatKeyOf<TValues>),
      asyncIterator: createAsyncIterator,
      baseline,
      batch,
      clearError: (name) => clearError(name as ErrorKeyOf<TValues>),
      connect: (name, config) => connect(name as FlatKeyOf<TValues>, config) as ConnectionResult<unknown>,
      dirty,

      ensureNotDisposed,
      field: (name) => getFieldSnapshot(name) as FieldState<unknown>,
      fieldCtrls,
      fieldErrors,
      getStateSnapshot,

      incrementSubmitCount: () => {
        submitCount++;
      },
      invalidateErrors,
      isDisposed: () => disposed,
      isLoading: () => loadingState,
      isSubmitting: () => isSubmitting,
      registerField: (name, options) =>
        registerField(
          name as FlatKeyOf<TValues>,
          options as RegisterFieldOptions<TypeAtPath<TValues, FlatKeyOf<TValues>>>,
        ),

      removeField: (name) => removeField(name as FlatKeyOf<TValues>),
      requestNotify,
      resetField: (name) => resetField(name as FlatKeyOf<TValues>),
      restore,
      runValidationCore,
      set: (name, value, options) =>
        set(name as FlatKeyOf<TValues>, value as TypeAtPath<TValues, FlatKeyOf<TValues>>, options),
      setError: (name, message) => setError(name as ErrorKeyOf<TValues>, message),
      setSubmitting: (v) => {
        isSubmitting = v;
      },
      setValidator: (name, v) => setValidator(name as FlatKeyOf<TValues>, v),
      snapshot,
      store,
      subscribe,
      subscribeField: (name, listener, options) =>
        subscribeField(
          name as FlatKeyOf<TValues>,
          listener as (state: FieldState<TypeAtPath<TValues, FlatKeyOf<TValues>>>) => void,
          options,
        ),

      touch: (name) => touch(name as FlatKeyOf<TValues>),

      touched,
      untouch: (name) => untouch(name as FlatKeyOf<TValues>),

      validateField: (name, signal) => validateField(name as FlatKeyOf<TValues>, signal),
      validateFields: (names, signal) => validateFields(names as FlatKeyOf<TValues>[], signal),
      validateStream,
      validators,
    };

    return createScopedForm<TValues, P>(ctx, prefix as unknown as P) as Form<ScopedValues<TValues, P>>;
  }

  /* ======== Public form object ======== */

  return {
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
    patch: patch as Form<TValues>['patch'],
    registerField,
    removeField,
    replace,
    reset,
    resetErrors,
    resetField,
    restore,
    scope,
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
}
