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

  let steps;

  try {
    steps = parseShortcut(shortcut, modKey);
  } catch {
    warn(`formatShortcut() received an invalid shortcut: "${shortcut}"`);

    return '';
  }

  const isMac = modKey === 'meta';

  return steps
    .map((step) => {
      const modParts = MOD_ORDER.filter((m) => step.modifiers.has(m)).map((m) =>
        isMac ? MOD_SYMBOLS_MAC[m] : MOD_LABELS_OTHER[m],
      );

      const keyLabel = KEY_SYMBOLS[step.key] ?? step.key.toUpperCase();

      return isMac ? `${modParts.join('')}${keyLabel}` : [...modParts, keyLabel].join('+');
    })
    .join(' ');
}
