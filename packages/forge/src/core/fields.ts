import { isAbortError } from '@vielzeug/arsenal';

import type { FormContext } from './context';

import { warn } from '../_dev';
import { anySignal, assertSafeKey, flattenValues, isSafeKey, sanitizeForLog, unflattenValues } from '../_utils';
import { ForgeSubmitError } from '../errors';
import {
  type ArrayField,
  type ErrorKeyOf,
  type FieldState,
  type FieldValidator,
  type FlatKeyOf,
  type MaybePromise,
  type RegisterFieldOptions,
  type SetOptions,
  type SubmitResult,
  type TypeAtPath,
  type Unsubscribe,
  type ValidateResult,
} from '../types';
import { createArrayField } from './array';

/**
 * Field values, dirty/touch tracking, field-level errors, dynamic field registration, and
 * validation/submit — one module, not the two (`values.ts`/`validation.ts`) it used to be
 * split across. That split was drawn along "which section of the original monolithic
 * `createForm()` this code used to live in," not along a real boundary: validating a field
 * needs the same store/fieldErrors/fieldCtrls state that setting one does, so the old split
 * required threading `deps: Pick<ValueOps, '...'>` between files just to call each other. One
 * closure removes that threading entirely.
 *
 * The six `*Keys(predicate)` functions below are the internal bulk-mutation primitives behind
 * the public `reset`/`replace`/`patch`/`touchAll`/`untouchAll`/`resetErrors` — each of those
 * takes an optional `scopePredicate` so the root form and scoped form views (core/view.ts) hit
 * the same code path with no parallel implementation.
 */
