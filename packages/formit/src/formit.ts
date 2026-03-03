/** biome-ignore-all lint/suspicious/noExplicitAny: - */
/* ============================================
   formit - Lightweight form state using native FormData
   ============================================ */

/* -------------------- Core Types -------------------- */
type MaybePromise<T> = T | Promise<T>;

/**
 * Errors are stored as Map for better performance and type safety.
 * Use errorsToObject() helper to convert to a plain object if needed.
 */
export type Errors = Map<string, string>;

/**
 * Field validators receive FormDataEntryValue (string | File | null).
 * Use String(value) or Number(value) to parse as needed.
 */
export type FieldValidator = (value: FormDataEntryValue) => MaybePromise<string | undefined | null>;

/**
 * Form-level validator receives the entire FormData for cross-field validation.
 */
export type FormValidator = (formData: FormData) => MaybePromise<Errors | undefined | null>;

/**
 * Field configuration with value and validators.
 * Use this when you need validators for a field.
 */
export type FieldConfig<TValue = any> = {
  value?: TValue;
  validators?: FieldValidator | Array<FieldValidator>;
};

/**
 * Fields can be:
 * - Plain values (string, number, boolean, Date, File, etc.)
 * - Nested objects (will be flattened)
 * - FieldConfig objects (with validators)
 */
export type FormFields = Record<string, any>;

export type ValidateOptions = { signal?: AbortSignal; onlyTouched?: boolean; fields?: string[] };

export type FormInit = {
  fields?: FormFields;
  validate?: FormValidator;
};
export type FormState = {
  errors: Errors;
  touched: Set<string>;
  dirty: Set<string>;
  isValidating: boolean;
  isSubmitting: boolean;
  submitCount: number;
};
export type BindConfig = {
  valueExtractor?: (event: any) => any;
  markTouchedOnBlur?: boolean;
};
type Listener = (state: FormState) => void;
type FieldListener<TValue> = (payload: {
  value: TValue | undefined;
  error?: string;
  touched: boolean;
  dirty: boolean;
}) => void;

/* -------------------- Errors -------------------- */
export class ValidationError extends Error {
  readonly errors: Errors;
  readonly type = 'validation' as const;
  constructor(errors: Errors) {
    super('Form validation failed');
    this.name = 'ValidationError';
    this.errors = errors;
    if (typeof (Error as any).captureStackTrace === 'function') {
      (Error as any).captureStackTrace(this, ValidationError);
    }
  }
}

/* -------------------- Pure Utilities -------------------- */

function isFileValue(value: unknown): value is File | Blob | FileList {
  return value instanceof File || value instanceof Blob || value instanceof FileList;
}

function isFieldConfigObject(v: unknown): v is FieldConfig {
  return (
    v !== null &&
    typeof v === 'object' &&
    !Array.isArray(v) &&
    !(v instanceof Date) &&
    !isFileValue(v) &&
    'validators' in v
  );
}

function normalizeForComparison(value: any): string {
  if (value === null || value === undefined) return '';
  if (value instanceof File) return `File:${value.name}:${value.size}`;
  if (value instanceof Blob) return `Blob:${value.size}`;
  if (value instanceof FileList) {
    const parts: string[] = [];
    for (let i = 0; i < value.length; i++) parts.push(`File:${value[i].name}:${value[i].size}`);
    return parts.join('|');
  }
  if (Array.isArray(value)) return value.map(normalizeForComparison).join('|');
  return String(value);
}

function flattenObject(obj: any, prefix = ''): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value === null || value === undefined) {
      result[path] = value;
    } else if (isFileValue(value)) {
      result[path] = value;
    } else if (Array.isArray(value)) {
      result[path] = value;
    } else if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
      Object.assign(result, flattenObject(value, path));
    } else {
      result[path] = value;
    }
  }
  return result;
}

