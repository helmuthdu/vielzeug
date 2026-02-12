/** biome-ignore-all lint/suspicious/noExplicitAny: - */

/* ============================================
   formit - Lightweight, type-safe form state management
   ============================================ */

/* -------------------- Core Types -------------------- */

type MaybePromise<T> = T | Promise<T>;

export type Path = string | Array<string | number>;

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

export type BindConfig = {
  valueExtractor?: (event: any) => any;
  markTouchedOnBlur?: boolean;
};

type Listener<TForm> = (state: FormState<TForm>) => void;
type FieldListener<TValue> = (payload: { value: TValue; error?: string; touched: boolean; dirty: boolean }) => void;

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

/* -------------------- Path Utilities -------------------- */

/**
 * Converts a path to an array of keys and indices.
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
 */
function toKey(path: Path): string {
  return toPathArray(path).map(String).join('.');
}

/**
 * Gets a value from an object using a path.
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
 */

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: -
function setAt(obj: any, path: Path, value: any): any {
  const pathSegments = toPathArray(path);

  if (pathSegments.length === 0) return value;

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
      const shouldBeArray = typeof nextSegment === 'number';

      let copy: any;
      if (Array.isArray(nextValue)) {
        copy = [...nextValue];
      } else if (nextValue && typeof nextValue === 'object') {
        copy = { ...nextValue };
      } else {
        copy = shouldBeArray ? [] : {};
      }

      current[segment as any] = copy;
      current = copy;
    }
  }

  return root;
}

/* -------------------- Form Creation -------------------- */

export function createForm<TForm extends Record<string, any> = Record<string, any>>(init: FormInit<TForm> = {}) {
  const fieldConfigs = (init.fields ?? {}) as Partial<Record<string, FieldConfig<any, TForm>>>;
  const formValidator = init.validate;

  // State
  let values = initializeValues(init.initialValues ?? ({} as TForm), fieldConfigs);
  let errors: Errors = {};
  const touched: Record<string, boolean> = {};
  const dirty: Record<string, boolean> = {};
  let isValidating = false;
  let isSubmitting = false;
  let submitCount = 0;

  const listeners = new Set<Listener<TForm>>();
  const fieldListeners = new Map<string, Set<FieldListener<any>>>();

  /* -------------------- Internal Helpers -------------------- */

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

  let scheduled = false;
  function scheduleNotify() {
    if (scheduled) return;
    scheduled = true;

    Promise.resolve().then(() => {
      scheduled = false;
      notifyListeners();
    });
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: -
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
        // Swallow listener errors
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

  function resultToErrorMessage(result: any): string | undefined {
    if (!result) return undefined;
    if (typeof result === 'string') return result;

    if (typeof result === 'object') {
      const errorMessages = Object.values(result).filter(Boolean) as string[];
      return errorMessages.length > 0 ? errorMessages.join('; ') : undefined;
    }

    return undefined;
  }

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

  async function runFormValidator(signal?: AbortSignal): Promise<Errors> {
    if (!formValidator) return {};

    if (signal?.aborted) {
      throw new Error('Validation aborted');
    }

    const result = await formValidator(values);
    return (result ?? {}) as Errors;
  }

  /* -------------------- Value Management -------------------- */

  function getValues(): TForm {
    return values;
  }

  function getValue(path: Path) {
    return getAt(values, path);
  }

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

  /* -------------------- Error Management -------------------- */

  function getErrors() {
    return errors;
  }

  function getError(path: Path) {
    return errors[toKey(path)];
  }

  function setError(path: Path, message?: string) {
    const key = toKey(path);

    if (message) {
      errors = { ...errors, [key]: message };
      scheduleNotify();
      return;
    }

    if (!(key in errors)) return;

    const copy = { ...errors };
    delete copy[key];
    errors = copy;
    scheduleNotify();
  }

  function setErrors(next: Errors) {
    errors = { ...next };
    scheduleNotify();
  }

  function resetErrors() {
    errors = {};
    scheduleNotify();
  }

  /* -------------------- Touch Management -------------------- */

  function markTouched(path: Path) {
    touched[toKey(path)] = true;
    scheduleNotify();
  }

  function isTouched(path: Path): boolean {
    return touched[toKey(path)] || false;
  }

  function isDirty(path: Path): boolean {
    return dirty[toKey(path)] || false;
  }

  /* -------------------- Validation -------------------- */

  async function validateField(path: Path, signal?: AbortSignal) {
    const key = toKey(path);
    isValidating = true;
    scheduleNotify();

    try {
      const error = await runFieldValidators(key, signal);

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

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: -
  async function validateAll(options?: { signal?: AbortSignal; onlyTouched?: boolean; fields?: string[] }) {
    isValidating = true;
    scheduleNotify();

    const signal = options?.signal;

    try {
      const nextErrors: Errors = {};

      let fieldsToValidate = new Set<string>([...Object.keys(fieldConfigs), ...Object.keys(values)]);

      if (options?.onlyTouched) {
        fieldsToValidate = new Set(Array.from(fieldsToValidate).filter((key) => touched[key]));
      }

      if (options?.fields && options.fields.length > 0) {
        fieldsToValidate = new Set(options.fields);
      }

      for (const path of fieldsToValidate) {
        if (signal?.aborted) {
          throw new Error('Validation aborted');
        }

        const error = await runFieldValidators(path, signal);
        if (error) nextErrors[path] = error;
      }

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

  /* -------------------- Form Submission -------------------- */

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
      if (options?.validate ?? true) {
        await validateAll({ signal });
      }

      const hasErrors = Object.keys(errors).length > 0;
      if (hasErrors) {
        isSubmitting = false;
        scheduleNotify();
        return Promise.reject(new ValidationError(errors));
      }

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

  /* -------------------- Subscriptions -------------------- */

  function subscribe(listener: Listener<TForm>) {
    listeners.add(listener);

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

  function subscribeField(path: Path, listener: FieldListener<any>) {
    const key = toKey(path);
    let listenerSet = fieldListeners.get(key);

    if (!listenerSet) {
      listenerSet = new Set();
      fieldListeners.set(key, listenerSet);
    }

    listenerSet.add(listener);

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
      if (listenerSet!.size === 0) {
        fieldListeners.delete(key);
      }
    };
  }

  /* -------------------- Field Binding -------------------- */

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

  /* -------------------- Reset -------------------- */

  function reset(initialValues?: TForm) {
    values = initializeValues(initialValues ?? init.initialValues ?? ({} as TForm), fieldConfigs);
    errors = {};
    // Clear-touched and dirty state
    for (const key of Object.keys(touched)) {
      delete touched[key];
    }
    for (const key of Object.keys(dirty)) {
      delete dirty[key];
    }
    scheduleNotify();
  }

  function getStateSnapshot(): FormState<TForm> {
    return {
      dirty: { ...dirty },
      errors,
      isSubmitting,
      isValidating,
      submitCount,
      touched: { ...touched },
      values,
    };
  }

  /* -------------------- Public API -------------------- */

  return {
    bind,
    getError,
    getErrors,
    getStateSnapshot,
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
