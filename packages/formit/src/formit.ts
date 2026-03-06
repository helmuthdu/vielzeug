/* ============================================
   formit - Lightweight form state management
   ============================================ */

/* -------------------- Core Types -------------------- */

type MaybePromise<T> = T | Promise<T>;

/**
 * Field validator receives the raw stored value (typed, not coerced to string).
 * Return a string to signal an error, or undefined/null to signal success.
 */
export type FieldValidator = (value: unknown) => MaybePromise<string | undefined | null>;

/**
 * Form-level validator for cross-field validation.
 * Receives the full values object and returns a map of field errors.
 */
export type FormValidator = (
  values: Record<string, unknown>,
) => MaybePromise<Record<string, string> | undefined | null>;

export type FormInit<TValues extends Record<string, unknown> = Record<string, unknown>> = {
  /** Initial field values */
  values?: TValues;
  /** Per-field validators, keyed by field name */
  rules?: Record<string, FieldValidator | FieldValidator[]>;
  /** Form-level validator for cross-field validation */
  validate?: FormValidator;
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
  /** Track dirty state for patched fields. Default: false */
  setDirty?: boolean;
};

export type FormState = {
  errors: Record<string, string>;
  touched: Set<string>;
  dirty: Set<string>;
  /** true if errors is empty */
  isValid: boolean;
  /** true if any field is dirty */
  isDirty: boolean;
  /** true if any field is touched */
  isTouched: boolean;
  isValidating: boolean;
  isSubmitting: boolean;
  submitCount: number;
};

export type BindConfig = {
  valueExtractor?: (event: unknown) => unknown;
  markTouchedOnBlur?: boolean;
};

/* -------------------- Error Class -------------------- */

