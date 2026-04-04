import {
  type ArrayFieldBatch,
  type BindConfig,
  type BindResult,
  type DeepPartial,
  type FieldState,
  type FieldValidator,
  type FlatKeyOf,
  type Form,
  type FormOptions,
  type FormState,
  type MaybePromise,
  type SetOptions,
  SubmitError,
  type SubmitOptions,
  FormValidationError,
  type TypeAtPath,
  type Unsubscribe,
  type ValidateOptions,
  type ValidateResult,
} from './types';
import { flattenValues, isSameValue, unflattenValues } from './utils';

export function createForm<TValues extends Record<string, unknown> = Record<string, unknown>>(
  init: FormOptions<TValues> = {},
): Form<TValues> {
  const validators: Record<string, FieldValidator<unknown>[]> = {};

  for (const [name, rule] of Object.entries(init.validators ?? {})) {
    validators[name] = Array.isArray(rule) ? (rule as FieldValidator<unknown>[]) : [rule as FieldValidator<unknown>];
  }

  const formValidator = init.validator;

  // Backing store: typed values, never coerced to string
  // `baseline` is the single source of truth for dirty comparisons and reset targets.
  // It is updated by reset(newValues) to reflect the new reset target.
  const baseline = new Map<string, unknown>(Object.entries(flattenValues(init.defaultValues ?? {})));
  const store = new Map<string, unknown>(baseline);

  // State
  const fieldErrors = new Map<string, string>();
  const touched = new Set<string>();
  const dirty = new Set<string>();
  let validatingCount = 0;
  let activeValidationCtrl: AbortController | null = null;
  const fieldValidationCtrls = new Map<string, AbortController>();
  let isSubmitting = false;
  let submitCount = 0;
  const disposeController = new AbortController();

  // Listeners
  type LocalListener = (state: FormState<TValues>) => void;
  type FieldListener = (payload: FieldState<unknown>) => void;

  const listeners = new Set<LocalListener>();
  const fieldListeners = new Map<string, Set<FieldListener>>();

  // Batched notification
  let scheduled = false;
  const changedFields = new Set<string>();
  let notifyAllFields = false;

  /* -------------------- Notification -------------------- */

  function buildState(): FormState<TValues> {
    return {
      dirtyFields: [...dirty] as FlatKeyOf<TValues>[],
      errors: Object.fromEntries(fieldErrors),
      isDirty: dirty.size > 0,
      isSubmitting,
      isTouched: touched.size > 0,
      isValid: fieldErrors.size === 0,
      isValidating: validatingCount > 0,
      submitCount,
    };
  }

  function notifyField(name: string): void {
    const bucket = fieldListeners.get(name);

    if (!bucket?.size) return;

    const payload: FieldState = {
      dirty: dirty.has(name),
      error: fieldErrors.get(name),
      touched: touched.has(name),
      value: store.get(name),
    };

    for (const fn of bucket) fn(payload);
  }

  function flush() {
    scheduled = false;

    const state = buildState();

    for (const listener of listeners) listener(state);

    const toNotify = notifyAllFields ? fieldListeners.keys() : changedFields;

    for (const name of toNotify) notifyField(name);
    changedFields.clear();
    notifyAllFields = false;
  }

  function scheduleNotify(field?: string) {
    if (field !== undefined) {
      changedFields.add(field);
    } else {
      notifyAllFields = true;
    }

    if (scheduled) return;

    scheduled = true;
    queueMicrotask(flush);
  }

  /* -------------------- Field Validation -------------------- */

  // Callers are responsible for composing a signal that includes disposeController.signal.
  async function runFieldValidators(name: string, signal: AbortSignal): Promise<string | undefined> {
    const fieldValidators = validators[name];

    if (!fieldValidators) return undefined;

    const value = store.get(name);

    for (const validator of fieldValidators) {
      if (signal.aborted) throw signal.reason;

      const result = await validator(value, signal);

      if (typeof result === 'string') return result;
    }

    return undefined;
  }

  /* -------------------- Values -------------------- */

  function get<K extends FlatKeyOf<TValues>>(name: K): TypeAtPath<TValues, K>;
  function get<V = unknown>(name: string): V;
  function get<V>(name: string): V {
    return store.get(name) as V;
  }

  function values(): TValues {
    return unflattenValues(Object.fromEntries(store)) as TValues;
  }

  function trackDirty(name: string, value: unknown): void {
    if (isSameValue(baseline.get(name), value)) {
      dirty.delete(name);
    } else {
      dirty.add(name);
    }
  }

  function set<K extends FlatKeyOf<TValues>>(name: K, value: TypeAtPath<TValues, K>, options?: SetOptions): void;
  function set(name: string, value: unknown, options?: SetOptions): void;
  function set(name: string, value: unknown, options: SetOptions = {}): void {
    ensureNotDisposed();
    store.set(name, value);

    if (options.dirty ?? true) trackDirty(name, value);

    if (options.touched) touched.add(name);

    scheduleNotify(name);
  }

  /** Patch multiple fields at once (deep partial). Nested plain objects are merged — only supply the keys you want to change. */
  function patch(entries: DeepPartial<TValues>, options: SetOptions = {}): void {
    ensureNotDisposed();

    const { dirty: setDirty = true, touched: setTouched = false } = options;
    const flat = flattenValues(entries as Record<string, unknown>);

    for (const [name, value] of Object.entries(flat)) {
      store.set(name, value);

      if (setDirty) trackDirty(name, value);

      if (setTouched) touched.add(name);

      scheduleNotify(name);
    }
  }

  /* -------------------- Field State -------------------- */

  /** Get the full state of a field: value, error, touched, and dirty. Mirrors the `subscribe` field payload. */
  function field<K extends FlatKeyOf<TValues>>(name: K): FieldState<TypeAtPath<TValues, K>>;
  function field<V = unknown>(name: string): FieldState<V>;
  function field<V>(name: string): FieldState<V> {
    return {
      dirty: dirty.has(name),
      error: fieldErrors.get(name),
      touched: touched.has(name),
      value: store.get(name) as V,
    };
  }

  /* -------------------- Errors -------------------- */

  function setError(name: string, message: string): void {
    ensureNotDisposed();
    fieldErrors.set(name, message);
    scheduleNotify(name);
  }

  function clearError(name: string): void {
    ensureNotDisposed();
    fieldErrors.delete(name);
    scheduleNotify(name);
  }

  function applyErrors(nextErrors: Record<string, string>): void {
    fieldErrors.clear();
    for (const [k, v] of Object.entries(nextErrors)) fieldErrors.set(k, v);
  }

  function setErrors(nextErrors: Record<string, string>): void {
    ensureNotDisposed();
    applyErrors(nextErrors);
    scheduleNotify();
  }

  /* -------------------- Touch -------------------- */

  function touch(name: string): void {
    ensureNotDisposed();
    touched.add(name);
    scheduleNotify(name);
  }

  /** Mark all known fields as touched. */
  function touchAll(): void {
    ensureNotDisposed();
    for (const name of store.keys()) touched.add(name);
    for (const name of Object.keys(validators)) touched.add(name);
    scheduleNotify();
  }

  function untouch(name: string): void {
    ensureNotDisposed();
    touched.delete(name);
    scheduleNotify(name);
  }

  function untouchAll(): void {
    ensureNotDisposed();
    touched.clear();
    scheduleNotify();
  }

  /* -------------------- Validation -------------------- */

  function resolveFields(options?: ValidateOptions<TValues>): Set<string> {
    const base = new Set<string>(Object.keys(validators));

    if (options && 'fields' in options) return new Set(options.fields as string[]);

    if (options && 'onlyTouched' in options) return new Set([...base].filter((n) => touched.has(n)));

    return base;
  }

  async function runFormValidator(signal: AbortSignal): Promise<Record<string, string>> {
    if (!formValidator) return {};

    if (signal.aborted) throw signal.reason;

    const result = await formValidator(values(), signal);
    const out: Record<string, string> = {};

    if (result) {
      for (const [name, msg] of Object.entries(result)) {
        if (msg) out[name] = msg;
      }
    }

    return out;
  }

  /** Write errors for a scoped subset of fields without touching the rest. */
  function applyPartialErrors(fields: Set<string>, next: Record<string, string>): void {
    for (const name of fields) {
      if (next[name] !== undefined) fieldErrors.set(name, next[name]);
      else fieldErrors.delete(name);
    }
  }

  /** Validate a single field — returns the error message or undefined, and updates the error map. */
  async function validateField(name: string, signal?: AbortSignal): Promise<string | undefined> {
    ensureNotDisposed();
    fieldValidationCtrls.get(name)?.abort();

    const ctrl = new AbortController();

    fieldValidationCtrls.set(name, ctrl);

    const combinedSignal = signal
      ? AbortSignal.any([signal, ctrl.signal, disposeController.signal])
      : AbortSignal.any([ctrl.signal, disposeController.signal]);

    validatingCount++;
    scheduleNotify(name);

    try {
      const msg = await runFieldValidators(name, combinedSignal);

      if (msg !== undefined) fieldErrors.set(name, msg);
      else fieldErrors.delete(name);

      return msg ?? undefined;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return fieldErrors.get(name);

      throw err;
    } finally {
      if (fieldValidationCtrls.get(name) === ctrl) fieldValidationCtrls.delete(name);

      validatingCount--;
      scheduleNotify(name);
    }
  }

  /** Validate all fields, or a scoped subset. Form-level validator only runs on full (unrestricted) validation. */
  async function validate(options?: ValidateOptions<TValues>): Promise<ValidateResult> {
    ensureNotDisposed();

    // A partial run (scoped fields or onlyTouched) must not clear errors on
    // fields it never visited, and must not run the form-level validator.
    // Note: fields:[] (empty array) is treated as partial (validates nothing).
    const isPartial = !!(options && ('fields' in options || 'onlyTouched' in options));

    activeValidationCtrl?.abort();

    // Cancel all in-flight per-field validators on a full run to avoid races.
    if (!isPartial) {
      for (const ctrl of fieldValidationCtrls.values()) ctrl.abort();
      fieldValidationCtrls.clear();
    }

    const ctrl = new AbortController();

    activeValidationCtrl = ctrl;

    const combinedSignal = options?.signal
      ? AbortSignal.any([options.signal, ctrl.signal, disposeController.signal])
      : AbortSignal.any([ctrl.signal, disposeController.signal]);

    validatingCount++;
    scheduleNotify();

    try {
      const fieldsToValidate = resolveFields(options);
      const results = await Promise.all(
        [...fieldsToValidate].map(async (name) => [name, await runFieldValidators(name, combinedSignal)] as const),
      );
      const nextErrors: Record<string, string> = {};

      for (const [name, msg] of results) {
        if (msg !== undefined) nextErrors[name] = msg;
      }

      if (isPartial) {
        applyPartialErrors(fieldsToValidate, nextErrors);
      } else {
        Object.assign(nextErrors, await runFormValidator(combinedSignal));
        applyErrors(nextErrors);
      }

      return { errors: Object.fromEntries(fieldErrors), valid: fieldErrors.size === 0 };
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError')
        return { errors: Object.fromEntries(fieldErrors), valid: fieldErrors.size === 0 };

      throw err;
    } finally {
      if (activeValidationCtrl === ctrl) activeValidationCtrl = null;

      validatingCount--;
      scheduleNotify();
    }
  }

  /* -------------------- Submit -------------------- */

  async function submit<TResult = void>(
    onSubmit: (values: TValues) => MaybePromise<TResult>,
    options?: SubmitOptions<TValues>,
  ): Promise<TResult> {
    ensureNotDisposed();

    if (isSubmitting) throw new SubmitError();

    submitCount++;
    isSubmitting = true;
    scheduleNotify();

    try {
      const { fields, signal, skipValidation } = options ?? {};

      if (!skipValidation) {
        if (fields) {
          for (const name of fields) touch(name);
          await validate(signal ? { fields, signal } : { fields });
        } else {
          touchAll();
          await validate(signal ? { signal } : undefined);
        }

        if (fieldErrors.size > 0) {
          throw new FormValidationError(Object.fromEntries(fieldErrors));
        }
      }

      return await onSubmit(values());
    } finally {
      isSubmitting = false;
      scheduleNotify();
    }
  }

  /* -------------------- Subscriptions -------------------- */

  function subscribe(listener: LocalListener, options?: { immediate?: boolean }): Unsubscribe;
  // @ts-expect-error - TypeScript has trouble with this overload signature combination
  function subscribe<K extends FlatKeyOf<TValues>>(
    name: K,
    listener: (payload: FieldState<TypeAtPath<TValues, K>>) => void,
    options?: { immediate?: boolean },
  ): Unsubscribe;
  function subscribe(
    listenerOrName: LocalListener | string,
    callbackOrOptions?: ((payload: FieldState<unknown>) => void) | { immediate?: boolean },
    options?: { immediate?: boolean },
  ): Unsubscribe {
    if (typeof listenerOrName === 'function') {
      const listener = listenerOrName;
      const listenerOptions =
        callbackOrOptions && typeof callbackOrOptions !== 'function'
          ? (callbackOrOptions as { immediate?: boolean })
          : options;

      listeners.add(listener);

      if (listenerOptions?.immediate !== false) listener(buildState());

      return () => listeners.delete(listener);
    }

    const name = listenerOrName;
    const cb = callbackOrOptions as FieldListener;
    const bucket = fieldListeners.get(name) ?? new Set<FieldListener>();

    fieldListeners.set(name, bucket);
    bucket.add(cb);

    if (options?.immediate !== false) {
      cb({
        dirty: dirty.has(name),
        error: fieldErrors.get(name),
        touched: touched.has(name),
        value: store.get(name) as unknown,
      });
    }

    return () => {
      bucket.delete(cb);

      if (bucket.size === 0) fieldListeners.delete(name);
    };
  }

  /* -------------------- Bind -------------------- */

  function bind<K extends FlatKeyOf<TValues>>(name: K, config?: BindConfig): BindResult<TypeAtPath<TValues, K>>;
  function bind(name: string, config?: BindConfig): BindResult;
  function bind(name: string, config?: BindConfig): BindResult {
    const extract =
      config?.valueExtractor ??
      ((event: unknown) =>
        event && typeof event === 'object' && 'target' in event
          ? (event as { target: { value: unknown } }).target.value
          : event);
    const touchOnBlur = config?.touchOnBlur ?? true;
    const doValidateOnBlur = config?.validateOnBlur ?? false;
    const doValidateOnChange = config?.validateOnChange ?? false;

    const binding: BindResult = {
      get dirty() {
        return dirty.has(name);
      },
      get error() {
        return fieldErrors.get(name);
      },
      onBlur: () => {
        if (touchOnBlur) touch(name);

        if (doValidateOnBlur) void validateField(name);
      },
      onChange: (event: unknown) => {
        set(name, extract(event));

        if (doValidateOnChange) void validateField(name);
      },
      get touched() {
        return touched.has(name);
      },
      get value() {
        return store.get(name);
      },
    };

    return binding;
  }

  /* -------------------- Array Field Utilities -------------------- */

  function array(name: string): ArrayFieldBatch {
    ensureNotDisposed();

    return {
      append(value: unknown): void {
        const current = store.get(name);

        set(name, Array.isArray(current) ? [...current, value] : [value]);
      },
      move(from: number, to: number): void {
        const current = store.get(name);

        if (!Array.isArray(current)) return;

        const next = [...current];

        next.splice(to, 0, next.splice(from, 1)[0]);
        set(name, next);
      },
      remove(index: number): void {
        const current = store.get(name);

        if (!Array.isArray(current)) return;

        set(
          name,
          current.filter((_, i) => i !== index),
        );
      },
    };
  }

  /* -------------------- Reset -------------------- */

  /** Reset a single field: restore its baseline value and clear its error, touched, and dirty state. */
  function resetField(name: string): void {
    ensureNotDisposed();
    store.set(name, baseline.get(name));
    dirty.delete(name);
    touched.delete(name);
    fieldErrors.delete(name);
    scheduleNotify(name);
  }

  function reset(newValues?: DeepPartial<TValues>): void {
    ensureNotDisposed();
    store.clear();
    applyErrors({});
    touched.clear();
    dirty.clear();

    if (newValues) {
      // Update baseline to the new reset target
      baseline.clear();
      for (const [name, value] of Object.entries(flattenValues(newValues as Record<string, unknown>))) {
        store.set(name, value);
        baseline.set(name, value);
      }
    } else {
      // Restore from current baseline (set by prior reset(newValues) or construction)
      for (const [name, value] of baseline) {
        store.set(name, value);
      }
    }

    scheduleNotify();
  }

  /* -------------------- Dispose -------------------- */

  let disposed = false;

  function ensureNotDisposed(): void {
    if (disposed) throw new Error('Cannot modify a disposed form');
  }

  function dispose(): void {
    disposed = true;
    disposeController.abort();
    activeValidationCtrl?.abort();
    for (const ctrl of fieldValidationCtrls.values()) ctrl.abort();
    fieldValidationCtrls.clear();
    listeners.clear();
    fieldListeners.clear();
  }

  /* -------------------- Public API -------------------- */

  return {
    array,
    bind,
    clearError,
    dispose,
    get disposed() {
      return disposed;
    },
    get errors() {
      return Object.fromEntries(fieldErrors);
    },
    field,
    get,
    get isDirty() {
      return dirty.size > 0;
    },
    get isSubmitting() {
      return isSubmitting;
    },
    get isTouched() {
      return touched.size > 0;
    },
    get isValid() {
      return fieldErrors.size === 0;
    },
    get isValidating() {
      return validatingCount > 0;
    },
    patch,
    reset,
    resetField,
    set,
    setError,
    setErrors,
    get state() {
      return buildState();
    },
    submit,
    get submitCount() {
      return submitCount;
    },
    subscribe,
    touch,
    touchAll,
    untouch,
    untouchAll,
    validate,
    validateField,
    values,
  };
}
