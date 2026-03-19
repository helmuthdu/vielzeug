import { signal, type ReadonlySignal, type Signal } from '@vielzeug/stateit';

import { currentRuntime, onCleanup, onMount, runtimeStack } from './runtime';

export type Slots<T extends Record<string, unknown> = Record<string, unknown>> = {
  /**
   * Returns a `ReadonlySignal<boolean>` that is `true` when the slot has assigned content.
   * Reactive — use the returned signal directly in computed(), html templates, or effects.
   * @example const hasIcon = slots.has('icon'); // ReadonlySignal<boolean>
   */
  has(name: keyof T): ReadonlySignal<boolean>;
};

/**
 * Observes a named slot (or the default slot when `slotName` is `'default'` or `''`) and
 * calls `callback` with the list of assigned elements whenever the slot's children change.
 *
 * Must be called inside an {@link onMount} callback.
 *
 * @example
 * onMount(() => {
 *   onSlotChange('default', (nodes) => {
 *     console.log('Default slot has', nodes.length, 'elements');
 *   });
 *   onSlotChange('icon', (nodes) => setHasIcon(nodes.length > 0));
 * });
 */
export const onSlotChange = (slotName: string, callback: (elements: Element[]) => void): void => {
  const el = currentRuntime().el;
  const name = slotName === 'default' ? '' : slotName;
  const selector = name ? `slot[name="${name}"]` : 'slot:not([name])';
  const slot = el.shadowRoot?.querySelector<HTMLSlotElement>(selector);

  if (!slot) return;

  const handler = () => callback(slot.assignedElements({ flatten: true }));

  handler(); // run immediately with current content
  slot.addEventListener('slotchange', handler);
  onCleanup(() => slot.removeEventListener('slotchange', handler));
};

export const createSlots = <T extends Record<string, unknown> = Record<string, unknown>>(): Slots<T> => {
  const el = currentRuntime().el;
  const sigs = new Map<string, Signal<boolean>>();

  const setup = (slotName: string, s: Signal<boolean>): (() => void) | undefined => {
    const slot = el.shadowRoot?.querySelector<HTMLSlotElement>(
      slotName ? `slot[name="${slotName}"]` : 'slot:not([name])',
    );

    if (!slot) return;

    const update = () => {
      s.value = slot.assignedNodes().length > 0;
    };

    update();
    slot.addEventListener('slotchange', update);

    return () => slot.removeEventListener('slotchange', update);
  };

  const get = (slotName: string): Signal<boolean> => {
    if (!sigs.has(slotName)) {
      const s = signal(false);

      sigs.set(slotName, s);

      // During setup shadow DOM isn't rendered yet — defer to onMount.
      // Post-mount (e.g. test access) shadow DOM is ready, set up immediately.
      if (runtimeStack.length > 0) {
        onMount(() => setup(slotName, s));
      } else {
        setup(slotName, s);
      }
    }

    return sigs.get(slotName)!;
  };

  return {
    has(name: keyof T): ReadonlySignal<boolean> {
      return get(name === 'default' ? '' : String(name));
    },
  };
};
