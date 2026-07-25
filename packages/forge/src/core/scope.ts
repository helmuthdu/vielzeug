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
import type { FormContext } from './context';
import type { FieldOps } from './fields';

import { flattenValues, unflattenValues } from '../_utils';
import { ForgeSubmitError, ForgeValidationError } from '../errors';

/**
 * Everything a scoped sub-form needs from its parent. Deliberately just three members —
 * `ctx` (the same `FormContext` the root form's own ops read/write, not a copy of its
 * fields) and a narrow slice of `fieldOps`'s predicate-based bulk primitives
 * (`reset`/`replace`/`patch`/`touchAll`/`untouchAll`/`resetErrors`'s shared implementations,
 * plus `runValidationCore`). Bulk scoped operations call these with an `isScopedKey`
 * predicate instead of maintaining a second copy of each loop.
 * @internal
 */
export interface ScopeContext<TValues extends Record<string, unknown> = Record<string, unknown>> {
  ctx: FormContext<TValues>;
  fieldOps: Pick<
    FieldOps<TValues>,
    | 'patchKeys'
    | 'replaceKeys'
    | 'resetErrorsKeys'
    | 'resetKeys'
    | 'runValidationCore'
    | 'touchAllKeys'
    | 'untouchAllKeys'
  >;
  /** The fully-featured root form — used for all simple one-field delegations. */
  root: Form<TValues>;
}

/**
 * Creates a scoped sub-form whose field paths are relative to `pfx`.
 * All simple single-field operations delegate to `scopeCtx.root`. Bulk operations
 * (reset, replace, patch, touchAll, untouchAll, resetErrors) call `scopeCtx.fieldOps`'s
 * shared predicate-based primitives with an `isScopedKey` filter. Only `validate`/`submit`
 * (which need to compute a scoped field-name subset before calling `runValidationCore`) and
 * the handful of read-only projections (`state`, `values`, `fields.list`) contain custom code.
 */
