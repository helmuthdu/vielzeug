/* ============================================
   formit - Lightweight form state management
   ============================================ */

/* -------------------- Core Types -------------------- */

type MaybePromise<T> = T | Promise<T>;

/**
 * Field validator receives the raw stored value (typed, not coerced to string).
 * Return a string to signal an error, or undefined to signal success.
 */
export type FieldValidator = (value: unknown) => MaybePromise<string | undefined>;

/**
 * Form-level validator for cross-field validation.
 * Receives the full typed values and returns a map of field errors.
 */
export type FormValidator<TValues extends Record<string, unknown> = Record<string, unknown>> = (
  values: TValues,
) => MaybePromise<Record<string, string> | undefined>;

export type FormInit<TValues extends Record<string, unknown> = Record<string, unknown>> = {
  values?: TValues;
  rules?: Record<string, FieldValidator | FieldValidator[]>;
  validate?: FormValidator<TValues>;
};

export type ValidateOptions = {
  signal?: AbortSignal;
  onlyTouched?: boolean;
  fields?: string[];
};

export type SetOptions = {
  /** Track dirty state. Default: true */
  setDirty?: boolean;
  /** Mark field as touched. Default: false */
  setTouched?: boolean;
};

export type PatchOptions = {
  /** Replace all values instead of merging. Default: false */
  replace?: boolean;
  /** Track dirty state for patched fields. Default: true */
  setDirty?: boolean;
};

export type FormState = {
  errors: Record<string, string>;
  touched: Set<string>;
  dirty: Set<string>;
  isValid: boolean;
  isDirty: boolean;
  isTouched: boolean;
  isValidating: boolean;
  isSubmitting: boolean;
  submitCount: number;
};

export type BindConfig = {
  valueExtractor?: (event: unknown) => unknown;
  touchOnBlur?: boolean;
};

export type SubmitOptions = {
  signal?: AbortSignal;
  validate?: boolean;
};

/* -------------------- Error Class -------------------- */

export class ValidationError extends Error {
  readonly errors: Record<string, string>;
  readonly type = 'validation' as const;
  constructor(errors: Record<string, string>) {
    super('Form validation failed');
    this.name = 'ValidationError';
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

type Listener = (state: FormState) => void;
type FieldListener = (payload: { value: unknown; error?: string; touched: boolean; dirty: boolean }) => void;

/* -------------------- Form Creation -------------------- */

export function createForm<TValues extends Record<string, unknown> = Record<string, unknown>>(
  init: FormInit<TValues> = {},
) {
  const rules = init.rules ?? {};
  const formValidator = init.validate;

  // Backing store: typed values, never coerced to string
  const store = new Map<string, unknown>(Object.entries(flattenValues(init.values ?? {})));
  const initial = new Map<string, unknown>(store);

  // State
  const errors: Record<string, string> = {};
  const touched = new Set<string>();
  const dirty = new Set<string>();
  let isValidating = false;
  let isSubmitting = false;
  let submitCount = 0;

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
      dirty: new Set(dirty),
      errors: { ...errors },
      isDirty: dirty.size > 0,
      isTouched: touched.size > 0,
      isSubmitting,
      isValid: Object.keys(errors).length === 0,
      isValidating,
      submitCount,
      touched: new Set(touched),
    };
  }

  function flush() {
    scheduled = false;
    const state = buildState();
    for (const listener of listeners) {
      try {
        listener(state);
      } catch (err) {
        console.error('[formit] subscriber threw:', err);
      }
    }
    // Only notify field listeners for fields that actually changed
    const toNotify = notifyAllFields ? fieldListeners.keys() : changedFields;
    for (const name of toNotify) {
      const set = fieldListeners.get(name);
      if (!set?.size) continue;
      const payload = {
        dirty: dirty.has(name),
        error: errors[name],
        touched: touched.has(name),
        value: store.get(name),
      };
      for (const fn of set) {
        try {
          fn(payload);
        } catch (err) {
          console.error('[formit] subscribeField threw:', err);
        }
      }
    }
    changedFields.clear();
    notifyAllFields = false;
  }

  function scheduleNotify(fields?: string[]) {
    if (fields) {
      for (const f of fields) changedFields.add(f);
    } else {
      notifyAllFields = true;
    }
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(flush);
  }

  /* -------------------- Field Validation -------------------- */