/* -------------------- Form Creation -------------------- */
export function createForm(init: FormInit = {}) {
  const rawFields = init.fields ?? {};
  const formValidator = init.validate;

  // Separate field configs from plain values/nested objects
  const fieldConfigs: Record<string, FieldConfig> = {};
  const initialValues: Record<string, any> = {};

  // Track which fields are arrays to distinguish [] from ''
  const arrayFields = new Set<string>();

  for (const [key, fieldValue] of Object.entries(rawFields)) {
    if (isFieldConfigObject(fieldValue)) {
      fieldConfigs[key] = fieldValue;
      if ('value' in fieldValue) initialValues[key] = fieldValue.value;
    } else {
      initialValues[key] = fieldValue;
    }
  }

  const flatInitialValues = flattenObject(initialValues);

  // Core FormData (native browser API)
  const formData = new FormData();

  // State tracking
  const errors: Errors = new Map();
  const touched: Set<string> = new Set();
  const dirty: Set<string> = new Set();

  /**
   * Stores normalized initial values for dirty tracking.
   * Stores string representation to handle File/Blob comparisons.
   */
  const initialSnapshot = new Map<string, string>();

  let isValidating = false;
  let isSubmitting = false;
  let submitCount = 0;

  // Listeners
  const listeners = new Set<Listener>();
  const fieldListeners = new Map<string, Set<FieldListener<any>>>();

  // Scheduled notification
  let scheduled = false;

  /* -------------------- Internal Helpers -------------------- */

  function buildSnapshot(): FormState {
    return {
      dirty: new Set(dirty),
      errors: new Map(errors),
      isSubmitting,
      isValidating,
      submitCount,
      touched: new Set(touched),
    };
  }
  function scheduleNotify() {
    if (scheduled) return;
    scheduled = true;
    Promise.resolve().then(() => {
      scheduled = false;
      notifyListeners();
    });
  }
  function notifyListeners() {
    const snap = buildSnapshot();
    for (const listener of listeners) {
      try {
        listener(snap);
      } catch {
        /* swallow */
      }
    }
    for (const [name, listenerSet] of fieldListeners.entries()) {
      const fieldTouched = touched.has(name);
      const fieldDirty = dirty.has(name);
      const payload = { dirty: fieldDirty, error: errors.get(name), touched: fieldTouched, value: get(name) };
      for (const fieldListener of listenerSet) {
        try {
          fieldListener(payload);
        } catch {
          /* swallow */
        }
      }
    }
  }
  async function runFieldValidators(name: string, signal?: AbortSignal): Promise<string | undefined> {
    const config = fieldConfigs[name];
    if (!config?.validators) return undefined;
    const validators = Array.isArray(config.validators) ? config.validators : [config.validators];
    const fieldValue = get(name) ?? '';
    for (const validator of validators) {
      if (signal?.aborted) throw new Error('Validation aborted');
      const result = await validator(fieldValue);
      const msg = typeof result === 'string' ? result : undefined;
      if (msg) return msg;
    }
    return undefined;
  }
  async function runFormValidator(signal?: AbortSignal): Promise<Errors> {
    if (!formValidator) return new Map();
    if (signal?.aborted) {
      throw new Error('Validation aborted');
    }
    const result = await formValidator(formData);
    return (result ?? new Map()) as Errors;
  }

  /* -------------------- Value Management -------------------- */

  /**
   * Append a value to FormData, handling File, Blob, FileList, arrays, and primitives.
   */
  function appendValue(name: string, value: any): void {
    if (value === null || value === undefined) return;
    if (value instanceof File || value instanceof Blob) {
      formData.append(name, value);
    } else if (value instanceof FileList) {
      for (let i = 0; i < value.length; i++) formData.append(name, value[i]);
    } else if (Array.isArray(value)) {
      arrayFields.add(name);
      if (value.length === 0) {
        formData.append(name, ''); // empty-array marker
      } else {
        for (const item of value) {
          formData.append(name, item instanceof File || item instanceof Blob ? item : String(item));
        }
      }
    } else {
      arrayFields.delete(name);
      formData.append(name, String(value));
    }
  }

  /**
   * Get field value. Returns array if multiple values exist for same name.
   */
  function get(name: string): any {
    const all = formData.getAll(name);
    if (all.length === 0) return undefined;
    // Empty array marker: single empty string for fields tracked as arrays
    if (all.length === 1 && all[0] === '' && arrayFields.has(name)) return [];
    return all.length > 1 ? all : all[0];
  }

  /**
   * Convert form to plain object. Files/Blobs preserved as-is.
   */
  function values(): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [name, value] of formData.entries()) {
      const existing = result[name];
      if (existing !== undefined) {
        result[name] = Array.isArray(existing) ? [...existing, value] : [existing, value];
      } else {
        result[name] = value;
      }
    }
    return result;
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: -
  function set(
    nameOrEntries: string | Record<string, any> | FormData,
    valueOrOptions?: any,
    optionsWhenString?: { replace?: boolean; setDirty?: boolean; setTouched?: boolean },
  ) {
    const isSingleField = typeof nameOrEntries === 'string';
    const value = isSingleField ? valueOrOptions : undefined;
    const options = isSingleField ? optionsWhenString || {} : valueOrOptions || {};

    if (!isSingleField) {
      const { replace = false, setDirty = false } = options;

      if (replace) {
        for (const key of [...formData.keys()]) formData.delete(key);
        initialSnapshot.clear();
        dirty.clear();
      }

      const entries: [string, any][] =
        nameOrEntries instanceof FormData ? Array.from(nameOrEntries.entries()) : Object.entries(nameOrEntries);

      for (const [name, val] of entries) {
        if (!replace) formData.delete(name);
        appendValue(name, val);
        if (replace) {
          initialSnapshot.set(name, normalizeForComparison(val));
        } else if (setDirty) {
          if (initialSnapshot.get(name) !== normalizeForComparison(val)) {
            dirty.add(name);
          } else {
            dirty.delete(name);
          }
        }
      }

      scheduleNotify();
      return;
    }

    // Single field
    const name = nameOrEntries;
    formData.delete(name);
    appendValue(name, value);

    if (options.setDirty ?? true) {
      if (initialSnapshot.get(name) !== normalizeForComparison(value)) {
        dirty.add(name);
      } else {
        dirty.delete(name);
      }
    }

    if (options.setTouched) touched.add(name);

    scheduleNotify();
  }

  /* -------------------- Error Management -------------------- */

  // Initialize with flattened initial values
  for (const [name, value] of Object.entries(flatInitialValues)) {
    set(name, value, { setDirty: false });
    initialSnapshot.set(name, normalizeForComparison(value));
  }

  function getError(name: string): string | undefined {
    return errors.get(name);
  }

  function setError(name: string, message?: string): void {
    if (message) {
      errors.set(name, message);
    } else {
      errors.delete(name);
    }
    scheduleNotify();
  }

  function getErrors(): Errors {
    return new Map(errors);
  }

  function setErrors(nextErrors: Errors | Record<string, string>): void {
    errors.clear();
    if (nextErrors instanceof Map) {
      for (const [name, message] of nextErrors.entries()) {
        errors.set(name, message);
      }
    } else {
      for (const [name, message] of Object.entries(nextErrors)) {
        errors.set(name, message);
      }
    }
    scheduleNotify();
  }

  /* -------------------- Touch/Dirty Management -------------------- */

  function isTouched(name: string): boolean {
    return touched.has(name);
  }

  function setTouched(name: string): void {
    touched.add(name);
    scheduleNotify();
  }

  function isDirty(name: string): boolean {
    return dirty.has(name);
  }

  /* -------------------- Validation -------------------- */

  /**
   * Validate field(s). If called with name string, validates that field.
   * If called with options or no args, validates all fields.
   */
  function validate(name: string): Promise<string | undefined>;
  function validate(options?: ValidateOptions): Promise<Errors>;
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Legitimate complexity for unified validation API
  async function validate(nameOrOptions?: string | ValidateOptions): Promise<string | undefined | Errors> {
    // Validate single field
    if (typeof nameOrOptions === 'string') {
      const name = nameOrOptions;
      isValidating = true;
      scheduleNotify();

      try {
        const errorMsg = await runFieldValidators(name);
        if (errorMsg) {
          errors.set(name, errorMsg);
        } else {
          errors.delete(name);
        }
        return errorMsg;
      } finally {
        isValidating = false;
        scheduleNotify();
      }
    }

    // Validate all fields
    const options = nameOrOptions;
    isValidating = true;
    scheduleNotify();
    const signal = options?.signal;

    try {
      const nextErrors: Errors = new Map();

      // Collect fields to validate
      let fieldsToValidate = new Set<string>([...Object.keys(fieldConfigs), ...formData.keys()]);
      if (options?.onlyTouched) {
        fieldsToValidate = new Set(Array.from(fieldsToValidate).filter((name) => touched.has(name)));
      }
      if (options?.fields && options.fields.length > 0) {
        fieldsToValidate = new Set(options.fields);
      }

      // Run field validators
      for (const name of fieldsToValidate) {
        if (signal?.aborted) {
          throw new Error('Validation aborted');
        }
        const errorMsg = await runFieldValidators(name, signal);
        if (errorMsg) nextErrors.set(name, errorMsg);
      }

      // Run form-level validator
      try {
        const formErrors = await runFormValidator(signal);
        for (const [name, message] of formErrors.entries()) {
          nextErrors.set(name, message);
        }
      } catch (err) {
        nextErrors.set('', err instanceof Error ? err.message : String(err));
      }

      setErrors(nextErrors);
      return nextErrors;
    } finally {
      isValidating = false;
      scheduleNotify();
    }
  }

  /* -------------------- Form Submission -------------------- */
  async function submit(
    onSubmit: (formData: FormData) => MaybePromise<any>,
    options?: { signal?: AbortSignal; validate?: boolean },
  ) {
    if (isSubmitting) throw new Error('Form is already being submitted');

    submitCount += 1;
    isSubmitting = true;
    scheduleNotify();

    const signal = options?.signal;

    try {
      if (options?.validate ?? true) {
        await validate({ signal });
      }

      if (errors.size > 0) {
        throw new ValidationError(errors);
      }

      return await onSubmit(formData);
    } finally {
      isSubmitting = false;
      scheduleNotify();
    }
  }

  /* -------------------- Subscriptions -------------------- */
  function subscribe(listener: Listener) {
    listeners.add(listener);
    try {
      listener(buildSnapshot());
    } catch {
      /* swallow */
    }
    return () => listeners.delete(listener);
  }

  function subscribeField(name: string, listener: FieldListener<any>) {
    let listenerSet = fieldListeners.get(name);
    if (!listenerSet) {
      listenerSet = new Set();
      fieldListeners.set(name, listenerSet);
    }
    listenerSet.add(listener);
    try {
      listener({
        dirty: dirty.has(name),
        error: errors.get(name),
        touched: touched.has(name),
        value: get(name),
      });
    } catch {
      /* swallow */
    }
    return () => {
      const set = fieldListeners.get(name);
      set?.delete(listener);
      if (set?.size === 0) fieldListeners.delete(name);
    };
  }

  /* -------------------- Field Binding -------------------- */
  function bind(name: string, config?: BindConfig) {
    const valueExtractor =
      config?.valueExtractor ??
      ((event: any) => (event && typeof event === 'object' && 'target' in event ? (event.target as any).value : event));
    const markTouchedOnBlur = config?.markTouchedOnBlur ?? true;

    const setter = (newValue: any | ((prev: any) => any)) => {
      const previousValue = get(name);
      const nextValue = typeof newValue === 'function' ? (newValue as (prev: any) => any)(previousValue) : newValue;
      set(name, nextValue, { setDirty: true, setTouched: true });
    };

    const onChange = (event: any) => {
      setter(valueExtractor(event));
    };

    const onBlur = () => {
      if (markTouchedOnBlur) {
        setTouched(name);
      }
    };

    return {
      name,
      onBlur,
      onChange,
      set: setter,
      get value() {
        return get(name);
      },
      set value(newValue: any) {
        setter(newValue);
      },
    };
  }

  /* -------------------- Reset -------------------- */
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: -
  function reset(newFormData?: FormData | Record<string, any>) {
    for (const key of [...formData.keys()]) formData.delete(key);
    errors.clear();
    touched.clear();
    dirty.clear();
    initialSnapshot.clear();

    if (newFormData instanceof FormData) {
      for (const [name, value] of newFormData.entries()) {
        formData.append(name, value);
        initialSnapshot.set(name, normalizeForComparison(value));
      }
    } else if (newFormData) {
      for (const [name, value] of Object.entries(flattenObject(newFormData))) {
        set(name, value, { setDirty: false });
        initialSnapshot.set(name, normalizeForComparison(value));
      }
    } else {
      for (const [name, value] of Object.entries(flatInitialValues)) {
        set(name, value, { setDirty: false });
        initialSnapshot.set(name, normalizeForComparison(value));
      }
    }

    scheduleNotify();
  }

  /* -------------------- State Snapshot -------------------- */

  /* -------------------- Utility Helpers -------------------- */

  function dispose(): void {
    listeners.clear();
    fieldListeners.clear();
  }

  /**
   * Clone the FormData for safe external mutation.
   */
  function clone(): FormData {
    const cloned = new FormData();
    for (const [name, value] of formData.entries()) {
      cloned.append(name, value);
    }
    return cloned;
  }

  /* -------------------- Return Public API -------------------- */
  return {
    bind,
    clone,
    dispose,
    get,
    getError,
    getErrors,
    isDirty,
    isTouched,
    reset,
    set,
    setError,
    setErrors,
    setTouched,
    snapshot: buildSnapshot,
    submit,
    subscribe,
    subscribeField,
    validate,
    values,
  };
}
