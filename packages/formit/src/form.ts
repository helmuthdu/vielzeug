import {
  type ArrayField,
  type BindConfig,
  type BindResult,
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
  type ValidationMode,
} from './types';
import { flattenValues, unflattenValues } from './utils';

const MODE_BIND_DEFAULTS: Record<ValidationMode, BindConfig> = {
  onBlur: { touchOnBlur: true, validateOnBlur: true },
  onChange: { touchOnBlur: true, validateOnChange: true },
  onSubmit: { touchOnBlur: true },
  onTouched: { touchOnBlur: true, validateOnBlur: true, validateOnTouch: true },
};

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
    validators.set(name, validator as FieldValidator<unknown>);
  }

  const formValidator: FormValidator<TValues> | undefined = init.validator;
  const mode: ValidationMode = init.mode ?? 'onSubmit';
  const bindDefaults: BindConfig = init.bindDefaults ?? MODE_BIND_DEFAULTS[mode];

  const baseline = new Map<string, unknown>(Object.entries(flattenValues(init.defaultValues ?? {})));
  const store = new Map<string, unknown>(baseline);
  const fieldErrors = new Map<string, string>();
  const touched = new Set<string>();
  const dirty = new Set<string>();

  let validatingCount = 0;
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

  const listeners = new Set<LocalListener>();
  const fieldListeners = new Map<string, Set<AnyFieldListener>>();
  const pendingFields = new Set<string>();
  let pendingFullNotify = false;
  let pendingStateNotify = false;

  function ensureNotDisposed(): void {
    if (disposed) throw new Error('Cannot modify a disposed form');
  }

  function allKnownFields(): string[] {
    return [...new Set([...store.keys(), ...validators.keys()])];
  }

  function computeState(): FormState {
    return Object.freeze({
      errors: Object.freeze(Object.fromEntries(fieldErrors)),
      isDirty: dirty.size > 0,
      isSubmitting,
      isTouched: touched.size > 0,
      isValid: fieldErrors.size === 0,
      isValidating: validatingCount > 0,
      submitCount,
    }) as unknown as FormState;
  }

  function getStateSnapshot(): FormState {
    return (cachedState ??= computeState());
  }

  function invalidateState(): void {
    cachedState = null;
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
    if (!pendingStateNotify && !pendingFullNotify && pendingFields.size === 0) return;

    if (listeners.size > 0) {
      const state = getStateSnapshot();

      for (const listener of listeners) listener(state);
    }

    if (pendingFullNotify) {
      for (const name of fieldListeners.keys()) notifyField(name);
    } else {
      for (const name of pendingFields) notifyField(name);
    }

    pendingFields.clear();
    pendingFullNotify = false;
    pendingStateNotify = false;
  }

  function requestNotify(field?: string): void {
    invalidateState();

    if (field === undefined) {
      pendingFullNotify = true;
      fieldStateCache.clear();
    } else {
      pendingFields.add(field);
      fieldStateCache.delete(field);
    }

    if (batchDepth === 0) flushNotifications();
  }

  function requestStateNotify(): void {
    invalidateState();
    pendingStateNotify = true;

    if (batchDepth === 0) flushNotifications();
  }

  function requestNotifyFields(fields: Iterable<string>): void {
    let changed = false;

    for (const field of fields) {
      pendingFields.add(field);
      fieldStateCache.delete(field);
      changed = true;
    }

    if (!changed) return;

    invalidateState();

    if (batchDepth === 0) flushNotifications();
  }

  function batch(fn: () => void): void {
    ensureNotDisposed();
    batchDepth++;

    try {
      fn();
    } finally {
      batchDepth--;

      if (batchDepth === 0) flushNotifications();
    }
  }

  function get<K extends FlatKeyOf<TValues>>(name: K): TypeAtPath<TValues, K> {
    return store.get(name as string) as TypeAtPath<TValues, K>;
  }

  function values(): TValues {
    return unflattenValues(Object.fromEntries(store)) as TValues;
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
    fieldErrors.set(name as string, message);
    requestNotify(name as string);
  }

  function clearError(name: ErrorKeyOf<TValues>): void {
    ensureNotDisposed();
    fieldErrors.delete(name as string);
    requestNotify(name as string);
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

    fieldCtrls.get(key)?.abort();
    fieldCtrls.delete(key);

    if (validator) validators.set(key, validator);
    else validators.delete(key);
  }

  function touch(name: FlatKeyOf<TValues>): void {
    ensureNotDisposed();
    touched.add(name as string);
    requestNotify(name as string);
  }

  function untouch(name: FlatKeyOf<TValues>): void {
    ensureNotDisposed();
    touched.delete(name as string);
    requestNotify(name as string);
  }

  function touchAll(): void {
    ensureNotDisposed();

    for (const name of allKnownFields()) touched.add(name);

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

    const runSignal = composeSignal(signal, disposeController.signal);

    validatingCount++;
    requestStateNotify();

    try {
      const results = await Promise.all(
        [...fieldSet].map(async (name) => {
          const fieldSignal =
            scope === 'partial' ? composeSignal(fieldRunCtrls.get(name)!.signal, runSignal) : runSignal;

          return [name, await runFieldValidator(name, fieldSignal)] as const;
        }),
      );

      const nextErrors: Record<string, string> = {};

      for (const [name, message] of results) {
        if (message !== undefined) nextErrors[name] = message;
      }

      if (scope === 'full') {
        const formErrors = await runFormValidator(runSignal);

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

      return { aborted: false, errors: Object.fromEntries(fieldErrors), valid: fieldErrors.size === 0 };
    } catch (error) {
      if (isAbortError(error) && (scope === 'partial' || runSignal.aborted)) {
        return { aborted: true, errors: Object.fromEntries(fieldErrors), valid: fieldErrors.size === 0 };
      }

      throw error;
    } finally {
      validatingCount--;
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

    if (isSubmitting) return { ok: false, type: 'concurrent' };

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

  function bind<K extends FlatKeyOf<TValues>>(name: K, config?: BindConfig): BindResult<TypeAtPath<TValues, K>> {
    ensureNotDisposed();

    const key = name as string;
    const touchOnBlur = config?.touchOnBlur ?? bindDefaults.touchOnBlur ?? true;
    const validateOnBlur = config?.validateOnBlur ?? bindDefaults.validateOnBlur ?? false;
    const validateOnChange = config?.validateOnChange ?? bindDefaults.validateOnChange ?? false;
    const validateOnTouch = config?.validateOnTouch ?? bindDefaults.validateOnTouch ?? false;

    return {
      get dirty() {
        return dirty.has(key);
      },
      get error() {
        return fieldErrors.get(key);
      },
      onBlur: () => {
        if (touchOnBlur) touch(name);

        if (validateOnBlur) void validateField(name).catch(() => undefined);
      },
      onChange: (value: TypeAtPath<TValues, K>) => {
        set(name, value);

        const shouldValidate = validateOnChange || (validateOnTouch && touched.has(key));

        if (shouldValidate) void validateField(name).catch(() => undefined);
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
    pendingFields.clear();
    pendingFullNotify = false;
    pendingStateNotify = false;
    listeners.clear();
    fieldListeners.clear();
  }

  return {
    array,
    batch,
    bind,
    clearError,
    dispose,
    get disposed() {
      return disposed;
    },
    field,
    get,
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
  };
}
