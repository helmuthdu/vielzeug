import { vi } from 'vitest';

import { errorsAt, prependIssuePath, resetMessages, s, setLogger, setMessages, ValidationError } from '../index';

describe('ValidationError message and shaping', () => {
  it('formats a root-level issue with fallback path label', () => {
    const error = new ValidationError([{ code: 'custom', message: 'Invalid', path: [] }]);

    expect(error.message).toBe('[@vielzeug/spell] value: Invalid [custom]');
  });

  it('formats nested object and array paths', () => {
    const error = new ValidationError([{ code: 'custom', message: 'Invalid', path: ['items', 0, 'name'] }]);

    expect(error.message).toBe('[@vielzeug/spell] items.0.name: Invalid [custom]');
  });

  it('flatten() returns structured path entries for field errors', () => {
    const result = s
      .object({ email: s.string().email(), name: s.string().min(2) })
      .validate((value) => !value.name || value.name !== 'admin' || 'Reserved name')
      .safeParse({ email: 'bad', name: 'admin' });

    expect(result.success).toBe(false);

    if (!result.success) {
      const flat = result.error.flatten();

      const emailEntry = flat.fieldErrors.find((e) => e.path[0] === 'email');

      expect(emailEntry).toBeDefined();
      expect(emailEntry!.messages).toEqual(['Invalid email address']);
      expect(emailEntry!.path).toEqual(['email']);
      expect(flat.formErrors).toEqual(['Reserved name']);
    }
  });

  it('flatten() groups multiple messages under the same path', () => {
    const result = s.object({ tag: s.string().min(3).max(1) }).safeParse({ tag: 'ab' });

    expect(result.success).toBe(false);

    if (!result.success) {
      const flat = result.error.flatten();
      const tagEntry = flat.fieldErrors.find((e) => e.path[0] === 'tag');

      expect(tagEntry).toBeDefined();
      expect(tagEntry!.messages).toHaveLength(2);
    }
  });

  it('flattenFirst() returns only the first message per path', () => {
    const result = s.object({ tag: s.string().min(3).max(1) }).safeParse({ tag: 'ab' });

    expect(result.success).toBe(false);

    if (!result.success) {
      const first = result.error.flattenFirst();
      const tagEntry = first.fieldErrors.find((e) => e.path[0] === 'tag');

      expect(tagEntry).toBeDefined();
      expect(typeof tagEntry!.message).toBe('string');
      expect(first.formErrors).toEqual([]);
    }
  });

  it('flatten() preserves array index segments in path', () => {
    const result = s.array(s.number()).safeParse([1, 'bad', 3]);

    expect(result.success).toBe(false);

    if (!result.success) {
      const flat = result.error.flatten();

      expect(flat.fieldErrors[0].path).toEqual([1]);
      expect(flat.fieldErrors[0].messages[0]).toContain('Expected number');
    }
  });

  it('format() builds a nested error tree', () => {
    const result = s
      .object({
        user: s.object({ age: s.number().min(18), email: s.string().email() }),
      })
      .safeParse({ user: { age: 10, email: 'bad' } });

    expect(result.success).toBe(false);

    if (!result.success) {
      const tree = result.error.format();

      expect(tree._errors).toEqual([]);
      expect((tree.user as any).age._errors.length).toBeGreaterThan(0);
      expect((tree.user as any).email._errors.length).toBeGreaterThan(0);
    }
  });

  it('errorsAt() navigates a formatted error tree', () => {
    const result = s.object({ user: s.object({ email: s.string().email() }) }).safeParse({ user: { email: 'bad' } });

    expect(result.success).toBe(false);

    if (!result.success) {
      const tree = result.error.format();

      expect(errorsAt(tree, 'user', 'email')).toContain('Invalid email address');
      expect(errorsAt(tree, 'user', 'missing')).toEqual([]);
      expect(errorsAt(tree, 'nonexistent')).toEqual([]);
    }
  });

  it('errorsAt() returns root errors when no path is given', () => {
    const error = new ValidationError([{ code: 'custom', message: 'Root error', path: [] }]);
    const tree = error.format();

    expect(errorsAt(tree)).toEqual(['Root error']);
  });

  it('format() uses null-prototype nodes for unsafe path segments', () => {
    const error = new ValidationError([{ code: 'custom', message: 'Blocked', path: ['__proto__', 'polluted'] }]);
    const tree = error.format();

    expect(Object.getPrototypeOf(tree)).toBeNull();
    expect(errorsAt(tree, '__proto__', 'polluted')).toEqual(['Blocked']);
    expect(({} as { polluted?: string }).polluted).toBeUndefined();
  });

  it('format() safely stores constructor/prototype path segments', () => {
    const error = new ValidationError([
      { code: 'custom', message: 'Blocked', path: ['constructor', 'prototype', 'polluted'] },
    ]);
    const tree = error.format();

    expect(Object.getPrototypeOf(tree)).toBeNull();
    expect(errorsAt(tree, 'constructor', 'prototype', 'polluted')).toEqual(['Blocked']);
    expect(({} as { polluted?: string }).polluted).toBeUndefined();
  });

  it('format() remaps "_errors" path segment to avoid corrupting the internal field', () => {
    const error = new ValidationError([{ code: 'custom', message: 'Nested', path: ['_errors', 'field'] }]);
    const tree = error.format();

    expect(tree._errors).toEqual([]);
    expect(Array.isArray(tree._errors)).toBe(true);
    expect(errorsAt(tree, '_errors', 'field')).toEqual(['Nested']);
  });

  it('errorsAt() with "_errors" segment does not fall into the string[] internal field', () => {
    const error = new ValidationError([{ code: 'custom', message: 'Deep', path: ['_errors'] }]);
    const tree = error.format();

    expect(tree._errors).toEqual([]);
    expect(errorsAt(tree, '_errors')).toEqual(['Deep']);
  });

  it('ValidationError.is() narrows unknown errors', () => {
    const result = s.string().safeParse(42);

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(ValidationError.is(result.error)).toBe(true);
      expect(ValidationError.is(new Error('plain'))).toBe(false);
    }
  });
});

