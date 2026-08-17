import type { ShortcutStep } from './parser';

export type BindingEntry = {
  readonly shortcut: readonly ShortcutStep[];
  readonly trigger: 'keydown' | 'keyup';
};

export type Handler = (event: KeyboardEvent) => void;

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
 * { 'escape': { handler: closePanel, when: (e) => e.target === panel } }
 *
 * Both conditions must be met for the handler to execute.
 */
export type When = (event: KeyboardEvent) => boolean;

export type BindingOptions = {
  handler: Handler;
  trigger?: 'keydown' | 'keyup';
  when?: When;
};

export type BindingValue = Handler | BindingOptions;

/**
 * Chord state change event emitted when chord progression changes.
 *
 * Use `onChordState` callback in `KeymapOptions` to observe chord state
 * for debugging, UI hints, or chord history. When a chord fully matches,
 * the binding handler fires immediately; no separate 'completed' event.
 */
export type ChordStateChange =
  | { type: 'started'; target: EventTarget; step: ShortcutStep; trigger: 'keydown' | 'keyup' }
  | { type: 'progressed'; target: EventTarget; steps: readonly ShortcutStep[]; trigger: 'keydown' | 'keyup' }
  | { type: 'timeout'; target: EventTarget; trigger: 'keydown' | 'keyup' };

export interface KeymapOptions {
  chordTimeout?: number;
  modKey?: 'ctrl' | 'meta';

  /**
   * Optional callback to observe chord state changes.
   *
   * Fires when a chord starts, progresses through steps, completes, or times out.
   * Useful for debugging, logging, testing, or implementing chord UI hints.
   *
   * @example
   * {
   *   onChordState: (change) => {
   *     if (change.type === 'started') console.log('Chord started:', change.step.key);
   *     if (change.type === 'timeout') console.log('Chord timed out');
   *   }
   * }
   */
  onChordState?: (change: ChordStateChange) => void;
  preventDefault?: boolean;
  stopPropagation?: boolean;

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
  bind(shortcut: string, value: BindingValue): () => void;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  listBindings(): readonly BindingEntry[];
  mount(target: EventTarget): () => void;
  unbind(shortcut: string): void;
  [Symbol.dispose](): void;
}
