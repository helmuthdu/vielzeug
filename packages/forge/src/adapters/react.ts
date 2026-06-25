import type { ConnectionResult, ConnectOptions, FieldState, FlatKeyOf, Form, FormState, TypeAtPath } from '../index.js';

import { ForgeError } from '../errors.js';

/**
 * `useSyncExternalStore` signature — typed locally so this adapter has no hard
 * dependency on the `react` package.
 */
export type UseSyncExternalStoreFn = <T>(
  subscribe: (onStoreChange: () => void) => () => void,
  getSnapshot: () => T,
) => T;

/**
 * Minimal `useEffect` signature — matches `useEffect` from `react`.
 * Typed locally so this adapter has no hard dependency on the `react` package.
 */
export type UseEffectFn = (effect: () => (() => void) | void, deps?: readonly unknown[]) => void;

/**
 * Minimal `useRef` signature — matches `useRef` from `react`.
 * Typed locally so this adapter has no hard dependency on the `react` package.
 */
export type UseRefFn = <T>(initialValue: T) => { current: T };

/**
 * Explicit return type of {@link createForgeHooks}. Useful for annotating the
 * shared hooks object exported from an app's `lib/form-hooks.ts`.
 */
export type ForgeHooks = {
  /**
   * Returns a stable `ConnectionResult` binding for a single field.
   * Created once on mount, updated when `name` or `options` identity changes,
   * and automatically disposed on unmount. No manual `dispose()` call needed.
   *
   * Requires `useEffect` and `useRef` to be provided to {@link createForgeHooks}.
   */
  useConnect<T extends Record<string, unknown>, K extends FlatKeyOf<T>>(
    form: Form<T>,
    name: K,
    options?: ConnectOptions,
  ): ConnectionResult<TypeAtPath<T, K>>;
  useField<T extends Record<string, unknown>, K extends FlatKeyOf<T>>(
    form: Form<T>,
    name: K,
  ): FieldState<TypeAtPath<T, K>>;
  useFormState<T extends Record<string, unknown>>(form: Form<T>): FormState;
  useFormValues<T extends Record<string, unknown>>(form: Form<T>): T;
};

/**
 * Creates React hooks bound to the provided React primitives.
 * Call once per application (typically in a shared module) and re-use the returned hooks.
 *
 * @example
 * ```ts
 * // lib/form-hooks.ts
 * import { useEffect, useRef, useSyncExternalStore } from 'react';
 * import { createForgeHooks } from '@vielzeug/forge/react';
 *
 * export const { useFormState, useField, useFormValues, useConnect } =
 *   createForgeHooks({ useEffect, useRef, useSyncExternalStore });
 * ```
 */
export function createForgeHooks(
  depsOrFn:
    | UseSyncExternalStoreFn
    | { useEffect?: UseEffectFn; useRef?: UseRefFn; useSyncExternalStore: UseSyncExternalStoreFn },
): ForgeHooks {
  const useSyncExternalStore = typeof depsOrFn === 'function' ? depsOrFn : depsOrFn.useSyncExternalStore;
  const useEffectFn = typeof depsOrFn === 'function' ? undefined : depsOrFn.useEffect;
  const useRefFn = typeof depsOrFn === 'function' ? undefined : depsOrFn.useRef;

  return createHooks(useSyncExternalStore, useEffectFn, useRefFn);
}

function createHooks(
  useSyncExternalStore: UseSyncExternalStoreFn,
  useEffectFn: UseEffectFn | undefined,
  useRefFn: UseRefFn | undefined,
): ForgeHooks {
  return {
    /**
     * React hook — creates and manages a field connection binding tied to the component lifecycle.
     * The binding is created on mount (or when `form`, `name`, or `options` change),
     * and automatically disposed on unmount. No manual `dispose()` call needed.
     *
     * Throws if `useEffect` and `useRef` were not provided to `createForgeHooks`.
     */
    useConnect<T extends Record<string, unknown>, K extends FlatKeyOf<T>>(
      form: Form<T>,
      name: K,
      options?: ConnectOptions,
    ): ConnectionResult<TypeAtPath<T, K>> {
      if (!useEffectFn || !useRefFn) {
        throw new ForgeError(
          'useConnect requires useEffect and useRef — pass them to createForgeHooks({ useEffect, useRef, useSyncExternalStore }).',
        );
      }

      const bindingRef = useRefFn<ConnectionResult<TypeAtPath<T, K>> | null>(null);

      if (!bindingRef.current || bindingRef.current.disposed) {
        bindingRef.current = form.connect(name, options);
      }

      useEffectFn(() => {
        const binding = form.connect(name, options);

        bindingRef.current = binding;

        return () => {
          binding.dispose();
        };
      }, [form, name]);

      return bindingRef.current!;
    },

    /**
     * React hook — subscribes to a single field's {@link FieldState}.
     * Re-renders only when that specific field's value, error, touched, or dirty state changes.
     */
    useField<T extends Record<string, unknown>, K extends FlatKeyOf<T>>(
      form: Form<T>,
      name: K,
    ): FieldState<TypeAtPath<T, K>> {
      return useSyncExternalStore(
        (cb) => form.subscribeField(name, () => cb()),
        () => form.field(name),
      );
    },

    /**
     * React hook — subscribes to the full {@link FormState}.
     * Re-renders when any part of the form state changes.
     * For single-field components prefer `useField` — it scopes re-renders to that one field.
     */
    useFormState<T extends Record<string, unknown>>(form: Form<T>): FormState {
      return useSyncExternalStore(
        (cb) => form.subscribe(() => cb()),
        () => form.state,
      );
    },

    /**
     * React hook — subscribes to the complete values object of the form.
     * Re-renders whenever any field value changes.
     * For single-field access prefer `useField`.
     */
    useFormValues<T extends Record<string, unknown>>(form: Form<T>): T {
      return useSyncExternalStore(
        (cb) => form.subscribe(() => cb()),
        () => form.values(),
      );
    },
  };
}
