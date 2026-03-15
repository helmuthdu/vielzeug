import type { DirectiveDescriptor } from '../craftit';

/**
 * Attaches an event listener to an element as a spread directive, supporting
 * full `AddEventListenerOptions` (e.g. `passive`, `once`, `capture`).
 *
 * **Synthetic event: `'clickOutside'`**
 * When the event name is `'clickOutside'`, the listener is attached to `document`
 * and fires whenever a click occurs *outside* the host element — useful for
 * closing dropdowns, modals, and popovers.
 *
 * @example
 * import { on } from '@vielzeug/craftit/directives';
 *
 * // Passive wheel listener (not possible with @wheel= template syntax)
 * html`<div ${on('wheel', onScroll, { passive: true })}></div>`
 *
 * // Typed handler — `e` inferred as `MouseEvent`
 * html`<button ${on('click', (e) => e.clientX)}></button>`
 *
 * // Click-outside (closes a dropdown when the user clicks away)
 * html`<div ${on('clickOutside', () => open.value = false)}></div>`
 */
export function on(
  event: 'clickOutside',
  handler: (e: MouseEvent) => void,
  options?: AddEventListenerOptions,
): DirectiveDescriptor;
export function on<K extends keyof HTMLElementEventMap>(
  event: K,
  handler: (e: HTMLElementEventMap[K]) => void,
  options?: AddEventListenerOptions,
): DirectiveDescriptor;
export function on(event: string, handler: (e: any) => void, options?: AddEventListenerOptions): DirectiveDescriptor {
  return {
    __craftit_directive: (el, registerCleanup) => {
      if (event === 'clickOutside') {
        const docHandler = (e: Event) => {
          if (!e.composedPath().includes(el)) handler(e as MouseEvent);
        };

        document.addEventListener('click', docHandler, options);
        registerCleanup(() => document.removeEventListener('click', docHandler, options));
      } else {
        el.addEventListener(event, handler, options);
        registerCleanup(() => el.removeEventListener(event, handler, options));
      }
    },
  };
}
