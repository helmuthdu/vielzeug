import { effect as rawEffect, type Signal } from '@vielzeug/ripple';

import { createSpreadObject, type SpreadObject } from '../types/bindings';
import { listen } from '../utils/dom';

/**
 * Two-way binding spread for form inputs.
 * Syncs the signal value to the element's DOM value and back.
 *
 * Supports `type="text"` (default), `type="number"`, `type="range"`,
 * and `type="checkbox"`. The signal type should match the input type.
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
 * ```
 */
export const model = <T extends string | number | boolean | null>(source: Signal<T>): SpreadObject =>
  createSpreadObject((el, registerCleanup) => {
    const input = el as HTMLInputElement;
    const isCheckbox = input.type === 'checkbox';
    const isNumeric = input.type === 'number' || input.type === 'range';

    // Signal → DOM
    const sub = rawEffect(() => {
      const v = source.value;

      if (isCheckbox) {
        input.checked = Boolean(v);
      } else {
        input.value = v == null ? '' : String(v);
      }
    });

    registerCleanup(() => sub.dispose());

    // DOM → Signal
    registerCleanup(
      listen(el, 'input', (e: Event) => {
        const target = e.target as HTMLInputElement;

        if (isCheckbox) {
          source.value = target.checked as T;
        } else if (isNumeric) {
          source.value = (target.value === '' ? 0 : Number(target.value)) as T;
        } else {
          source.value = target.value as T;
        }
      }),
    );
  });
