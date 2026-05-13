import {
  type ArrayField,
  type BindConfig,
  type BindResult,
  type FieldState,
  type FieldValidator,
  type FlatKeyOf,
  type Form,
  type ErrorKeyOf,
  FormValidationError,
  type FormOptions,
  type FormState,
  type FormValidator,
  type MaybePromise,
  type SetOptions,
  type SubscribeOptions,
  SubmitError,
  type TypeAtPath,
  type Unsubscribe,
  type ValidateResult,
  type ValidationMode,
} from './types';
import { flattenValues, unflattenValues } from './utils';

const MODE_BIND_DEFAULTS: Record<ValidationMode, BindConfig> = {
  onBlur: { touchOnBlur: true, validateOnBlur: true, validateOnChange: false, validateOnChangeAfterTouch: false },
  onChange: {
    touchOnBlur: true,
    validateOnBlur: false,
    validateOnChange: true,
    validateOnChangeAfterTouch: false,
  },
  onSubmit: {
    touchOnBlur: true,
    validateOnBlur: false,
    validateOnChange: false,
    validateOnChangeAfterTouch: false,
  },
  onTouched: {
    touchOnBlur: true,
    validateOnBlur: true,
    validateOnChange: false,
    validateOnChangeAfterTouch: true,
  },
};

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError';
}

function composeSignal(...signals: Array<AbortSignal | undefined>): AbortSignal {
  const active = signals.filter((s): s is AbortSignal => s !== undefined);

  return active.length === 1 ? active[0] : AbortSignal.any(active);
}

