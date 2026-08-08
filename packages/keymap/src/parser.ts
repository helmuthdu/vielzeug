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

function parseStepStrict(raw: string, modKey: 'ctrl' | 'meta'): ShortcutStep {
  const parts = raw
    .trim()
    .split('+')
    .filter(Boolean)
    .map((part) => part.toLowerCase());

  if (parts.length === 0) throw new KeymapParseError(`Invalid shortcut step: "${raw}"`);

  const aliases: Record<string, ModifierKey> = { ...MODIFIER_ALIASES_BASE, mod: modKey };
  const modifiers = new Set<ModifierKey>();
  const keyParts: string[] = [];

  for (const part of parts) {
    const modifier = Object.hasOwn(aliases, part) ? aliases[part]! : undefined;

    if (modifier) modifiers.add(modifier);
    else keyParts.push(part);
  }

  if (keyParts.length === 0) throw new KeymapParseError(`Invalid shortcut step: "${raw}"`);

  if (keyParts.length > 1) {
    throw new KeymapParseError(`Ambiguous shortcut step: "${raw}" — multiple non-modifier keys found`);
  }

  const rawKey = keyParts[0]!;
  const key = Object.hasOwn(SPECIAL_KEY_ALIASES, rawKey) ? SPECIAL_KEY_ALIASES[rawKey]! : rawKey;

  return { key, modifiers };
}

export function parseStep(raw: string, modKey: 'ctrl' | 'meta' = detectModKey()): ShortcutStep | null {
  try {
    return parseStepStrict(raw, modKey);
  } catch {
    return null;
  }
}

export function parseShortcut(raw: string, modKey: 'ctrl' | 'meta' = detectModKey()): Shortcut {
  const steps = raw.trim().split(/\s+/).filter(Boolean);

  if (steps.length === 0) throw new KeymapParseError('Shortcut must contain at least one key step');

  return steps.map((step) => parseStepStrict(step, modKey));
}

export function canonicalizeShortcut(steps: readonly ShortcutStep[]): string {
  return steps
    .map((step) => {
      const modifiers = [...step.modifiers].sort().join('+');

      return modifiers ? `${modifiers}+${step.key}` : step.key;
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

  return (
    event.altKey === modifiers.has('alt') &&
    event.ctrlKey === modifiers.has('ctrl') &&
    event.metaKey === modifiers.has('meta') &&
    event.shiftKey === modifiers.has('shift')
  );
}
