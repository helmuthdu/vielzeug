import { warn } from './_dev';
import { detectModKey, parseShortcut } from './parser';

const KEY_SYMBOLS: Record<string, string> = {
  ' ': 'Space',
  arrowdown: '↓',
  arrowleft: '←',
  arrowright: '→',
  arrowup: '↑',
  backspace: '⌫',
  delete: '⌦',
  end: 'End',
  enter: '↵',
  escape: 'Esc',
  home: 'Home',
  pagedown: 'PgDn',
  pageup: 'PgUp',
  tab: '⇥',
};

const MOD_SYMBOLS_MAC: Record<string, string> = {
  alt: '⌥',
  ctrl: '⌃',
  meta: '⌘',
  shift: '⇧',
};

const MOD_LABELS_OTHER: Record<string, string> = {
  alt: 'Alt',
  ctrl: 'Ctrl',
  meta: 'Win',
  shift: 'Shift',
};

const MOD_ORDER = ['ctrl', 'alt', 'shift', 'meta'] as const;

/**
 * Formats a shortcut string into a human-readable display string.
 *
 * On Mac (when `modKey` is `'meta'`), uses standard Mac symbols (⌘, ⌥, ⇧, ⌃).
 * On other platforms, uses word labels (Ctrl, Alt, Shift, Win).
 *
 * @example
 * formatShortcut('mod+shift+p', 'meta') // '⇧⌘P'  (canonical order: ctrl, alt, shift, meta)
 * formatShortcut('mod+shift+p', 'ctrl') // 'Ctrl+Shift+P'
 * formatShortcut('ctrl+k ctrl+s', 'meta') // '⌃K ⌃S'
 */
export function formatShortcut(shortcut: string, modKey: 'ctrl' | 'meta' = detectModKey()): string {
  if (!shortcut.trim()) {
    warn(`formatShortcut() received an empty shortcut string`);

    return '';
  }

  return formatShortcutParts(shortcut, modKey)
    .map((step) => step.join(modKey === 'meta' ? '' : '+'))
    .join(' ');
}

/**
 * Formats a shortcut into keycap-sized segments: one array per step (a chord has several
 * steps), one label per keycap — Mac modifier symbols are their own keycaps, other
 * platforms get whole-word labels (`['Ctrl', 'Shift', 'P']`).
 *
 * Made for keycap UIs that need the pieces `formatShortcut` joins into one string, so
 * "press ⌘ together with Z" can render as two keycaps while the flat form stays "⌘Z".
 *
 * @example
 * formatShortcutParts('mod+z', 'meta') // [['⌘', 'Z']]
 * formatShortcutParts('mod+shift+z', 'ctrl') // [['Ctrl', 'Shift', 'Z']]
 * formatShortcutParts('g h', 'ctrl') // [['G'], ['H']]
 */
export function formatShortcutParts(shortcut: string, modKey: 'ctrl' | 'meta' = detectModKey()): string[][] {
  if (!shortcut.trim()) {
    warn(`formatShortcutParts() received an empty shortcut string: "${shortcut}"`);

    return [];
  }

  let steps: ReturnType<typeof parseShortcut>;

  try {
    steps = parseShortcut(shortcut, modKey);
  } catch {
    warn(`formatShortcutParts() received an invalid shortcut: "${shortcut}"`);

    return [];
  }

  const isMac = modKey === 'meta';

  return steps.map((step) => {
    const modParts = MOD_ORDER.filter((m) => step.modifiers.has(m)).map((m) =>
      isMac ? MOD_SYMBOLS_MAC[m] : MOD_LABELS_OTHER[m],
    );

    const keyLabel = KEY_SYMBOLS[step.key] ?? step.key.toUpperCase();

    return [...modParts, keyLabel];
  });
}
