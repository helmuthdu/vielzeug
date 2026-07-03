import type { Readable } from '@vielzeug/ripple';

// ── Keyboard dispatch ─────────────────────────────────────────────────────────

export type KeyboardDispatchOptions = {
  disabled?: Readable<boolean | undefined>;
  keymap: Record<string, (event: KeyboardEvent) => boolean | void>;
  preventDefault?: 'after' | 'before' | false;
};

export const dispatchKeyboardAction = (event: KeyboardEvent, options: KeyboardDispatchOptions): boolean => {
  if (options.disabled?.value) return false;

  // `event.key` is attacker-influenceable on a synthetic KeyboardEvent (e.g. `new
  // KeyboardEvent('keydown', { key: '__proto__' })`). Guard with `Object.hasOwn` so a
  // crafted key name can never resolve to an inherited `Object.prototype` member
  // (`__proto__`, `constructor`, `toString`, …) instead of `undefined`.
  const action = Object.hasOwn(options.keymap, event.key) ? options.keymap[event.key] : undefined;

  if (!action) return false;

  const preventDefaultMode = options.preventDefault ?? 'before';

  if (preventDefaultMode === 'before') event.preventDefault();

  const handled = action(event) !== false;

  if (preventDefaultMode === 'after' && handled) event.preventDefault();

  return handled;
};

// ── Press control / Interaction ───────────────────────────────────────────────

export type PressTrigger = 'keyboard' | 'pointer';

/**
 * Options for `createInteraction` — a unified press + focus/blur interaction
 * handler for accessible interactive elements.
 */
export type InteractionOptions = {
  /** `true` when the element is disabled. All handlers become no-ops. */
  disabled?: Readable<boolean | undefined>;
  /** Keys that trigger a press. Defaults to `['Enter', ' ']`. */
  keys?: string[];
  /** Called when the element loses focus. */
  onBlur?: (event: FocusEvent) => void;
  /** Called when the element receives focus. */
  onFocus?: (event: FocusEvent) => void;
  /** Called when the element is pressed via keyboard or pointer. */
  onPress?: (event: KeyboardEvent | MouseEvent, trigger: PressTrigger) => void;
};

export type Interaction = {
  handleBlur: (event: FocusEvent) => void;
  handleClick: (event: MouseEvent) => boolean;
  handleFocus: (event: FocusEvent) => void;
  handleKeydown: (event: KeyboardEvent) => boolean;
};

/**
 * Creates a set of event handlers for an interactive element that responds to
 * keyboard and pointer presses, and optionally focus/blur events.
 *
 * @example
 * ```ts
 * const interaction = createInteraction({
 *   disabled: props.disabled,
 *   onPress: (event, trigger) => toggle(event),
 *   onFocus: (event) => setFocused(true),
 *   onBlur: (event) => setFocused(false),
 * });
 *
 * // In template:
 * // @click="${interaction.handleClick}"
 * // @keydown="${interaction.handleKeydown}"
 * // @focus="${interaction.handleFocus}"
 * // @blur="${interaction.handleBlur}"
 * ```
 */
export const createInteraction = (options: InteractionOptions): Interaction => {
  const isDisabled = (): boolean => Boolean(options.disabled?.value);
  const keyboardKeys = options.keys ?? ['Enter', ' '];
  const keymap = Object.fromEntries(
    keyboardKeys.map((key) => [key, (keyboardEvent: KeyboardEvent) => options.onPress?.(keyboardEvent, 'keyboard')]),
  );

  return {
    handleBlur: (event: FocusEvent): void => {
      if (!isDisabled()) options.onBlur?.(event);
    },
    handleClick: (event: MouseEvent): boolean => {
      if (isDisabled()) return false;

      options.onPress?.(event, 'pointer');

      return true;
    },
    handleFocus: (event: FocusEvent): void => {
      if (!isDisabled()) options.onFocus?.(event);
    },
    handleKeydown: (event: KeyboardEvent): boolean =>
      dispatchKeyboardAction(event, { disabled: options.disabled, keymap }),
  };
};
