/** biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: - */
/** biome-ignore-all lint/suspicious/noExplicitAny: - */

// formit - minimal, typed, no array helpers

/** -------------------- Types -------------------- **/

type MaybePromise<T> = T | Promise<T>;
export type Path = string | Array<string | number>;

/**
 * Error thrown when form validation fails during submission
 */
export class ValidationError extends Error {
  public readonly errors: Errors;
  public readonly type = 'validation' as const;

  constructor(errors: Errors) {
    super('Form validation failed');
    this.name = 'ValidationError';
    this.errors = errors;

    // Maintain a proper stack trace for where the error was thrown (V8 only)
    if (typeof (Error as any).captureStackTrace === 'function') {
      (Error as any).captureStackTrace(this, ValidationError);
    }
  }
}

/** -------------------- Path Utilities -------------------- **/

/**
 * Converts a path to an array of keys and indices.
 *
 * @param path - The path to convert (string or array)
 * @returns Array of path segments (strings and numbers)
 *
 * @example
 * ```ts
 * toPathArray('user.name') // ['user', 'name']
 * toPathArray('items[0]') // ['items', 0]
 * toPathArray(['users', 0, 'name']) // ['users', 0, 'name']
 * ```
 */
function toPathArray(path: Path): Array<string | number> {
  if (Array.isArray(path)) return path;

  const pathString = String(path).trim();
  if (!pathString) return [];

  const segments: Array<string | number> = [];
  const regex = /([^.[\]]+)|\[(\d+)]/g;

  // biome-ignore lint/suspicious/noAssignInExpressions: Standard regex iteration pattern
  for (let match: RegExpExecArray | null; (match = regex.exec(pathString)); ) {
    if (match[1] !== undefined) segments.push(match[1]);
    else if (match[2] !== undefined) segments.push(Number(match[2]));
  }

  return segments;
}

/**
 * Converts a path to a dot-notation string key.
 *
 * @param path - The path to convert
 * @returns Dot-notation string representation
 *
 * @example
 * ```ts
 * toKey('user.name') // 'user.name'
 * toKey(['user', 'name']) // 'user.name'
 * toKey(['items', 0, 'title']) // 'items.0.title'
 * ```
 */
function toKey(path: Path): string {
  return toPathArray(path).map(String).join('.');
}

/**
 * Gets a value from an object using a path.
 *
 * @param obj - The object to read from
 * @param path - The path to the value
 * @param fallback - Optional fallback value if path is not found
 * @returns The value at the path, or fallback if not found
 *
 * @example
 * ```ts
 * getAt({ user: { name: 'Alice' } }, 'user.name') // 'Alice'
 * getAt({ items: [{ id: 1 }] }, 'items[0].id') // 1
 * getAt({}, 'missing', 'default') // 'default'
 * ```
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
 * Sets a value in an object using a path (immutably).
 *
 * @param obj - The object to update
 * @param path - The path where to set the value
 * @param value - The value to set
 * @returns A new object with the value set at the path
 *
 * @example
 * ```ts
 * setAt({}, 'user.name', 'Alice')
 * // { user: { name: 'Alice' } }
 *
 * setAt({}, 'items[0].title', 'First')
 * // { items: [{ title: 'First' }] }
 *
 * setAt({ count: 1 }, 'count', 2)
 * // { count: 2 }
 * ```
 */
function setAt(obj: any, path: Path, value: any): any {
  const pathSegments = toPathArray(path);

  if (pathSegments.length === 0) return value;

  // Create a shallow copy of root - detect if you should be arrayed
  const firstSegment = pathSegments[0];
  const rootShouldBeArray = typeof firstSegment === 'number';
  const root = Array.isArray(obj) ? [...obj] : rootShouldBeArray ? [] : { ...(obj ?? {}) };

  let current: any = root;

  for (let i = 0; i < pathSegments.length; i++) {
    const segment = pathSegments[i];
    const isLastSegment = i === pathSegments.length - 1;

    if (isLastSegment) {
      current[segment as any] = value;
    } else {
      const nextSegment = pathSegments[i + 1];
      const nextValue = current[segment as any];

      // Determine if the next level should be an array (numeric key) or object
      const shouldBeArray = typeof nextSegment === 'number';

      let copy: any;
      if (Array.isArray(nextValue)) {
        copy = [...nextValue];
      } else if (nextValue && typeof nextValue === 'object') {
        copy = { ...nextValue };
      } else {
        // Create a new container-array if the next segment is numeric, object otherwise
        copy = shouldBeArray ? [] : {};
      }

      current[segment as any] = copy;
      current = copy;
    }
  }

  return root;
}

