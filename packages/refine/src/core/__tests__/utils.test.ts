import { signal } from '@vielzeug/ripple';
import { describe, expect, it } from 'vitest';

import { getChoiceLabel, getLightChildrenByTag } from '../light-dom';
import { toFiniteNumber, toFiniteNumberOr, toPositiveStep } from '../numbers';
import { parseStringTriggers } from '../parse';
import { syncedSignal } from '../signals';

// ── syncedSignal ─────────────────────────────────────────────────────────────

describe('syncedSignal()', () => {
  it('initialises with the source value', () => {
    const controller = new AbortController();
    const source = signal('hello');
    const local = syncedSignal(source, controller.signal);

    expect(local.value).toBe('hello');
  });

  it('stays in sync when the source changes', () => {
    const controller = new AbortController();
    const source = signal('a');
    const local = syncedSignal(source, controller.signal);

    source.value = 'b';

    expect(local.value).toBe('b');
  });

  it('applies the transform function to each incoming value', () => {
    const controller = new AbortController();
    const source = signal<string | undefined>(undefined);
    const local = syncedSignal(source, controller.signal, (v) => String(v ?? ''));

    expect(local.value).toBe('');

    source.value = 'test';

    expect(local.value).toBe('test');
  });

  it('stops syncing after signal is aborted', () => {
    const controller = new AbortController();
    const source = signal('initial');
    const local = syncedSignal(source, controller.signal);

    controller.abort();
    source.value = 'updated';

    expect(local.value).toBe('initial');
  });

  it('local signal remains writable after abort', () => {
    const controller = new AbortController();
    const source = signal('a');
    const local = syncedSignal(source, controller.signal);

    controller.abort();
    local.value = 'manual';

    expect(local.value).toBe('manual');
  });

  it('works without abortSignal — stays synced until caller disposes', () => {
    const source = signal(1);
    const local = syncedSignal(source);

    expect(local.value).toBe(1);

    source.value = 2;

    expect(local.value).toBe(2);
  });

  it('transform is applied when abortSignal is omitted', () => {
    const source = signal<number | undefined>(undefined);
    const local = syncedSignal(source, undefined, (v) => v ?? 0);

    expect(local.value).toBe(0);

    source.value = 7;

    expect(local.value).toBe(7);
  });
});

// ── light-dom ─────────────────────────────────────────────────────────────────

describe('getLightChildrenByTag()', () => {
  it('returns all direct and nested children matching the tag', () => {
    const host = document.createElement('div');

    host.innerHTML = `
      <ore-option value="a">Apple</ore-option>
      <ore-option value="b">Banana</ore-option>
    `;

    const options = getLightChildrenByTag(host, 'ore-option');

    expect(options).toHaveLength(2);
    expect(options[0].getAttribute('value')).toBe('a');
  });

  it('returns an empty array when no children match', () => {
    const host = document.createElement('div');

    expect(getLightChildrenByTag(host, 'ore-option')).toEqual([]);
  });
});

describe('getChoiceLabel()', () => {
  it('returns textContent of the matching item', () => {
    const host = document.createElement('div');

    host.innerHTML = `
      <ore-option value="us">United States</ore-option>
      <ore-option value="gb">United Kingdom</ore-option>
    `;

    const items = getLightChildrenByTag(host, 'ore-option');

    expect(getChoiceLabel(items, 'us')).toBe('United States');
    expect(getChoiceLabel(items, 'gb')).toBe('United Kingdom');
  });

  it('falls back to the value string when no item matches', () => {
    const items: HTMLElement[] = [];

    expect(getChoiceLabel(items, 'fallback-value')).toBe('fallback-value');
  });

  it('collapses whitespace in textContent', () => {
    const host = document.createElement('div');

    host.innerHTML = `<ore-option value="x">  Multi   Space  </ore-option>`;

    const items = getLightChildrenByTag(host, 'ore-option');

    expect(getChoiceLabel(items, 'x')).toBe('Multi Space');
  });
});

