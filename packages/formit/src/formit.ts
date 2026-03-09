/* ============================================
   formit - Lightweight form state management
   ============================================ */

/* -------------------- Core Types -------------------- */

export type Unsubscribe = () => void;

type MaybePromise<T> = T | PromiseLike<T>;

export type FieldValidator<V = unknown> = (value: V, signal: AbortSignal) => MaybePromise<string | undefined>;

export type FormValidator<TValues extends Record<string, unknown> = Record<string, unknown>> = (
  values: TValues,
  signal: AbortSignal,
) => MaybePromise<Record<string, string> | undefined>;

export type ValidateOptions = {
  signal?: AbortSignal;
  /**
   * Only validate fields that have been touched.
   * @remarks Treated as a partial run — the form-level `validator` is NOT run.
   */
  onlyTouched?: boolean;
  /**
   * Restrict validation to these specific fields.
   * @remarks The form-level `validator` is NOT run. Errors on unvisited fields are preserved unchanged.
   * Pass an empty array to validate nothing.
   */
  fields?: string[];
};

export type SetOptions = {
  dirty?: boolean; // default: true
  touched?: boolean; // default: false
};

export type FormState = {
  errors: Record<string, string>;
  isValid: boolean;
  isDirty: boolean;
  isTouched: boolean;
  isValidating: boolean;
  isSubmitting: boolean;
  submitCount: number;
  /** Flat dot-notation keys of all fields that differ from their default value. */
  dirtyFields: string[];
};

export type SubmitOptions = ValidateOptions & {
  /** Skip validation entirely and call the submit handler regardless of errors. */
  skipValidation?: boolean;
};

/* -------------------- Utility Types -------------------- */

/** Recursively extracts all dot-notation leaf keys from a values shape (depth-limited to 8). */
type FlatKeyOf<
  T extends Record<string, unknown>,
  P extends string = '',
  D extends readonly 0[] = [],
> = D['length'] extends 8
  ? string
  : {
      [K in keyof T & string]: T[K] extends unknown[] | File | Blob | Date
        ? P extends ''
          ? K
          : `${P}.${K}`
        : T[K] extends Record<string, unknown>
          ? FlatKeyOf<T[K] & Record<string, unknown>, P extends '' ? K : `${P}.${K}`, [...D, 0]>
          : P extends ''
            ? K
            : `${P}.${K}`;
    }[keyof T & string];

/** Resolves the value type at a dot-notation path within a values shape. */
type TypeAtPath<T, K extends string> = K extends `${infer Head}.${infer Tail}`
  ? Head extends keyof T
    ? T[Head] extends Record<string, unknown>
      ? TypeAtPath<T[Head], Tail>
      : unknown
    : unknown
  : K extends keyof T
    ? T[K]
    : unknown;

/** Recursively makes all properties optional; arrays and special objects are kept as-is. */
type DeepPartial<T extends Record<string, unknown>> = {
  [K in keyof T]?: T[K] extends unknown[] | File | Blob | Date
    ? T[K]
    : T[K] extends Record<string, unknown>
      ? DeepPartial<T[K]>
      : T[K];
};

/* -------------------- Error Classes -------------------- */

export class SubmitError extends Error {
  readonly type = 'submit' as const;
  constructor() {
    super('Form is already being submitted');
    this.name = 'SubmitError';
  }
}

export class FormValidationError extends Error {
  readonly errors: Record<string, string>;
  readonly type = 'validation' as const;
  constructor(errors: Record<string, string>) {
    super('Form validation failed');
    this.name = 'FormValidationError';
    this.errors = errors;
  }
}

/* -------------------- Helpers -------------------- */

function isSameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a instanceof File && b instanceof File) return a.name === b.name && a.size === b.size;
  if (a instanceof Blob && b instanceof Blob) return a.size === b.size;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => isSameValue(v, b[i]));
  }
  return false;
}

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === 'object' && Object.getPrototypeOf(val) === Object.prototype;
}

function flattenValues(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(val)) {
      Object.assign(result, flattenValues(val, fullKey));
    } else {
      result[fullKey] = val;
    }
  }
  return result;
}

function unflattenValues(flat: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(flat)) {
    const parts = key.split('.');
    let obj = result;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!isPlainObject(obj[parts[i]])) obj[parts[i]] = {};
      obj = obj[parts[i]] as Record<string, unknown>;
    }
    obj[parts[parts.length - 1]] = val;
  }
  return result;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: FormData conversion requires handling multiple value types (File, Blob, Array, primitives)
