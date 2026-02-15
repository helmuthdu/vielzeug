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
    // Check if this is a FieldConfig MUST have 'validators' property
    const isFieldConfig =
      fieldValue !== null &&
      typeof fieldValue === 'object' &&
      !Array.isArray(fieldValue) &&
      !(fieldValue instanceof Date) &&
      !(fieldValue instanceof File) &&
      !(fieldValue instanceof Blob) &&
      !(fieldValue instanceof FileList) &&
      'validators' in fieldValue; // Must have validators to be a FieldConfig

    if (isFieldConfig) {
      // It's a FieldConfig - store validators and value separately
      fieldConfigs[key] = fieldValue as FieldConfig;
      if ('value' in fieldValue) {
        initialValues[key] = fieldValue.value;
      }
    } else {
      // It's a plain value or nested object
      initialValues[key] = fieldValue;
    }
  }

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

  /**
   * Flatten nested objects into dot notation paths.
   * E.g., { user: { name: 'Alice' } } -> { 'user.name': 'Alice' }
   */

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: -
  function flattenObject(obj: any, prefix = ''): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;

      if (value === null || value === undefined) {
        result[path] = value;
      } else if (value instanceof File || value instanceof Blob || value instanceof FileList) {
        result[path] = value;
      } else if (Array.isArray(value)) {
        result[path] = value;
      } else if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
        // Only flatten plain objects, not class instances
        Object.assign(result, flattenObject(value, path));
      } else {
        result[path] = value;
      }
    }

    return result;
  }

  /**
   * Normalize value to string for dirty comparison.
   * Files are compared by name + size, others by string representation.
   */
  function normalizeForComparison(value: any): string {
    if (value === null || value === undefined) return '';
    if (value instanceof File) return `File:${value.name}:${value.size}`;
    if (value instanceof Blob) return `Blob:${value.size}`;
    if (value instanceof FileList) {
      const names: string[] = [];
      for (let i = 0; i < value.length; i++) {
        names.push(`File:${value[i].name}:${value[i].size}`);
      }
      return names.join('|');
    }
    if (Array.isArray(value)) {
      return value.map(normalizeForComparison).join('|');
    }
    return String(value);
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
    const snapshot: FormState = {
      dirty: new Set(dirty),
      errors: new Map(errors),
      isSubmitting,
      isValidating,
      submitCount,
      touched: new Set(touched),
    };
    // Notify form listeners
    for (const listener of listeners) {
      try {
        listener(snapshot);
      } catch {
        // Swallow errors
      }
    }
    // Notify field listeners
    for (const [name, listenerSet] of fieldListeners.entries()) {
      const value = get(name);
      const error = errors.get(name);
      const isTouched = touched.has(name);
      const isDirty = dirty.has(name);
      for (const fieldListener of listenerSet) {
        try {
          fieldListener({ dirty: isDirty, error, touched: isTouched, value });
        } catch {
          // Swallow errors
        }
      }
    }
  }
  function resultToErrorMessage(result: any): string | undefined {
    if (!result) return undefined;
    if (typeof result === 'string') return result;
    return undefined;
  }
  async function runFieldValidators(name: string, signal?: AbortSignal): Promise<string | undefined> {
    const config = fieldConfigs[name];
    if (!config?.validators) return undefined;
    const validators = Array.isArray(config.validators) ? config.validators : [config.validators];
    const fieldValue = get(name) ?? ''; // Use get() to properly handle arrays
    for (const validator of validators) {
      if (signal?.aborted) {
        throw new Error('Validation aborted');
      }
      const result = await validator(fieldValue);
      const errorMessage = resultToErrorMessage(result);
      if (errorMessage) return errorMessage;
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
   * Get field value. Returns array if multiple values exist for same name.
   * Returns empty array if field is tracked as array and value is single empty string.
   */
  function get(name: string): any {
    const all = formData.getAll(name);
    if (all.length === 0) return undefined;
    // Empty array marker: single empty string for fields tracked as arrays
    if (all.length === 1 && all[0] === '' && arrayFields.has(name)) return [];
    return all.length > 1 ? all : all[0];
  }

  /**
   * Get all form data as native FormData.
   */
  function data(): FormData {
    return formData;
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

  /**
   * Set field value(s). Supports primitives, Files, FileList, arrays, objects, and FormData.
   */
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: -
  function set(
    nameOrEntries: string | Record<string, any> | FormData,
    valueOrOptions?: any,
    optionsWhenString?: { replace?: boolean; markDirty?: boolean; markTouched?: boolean },
  ) {
    // Detect if we're in single-field or bulk mode
    const isSingleField = typeof nameOrEntries === 'string';
    const value = isSingleField ? valueOrOptions : undefined;
    const options = isSingleField ? optionsWhenString || {} : valueOrOptions || {};

    // Handle bulk operations
    if (!isSingleField) {
      const { replace = false, markDirty = false } = options;

      if (replace) {
        for (const key of Array.from(formData.keys())) {
          formData.delete(key);
        }
        // Also clear initial snapshot and dirty state when replacing
        initialSnapshot.clear();
        dirty.clear();
      }

      if (nameOrEntries instanceof FormData) {
        for (const [name, val] of nameOrEntries.entries()) {
          if (!replace) formData.delete(name);
          formData.append(name, val);
          if (replace) {
            // Store new initial values when replacing
            initialSnapshot.set(name, normalizeForComparison(val));
          }
          if (markDirty) dirty.add(name);
        }
      } else {
        for (const [name, val] of Object.entries(nameOrEntries)) {
          // For single field operations, don't pass markDirty if replace is true
          // because we want to set new initial snapshot
          const singleName = name;
          const singleValue = val;

          formData.delete(singleName);

          if (singleValue === null || singleValue === undefined) {
            // Don't append anything
          } else if (singleValue instanceof File || singleValue instanceof Blob) {
            formData.append(singleName, singleValue);
          } else if (singleValue instanceof FileList) {
            for (let i = 0; i < singleValue.length; i++) {
              formData.append(singleName, singleValue[i]);
            }
          } else if (Array.isArray(singleValue)) {
            for (const item of singleValue) {
              formData.append(singleName, item instanceof File || item instanceof Blob ? item : String(item));
            }
          } else {
            formData.append(singleName, String(singleValue));
          }

          if (replace) {
            // Store new initial values when replacing
            initialSnapshot.set(singleName, normalizeForComparison(singleValue));
          } else if (markDirty) {
            const initialValue = initialSnapshot.get(singleName);
            const currentNormalized = normalizeForComparison(singleValue);

            if (initialValue !== currentNormalized) {
              dirty.add(singleName);
            } else {
              dirty.delete(singleName);
            }
          }
        }
      }

      scheduleNotify();
      return;
    }

    // Handle single field
    const name = nameOrEntries;
    formData.delete(name);

    if (value === null || value === undefined) {
      // Don't append anything
    } else if (value instanceof File || value instanceof Blob) {
      formData.append(name, value);
    } else if (value instanceof FileList) {
      for (let i = 0; i < value.length; i++) {
        formData.append(name, value[i]);
      }
    } else if (Array.isArray(value)) {
      arrayFields.add(name); // Mark this field as an array
      if (value.length === 0) {
        // Empty array - store marker so get() returns [] instead of undefined
        formData.append(name, '');
      } else {
        for (const item of value) {
          formData.append(name, item instanceof File || item instanceof Blob ? item : String(item));
        }
      }
    } else {
      arrayFields.delete(name); // Not an array
      formData.append(name, String(value));
    }

    // Update dirty state
    if (options.markDirty ?? true) {
      const initialValue = initialSnapshot.get(name);
      const currentNormalized = normalizeForComparison(value);

      if (initialValue !== currentNormalized) {
        dirty.add(name);
      } else {
        dirty.delete(name);
      }
    }

    if (options.markTouched) {
      touched.add(name);
    }

    scheduleNotify();
  }

  /* -------------------- Error Management -------------------- */

  // Initialize with flattened initial values
  if (Object.keys(initialValues).length > 0) {
    const flattened = flattenObject(initialValues);
    for (const [name, value] of Object.entries(flattened)) {
      set(name, value, { markDirty: false });
      initialSnapshot.set(name, normalizeForComparison(value));
    }
  }

  /**
   * Get or set errors. If called with no args, returns all errors.
   * If called with name only, returns that error. If called with name and message, sets error.
   */
  function error(name?: string, message?: string): string | undefined | Errors {
    // Get all errors
    if (name === undefined) {
      return new Map(errors);
    }

    // Set error
    if (message !== undefined) {
      if (message) {
        errors.set(name, message);
      } else {
        errors.delete(name);
      }
      scheduleNotify();
      return;
    }

    // Get specific error
    return errors.get(name);
  }

  /**
   * Set multiple errors at once.
   */
  function errors$(nextErrors: Errors | Record<string, string>) {
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

  /**
   * Check if field is touched, or mark it as touched.
   */
  function touch(name: string, mark?: boolean): boolean {
    if (mark) {
      touched.add(name);
      scheduleNotify();
      return true;
    }
    return touched.has(name);
  }

  /**
   * Check if field is dirty (changed from initial value).
   */
  function dirty$(name: string): boolean {
    return dirty.has(name);
  }

  /* -------------------- Validation -------------------- */

  /**
   * Validate field(s). If called with name string, validates that field.
   * If called with options or no args, validates all fields.
   */
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Legitimate complexity for unified validation API
  async function validate(
    nameOrOptions?: string | { signal?: AbortSignal; onlyTouched?: boolean; fields?: string[] },
  ): Promise<string | undefined | Errors> {
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
      let fieldsToValidate = new Set<string>([...Object.keys(fieldConfigs), ...Array.from(formData.keys())]);
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

      errors$(nextErrors);
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
    if (isSubmitting) {
      return Promise.reject(new Error('Form is already being submitted'));
    }

    submitCount += 1;
    isSubmitting = true;
    scheduleNotify();

    const signal = options?.signal;

    try {
      if (options?.validate ?? true) {
        await validate({ signal });
      }

      const hasErrors = errors.size > 0;
      if (hasErrors) {
        isSubmitting = false;
        scheduleNotify();
        return Promise.reject(new ValidationError(errors));
      }

      const result = await onSubmit(formData);
      isSubmitting = false;
      scheduleNotify();
      return result;
    } catch (error) {
      isSubmitting = false;
      scheduleNotify();
      throw error;
    }
  }

  /* -------------------- Subscriptions -------------------- */
  function subscribe(listener: Listener) {
    listeners.add(listener);
    try {
      listener({
        dirty: new Set(dirty),
        errors: new Map(errors),
        isSubmitting,
        isValidating,
        submitCount,
        touched: new Set(touched),
      });
    } catch {
      // Swallow errors
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
      // Swallow errors
    }
    return () => {
      listenerSet!.delete(listener);
      if (listenerSet!.size === 0) {
        fieldListeners.delete(name);
      }
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
      set(name, nextValue, { markDirty: true, markTouched: true });
    };

    const onChange = (event: any) => {
      setter(valueExtractor(event));
    };

    const onBlur = () => {
      if (markTouchedOnBlur) {
        touch(name, true);
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
    // Clear everything
    for (const key of Array.from(formData.keys())) {
      formData.delete(key);
    }
    errors.clear();
    touched.clear();
    dirty.clear();
    initialSnapshot.clear();

    // Reinitialize
    if (newFormData instanceof FormData) {
      for (const [name, value] of newFormData.entries()) {
        formData.append(name, value);
        initialSnapshot.set(name, normalizeForComparison(value));
      }
    } else if (newFormData) {
      const flattened = flattenObject(newFormData);
      for (const [name, value] of Object.entries(flattened)) {
        set(name, value, { markDirty: false });
        initialSnapshot.set(name, normalizeForComparison(value));
      }
    } else {
      // Reset to initial values extracted from fields
      if (Object.keys(initialValues).length > 0) {
        const flattened = flattenObject(initialValues);
        for (const [name, value] of Object.entries(flattened)) {
          set(name, value, { markDirty: false });
          initialSnapshot.set(name, normalizeForComparison(value));
        }
      }
    }

    scheduleNotify();
  }

  /* -------------------- State Snapshot -------------------- */
  function snapshot(): FormState {
    return {
      dirty: new Set(dirty),
      errors: new Map(errors),
      isSubmitting,
      isValidating,
      submitCount,
      touched: new Set(touched),
    };
  }

  /* -------------------- Utility Helpers -------------------- */

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
    clone, // Clone FormData
    data, // Get FormData
    dirty: dirty$, // Check dirty
    error, // Get/set a single error
    errors: errors$, // Set multiple errors
    get, // Get a single field value
    reset,
    set, // Set field value(s) - unified API
    snapshot,
    submit,
    subscribe,
    subscribeField,
    touch, // Check/mark touched
    validate, // Validate field(s) - unified API
    values, // Get as a plain object
  };
}
