import { effect, isSignal, type ReadonlySignal } from '@vielzeug/stateit';

import type { DirectiveDescriptor } from '../craftit';

type AttrValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ReadonlySignal<string | number | boolean | null | undefined>
  | (() => string | number | boolean | null | undefined);

const _set = (el: Element, name: string, val: unknown): void => {
  if (val === null || val === undefined || val === false) {
    el.removeAttribute(name);
  } else if (val === true) {
    el.setAttribute(name, '');
  } else {
    el.setAttribute(name, String(val));
  }
};

/**
 * Reactively spreads an attribute map onto an element.
 * Accepts camelCase or kebab-case attribute names (set as-is).
 * `null`, `undefined`, and `false` remove the attribute; `true` sets it as a boolean (empty string value).
 *
 * Supports static values, reactive Signals, and getter functions.
 *
 * @example
 * import { attr } from '@vielzeug/craftit/directives';
 *
 * html`<input ${attr({ placeholder: label, maxlength: max, disabled: isDisabled })} />`
 * html`<div ${attr({ 'aria-label': () => t('close'), 'data-active': isActive })}></div>`
 */
export function attr(map: Record<string, AttrValue>): DirectiveDescriptor {
  return {
    __craftit_directive: (el, registerCleanup) => {
      for (const [name, v] of Object.entries(map)) {
        if (isSignal(v) || typeof v === 'function') {
          const get = isSignal(v) ? () => (v as ReadonlySignal<unknown>).value : (v as () => unknown);

          registerCleanup(effect(() => _set(el, name, get())));
        } else {
          _set(el, name, v);
        }
      }
    },
  };
}
