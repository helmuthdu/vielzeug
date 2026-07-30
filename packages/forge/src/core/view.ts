import { isAbortError } from '@vielzeug/arsenal';

import type { FormContext } from './context';
import type { FieldOps } from './fields';
import type { LifecycleOps } from './lifecycle';

import { assertSafeKey } from '../_utils';
import { ForgeSubmitError } from '../errors';
import {
  type ArrayField,
  type ConnectOptions,
  type ConnectionResult,
  type ErrorKeyOf,
  type FieldState,
  type FieldValidator,
  type FlatKeyOf,
  type Form,
  type FormSnapshot,
  type FormState,
  type MaybePromise,
  type PrefixValues,
  type SetOptions,
  type SubmitResult,
  type SubscribeOptions,
  type TypeAtPath,
  type Unsubscribe,
  type ValidateResult,
} from '../types';

/**
 * Everything a form view needs from the form's internals. One instance per
 * `createForm()`, shared by the root view and every scoped view.
 * @internal
 */
export type ViewDeps<TValues extends Record<string, unknown> = Record<string, unknown>> = {
  /** Default `connect()` options — form-level, from `FormOptions.connect`. */
  connectDefaults: ConnectOptions;
  ctx: FormContext<TValues>;
  fieldOps: FieldOps<TValues>;
  lifecycleOps: LifecycleOps<TValues>;
  /** Memoized views by full prefix — cleared on dispose. */
  scopeCache: Map<string, Form<never>>;
};

/**
 * The ONE `Form` implementation. The root form is `createFormView(deps, '')`;
 * `scope(prefix)` is a memoized `createFormView(deps, joinedPrefix)`. Every method is
 * written exactly once — prefix mapping (`pre`/`isScopedKey`/`unscope`) is the identity
 * function at the root, so there is no parallel "scoped form" implementation to drift
 * (previously `core/scope.ts`, a 460-line second copy of this interface).
 */
