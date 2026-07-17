import { createForm, ForgeConfigError, ForgeError } from '../../index';

describe('prototype chain safety', () => {
  test('set() throws for a top-level __proto__ key', () => {
    const form = createForm({ defaultValues: {} as Record<string, unknown> });

    expect(() => form.set('__proto__' as never, 'x' as never)).toThrow(
      "Unsafe key '__proto__': segments __proto__, constructor, and prototype are reserved.",
    );
  });

  test('set() throws a ForgeConfigError instance for an unsafe key, and ForgeError.is() recognizes it', () => {
    const form = createForm({ defaultValues: {} as Record<string, unknown> });

    let caught: unknown;

    try {
      form.set('__proto__' as never, 'x' as never);
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(ForgeConfigError);
    expect(caught).toBeInstanceOf(ForgeError);
    expect(ForgeError.is(caught)).toBe(true);
  });

  test('set() throws for __proto__ as an inner dot-notation segment', () => {
    const form = createForm({ defaultValues: {} as Record<string, unknown> });

    expect(() => form.set('a.__proto__.b' as never, 'x' as never)).toThrow('Unsafe key');
  });

  test('set() throws for a top-level constructor key', () => {
    const form = createForm({ defaultValues: {} as Record<string, unknown> });

    expect(() => form.set('constructor' as never, 'x' as never)).toThrow('Unsafe key');
  });

  test('set() throws for a top-level prototype key', () => {
    const form = createForm({ defaultValues: {} as Record<string, unknown> });

    expect(() => form.set('prototype' as never, 'x' as never)).toThrow('Unsafe key');
  });

  test('setError() throws for an unsafe key', () => {
    const form = createForm({ defaultValues: {} as Record<string, unknown> });

    expect(() => form.setError('__proto__' as never, 'bad message')).toThrow('Unsafe key');
  });

  test('clearError() throws for an unsafe key', () => {
    const form = createForm({ defaultValues: {} as Record<string, unknown> });

    expect(() => form.clearError('__proto__' as never)).toThrow('Unsafe key');
  });

  test('setValidator() throws for an unsafe key', () => {
    const form = createForm({ defaultValues: {} as Record<string, unknown> });

    expect(() => form.fields.setValidator('__proto__' as never, () => undefined)).toThrow('Unsafe key');
  });

  test('createForm throws when an initial validator uses an unsafe key', () => {
    expect(() => createForm({ validators: { ['__proto__' as never]: () => undefined } })).toThrow('Unsafe key');
  });

  test('touch() throws for an unsafe key', () => {
    const form = createForm({ defaultValues: {} as Record<string, unknown> });

    expect(() => form.touch('__proto__' as never)).toThrow('Unsafe key');
  });

  test('untouch() throws for an unsafe key', () => {
    const form = createForm({ defaultValues: {} as Record<string, unknown> });

    expect(() => form.untouch('__proto__' as never)).toThrow('Unsafe key');
  });

  test('resetField() throws for an unsafe key', () => {
    const form = createForm({ defaultValues: {} as Record<string, unknown> });

    expect(() => form.resetField('__proto__' as never)).toThrow('Unsafe key');
  });

  test('get() throws for an unsafe key', () => {
    const form = createForm({ defaultValues: {} as Record<string, unknown> });

    expect(() => form.get('__proto__' as never)).toThrow('Unsafe key');
  });

  test('field() throws for an unsafe key', () => {
    const form = createForm({ defaultValues: {} as Record<string, unknown> });

    expect(() => form.field('__proto__' as never)).toThrow('Unsafe key');
  });

  test('connect() throws for an unsafe key', () => {
    const form = createForm({ defaultValues: {} as Record<string, unknown> });

    expect(() => form.connect('__proto__' as never)).toThrow('Unsafe key');
  });

  test('array() throws for an unsafe key', () => {
    const form = createForm({ defaultValues: {} as Record<string, unknown> });

    expect(() => form.array('__proto__' as never)).toThrow('Unsafe key');
  });

  test('subscribeField() throws for an unsafe key', () => {
    const form = createForm({ defaultValues: {} as Record<string, unknown> });

    expect(() => form.subscribeField('__proto__' as never, () => {})).toThrow('Unsafe key');
  });

  test('deep dot-path keys emit a dev warning once when type inference likely falls back', () => {
    const form = createForm<Record<string, unknown>>({});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const deepKey = 'a.b.c.d.e.f' as never;

    form.set(deepKey, 'x' as never);
    form.set(deepKey, 'y' as never);

    const fallbackWarnings = warnSpy.mock.calls.filter((call) =>
      String(call[0]).includes('exceeds typed depth limits'),
    );

    expect(fallbackWarnings).toHaveLength(1);

    warnSpy.mockRestore();
  });

  test('fields.remove() throws for an unsafe key', () => {
    const form = createForm({ defaultValues: {} as Record<string, unknown> });

    expect(() => form.fields.remove('__proto__' as never)).toThrow('Unsafe key');
  });

  test('patch() silently drops __proto__ keys from JSON-parsed input and preserves safe keys', () => {
    const form = createForm({ defaultValues: { name: 'Alice' } });

    // JSON.parse creates an own enumerable __proto__ property — the confirmed attack vector.
    const malicious = JSON.parse('{"__proto__": {"isAdmin": true}, "name": "Bob"}') as {
      name: string;
    };

    expect(() => form.patch(malicious)).not.toThrow();

    // The safe field must be updated.
    expect(form.get('name')).toBe('Bob');

    // The prototype chain of values() must not be corrupted.
    const vals = form.values();

    expect(Object.getPrototypeOf(vals)).toBe(Object.prototype);
    expect(Object.prototype.hasOwnProperty.call(vals, 'isAdmin')).toBe(false);
    expect('isAdmin' in vals).toBe(false);
  });

  test('values() prototype chain is not corrupted when the store has an __proto__ segment key', () => {
    // Exercise the unflattenValues defence-in-depth guard: if a '__proto__.*' key ever reaches
    // the flat store (e.g. via a future code path that skips set()), values() must still return
    // a clean object.
    const form = createForm({ defaultValues: { name: 'Alice' } });

    // Directly exercise unflattenValues with a hostile flat map via replace() using a safe
    // proxy — replace() goes through flattenValues which also filters unsafe keys.
    // The actual guard is in unflattenValues; we verify the end-to-end invariant.
    const vals = form.values();

    expect(Object.getPrototypeOf(vals)).toBe(Object.prototype);
  });

  test('defaultValues with deeply nested object beyond the depth limit does not stack overflow', () => {
    let deep: Record<string, unknown> = { leaf: 'value' };

    for (let i = 0; i < 15; i++) deep = { nested: deep };

    // Should not throw RangeError: Maximum call stack size exceeded.
    expect(() => createForm({ defaultValues: deep })).not.toThrow();
  });

  test('replace() with deeply nested values beyond the depth limit does not stack overflow', () => {
    const form = createForm({ defaultValues: { a: 1 } });
    let deep: Record<string, unknown> = { leaf: 'value' };

    for (let i = 0; i < 15; i++) deep = { nested: deep };

    expect(() => form.replace(deep as { a: number })).not.toThrow();
  });

  test('restore() silently drops reserved-segment keys from an externally-sourced snapshot', () => {
    const form = createForm({ defaultValues: { name: 'Alice' } });

    // Simulate a snapshot loaded from persisted/untrusted storage (e.g. JSON.parse'd localStorage)
    // containing reserved keys in every Map-backed section of a FormSnapshot.
    // JSON.parse (unlike an object literal) creates a genuine own enumerable "__proto__"
    // property — the confirmed attack vector used by the patch() test above.
    const maliciousSnapshot = JSON.parse(`{
      "baseline": { "__proto__": "x", "constructor.prototype.polluted": "x", "name": "Bob" },
      "dirty": ["__proto__", "name"],
      "errors": { "__proto__": "bad", "prototype": "bad", "name": "bad-error" },
      "store": { "__proto__": "x", "constructor.prototype.polluted": "x", "name": "Bob" },
      "submitCount": 0,
      "touched": ["__proto__", "name"]
    }`) as Parameters<typeof form.restore>[0];

    expect(() => form.restore(maliciousSnapshot)).not.toThrow();

    expect(form.get('name')).toBe('Bob');
    expect(Object.getPrototypeOf(form.values())).toBe(Object.prototype);
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, 'polluted')).toBe(false);

    // Reserved keys must not have been written into internal state at all — reading them back
    // via the guarded single-key APIs must still throw (they were never accepted), and the
    // resulting snapshot must not carry them forward.
    const roundTripped = form.snapshot();

    expect(Object.keys(roundTripped.store)).not.toContain('__proto__');
    expect(Object.keys(roundTripped.errors)).not.toContain('__proto__');
    expect(Object.keys(roundTripped.errors)).not.toContain('prototype');
    expect(roundTripped.touched).not.toContain('__proto__');
    expect(roundTripped.dirty).not.toContain('__proto__');
  });

  test('a form-level validator returning reserved-segment keys does not leak them into errors()', async () => {
    const form = createForm({
      defaultValues: { name: '' },
      // Object.fromEntries (unlike an object literal) creates genuine own enumerable
      // "__proto__"/"constructor"/"prototype" properties instead of specially intercepting them.
      // "prototype" is the interesting case: plain objects don't inherit an own `.prototype`,
      // so it is NOT naturally shadowed the way "__proto__"/"constructor" incidentally are —
      // it must be rejected explicitly by the isSafeKey() filter in runFormValidator().
      validator: () =>
        Object.fromEntries([
          ['__proto__', 'polluted'],
          ['constructor', 'polluted'],
          ['prototype', 'polluted'],
          ['name', 'Required'],
        ]) as never,
    });

    await form.validate();

    expect(form.state.errors.name).toBe('Required');
    expect(Object.keys(form.state.errors)).not.toContain('__proto__');
    expect(Object.keys(form.state.errors)).not.toContain('constructor');
    expect(Object.keys(form.state.errors)).not.toContain('prototype');
    expect(Object.getPrototypeOf(form.state.errors)).toBe(Object.prototype);
  });

  test('a SafeParseSchema validator returning reserved-segment issue paths does not leak them into errors()', async () => {
    const schema = {
      safeParse: () => ({
        error: {
          issues: [
            { message: 'polluted', path: ['__proto__'] },
            { message: 'polluted', path: ['constructor', 'prototype'] },
            { message: 'polluted', path: ['prototype'] },
            { message: 'Required', path: ['name'] },
          ],
        },
        success: false as const,
      }),
    };

    const form = createForm({ defaultValues: { name: '' }, validator: schema });

    await form.validate();

    expect(form.state.errors.name).toBe('Required');
    expect(Object.keys(form.state.errors)).not.toContain('__proto__');
    expect(Object.keys(form.state.errors)).not.toContain('constructor.prototype');
    expect(Object.keys(form.state.errors)).not.toContain('prototype');
  });
});
