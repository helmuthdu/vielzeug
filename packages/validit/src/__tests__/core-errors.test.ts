import { ValidationError, v } from '../index';

describe('ValidationError message and shaping', () => {
  it('formats a root-level issue with fallback path label', () => {
    const error = new ValidationError([{ code: 'custom', message: 'Invalid', path: [] }]);

    expect(error.message).toBe('value: Invalid [custom]');
  });

  it('formats nested object and array paths', () => {
    const error = new ValidationError([{ code: 'custom', message: 'Invalid', path: ['items', 0, 'name'] }]);

    expect(error.message).toBe('items.0.name: Invalid [custom]');
  });

  it('flatten() separates field and form errors', () => {
    const result = v
      .object({ email: v.string().email(), name: v.string().min(2) })
      .check((value) => value.name !== 'admin' || 'Reserved name')
      .safeParse({ email: 'bad', name: 'admin' });

    expect(result.success).toBe(false);

    if (!result.success) {
      const flat = result.error.flatten();

      expect(flat.fieldErrors.email).toEqual(['Invalid email address']);
      expect(flat.formErrors).toEqual(['Reserved name']);
    }
  });

  it('flattenFirst() returns first message per field', () => {
    const result = v.object({ tag: v.string().min(3).max(1) }).safeParse({ tag: 'ab' });

    expect(result.success).toBe(false);

    if (!result.success) {
      const first = result.error.flattenFirst();

      expect(typeof first.fieldErrors.tag).toBe('string');
      expect(first.formErrors).toEqual([]);
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

  it('ValidationError.is() narrows unknown errors', () => {
    const result = v.string().safeParse(42);

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(ValidationError.is(result.error)).toBe(true);
      expect(ValidationError.is(new Error('plain'))).toBe(false);
    }
  });
});
