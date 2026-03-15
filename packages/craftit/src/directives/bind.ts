import { effect, type Signal } from '@vielzeug/stateit';

import type { DirectiveDescriptor } from '../craftit';

/**
 * Creates a two-way binding between a writable Signal and a form element.
 *
 * - **`Signal<string>`** (`<input>`, `<textarea>`, `<select>`): syncs `.value` via the `input` event.
 * - **`Signal<boolean>`** (checkbox/radio): auto-detected from the element's `type` attribute;
 *   syncs `.checked` via the `change` event.
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
export function bind(sig: Signal<boolean>): DirectiveDescriptor;
export function bind(sig: Signal<string>): DirectiveDescriptor;
export function bind(sig: Signal<boolean> | Signal<string>): DirectiveDescriptor {
  return {
    __craftit_directive: (el, registerCleanup) => {
      const input = el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      const isToggle = (input as HTMLInputElement).type === 'checkbox' || (input as HTMLInputElement).type === 'radio';

      if (isToggle) {
        const boolSig = sig as Signal<boolean>;

        registerCleanup(
          effect(() => {
            (input as HTMLInputElement).checked = !!boolSig.value;
          }),
        );

        const handler = (e: Event) => {
          boolSig.value = (e.target as HTMLInputElement).checked;
        };

        input.addEventListener('change', handler);
        registerCleanup(() => input.removeEventListener('change', handler));
      } else {
        const strSig = sig as Signal<string>;

        registerCleanup(
          effect(() => {
            input.value = strSig.value;
          }),
        );

        const handler = (e: Event) => {
          strSig.value = (e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
        };

        input.addEventListener('input', handler);
        registerCleanup(() => input.removeEventListener('input', handler));
      }
    },
  };
}
