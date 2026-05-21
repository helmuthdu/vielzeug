import { ValidationError, errorsAt, v } from '../index';

describe('ValidationError message and shaping', () => {
  it('formats a root-level issue with fallback path label', () => {
    const error = new ValidationError([{ code: 'custom', message: 'Invalid', path: [] }]);

    expect(error.message).toBe('value: Invalid [custom]');
  });

  it('formats nested object and array paths', () => {
    const error = new ValidationError([{ code: 'custom', message: 'Invalid', path: ['items', 0, 'name'] }]);

    expect(error.message).toBe('items.0.name: Invalid [custom]');
  });

  it('flatten() returns structured path entries for field errors', () => {
    const result = v
      .object({ email: v.string().email(), name: v.string().min(2) })
      .check((value) => !value.name || value.name !== 'admin' || 'Reserved name')
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
    const result = v.object({ tag: v.string().min(3).max(1) }).safeParse({ tag: 'ab' });

    expect(result.success).toBe(false);

    if (!result.success) {
      const flat = result.error.flatten();
      const tagEntry = flat.fieldErrors.find((e) => e.path[0] === 'tag');

      expect(tagEntry).toBeDefined();
      expect(tagEntry!.messages).toHaveLength(2);
    }
  });

  it('flattenFirst() returns only the first message per path', () => {
    const result = v.object({ tag: v.string().min(3).max(1) }).safeParse({ tag: 'ab' });

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
    const result = v.array(v.number()).safeParse([1, 'bad', 3]);

    expect(result.success).toBe(false);

    if (!result.success) {
      const flat = result.error.flatten();

      expect(flat.fieldErrors[0].path).toEqual([1]);
      expect(flat.fieldErrors[0].messages[0]).toContain('Expected number');
    }
  });

  it('format() builds a nested error tree', () => {
    const result = v
      .object({
        user: v.object({ age: v.number().min(18), email: v.string().email() }),
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
    const result = v.object({ user: v.object({ email: v.string().email() }) }).safeParse({ user: { email: 'bad' } });

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

  it('ValidationError.is() narrows unknown errors', () => {
    const result = v.string().safeParse(42);

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(ValidationError.is(result.error)).toBe(true);
      expect(ValidationError.is(new Error('plain'))).toBe(false);
    }
  });
});
