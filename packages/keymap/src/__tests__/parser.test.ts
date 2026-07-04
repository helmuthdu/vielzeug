import { describe, expect, it } from 'vitest';

import { canonicalizeShortcut, detectModKey, matchStep, parseShortcut, parseStep } from '../parser';
import { makeEvent } from './_fixtures';

describe('parseStep', () => {
  it('parses a plain key', () => {
    expect(parseStep('k')).toEqual({ key: 'k', modifiers: new Set() });
  });

  it('parses modifiers with a key', () => {
    expect(parseStep('ctrl+k')).toEqual({ key: 'k', modifiers: new Set(['ctrl']) });
  });

  it('parses multiple modifiers', () => {
    expect(parseStep('meta+shift+p')).toEqual({ key: 'p', modifiers: new Set(['meta', 'shift']) });
  });

  it('canonicalises modifier aliases', () => {
    expect(parseStep('cmd+k')).toEqual({ key: 'k', modifiers: new Set(['meta']) });
    expect(parseStep('control+k')).toEqual({ key: 'k', modifiers: new Set(['ctrl']) });
    expect(parseStep('opt+k')).toEqual({ key: 'k', modifiers: new Set(['alt']) });
    expect(parseStep('option+k')).toEqual({ key: 'k', modifiers: new Set(['alt']) });
    expect(parseStep('win+k')).toEqual({ key: 'k', modifiers: new Set(['meta']) });
    expect(parseStep('command+k')).toEqual({ key: 'k', modifiers: new Set(['meta']) });
  });

  it('is case-insensitive', () => {
    expect(parseStep('CTRL+K')).toEqual({ key: 'k', modifiers: new Set(['ctrl']) });
  });

  it('returns null for empty string', () => {
    expect(parseStep('')).toBeNull();
    expect(parseStep('  ')).toBeNull();
  });

  it('returns null for modifier-only input (no key)', () => {
    expect(parseStep('ctrl')).toBeNull();
    expect(parseStep('meta+shift')).toBeNull();
    expect(parseStep('alt')).toBeNull();
  });

  it('throws on ambiguous multi-key step (ctrl+k+j)', () => {
    expect(() => parseStep('ctrl+k+j')).toThrow('Ambiguous shortcut step');
  });

  it('resolves mod to ctrl when modKey is ctrl', () => {
    expect(parseStep('mod+k', 'ctrl')).toEqual({ key: 'k', modifiers: new Set(['ctrl']) });
  });

  it('resolves mod to meta when modKey is meta', () => {
    expect(parseStep('mod+k', 'meta')).toEqual({ key: 'k', modifiers: new Set(['meta']) });
  });

  it('resolves special key aliases', () => {
    expect(parseStep('escape')).toEqual({ key: 'escape', modifiers: new Set() });
    expect(parseStep('esc')).toEqual({ key: 'escape', modifiers: new Set() });
    expect(parseStep('space')).toEqual({ key: ' ', modifiers: new Set() });
    expect(parseStep('spacebar')).toEqual({ key: ' ', modifiers: new Set() });
    expect(parseStep('del')).toEqual({ key: 'delete', modifiers: new Set() });
    expect(parseStep('up')).toEqual({ key: 'arrowup', modifiers: new Set() });
    expect(parseStep('down')).toEqual({ key: 'arrowdown', modifiers: new Set() });
    expect(parseStep('left')).toEqual({ key: 'arrowleft', modifiers: new Set() });
    expect(parseStep('right')).toEqual({ key: 'arrowright', modifiers: new Set() });
  });

  it('parses special keys with modifiers', () => {
    expect(parseStep('ctrl+space')).toEqual({ key: ' ', modifiers: new Set(['ctrl']) });
    expect(parseStep('ctrl+esc')).toEqual({ key: 'escape', modifiers: new Set(['ctrl']) });
    expect(parseStep('shift+up')).toEqual({ key: 'arrowup', modifiers: new Set(['shift']) });
  });
});

describe('parseShortcut', () => {
  it('parses a single step', () => {
    const shortcut = parseShortcut('ctrl+k');

    expect(shortcut).toHaveLength(1);
    expect(shortcut[0]).toEqual({ key: 'k', modifiers: new Set(['ctrl']) });
  });

  it('parses chord sequences', () => {
    const shortcut = parseShortcut('ctrl+k ctrl+s');

    expect(shortcut).toHaveLength(2);
    expect(shortcut[0]).toEqual({ key: 'k', modifiers: new Set(['ctrl']) });
    expect(shortcut[1]).toEqual({ key: 's', modifiers: new Set(['ctrl']) });
  });

  it('parses key-key chords', () => {
    const shortcut = parseShortcut('g g');

    expect(shortcut).toHaveLength(2);
    expect(shortcut[0]).toEqual({ key: 'g', modifiers: new Set() });
    expect(shortcut[1]).toEqual({ key: 'g', modifiers: new Set() });
  });

  it('ignores extra whitespace between steps (empty tokens filtered before parsing)', () => {
    expect(parseShortcut('ctrl+k  ctrl+s')).toHaveLength(2);
  });

  it('throws when a non-empty step has no valid key (modifier-only)', () => {
    expect(() => parseShortcut('ctrl+k ctrl')).toThrow('Invalid shortcut step');
  });
});

