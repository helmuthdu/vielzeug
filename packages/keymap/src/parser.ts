import { KeymapParseError } from './errors';

export type ModifierKey = 'alt' | 'ctrl' | 'meta' | 'shift';

export type ShortcutStep = {
  key: string;
  modifiers: Set<ModifierKey>;
};

export type Shortcut = ShortcutStep[];

export function detectModKey(): 'ctrl' | 'meta' {
  if (typeof navigator === 'undefined') return 'ctrl';

  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ??
    navigator.platform ??
    '';

  return /mac/i.test(platform) ? 'meta' : 'ctrl';
}

const MODIFIER_ALIASES_BASE: Record<string, ModifierKey> = {
  alt: 'alt',
  cmd: 'meta',
  command: 'meta',
  control: 'ctrl',
  ctrl: 'ctrl',
  meta: 'meta',
  opt: 'alt',
  option: 'alt',
  shift: 'shift',
  win: 'meta',
};

const SPECIAL_KEY_ALIASES: Record<string, string> = {
  del: 'delete',
  down: 'arrowdown',
  esc: 'escape',
  left: 'arrowleft',
  right: 'arrowright',
  space: ' ',
  spacebar: ' ',
  up: 'arrowup',
};

function buildModifierAliases(modKey: 'ctrl' | 'meta'): Record<string, ModifierKey> {
  return { ...MODIFIER_ALIASES_BASE, mod: modKey };
}

function normalizeModifier(token: string, aliases: Record<string, ModifierKey>): ModifierKey | null {
  const lower = token.toLowerCase();

  return Object.hasOwn(aliases, lower) ? aliases[lower]! : null;
}

function normalizeKey(raw: string): string {
  return Object.hasOwn(SPECIAL_KEY_ALIASES, raw) ? SPECIAL_KEY_ALIASES[raw]! : raw;
}

export function parseStep(raw: string, modKey: 'ctrl' | 'meta' = detectModKey()): ShortcutStep | null {
  const parts = raw
    .trim()
    .split('+')
    .filter(Boolean)
    .map((p) => p.toLowerCase());

  if (parts.length === 0) return null;

  const aliases = buildModifierAliases(modKey);
  const modifiers = new Set<ModifierKey>();
  const keyParts: string[] = [];

  for (const part of parts) {
    const mod = normalizeModifier(part, aliases);

    if (mod) {
      modifiers.add(mod);
    } else {
      keyParts.push(part);
    }
  }

  if (keyParts.length === 0) return null;

  if (keyParts.length > 1) {
    throw new KeymapParseError(`Ambiguous shortcut step: "${raw}" — multiple non-modifier keys found`);
  }

  const key = normalizeKey(keyParts[0]);

  return { key, modifiers };
}

export function parseShortcut(raw: string, modKey: 'ctrl' | 'meta' = detectModKey()): Shortcut {
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((step) => {
      const result = parseStep(step, modKey);

      if (result === null) {
        throw new KeymapParseError(`Invalid shortcut step: "${step}" in "${raw}"`);
      }

      return result;
    });
}

export function canonicalizeShortcut(steps: readonly ShortcutStep[]): string {
  return steps
    .map((s) => {
      const mods = [...s.modifiers].sort().join('+');

      return mods ? `${mods}+${s.key}` : s.key;
    })
    .join(' ');
}

export function matchStep(event: KeyboardEvent, step: ShortcutStep): boolean {
  // Headless usage (SSR, non-DOM `EventTarget`s, hand-built test events) means `event` isn't
  // guaranteed to be a real `KeyboardEvent` at runtime even though the type says so — treat a
  // missing/non-string `key` as "doesn't match" rather than throwing inside the event listener.
  if (typeof event.key !== 'string') return false;

  if (event.key.toLowerCase() !== step.key) return false;

  const { modifiers } = step;

  if (event.altKey !== modifiers.has('alt')) return false;

  if (event.ctrlKey !== modifiers.has('ctrl')) return false;

  if (event.metaKey !== modifiers.has('meta')) return false;

  if (event.shiftKey !== modifiers.has('shift')) return false;

  return true;
}
