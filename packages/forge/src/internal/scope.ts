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

import { ForgeValidationError } from '../errors';
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

  /**
   * Compute a scoped projection of FormState from current raw Maps.
   * Errors, touchedFields, validatingFields, isValid, isDirty, isTouched reflect only
   * fields within the prefix. isSubmitting, isLoading, isValidating, submitCount are full-form.
   */
  function getScopedState(): FormState {
    const rootState = ctx.getStateSnapshot();
    const errors = Object.fromEntries(
      Object.entries(rootState.errors)
        .filter(([k]) => isScopedKey(k))
        .map(([k, v]) => [unscope(k), v]),
    );
    const touchedFields = rootState.touchedFields.filter(isScopedKey).map(unscope);
    const validatingFields = rootState.validatingFields.filter(isScopedKey).map(unscope);
    const isValid = Object.keys(errors).length === 0;
    const isDirty = [...ctx.dirty].some(isScopedKey);
    const isTouched = [...ctx.touched].some(isScopedKey);
    const isValidating = validatingFields.length > 0;

    return Object.freeze({
      errors: Object.freeze(errors) as FormState['errors'],
      isDirty,
      isLoading: rootState.isLoading,
      isSubmitting: rootState.isSubmitting,
      isTouched,
      isValid,
      isValidating,
      submitCount: rootState.submitCount,
      touchedFields: Object.freeze(touchedFields) as readonly string[],
      validatingFields: Object.freeze(validatingFields) as readonly string[],
    }) as unknown as FormState;
  }

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

  async function scopedValidate(
    nameOrFieldsOrSignal?: FlatKeyOf<ScopedValues<TValues, P>> | FlatKeyOf<ScopedValues<TValues, P>>[] | AbortSignal,
    signal?: AbortSignal,
  ): Promise<ValidateResult> {
    ctx.ensureNotDisposed();

    if (
      nameOrFieldsOrSignal !== undefined &&
      !Array.isArray(nameOrFieldsOrSignal) &&
      !(nameOrFieldsOrSignal instanceof AbortSignal)
    ) {
      // validate(name) — single field
      const prefixedName = pre(nameOrFieldsOrSignal as string) as FlatKeyOf<TValues>;

      await ctx.runValidationCore([prefixedName as string], 'partial', signal);

      const error = ctx.fieldErrors.get(prefixedName as string);

      return {
        errors: error !== undefined ? { [nameOrFieldsOrSignal as string]: error } : {},
        valid: error === undefined,
      };
    }

    if (Array.isArray(nameOrFieldsOrSignal)) {
      // validate(fields[]) — specific subset
      const prefixedFields = nameOrFieldsOrSignal.map((f) => pre(f as string)) as string[];

      await ctx.runValidationCore(prefixedFields, 'partial', signal);

      const errors: Record<string, string> = {};

      for (const pf of prefixedFields) {
        const msg = ctx.fieldErrors.get(pf);

        if (msg !== undefined) errors[unscope(pf)] = msg;
      }

      return { errors, valid: Object.keys(errors).length === 0 };
    }

    // validate(signal?) — all scoped fields
    const sig = nameOrFieldsOrSignal as AbortSignal | undefined;
    const fields = [...ctx.validators.keys()].filter(isScopedKey);

    await ctx.runValidationCore(fields, 'partial', sig);

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
    let prevState: FormState | null = null;

    return ctx.root.subscribe(() => {
      const next = getScopedState();

      // Skip if no scoped-relevant state has changed.
      if (prevState) {
        const p = prevState;
        const errKeys = Object.keys(next.errors);
        const prevErrKeys = Object.keys(p.errors);
        const errorsMatch =
          errKeys.length === prevErrKeys.length && errKeys.every((k) => next.errors[k] === p.errors[k]);

        const touchedMatch =
          next.touchedFields.length === p.touchedFields.length &&
          next.touchedFields.every((v, i) => v === p.touchedFields[i]);

        const validatingMatch =
          next.validatingFields.length === p.validatingFields.length &&
          next.validatingFields.every((v, i) => v === p.validatingFields[i]);

        const flagsMatch =
          next.isDirty === p.isDirty &&
          next.isLoading === p.isLoading &&
          next.isSubmitting === p.isSubmitting &&
          next.isTouched === p.isTouched &&
          next.isValid === p.isValid &&
          next.isValidating === p.isValidating &&
          next.submitCount === p.submitCount;

        if (flagsMatch && errorsMatch && touchedMatch && validatingMatch) return;
      }

      prevState = next;
      listener(next);
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
    get disposalSignal() {
      return ctx.root.disposalSignal;
    },
    dispose: () => {
      /* Scoped forms share lifecycle with parent — call parentForm.dispose() to tear down */
    },
    get disposed() {
      return ctx.isDisposed();
    },
    field: (name) =>
      ctx.root.field(pre(name as string) as FlatKeyOf<TValues>) as FieldState<TypeAtPath<S, typeof name>>,
    fields: {
      register: (name, options?) =>
        ctx.root.fields.register(
          pre(name as string) as FlatKeyOf<TValues>,
          options as RegisterFieldOptions<TypeAtPath<TValues, FlatKeyOf<TValues>>>,
        ),
      remove: (name) => ctx.root.fields.remove(pre(name as string) as FlatKeyOf<TValues>),
      setValidator: (name, validator?) =>
        ctx.root.fields.setValidator(pre(name as string) as FlatKeyOf<TValues>, validator),
    },
    get: (name) => ctx.root.get(pre(name as string) as FlatKeyOf<TValues>) as TypeAtPath<S, typeof name>,
    get isLoading() {
      return ctx.root.isLoading;
    },
    get isSubmitting() {
      return ctx.root.isSubmitting;
    },
    patch: scopedPatch as Form<S>['patch'],
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
    snapshot: () => ctx.root.snapshot() as unknown as FormSnapshot<S>,
    get state() {
      return getScopedState();
    },
    submit: scopedSubmit as Form<S>['submit'],
    submitOrThrow: async (handler) => {
      const result = await scopedSubmit(handler);

      if (!result.ok) throw new ForgeValidationError(result.errors as Record<string, string>);

      return result.value;
    },
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
    validateStream(signal?) {
      const rootIter = ctx.root.validateStream(signal);

      const iter: AsyncIterableIterator<{ error: string | undefined; field: string }> = {
        async next() {
          for (;;) {
            const item = await rootIter.next();

            if (item.done) return item;

            if (isScopedKey(item.value.field))
              return { done: false, value: { error: item.value.error, field: unscope(item.value.field) } };
          }
        },
        return() {
          return rootIter.return ? rootIter.return() : Promise.resolve({ done: true as const, value: undefined });
        },
        [Symbol.asyncIterator]() {
          return this;
        },
      };

      return iter;
    },
    values: scopedValues,
  };
}
