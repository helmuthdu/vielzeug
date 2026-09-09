import type { ShortcutStep } from './parser';

/**
 * Guard function for fine-grained binding context.
 *
 * When both a global `when` (from `KeymapOptions`) and a per-binding `when`
 * are provided, both must return `true` for the handler to fire:
 *
 * 1. Global `when` is checked first; if it fails, all bindings are skipped.
 * 2. Per-binding `when` is checked only after the global guard passes.
 *
 * Treat it as: _global guard AND per-binding guard_.
 *
 * @example
 * // Global: don't fire shortcuts while modal is open
 * { when: (e) => !isModalOpen() }
 *
 * // Per-binding: only fire when event target is the specific panel
 * { id: 'close-panel', shortcut: 'escape', handler: closePanel, when: (e) => e.target === panel }
 *
 * Both conditions must be met for the handler to execute.
 */
export type When = (event: KeyboardEvent) => boolean;

export type Handler = (event: KeyboardEvent) => void;

export type KeymapEvent =
  | { readonly target: EventTarget; readonly trigger: 'keydown' | 'keyup'; readonly type: 'chord-cancel' }
  | {
      readonly step: ShortcutStep;
      readonly target: EventTarget;
      readonly trigger: 'keydown' | 'keyup';
      readonly type: 'chord-start';
    }
  | {
      readonly steps: readonly ShortcutStep[];
      readonly target: EventTarget;
      readonly trigger: 'keydown' | 'keyup';
      readonly type: 'chord-progress';
    }
  | { readonly target: EventTarget; readonly trigger: 'keydown' | 'keyup'; readonly type: 'chord-timeout' }
  | {
      readonly binding: BindingEntry;
      readonly target: EventTarget;
      readonly trigger: 'keydown' | 'keyup';
      readonly type: 'match';
    }
  | { readonly type: 'dispose' };

/**
 * A single ordered binding.
 *
 * Each binding has an explicit `id` (string) so duplicate shortcuts can coexist
 * with different ids — `unbind(id)` removes by id, not by shortcut string.
 *
 * @example
 * const map = createKeymap([
 *   { id: 'save', shortcut: 'mod+s', handler: save },
 *   { id: 'palette', shortcut: 'mod+shift+p', handler: openPalette },
 *   { id: 'top', shortcut: 'g g', handler: goToTop },
 *   { id: 'close', shortcut: 'escape', handler: closePanel, when: (e) => !isEditableTarget(e.target) },
 *   { id: 'play', shortcut: 'space', handler: togglePlay, trigger: 'keyup' },
 * ], { modKey: 'ctrl' });
 */
export interface Binding {
  /** Handler invoked when the shortcut matches. */
  handler: Handler;
  /** Stable identifier for this binding. Used by `unbind(id)`. */
  id: string;
  /** Call `event.preventDefault()` when matched. Defaults to `true`. */
  preventDefault?: boolean;
  /** Shortcut string, e.g. `'mod+s'` or `'g g'`. */
  shortcut: string;
  /** Call `event.stopPropagation()` when matched. Defaults to `false`. */
  stopPropagation?: boolean;
  /** Event phase. Defaults to `'keydown'`. */
  trigger?: 'keydown' | 'keyup';
  /** Per-binding guard. Both global and per-binding guards must pass. */
  when?: When;
}

export interface KeymapOptions {
  chordTimeout?: number;
  modKey?: 'ctrl' | 'meta';

  /**
   * Guard function for all bindings in this keymap.
   *
   * When both global and per-binding `when` guards are provided, both must
   * return `true` for the handler to fire. Global guard is checked first.
   *
   * @example
   * { when: (e) => !isModalOpen() }
   */
  when?: When;
}

export interface Keymap {
  /** Adds a binding (replacing any existing binding with the same id) and returns an unbind closure. */
  bind(binding: Binding): () => void;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  listBindings(): readonly BindingEntry[];
  mount(target: EventTarget): () => void;
  tap(handler: (event: KeymapEvent) => void, options?: { signal?: AbortSignal }): () => void;
  /** Removes the binding with the given id. Warns in development when unknown. */
  unbind(id: string): void;
  [Symbol.dispose](): void;
}

export type BindingEntry = {
  readonly id: string;
  readonly shortcut: readonly ShortcutStep[];
  readonly trigger: 'keydown' | 'keyup';
  readonly preventDefault: boolean;
  readonly stopPropagation: boolean;
};
