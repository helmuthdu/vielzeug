import type { BindingValue, Keymap, KeymapOptions } from './types';

import { createKeymap } from './keymap';

/**
 * Creates a scoped keymap layer that sits on top of a parent keymap.
 *
 * The **caller** is responsible for mounting and disposing the parent independently.
 * `layer.mount(target)` only attaches the layer's own shortcuts — it does not touch
 * the parent. `layer.dispose()` only tears down the layer — it does not dispose the parent.
 *
 * While the layer is active, matching shortcuts are handled by the layer. Call
 * `layer.deactivate()` to suspend the layer and `layer.activate()` to re-enable it.
 *
 * @example
 * const base = createKeymap({ 'ctrl+z': undo });
 * const modal = createKeymapLayer(base, {
 *   esc: { handler: closeModal, when: () => isModalOpen() },
 * });
 * // Mount both independently — the layer does NOT auto-mount the parent.
 * const unmountBase = base.mount(document);
 * const unmountModal = modal.mount(document);
 *
 * modal.deactivate(); // base handles everything; layer is suspended
 * modal.activate();   // layer is active again
 */
export interface KeymapLayer extends Keymap {
  activate(): void;
  deactivate(): void;
  readonly active: boolean;
  readonly parent: Keymap;
}

export function createKeymapLayer(
  parent: Keymap,
  initialBindings: Record<string, BindingValue> = {},
  options: KeymapOptions = {},
): KeymapLayer {
  let isActive = true;

  const layer = createKeymap(initialBindings, {
    ...options,
    when: () => isActive && (options.when?.() ?? true),
  });

  return {
    activate(): void {
      isActive = true;
    },

    get active() {
      return isActive;
    },

    bind(shortcut: string, value: BindingValue): () => void {
      return layer.bind(shortcut, value);
    },

    deactivate(): void {
      isActive = false;
    },

    dispose(): void {
      layer.dispose();
    },

    listBindings() {
      return layer.listBindings();
    },

    mount(target: EventTarget): () => void {
      return layer.mount(target);
    },

    get parent() {
      return parent;
    },

    [Symbol.dispose](): void {
      this.dispose();
    },

    unbind(shortcut: string): void {
      layer.unbind(shortcut);
    },
  };
}