export function toFormData(values: Record<string, unknown>): FormData {
  const fd = new FormData();
  for (const [name, value] of Object.entries(flattenValues(values))) {
    if (value === null || value === undefined) continue;
    if (value instanceof File || value instanceof Blob) {
      fd.append(name, value);
    } else if (value instanceof FileList) {
      for (let i = 0; i < value.length; i++) fd.append(name, value[i]);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        fd.append(name, item instanceof File || item instanceof Blob ? item : String(item));
      }
    } else {
      fd.append(name, String(value));
    }
  }
  return fd;
}

export type FieldState<V = unknown> = {
  value: V;
  error: string | undefined;
  touched: boolean;
  dirty: boolean;
};

export type FormOptions<TValues extends Record<string, unknown> = Record<string, unknown>> = {
  defaultValues?: TValues;
  /** Field-level validators keyed by field name or dot-notation path. */
  rules?: Record<string, FieldValidator | FieldValidator[]>;
  validator?: FormValidator<TValues>;
};

export type BindConfig = {
  valueExtractor?: (event: unknown) => unknown;
  touchOnBlur?: boolean;
  /** Validate the field automatically when it loses focus. Default: false. */
  validateOnBlur?: boolean;
  /** Validate the field automatically after each value change. Default: false. */
  validateOnChange?: boolean;
};

type Listener = (state: FormState) => void;
type FieldListener = (payload: FieldState) => void;

/* -------------------- Form Creation -------------------- */