export class ValidationError extends Error {
  readonly errors: Record<string, string>;
  readonly type = 'validation' as const;
  constructor(errors: Record<string, string>) {
    super('Form validation failed');
    this.name = 'ValidationError';
    this.errors = errors;
    if (typeof (Error as { captureStackTrace?: unknown }).captureStackTrace === 'function') {
      (Error as { captureStackTrace: (t: unknown, c: unknown) => void }).captureStackTrace(
        this,
        ValidationError,
      );
    }
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

function toFormData(values: Record<string, unknown>): FormData {
  const fd = new FormData();
  for (const [name, value] of Object.entries(values)) {
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

/* -------------------- Form Creation -------------------- */

export function createForm<TValues extends Record<string, unknown> = Record<string, unknown>>(
  init: FormInit<TValues> = {},
) {
  const rules = init.rules ?? {};
  const formValidator = init.validate;

  // Backing store: typed values, never coerced to string
  const store = new Map<string, unknown>(Object.entries(init.values ?? {}));
  const initial = new Map<string, unknown>(store);

  // State
  const errors: Record<string, string> = Object.create(null);
  const touched = new Set<string>();
  const dirty = new Set<string>();
  let isValidating = false;
  let isSubmitting = false;
  let submitCount = 0;

  // Listeners
  type Listener = (state: FormState) => void;
  type FieldListener = (payload: { value: unknown; error?: string; touched: boolean; dirty: boolean }) => void;

  const listeners = new Set<Listener>();
  const fieldListeners = new Map<string, Set<FieldListener>>();

  // Batched notification
  let scheduled = false;
  let changedFields = new Set<string>();
  let notifyAllFields = false;

  /* -------------------- Notification -------------------- */

  function buildState(): FormState {
    const errCopy: Record<string, string> = {};
    for (const k of Object.keys(errors)) errCopy[k] = errors[k];
    return {
      dirty: new Set(dirty),
      errors: errCopy,
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
      } catch {
        /* swallow */
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
        } catch {
          /* swallow */
        }
      }
    }
    changedFields = new Set();
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
    Promise.resolve().then(flush);
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

  function values(): Record<string, unknown> {
    return Object.fromEntries(store);
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

  /**
   * Set multiple fields at once.
   * Use `replace: true` to clear all existing values first.
   */
  function patch(entries: Record<string, unknown>, options: PatchOptions = {}): void {
    const { replace = false, setDirty = false } = options;
    if (replace) {
      store.clear();
      initial.clear();
      dirty.clear();
    }
    const changed: string[] = [];
    for (const [name, value] of Object.entries(entries)) {
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
    if (message) {
      errors[name] = message;
    } else {
      delete errors[name];
    }
    scheduleNotify([name]);
  }

  function getErrors(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const k of Object.keys(errors)) result[k] = errors[k];
    return result;
  }

  function setErrors(nextErrors: Record<string, string>): void {
    for (const k of Object.keys(errors)) delete errors[k];
    for (const [name, message] of Object.entries(nextErrors)) {
      if (message) errors[name] = message;
    }
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

  /* -------------------- Validation -------------------- */

  /** Validate a single field. Returns the error message, or undefined if valid. */
  async function validate(name: string, signal?: AbortSignal): Promise<string | undefined> {
    isValidating = true;
    scheduleNotify([name]);
    try {
      const msg = await runFieldValidators(name, signal);
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
      let fieldsToValidate = new Set<string>([...Object.keys(rules), ...store.keys()]);
      if (options?.onlyTouched) {
        fieldsToValidate = new Set([...fieldsToValidate].filter((n) => touched.has(n)));
      }
      if (options?.fields?.length) {
        fieldsToValidate = new Set(options.fields);
      }

      for (const name of fieldsToValidate) {
        if (signal?.aborted) throw new Error('Validation aborted');
        const msg = await runFieldValidators(name, signal);
        if (msg) nextErrors[name] = msg;
      }

      if (formValidator) {
        if (signal?.aborted) throw new Error('Validation aborted');
        try {
          const formErrors = await formValidator(values());
          if (formErrors) {
            for (const [name, message] of Object.entries(formErrors)) {
              if (message) nextErrors[name] = message;
            }
          }
        } catch (err) {
          nextErrors[''] = err instanceof Error ? err.message : String(err);
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

  async function submit(
    onSubmit: (formData: FormData) => MaybePromise<unknown>,
    options?: { signal?: AbortSignal; validate?: boolean },
  ): Promise<unknown> {
    if (isSubmitting) throw new Error('Form is already being submitted');
    submitCount++;
    isSubmitting = true;
    scheduleNotify();

    try {
      if (options?.validate ?? true) {
        await validateAll({ signal: options?.signal });
      }

      // Mark all fields as touched so validation errors become visible in the UI
      for (const name of store.keys()) touched.add(name);
      for (const name of Object.keys(rules)) touched.add(name);

      if (Object.keys(errors).length > 0) {
        throw new ValidationError(getErrors());
      }

      return await onSubmit(toFormData(values()));
    } finally {
      isSubmitting = false;
      scheduleNotify();
    }
  }

  /* -------------------- Subscriptions -------------------- */

  function subscribe(listener: Listener): () => void {
    listeners.add(listener);
    try {
      listener(buildState());
    } catch {
      /* swallow */
    }
    return () => listeners.delete(listener);
  }

  function subscribeField<V = unknown>(
    name: string,
    listener: (payload: { value: V; error?: string; touched: boolean; dirty: boolean }) => void,
  ): () => void {
    let set = fieldListeners.get(name);
    if (!set) {
      set = new Set();
      fieldListeners.set(name, set);
    }
    set.add(listener as FieldListener);
    try {
      listener({
        dirty: dirty.has(name),
        error: errors[name],
        touched: touched.has(name),
        value: store.get(name) as V,
      });
    } catch {
      /* swallow */
    }
    return () => {
      const s = fieldListeners.get(name);
      s?.delete(listener as FieldListener);
      if (s?.size === 0) fieldListeners.delete(name);
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
    const touchOnBlur = config?.markTouchedOnBlur ?? true;

    const setter = (newValue: unknown) => {
      const next =
        typeof newValue === 'function'
          ? (newValue as (v: unknown) => unknown)(store.get(name))
          : newValue;
      set(name, next, { setDirty: true, setTouched: true });
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

  function reset(newValues?: Record<string, unknown>): void {
    store.clear();
    for (const k of Object.keys(errors)) delete errors[k];
    touched.clear();
    dirty.clear();
    initial.clear();

    const source = newValues ?? (init.values as Record<string, unknown> | undefined) ?? {};
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
    snapshot: buildState,
    submit,
    subscribe,
    subscribeField,
    validate,
    validateAll,
    values,
  };
}
