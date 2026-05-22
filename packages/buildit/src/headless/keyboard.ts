// ── Keyboard dispatch ─────────────────────────────────────────────────────────

export type KeyboardDispatchOptions = {
  disabled?: () => boolean;
  keymap: Record<string, (event: KeyboardEvent) => boolean | void>;
  preventDefault?: 'after' | 'before' | false;
};

export const dispatchKeyboardAction = (event: KeyboardEvent, options: KeyboardDispatchOptions): boolean => {
  if (options.disabled?.()) return false;

  const action = options.keymap[event.key];

  if (!action) return false;

  const preventDefaultMode = options.preventDefault ?? 'before';

  if (preventDefaultMode === 'before') event.preventDefault();

  const handled = action(event) !== false;

  if (preventDefaultMode === 'after' && handled) event.preventDefault();

  return handled;
};

// ── Trigger string parser ─────────────────────────────────────────────────────

/**
 * Parses a comma-separated trigger string into a typed array, filtering against
 * a valid set and falling back to `defaults` when the input is empty or invalid.
 *
 * Used by tooltip and popover to normalise their `trigger` prop values.
 *
 * @example
 * ```ts
 * const VALID = new Set(['click', 'hover', 'focus'] as const);
 * parseStringTriggers('hover,focus', VALID, ['click']); // → ['hover', 'focus']
 * parseStringTriggers('',            VALID, ['click']); // → ['click']
 * ```
 */
export const parseStringTriggers = <T extends string>(
  value: string | null | undefined,
  valid: ReadonlySet<T>,
  defaults: T[],
): T[] => {
  const parsed = String(value ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter((t): t is T => valid.has(t as T));

  return parsed.length > 0 ? parsed : [...defaults];
};

// ── Press control / Interaction ───────────────────────────────────────────────

export type PressTrigger = 'keyboard' | 'pointer';

/**
 * Options for `createInteraction` — a unified press + focus/blur interaction
 * handler for accessible interactive elements.
 */
export type InteractionOptions = {
  /** Returns `true` when the element is disabled. All handlers become no-ops. */
  disabled?: () => boolean;
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
 *   disabled: () => disabled.value,
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
  const isDisabled = (): boolean => Boolean(options.disabled?.());
  const keyboardKeys = options.keys ?? ['Enter', ' '];
  const keymap = Object.fromEntries(
    keyboardKeys.map((key) => [
      key,
      (keyboardEvent: KeyboardEvent) => options.onPress?.(keyboardEvent, 'keyboard'),
    ]),
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
    handleKeydown: (event: KeyboardEvent): boolean => dispatchKeyboardAction(event, { disabled: isDisabled, keymap }),
  };
};
