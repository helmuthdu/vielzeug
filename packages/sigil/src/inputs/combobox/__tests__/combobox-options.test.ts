import { describe, expect, it } from 'vitest';

import { filterOptions, getCreatableLabel, makeCreatableValue, parseSlottedOptions } from '../combobox-options';

// ── parseSlottedOptions ────────────────────────────────────────────────────────

describe('parseSlottedOptions', () => {
  function makeOption(attrs: Record<string, string | null> = {}, textContent = ''): Element {
    const el = document.createElement('bit-combobox-option');

    for (const [key, value] of Object.entries(attrs)) {
      if (value !== null) el.setAttribute(key, value);
    }

    el.textContent = textContent;

    return el;
  }

  it('returns empty array for empty input', () => {
    expect(parseSlottedOptions([])).toEqual([]);
  });

  it('filters out non-bit-combobox-option elements', () => {
    const div = document.createElement('div');
    const option = makeOption({ value: 'a' }, 'Alpha');

    expect(parseSlottedOptions([div, option])).toHaveLength(1);
    expect(parseSlottedOptions([div, option])[0].value).toBe('a');
  });

  it('reads value attribute', () => {
    const option = makeOption({ value: 'my-val' }, 'My Option');
    const [result] = parseSlottedOptions([option]);

    expect(result.value).toBe('my-val');
  });

  it('falls back to empty string when value attribute is absent', () => {
    const option = makeOption({}, 'No value');
    const [result] = parseSlottedOptions([option]);

    expect(result.value).toBe('');
  });

  it('prefers label attribute over text content', () => {
    const option = makeOption({ label: 'Label Attr', value: 'v' }, 'Text Content');
    const [result] = parseSlottedOptions([option]);

    expect(result.label).toBe('Label Attr');
  });

  it('falls back to trimmed text content when label attribute is absent', () => {
    const option = makeOption({ value: 'v' }, '  My Text  ');
    const [result] = parseSlottedOptions([option]);

    expect(result.label).toBe('My Text');
  });

  it('reads disabled attribute', () => {
    const enabled = makeOption({ value: 'a' }, 'A');
    const disabled = makeOption({ disabled: '', value: 'b' }, 'B');
    const results = parseSlottedOptions([enabled, disabled]);

    expect(results[0].disabled).toBe(false);
    expect(results[1].disabled).toBe(true);
  });
});

// ── filterOptions ──────────────────────────────────────────────────────────────

describe('filterOptions', () => {
  const options = [
    { disabled: false, iconEl: null, label: 'Apple', value: 'apple' },
    { disabled: false, iconEl: null, label: 'Banana', value: 'banana' },
    { disabled: false, iconEl: null, label: 'Cherry', value: 'cherry' },
  ];

  it('returns all options when noFilter is true', () => {
    expect(filterOptions(options, 'app', true)).toHaveLength(3);
  });

  it('returns all options when query is empty', () => {
    expect(filterOptions(options, '', false)).toHaveLength(3);
  });

  it('returns all options when query is whitespace only', () => {
    expect(filterOptions(options, '   ', false)).toHaveLength(3);
  });

  it('filters by label (case-insensitive)', () => {
    const result = filterOptions(options, 'APP', false);

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('Apple');
  });

  it('filters by value (case-insensitive)', () => {
    const result = filterOptions(options, 'CHERRY', false);

    expect(result).toHaveLength(1);
    expect(result[0].value).toBe('cherry');
  });

  it('returns empty array when no options match', () => {
    expect(filterOptions(options, 'xyz', false)).toHaveLength(0);
  });
});

// ── getCreatableLabel ──────────────────────────────────────────────────────────

describe('getCreatableLabel', () => {
  const existingOptions = [{ disabled: false, iconEl: null, label: 'Apple', value: 'apple' }];

  it('returns empty string when creatable is false', () => {
    expect(getCreatableLabel('new item', false, existingOptions)).toBe('');
  });

  it('returns empty string when query is empty', () => {
    expect(getCreatableLabel('', true, existingOptions)).toBe('');
  });

  it('returns empty string when query is whitespace only', () => {
    expect(getCreatableLabel('   ', true, existingOptions)).toBe('');
  });

  it('returns empty string when query exactly matches an existing label', () => {
    expect(getCreatableLabel('Apple', true, existingOptions)).toBe('');
  });

  it('is case-insensitive when checking for exact matches', () => {
    expect(getCreatableLabel('apple', true, existingOptions)).toBe('');
    expect(getCreatableLabel('APPLE', true, existingOptions)).toBe('');
  });

  it('returns Create "..." label when query is new', () => {
    expect(getCreatableLabel('Mango', true, existingOptions)).toBe('Create "Mango"');
  });

  it('trims query before checking', () => {
    expect(getCreatableLabel('  Apple  ', true, existingOptions)).toBe('');
    expect(getCreatableLabel('  Mango  ', true, existingOptions)).toBe('Create "Mango"');
  });
});

// ── makeCreatableValue ─────────────────────────────────────────────────────────

describe('makeCreatableValue', () => {
  it('prefixes value with __new__:', () => {
    expect(makeCreatableValue('my option')).toBe('__new__:my option');
  });

  it('trims whitespace from the query', () => {
    expect(makeCreatableValue('  my option  ')).toBe('__new__:my option');
  });

  it('handles empty string', () => {
    expect(makeCreatableValue('')).toBe('__new__:');
  });
});
