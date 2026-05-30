import type {
  ArrayField,
  ConnectOptions,
  ConnectionResult,
  ErrorKeyOf,
  FieldState,
  FieldValidator,
  FlatKeyOf,
  Form,
  FormSnapshot,
  FormState,
  MaybePromise,
  RegisterFieldOptions,
  ScopedValues,
  SetOptions,
  SubmitResult,
  SubscribeOptions,
  TypeAtPath,
  Unsubscribe,
  ValidateResult,
} from '../types';

import { flattenValues, unflattenValues } from '../utils';

/**
 * The minimal set of capabilities the root form exposes to the scoped-form factory.
 * All Maps and Sets are shared by reference — mutations propagate to the parent.
 * Scalar state is accessed through getter/setter functions so the scope can read
 * and write `isSubmitting`, `submitCount`, etc. without capturing stale closures.
 */
export interface ScopeContext {
  /* ---- Shared mutable state (passed by reference) ---- */
  store: Map<string, unknown>;
  baseline: Map<string, unknown>;
  validators: Map<string, FieldValidator<unknown>>;
  fieldErrors: Map<string, string>;
  touched: Set<string>;
  dirty: Set<string>;
  fieldCtrls: Map<string, AbortController>;

  /* ---- Scalar state accessors ---- */
  isSubmitting(): boolean;
  setSubmitting(value: boolean): void;
  incrementSubmitCount(): void;
  isDisposed(): boolean;
  isLoading(): boolean;

  /* ---- Core helpers ---- */
  ensureNotDisposed(): void;
  batch(fn: () => void): void;
  invalidateErrors(): void;
  requestNotify(field?: string): void;
  getStateSnapshot(): FormState;
  field(name: string): FieldState<unknown>;

  /* ---- Field operations (string-typed for internal use) ---- */
  set(name: string, value: unknown, options?: SetOptions): void;
  setError(name: string, message: string): void;
  clearError(name: string): void;
  removeField(name: string): void;
  resetField(name: string): void;
  touch(name: string): void;
  untouch(name: string): void;
  setValidator(name: string, validator?: FieldValidator<unknown>): void;
  registerField(name: string, options?: RegisterFieldOptions<unknown>): Unsubscribe;
  validateField(name: string, signal?: AbortSignal): Promise<string | undefined>;
  validateFields(names: string[], signal?: AbortSignal): Promise<ValidateResult>;
  array(name: string): ArrayField;
  connect(name: string, config?: ConnectOptions): ConnectionResult<unknown>;

  /* ---- Validation core ---- */
  runValidationCore(
    fields: string[],
    scope: 'full' | 'partial',
    signal?: AbortSignal,
  ): Promise<ValidateResult & { aborted: boolean }>;

  /* ---- Subscriptions ---- */
  subscribe(listener: (state: FormState) => void, options?: SubscribeOptions): Unsubscribe;
  subscribeField(name: string, listener: (state: FieldState<unknown>) => void, options?: SubscribeOptions): Unsubscribe;

  /* ---- F4: async iterator factory ---- */
  asyncIterator(): AsyncIterableIterator<FormState>;

  /* ---- F5: snapshot / restore ---- */
  snapshot(): FormSnapshot;
  restore(snap: FormSnapshot): void;

  /* ---- F4: validateStream ---- */
  validateStream(signal?: AbortSignal): AsyncIterableIterator<{ error: string | undefined; field: string }>;
}

/**
 * Creates a scoped sub-form whose field paths are relative to `pfx`.
 * All operations delegate to the parent form through the provided `ScopeContext`.
 *
 * Only the handful of methods that require prefix-aware logic (submit, validate,
 * replace, reset, resetErrors, patch, values, touchAll, untouchAll) contain custom
 * code. Everything else is a single-line delegation to the context.
 */
