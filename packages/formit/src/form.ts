import {
  type ArrayField,
  type DeepPartial,
  type WireConfig,
  type WireResult,
  type ErrorKeyOf,
  type FieldState,
  type FieldValidator,
  type FlatKeyOf,
  type Form,
  type FormOptions,
  type FormState,
  type FormValidator,
  type MaybePromise,
  type SetOptions,
  type SubmitResult,
  type SubscribeOptions,
  type TypeAtPath,
  type Unsubscribe,
  type ValidateResult,
} from './types';
import { flattenValues, isSafeKey, unflattenValues } from './utils';

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError';
}

function composeSignal(...signals: Array<AbortSignal | undefined>): AbortSignal {
  const active = signals.filter((signal): signal is AbortSignal => signal !== undefined);

  if (active.length === 1) return active[0];

  return AbortSignal.any(active);
}

export function createForm<TValues extends Record<string, unknown> = Record<string, unknown>>(
  init: FormOptions<TValues> = {},
): Form<TValues> {
  const validators = new Map<string, FieldValidator<unknown>>();

  for (const [name, validator] of Object.entries(init.validators ?? {})) {
    if (!isSafeKey(name)) {
      throw new Error(
        `[formit] Unsafe key '${name}' in validators: segments __proto__, constructor, and prototype are reserved.`,
      );
    }

    validators.set(name, validator as FieldValidator<unknown>);
  }

  const formValidator: FormValidator<TValues> | undefined = init.validator;
  const wireDefaults: WireConfig = init.validate ?? {};

  const baseline = new Map<string, unknown>(Object.entries(flattenValues(init.defaultValues ?? {})));
  const store = new Map<string, unknown>(baseline);
  const fieldErrors = new Map<string, string>();
  const touched = new Set<string>();
  const dirty = new Set<string>();

  const validatingFieldCounts = new Map<string, number>();
  const runCtrls = new Set<AbortController>();
  let cachedValues: TValues | null = null;
  let isSubmitting = false;
  let submitCount = 0;
  let disposed = false;
  let batchDepth = 0;
  let cachedState: FormState | null = null;
  const fieldStateCache = new Map<string, FieldState<unknown>>();

  const disposeController = new AbortController();
  const fieldCtrls = new Map<string, AbortController>();

  type LocalListener = (state: FormState) => void;
  type AnyFieldListener = (payload: FieldState<unknown>) => void;
  type PendingScope = 'all' | 'none' | 'state' | Set<string>;

  const listeners = new Set<LocalListener>();
  const fieldListeners = new Map<string, Set<AnyFieldListener>>();
  let pending: PendingScope = 'none';

  function ensureNotDisposed(): void {
    if (disposed) throw new Error('Cannot modify a disposed form');
  }

  function computeState(): FormState {
    return Object.freeze({
      errors: Object.freeze(Object.fromEntries(fieldErrors)),
      isDirty: dirty.size > 0,
      isSubmitting,
      isTouched: touched.size > 0,
      isValid: fieldErrors.size === 0,
      isValidating: validatingFieldCounts.size > 0,
      submitCount,
      validatingFields: Object.freeze([...validatingFieldCounts.keys()]) as readonly string[],
    }) as unknown as FormState;
  }

  function getStateSnapshot(): FormState {
    return (cachedState ??= computeState());
  }

  function invalidateState(): void {
    cachedState = null;
    cachedValues = null;
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
    if (pending === 'none') return;

    if (listeners.size > 0) {
      const state = getStateSnapshot();

      for (const listener of listeners) listener(state);
    }

    if (pending === 'all') {
      for (const name of fieldListeners.keys()) notifyField(name);
    } else if (pending instanceof Set) {
      for (const name of pending) notifyField(name);
    }

    pending = 'none';
  }

  function requestNotify(field?: string): void {
    invalidateState();

    if (field === undefined) {
      pending = 'all';
      fieldStateCache.clear();
    } else {
      fieldStateCache.delete(field);

      if (pending === 'none' || pending === 'state') {
        pending = new Set([field]);
      } else if (pending instanceof Set) {
        pending.add(field);
      }
      // pending === 'all': already covers everything
    }

    if (batchDepth === 0) flushNotifications();
  }

  function requestStateNotify(): void {
    invalidateState();

    if (pending === 'none') pending = 'state';

    if (batchDepth === 0) flushNotifications();
  }

  function requestNotifyFields(fields: Iterable<string>): void {
    if (pending === 'all') return;

    const arr = [...fields];

    if (arr.length === 0) return;

    invalidateState();

    for (const field of arr) fieldStateCache.delete(field);

    if (pending === 'none' || pending === 'state') {
      pending = new Set(arr);
    } else if (pending instanceof Set) {
      for (const field of arr) pending.add(field);
    }

    if (batchDepth === 0) flushNotifications();
  }

  function batch(fn: () => void): void {
    ensureNotDisposed();
    batchDepth++;

    let threw = false;

    try {
      fn();
    } catch (e) {
      threw = true;
      throw e;
    } finally {
      batchDepth--;

      if (batchDepth === 0 && !threw) flushNotifications();
    }
  }

  function get<K extends FlatKeyOf<TValues>>(name: K): TypeAtPath<TValues, K> {
    return store.get(name as string) as TypeAtPath<TValues, K>;
  }

  function values(): TValues {
    return (cachedValues ??= unflattenValues(Object.fromEntries(store)) as TValues);
  }

  function trackDirty(name: string, value: unknown): void {
    const baselineValue = baseline.get(name);
    const equal =
      baselineValue instanceof Date && value instanceof Date
        ? baselineValue.getTime() === value.getTime()
        : baselineValue instanceof File && value instanceof File
          ? baselineValue.name === value.name && baselineValue.size === value.size
          : baselineValue instanceof Blob && value instanceof Blob
            ? baselineValue.size === value.size
            : baselineValue === value;

    if (equal) dirty.delete(name);
    else dirty.add(name);
  }

  function set<K extends FlatKeyOf<TValues>>(name: K, value: TypeAtPath<TValues, K>, options: SetOptions = {}): void {
    ensureNotDisposed();

    const key = name as string;

    if (!isSafeKey(key)) {
      throw new Error(`[formit] Unsafe key '${key}': segments __proto__, constructor, and prototype are reserved.`);
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
      throw new Error(`[formit] Unsafe key '${key}': segments __proto__, constructor, and prototype are reserved.`);
    }

    fieldErrors.set(key, message);
    requestNotify(key);
  }

  function clearError(name: ErrorKeyOf<TValues>): void {
    ensureNotDisposed();

    if (fieldErrors.delete(name as string)) requestNotify(name as string);
  }

  function resetErrors(nextErrors: Partial<Record<ErrorKeyOf<TValues>, string | undefined>> = {}): void {
    ensureNotDisposed();

    fieldErrors.clear();

    for (const [key, message] of Object.entries(nextErrors)) {
      if (typeof message === 'string') fieldErrors.set(key, message);
    }

    requestNotify();
  }

  function setValidator(name: FlatKeyOf<TValues>, validator?: FieldValidator<unknown>): void {
    ensureNotDisposed();

    const key = name as string;

    if (!isSafeKey(key)) {
      throw new Error(`[formit] Unsafe key '${key}': segments __proto__, constructor, and prototype are reserved.`);
    }

    if (import.meta.env.DEV && /\.\d+(\.|$)/.test(key) && !store.has(key)) {
      const displayKey = key.replace(/\p{C}/gu, '?').slice(0, 80);

      console.warn(
        `[formit] setValidator('${displayKey}'): path looks like an array item key. ` +
          `Array items are stored as whole arrays — register the validator on the parent key instead.`,
      );
    }

    fieldCtrls.get(key)?.abort();
    fieldCtrls.delete(key);

    if (validator) {
      validators.set(key, validator);
    } else {
      validators.delete(key);

      if (fieldErrors.delete(key)) requestNotify(key);
    }
  }

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

  function resolveTouchedValidatorFields(): string[] {
    return [...validators.keys()].filter((name) => touched.has(name));
  }

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

      // Guard against applying stale results if the run was aborted mid-flight (e.g. by reset/replace).
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

  async function validateAll(signal?: AbortSignal): Promise<ValidateResult> {
    ensureNotDisposed();

    const result = await runValidationCore([...validators.keys()], 'full', signal);

    return { errors: result.errors, valid: result.valid };
  }

  async function validateTouched(signal?: AbortSignal): Promise<ValidateResult> {
    ensureNotDisposed();

    const result = await runValidationCore(resolveTouchedValidatorFields(), 'partial', signal);

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
      isSubmitting = false;
      requestStateNotify();
    }
  }

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

  function wire<K extends FlatKeyOf<TValues>>(name: K, config?: WireConfig): WireResult<TypeAtPath<TValues, K>> {
    ensureNotDisposed();

    const key = name as string;
    const touchOnBlur = config?.touchOnBlur ?? wireDefaults.touchOnBlur ?? true;
    const validateOnBlur = config?.validateOnBlur ?? wireDefaults.validateOnBlur ?? false;
    const validateOnChange = config?.validateOnChange ?? wireDefaults.validateOnChange ?? false;
    const validateOnTouch = config?.validateOnTouch ?? wireDefaults.validateOnTouch ?? false;
    const debounceMs = config?.debounce ?? wireDefaults.debounce ?? 0;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    function scheduleValidation(): void {
      clearTimeout(debounceTimer);

      if (debounceMs > 0) {
        debounceTimer = setTimeout(() => {
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

  function array(name: FlatKeyOf<TValues>): ArrayField {
    ensureNotDisposed();

    const key = name as string;

    return {
      append(value: unknown): void {
        const current = store.get(key);

        set(name, (Array.isArray(current) ? [...current, value] : [value]) as TypeAtPath<TValues, typeof name>);
      },
      insert(index: number, value: unknown): void {
        const current = store.get(key);

        if (!Array.isArray(current)) return;

        const next = [...current];

        next.splice(index, 0, value);
        set(name, next as TypeAtPath<TValues, typeof name>);
      },
      move(from: number, to: number): void {
        const current = store.get(key);

        if (!Array.isArray(current)) return;

        const next = [...current];

        next.splice(to, 0, next.splice(from, 1)[0]);
        set(name, next as TypeAtPath<TValues, typeof name>);
      },
      prepend(value: unknown): void {
        const current = store.get(key);

        set(name, (Array.isArray(current) ? [value, ...current] : [value]) as TypeAtPath<TValues, typeof name>);
      },
      remove(index: number): void {
        const current = store.get(key);

        if (!Array.isArray(current)) return;

        set(name, current.filter((_, i) => i !== index) as TypeAtPath<TValues, typeof name>);
      },
      replace(index: number, value: unknown): void {
        const current = store.get(key);

        if (!Array.isArray(current)) return;

        const next = [...current];

        next[index] = value;
        set(name, next as TypeAtPath<TValues, typeof name>);
      },
      swap(a: number, b: number): void {
        const current = store.get(key);

        if (!Array.isArray(current)) return;

        const next = [...current];

        [next[a], next[b]] = [next[b], next[a]];
        set(name, next as TypeAtPath<TValues, typeof name>);
      },
    };
  }

  function resetField(name: FlatKeyOf<TValues>): void {
    ensureNotDisposed();

    const key = name as string;

    fieldCtrls.get(key)?.abort();
    fieldCtrls.delete(key);

    store.set(key, baseline.get(key));
    dirty.delete(key);
    touched.delete(key);
    fieldErrors.delete(key);
    requestNotify(key);
  }

  function removeField(name: FlatKeyOf<TValues>): void {
    ensureNotDisposed();

    const key = name as string;

    store.delete(key);
    baseline.delete(key);
    dirty.delete(key);
    touched.delete(key);
    fieldErrors.delete(key);
    validators.delete(key);
    fieldCtrls.get(key)?.abort();
    fieldCtrls.delete(key);
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

    for (const [name, value] of Object.entries(flat)) {
      store.set(name, value);
      baseline.set(name, value);
    }

    requestNotify();
  }

  function dispose(): void {
    disposed = true;
    disposeController.abort();

    for (const ctrl of fieldCtrls.values()) ctrl.abort();

    fieldCtrls.clear();
    runCtrls.clear();
    pending = 'none';
    listeners.clear();
    fieldListeners.clear();
  }

  function patch(partial: DeepPartial<TValues>): void {
    ensureNotDisposed();

    const flat = flattenValues(partial as Record<string, unknown>);

    batch(() => {
      for (const [key, value] of Object.entries(flat)) {
        baseline.set(key, value);
        store.set(key, value);
        dirty.delete(key);
        requestNotify(key);
      }
    });
  }

  return {
    array,
    batch,
    clearError,
    dispose,
    get disposed() {
      return disposed;
    },
    field,
    get,
    patch,
    removeField,
    replace,
    reset,
    resetErrors,
    resetField,
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
    validateAll,
    validateField,
    validateFields,
    validateTouched,
    values,
    wire,
  };
}
