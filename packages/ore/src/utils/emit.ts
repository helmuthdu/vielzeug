/**
 * Type-safe custom event emission for components.
 */

import { getHost } from '../runtime';

type NoDetail = undefined | undefined | never;
type KeysWithoutDetail<T extends Record<string, unknown>> = {
  [P in keyof T]: [T[P]] extends [NoDetail] ? P : never;
}[keyof T];

/**
 * Typed emit function: only declared event names type-check, and `detail` is
 * required exactly when its payload type is non-void. Dynamic event names must
 * be cast at the call site: an intentional speed bump, not a silent escape.
 */
export type EmitFn<T extends Record<string, unknown>> = {
  <K extends KeysWithoutDetail<T>>(event: K): boolean;
  <K extends Exclude<keyof T, KeysWithoutDetail<T>>>(event: K, detail: T[K]): boolean;
};

const DEFAULT_FIRE_OPTIONS = { bubbles: true, cancelable: true, composed: true };

/**
 * Returns a typed `emit()` function bound to the current component's host element.
 * Call once during `setup()`: the `Emits` type parameter maps event names to
 * their `detail` payload type.
 *
 * Every event is dispatched `cancelable: true`, and `emit()` returns `dispatchEvent`'s
 * own boolean result: `false` when a listener called `preventDefault()`. Components
 * that need to know whether a listener cancelled an event (e.g. to skip a default
 * action) read this return value directly instead of hand-rolling `dispatchEvent`.
 *
 * Events are dispatched `bubbles: true, composed: true`: the same convention as
 * `ore:error` and native form-control re-dispatches. A listener on the host, an
 * ancestor, or `document` observes the event even when the component is nested
 * inside another component's shadow root, so composed events integrate with
 * document-level and framework (e.g. React synthetic) listeners without an
 * escape hatch.
 *
 * @example
 * ```ts
 * type Events = { close: undefined; change: { value: string } };
 *
 * setup(props) {
 *   const emit = useEmit<Events>();
 *   emit('close');
 *
 *   const notCancelled = emit('change', { value: 'ok' });
 *   if (notCancelled) props.value.value = 'ok';
 * }
 * ```
 */
export const useEmit = <T extends Record<string, unknown> = Record<string, never>>(): EmitFn<T> => {
  const host = getHost();

  return ((event: keyof T, ...rest: unknown[]) => {
    const customEventInit = rest.length > 0 ? { ...DEFAULT_FIRE_OPTIONS, detail: rest[0] } : DEFAULT_FIRE_OPTIONS;

    return host.dispatchEvent(new CustomEvent<unknown>(String(event), customEventInit));
  }) as EmitFn<T>;
};