export function createFieldOps<TValues extends Record<string, unknown>>(ctx: FormContext<TValues>) {
  /* ======== Values ======== */

  function get<K extends FlatKeyOf<TValues>>(name: K): TypeAtPath<TValues, K> {
    const key = name as string;

    assertSafeKey(key);

    return ctx.store.get(key) as TypeAtPath<TValues, K>;
  }

  function values(): TValues {
    return (ctx.cachedValues ??= unflattenValues(Object.fromEntries(ctx.store)) as TValues);
  }

  function trackDirty(name: string, value: unknown): void {
    if (ctx.baseline.get(name) === value) ctx.dirty.delete(name);
    else ctx.dirty.add(name);
  }

  function set<K extends FlatKeyOf<TValues>>(name: K, value: TypeAtPath<TValues, K>, options: SetOptions = {}): void {
    ctx.ensureNotDisposed('set');

    const key = name as string;

    assertSafeKey(key);
    ctx.store.set(key, value);
    trackDirty(key, value);

    if (options.touched) ctx.touched.add(key);

    ctx.requestNotify(key);
  }

  function field<K extends FlatKeyOf<TValues>>(name: K): FieldState<TypeAtPath<TValues, K>> {
    const key = name as string;

    assertSafeKey(key);

    return ctx.getFieldSnapshot(key) as FieldState<TypeAtPath<TValues, K>>;
  }

  /* ======== Errors ======== */

  function setError(name: ErrorKeyOf<TValues>, message: string): void {
    ctx.ensureNotDisposed('setError');

    const key = name as string;

    assertSafeKey(key);
    ctx.fieldErrors.set(key, message);
    ctx.invalidateErrors();
    ctx.requestNotify(key);
  }

  function clearError(name: ErrorKeyOf<TValues>): void {
    ctx.ensureNotDisposed('clearError');

    const key = name as string;

    assertSafeKey(key);

    if (ctx.fieldErrors.delete(key)) {
      ctx.invalidateErrors();
      ctx.requestNotify(key);
    }
  }

  /**
   * Shared primitive behind `resetErrors()` (predicate `() => true`) and `scope.ts`'s scoped
   * `resetErrors()` (predicate `isScopedKey`, mapper `pre`). Clears every error matching
   * `predicate`, then applies `nextErrors` through `toFullKey`.
   */
  function resetErrorsKeys(
    predicate: (key: string) => boolean,
    nextErrors: Partial<Record<string, string | undefined>>,
    toFullKey: (key: string) => string,
  ): void {
    for (const key of [...ctx.fieldErrors.keys()]) {
      if (predicate(key)) ctx.fieldErrors.delete(key);
    }

    for (const [key, message] of Object.entries(nextErrors)) {
      const fullKey = toFullKey(key);

      assertSafeKey(fullKey);

      if (typeof message === 'string') ctx.fieldErrors.set(fullKey, message);
    }

    ctx.invalidateErrors();
  }

  function resetErrors(
    nextErrors: Partial<Record<ErrorKeyOf<TValues>, string | undefined>> = {},
    scopePredicate?: (key: string) => boolean,
    toFullKey?: (key: string) => string,
  ): void {
    ctx.ensureNotDisposed('resetErrors');
    resetErrorsKeys(scopePredicate ?? (() => true), nextErrors, toFullKey ?? ((k) => k));
    ctx.requestNotify();
  }

  /**
   * Warns when `key` looks like a dot-notation array item path (e.g. "tags.0") that isn't
   * already a real store entry — array items are stored as whole arrays, not individual keys.
   * Shared by `setValidator()` and `registerField()`.
   */
  function warnIfArrayItemKey(key: string, apiLabel: string): void {
    if (/\.\d+(\.|$)/.test(key) && !ctx.store.has(key)) {
      const displayKey = sanitizeForLog(key, 80);

      warn(
        `${apiLabel}('${displayKey}'): path looks like an array item key. ` +
          `Array items are stored as whole arrays — register on the parent key instead.`,
      );
    }
  }

  function setValidator(name: FlatKeyOf<TValues>, validator?: FieldValidator<unknown>): void {
    ctx.ensureNotDisposed('setValidator');

    const key = name as string;

    assertSafeKey(key);
    warnIfArrayItemKey(key, 'setValidator');

    ctx.fieldCtrls.get(key)?.abort();
    ctx.fieldCtrls.delete(key);

    if (validator) {
      ctx.validators.set(key, validator);
    } else {
      ctx.validators.delete(key);

      if (ctx.fieldErrors.delete(key)) {
        ctx.invalidateErrors();
        ctx.requestNotify(key);
      }
    }
  }

  /* ======== Dynamic field registration ======== */

  function registerField<K extends FlatKeyOf<TValues>>(
    name: K,
    options: RegisterFieldOptions<TypeAtPath<TValues, K>> = {},
  ): Unsubscribe {
    ctx.ensureNotDisposed('fields.register');

    const key = name as string;

    assertSafeKey(key);
    warnIfArrayItemKey(key, 'fields.register');

    if (options.validator !== undefined) setValidator(name, options.validator as FieldValidator<unknown>);

    if (options.defaultValue !== undefined && !ctx.store.has(key)) {
      ctx.store.set(key, options.defaultValue);
      ctx.baseline.set(key, options.defaultValue);
      ctx.requestNotify(key);
    }

    return () => {
      if (!ctx.disposed) removeField(name);
    };
  }

  function listFields(): readonly string[] {
    const known = new Set<string>();

    for (const name of ctx.store.keys()) known.add(name);
    for (const name of ctx.validators.keys()) known.add(name);

    return Object.freeze([...known]);
  }

  /* ======== Touch ======== */

  function touch(name: FlatKeyOf<TValues>): void {
    ctx.ensureNotDisposed('touch');

    const key = name as string;

    assertSafeKey(key);
    ctx.touched.add(key);
    ctx.requestNotify(key);
  }

  function untouch(name: FlatKeyOf<TValues>): void {
    ctx.ensureNotDisposed('untouch');

    const key = name as string;

    assertSafeKey(key);

    if (ctx.touched.delete(key)) ctx.requestNotify(key);
  }

  /** Shared by `touchAll()` at the root and scoped views (via `touchAll(scopePredicate)`). */
  function touchAllKeys(predicate: (key: string) => boolean): void {
    for (const name of ctx.store.keys()) if (predicate(name)) ctx.touched.add(name);
    for (const name of ctx.validators.keys()) if (predicate(name)) ctx.touched.add(name);
  }

  function touchAll(scopePredicate?: (key: string) => boolean): void {
    ctx.ensureNotDisposed('touchAll');
    touchAllKeys(scopePredicate ?? (() => true));
    ctx.requestNotify();
  }

  /** Shared by `untouchAll()` at the root and scoped views (via `untouchAll(scopePredicate)`). */
  function untouchAllKeys(predicate: (key: string) => boolean): void {
    for (const name of [...ctx.touched]) if (predicate(name)) ctx.touched.delete(name);
  }

  function untouchAll(scopePredicate?: (key: string) => boolean): void {
    ctx.ensureNotDisposed('untouchAll');
    untouchAllKeys(scopePredicate ?? (() => true));
    ctx.requestNotify();
  }

  /* ======== Lifecycle: field operations ======== */

  function resetField(name: FlatKeyOf<TValues>): void {
    ctx.ensureNotDisposed('resetField');

    const key = name as string;

    assertSafeKey(key);
    ctx.fieldCtrls.get(key)?.abort();
    ctx.fieldCtrls.delete(key);
    ctx.store.set(key, ctx.baseline.get(key));
    ctx.dirty.delete(key);
    ctx.touched.delete(key);

    if (ctx.fieldErrors.delete(key)) ctx.invalidateErrors();

    ctx.requestNotify(key);
  }

  function removeField(name: FlatKeyOf<TValues>): void {
    ctx.ensureNotDisposed('fields.remove');

    const key = name as string;

    assertSafeKey(key);
    ctx.store.delete(key);
    ctx.baseline.delete(key);
    ctx.dirty.delete(key);
    ctx.touched.delete(key);
    ctx.validators.delete(key);
    ctx.arrayCache.delete(key);
    ctx.fieldCtrls.get(key)?.abort();
    ctx.fieldCtrls.delete(key);

    if (ctx.fieldErrors.delete(key)) ctx.invalidateErrors();

    ctx.requestNotify(key);
  }

  /**
   * Every key a bulk operation might need to touch — not just `store.keys()`. A validator-only
   * field (a validator with no matching store entry, e.g. a cross-field or virtual-name
   * validator) can still be `touched` or hold a `fieldErrors` entry, so `resetKeys`/
   * `replaceKeys` below must consider `touched`/`fieldErrors`/`validators` too, not just
   * `store` — deriving "everything reset must clear" from `store.keys()` alone silently leaves
   * such a field's touched/error state behind.
   */
  function allKnownKeys(): Set<string> {
    return new Set([...ctx.store.keys(), ...ctx.touched, ...ctx.fieldErrors.keys(), ...ctx.validators.keys()]);
  }

  /**
   * Shared primitive behind `reset()` (no scope predicate) and scoped views'
   * `reset()` (predicate `isScopedKey`). For each known key matching `predicate`: aborts its
   * in-flight field validation, restores its baseline value (or removes it entirely if it has
   * no baseline entry — e.g. a key written via `set()` alone, never through `patch()`), and
   * clears its dirty/touched/error state.
   */
  function resetKeys(predicate: (key: string) => boolean): void {
    for (const key of allKnownKeys()) {
      if (!predicate(key)) continue;

      ctx.fieldCtrls.get(key)?.abort();
      ctx.fieldCtrls.delete(key);

      // Both branches are no-ops for a validator-only key that was never in `store` to begin
      // with — `Map.delete()` on an absent key is a safe no-op, and `baseline.has(key)` is
      // false for it, so it falls through to `delete` rather than writing an `undefined` entry.
      if (ctx.baseline.has(key)) ctx.store.set(key, ctx.baseline.get(key));
      else ctx.store.delete(key);

      ctx.dirty.delete(key);
      ctx.touched.delete(key);

      if (ctx.fieldErrors.delete(key)) ctx.invalidateErrors();
    }
  }

  /**
   * Restore values from the baseline and clear errors/touched/dirty.
   * No argument = full form: additionally aborts every in-flight validation run and
   * resets submitCount. Passing `scopePredicate` means scoped-view semantics — reset
   * only matching keys, and do NOT reset submitCount or abort cross-field run
   * controllers (per-key field validations are still aborted by `resetKeys` itself).
   */
  function reset(scopePredicate?: (key: string) => boolean): void {
    ctx.ensureNotDisposed('reset');

    if (scopePredicate) {
      resetKeys(scopePredicate);
    } else {
      for (const ctrl of ctx.runCtrls) ctrl.abort();

      ctx.runCtrls.clear();
      ctx.validatingCount.clear();
      resetKeys(() => true);
      ctx.submitCount = 0;
    }

    ctx.requestNotify();
  }

  /**
   * Shared primitive behind `replace()` (predicate `() => true`, mapper `(k) => k`) and
   * scoped views' `replace()` (predicate `isScopedKey`, mapper `pre`). Removes every
   * store/baseline/touched/error entry matching `predicate` (see `allKnownKeys()` above for
   * why this isn't just `store.keys()`), then writes `flat` back in as both store and baseline
   * (a replace always establishes a new, clean baseline).
   */
  function replaceKeys(
    predicate: (key: string) => boolean,
    flat: Record<string, unknown>,
    toFullKey: (key: string) => string,
  ): void {
    for (const key of allKnownKeys()) {
      if (!predicate(key)) continue;

      ctx.fieldCtrls.get(key)?.abort();
      ctx.fieldCtrls.delete(key);
      ctx.store.delete(key);
      ctx.baseline.delete(key);
      ctx.dirty.delete(key);
      ctx.touched.delete(key);

      if (ctx.fieldErrors.delete(key)) ctx.invalidateErrors();
    }

    for (const [key, value] of Object.entries(flat)) {
      const fullKey = toFullKey(key);

      ctx.store.set(fullKey, value);
      ctx.baseline.set(fullKey, value);
    }
  }

  /**
   * Replace values and baseline in one operation.
   * No `predicate` = full form: additionally aborts every in-flight validation run and
   * resets submitCount. A `predicate` (with `toFullKey` mapper) scopes the replacement
   * to a view's prefix — submitCount and run controllers are full-form state and stay
   * untouched.
   */
  function replace(
    newValues: TValues,
    predicate?: (key: string) => boolean,
    toFullKey?: (key: string) => string,
  ): void {
    ctx.ensureNotDisposed('replace');

    const flat = flattenValues(newValues as Record<string, unknown>);

    if (predicate) {
      replaceKeys(predicate, flat, toFullKey ?? ((k) => k));
    } else {
      for (const ctrl of ctx.runCtrls) ctrl.abort();

      ctx.runCtrls.clear();
      ctx.validatingCount.clear();
      replaceKeys(
        () => true,
        flat,
        (k) => k,
      );
      ctx.submitCount = 0;
    }

    ctx.requestNotify();
  }

  /**
   * Shared primitive behind `patch()` at the root and scoped views (mapper `pre`). Unlike
   * `resetKeys`/`replaceKeys`, `patch()` never needs a predicate — the partial object itself
   * already names exactly the keys to touch. Returns the full (prefixed) keys written, for
   * the caller to pass to `requestNotify()`.
   */
  function patchKeys(partial: Record<string, unknown>, toFullKey: (key: string) => string): string[] {
    const flat = flattenValues(partial);
    const changedKeys: string[] = [];

    for (const [key, value] of Object.entries(flat)) {
      const fullKey = toFullKey(key);

      ctx.baseline.set(fullKey, value);
      ctx.store.set(fullKey, value);
      ctx.dirty.delete(fullKey);
      changedKeys.push(fullKey);
    }

    return changedKeys;
  }

  /** `toFullKey` maps the partial's relative keys to store keys (identity at the root). */
  function patch(partial: Record<string, unknown>, toFullKey?: (key: string) => string): void {
    ctx.ensureNotDisposed('patch');
    ctx.requestNotify(patchKeys(partial, toFullKey ?? ((k) => k)));
  }

  /* ======== Array helpers ======== */

  function array(name: FlatKeyOf<TValues>): ArrayField {
    ctx.ensureNotDisposed('array');

    const key = name as string;

    assertSafeKey(key);

    const cached = ctx.arrayCache.get(key);

    if (cached) return cached;

    const helpers = createArrayField(name, ctx.store, set as (name: string, value: unknown) => void);

    ctx.arrayCache.set(key, helpers);

    return helpers;
  }

  /* ======== Validation ======== */

  async function runFieldValidator(name: string, signal: AbortSignal): Promise<string | undefined> {
    const validator = ctx.validators.get(name);

    if (!validator) return undefined;

    if (signal.aborted) throw signal.reason;

    const result = await validator(ctx.store.get(name), signal);

    return typeof result === 'string' ? result : undefined;
  }

  async function runFormValidator(signal: AbortSignal): Promise<Record<string, string>> {
    if (!ctx.formValidator) return {};

    if (signal.aborted) throw signal.reason;

    const result = await ctx.formValidator(values(), signal);
    const errors: Record<string, string> = {};

    if (result) {
      for (const [key, message] of Object.entries(result)) {
        // Security: a custom FormValidator function is caller-authored code — its returned
        // keys are just as untrusted as a schema's `issue.path`. Reject reserved segments.
        if (isSafeKey(key) && typeof message === 'string') errors[key] = message;
      }
    }

    return errors;
  }

  function applyFieldErrors(
    fieldSet: Set<string>,
    nextErrors: Record<string, string>,
    formErrors: Record<string, string>,
    scope: 'full' | 'partial',
  ): void {
    if (scope === 'full') {
      ctx.fieldErrors.clear();

      for (const [key, message] of Object.entries(formErrors)) {
        if (nextErrors[key] === undefined) nextErrors[key] = message;
      }

      for (const [key, message] of Object.entries(nextErrors)) ctx.fieldErrors.set(key, message);

      ctx.invalidateErrors();
      ctx.requestNotify();
    } else {
      const changedFields = new Set<string>();

      for (const name of fieldSet) {
        const next = nextErrors[name];
        const previous = ctx.fieldErrors.get(name);

        if (next !== undefined) {
          ctx.fieldErrors.set(name, next);

          if (previous !== next) changedFields.add(name);
        } else if (ctx.fieldErrors.delete(name)) {
          changedFields.add(name);
        }
      }

      if (changedFields.size > 0) ctx.invalidateErrors();

      ctx.requestNotify(changedFields);
    }
  }

  async function runValidationCore(
    fields: string[],
    scope: 'full' | 'partial',
    signal?: AbortSignal,
  ): Promise<ValidateResult & { aborted: boolean }> {
    const fieldSet = new Set(fields);
    const fieldRunCtrls = new Map<string, AbortController>();

    for (const name of fieldSet) {
      ctx.fieldCtrls.get(name)?.abort();

      const ctrl = new AbortController();

      ctx.fieldCtrls.set(name, ctrl);
      fieldRunCtrls.set(name, ctrl);
    }

    const runCtrl = new AbortController();
    const runSignal = anySignal(runCtrl.signal, signal, ctx.disposeController.signal)!;

    ctx.runCtrls.add(runCtrl);

    for (const name of fieldSet) {
      ctx.validatingCount.set(name, (ctx.validatingCount.get(name) ?? 0) + 1);
    }

    ctx.requestNotify();

    try {
      const results = await Promise.all(
        [...fieldSet].map(async (name) => {
          const fieldSignal = scope === 'partial' ? anySignal(fieldRunCtrls.get(name)!.signal, runSignal)! : runSignal;

          return [name, await runFieldValidator(name, fieldSignal)] as const;
        }),
      );

      if (runSignal.aborted) {
        return { aborted: true, errors: Object.fromEntries(ctx.fieldErrors), valid: ctx.fieldErrors.size === 0 };
      }

      const nextErrors: Record<string, string> = {};

      for (const [name, message] of results) {
        if (message !== undefined) nextErrors[name] = message;
      }

      const formErrors = scope === 'full' ? await runFormValidator(runSignal) : {};

      applyFieldErrors(fieldSet, nextErrors, formErrors, scope);

      return { aborted: false, errors: Object.fromEntries(ctx.fieldErrors), valid: ctx.fieldErrors.size === 0 };
    } catch (error) {
      if (isAbortError(error)) {
        return { aborted: true, errors: Object.fromEntries(ctx.fieldErrors), valid: ctx.fieldErrors.size === 0 };
      }

      throw error;
    } finally {
      ctx.runCtrls.delete(runCtrl);

      for (const name of fieldSet) {
        const count = (ctx.validatingCount.get(name) ?? 1) - 1;

        if (count <= 0) ctx.validatingCount.delete(name);
        else ctx.validatingCount.set(name, count);
      }

      ctx.requestNotify();

      for (const [name, ctrl] of fieldRunCtrls) {
        if (ctx.fieldCtrls.get(name) === ctrl) ctx.fieldCtrls.delete(name);
      }
    }
  }

  async function validateFields(
    fields: FlatKeyOf<TValues>[] | string[],
    signal?: AbortSignal,
  ): Promise<ValidateResult> {
    ctx.ensureNotDisposed('validate');

    const result = await runValidationCore(fields as string[], 'partial', signal);

    return { errors: result.errors, valid: result.valid };
  }

  async function validate(signal?: AbortSignal): Promise<ValidateResult> {
    ctx.ensureNotDisposed('validate');

    const result = await runValidationCore([...ctx.validators.keys()], 'full', signal);

    return { errors: result.errors, valid: result.valid };
  }

  /* ======== Submit ======== */

  async function submit<TResult = void>(
    handler: (values: TValues) => MaybePromise<TResult>,
  ): Promise<SubmitResult<TResult>> {
    ctx.ensureNotDisposed('submit');

    if (ctx.isSubmittingState) throw new ForgeSubmitError('submit() called while a submission is already in progress');

    ctx.batch(() => {
      ctx.submitCount++;
      ctx.isSubmittingState = true;
      touchAll();
    });

    try {
      const validation = await runValidationCore([...ctx.validators.keys()], 'full');

      ctx.ensureNotDisposed('submit');

      if (!validation.valid) {
        return { errors: validation.errors, ok: false, type: 'validation' };
      }

      return { ok: true, value: await handler(values()) };
    } finally {
      ctx.isSubmittingState = false;

      if (!ctx.disposed) ctx.requestNotify();
    }
  }

  return {
    array,
    clearError,
    field,
    get,
    listFields,
    patch,
    registerField,
    removeField,
    replace,
    reset,
    resetErrors,
    resetField,
    runValidationCore,
    set,
    setError,
    setValidator,
    submit,
    touch,
    touchAll,
    untouch,
    untouchAll,
    validate,
    validateFields,
    values,
  };
}

export type FieldOps<TValues extends Record<string, unknown>> = ReturnType<typeof createFieldOps<TValues>>;
