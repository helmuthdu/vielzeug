import { type Signal } from '@vielzeug/stateit';

import { type Directive } from '../core/internal';
import { attr } from './attr';

/**
 * Creates a two-way binding between a writable Signal and a form element.
 *
 * - **`Signal<string>`** (`<input>`, `<textarea>`): syncs `.value` via the `input` event.
 * - **`Signal<string>`** (`<select>`): syncs `.value` via the `change` event.
 * - **`Signal<boolean>`** (checkbox/radio): auto-detected from the element's `type` attribute;
 *   syncs `.checked` via the `change` event.
 *
 * Internally this reuses craftit's shared property-binding path, so `.value`,
 * `.checked`, `attr(...)`, and `spread({ '.value': ... })` stay in sync.
 *
 * Use in spread position on any form element.
 *
 * @example
 * import { bind } from '@vielzeug/craftit/directives';
 *
 * const name = signal('');
 * html`<input ${bind(name)} />`
 *
 * const accepted = signal(false);
 * html`<input type="checkbox" ${bind(accepted)} />`
 *
 * const size = signal('');
 * html`<select ${bind(size)}><option value="sm">S</option></select>`
 */
export function bind(sig: Signal<boolean>): Directive;
export function bind(sig: Signal<string>): Directive;
export function bind(sig: Signal<boolean> | Signal<string>): Directive {
  return {
    mount(el, context) {
      const input = el as HTMLInputElement;
      const isToggle = input.type === 'checkbox' || input.type === 'radio';

      (isToggle ? attr({ checked: sig as Signal<boolean> }) : attr({ value: sig as Signal<string> })).mount!(
        el,
        context,
      );
    },
  };
}
