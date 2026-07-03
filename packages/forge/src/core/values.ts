import type { FormContext } from './context';

import { warn } from '../_dev';
import { assertSafeKey, flattenValues, sanitizeForLog, unflattenValues } from '../_utils';
import {
  type ArrayField,
  type ErrorKeyOf,
  type FieldState,
  type FieldValidator,
  type FlatKeyOf,
  type RegisterFieldOptions,
  type SetOptions,
  type TypeAtPath,
  type Unsubscribe,
} from '../types';
import { createArrayField } from './array';

/**
 * Value/field-mutation operations: get/set/values, dirty tracking, errors, dynamic field
 * registration, touch, and reset/replace/patch/array. Moved verbatim from `createForm()`'s
 * "Value access" through "Lifecycle: field operations" sections.
 */
export function createValueOps<TValues extends Record<string, unknown>>(ctx: FormContext<TValues>) {
  function get<K extends FlatKeyOf<TValues>>(name: K): TypeAtPath<TValues, K> {
    const key = name as string;

    assertSafeKey(key);

    return ctx.store.get(key) as TypeAtPath<TValues, K>;
  }

  function values(): TValues {
    return (ctx.cachedValues ??= unflattenValues(Object.fromEntries(ctx.store)) as TValues);
  }

  /* ======== Dirty tracking ======== */

  function trackDirty(name: string, value: unknown): void {
    if (ctx.baseline.get(name) === value) ctx.dirty.delete(name);
    else ctx.dirty.add(name);
  }

  /* ======== Field mutation ======== */

  function set<K extends FlatKeyOf<TValues>>(name: K, value: TypeAtPath<TValues, K>, options: SetOptions = {}): void {
    ctx.ensureNotDisposed();

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

  function setError(name: ErrorKeyOf<TValues>, message: string): void {
    ctx.ensureNotDisposed();

    const key = name as string;

    assertSafeKey(key);
    ctx.fieldErrors.set(key, message);
    ctx.invalidateErrors();
    ctx.requestNotify(key);
  }

  function clearError(name: ErrorKeyOf<TValues>): void {
    ctx.ensureNotDisposed();

    const key = name as string;

    assertSafeKey(key);

    if (ctx.fieldErrors.delete(key)) {
      ctx.invalidateErrors();
      ctx.requestNotify(key);
    }
  }

  function resetErrors(nextErrors: Partial<Record<ErrorKeyOf<TValues>, string | undefined>> = {}): void {
    ctx.ensureNotDisposed();

    ctx.fieldErrors.clear();

    for (const [key, message] of Object.entries(nextErrors)) {
      assertSafeKey(key);

      if (typeof message === 'string') ctx.fieldErrors.set(key, message);
    }

    ctx.invalidateErrors();
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
    ctx.ensureNotDisposed();

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
    ctx.ensureNotDisposed();

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

  /* ======== Field enumeration ======== */

  function listFields(): readonly string[] {
    const known = new Set<string>();

    for (const name of ctx.store.keys()) known.add(name);
    for (const name of ctx.validators.keys()) known.add(name);

    return Object.freeze([...known]);
  }

  /* ======== Touch ======== */

  function touch(name: FlatKeyOf<TValues>): void {
    ctx.ensureNotDisposed();

    const key = name as string;

    assertSafeKey(key);
    ctx.touched.add(key);
    ctx.requestNotify(key);
  }

  function untouch(name: FlatKeyOf<TValues>): void {
    ctx.ensureNotDisposed();

    const key = name as string;

    assertSafeKey(key);

    if (ctx.touched.delete(key)) ctx.requestNotify(key);
  }

  function touchAll(): void {
    ctx.ensureNotDisposed();

    for (const name of ctx.store.keys()) ctx.touched.add(name);
    for (const name of ctx.validators.keys()) ctx.touched.add(name);

    ctx.requestNotify();
  }

  function untouchAll(): void {
    ctx.ensureNotDisposed();
    ctx.touched.clear();
    ctx.requestNotify();
  }

  /* ======== Lifecycle: field operations ======== */

  function resetField(name: FlatKeyOf<TValues>): void {
    ctx.ensureNotDisposed();

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
    ctx.ensureNotDisposed();

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

  function reset(): void {
    ctx.ensureNotDisposed();

    for (const ctrl of ctx.runCtrls) ctrl.abort();
    for (const ctrl of ctx.fieldCtrls.values()) ctrl.abort();

    ctx.runCtrls.clear();
    ctx.fieldCtrls.clear();
    ctx.validatingRuns.clear();
    ctx.store.clear();
    ctx.fieldErrors.clear();
    ctx.touched.clear();
    ctx.dirty.clear();
    ctx.submitCount = 0;
    ctx.invalidateErrors();

    for (const [name, value] of ctx.baseline) ctx.store.set(name, value);

    ctx.requestNotify();
  }

  function replace(newValues: TValues): void {
    ctx.ensureNotDisposed();

    for (const ctrl of ctx.runCtrls) ctrl.abort();
    for (const ctrl of ctx.fieldCtrls.values()) ctrl.abort();

    ctx.runCtrls.clear();
    ctx.fieldCtrls.clear();
    ctx.validatingRuns.clear();

    const flat = flattenValues(newValues as Record<string, unknown>);

    ctx.store.clear();
    ctx.baseline.clear();
    ctx.fieldErrors.clear();
    ctx.touched.clear();
    ctx.dirty.clear();
    ctx.submitCount = 0;
    ctx.invalidateErrors();

    for (const [name, value] of Object.entries(flat)) {
      ctx.store.set(name, value);
      ctx.baseline.set(name, value);
    }

    ctx.requestNotify();
  }

  function patch(partial: Record<string, unknown>): void {
    ctx.ensureNotDisposed();

    const flat = flattenValues(partial);

    for (const [key, value] of Object.entries(flat)) {
      ctx.baseline.set(key, value);
      ctx.store.set(key, value);
      ctx.dirty.delete(key);
    }

    ctx.requestNotify(Object.keys(flat));
  }

  /* ======== Array helpers ======== */

  function array(name: FlatKeyOf<TValues>): ArrayField {
    ctx.ensureNotDisposed();

    const key = name as string;

    assertSafeKey(key);

    const cached = ctx.arrayCache.get(key);

    if (cached) return cached;

    const helpers = createArrayField(name, ctx.store, set as (name: string, value: unknown) => void);

    ctx.arrayCache.set(key, helpers);

    return helpers;
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
    set,
    setError,
    setValidator,
    touch,
    touchAll,
    untouch,
    untouchAll,
    values,
  };
}

export type ValueOps<TValues extends Record<string, unknown>> = ReturnType<typeof createValueOps<TValues>>;
