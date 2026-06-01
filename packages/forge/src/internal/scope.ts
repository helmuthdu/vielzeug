import type {
  ArrayField,
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
 * R3: Slim ScopeContext — delegates simple operations through `root: Form<TValues>`.
 * Only the Maps/Sets needed for bulk scoped operations are passed directly.
 * @internal
 */
export interface ScopeContext<TValues extends Record<string, unknown> = Record<string, unknown>> {
  /** The fully-featured root form — used for all simple one-field delegations. */
  root: Form<TValues>;

  /* ---- Shared mutable state (passed by reference, needed by bulk scoped ops) ---- */
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

  /* ---- Core helpers ---- */
  ensureNotDisposed(): void;
  invalidateErrors(): void;
  requestNotify(target?: string | Iterable<string>): void;
  getStateSnapshot(): FormState;

  /* ---- Validation core (needed for scoped validate/submit) ---- */
  runValidationCore(
    fields: string[],
    scope: 'full' | 'partial',
    signal?: AbortSignal,
  ): Promise<ValidateResult & { aborted: boolean }>;
}

/**
 * Creates a scoped sub-form whose field paths are relative to `pfx`.
 * All simple single-field operations delegate to `ctx.root`.
 * Only prefix-aware bulk operations (submit, validate, replace, reset, etc.) contain custom code.
 */
export function createScopedForm<TValues extends Record<string, unknown>, P extends string>(
  ctx: ScopeContext<TValues>,
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
    const changedKeys: string[] = [];

    for (const [key, value] of Object.entries(flat)) {
      const full = pre(key);

      ctx.baseline.set(full, value);
      ctx.store.set(full, value);
      ctx.dirty.delete(full);
      changedKeys.push(full);
    }

    ctx.requestNotify(changedKeys);
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
    await ctx.root.validateFields(fields.map((f) => pre(f as string)) as FlatKeyOf<TValues>[], signal);

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

    ctx.root.batch(() => {
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

  /**
   * Subscribe filtered to scoped fields only.
   * Errors, touchedFields, and validatingFields are remapped to relative paths.
   * `isValid`, `isDirty`, and `isTouched` reflect only fields within this scope's prefix.
   * `isSubmitting`, `isLoading`, `isValidating`, and `submitCount` reflect the full form.
   *
   * The listener fires only when the scoped projection changes — mutations outside this
   * prefix do not fire the listener.
   */
  function subscribeScoped(listener: (state: FormState) => void, options?: SubscribeOptions): Unsubscribe {
    // Track the previous scoped projection for equality comparison.
    let prevErrors: Record<string, string> | null = null;
    let prevTouched: readonly string[] | null = null;
    let prevValidating: readonly string[] | null = null;
    let prevFlags: Pick<
      FormState,
      'isDirty' | 'isLoading' | 'isSubmitting' | 'isTouched' | 'isValid' | 'isValidating' | 'submitCount'
    > | null = null;

    return ctx.root.subscribe((state) => {
      const errors = Object.fromEntries(
        Object.entries(state.errors)
          .filter(([k]) => isScopedKey(k))
          .map(([k, v]) => [unscope(k), v]),
      );
      const touchedFields = state.touchedFields.filter(isScopedKey).map(unscope);
      const validatingFields = state.validatingFields.filter(isScopedKey).map(unscope);

      // Compute scoped-only boolean flags.
      const isValid = Object.keys(errors).length === 0;
      const isDirty = [...ctx.dirty].some(isScopedKey);
      const isTouched = [...ctx.touched].some(isScopedKey);
      const isValidating = validatingFields.length > 0;

      // Skip if no scoped-relevant state has changed.
      if (prevFlags) {
        const flagsMatch =
          isDirty === prevFlags.isDirty &&
          state.isLoading === prevFlags.isLoading &&
          state.isSubmitting === prevFlags.isSubmitting &&
          isTouched === prevFlags.isTouched &&
          isValid === prevFlags.isValid &&
          isValidating === prevFlags.isValidating &&
          state.submitCount === prevFlags.submitCount;

        const errKeys = Object.keys(errors);
        const prevErrKeys = Object.keys(prevErrors!);
        const errorsMatch = errKeys.length === prevErrKeys.length && errKeys.every((k) => errors[k] === prevErrors![k]);

        const touchedMatch =
          touchedFields.length === prevTouched!.length && touchedFields.every((v, i) => v === prevTouched![i]);

        const validatingMatch =
          validatingFields.length === prevValidating!.length &&
          validatingFields.every((v, i) => v === prevValidating![i]);

        if (flagsMatch && errorsMatch && touchedMatch && validatingMatch) return;
      }

      prevErrors = errors;
      prevTouched = touchedFields;
      prevValidating = validatingFields;
      prevFlags = {
        isDirty,
        isLoading: state.isLoading,
        isSubmitting: state.isSubmitting,
        isTouched,
        isValid,
        isValidating,
        submitCount: state.submitCount,
      };

      listener({
        ...state,
        errors: Object.freeze(errors) as FormState['errors'],
        isDirty,
        isTouched,
        isValid,
        isValidating,
        touchedFields: Object.freeze(touchedFields) as readonly string[],
        validatingFields: Object.freeze(validatingFields) as readonly string[],
      });
    }, options);
  }

  /* ---- Public scoped form object ---- */

  type S = ScopedValues<TValues, P>;

  return {
    array: (name) =>
      ctx.root.array(pre(name as string) as FlatKeyOf<TValues>) as ArrayField<
        TypeAtPath<S, typeof name> extends readonly (infer E)[] ? E : unknown
      >,
    batch: (fn) => ctx.root.batch(fn),
    clearError: (name) => ctx.root.clearError(pre(name as string) as ErrorKeyOf<TValues>),
    connect: (name, config?) =>
      ctx.root.connect(pre(name as string) as FlatKeyOf<TValues>, config) as ConnectionResult<
        TypeAtPath<S, typeof name>
      >,
    dispose: () => {
      /* Scoped forms share lifecycle with parent — call parentForm.dispose() to tear down */
    },
    get disposed() {
      return ctx.isDisposed();
    },
    field: (name) =>
      ctx.root.field(pre(name as string) as FlatKeyOf<TValues>) as FieldState<TypeAtPath<S, typeof name>>,
    get: (name) => ctx.root.get(pre(name as string) as FlatKeyOf<TValues>) as TypeAtPath<S, typeof name>,
    get isLoading() {
      return ctx.root.isLoading;
    },
    get isSubmitting() {
      return ctx.root.isSubmitting;
    },
    patch: scopedPatch as Form<S>['patch'],
    registerField: (name, options?) =>
      ctx.root.registerField(
        pre(name as string) as FlatKeyOf<TValues>,
        options as RegisterFieldOptions<TypeAtPath<TValues, FlatKeyOf<TValues>>>,
      ),
    removeField: (name) => ctx.root.removeField(pre(name as string) as FlatKeyOf<TValues>),
    replace: scopedReplace as Form<S>['replace'],
    reset: scopedReset,
    resetErrors: scopedResetErrors as Form<S>['resetErrors'],
    resetField: (name) => ctx.root.resetField(pre(name as string) as FlatKeyOf<TValues>),
    restore: (snap) => ctx.root.restore(snap as unknown as FormSnapshot<TValues>),
    scope: (subPrefix) => createScopedForm(ctx, pre(subPrefix as string)) as Form<ScopedValues<S, typeof subPrefix>>,
    set: (name, value, options?: SetOptions) =>
      ctx.root.set(
        pre(name as string) as FlatKeyOf<TValues>,
        value as TypeAtPath<TValues, FlatKeyOf<TValues>>,
        options,
      ),
    setError: (name, message) => ctx.root.setError(pre(name as string) as ErrorKeyOf<TValues>, message),
    setValidator: (name, validator?) => ctx.root.setValidator(pre(name as string) as FlatKeyOf<TValues>, validator),
    snapshot: () => ctx.root.snapshot() as unknown as FormSnapshot<S>,
    get state() {
      return ctx.getStateSnapshot();
    },
    submit: scopedSubmit as Form<S>['submit'],
    subscribe: (listener, options?) => ctx.root.subscribe(listener, options),
    subscribeField: (name, listener, options?) =>
      ctx.root.subscribeField(
        pre(name as string) as FlatKeyOf<TValues>,
        listener as (state: FieldState<TypeAtPath<TValues, FlatKeyOf<TValues>>>) => void,
        options,
      ),
    subscribeScoped,
    [Symbol.asyncIterator]: () => ctx.root[Symbol.asyncIterator](),
    touch: (name) => ctx.root.touch(pre(name as string) as FlatKeyOf<TValues>),
    touchAll: scopedTouchAll,
    untouch: (name) => ctx.root.untouch(pre(name as string) as FlatKeyOf<TValues>),
    untouchAll: scopedUntouchAll,
    validate: scopedValidate as Form<S>['validate'],
    validateField: (name, signal?) => ctx.root.validateField(pre(name as string) as FlatKeyOf<TValues>, signal),
    validateFields: scopedValidateFields as Form<S>['validateFields'],
    validateStream: (signal?) => ctx.root.validateStream(signal),
    values: scopedValues,
  };
}
