import { effect as rawEffect, type Signal } from '@vielzeug/ripple';

import { createSpreadObject, type SpreadObject } from '../types/bindings';
import { listen } from '../utils/dom';

/**
 * Two-way binding spread for form inputs.
 * Syncs the signal value to the element's DOM value and back.
 *
 * Supports `type="text"` (default), `type="number"`, `type="range"`,
 * `type="checkbox"`, `<select>` (single-select), and
 * `<select multiple>` (multi-select, `Signal<string[]>`).
 *
 * @example
 * ```ts
 * const name = signal('');
 * html`<input type="text" ${model(name)} />`
 *
 * const count = signal(0);
 * html`<input type="number" ${model(count)} />`
 *
 * const checked = signal(false);
 * html`<input type="checkbox" ${model(checked)} />`
 *
 * const selected = signal<string[]>([]);
 * html`<select multiple ${model(selected)}><option value="a">A</option></select>`
 * ```
 */
export function model<T extends string | number | boolean | null>(source: Signal<T>): SpreadObject;
export function model(source: Signal<string[]>): SpreadObject;
export function model<T extends string | number | boolean | null | string[]>(source: Signal<T>): SpreadObject {
  return createSpreadObject((el, registerCleanup) => {
    const input = el as HTMLInputElement;
    const isCheckbox = input.type === 'checkbox';
    const isNumeric = input.type === 'number' || input.type === 'range';
    const isSelect = el instanceof HTMLSelectElement;
    const isMultiSelect = isSelect && (el as HTMLSelectElement).multiple;

    // Signal → DOM
    const sub = rawEffect(() => {
      const v = source.value;

      if (isMultiSelect) {
        const selected = Array.isArray(v) ? (v as string[]) : [];
        const selectEl = el as HTMLSelectElement;

        for (const opt of selectEl.options) {
          opt.selected = selected.includes(opt.value);
        }
      } else if (isCheckbox) {
        input.checked = Boolean(v);
      } else {
        (el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value =
          v == null ? '' : String(v as string | number | boolean | null);
      }
    });

    registerCleanup(() => sub.dispose());

    // DOM → Signal
    // <select> fires 'change'; text/number/range/textarea/checkbox fire 'input'.
    const eventName = isSelect ? 'change' : 'input';

    registerCleanup(
      listen(el, eventName, (e: Event) => {
        const target = e.target as HTMLInputElement;

        if (isMultiSelect) {
          const selectEl = e.target as HTMLSelectElement;
          const values = Array.from(selectEl.selectedOptions).map((opt) => opt.value);

          (source as Signal<string[]>).value = values;
        } else if (isCheckbox) {
          source.value = target.checked as T;
        } else if (isNumeric) {
          source.value = (target.value === '' ? 0 : Number(target.value)) as T;
        } else {
          source.value = target.value as T;
        }
      }),
    );
  });
}
