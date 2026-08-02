import type { Readable } from '@vielzeug/ripple';

import { watch } from '@vielzeug/ripple';

/** Shape every `ref` prop in this package uses — a JS-only escape hatch to the live element. */
export type RefCallback<T> = ((el: T | null) => void) | null | undefined;

/**
 * Forwards a mounted element to a JS-only `ref` callback prop, and keeps forwarding to a
 * *new* callback if the prop is set again after mount (e.g. a parent sets it via a ref
 * callback after render, rather than at initial mount). Every text-entry-style component
 * with a `ref` escape-hatch prop (`ore-input`, `ore-textarea`, `ore-message-composer`,
 * `ore-file-input`) wires this identically — call it once from inside `onElement()`, alongside
 * whatever else that element needs wired.
 *
 * @example
 * ```ts
 * onElement(fieldRef, (el) => {
 *   const unwireField = tf.wire(el);
 *   const unwireRef = bindRefCallback(props.ref, el);
 *
 *   return () => {
 *     unwireField();
 *     unwireRef();
 *   };
 * });
 * ```
 */
export const bindRefCallback = <T extends Element>(ref: Readable<RefCallback<T>>, el: T): (() => void) => {
  // Immediate fire for when the prop is already set on mount.
  ref.value?.(el);

  const sub = watch(ref, (cb) => cb?.(el));

  return () => {
    sub.dispose();
    ref.value?.(null);
  };
};