export function createForm<TValues extends Record<string, unknown> = Record<string, unknown>>(
  init: FormOptions<TValues> = {},
) {
  const rules: Record<string, FieldValidator<unknown>[]> = {};
  for (const [name, rule] of Object.entries(init.rules ?? {})) {
    rules[name] = Array.isArray(rule) ? (rule as FieldValidator<unknown>[]) : [rule as FieldValidator<unknown>];
  }
  const formValidator = init.validator;

  // Backing store: typed values, never coerced to string
  const originalDefaults = Object.freeze(flattenValues(init.defaultValues ?? {}));
  const store = new Map<string, unknown>(Object.entries(originalDefaults));
  const initial = new Map<string, unknown>(store);

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
  const listeners = new Set<Listener>();
  const fieldListeners = new Map<string, Set<FieldListener>>();

  // Batched notification
  let scheduled = false;
  const changedFields = new Set<string>();
  let notifyAllFields = false;

  /* -------------------- Notification -------------------- */

  function buildState(): FormState {
    return {
      dirtyFields: [...dirty],
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

  async function runFieldValidators(name: string, signal?: AbortSignal): Promise<string | undefined> {
    const validators = rules[name];
    if (!validators) return undefined;
    const effective = signal ? AbortSignal.any([signal, disposeController.signal]) : disposeController.signal;
    const value = store.get(name);
    for (const validator of validators) {
      if (effective.aborted) throw effective.reason;
      const result = await validator(value, effective);
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
    if (isSameValue(initial.get(name), value)) {
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
      scheduleNotify(name);
      if (setDirty) trackDirty(name, value);
      if (setTouched) touched.add(name);
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

  function setError(name: string, message?: string): void {
    ensureNotDisposed();
    if (message != null) fieldErrors.set(name, message);
    else fieldErrors.delete(name);
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

  function touch(first: string, ...rest: string[]): void {
    ensureNotDisposed();
    touched.add(first);
    scheduleNotify(first);
    for (const name of rest) {
      touched.add(name);
      scheduleNotify(name);
    }
  }

  /** Mark all known fields as touched. */
  function touchAll(): void {
    ensureNotDisposed();
    for (const name of store.keys()) touched.add(name);
    for (const name of Object.keys(rules)) touched.add(name);
    scheduleNotify();
  }

  /* -------------------- Validation -------------------- */

  function resolveFields(options?: ValidateOptions): Set<string> {
    const base = new Set<string>(Object.keys(rules));
    if (options?.fields !== undefined) return new Set(options.fields);
    if (options?.onlyTouched) return new Set([...base].filter((n) => touched.has(n)));
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
      return msg;
    } finally {
      if (fieldValidationCtrls.get(name) === ctrl) fieldValidationCtrls.delete(name);
      validatingCount--;
      scheduleNotify(name);
    }
  }

  /** Validate all fields, or a scoped subset — returns errors for the validated fields. Form-level validator only runs on full (unrestricted) validation. */
  async function validate(options?: ValidateOptions): Promise<Record<string, string>> {
    ensureNotDisposed();
    // A partial run (scoped fields or onlyTouched) must not clear errors on
    // fields it never visited, and must not run the form-level validator.
    // Note: fields:[] (empty array) is treated as partial (validates nothing).
    const isPartial = !!(options?.fields !== undefined || options?.onlyTouched);
    activeValidationCtrl?.abort();
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
      return nextErrors;
    } finally {
      if (activeValidationCtrl === ctrl) activeValidationCtrl = null;
      validatingCount--;
      scheduleNotify();
    }
  }

  /* -------------------- Submit -------------------- */

  async function submit<TResult = void>(
    onSubmit: (values: TValues) => MaybePromise<TResult>,
    options?: SubmitOptions,
  ): Promise<TResult> {
    ensureNotDisposed();
    if (isSubmitting) throw new SubmitError();
    submitCount++;
    isSubmitting = true;
    scheduleNotify();

    try {
      const { skipValidation, ...validateOpts } = options ?? {};
      if (!skipValidation) {
        touchAll();
        await validate(validateOpts);
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

  function subscribe(listener: Listener, options?: { immediate?: boolean }): Unsubscribe {
    listeners.add(listener);
    if (options?.immediate !== false) listener(buildState());
    return () => listeners.delete(listener);
  }

  function watch<K extends FlatKeyOf<TValues>>(
    name: K,
    listener: (payload: FieldState<TypeAtPath<TValues, K>>) => void,
  ): Unsubscribe;
  function watch<V = unknown>(name: string, listener: (payload: FieldState<V>) => void): Unsubscribe;
  function watch<V = unknown>(name: string, fieldCb: (payload: FieldState<V>) => void): Unsubscribe {
    const cb = fieldCb as FieldListener;
    const bucket = fieldListeners.get(name) ?? new Set<FieldListener>();
    fieldListeners.set(name, bucket);
    bucket.add(cb);
    cb({
      dirty: dirty.has(name),
      error: fieldErrors.get(name),
      touched: touched.has(name),
      value: store.get(name) as V,
    });
    return () => {
      bucket.delete(cb);
      if (bucket.size === 0) fieldListeners.delete(name);
    };
  }

  /* -------------------- Bind -------------------- */

  function bind<K extends FlatKeyOf<TValues>>(
    name: K,
    config?: BindConfig,
  ): {
    name: K;
    onBlur: () => void;
    onChange: (event: unknown) => void;
    readonly error: string | undefined;
    readonly value: TypeAtPath<TValues, K>;
    readonly touched: boolean;
    readonly dirty: boolean;
  };
  function bind(
    name: string,
    config?: BindConfig,
  ): {
    name: string;
    onBlur: () => void;
    onChange: (event: unknown) => void;
    readonly error: string | undefined;
    readonly value: unknown;
    readonly touched: boolean;
    readonly dirty: boolean;
  };
  // biome-ignore lint/suspicious/noExplicitAny: overload implementation requires any for return type compatibility
  function bind(name: string, config?: BindConfig): any {
    const extract =
      config?.valueExtractor ??
      ((event: unknown) =>
        event && typeof event === 'object' && 'target' in event
          ? (event as { target: { value: unknown } }).target.value
          : event);
    const touchOnBlur = config?.touchOnBlur ?? true;
    const doValidateOnBlur = config?.validateOnBlur ?? false;
    const doValidateOnChange = config?.validateOnChange ?? false;

    return {
      get dirty() {
        return dirty.has(name);
      },
      get error() {
        return fieldErrors.get(name);
      },
      name,
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
  }

  /* -------------------- Reset -------------------- */

  /** Reset a single field: restore its initial value and clear its error, touched, and dirty state. */
  function resetField(name: string): void {
    ensureNotDisposed();
    store.set(name, initial.get(name));
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
    initial.clear();
    const source = newValues ? flattenValues(newValues as Record<string, unknown>) : originalDefaults;
    for (const [name, value] of Object.entries(source)) {
      store.set(name, value);
      initial.set(name, value);
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
    bind,
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
    toFormData: () => toFormData(values()),
    touch,
    touchAll,
    validate,
    validateField,
    values,
    watch,
  };
}

export type Form<TValues extends Record<string, unknown> = Record<string, unknown>> = ReturnType<
  typeof createForm<TValues>
>;