describe('ValidationError.bestMatch()', () => {
  it('returns null when no invalid_union issue exists', () => {
    const result = s.string().safeParse(42);

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.bestMatch()).toBeNull();
    }
  });

  it('returns the branch with the deepest path (closest match) from a union', () => {
    const schema = s.union(
      s.object({ type: s.literal('a'), value: s.string() }),
      s.object({ type: s.literal('b'), value: s.number() }),
    );

    const result = schema.safeParse({ type: 'a', value: 123 });

    expect(result.success).toBe(false);

    if (!result.success) {
      const best = result.error.bestMatch();

      expect(best).not.toBeNull();
      expect(best![0].path).toEqual(['value']);
    }
  });

  it('returns null when invalid_union has zero branches', () => {
    const error = new ValidationError([
      { code: 'invalid_union', message: 'no match', params: { errors: [] }, path: [] },
    ]);

    expect(error.bestMatch()).toBeNull();
  });
});

describe('prependIssuePath()', () => {
  it('prepends a string segment to all issue paths', () => {
    const issues = prependIssuePath([{ code: 'custom', message: 'Bad', path: ['name'] }], 'user');

    expect(issues[0].path).toEqual(['user', 'name']);
  });

  it('prepends a number segment (array index)', () => {
    const issues = prependIssuePath([{ code: 'custom', message: 'Bad', path: [] }], 0);

    expect(issues[0].path).toEqual([0]);
  });

  it('does not mutate the original issues array', () => {
    const original = [{ code: 'custom', message: 'Bad', path: ['field'] }];
    const result = prependIssuePath(original, 'root');

    expect(result).not.toBe(original);
    expect(original[0].path).toEqual(['field']);
    expect(result[0].path).toEqual(['root', 'field']);
  });

  it('handles empty issues array', () => {
    expect(prependIssuePath([], 'x')).toEqual([]);
  });
});

describe('setLogger(null) — warning silencing', () => {
  afterEach(() => {
    resetMessages();
    setLogger(null);
  });

  it('silences internal warnings when logger is null', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    setLogger(null);
    setMessages(
      Object.assign(
        {},
        { string: Object.create(null, { constructor: { enumerable: true, value: () => 'x' } }) },
      ) as any,
    );

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('routes warnings to a custom logger function', () => {
    const logs: string[] = [];
    const unsafeMessages = { string: Object.create(null, { constructor: { enumerable: true, value: () => 'x' } }) };

    setLogger((msg) => logs.push(msg));
    setMessages(unsafeMessages as any);

    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0]).toContain('constructor');
  });
});