/** -------------------- Form Types -------------------- **/

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

export type BindConfig = {
  /**
   * Custom value extractor from event
   * @default (event) => event?.target?.value ?? event
   */
  valueExtractor?: (event: any) => any;
  /**
   * Whether to mark field as touched on blur
   * @default true
   */
  markTouchedOnBlur?: boolean;
};

/** -------------------- Form Creation -------------------- **/

export function createForm<TForm extends Record<string, any> = Record<string, any>>(init: FormInit<TForm> = {}) {
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

  /** -------------------- Internal Helpers -------------------- **/

  /**
   * Initialize form values from initial values and field configs.
   *
   * @param initialValues - The initial form values
   * @param configs - Field configurations with initialValue properties
   * @returns Merged form values with field config initial values applied
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
   * Schedule notification to all listeners (debounced to next tick).
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
   * Notify all form and field listeners of state changes.
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
   * Convert validator result to error message string.
   */
  function resultToErrorMessage(result: any): string | undefined {
    if (!result) return undefined;
    if (typeof result === 'string') return result;

    // Object with error messages - join all non-empty values
    if (typeof result === 'object') {
      const errorMessages = Object.values(result).filter(Boolean) as string[];
      return errorMessages.length > 0 ? errorMessages.join('; ') : undefined;
    }

    return undefined;
  }

  /**
   * Run all validators for a specific field.
   *
   * @param pathKey - The field path key to validate
   * @param signal - Optional AbortSignal for cancellation
   * @returns Error message if validation failed, undefined otherwise
   *
   * @throws {DOMException} When validation is aborted via signal
   */
  async function runFieldValidators(pathKey: string, signal?: AbortSignal): Promise<string | undefined> {
    const config = fieldConfigs[pathKey];
    if (!config?.validators) return undefined;

    const validators = Array.isArray(config.validators) ? config.validators : [config.validators];
    const fieldValue = getAt(values, pathKey);

    for (const validator of validators) {
      if (signal?.aborted) {
        throw new Error('Validation aborted');
      }

      const result = await validator(fieldValue, values);
      const errorMessage = resultToErrorMessage(result);
      if (errorMessage) return errorMessage;
    }

    return undefined;
  }

  /**
   * Run the form-level validator.
   *
   * @param signal - Optional AbortSignal for cancellation
   * @returns Object with field errors, or empty object if no errors
   *
   * @throws {DOMException} When validation is aborted via signal
   */
  async function runFormValidator(signal?: AbortSignal): Promise<Errors> {
    if (!formValidator) return {};

    if (signal?.aborted) {
      throw new Error('Validation aborted');
    }

    const result = await formValidator(values);
    return (result ?? {}) as Errors;
  }

  /** -------------------- Public API - Value Management -------------------- **/

  /**
   * Get all form values.
   */
  function getValues(): TForm {
    return values;
  }

  /**
   * Get a specific field value by path.
   *
   * @param path - The field path (e.g., 'user.name' or ['items', 0, 'title'])
   * @returns The value at the specified path
   */
  function getValue(path: Path) {
    return getAt(values, path);
  }

  /**
   * Set a specific field value by a path.
   *
   * @param path - The field path (e.g., 'user.name' or ['items', 0, 'title'])
   * @param value - The value to set
   * @param options - Optional configuration
   * @param options.markDirty - Whether to mark the field as dirty (default: true)
   * @param options.markTouched - Whether to mark the field as touched (default: false)
   * @returns The value that was set
   */
  function setValue(path: Path, value: any, options: { markDirty?: boolean; markTouched?: boolean } = {}) {
    const key = toKey(path);
    const previousValue = getAt(values, path);

    values = setAt(values, path, value) as TForm;

    if (options.markDirty ?? true) {
      // Reference equality check - objects/arrays with same content but different refs will be marked dirty
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
   * Set multiple form values at once.
   *
   * @param nextValues - Partial form values to merge or replace
   * @param options - Optional configuration
   * @param options.replace - If true, replaces all values; if false, merges with existing (default: false)
   * @param options.markAllDirty - If true, marks all changed fields as dirty (default: false)
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

  /** -------------------- Public API - Error Management -------------------- **/

  /**
   * Get all form errors.
   *
   * @returns Object containing all field errors keyed by field path
   */
  function getErrors() {
    return errors;
  }

  /**
   * Get a specific field error by path.
   *
   * @param path - The field path
   * @returns Error message for the field, or undefined if no error
   */
  function getError(path: Path) {
    return errors[toKey(path)];
  }

  /**
   * Set a specific field error by path.
   *
   * @param path - The field path
   * @param message - Error message to set, or undefined to clear the error
   */
  function setError(path: Path, message?: string) {
    const key = toKey(path);

    if (message) {
      errors = { ...errors, [key]: message };
      scheduleNotify();
      return;
    }

    // Clear error
    if (!(key in errors)) return;

    const copy = { ...errors };
    delete copy[key];
    errors = copy;
    scheduleNotify();
  }

  /**
   * Reset all form errors.
   *
   * @remarks
   * Clears all error messages and triggers a state notification.
   */
  function resetErrors() {
    errors = {};
    scheduleNotify();
  }

  /** -------------------- Public API - Touch Management -------------------- **/

  /**
   * Mark a field as touched.
   *
   * @param path - The field path to mark as touched
   *
   * @remarks
   * Touched fields are typically used to show validation errors only after user interaction.
   */
  function markTouched(path: Path) {
    touched[toKey(path)] = true;
    scheduleNotify();
  }

  /** -------------------- Public API - Validation -------------------- **/

  /**
   * Validate a single field.
   *
   * @param path - The field path to validate
   * @param signal - Optional AbortSignal for cancellation
   * @returns Error message if validation failed, undefined otherwise
   *
   * @throws {DOMException} When validation is aborted via signal
   */
  async function validateField(path: Path, signal?: AbortSignal) {
    const key = toKey(path);
    isValidating = true;
    scheduleNotify();

    try {
      const error = await runFieldValidators(key, signal);

      // Update errors object immutably
      if (error) {
        errors = { ...errors, [key]: error };
      } else {
        const { [key]: _, ...rest } = errors;
        errors = rest;
      }

      return error;
    } finally {
      isValidating = false;
      scheduleNotify();
    }
  }

  /**
   * Validate all fields and form-level validators.
   *
   * @param options - Optional validation configuration
   * @param options.signal - Optional AbortSignal for cancellation
   * @param options.onlyTouched - If true, only validate touched fields
   * @param options.fields - If provided, only validate these specific fields
   * @returns Object containing all field errors
   *
   * @throws {Error} When validation is aborted via signal
   */
  async function validateAll(options?: { signal?: AbortSignal; onlyTouched?: boolean; fields?: string[] }) {
    isValidating = true;
    scheduleNotify();

    const signal = options?.signal;

    try {
      const nextErrors: Errors = {};

      // Collect all field paths to validate
      let fieldsToValidate = new Set<string>([...Object.keys(fieldConfigs), ...Object.keys(values)]);

      // Filter by touched fields if requested
      if (options?.onlyTouched) {
        fieldsToValidate = new Set(Array.from(fieldsToValidate).filter((key) => touched[key]));
      }

      // Filter by specific fields if requested
      if (options?.fields && options.fields.length > 0) {
        fieldsToValidate = new Set(options.fields);
      }

      // Run field validators
      for (const path of fieldsToValidate) {
        if (signal?.aborted) {
          throw new Error('Validation aborted');
        }

        const error = await runFieldValidators(path, signal);
        if (error) nextErrors[path] = error;
      }

      // Run form-level validator
      try {
        const formErrors = await runFormValidator(signal);
        Object.assign(nextErrors, formErrors);
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

  /** -------------------- Public API - Form Submission -------------------- **/

  /**
   * Submit the form with optional validation.
   *
   * @param onSubmit - Callback function to handle form submission with validated values
   * @param options - Optional configuration
   * @param options.signal - Optional AbortSignal for cancellation
   * @param options.validate - Whether to run validation before submission (default: true)
   * @returns Promise resolving to the result of onSubmit callback
   *
   * @throws {ValidationError} When validation fails and form has errors
   * @throws {Error} When form is already submitting
   * @throws {Error} When submission is aborted via signal
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
        await validateAll({ signal });
      }

      // Check for validation errors
      const hasErrors = Object.keys(errors).length > 0;
      if (hasErrors) {
        isSubmitting = false;
        scheduleNotify();
        return Promise.reject(new ValidationError(errors));
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

  /** -------------------- Public API - Subscriptions -------------------- **/

  /**
   * Subscribe to form state changes.
   *
   * @param listener - Callback function that receives form state snapshots
   * @returns Unsubscribe function to stop listening to state changes
   *
   * @remarks
   * The listener is immediately called with the current state upon subscription.
   * Listener errors are swallowed to prevent breaking other listeners.
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
   * Subscribe to a specific field's changes.
   *
   * @param path - The field path to subscribe to
   * @param listener - Callback function that receives field state updates
   * @returns Unsubscribe function to stop listening to field changes
   */
  function subscribeField(path: Path, listener: FieldListener<any>) {
    const key = toKey(path);
    let listenerSet = fieldListeners.get(key);

    if (!listenerSet) {
      listenerSet = new Set();
      fieldListeners.set(key, listenerSet);
    }

    listenerSet.add(listener);

    // Immediately notify the new listener with the current state
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

    return () => {
      listenerSet!.delete(listener);
      // Clean up empty listener sets to prevent memory leaks
      if (listenerSet!.size === 0) {
        fieldListeners.delete(key);
      }
    };
  }

  /** -------------------- Public API - Field Binding -------------------- **/

  /**
   * Create a binding object for a field that can be used with inputs.
   *
   * @param path - The field path to bind
   * @param config - Optional configuration for value extraction and blur behavior
   * @returns Object with value, onChange, onBlur, and setter methods for input binding
   *
   * @example
   * ```tsx
   * const nameBinding = bind('user.name');
   * <input {...nameBinding} />
   *
   * // With custom value extractor
   * const selectBinding = bind('category', {
   *   valueExtractor: (e) => e.target.selectedOptions[0].value
   * });
   *
   * // Disable mark touched on blur
   * const fieldBinding = bind('field', { markTouchedOnBlur: false });
   * ```
   */
  function bind(path: Path, config?: BindConfig) {
    const key = toKey(path);
    const valueExtractor =
      config?.valueExtractor ??
      ((event: any) => (event && typeof event === 'object' && 'target' in event ? (event.target as any).value : event));
    const markTouchedOnBlur = config?.markTouchedOnBlur ?? true;

    const setter = (newValue: any | ((prev: any) => any)) => {
      const previousValue = getAt(values, path);
      const nextValue = typeof newValue === 'function' ? (newValue as (prev: any) => any)(previousValue) : newValue;

      setValue(path, nextValue, { markDirty: true, markTouched: true });
    };

    const onChange = (event: any) => {
      const value = valueExtractor(event);
      setter(value);
    };

    const onBlur = () => {
      if (markTouchedOnBlur) {
        markTouched(path);
      }
    };

    return {
      name: key,
      onBlur,
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

  function isDirty(path: Path): boolean {
    return dirty[toKey(path)] || false;
  }

  function isTouched(path: Path): boolean {
    return touched[toKey(path)] || false;
  }

  function reset(initialValues?: TForm) {
    values = initializeValues(initialValues ?? init.initialValues ?? ({} as TForm), fieldConfigs);
    errors = {};
  }

  function setErrors(next: Errors) {
    errors = { ...next };
    scheduleNotify();
  }

  /** -------------------- Return Public API -------------------- **/

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
    isDirty,
    isTouched,
    markTouched,
    reset,
    resetErrors,
    setError,
    setErrors,
    setValue,
    setValues,
    submit,
    subscribe,
    subscribeField,
    validateAll,
    validateField,
  };
}