  async function runFieldValidators(name: string, signal?: AbortSignal): Promise<string | undefined> {
    const fieldRules = rules[name];
    if (!fieldRules) return undefined;
    const validators = Array.isArray(fieldRules) ? fieldRules : [fieldRules];
    const value = store.get(name);
    for (const validator of validators) {
      if (signal?.aborted) throw new Error('Validation aborted');
      const result = await validator(value);
      if (typeof result === 'string') return result;
    }
    return undefined;
  }

  /* -------------------- Values -------------------- */

  function get<V = unknown>(name: string): V {
    return store.get(name) as V;
  }

  function values(): TValues {
    return unflattenValues(Object.fromEntries(store)) as TValues;
  }

  function set(name: string, value: unknown, options: SetOptions = {}): void {
    store.set(name, value);
    if (options.setDirty ?? true) {
      if (isSameValue(initial.get(name), value)) {
        dirty.delete(name);
      } else {
        dirty.add(name);
      }
    }
    if (options.setTouched) touched.add(name);
    scheduleNotify([name]);
  }

  function update(name: string, updater: (prev: unknown) => unknown, options: SetOptions = {}): void {
    set(name, updater(store.get(name)), options);
  }

  /**
   * Set multiple fields at once.
   * Use `replace: true` to clear all existing values first.
   */
  function patch(entries: Partial<TValues>, options?: PatchOptions & { replace?: false }): void;
  function patch(entries: Record<string, unknown>, options: PatchOptions & { replace: true }): void;
  function patch(entries: Partial<TValues> | Record<string, unknown>, options: PatchOptions = {}): void {
    const { replace = false, setDirty = true } = options;
    if (replace) {
      store.clear();
      initial.clear();
      dirty.clear();
    }
    const flat = flattenValues(entries as Record<string, unknown>);
    const changed: string[] = [];
    for (const [name, value] of Object.entries(flat)) {
      store.set(name, value);
      changed.push(name);
      if (replace) {
        initial.set(name, value);
      } else if (setDirty) {
        if (isSameValue(initial.get(name), value)) {
          dirty.delete(name);
        } else {
          dirty.add(name);
        }
      }
    }
    scheduleNotify(changed);
  }

  /* -------------------- Errors -------------------- */

  function getError(name: string): string | undefined {
    return errors[name];
  }

  function setError(name: string, message?: string): void {
    if (message != null) {
      errors[name] = message;
    } else {
      delete errors[name];
    }
    scheduleNotify([name]);
  }

  function getErrors(): Record<string, string> {
    return { ...errors };
  }

  function setErrors(nextErrors: Record<string, string>): void {
    for (const k of Object.keys(errors)) delete errors[k];
    Object.assign(errors, nextErrors);
    scheduleNotify();
  }

  /* -------------------- Touch / Dirty -------------------- */

  function isTouched(name: string): boolean {
    return touched.has(name);
  }

  function setTouched(name: string): void {
    touched.add(name);
    scheduleNotify([name]);
  }

  function isDirty(name: string): boolean {
    return dirty.has(name);
  }

  function touchAll(...fields: string[]): void {
    const toTouch = fields.length > 0 ? fields : [...store.keys(), ...Object.keys(rules)];
    for (const name of toTouch) touched.add(name);
    scheduleNotify(fields.length > 0 ? fields : undefined);
  }

  /* -------------------- Validation -------------------- */

  /** Validate a single field. Returns the error message, or undefined if valid. */
  async function validate(name: string, opts?: { signal?: AbortSignal }): Promise<string | undefined> {
    isValidating = true;
    scheduleNotify([name]);
    try {
      const msg = await runFieldValidators(name, opts?.signal);
      if (msg) {
        errors[name] = msg;
      } else {
        delete errors[name];
      }
      return msg;
    } finally {
      isValidating = false;
      scheduleNotify([name]);
    }
  }

