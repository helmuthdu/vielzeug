/** biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: - */
/** biome-ignore-all lint/suspicious/noExplicitAny: - */

// formit - minimal, typed, no array helpers

// ============================================================================
// Types
// ============================================================================

type MaybePromise<T> = T | Promise<T>;
export type Path = string | Array<string | number>;

// ============================================================================
// Path Utilities
// ============================================================================

/**
 * Converts a path to an array of keys and indices.
 * Supports dot notation (a.b.c) and bracket notation (a[0].b)
 */
function toPathArray(path: Path): Array<string | number> {
  if (Array.isArray(path)) return path;

  const pathString = String(path).trim();
  if (!pathString) return [];

  const pathSegmentRegex = /([^.[\]]+)|\[(\d+)]/g;
  const segments: Array<string | number> = [];
  let match: RegExpExecArray | null = pathSegmentRegex.exec(pathString);

  while (match) {
    // Property name (e.g., "name" from "name" or "user.name")
    if (match[1] !== undefined) {
      segments.push(match[1]);
    }
    // Array index (e.g., 0 from "[0]")
    else if (match[2] !== undefined) {
      segments.push(Number(match[2]));
    }

    match = pathSegmentRegex.exec(pathString);
  }

  return segments;
}

/**
 * Converts a path to a dot-notation string key
 */
function toKey(path: Path): string {
  return toPathArray(path).map(String).join('.');
}

/**
 * Gets a value from an object using a path
 */
function getAt(obj: any, path: Path, fallback?: any): any {
  const pathSegments = toPathArray(path);
  let current = obj;

  for (const segment of pathSegments) {
    if (current == null) return fallback;
    current = current[segment as any];
  }

  return current === undefined ? fallback : current;
}

/**
 * Sets a value in an object using a path (immutably)
 * Returns a new object with the value set
 */
function setAt(obj: any, path: Path, value: any): any {
  const pathSegments = toPathArray(path);

  if (pathSegments.length === 0) return value;

  // Create shallow copy of root
  const root = Array.isArray(obj) ? [...obj] : { ...(obj ?? {}) };
  let current: any = root;

  for (let i = 0; i < pathSegments.length; i++) {
    const segment = pathSegments[i];
    const isLastSegment = i === pathSegments.length - 1;

    if (isLastSegment) {
      current[segment as any] = value;
    } else {
      const nextValue = current[segment as any];
      const copy = Array.isArray(nextValue)
        ? [...nextValue]
        : nextValue && typeof nextValue === 'object'
          ? { ...nextValue }
          : {};

      current[segment as any] = copy;
      current = copy;
    }
  }

  return root;
}

// ============================================================================
// Form Types
// ============================================================================

export type Errors = Partial<Record<string, string>>;

export type FieldValidator<TValue, TForm> =
  | ((value: TValue, values: TForm) => MaybePromise<string | undefined | null>)
  | ((value: TValue, values: TForm) => MaybePromise<Record<string, string> | undefined | null>);

export type FormValidator<TForm> = (values: TForm) => MaybePromise<Errors | undefined | null>;

export type FieldConfig<TValue, TForm> = {
  initialValue?: TValue;
  validators?: FieldValidator<TValue, TForm> | Array<FieldValidator<TValue, TForm>>;
};

export type FormInit<TForm extends Record<string, any> = Record<string, any>> = {
  initialValues?: TForm;
  fields?: Partial<{ [K in keyof TForm & string]: FieldConfig<TForm[K], TForm> }>;
  validate?: FormValidator<TForm>;
};

export type FormState<TForm> = {
  values: TForm;
  errors: Errors;
  touched: Record<string, boolean>;
  dirty: Record<string, boolean>;
  isValidating: boolean;
  isSubmitting: boolean;
  submitCount: number;
};

type Listener<TForm> = (state: FormState<TForm>) => void;
type FieldListener<TValue> = (payload: { value: TValue; error?: string; touched: boolean; dirty: boolean }) => void;

// ============================================================================
// Form Creation
// ============================================================================

