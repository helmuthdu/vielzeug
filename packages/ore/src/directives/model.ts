import type { Signal } from '@vielzeug/ripple';
import { makeBrand } from '../utils/brand';

/**
 * Options for `model()`. Every form control reads and writes differently; the
 * defaults cover native inputs, and `get`/`event` override them for anything else.
 */
export type ModelOptions<T = unknown> = {
  /**
   * Event that triggers the write-back from the control to the signal.
   * Defaults to `'change'` for checkboxes, radios, and `<select>`, and
   * `'input'` for everything else.
   */
  event?: string;
  /**
   * Reads the current value out of the element on each write-back event.
   * Defaults to `el.checked` for checkboxes/radios and `el.value` otherwise
   * (always a string for native text/number inputs: pass a `get` like
   * `(el) => Number(el.value)` to keep a numeric signal numeric).
   */
  get?: (el: HTMLElement) => T;
};

/**
 * Per-binding marker produced by `model()`. Like `live()`, the two-way behavior
 * belongs to this one binding site, never to the signal itself.
 *
 * @internal Consumed by the template binding layer (see `template/instantiator.ts`).
 */
export type ModelSource<T = unknown> = {
  readonly event?: string;
  readonly get?: (el: HTMLElement) => T;
  readonly source: Signal<T>;
};

const modelBrand = makeBrand<ModelSource>('ore:model');

export const isModelSource = modelBrand.is;

/** @internal Default value reader for `model()` (see template/instantiator.ts). */
export const modelDefaultGet = (el: HTMLElement): unknown => {
  if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) return el.checked;

  return (el as HTMLInputElement).value;
};

/** @internal Default write-back event for `model()` (see template/instantiator.ts). */
export const modelDefaultEvent = (el: HTMLElement): string =>
  el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')
    ? 'change'
    : el instanceof HTMLSelectElement
      ? 'change'
      : 'input';

/**
 * Two-way binding for a form control: `value="${model(signal)}"`.
 *
 * Writes the signal to the control's `value`/`checked` property on every change,
 * and writes user input back into the signal on the control's change event
 * (`'change'` for checkboxes/radios/selects, `'input'` otherwise). This is the
 * complete controlled-input loop: the `live()` + manual `@input` handler pair it
 * replaces was easy to get half-wired.
 *
 * The signal is written with whatever `get` reads back (a string by default for
 * text inputs), so declare the signal with the matching type or pass `get`.
 *
 * @example
 * ```ts
 * const text = signal('');
 * const agree = signal(false);
 *
 * html`
 *   <input value="${model(text)}" />
 *   <input type="checkbox" checked="${model(agree)}" />
 *   <input type="number" value="${model(count, { get: (el) => Number(el.value) })}" />
 * `
 * ```
 */
export const model = <T>(source: Signal<T>, options?: ModelOptions<T>): ModelSource<T> =>
  modelBrand.stamp({ event: options?.event, get: options?.get, source }) as ModelSource<T>;