  /** Validate all fields (or a filtered subset). Returns all errors. */
  async function validateAll(options?: ValidateOptions): Promise<Record<string, string>> {
    isValidating = true;
    scheduleNotify();
    const { signal } = options ?? {};
    try {
      const nextErrors: Record<string, string> = {};
      const base = new Set<string>([...Object.keys(rules), ...store.keys()]);
      const fieldsToValidate = options?.fields?.length
        ? new Set(options.fields)
        : options?.onlyTouched
          ? new Set([...base].filter((n) => touched.has(n)))
          : base;

      for (const name of fieldsToValidate) {
        if (signal?.aborted) throw new Error('Validation aborted');
        const msg = await runFieldValidators(name, signal);
        if (msg) nextErrors[name] = msg;
      }

      if (formValidator) {
        if (signal?.aborted) throw new Error('Validation aborted');
        const formErrors = await formValidator(values());
        if (formErrors) {
          for (const [name, message] of Object.entries(formErrors)) {
            if (message) nextErrors[name] = message;
          }
        }
      }

      setErrors(nextErrors);
      return nextErrors;
    } finally {
      isValidating = false;
      scheduleNotify();
    }
  }

  /* -------------------- Submit -------------------- */

  async function submit<TResult = void>(
    onSubmit: (values: TValues) => MaybePromise<TResult>,
    options?: SubmitOptions,
  ): Promise<TResult> {
    if (isSubmitting) throw new Error('Form is already being submitted');
    submitCount++;
    isSubmitting = true;
    scheduleNotify();

    try {
      if (options?.validate ?? true) {
        await validateAll({ signal: options?.signal });
      }
      touchAll();
      if (Object.keys(errors).length > 0) {
        throw new ValidationError(getErrors());
      }
      return await onSubmit(values());
    } finally {
      isSubmitting = false;
      scheduleNotify();
    }
  }

  /* -------------------- Subscriptions -------------------- */

  function subscribe(listener: Listener, options?: { immediate?: boolean }): () => void {
    listeners.add(listener);
    if (options?.immediate !== false) listener(buildState());
    return () => listeners.delete(listener);
  }

  function subscribeField<V = unknown>(
    name: string,
    listener: (payload: { value: V; error?: string; touched: boolean; dirty: boolean }) => void,
    options?: { immediate?: boolean },
  ): () => void {
    let bucket = fieldListeners.get(name);
    if (!bucket) {
      bucket = new Set();
      fieldListeners.set(name, bucket);
    }
    bucket.add(listener as FieldListener);
    if (options?.immediate !== false) {
      listener({
        dirty: dirty.has(name),
        error: errors[name],
        touched: touched.has(name),
        value: store.get(name) as V,
      });
    }
    return () => {
      const bucket = fieldListeners.get(name);
      bucket?.delete(listener as FieldListener);
      if (bucket?.size === 0) fieldListeners.delete(name);
    };
  }

  /* -------------------- Bind -------------------- */

  function bind(name: string, config?: BindConfig) {
    const extract =
      config?.valueExtractor ??
      ((event: unknown) =>
        event && typeof event === 'object' && 'target' in event
          ? (event as { target: { value: unknown } }).target.value
          : event);
    const touchOnBlur = config?.touchOnBlur ?? true;

    const setter = (newValue: unknown) => {
      if (typeof newValue === 'function') {
        update(name, newValue as (prev: unknown) => unknown, { setDirty: true });
      } else {
        set(name, newValue, { setDirty: true });
      }
    };

    return {
      name,
      onBlur: () => {
        if (touchOnBlur) setTouched(name);
      },
      onChange: (event: unknown) => setter(extract(event)),
      set: setter,
      get value() {
        return store.get(name);
      },
      set value(v: unknown) {
        setter(v);
      },
    };
  }

  /* -------------------- Reset -------------------- */

  function reset(newValues?: Partial<TValues>): void {
    store.clear();
    for (const k of Object.keys(errors)) delete errors[k];
    touched.clear();
    dirty.clear();
    initial.clear();
    const source = flattenValues((newValues ?? init.values ?? {}) as Record<string, unknown>);
    for (const [name, value] of Object.entries(source)) {
      store.set(name, value);
      initial.set(name, value);
    }
    scheduleNotify();
  }

  /* -------------------- Dispose -------------------- */

  function dispose(): void {
    listeners.clear();
    fieldListeners.clear();
  }

  /* -------------------- Public API -------------------- */

  return {
    bind,
    dispose,
    get,
    getError,
    getErrors,
    isDirty,
    isTouched,
    patch,
    reset,
    set,
    setError,
    setErrors,
    setTouched,
    getState: buildState,
    submit,
    subscribe,
    subscribeField,
    update,
    validate,
    validateAll,
    values,
  };
}

export type Form<TValues extends Record<string, unknown> = Record<string, unknown>> = ReturnType<
  typeof createForm<TValues>
>;
