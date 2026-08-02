import type { Readable } from '@vielzeug/ripple';

import { computed } from '@vielzeug/ripple';

/**
 * Keyboard shortcut that triggers a send:
 * - `'enter'` (default) — Enter sends, Shift+Enter inserts a newline.
 * - `'mod+enter'` — Enter always inserts a newline; Ctrl/Cmd+Enter sends.
 */
export type SendShortcut = 'enter' | 'mod+enter';

export type ComposerControlOptions = {
  disabled?: Readable<boolean | undefined>;
  /** Blocks further sends (e.g. a send is already in flight) without disabling editing. */
  loading?: Readable<boolean | undefined>;
  /** Called for a send attempt that passed the `canSend` guard. */
  onSend: (event: KeyboardEvent | MouseEvent) => void;
  sendShortcut?: Readable<SendShortcut | undefined>;
  value: Readable<string | undefined>;
};

export type ComposerControl = {
  /** Whether the current value is non-blank and the control isn't disabled/loading. */
  canSend: Readable<boolean>;
  /** Wire onto the raw `<textarea>`'s `keydown` — intercepts the resolved send shortcut. */
  handleKeydown: (event: KeyboardEvent) => void;
  /** `aria-keyshortcuts` value describing the resolved shortcut. */
  keyShortcutsHint: Readable<string>;
  /** Attempts a send; no-ops when `canSend` is false. Wire onto the send button's `click`. */
  send: (event: KeyboardEvent | MouseEvent) => void;
};

const isBlank = (value: string | undefined): boolean => !value || value.trim() === '';

/**
 * Send-gesture logic for a message/comment composer — decides *when* a send is allowed
 * and *whether* a given keydown counts as one. Owns no DOM, value state, or event dispatch;
 * the component wires `handleKeydown`/`send` and decides what a send actually does.
 *
 * @example
 * ```ts
 * const composer = createComposerControl({
 *   onSend: (event) => attemptSend(event),
 *   sendShortcut: props['send-shortcut'],
 *   value,
 * });
 * // <textarea @keydown="${composer.handleKeydown}" aria-keyshortcuts="${composer.keyShortcutsHint}">
 * // <button ?disabled="${() => !composer.canSend.value}" @click="${composer.send}">
 * ```
 */
export const createComposerControl = (options: ComposerControlOptions): ComposerControl => {
  const canSend = computed(() => !isBlank(options.value.value) && !options.disabled?.value && !options.loading?.value);

  const send = (event: KeyboardEvent | MouseEvent): void => {
    if (!canSend.value) return;

    options.onSend(event);
  };

  const handleKeydown = (event: KeyboardEvent): void => {
    // A composing IME candidate selection also fires `Enter` — never treat that as a send.
    if (event.key !== 'Enter' || event.isComposing) return;

    const mode = options.sendShortcut?.value ?? 'enter';
    const hasModifier = event.metaKey || event.ctrlKey;

    if (mode === 'mod+enter' ? !hasModifier : event.shiftKey) return;

    event.preventDefault();
    send(event);
  };

  const keyShortcutsHint = computed(() =>
    (options.sendShortcut?.value ?? 'enter') === 'mod+enter' ? 'Control+Enter Meta+Enter' : 'Enter',
  );

  return { canSend, handleKeydown, keyShortcutsHint, send };
};