// ── parse ─────────────────────────────────────────────────────────────────────

describe('parseStringTriggers()', () => {
  const VALID = new Set(['click', 'hover', 'focus'] as const);

  type Trigger = 'click' | 'hover' | 'focus';

  const DEFAULTS: Trigger[] = ['click'];

  it('parses a comma-separated string into a typed array', () => {
    expect(parseStringTriggers('hover,focus', VALID, DEFAULTS)).toEqual(['hover', 'focus']);
  });

  it('returns defaults when the input is empty', () => {
    expect(parseStringTriggers('', VALID, DEFAULTS)).toEqual(['click']);
  });

  it('returns defaults when the input is null', () => {
    expect(parseStringTriggers(null, VALID, DEFAULTS)).toEqual(['click']);
  });

  it('returns defaults when the input is undefined', () => {
    expect(parseStringTriggers(undefined, VALID, DEFAULTS)).toEqual(['click']);
  });

  it('filters out invalid trigger names', () => {
    expect(parseStringTriggers('hover,invalid,focus', VALID, DEFAULTS)).toEqual(['hover', 'focus']);
  });

  it('strips surrounding whitespace from each entry', () => {
    expect(parseStringTriggers(' hover , focus ', VALID, DEFAULTS)).toEqual(['hover', 'focus']);
  });

  it('returns defaults when all entries are invalid', () => {
    expect(parseStringTriggers('bad,wrong', VALID, DEFAULTS)).toEqual(['click']);
  });

  it('coerces a number input to string via String() and returns defaults for non-matching', () => {
    expect(parseStringTriggers(42 as unknown as string, VALID, DEFAULTS)).toEqual(['click']);
  });

  it('coerces boolean true to string "true" which is not a valid trigger — returns defaults', () => {
    expect(parseStringTriggers(true as unknown as string, VALID, DEFAULTS)).toEqual(['click']);
  });
});

// ── numbers ───────────────────────────────────────────────────────────────────

describe('toFiniteNumber()', () => {
  it('converts a numeric string to a number', () => {
    expect(toFiniteNumber('42')).toBe(42);
  });

  it('converts a number to itself', () => {
    expect(toFiniteNumber(3.14)).toBe(3.14);
  });

  it('returns undefined for NaN', () => {
    expect(toFiniteNumber(NaN)).toBeUndefined();
  });

  it('returns undefined for Infinity', () => {
    expect(toFiniteNumber(Infinity)).toBeUndefined();
  });

  it('returns undefined for non-numeric strings', () => {
    expect(toFiniteNumber('abc')).toBeUndefined();
  });

  it('returns 0 for null (Number(null) === 0)', () => {
    expect(toFiniteNumber(null)).toBe(0);
  });

  it('returns 0 for an empty string (Number("") === 0)', () => {
    expect(toFiniteNumber('')).toBe(0);
  });
});

describe('toFiniteNumberOr()', () => {
  it('returns the parsed value when finite', () => {
    expect(toFiniteNumberOr('10', 0)).toBe(10);
  });

  it('returns the fallback for NaN input', () => {
    expect(toFiniteNumberOr('bad', 5)).toBe(5);
  });

  it('returns the fallback for undefined input', () => {
    expect(toFiniteNumberOr(undefined, 99)).toBe(99);
  });
});

describe('toPositiveStep()', () => {
  it('returns the absolute value of a negative number', () => {
    expect(toPositiveStep(-3, 1)).toBe(3);
  });

  it('returns the fallback when value is zero', () => {
    expect(toPositiveStep(0, 1)).toBe(1);
  });

  it('returns the fallback for non-numeric input', () => {
    expect(toPositiveStep('nope', 2)).toBe(2);
  });

  it('returns the parsed positive number unchanged', () => {
    expect(toPositiveStep(5, 1)).toBe(5);
  });
});