export function createFormView<TValues extends Record<string, unknown>, P extends string>(
  deps: ViewDeps<TValues>,
  prefix: P,
): Form<PrefixValues<TValues, P>> {
  const { connectDefaults, ctx, fieldOps, lifecycleOps, scopeCache } = deps;
  const isRoot = prefix === '';
  const pfxDot = isRoot ? '' : `${prefix}.`;

  type S = PrefixValues<TValues, P>;

  function pre(name: string): string {
    return isRoot ? name : `${prefix}.${name}`;
  }

  function isScopedKey(key: string): boolean {
    return isRoot || key === prefix || key.startsWith(pfxDot);
  }

  function unscope(key: string): string {
    return isRoot || !key.startsWith(pfxDot) ? key : key.slice(pfxDot.length);
  }

  /* ---- Scoped projections (identity fast-paths at the root) ---- */

  function getScopedState(): FormState {
    if (isRoot) return ctx.getStateSnapshot();

    const rootState = ctx.getStateSnapshot();
    const errors = Object.fromEntries(
      Object.entries(rootState.errors)
        .filter(([k]) => isScopedKey(k))
        .map(([k, v]) => [unscope(k), v]),
    );
    const touchedFields = rootState.touchedFields.filter(isScopedKey).map(unscope);
    const validatingFields = rootState.validatingFields.filter(isScopedKey).map(unscope);

    return Object.freeze({
      errors: Object.freeze(errors) as FormState['errors'],
      isDirty: [...ctx.dirty].some(isScopedKey),
      isLoading: rootState.isLoading,
      isSubmitting: rootState.isSubmitting,
      isTouched: [...ctx.touched].some(isScopedKey),
      isValid: Object.keys(errors).length === 0,
      isValidating: validatingFields.length > 0,
      submitCount: rootState.submitCount,
      touchedFields: Object.freeze(touchedFields) as readonly string[],
      validatingFields: Object.freeze(validatingFields) as readonly string[],
    });
  }

  function scopedValues(): S {
    if (isRoot) return fieldOps.values() as S;

    // Read through the root's own (memoized) unflattened values and project the prefix —
    // identical semantics to the root for every store shape, including a whole-object
    // value stored at the bare prefix key (which a `startsWith(prefix + '.')` scan
    // silently dropped before). `?? {}` preserves the long-standing empty-scope
    // contract: values() is `{}`, not `undefined`, until the section has keys.
    return ((fieldOps.values() as Record<string, unknown>)[prefix] ?? {}) as S;
  }

  function scopedListFields(): readonly string[] {
    if (isRoot) return fieldOps.listFields();

    const known = new Set<string>();

    for (const key of ctx.store.keys()) {
      if (isScopedKey(key)) known.add(unscope(key));
    }

    for (const key of ctx.validators.keys()) {
      if (isScopedKey(key)) known.add(unscope(key));
    }

    return Object.freeze([...known]);
  }

  /** Errors within this view's prefix, keys stripped to relative paths. */
  function scopedErrors(): Record<string, string> {
    const errors: Record<string, string> = {};

    for (const [key, message] of ctx.fieldErrors) {
      if (isScopedKey(key)) errors[unscope(key)] = message;
    }

    return errors;
  }

  /* ---- Bulk operations — shared predicate-based primitives from fields.ts ---- */

  // All bulk ops take an optional scoping predicate in fields.ts — the root view
  // (identity predicate) and scoped views hit the same code path, so there is no
  // root-only branch here at all.
  function reset(): void {
    fieldOps.reset(isRoot ? undefined : isScopedKey);
  }

  function replace(newValues: S): void {
    fieldOps.replace(newValues as TValues, isRoot ? undefined : isScopedKey, pre);
  }

  function patch(partial: Record<string, unknown>): void {
    fieldOps.patch(partial, pre);
  }

  function resetErrors(nextErrors?: Partial<Record<ErrorKeyOf<S>, string | undefined>>): void {
    fieldOps.resetErrors(nextErrors as never, isRoot ? undefined : isScopedKey, pre);
  }

  function touchAll(): void {
    fieldOps.touchAll(isRoot ? undefined : isScopedKey);
  }

  function untouchAll(): void {
    fieldOps.untouchAll(isRoot ? undefined : isScopedKey);
  }

  /* ---- Validation ---- */

  async function validate(signal?: AbortSignal): Promise<ValidateResult> {
    ctx.ensureNotDisposed('validate');

    const fields = [...ctx.validators.keys()].filter(isScopedKey);

    // 'full' (root) additionally runs the form-level validator and replaces the whole
    // error map; scoped views only touch their own fields' errors.
    await fieldOps.runValidationCore(fields, isRoot ? 'full' : 'partial', signal);

    const errors = scopedErrors();

    return { errors, valid: Object.keys(errors).length === 0 };
  }

  async function validateFields(fields: FlatKeyOf<S>[], signal?: AbortSignal): Promise<ValidateResult> {
    ctx.ensureNotDisposed('validate');

    const prefixed = (fields as string[]).map(pre);

    await fieldOps.runValidationCore(prefixed, 'partial', signal);

    const errors: Record<string, string> = {};

    for (const pf of prefixed) {
      const message = ctx.fieldErrors.get(pf);

      if (message !== undefined) errors[unscope(pf)] = message;
    }

    return { errors, valid: Object.keys(errors).length === 0 };
  }

  /* ---- Submit ---- */

  async function submit<TResult = void>(handler: (values: S) => MaybePromise<TResult>): Promise<SubmitResult<TResult>> {
    ctx.ensureNotDisposed('submit');

    if (ctx.isSubmittingState) throw new ForgeSubmitError('submit() called while a submission is already in progress');

    ctx.batch(() => {
      ctx.submitCount++;
      ctx.isSubmittingState = true;
      fieldOps.touchAll(isRoot ? undefined : isScopedKey);
    });

    try {
      const fields = [...ctx.validators.keys()].filter(isScopedKey);

      await fieldOps.runValidationCore(fields, isRoot ? 'full' : 'partial');

      ctx.ensureNotDisposed('submit');

      const errors = scopedErrors();

      if (Object.keys(errors).length > 0) {
        return { errors, ok: false, type: 'validation' as const };
      }

      return { ok: true as const, value: await handler(scopedValues()) };
    } finally {
      ctx.isSubmittingState = false;

      if (!ctx.disposed) ctx.requestNotify();
    }
  }

  /* ---- Subscriptions ---- */

  function subscribe(listener: (state: FormState) => void, options?: SubscribeOptions): Unsubscribe {
    if (isRoot) return ctx.subscribe(listener, options);

    // Scoped views fire only when their scoped projection changes — mutations outside
    // the prefix are suppressed by comparing consecutive projections.
    let prevState: FormState | null = null;

    const unsubscribe = ctx.subscribe(
      () => {
        const next = getScopedState();

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
      },
      { sync: false },
    );

    // `{ sync: true }` fires with the *scoped* projection — never the unfiltered root
    // state (which is what delegating the option through used to leak). Seed prevState
    // so the next notification is compared against this emission, not a null baseline.
    if (options?.sync) {
      prevState = getScopedState();
      listener(prevState);
    }

    return unsubscribe;
  }

  function subscribeField<K extends FlatKeyOf<S>>(
    name: K,
    listener: (state: FieldState<TypeAtPath<S, K>>) => void,
    options?: SubscribeOptions,
  ): Unsubscribe {
    return ctx.subscribeField(pre(name as string), listener as (state: FieldState<unknown>) => void, options);
  }

  /* ---- Connect — per-binding debounce timer ---- */

  function connect<K extends FlatKeyOf<S>>(name: K, config?: ConnectOptions): ConnectionResult<TypeAtPath<S, K>> {
    ctx.ensureNotDisposed('connect');

    const key = pre(name as string);

    assertSafeKey(key);

    // Three-way fallback (per-call config -> form-level default -> hard default), one place.
    function resolve<Opt extends keyof ConnectOptions>(option: Opt, fallback: NonNullable<ConnectOptions[Opt]>) {
      return config?.[option] ?? connectDefaults[option] ?? fallback;
    }

    const touchOnBlur = resolve('touchOnBlur', false);
    const validateOnBlur = resolve('validateOnBlur', false);
    const validateOnChange = resolve('validateOnChange', false);
    const validateOnTouch = resolve('validateOnTouch', false);
    const debounceMs = resolve('debounce', 0);

    // Each connect() call owns its own timer — cancelling one binding never affects another.
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    function scheduleValidation(): void {
      if (debounceTimer !== null) clearTimeout(debounceTimer);

      const run = (): void => {
        if (ctx.disposed) return;

        void fieldOps.validateFields([key]).catch((err: unknown) => {
          if (!isAbortError(err)) throw err;
        });
      };

      if (debounceMs > 0) {
        debounceTimer = setTimeout(() => {
          debounceTimer = null;
          run();
        }, debounceMs);
      } else {
        run();
      }
    }

    let bindingDisposed = false;

    return {
      get dirty() {
        return ctx.dirty.has(key);
      },
      /** Cancels this binding's own debounce timer. Does not affect other bindings for the same field. */
      dispose() {
        bindingDisposed = true;

        if (debounceTimer !== null) {
          clearTimeout(debounceTimer);
          debounceTimer = null;
        }
      },
      get disposed() {
        return bindingDisposed;
      },
      get error() {
        return ctx.fieldErrors.get(key);
      },
      onBlur: () => {
        if (ctx.disposed) return;

        if (touchOnBlur) fieldOps.touch(key as FlatKeyOf<TValues>);

        if (validateOnBlur) scheduleValidation();
      },
      onChange: (value: TypeAtPath<S, K>) => {
        if (ctx.disposed) return;

        fieldOps.set(key as FlatKeyOf<TValues>, value as TypeAtPath<TValues, FlatKeyOf<TValues>>);

        const shouldValidate = validateOnChange || (validateOnTouch && ctx.touched.has(key));

        if (shouldValidate) scheduleValidation();
      },
      [Symbol.dispose]() {
        this.dispose();
      },
      get touched() {
        return ctx.touched.has(key);
      },
      get value() {
        return ctx.store.get(key) as TypeAtPath<S, K>;
      },
    };
  }

  /* ---- Public form object ---- */

  const view: Form<S> = {
    array: (name) =>
      fieldOps.array(pre(name as string) as FlatKeyOf<TValues>) as ArrayField<
        TypeAtPath<S, typeof name> extends readonly (infer E)[] ? E : unknown
      >,
    batch: (fn) => ctx.batch(fn),
    clearError: (name) => fieldOps.clearError(pre(name as string) as ErrorKeyOf<TValues>),
    connect,
    get disposalSignal() {
      return ctx.disposeController.signal;
    },
    dispose: isRoot
      ? () => lifecycleOps.dispose()
      : () => {
          /* Scoped views share lifecycle with the root — dispose the root form to tear down */
        },
    get disposed() {
      return ctx.disposed;
    },
    field: (name) =>
      fieldOps.field(pre(name as string) as FlatKeyOf<TValues>) as FieldState<TypeAtPath<S, typeof name>>,
    fields: {
      list: scopedListFields,
      register: (name, options) => fieldOps.registerField(pre(name as string) as FlatKeyOf<TValues>, options as never),
      remove: (name) => fieldOps.removeField(pre(name as string) as FlatKeyOf<TValues>),
      setValidator: (name, validator?: FieldValidator) =>
        fieldOps.setValidator(pre(name as string) as FlatKeyOf<TValues>, validator),
    },
    get: (name) => fieldOps.get(pre(name as string) as FlatKeyOf<TValues>) as TypeAtPath<S, typeof name>,
    history: {
      // Casts are irreducible: FormSnapshot<S> and FormSnapshot<TValues> are structurally
      // unrelated generic instantiations -- TS cannot verify one against the other.
      restore: (snap) => lifecycleOps.restore(snap as FormSnapshot<TValues>),
      snapshot: () => lifecycleOps.snapshot() as FormSnapshot<S>,
    },
    get isLoading() {
      return ctx.loadingState;
    },
    get isSubmitting() {
      return ctx.isSubmittingState;
    },
    patch: patch as Form<S>['patch'],
    replace: replace as Form<S>['replace'],
    reset,
    resetErrors: resetErrors as Form<S>['resetErrors'],
    resetField: (name) => fieldOps.resetField(pre(name as string) as FlatKeyOf<TValues>),
    scope: (subPrefix) => {
      const fullPrefix = pre(subPrefix as string);
      const cached = scopeCache.get(fullPrefix);

      if (cached) return cached as Form<PrefixValues<S, typeof subPrefix>>;

      const scoped = createFormView(deps, fullPrefix) as Form<PrefixValues<S, typeof subPrefix>>;

      scopeCache.set(fullPrefix, scoped as Form<never>);

      return scoped;
    },
    set: (name, value, options?: SetOptions) =>
      fieldOps.set(
        pre(name as string) as FlatKeyOf<TValues>,
        value as TypeAtPath<TValues, FlatKeyOf<TValues>>,
        options,
      ),
    setError: (name, message) => fieldOps.setError(pre(name as string) as ErrorKeyOf<TValues>, message),
    get state() {
      return getScopedState();
    },
    submit: submit as Form<S>['submit'],
    subscribe,
    subscribeField,
    [Symbol.dispose]() {
      this.dispose();
    },
    touch: (name) => fieldOps.touch(pre(name as string) as FlatKeyOf<TValues>),
    touchAll,
    untouch: (name) => fieldOps.untouch(pre(name as string) as FlatKeyOf<TValues>),
    untouchAll,
    validate,
    validateFields: validateFields as Form<S>['validateFields'],
    values: scopedValues,
  };

  return view;
}
