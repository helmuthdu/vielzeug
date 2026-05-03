import {
  type ArrayField,
  type BindConfig,
  type BindResult,
  type FieldState,
  type FieldValidator,
  type FlatKeyOf,
  type Form,
  FormValidationError,
  type FormOptions,
  type FormState,
  type MaybePromise,
  type SetOptions,
  type SubscribeOptions,
  SubmitError,
  type TypeAtPath,
  type Unsubscribe,
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
  const bindDefaults = init.bindDefaults ?? {};

  const baseline = new Map<string, unknown>(Object.entries(flattenValues(init.defaultValues ?? {})));
  const store = new Map<string, unknown>(baseline);

  const fieldErrors = new Map<string, string>();
  const touched = new Set<string>();
  const dirty = new Set<string>();
  let validatingCount = 0;
  let activeValidationCtrl: AbortController | null = null;
  const fieldValidationCtrls = new Map<string, AbortController>();
  let isSubmitting = false;
  let submitCount = 0;
  const disposeController = new AbortController();

  type LocalListener = (state: FormState<TValues>) => void;
  type AnyFieldListener = (payload: FieldState<unknown>) => void;

  const listeners = new Set<LocalListener>();
  const fieldListeners = new Map<string, Set<AnyFieldListener>>();

  let scheduled = false;
  const changedFields = new Set<string>();
  let notifyAllFields = false;

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

  function flush(): void {
    scheduled = false;

    if (listeners.size > 0) {
      const state = buildState();

      for (const listener of listeners) listener(state);
    }

    const toNotify = notifyAllFields ? fieldListeners.keys() : changedFields;

    for (const name of toNotify) notifyField(name);
    changedFields.clear();
    notifyAllFields = false;
  }

  function scheduleNotify(field?: string): void {
    if (field !== undefined) {
      changedFields.add(field);
    } else {
      notifyAllFields = true;
    }

    if (scheduled) return;

    scheduled = true;
    queueMicrotask(flush);
  }

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

  function get<K extends FlatKeyOf<TValues>>(name: K): TypeAtPath<TValues, K> {
    return store.get(name as string) as TypeAtPath<TValues, K>;
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

  function set<K extends FlatKeyOf<TValues>>(name: K, value: TypeAtPath<TValues, K>, options: SetOptions = {}): void {
    ensureNotDisposed();

    const key = name as string;

    store.set(key, value);

    if (options.track ?? true) trackDirty(key, value);

    if (options.touched) touched.add(key);

    scheduleNotify(key);
  }

  function field<K extends FlatKeyOf<TValues>>(name: K): FieldState<TypeAtPath<TValues, K>> {
    return buildFieldState(name as string) as FieldState<TypeAtPath<TValues, K>>;
  }

  function setError(name: FlatKeyOf<TValues>, message: string): void {
    ensureNotDisposed();

    const key = name as string;

    fieldErrors.set(key, message);
    scheduleNotify(key);
  }

  function clearError(name: FlatKeyOf<TValues>): void {
    ensureNotDisposed();

    const key = name as string;

    fieldErrors.delete(key);
    scheduleNotify(key);
  }

  function replaceErrors(nextErrors: Partial<Record<FlatKeyOf<TValues>, string>>): void {
    ensureNotDisposed();
    fieldErrors.clear();
    for (const [k, v] of Object.entries(nextErrors)) fieldErrors.set(k, v as string);
    scheduleNotify();
  }

  function mergeErrors(nextErrors: Partial<Record<FlatKeyOf<TValues>, string | undefined>>): void {
    ensureNotDisposed();

    for (const [name, message] of Object.entries(nextErrors) as Array<[string, string | undefined]>) {
      if (message === undefined) fieldErrors.delete(name);
      else fieldErrors.set(name, message);
    }

    scheduleNotify();
  }

  function touch(name?: FlatKeyOf<TValues>): void {
    ensureNotDisposed();

    if (name === undefined) {
      for (const fieldName of store.keys()) touched.add(fieldName);
      for (const fieldName of Object.keys(validators)) touched.add(fieldName);
      scheduleNotify();
    } else {
      const key = name as string;

      touched.add(key);
      scheduleNotify(key);
    }
  }

  function untouch(name?: FlatKeyOf<TValues>): void {
    ensureNotDisposed();

    if (name === undefined) {
      touched.clear();
      scheduleNotify();
    } else {
      const key = name as string;

      touched.delete(key);
      scheduleNotify(key);
    }
  }

  function resolveTouchedValidatorFields(): string[] {
    return Object.keys(validators).filter((name) => touched.has(name));
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

  function applyPartialErrors(fields: Set<string>, next: Record<string, string>): void {
    for (const name of fields) {
      if (next[name] !== undefined) fieldErrors.set(name, next[name]);
      else fieldErrors.delete(name);
    }
  }

  function buildScopedErrors(fieldSet: Set<string>): Record<string, string> {
    const out: Record<string, string> = {};

    for (const name of fieldSet) {
      const err = fieldErrors.get(name);

      if (err !== undefined) out[name] = err;
    }

    return out;
  }

  function buildResult(fieldSet: Set<string>, mode: 'full' | 'partial'): ValidateResult {
    const allErrors = Object.fromEntries(fieldErrors);
    const errors = mode === 'full' ? allErrors : buildScopedErrors(fieldSet);

    return { allErrors, errors, valid: fieldErrors.size === 0 };
  }

  async function validateResolvedFields(
    fieldsToValidate: string[],
    mode: 'full' | 'partial',
    signal?: AbortSignal,
  ): Promise<ValidateResult> {
    ensureNotDisposed();

    const fieldSet = new Set(fieldsToValidate);
    const baseSignals: AbortSignal[] = signal ? [signal, disposeController.signal] : [disposeController.signal];

    if (mode === 'full') {
      // Full validation supersedes all running validations
      activeValidationCtrl?.abort();
      for (const ctrl of fieldValidationCtrls.values()) ctrl.abort();
      fieldValidationCtrls.clear();
    }

    const ctrl = new AbortController();

    if (mode === 'full') activeValidationCtrl = ctrl;

    // Per-field controllers for partial: concurrent field validations don't cancel each other
    const localFieldCtrls = new Map<string, AbortController>();

    for (const name of fieldSet) {
      if (mode === 'partial') {
        fieldValidationCtrls.get(name)?.abort();

        const fieldCtrl = new AbortController();

        fieldValidationCtrls.set(name, fieldCtrl);
        localFieldCtrls.set(name, fieldCtrl);
      } else {
        localFieldCtrls.set(name, ctrl);
      }
    }

    validatingCount++;
    scheduleNotify();

    try {
      const results = await Promise.all(
        [...fieldSet].map(async (name) => {
          const fieldSignal = AbortSignal.any([localFieldCtrls.get(name)!.signal, ...baseSignals]);

          return [name, await runFieldValidators(name, fieldSignal)] as const;
        }),
      );
      const nextErrors: Record<string, string> = {};

      for (const [name, msg] of results) {
        if (msg !== undefined) nextErrors[name] = msg;
      }

      if (mode === 'partial') {
        applyPartialErrors(fieldSet, nextErrors);
        for (const name of fieldSet) fieldValidationCtrls.delete(name);
      } else {
        const formSignal = AbortSignal.any([ctrl.signal, ...baseSignals]);

        Object.assign(nextErrors, await runFormValidator(formSignal));
        fieldErrors.clear();
        for (const [k, v] of Object.entries(nextErrors)) fieldErrors.set(k, v);
      }

      return buildResult(fieldSet, mode);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return buildResult(fieldSet, mode);
      }

      throw err;
    } finally {
      if (mode === 'full' && activeValidationCtrl === ctrl) activeValidationCtrl = null;

      validatingCount--;
      scheduleNotify();
    }
  }

  async function validate(fields?: FlatKeyOf<TValues>[] | 'touched', signal?: AbortSignal): Promise<ValidateResult> {
    if (fields === 'touched') {
      return validateResolvedFields(resolveTouchedValidatorFields(), 'partial', signal);
    } else if (fields === undefined) {
      return validateResolvedFields(Object.keys(validators), 'full', signal);
    } else {
      return validateResolvedFields(fields as string[], 'partial', signal);
    }
  }

  async function validateField(name: FlatKeyOf<TValues>, signal?: AbortSignal): Promise<string | undefined> {
    const { errors } = await validate([name], signal);

    return errors[name as string];
  }

  async function submit<TResult = void>(
    onSubmit: (values: TValues) => MaybePromise<TResult>,
    signal?: AbortSignal,
  ): Promise<TResult> {
    ensureNotDisposed();

    if (isSubmitting) throw new SubmitError();

    submitCount++;
    isSubmitting = true;
    scheduleNotify();

    try {
      touch();
      await validate(undefined, signal);

      if (fieldErrors.size > 0) {
        throw new FormValidationError(Object.fromEntries(fieldErrors));
      }

      return await onSubmit(values());
    } finally {
      isSubmitting = false;
      scheduleNotify();
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

        if (doValidateOnChange) void validateField(name).catch(() => undefined);
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
      move(from: number, to: number): void {
        const current = store.get(key);

        if (!Array.isArray(current)) return;

        const next = [...current];

        next.splice(to, 0, next.splice(from, 1)[0]);
        set(name, next as TypeAtPath<TValues, typeof name>);
      },
      remove(index: number): void {
        const current = store.get(key);

        if (!Array.isArray(current)) return;

        set(name, current.filter((_, i) => i !== index) as TypeAtPath<TValues, typeof name>);
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
    scheduleNotify(key);
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

    scheduleNotify();
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

    scheduleNotify();
  }

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
    mergeErrors,
    replace,
    replaceErrors,
    reset,
    resetField,
    set,
    setError,
    get state() {
      return buildState();
    },
    submit,
    get submitCount() {
      return submitCount;
    },
    subscribeField,
    subscribeForm,
    touch,
    untouch,
    validate,
    validateField,
    values,
  };
}
