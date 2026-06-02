import { describe, expect, it } from 'vitest';

import { setBooleanAttribute, setMaybeAttribute } from '../attrs';
import { getChoiceLabel, getLightChildrenByTag } from '../light-dom';
import { toFiniteNumber, toFiniteNumberOr, toPositiveStep } from '../numbers';
import { parseStringTriggers } from '../parse';

// ── attrs ─────────────────────────────────────────────────────────────────────

describe('setMaybeAttribute()', () => {
  it('sets the attribute when value is truthy', () => {
    const el = document.createElement('div');

    setMaybeAttribute(el, 'data-color', 'primary');

    expect(el.getAttribute('data-color')).toBe('primary');
  });

  it('removes the attribute when value is undefined', () => {
    const el = document.createElement('div');

    el.setAttribute('data-color', 'primary');
    setMaybeAttribute(el, 'data-color', undefined);

    expect(el.hasAttribute('data-color')).toBe(false);
  });

  it('removes the attribute when value is an empty string', () => {
    const el = document.createElement('div');

    el.setAttribute('data-color', 'primary');
    setMaybeAttribute(el, 'data-color', '');

    expect(el.hasAttribute('data-color')).toBe(false);
  });
});

describe('setBooleanAttribute()', () => {
  it('adds the attribute when active is true', () => {
    const el = document.createElement('button');

    setBooleanAttribute(el, 'disabled', true);

    expect(el.hasAttribute('disabled')).toBe(true);
  });

  it('removes the attribute when active is false', () => {
    const el = document.createElement('button');

    el.setAttribute('disabled', '');
    setBooleanAttribute(el, 'disabled', false);

    expect(el.hasAttribute('disabled')).toBe(false);
  });

  it('is idempotent — calling with the same value multiple times does not throw', () => {
    const el = document.createElement('div');

    setBooleanAttribute(el, 'aria-hidden', true);
    setBooleanAttribute(el, 'aria-hidden', true);

    expect(el.getAttribute('aria-hidden')).toBe('');
  });
});

// ── light-dom ─────────────────────────────────────────────────────────────────

describe('getLightChildrenByTag()', () => {
  it('returns all direct and nested children matching the tag', () => {
    const host = document.createElement('div');

    host.innerHTML = `
      <bit-option value="a">Apple</bit-option>
      <bit-option value="b">Banana</bit-option>
    `;

    const options = getLightChildrenByTag(host, 'bit-option');

    expect(options).toHaveLength(2);
    expect(options[0].getAttribute('value')).toBe('a');
  });

  it('returns an empty array when no children match', () => {
    const host = document.createElement('div');

    expect(getLightChildrenByTag(host, 'bit-option')).toEqual([]);
  });
});

describe('getChoiceLabel()', () => {
  it('returns textContent of the matching item', () => {
    const host = document.createElement('div');

    host.innerHTML = `
      <bit-option value="us">United States</bit-option>
      <bit-option value="gb">United Kingdom</bit-option>
    `;

    const items = getLightChildrenByTag(host, 'bit-option');

    expect(getChoiceLabel(items, 'us')).toBe('United States');
    expect(getChoiceLabel(items, 'gb')).toBe('United Kingdom');
  });

  it('falls back to the value string when no item matches', () => {
    const items: HTMLElement[] = [];

    expect(getChoiceLabel(items, 'fallback-value')).toBe('fallback-value');
  });

  it('collapses whitespace in textContent', () => {
    const host = document.createElement('div');

    host.innerHTML = `<bit-option value="x">  Multi   Space  </bit-option>`;

    const items = getLightChildrenByTag(host, 'bit-option');

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
