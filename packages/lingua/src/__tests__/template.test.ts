import { describe, expect, test, vi } from 'vitest';

import { compileTemplate, renderTemplate } from '../template';

// ─── compileTemplate ──────────────────────────────────────────────────────────

describe('compileTemplate', () => {
  test('empty string produces empty array', () => {
    expect(compileTemplate('')).toEqual([]);
  });

  test('plain string (no variables) produces single string part', () => {
    expect(compileTemplate('Hello world')).toEqual(['Hello world']);
  });

  test('single variable produces single var part', () => {
    expect(compileTemplate('{name}')).toEqual([{ var: 'name' }]);
  });

  test('mixed string and variable', () => {
    expect(compileTemplate('Hello, {name}!')).toEqual(['Hello, ', { var: 'name' }, '!']);
  });

  test('multiple variables', () => {
    expect(compileTemplate('{a} and {b}')).toEqual([{ var: 'a' }, ' and ', { var: 'b' }]);
  });

  test('all-variable template (adjacent vars)', () => {
    expect(compileTemplate('{a}{b}')).toEqual([{ var: 'a' }, { var: 'b' }]);
  });

  test('variable at start', () => {
    expect(compileTemplate('{greeting}, world')).toEqual([{ var: 'greeting' }, ', world']);
  });

  test('variable at end', () => {
    expect(compileTemplate('Hello, {name}')).toEqual(['Hello, ', { var: 'name' }]);
  });
});

// ─── renderTemplate ───────────────────────────────────────────────────────────

describe('renderTemplate', () => {
  const noop = () => '';

  test('renders static parts unchanged', () => {
    const parts = compileTemplate('Hello world');

    expect(renderTemplate(parts, undefined, 'key', 'en', noop)).toBe('Hello world');
  });

  test('substitutes a variable', () => {
    const parts = compileTemplate('Hello, {name}!');

    expect(renderTemplate(parts, { name: 'Alice' }, 'key', 'en', noop)).toBe('Hello, Alice!');
  });

  test('calls onMissingVar for absent variable', () => {
    const parts = compileTemplate('Hi {name}');
    const onMissingVar = vi.fn((_v: string, _k: string, _l: string) => '[MISSING]');

    const result = renderTemplate(parts, undefined, 'greeting', 'en', onMissingVar);

    expect(result).toBe('Hi [MISSING]');
    expect(onMissingVar).toHaveBeenCalledWith('name', 'greeting', 'en');
  });

  test('calls onMissingVar with the correct key and locale', () => {
    const parts = compileTemplate('{x}');
    const calls: [string, string, string][] = [];
    const onMissingVar = (v: string, k: string, l: string) => {
      calls.push([v, k, l]);

      return '';
    };

    renderTemplate(parts, {}, 'myKey', 'de', onMissingVar);
    expect(calls).toEqual([['x', 'myKey', 'de']]);
  });

  test('coerces variable value to string', () => {
    const parts = compileTemplate('{count}');

    expect(renderTemplate(parts, { count: 42 }, 'key', 'en', noop)).toBe('42');
  });

  test('empty compiled template returns empty string', () => {
    expect(renderTemplate([], {}, 'key', 'en', noop)).toBe('');
  });
});