export function createScopedForm<TValues extends Record<string, unknown>, P extends string>(
  ctx: ScopeContext,
  pfx: P,
): Form<ScopedValues<TValues, P>> {
  const pfxDot = `${pfx}.`;

  function pre(name: string): string {
    return `${pfx}.${name}`;
  }

  function isScopedKey(key: string): boolean {
    return key === pfx || key.startsWith(pfxDot);
  }

  function unscope(key: string): string {
    return key.startsWith(pfxDot) ? key.slice(pfxDot.length) : key;
  }

  /* ---- Non-trivial scoped implementations ---- */

  function scopedValues(): ScopedValues<TValues, P> {
    const sub: Record<string, unknown> = {};

    for (const [key, value] of ctx.store) {
      if (key.startsWith(pfxDot)) sub[key.slice(pfxDot.length)] = value;
    }

    return unflattenValues(sub) as ScopedValues<TValues, P>;
  }

  function scopedTouchAll(): void {
    ctx.ensureNotDisposed();

    for (const name of ctx.store.keys()) {
      if (isScopedKey(name)) ctx.touched.add(name);
    }

    for (const name of ctx.validators.keys()) {
      if (isScopedKey(name)) ctx.touched.add(name);
    }

    ctx.requestNotify();
  }

  function scopedUntouchAll(): void {
    ctx.ensureNotDisposed();

    for (const name of [...ctx.touched]) {
      if (isScopedKey(name)) ctx.touched.delete(name);
    }

    ctx.requestNotify();
  }

  function scopedReset(): void {
    ctx.ensureNotDisposed();

    for (const key of [...ctx.store.keys()]) {
      if (!isScopedKey(key)) continue;

      ctx.fieldCtrls.get(key)?.abort();
      ctx.fieldCtrls.delete(key);
      ctx.store.set(key, ctx.baseline.get(key));
      ctx.dirty.delete(key);
      ctx.touched.delete(key);

      if (ctx.fieldErrors.delete(key)) ctx.invalidateErrors();
    }

    ctx.requestNotify();
  }

  function scopedReplace(newValues: ScopedValues<TValues, P>): void {
    ctx.ensureNotDisposed();

    for (const key of [...ctx.fieldCtrls.keys()]) {
      if (isScopedKey(key)) {
        ctx.fieldCtrls.get(key)?.abort();
        ctx.fieldCtrls.delete(key);
      }
    }

    const flat = flattenValues(newValues as Record<string, unknown>);

    for (const key of [...ctx.store.keys()]) {
      if (!isScopedKey(key)) continue;

      ctx.store.delete(key);
      ctx.baseline.delete(key);
      ctx.dirty.delete(key);
      ctx.touched.delete(key);
      ctx.fieldErrors.delete(key);
    }

    ctx.invalidateErrors();

    for (const [key, value] of Object.entries(flat)) {
      const full = pre(key);

      ctx.store.set(full, value);
      ctx.baseline.set(full, value);
    }

    ctx.requestNotify();
  }

  function scopedPatch(partial: Record<string, unknown>): void {
    ctx.ensureNotDisposed();

    const flat = flattenValues(partial);

    ctx.batch(() => {
      for (const [key, value] of Object.entries(flat)) {
        const full = pre(key);

        ctx.baseline.set(full, value);
        ctx.store.set(full, value);
        ctx.dirty.delete(full);
        ctx.requestNotify(full);
      }
    });
  }

  function scopedResetErrors(
    nextErrors?: Partial<Record<ErrorKeyOf<ScopedValues<TValues, P>>, string | undefined>>,
  ): void {
    ctx.ensureNotDisposed();

    for (const key of [...ctx.fieldErrors.keys()]) {
      if (isScopedKey(key)) ctx.fieldErrors.delete(key);
    }

    if (nextErrors) {
      for (const [key, message] of Object.entries(nextErrors)) {
        if (typeof message === 'string') ctx.fieldErrors.set(pre(key), message);
      }
    }

    ctx.invalidateErrors();
    ctx.requestNotify();
  }

  async function scopedValidate(signal?: AbortSignal): Promise<ValidateResult> {
    ctx.ensureNotDisposed();

    const fields = [...ctx.validators.keys()].filter(isScopedKey);

    await ctx.runValidationCore(fields, 'partial', signal);

    const errors: Record<string, string> = {};

    for (const [key, message] of ctx.fieldErrors) {
      if (isScopedKey(key)) errors[unscope(key)] = message;
    }

    return { errors, valid: Object.keys(errors).length === 0 };
  }

  async function scopedValidateFields(
    fields: FlatKeyOf<ScopedValues<TValues, P>>[],
    signal?: AbortSignal,
  ): Promise<ValidateResult> {
    await ctx.validateFields(
      fields.map((f) => pre(f as string)),
      signal,
    );

    const errors: Record<string, string> = {};

    for (const [key, message] of ctx.fieldErrors) {
      if (isScopedKey(key)) errors[unscope(key)] = message;
    }

    return { errors, valid: Object.keys(errors).length === 0 };
  }

  async function scopedSubmit<TResult>(
    handler: (values: ScopedValues<TValues, P>) => MaybePromise<TResult>,
  ): Promise<SubmitResult<TResult>> {
    ctx.ensureNotDisposed();

    if (ctx.isSubmitting()) throw new Error('submit() called while a submission is already in progress');

    ctx.batch(() => {
      ctx.incrementSubmitCount();
      ctx.setSubmitting(true);
      scopedTouchAll();
    });

    try {
      const fields = [...ctx.validators.keys()].filter(isScopedKey);

      await ctx.runValidationCore(fields, 'partial');

      ctx.ensureNotDisposed();

      const errors: Record<string, string> = {};

      for (const [key, message] of ctx.fieldErrors) {
        if (isScopedKey(key)) errors[unscope(key)] = message;
      }

      if (Object.keys(errors).length > 0) {
        return { errors, ok: false, type: 'validation' as const };
      }

      return { ok: true as const, value: await handler(scopedValues()) };
    } finally {
      ctx.setSubmitting(false);

      if (!ctx.isDisposed()) ctx.requestNotify();
    }
  }

  /* ---- Public scoped form object ---- */

  type S = ScopedValues<TValues, P>;

  return {
    array: (name) =>
      ctx.array(pre(name as string)) as ArrayField<
        TypeAtPath<S, typeof name> extends readonly (infer E)[] ? E : unknown
      >,
    batch: ctx.batch,
    clearError: (name) => ctx.clearError(pre(name as string)),
    connect: (name, config?) =>
      ctx.connect(pre(name as string), config) as ConnectionResult<TypeAtPath<S, typeof name>>,
    dispose: () => {
      /* Scoped forms share lifecycle with parent — call parentForm.dispose() */
    },
    get disposed() {
      return ctx.isDisposed();
    },
    field: (name) => ctx.field(pre(name as string)) as FieldState<TypeAtPath<S, typeof name>>,
    get: (name) => ctx.store.get(pre(name as string)) as TypeAtPath<S, typeof name>,
    get isLoading() {
      return ctx.isLoading();
    },
    patch: scopedPatch as Form<S>['patch'],
    registerField: (name, options?) => ctx.registerField(pre(name as string), options as RegisterFieldOptions<unknown>),
    removeField: (name) => ctx.removeField(pre(name as string)),
    replace: scopedReplace as Form<S>['replace'],
    reset: scopedReset,
    resetErrors: scopedResetErrors as Form<S>['resetErrors'],
    resetField: (name) => ctx.resetField(pre(name as string)),
    restore: (snap) => ctx.restore(snap as FormSnapshot),
    scope: (subPrefix) => createScopedForm(ctx, pre(subPrefix as string)) as Form<ScopedValues<S, typeof subPrefix>>,
    set: (name, value, options?) => ctx.set(pre(name as string), value as unknown, options),
    setError: (name, message) => ctx.setError(pre(name as string), message),
    setValidator: (name, validator?) => ctx.setValidator(pre(name as string), validator),
    snapshot: () => ctx.snapshot() as FormSnapshot<S>,
    get state() {
      return ctx.getStateSnapshot();
    },
    submit: scopedSubmit as Form<S>['submit'],
    subscribe: ctx.subscribe,
    subscribeField: (name, listener, options?) =>
      ctx.subscribeField(pre(name as string), listener as (state: FieldState<unknown>) => void, options),
    [Symbol.asyncIterator]: ctx.asyncIterator,
    touch: (name) => ctx.touch(pre(name as string)),
    touchAll: scopedTouchAll,
    untouch: (name) => ctx.untouch(pre(name as string)),
    untouchAll: scopedUntouchAll,
    validate: scopedValidate as Form<S>['validate'],
    validateField: (name, signal?) => ctx.validateField(pre(name as string), signal),
    validateFields: scopedValidateFields as Form<S>['validateFields'],
    validateStream: (signal?) => ctx.validateStream(signal),
    values: scopedValues,
  };
}
