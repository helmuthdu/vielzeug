/**
 * Type-safe custom event emission factory for components.
 */

type NoDetail = void | undefined | never;
type KeysWithoutDetail<T extends Record<string, unknown>> = {
  [P in keyof T]: [T[P]] extends [NoDetail] ? P : never;
}[keyof T];

type StrictEmitFn<T extends Record<string, unknown>> = {
  <K extends KeysWithoutDetail<T>>(event: K): void;
  <K extends Exclude<keyof T, KeysWithoutDetail<T>>>(event: K, detail: T[K]): void;
};

type LooseEmitFn = (event: string, detail?: unknown) => void;

export type EmitFn<T extends Record<string, unknown>> = StrictEmitFn<T> & LooseEmitFn;

const DEFAULT_FIRE_OPTIONS = { bubbles: true, cancelable: true, composed: false };

export const createEmitFn = <T extends Record<string, unknown>>(el: HTMLElement): EmitFn<T> => {
  return ((event: keyof T, ...rest: unknown[]) => {
    const customEventInit = rest.length > 0 ? { ...DEFAULT_FIRE_OPTIONS, detail: rest[0] } : DEFAULT_FIRE_OPTIONS;

    el.dispatchEvent(new CustomEvent<unknown>(String(event), customEventInit));
  }) as EmitFn<T>;
};
