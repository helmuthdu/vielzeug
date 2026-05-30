import { createArrayField } from './internal/array';
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
  type FormState,
  type FormValidator,
  type MaybePromise,
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

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError';
}

function composeSignal(...signals: Array<AbortSignal | undefined>): AbortSignal {
  const active = signals.filter((s): s is AbortSignal => s !== undefined);

  if (active.length === 1) return active[0];

  return AbortSignal.any(active);
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
  let cachedState: FormState | null = null;
  let cachedErrors: Readonly<Record<string, string>> | null = null;
  const fieldStateCache = new Map<string, FieldState<unknown>>();
  const arrayCache = new Map<string, ArrayField>();

  /* ---- Submission state ---- */

  let isSubmitting = false;
  let submitCount = 0;

  /* ---- Lifecycle ---- */

  let disposed = false;

  /* ---- Notifications ---- */

  type LocalListener = (state: FormState) => void;
  type AnyFieldListener = (payload: FieldState<unknown>) => void;

  const listeners = new Set<LocalListener>();
  const fieldListeners = new Map<string, Set<AnyFieldListener>>();

  let batchDepth = 0;
  let pendingAll = false;
  let pendingStateOnly = false;
  const pendingFields = new Set<string>();

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
        requestStateNotify();
      });
  }

  /* ======== Notification helpers ======== */

  function invalidateState(): void {
    cachedState = null;
  }

  function invalidateValues(): void {
    cachedValues = null;
  }

  function invalidateErrors(): void {
    cachedErrors = null;
    cachedState = null;
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

  function getStateSnapshot(): FormState {
    return (cachedState ??= computeState());
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

  function notifyField(name: string): void {
    const bucket = fieldListeners.get(name);

    if (!bucket?.size) return;

    const payload = getFieldSnapshot(name);

    for (const listener of bucket) listener(payload);
  }

  function flushNotifications(): void {
    if (!pendingAll && !pendingStateOnly && pendingFields.size === 0) return;

    if (listeners.size > 0) {
      const state = getStateSnapshot();

      for (const listener of listeners) listener(state);
    }

    if (pendingAll) {
      fieldStateCache.clear();

      for (const name of fieldListeners.keys()) notifyField(name);
    } else if (!pendingStateOnly) {
      for (const name of pendingFields) notifyField(name);
    }

    pendingAll = false;
    pendingStateOnly = false;
    pendingFields.clear();
  }

  /** Notify form listeners + all field listeners (full mutation). */
  function requestNotify(field?: string): void {
    invalidateState();
    invalidateValues();

    if (field === undefined) {
      pendingAll = true;
      pendingFields.clear();
      fieldStateCache.clear();
    } else {
      fieldStateCache.delete(field);

      if (!pendingAll) pendingFields.add(field);
    }

    if (batchDepth === 0) flushNotifications();
  }

  /** Notify form listeners only (isValidating / isSubmitting / isLoading changes). */
  function requestStateNotify(): void {
    invalidateState();

    if (!pendingAll) pendingStateOnly = true;

    if (batchDepth === 0) flushNotifications();
  }

  /** Notify form listeners + a specific set of field listeners (validation results). */
  function requestNotifyFields(fields: Iterable<string>): void {
    if (pendingAll) return;

    let hasAny = false;

    invalidateState();
    invalidateValues();

    for (const field of fields) {
      fieldStateCache.delete(field);
      pendingFields.add(field);
      hasAny = true;
    }

    if (hasAny && batchDepth === 0) flushNotifications();
  }

  /* ======== Lifecycle guards ======== */

  function ensureNotDisposed(): void {
    if (disposed) throw new Error('Cannot modify a disposed form');
  }

  /* ======== Batch ======== */

  function batch(fn: () => void): void {
    ensureNotDisposed();
    batchDepth++;

    try {
      fn();
    } finally {
      batchDepth--;

      // Always flush even when fn() throws: state may have been partially mutated
      // before the exception and subscribers should see the current (post-mutation) state.
      if (batchDepth === 0) flushNotifications();
    }
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

  function set<K extends FlatKeyOf<TValues>>(name: K, value: TypeAtPath<TValues, K>, options: SetOptions = {}): void {
    ensureNotDisposed();

    const key = name as string;

    if (!isSafeKey(key)) {
      throw new Error(`[forge] Unsafe key '${key}': segments __proto__, constructor, and prototype are reserved.`);
    }

    store.set(key, value);

    if (options.dirty ?? true) trackDirty(key, value);
    else dirty.delete(key);

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
    const runSignal = composeSignal(runCtrl.signal, signal, disposeController.signal);

    runCtrls.add(runCtrl);

    for (const name of fieldSet) {
      validatingFieldCounts.set(name, (validatingFieldCounts.get(name) ?? 0) + 1);
    }

    requestStateNotify();

    try {
      const results = await Promise.all(
        [...fieldSet].map(async (name) => {
          const fieldSignal =
            scope === 'partial' ? composeSignal(fieldRunCtrls.get(name)!.signal, runSignal) : runSignal;

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

      requestStateNotify();

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

      if (!disposed) requestStateNotify();
    }
  }

  /* ======== Subscriptions ======== */

  function subscribe(listener: LocalListener, options?: SubscribeOptions): Unsubscribe {
    if (disposed) return () => {};

    listeners.add(listener);

    if (options?.sync) listener(getStateSnapshot());

    return () => listeners.delete(listener);
  }

  function subscribeField<K extends FlatKeyOf<TValues>>(
    name: K,
    listener: (state: FieldState<TypeAtPath<TValues, K>>) => void,
    options?: SubscribeOptions,
  ): Unsubscribe {
    if (disposed) return () => {};

    const key = name as string;
    const bucket = fieldListeners.get(key) ?? new Set<AnyFieldListener>();

    fieldListeners.set(key, bucket);
    bucket.add(listener as AnyFieldListener);

    if (options?.sync) listener(getFieldSnapshot(key) as FieldState<TypeAtPath<TValues, K>>);

    return () => {
      bucket.delete(listener as AnyFieldListener);

      if (bucket.size === 0) fieldListeners.delete(key);
    };
  }

  /* ======== Connect (was: wire) ======== */

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
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    function scheduleValidation(): void {
      clearTimeout(debounceTimer);

      if (debounceMs > 0) {
        debounceTimer = setTimeout(() => {
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
      get error() {
        return fieldErrors.get(key);
      },
      onBlur: () => {
        if (touchOnBlur) touch(name);

        if (validateOnBlur) scheduleValidation();
      },
      onChange: (value: TypeAtPath<TValues, K>) => {
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

    const helpers = createArrayField(name, store, set);

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

    for (const ctrl of fieldCtrls.values()) ctrl.abort();

    fieldCtrls.clear();
    runCtrls.clear();
    arrayCache.clear();
    pendingAll = false;
    pendingStateOnly = false;
    pendingFields.clear();
    listeners.clear();
    fieldListeners.clear();
  }

  /* ======== Scoped sub-form ======== */

  function scope<P extends FlatKeyOf<TValues>>(prefix: P): Form<ScopedValues<TValues, P>> {
    const pfx = prefix as string;
    const pfxDot = `${pfx}.`;

    function pre(name: string): string {
      return `${pfx}.${name}`;
    }

    function isScopedKey(key: string): boolean {
      return key === pfx || key.startsWith(pfxDot);
    }

    function scopedValues(): ScopedValues<TValues, P> {
      const subStore: Record<string, unknown> = {};

      for (const [key, value] of store) {
        if (key.startsWith(pfxDot)) {
          subStore[key.slice(pfxDot.length)] = value;
        }
      }

      return unflattenValues(subStore) as ScopedValues<TValues, P>;
    }

    function scopedTouchAll(): void {
      ensureNotDisposed();

      for (const name of store.keys()) {
        if (isScopedKey(name)) touched.add(name);
      }

      for (const name of validators.keys()) {
        if (isScopedKey(name)) touched.add(name);
      }

      requestNotify();
    }

    return {
      array(name) {
        return array(pre(name as string) as FlatKeyOf<TValues>);
      },
      batch,
      clearError(name) {
        return clearError(pre(name as string) as ErrorKeyOf<TValues>);
      },
      connect(name, config?) {
        return connect(pre(name as string) as FlatKeyOf<TValues>, config) as ConnectionResult<
          TypeAtPath<ScopedValues<TValues, P>, typeof name>
        >;
      },
      dispose() {
        // Scoped forms share lifecycle with the parent form.
        // Call parentForm.dispose() to tear down the whole form.
      },
      get disposed() {
        return disposed;
      },
      field(name) {
        return field(pre(name as string) as FlatKeyOf<TValues>) as FieldState<
          TypeAtPath<ScopedValues<TValues, P>, typeof name>
        >;
      },
      get(name) {
        return get(pre(name as string) as FlatKeyOf<TValues>) as TypeAtPath<ScopedValues<TValues, P>, typeof name>;
      },
      get isLoading() {
        return loadingState;
      },
      patch(partial) {
        ensureNotDisposed();

        const flat = flattenValues(partial as Record<string, unknown>);

        batch(() => {
          for (const [key, value] of Object.entries(flat)) {
            const fullKey = pre(key);

            baseline.set(fullKey, value);
            store.set(fullKey, value);
            dirty.delete(fullKey);
            requestNotify(fullKey);
          }
        });
      },
      removeField(name) {
        return removeField(pre(name as string) as FlatKeyOf<TValues>);
      },
      replace(newValues) {
        ensureNotDisposed();

        for (const key of [...fieldCtrls.keys()]) {
          if (isScopedKey(key)) {
            fieldCtrls.get(key)?.abort();
            fieldCtrls.delete(key);
          }
        }

        const flat = flattenValues(newValues as Record<string, unknown>);

        for (const key of [...store.keys()]) {
          if (isScopedKey(key)) {
            store.delete(key);
            baseline.delete(key);
            dirty.delete(key);
            touched.delete(key);
            fieldErrors.delete(key);
          }
        }

        invalidateErrors();

        for (const [key, value] of Object.entries(flat)) {
          const fullKey = pre(key);

          store.set(fullKey, value);
          baseline.set(fullKey, value);
        }

        requestNotify();
      },
      reset() {
        ensureNotDisposed();

        for (const key of [...store.keys()]) {
          if (isScopedKey(key)) {
            fieldCtrls.get(key)?.abort();
            fieldCtrls.delete(key);
            store.set(key, baseline.get(key));
            dirty.delete(key);
            touched.delete(key);

            if (fieldErrors.delete(key)) invalidateErrors();
          }
        }

        requestNotify();
      },
      resetErrors(nextErrors?) {
        ensureNotDisposed();

        for (const key of [...fieldErrors.keys()]) {
          if (isScopedKey(key)) fieldErrors.delete(key);
        }

        if (nextErrors) {
          for (const [key, message] of Object.entries(nextErrors)) {
            if (typeof message === 'string') fieldErrors.set(pre(key), message);
          }
        }

        invalidateErrors();
        requestNotify();
      },
      resetField(name) {
        return resetField(pre(name as string) as FlatKeyOf<TValues>);
      },
      scope(subPrefix) {
        return scope(pre(subPrefix as string) as FlatKeyOf<TValues>) as Form<
          ScopedValues<ScopedValues<TValues, P>, typeof subPrefix>
        >;
      },
      set(name, value, options?) {
        return set(
          pre(name as string) as FlatKeyOf<TValues>,
          value as TypeAtPath<TValues, FlatKeyOf<TValues>>,
          options,
        );
      },
      setError(name, message) {
        return setError(pre(name as string) as ErrorKeyOf<TValues>, message);
      },
      setValidator(name, validator?) {
        return setValidator(pre(name as string) as FlatKeyOf<TValues>, validator);
      },
      get state() {
        return getStateSnapshot();
      },
      async submit(handler) {
        ensureNotDisposed();

        if (isSubmitting) throw new Error('submit() called while a submission is already in progress');

        batch(() => {
          submitCount++;
          isSubmitting = true;
          scopedTouchAll();
        });

        try {
          const scopedFields = [...validators.keys()].filter(isScopedKey);

          await runValidationCore(scopedFields, 'partial');

          ensureNotDisposed();

          const unscopedErrors: Record<string, string> = {};

          for (const [key, message] of fieldErrors) {
            if (!isScopedKey(key)) continue;

            unscopedErrors[key.startsWith(pfxDot) ? key.slice(pfxDot.length) : key] = message;
          }

          if (Object.keys(unscopedErrors).length > 0) {
            return { errors: unscopedErrors, ok: false, type: 'validation' as const };
          }

          return { ok: true as const, value: await handler(scopedValues()) };
        } finally {
          isSubmitting = false;

          if (!disposed) requestStateNotify();
        }
      },
      subscribe(listener, options?) {
        return subscribe(listener, options);
      },
      subscribeField(name, listener, options?) {
        return subscribeField(pre(name as string) as FlatKeyOf<TValues>, listener as AnyFieldListener, options);
      },
      touch(name) {
        return touch(pre(name as string) as FlatKeyOf<TValues>);
      },
      touchAll: scopedTouchAll,
      untouch(name) {
        return untouch(pre(name as string) as FlatKeyOf<TValues>);
      },
      untouchAll() {
        ensureNotDisposed();

        for (const name of [...touched]) {
          if (isScopedKey(name)) touched.delete(name);
        }

        requestNotify();
      },
      async validate(signal?) {
        ensureNotDisposed();

        const scopedFields = [...validators.keys()].filter(isScopedKey);

        await runValidationCore(scopedFields, 'partial', signal);

        // Build the result from only the scoped portion of fieldErrors so that
        // pre-existing errors on sibling/parent fields do not leak in and the
        // `valid` flag accurately reflects only this scope's validity.
        const unscopedErrors: Record<string, string> = {};

        for (const [key, message] of fieldErrors) {
          if (!isScopedKey(key)) continue;

          const unscopedKey = key.startsWith(pfxDot) ? key.slice(pfxDot.length) : key;

          unscopedErrors[unscopedKey] = message;
        }

        return { errors: unscopedErrors, valid: Object.keys(unscopedErrors).length === 0 };
      },
      validateField(name, signal?) {
        return validateField(pre(name as string) as FlatKeyOf<TValues>, signal);
      },
      async validateFields(fields, signal?) {
        await validateFields(fields.map((f) => pre(f as string)) as FlatKeyOf<TValues>[], signal);

        const unscopedErrors: Record<string, string> = {};

        for (const [key, message] of fieldErrors) {
          if (!isScopedKey(key)) continue;

          unscopedErrors[key.startsWith(pfxDot) ? key.slice(pfxDot.length) : key] = message;
        }

        return { errors: unscopedErrors, valid: Object.keys(unscopedErrors).length === 0 };
      },
      values: scopedValues,
    };
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
    removeField,
    replace,
    reset,
    resetErrors,
    resetField,
    scope,
    set,
    setError,
    setValidator,
    get state() {
      return getStateSnapshot();
    },
    submit,
    subscribe,
    subscribeField,
    touch,
    touchAll,
    untouch,
    untouchAll,
    validate,
    validateField,
    validateFields,
    values,
  };
}