describe('canonicalizeShortcut', () => {
  it('produces a stable string for a single-step shortcut', () => {
    expect(canonicalizeShortcut(parseShortcut('ctrl+k', 'ctrl'))).toBe('ctrl+k');
  });

  it('aliases resolve to the same canonical key (cmd+k === meta+k)', () => {
    const a = canonicalizeShortcut(parseShortcut('cmd+k', 'ctrl'));
    const b = canonicalizeShortcut(parseShortcut('meta+k', 'ctrl'));

    expect(a).toBe(b);
  });

  it('modifier order in input does not affect canonical output', () => {
    const a = canonicalizeShortcut(parseShortcut('shift+ctrl+k', 'ctrl'));
    const b = canonicalizeShortcut(parseShortcut('ctrl+shift+k', 'ctrl'));

    expect(a).toBe(b);
  });

  it('produces a space-separated canonical key for chord sequences', () => {
    expect(canonicalizeShortcut(parseShortcut('ctrl+k ctrl+s', 'ctrl'))).toBe('ctrl+k ctrl+s');
  });

  it('plain key with no modifiers', () => {
    expect(canonicalizeShortcut(parseShortcut('g', 'ctrl'))).toBe('g');
  });
});

describe('matchStep', () => {
  it('matches plain key', () => {
    const step = parseStep('k')!;

    expect(matchStep(makeEvent('k'), step)).toBe(true);
    expect(matchStep(makeEvent('j'), step)).toBe(false);
  });

  it('requires all modifiers', () => {
    const step = parseStep('ctrl+k')!;

    expect(matchStep(makeEvent('k', { ctrlKey: true }), step)).toBe(true);
    expect(matchStep(makeEvent('k'), step)).toBe(false);
  });

  it('rejects extra modifiers (symmetric boolean check)', () => {
    const step = parseStep('ctrl+k')!;

    expect(matchStep(makeEvent('k', { ctrlKey: true, shiftKey: true }), step)).toBe(false);
    expect(matchStep(makeEvent('k', { altKey: true, ctrlKey: true }), step)).toBe(false);
    expect(matchStep(makeEvent('k', { ctrlKey: true, metaKey: true }), step)).toBe(false);
  });

  it('is case-insensitive for key', () => {
    const step = parseStep('k')!;

    expect(matchStep(makeEvent('K'), step)).toBe(true);
  });

  it('matches space via spacebar event key', () => {
    const step = parseStep('space')!;

    expect(matchStep(makeEvent(' '), step)).toBe(true);
  });

  it('matches escape via esc alias', () => {
    const step = parseStep('esc')!;

    expect(matchStep(makeEvent('Escape'), step)).toBe(true);
  });

  it('matches arrow keys via aliases', () => {
    expect(matchStep(makeEvent('ArrowUp'), parseStep('up')!)).toBe(true);
    expect(matchStep(makeEvent('ArrowDown'), parseStep('down')!)).toBe(true);
    expect(matchStep(makeEvent('ArrowLeft'), parseStep('left')!)).toBe(true);
    expect(matchStep(makeEvent('ArrowRight'), parseStep('right')!)).toBe(true);
  });

  it('returns false (does not throw) for a malformed event missing `key` (headless/non-DOM usage)', () => {
    const step = parseStep('k')!;
    const malformedEvent = {
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
    } as unknown as KeyboardEvent;

    expect(() => matchStep(malformedEvent, step)).not.toThrow();
    expect(matchStep(malformedEvent, step)).toBe(false);
  });
});

describe('parseStep standalone', () => {
  it('parses a multi-modifier step correctly', () => {
    const step = parseStep('ctrl+shift+k', 'ctrl');

    expect(step).not.toBeNull();
    expect(step!.key).toBe('k');
    expect(step!.modifiers).toEqual(new Set(['ctrl', 'shift']));
  });

  it('returns null for an empty string', () => {
    expect(parseStep('', 'ctrl')).toBeNull();
  });
});

describe('detectModKey', () => {
  it('returns a valid modifier key', () => {
    const key = detectModKey();

    expect(['ctrl', 'meta']).toContain(key);
  });

  it('returns the same value on repeated calls (deterministic per environment)', () => {
    expect(detectModKey()).toBe(detectModKey());
  });
});

describe('security — prototype-inherited key handling', () => {
  it('treats __proto__ as a key name (not a modifier)', () => {
    const step = parseStep('ctrl+__proto__', 'ctrl');

    expect(step).not.toBeNull();
    expect(step!.modifiers).toEqual(new Set(['ctrl']));
    expect(step!.key).toBe('__proto__');
  });

  it('treats constructor as a key name (not a modifier)', () => {
    const step = parseStep('ctrl+constructor', 'ctrl');

    expect(step).not.toBeNull();
    expect(step!.modifiers).toEqual(new Set(['ctrl']));
    expect(step!.key).toBe('constructor');
  });

  it('treats valueOf as a key name (not a modifier)', () => {
    const step = parseStep('ctrl+valueof', 'ctrl');

    expect(step).not.toBeNull();
    expect(step!.modifiers).toEqual(new Set(['ctrl']));
    expect(step!.key).toBe('valueof');
  });
});
