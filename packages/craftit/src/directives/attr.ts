import type { ReadonlySignal } from '@vielzeug/stateit';

import type { Directive } from '../core/internal';

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
 * Batch property-binding helper.
 *
 * @example
 * html`<input ${attr({ value, disabled, readOnly: readonly })} />`
 */
export function attr(map: Record<string, AttrValue>): Directive {
  const mapped: Record<string, AttrValue> = {};

  for (const [key, value] of Object.entries(map)) {
    mapped[`.${key}`] = value;
  }

  return spread(mapped);
}