export function createForm<TValues extends Record<string, unknown> = Record<string, unknown>>(
  init: FormOptions<TValues> = {},
): Form<TValues> {
  const validators: Record<string, FieldValidator<unknown>> = {};

  for (const [name, rule] of Object.entries(init.validators ?? {})) {
    validators[name] = rule as FieldValidator<unknown>;
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
  const disposeController = new AbortController();

  // Per-field abort controllers: only the specific field being validated is cancelled on re-run.
  const fieldCtrls = new Map<string, AbortController>();
  // Controller for full-form validation runs (validateAll / submit).
  let fullRunCtrl: AbortController | null = null;

  type LocalListener = (state: FormState) => void;
  type AnyFieldListener = (payload: FieldState<unknown>) => void;

  const listeners = new Set<LocalListener>();
  const fieldListeners = new Map<string, Set<AnyFieldListener>>();

  /** Synchronously notify all form listeners and relevant field listeners. */
  function notifyAll(field?: string): void {
    if (listeners.size > 0) {
      const state = buildState();

      for (const listener of listeners) listener(state);
    }

    if (field !== undefined) {
      notifyField(field);
    } else {
      for (const name of fieldListeners.keys()) notifyField(name);
    }
  }

  function buildState(): FormState {
    return {
      errors: Object.fromEntries(fieldErrors),
      isDirty: dirty.size > 0,
      isSubmitting,
      isTouched: touched.size > 0,
      isValid: fieldErrors.size === 0,
      isValidating: validatingCount > 0,
      submitCount,
    };
  }

  function allKnownFields(): string[] {
    return [...new Set([...store.keys(), ...Object.keys(validators)])];
  }

  function buildFieldState(name: string): FieldState<unknown> {
    return {
      dirty: dirty.has(name),
      error: fieldErrors.get(name),
      touched: touched.has(name),
      value: store.get(name),
    };
  }

  function notifyField(name: string): void {
    const bucket = fieldListeners.get(name);

    if (!bucket?.size) return;

    const payload = buildFieldState(name);

    for (const fn of bucket) fn(payload);
  }

  function get<K extends FlatKeyOf<TValues>>(name: K): TypeAtPath<TValues, K> {
    return store.get(name as string) as TypeAtPath<TValues, K>;
  }

  function values(): TValues {
    return unflattenValues(Object.fromEntries(store)) as TValues;
  }

  function trackDirty(name: string, value: unknown): void {
    const base = baseline.get(name);
    // Deep comparison only for Date/File/Blob; reference equality for everything else.
    const equal =
      base instanceof Date && value instanceof Date
        ? base.getTime() === value.getTime()
        : base instanceof File && value instanceof File
          ? base.name === value.name && base.size === value.size
          : base instanceof Blob && value instanceof Blob
            ? base.size === value.size
            : base === value;

    if (equal) dirty.delete(name);
    else dirty.add(name);
  }

  function set<K extends FlatKeyOf<TValues>>(name: K, value: TypeAtPath<TValues, K>, options: SetOptions = {}): void {
    ensureNotDisposed();

    const key = name as string;

    store.set(key, value);

    if (options.dirty ?? true) trackDirty(key, value);

    if (options.touched) touched.add(key);

    notifyAll(key);
  }

  function field<K extends FlatKeyOf<TValues>>(name: K): FieldState<TypeAtPath<TValues, K>> {
    return buildFieldState(name as string) as FieldState<TypeAtPath<TValues, K>>;
  }

  function setError(name: ErrorKeyOf<TValues>, message?: string): void {
    ensureNotDisposed();

    const key = name as string;

    if (typeof message === 'string') fieldErrors.set(key, message);
    else fieldErrors.delete(key);

    notifyAll(key);
  }

  function setErrors(nextErrors: Partial<Record<ErrorKeyOf<TValues>, string | undefined>>): void {
    ensureNotDisposed();
    fieldErrors.clear();

    for (const [k, v] of Object.entries(nextErrors)) {
      if (typeof v === 'string') fieldErrors.set(k, v);
    }

    notifyAll();
  }

  function touch(name: FlatKeyOf<TValues>): void {
    ensureNotDisposed();
    touched.add(name as string);
    notifyAll(name as string);
  }

  function untouch(name: FlatKeyOf<TValues>): void {
    ensureNotDisposed();
    touched.delete(name as string);
    notifyAll(name as string);
  }

  function touchAll(): void {
    ensureNotDisposed();
    for (const name of allKnownFields()) touched.add(name);
    notifyAll();
  }

  function untouchAll(): void {
    ensureNotDisposed();
    touched.clear();
    notifyAll();
  }

  function resolveTouchedValidatorFields(): string[] {
    return Object.keys(validators).filter((name) => touched.has(name));
  }

  async function runFormValidatorInternal(signal: AbortSignal): Promise<Record<string, string>> {
    if (!formValidator) return {};

    if (signal.aborted) throw signal.reason;

    const result = await formValidator(values(), signal);
    const out: Record<string, string> = {};

    if (result) {
      for (const [name, msg] of Object.entries(result)) {
        if (typeof msg === 'string') out[name] = msg;
      }
    }

    return out;
  }

  function buildScopedErrors(fieldSet: Set<string>): Record<string, string> {
    const out: Record<string, string> = {};

    for (const name of fieldSet) {
      const err = fieldErrors.get(name);

      if (err !== undefined) out[name] = err;
    }

    return out;
  }

  /**
   * Core validation runner. Does NOT touch `validatingCount` — callers that need
   * to reflect `isValidating` must increment/decrement around this call.
   *
   * `mode:'full'` cancels all ongoing validation and runs every field + form validator.
   * `mode:'partial'` only cancels and re-runs the specific fields provided.
   */
  async function runValidationCore(
    fields: string[],
    mode: 'full' | 'partial',
    externalSignal?: AbortSignal,
  ): Promise<ValidateResult> {
    const fieldSet = new Set(fields);
    const runFieldCtrls = new Map<string, AbortController>();
    let fullCtrl: AbortController | null = null;

    if (mode === 'full') {
      for (const ctrl of fieldCtrls.values()) ctrl.abort();
      fieldCtrls.clear();
      fullRunCtrl?.abort();
      fullCtrl = new AbortController();
      fullRunCtrl = fullCtrl;
    } else {
      for (const name of fieldSet) {
        fieldCtrls.get(name)?.abort();

        const ctrl = new AbortController();

        fieldCtrls.set(name, ctrl);
        runFieldCtrls.set(name, ctrl);
      }
    }

    const baseSignal = fullCtrl
      ? composeSignal(fullCtrl.signal, externalSignal, disposeController.signal)
      : composeSignal(externalSignal, disposeController.signal);

    try {
      const results = await Promise.all(
        [...fieldSet].map(async (name) => {
          const sig = mode === 'partial' ? composeSignal(runFieldCtrls.get(name)!.signal, baseSignal) : baseSignal;

          const validator = validators[name];

          if (!validator) return [name, undefined] as const;

          if (sig.aborted) throw sig.reason;

          const result = await validator(store.get(name), sig);

          return [name, typeof result === 'string' ? result : undefined] as const;
        }),
      );

      const nextErrors: Record<string, string> = {};

      for (const [name, msg] of results) {
        if (msg !== undefined) nextErrors[name] = msg;
      }

      if (mode === 'full') {
        Object.assign(nextErrors, await runFormValidatorInternal(baseSignal));
        fieldErrors.clear();
        for (const [k, v] of Object.entries(nextErrors)) fieldErrors.set(k, v);

        return { errors: Object.fromEntries(fieldErrors), valid: fieldErrors.size === 0 };
      }

      for (const name of fieldSet) {
        if (nextErrors[name] !== undefined) fieldErrors.set(name, nextErrors[name]);
        else fieldErrors.delete(name);
      }

      return { errors: buildScopedErrors(fieldSet), valid: fieldErrors.size === 0 };
    } catch (err) {
      if (isAbortError(err)) {
        return {
          errors: mode === 'full' ? Object.fromEntries(fieldErrors) : buildScopedErrors(fieldSet),
          valid: fieldErrors.size === 0,
        };
      }

      throw err;
    } finally {
      if (fullCtrl && fullRunCtrl === fullCtrl) fullRunCtrl = null;

      for (const [name, ctrl] of runFieldCtrls) {
        if (fieldCtrls.get(name) === ctrl) fieldCtrls.delete(name);
      }
    }
  }

  async function validateAll(signal?: AbortSignal): Promise<ValidateResult> {
    ensureNotDisposed();
    validatingCount++;
    notifyAll();

    try {
      return await runValidationCore(Object.keys(validators), 'full', signal);
    } finally {
      validatingCount--;
      notifyAll();
    }
  }

  async function validateTouched(signal?: AbortSignal): Promise<ValidateResult> {
    ensureNotDisposed();
    validatingCount++;
    notifyAll();

    try {
      return await runValidationCore(resolveTouchedValidatorFields(), 'partial', signal);
    } finally {
      validatingCount--;
      notifyAll();
    }
  }

  async function validateFields(fields: FlatKeyOf<TValues>[], signal?: AbortSignal): Promise<ValidateResult> {
    ensureNotDisposed();
    validatingCount++;
    notifyAll();

    try {
      return await runValidationCore(fields as string[], 'partial', signal);
    } finally {
      validatingCount--;
      notifyAll();
    }
  }

  async function validateField(name: FlatKeyOf<TValues>, signal?: AbortSignal): Promise<string | undefined> {
    const { errors } = await validateFields([name], signal);

    return errors[name as string];
  }

  async function submit<TResult = void>(
    onSubmit: (values: TValues) => MaybePromise<TResult>,
    onInvalid?: (errors: Record<string, string>) => MaybePromise<void>,
  ): Promise<TResult | void> {
    ensureNotDisposed();

    if (isSubmitting) throw new SubmitError();

    submitCount++;
    isSubmitting = true;
    notifyAll();

    try {
      touchAll();
      // Run validation without updating validatingCount — isSubmitting already signals busy state.
      await runValidationCore(Object.keys(validators), 'full');

      if (fieldErrors.size > 0) {
        const errors = Object.fromEntries(fieldErrors);

        if (onInvalid) {
          await onInvalid(errors);

          return;
        }

        throw new FormValidationError(errors);
      }

      return await onSubmit(values());
    } finally {
      isSubmitting = false;
      notifyAll();
    }
  }

  function subscribeForm(listener: LocalListener, options?: SubscribeOptions): Unsubscribe {
    ensureNotDisposed();

    listeners.add(listener);

    if (options?.sync) listener(buildState());

    return () => listeners.delete(listener);
  }

  function subscribeField<K extends FlatKeyOf<TValues>>(
    name: K,
    listener: (state: FieldState<TypeAtPath<TValues, K>>) => void,
    options?: SubscribeOptions,
  ): Unsubscribe {
    ensureNotDisposed();

    const key = name as string;
    const bucket = fieldListeners.get(key) ?? new Set<AnyFieldListener>();

    fieldListeners.set(key, bucket);
    bucket.add(listener as AnyFieldListener);

    if (options?.sync) {
      listener(buildFieldState(key) as FieldState<TypeAtPath<TValues, K>>);
    }

    return () => {
      bucket.delete(listener as AnyFieldListener);

      if (bucket.size === 0) fieldListeners.delete(key);
    };
  }

  function bind<K extends FlatKeyOf<TValues>>(name: K, config?: BindConfig): BindResult<TypeAtPath<TValues, K>> {
    ensureNotDisposed();

    const key = name as string;
    const touchOnBlur = config?.touchOnBlur ?? bindDefaults.touchOnBlur ?? true;
    const doValidateOnBlur = config?.validateOnBlur ?? bindDefaults.validateOnBlur ?? false;
    const doValidateOnChange = config?.validateOnChange ?? bindDefaults.validateOnChange ?? false;
    const doValidateOnChangeAfterTouch =
      config?.validateOnChangeAfterTouch ?? bindDefaults.validateOnChangeAfterTouch ?? false;

    return {
      get dirty() {
        return dirty.has(key);
      },
      get error() {
        return fieldErrors.get(key);
      },
      onBlur: () => {
        if (touchOnBlur) touch(name);

        if (doValidateOnBlur) void validateField(name).catch(() => undefined);
      },
      onChange: (value: TypeAtPath<TValues, K>) => {
        set(name, value);

        const shouldValidateOnChange = doValidateOnChange || (doValidateOnChangeAfterTouch && touched.has(key));

        if (shouldValidateOnChange) void validateField(name).catch(() => undefined);
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

    store.set(key, baseline.get(key));
    dirty.delete(key);
    touched.delete(key);
    fieldErrors.delete(key);
    notifyAll(key);
  }

  function removeField(name: FlatKeyOf<TValues>): void {
    ensureNotDisposed();

    const key = name as string;

    store.delete(key);
    baseline.delete(key);
    dirty.delete(key);
    touched.delete(key);
    fieldErrors.delete(key);
    delete validators[key];
    notifyAll(key);
  }

  function reset(): void {
    ensureNotDisposed();

    store.clear();
    fieldErrors.clear();
    touched.clear();
    dirty.clear();

    for (const [name, value] of baseline) {
      store.set(name, value);
    }

    notifyAll();
  }

  function replace(newValues: TValues): void {
    ensureNotDisposed();

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

    notifyAll();
  }

  let disposed = false;

  function ensureNotDisposed(): void {
    if (disposed) throw new Error('Cannot modify a disposed form');
  }

  function dispose(): void {
    disposed = true;
    disposeController.abort();
    for (const ctrl of fieldCtrls.values()) ctrl.abort();
    fullRunCtrl?.abort();
    fieldCtrls.clear();
    listeners.clear();
    fieldListeners.clear();
  }

  return {
    array,
    bind,
    dispose,
    get disposed() {
      return disposed;
    },
    field,
    get,
    removeField,
    replace,
    reset,
    resetField,
    set,
    setError,
    setErrors,
    get state() {
      return buildState();
    },
    submit,
    subscribeField,
    subscribeForm,
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