export function createScopedForm<TValues extends Record<string, unknown>, P extends string>(
  scopeCtx: ScopeContext<TValues>,
  pfx: P,
): Form<ScopedValues<TValues, P>> {
  const { ctx, fieldOps, root } = scopeCtx;
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
    });
  }

  function scopedValues(): ScopedValues<TValues, P> {
    const sub: Record<string, unknown> = {};

    for (const [key, value] of ctx.store) {
      if (key.startsWith(pfxDot)) sub[key.slice(pfxDot.length)] = value;
    }

    return unflattenValues(sub) as ScopedValues<TValues, P>;
  }

  /**
   * Enumerate field paths within this scope's prefix, stripped to relative paths —
   * matching `scope.state`'s relative-path convention, not `state.touchedFields`'s
   * absolute-path convention. Same "known field" definition `scopedTouchAll()` uses.
   */
  function scopedListFields(): readonly string[] {
    const known = new Set<string>();

    for (const key of ctx.store.keys()) {
      if (isScopedKey(key)) known.add(unscope(key));
    }

    for (const key of ctx.validators.keys()) {
      if (isScopedKey(key)) known.add(unscope(key));
    }

    return Object.freeze([...known]);
  }

  function scopedTouchAll(): void {
    ctx.ensureNotDisposed('touchAll');
    fieldOps.touchAllKeys(isScopedKey);
    ctx.requestNotify();
  }

  function scopedUntouchAll(): void {
    ctx.ensureNotDisposed('untouchAll');
    fieldOps.untouchAllKeys(isScopedKey);
    ctx.requestNotify();
  }

  function scopedReset(): void {
    ctx.ensureNotDisposed('reset');
    fieldOps.resetKeys(isScopedKey);
    ctx.requestNotify();
  }

  function scopedReplace(newValues: ScopedValues<TValues, P>): void {
    ctx.ensureNotDisposed('replace');
    fieldOps.replaceKeys(isScopedKey, flattenValues(newValues as Record<string, unknown>), pre);
    ctx.requestNotify();
  }

  function scopedPatch(partial: Record<string, unknown>): void {
    ctx.ensureNotDisposed('patch');
    ctx.requestNotify(fieldOps.patchKeys(partial, pre));
  }

  function scopedResetErrors(
    nextErrors?: Partial<Record<ErrorKeyOf<ScopedValues<TValues, P>>, string | undefined>>,
  ): void {
    ctx.ensureNotDisposed('resetErrors');
    fieldOps.resetErrorsKeys(isScopedKey, nextErrors ?? {}, pre);
    ctx.requestNotify();
  }

  async function scopedValidate(
    nameOrFieldsOrSignal?: FlatKeyOf<ScopedValues<TValues, P>> | FlatKeyOf<ScopedValues<TValues, P>>[] | AbortSignal,
    signal?: AbortSignal,
  ): Promise<ValidateResult> {
    ctx.ensureNotDisposed('validate');

    if (
      nameOrFieldsOrSignal !== undefined &&
      !Array.isArray(nameOrFieldsOrSignal) &&
      !(nameOrFieldsOrSignal instanceof AbortSignal)
    ) {
      // validate(name) — single field
      const prefixedName = pre(nameOrFieldsOrSignal as string) as FlatKeyOf<TValues>;

      await fieldOps.runValidationCore([prefixedName as string], 'partial', signal);

      const error = ctx.fieldErrors.get(prefixedName as string);

      return {
        errors: error !== undefined ? { [nameOrFieldsOrSignal as string]: error } : {},
        valid: error === undefined,
      };
    }

    if (Array.isArray(nameOrFieldsOrSignal)) {
      // validate(fields[]) — specific subset
      const prefixedFields = nameOrFieldsOrSignal.map((f) => pre(f as string)) as string[];

      await fieldOps.runValidationCore(prefixedFields, 'partial', signal);

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

    await fieldOps.runValidationCore(fields, 'partial', sig);

    const errors: Record<string, string> = {};

    for (const [key, message] of ctx.fieldErrors) {
      if (isScopedKey(key)) errors[unscope(key)] = message;
    }

    return { errors, valid: Object.keys(errors).length === 0 };
  }

  async function scopedSubmit<TResult>(
    handler: (values: ScopedValues<TValues, P>) => MaybePromise<TResult>,
  ): Promise<SubmitResult<TResult>> {
    ctx.ensureNotDisposed('submit');

    if (ctx.isSubmittingState) throw new ForgeSubmitError('submit() called while a submission is already in progress');

    ctx.batch(() => {
      ctx.submitCount++;
      ctx.isSubmittingState = true;
      scopedTouchAll();
    });

    try {
      const fields = [...ctx.validators.keys()].filter(isScopedKey);

      await fieldOps.runValidationCore(fields, 'partial');

      ctx.ensureNotDisposed('submit');

      const errors: Record<string, string> = {};

      for (const [key, message] of ctx.fieldErrors) {
        if (isScopedKey(key)) errors[unscope(key)] = message;
      }

      if (Object.keys(errors).length > 0) {
        return { errors, ok: false, type: 'validation' as const };
      }

      return { ok: true as const, value: await handler(scopedValues()) };
    } finally {
      ctx.isSubmittingState = false;

      if (!ctx.disposed) ctx.requestNotify();
    }
  }

  /**
   * Subscribe filtered to scoped fields only — this scoped form's `subscribe()` implementation.
   * Errors, touchedFields, and validatingFields are remapped to relative paths.
   * `isValid`, `isDirty`, and `isTouched` reflect only fields within this scope's prefix.
   * `isSubmitting`, `isLoading`, `isValidating`, and `submitCount` reflect the full form.
   *
   * The listener fires only when the scoped projection changes — mutations outside this
   * prefix do not fire the listener.
   */
  function scopedSubscribe(listener: (state: FormState) => void, options?: SubscribeOptions): Unsubscribe {
    // Track the previous scoped projection for equality comparison.
    let prevState: FormState | null = null;

    return root.subscribe(() => {
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

  function createScopedAdapter() {
    return {
      array(name: string): ArrayField {
        return root.array(pre(name) as FlatKeyOf<TValues>) as ArrayField;
      },
      clearError(name: string): void {
        root.clearError(pre(name) as ErrorKeyOf<TValues>);
      },
      connect(name: string, config?: ConnectOptions): ConnectionResult<unknown> {
        return root.connect(pre(name) as FlatKeyOf<TValues>, config) as ConnectionResult<unknown>;
      },
      field(name: string): FieldState<unknown> {
        return root.field(pre(name) as FlatKeyOf<TValues>) as FieldState<unknown>;
      },
      get(name: string): unknown {
        return root.get(pre(name) as FlatKeyOf<TValues>);
      },
      register(name: string, options?: RegisterFieldOptions<unknown>): Unsubscribe {
        return root.fields.register(
          pre(name) as FlatKeyOf<TValues>,
          options as RegisterFieldOptions<TypeAtPath<TValues, FlatKeyOf<TValues>>>,
        );
      },
      remove(name: string): void {
        root.fields.remove(pre(name) as FlatKeyOf<TValues>);
      },
      resetField(name: string): void {
        root.resetField(pre(name) as FlatKeyOf<TValues>);
      },
      set(name: string, value: unknown, options?: SetOptions): void {
        root.set(pre(name) as FlatKeyOf<TValues>, value as TypeAtPath<TValues, FlatKeyOf<TValues>>, options);
      },
      setError(name: string, message: string): void {
        root.setError(pre(name) as ErrorKeyOf<TValues>, message);
      },
      setValidator(name: string, validator?: FieldValidator): void {
        root.fields.setValidator(pre(name) as FlatKeyOf<TValues>, validator);
      },
      subscribeField(
        name: string,
        listener: (state: FieldState<unknown>) => void,
        options?: SubscribeOptions,
      ): Unsubscribe {
        return root.subscribeField(
          pre(name) as FlatKeyOf<TValues>,
          listener as (state: FieldState<TypeAtPath<TValues, FlatKeyOf<TValues>>>) => void,
          options,
        );
      },
      touch(name: string): void {
        root.touch(pre(name) as FlatKeyOf<TValues>);
      },
      untouch(name: string): void {
        root.untouch(pre(name) as FlatKeyOf<TValues>);
      },
    };
  }

  /* ---- Public scoped form object ---- */

  type S = ScopedValues<TValues, P>;

  const adapter = createScopedAdapter();

  return {
    array: (name) =>
      adapter.array(name as string) as ArrayField<
        TypeAtPath<S, typeof name> extends readonly (infer E)[] ? E : unknown
      >,
    batch: (fn) => root.batch(fn),
    clearError: (name) => adapter.clearError(name as string),
    connect: (name, config?) => adapter.connect(name as string, config) as ConnectionResult<TypeAtPath<S, typeof name>>,
    get disposalSignal() {
      return root.disposalSignal;
    },
    dispose: () => {
      /* Scoped forms share lifecycle with parent — call parentForm.dispose() to tear down */
    },
    get disposed() {
      return ctx.disposed;
    },
    field: (name) => adapter.field(name as string) as FieldState<TypeAtPath<S, typeof name>>,
    fields: {
      list: scopedListFields,
      register: (name, options?) => adapter.register(name as string, options as RegisterFieldOptions<unknown>),
      remove: (name) => adapter.remove(name as string),
      setValidator: (name, validator?) => adapter.setValidator(name as string, validator),
    },
    get: (name) => adapter.get(name as string) as TypeAtPath<S, typeof name>,
    history: {
      // Casts are irreducible: FormSnapshot<S> and FormSnapshot<TValues> are structurally
      // unrelated generic instantiations -- TS cannot verify one against the other.
      restore: (snap) => root.history.restore(snap as FormSnapshot<TValues>),
      snapshot: () => root.history.snapshot() as FormSnapshot<S>,
    },
    get isLoading() {
      return root.isLoading;
    },
    get isSubmitting() {
      return root.isSubmitting;
    },
    patch: scopedPatch as Form<S>['patch'],
    replace: scopedReplace as Form<S>['replace'],
    reset: scopedReset,
    resetErrors: scopedResetErrors as Form<S>['resetErrors'],
    resetField: (name) => adapter.resetField(name as string),
    scope: (subPrefix) =>
      createScopedForm(scopeCtx, pre(subPrefix as string)) as Form<ScopedValues<S, typeof subPrefix>>,
    set: (name, value, options?: SetOptions) => adapter.set(name as string, value, options),
    setError: (name, message) => adapter.setError(name as string, message),
    get state() {
      return getScopedState();
    },
    submit: scopedSubmit as Form<S>['submit'],
    submitOrThrow: async (handler) => {
      const result = await scopedSubmit(handler);

      if (!result.ok) throw new ForgeValidationError(result.errors as Record<string, string>);

      return result.value;
    },
    // Scoped forms filter+remap; on a root form this method is the unfiltered notifier pass-through.
    subscribe: scopedSubscribe,
    subscribeField: (name, listener, options?) =>
      adapter.subscribeField(name as string, listener as (state: FieldState<unknown>) => void, options),
    [Symbol.asyncIterator]: () => root[Symbol.asyncIterator](),
    [Symbol.dispose]() {
      this.dispose();
    },
    touch: (name) => adapter.touch(name as string),
    touchAll: scopedTouchAll,
    untouch: (name) => adapter.untouch(name as string),
    untouchAll: scopedUntouchAll,
    validate: scopedValidate as Form<S>['validate'],
    values: scopedValues,
  };
}
