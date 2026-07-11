/**
 * Type-safe custom event emission for components.
 */

import { getHost } from '../runtime';

type NoDetail = void | undefined | never;
type KeysWithoutDetail<T extends Record<string, unknown>> = {
  [P in keyof T]: [T[P]] extends [NoDetail] ? P : never;
}[keyof T];

type StrictEmitFn<T extends Record<string, unknown>> = {
  <K extends KeysWithoutDetail<T>>(event: K): boolean;
  <K extends Exclude<keyof T, KeysWithoutDetail<T>>>(event: K, detail: T[K]): boolean;
};

type LooseEmitFn = (event: string, detail?: unknown) => boolean;

export type EmitFn<T extends Record<string, unknown>> = StrictEmitFn<T> & LooseEmitFn;

const DEFAULT_FIRE_OPTIONS = { bubbles: true, cancelable: true, composed: false };

/**
 * Returns a typed `emit()` function bound to the current component's host element.
 * Call once during `setup()` — the `Emits` type parameter maps event names to
 * their `detail` payload type.
 *
 * Every event is dispatched `cancelable: true`, and `emit()` returns `dispatchEvent`'s
 * own boolean result — `false` when a listener called `preventDefault()`. Components
 * that need to know whether a listener cancelled an event (e.g. to skip a default
 * action) read this return value directly instead of hand-rolling `dispatchEvent`.
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
