import { type ReadonlySignal } from '@vielzeug/stateit';

import { type Directive } from '../internal';
import { spread } from './spread';

export type AttrValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ReadonlySignal<string | number | boolean | null | undefined>
  | (() => string | number | boolean | null | undefined);

/**
 * Batch DOM property-binding helper.
 * Applied as `.property` bindings under the hood.
 *
 * @example
 * html`<input ${attrs({ value, disabled, readOnly: readonly })} />`
 */
export function attrs(map: Record<string, AttrValue>): Directive {
  const mapped: Record<string, AttrValue> = {};

  for (const [key, value] of Object.entries(map)) {
    mapped[`.${key}`] = value;
  }

  return spread(mapped);
}