export function createForm<TForm extends Record<string, any> = Record<string, any>>(init: FormInit<TForm> = {}) {
  // ============================================================================
  // Initialization
  // ============================================================================

  const fieldConfigs = (init.fields ?? {}) as Partial<Record<string, FieldConfig<any, TForm>>>;
  const formValidator = init.validate;

  // Initialize values with initial values and field configs
  let values = initializeValues(init.initialValues ?? ({} as TForm), fieldConfigs);
  let errors: Errors = {};
  const touched: Record<string, boolean> = {};
  const dirty: Record<string, boolean> = {};
  let isValidating = false;
  let isSubmitting = false;
  let submitCount = 0;

  const listeners = new Set<Listener<TForm>>();
  const fieldListeners = new Map<string, Set<FieldListener<any>>>();

  // ============================================================================
  // Internal Helpers
  // ============================================================================

  /**
   * Initialize form values from initial values and field configs
   */
  function initializeValues(initialValues: TForm, configs: Partial<Record<string, FieldConfig<any, TForm>>>): TForm {
    let result = { ...initialValues };

    for (const key of Object.keys(configs)) {
      const config = configs[key];
      if (config?.initialValue !== undefined && getAt(result, key) === undefined) {
        result = setAt(result, key, config.initialValue) as TForm;
      }
    }

    return result;
  }

  /**
   * Schedule notification to all listeners (debounced to next tick)
   */
  let scheduled = false;
  function scheduleNotify() {
    if (scheduled) return;
    scheduled = true;

    Promise.resolve().then(() => {
      scheduled = false;
      notifyListeners();
    });
  }

  /**
   * Notify all form and field listeners of state changes
   */
  function notifyListeners() {
    const snapshot: FormState<TForm> = {
      dirty: { ...dirty },
      errors,
      isSubmitting,
      isValidating,
      submitCount,
      touched: { ...touched },
      values,
    };

    // Notify form listeners
    for (const listener of listeners) {
      try {
        listener(snapshot);
      } catch {
        // Swallow listener errors to prevent breaking other listeners
      }
    }

    // Notify field listeners
    for (const [path, listenerSet] of fieldListeners.entries()) {
      const value = getAt(values, path);
      const error = errors[path];
      const isTouched = touched[path] || false;
      const isDirty = dirty[path] || false;

      for (const fieldListener of listenerSet) {
        try {
          fieldListener({ dirty: isDirty, error, touched: isTouched, value });
        } catch {
          // Swallow listener errors
        }
      }
    }
  }

  /**
   * Run all validators for a specific field
   */
  async function runFieldValidators(pathKey: string, signal?: AbortSignal): Promise<string | undefined> {
    const config = fieldConfigs[pathKey];
    if (!config?.validators) return undefined;

    const validators = Array.isArray(config.validators) ? config.validators : [config.validators];
    const fieldValue = getAt(values, pathKey);

    for (const validator of validators) {
      if (signal?.aborted) {
        throw new DOMException('Validation aborted', 'AbortError');
      }

      const result = await validator(fieldValue, values);
      if (!result) continue;

      // String error message
      if (typeof result === 'string') {
        return result;
      }

      // Object with error messages
      if (typeof result === 'object') {
        const errorMessages = Object.values(result).filter(Boolean) as string[];
        if (errorMessages.length > 0) {
          return errorMessages.join('; ');
        }
      }
    }

    return undefined;
  }

  /**
   * Run the form-level validator
   */
  async function runFormValidator(signal?: AbortSignal): Promise<Errors> {
    if (!formValidator) return {};

    if (signal?.aborted) {
      throw new DOMException('Validation aborted', 'AbortError');
    }

    const result = await formValidator(values);
    return (result ?? {}) as Errors;
  }

  // ============================================================================
  // Public API - Value Management
  // ============================================================================

  /**
   * Get all form values
   */
  function getValues(): TForm {
    return values;
  }

  /**
   * Get a specific field value by path
   */
  function getValue(path: Path) {
    return getAt(values, path);
  }

  /**
   * Set a specific field value by path
   */
  function setValue(path: Path, value: any, options: { markDirty?: boolean; markTouched?: boolean } = {}) {
    const key = toKey(path);
    const previousValue = getAt(values, path);

    values = setAt(values, path, value) as TForm;

    if (options.markDirty ?? true) {
      if (previousValue !== value) {
        dirty[key] = true;
      }
    }

    if (options.markTouched) {
      touched[key] = true;
    }

    scheduleNotify();
    return value;
  }

  /**
   * Set multiple form values at once
   */
  function setValues(nextValues: Partial<TForm>, options: { replace?: boolean; markAllDirty?: boolean } = {}) {
    if (options.replace) {
      values = { ...nextValues } as TForm;
    } else {
      values = { ...values, ...nextValues } as TForm;
    }

    if (options.markAllDirty) {
      for (const key of Object.keys(nextValues)) {
        dirty[key] = true;
      }
    }

    scheduleNotify();
  }

  // ============================================================================
  // Public API - Error Management
  // ============================================================================

  /**
   * Get all form errors
   */
  function getErrors() {
    return errors;
  }

  /**
   * Get a specific field error by path
   */
  function getError(path: Path) {
    return errors[toKey(path)];
  }

  /**
   * Set a specific field error by path
   */
  function setError(path: Path, message?: string) {
    const key = toKey(path);

    if (message) {
      errors = { ...errors, [key]: message };
    } else {
      if (!(key in errors)) return;
      const copy = { ...errors };
      delete copy[key];
      errors = copy;
    }

    scheduleNotify();
  }

  /**
   * Reset all form errors
   */
  function resetErrors() {
    errors = {};
    scheduleNotify();
  }

  // ============================================================================
  // Public API - Touch Management
  // ============================================================================

  /**
   * Mark a field as touched
   */
  function markTouched(path: Path) {
    touched[toKey(path)] = true;
    scheduleNotify();
  }

  // ============================================================================
  // Public API - Validation
  // ============================================================================

  /**
   * Validate a single field
   */
  async function validateField(path: Path, signal?: AbortSignal) {
    const key = toKey(path);
    isValidating = true;
    scheduleNotify();

    try {
      const error = await runFieldValidators(key, signal);

      if (error) {
        errors = { ...errors, [key]: error };
      } else {
        const copy = { ...errors };
        delete copy[key];
        errors = copy;
      }

      return error;
    } finally {
      isValidating = false;
      scheduleNotify();
    }
  }

  /**
   * Validate all fields and form-level validators
   */
  async function validateAll(signal?: AbortSignal) {
    isValidating = true;
    scheduleNotify();

    try {
      const nextErrors: Errors = { ...errors };

      // Collect all field paths to validate
      const fieldsToValidate = new Set<string>([...Object.keys(fieldConfigs), ...Object.keys(values)]);

      // Run field validators
      for (const path of fieldsToValidate) {
        if (signal?.aborted) {
          throw new DOMException('Validation aborted', 'AbortError');
        }

        const error = await runFieldValidators(path, signal);
        if (error) {
          nextErrors[path] = error;
        } else {
          delete nextErrors[path];
        }
      }

      // Run form-level validator
      try {
        const formErrors = await runFormValidator(signal);
        for (const key of Object.keys(formErrors)) {
          const errorMessage = formErrors[key];
          if (errorMessage) {
            nextErrors[key] = errorMessage;
          } else {
            delete nextErrors[key];
          }
        }
      } catch (error) {
        nextErrors[''] = error instanceof Error ? error.message : String(error);
      }

      errors = nextErrors;
      return errors;
    } finally {
      isValidating = false;
      scheduleNotify();
    }
  }

  // ============================================================================
  // Public API - Form Submission
  // ============================================================================

  /**
   * Submit the form with optional validation
   */
  async function submit(
    onSubmit: (values: TForm) => MaybePromise<any>,
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
      // Run validation if requested
      if (options?.validate ?? true) {
        await validateAll(signal);
      }

      // Check for validation errors
      const hasErrors = Object.keys(errors).length > 0;
      if (hasErrors) {
        isSubmitting = false;
        scheduleNotify();
        return Promise.reject({ errors, type: 'validation' });
      }

      // Execute submit handler
      const result = await onSubmit(values);

      isSubmitting = false;
      scheduleNotify();

      return result;
    } catch (error) {
      isSubmitting = false;
      scheduleNotify();
      throw error;
    }
  }

  // ============================================================================
  // Public API - Subscriptions
  // ============================================================================

  /**
   * Subscribe to form state changes
   * @returns Unsubscribe function
   */
  function subscribe(listener: Listener<TForm>) {
    listeners.add(listener);

    // Immediately notify the new listener with current state
    try {
      listener({
        dirty: { ...dirty },
        errors,
        isSubmitting,
        isValidating,
        submitCount,
        touched: { ...touched },
        values,
      });
    } catch {
      // Swallow listener errors
    }

    return () => listeners.delete(listener);
  }

  /**
   * Subscribe to a specific field's changes
   * @returns Unsubscribe function
   */
  function subscribeField(path: Path, listener: FieldListener<any>) {
    const key = toKey(path);
    let listenerSet = fieldListeners.get(key);

    if (!listenerSet) {
      listenerSet = new Set();
      fieldListeners.set(key, listenerSet);
    }

    listenerSet.add(listener);

    // Immediately notify the new listener with current state
    try {
      listener({
        dirty: dirty[key] || false,
        error: errors[key],
        touched: touched[key] || false,
        value: getAt(values, key),
      });
    } catch {
      // Swallow listener errors
    }

    return () => listenerSet!.delete(listener);
  }

  // ============================================================================
  // Public API - Field Binding
  // ============================================================================

  /**
   * Create a binding object for a field that can be used with inputs
   */
  function bind(path: Path) {
    const key = toKey(path);

    const setter = (newValue: any | ((prev: any) => any)) => {
      const previousValue = getAt(values, path);
      const nextValue = typeof newValue === 'function' ? (newValue as (prev: any) => any)(previousValue) : newValue;

      setValue(path, nextValue, { markDirty: true, markTouched: true });
    };

    const onChange = (event: any) => {
      const value = event && typeof event === 'object' && 'target' in event ? (event.target as any).value : event;
      setter(value);
    };

    return {
      name: key,
      onChange,
      set: setter,
      get value() {
        return getAt(values, key);
      },
      set value(newValue: any) {
        setter(newValue);
      },
    };
  }

  // ============================================================================
  // Return Public API
  // ============================================================================

  return {
    bind,
    getError,
    getErrors,
    getStateSnapshot: (): FormState<TForm> => ({
      dirty: { ...dirty },
      errors,
      isSubmitting,
      isValidating,
      submitCount,
      touched: { ...touched },
      values,
    }),
    getValue,
    getValues,
    markTouched,
    resetErrors,
    setError,
    setValue,
    setValues,
    submit,
    subscribe,
    subscribeField,
    validateAll,
    validateField,
  };
}
