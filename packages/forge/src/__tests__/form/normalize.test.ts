import { ForgeConfigError } from '../../errors.js';
import { createForm, toPlainValues } from '../../index';

class ProviderUserModel {
  email: string;
  id: number;
  nested = { role: 'admin' };

  constructor(id = 1, email = 'a@example.com') {
    this.id = id;
    this.email = email;
  }
}

describe('normalize option and toPlainValues', () => {
  test('toPlainValues flattens class instances to own enumerable entries', () => {
    const plain = toPlainValues({ user: new ProviderUserModel(7, 'b@example.com') });

    expect(plain).toEqual({ user: { email: 'b@example.com', id: 7, nested: { role: 'admin' } } });
    expect(Object.getPrototypeOf(plain.user)).toBe(Object.prototype);
  });

  test('toPlainValues output always passes immutable validation at every boundary', () => {
    const values = { at: new Date('2026-01-01'), list: [new ProviderUserModel()] };
    const form = createForm({ initialValues: toPlainValues(values) });

    expect(() => form.reset(toPlainValues(values))).not.toThrow();
    expect(() => form.set(toPlainValues(values))).not.toThrow();
    expect(() => form.field('list').set(toPlainValues([new ProviderUserModel()]))).not.toThrow();
  });

  test('toPlainValues clones Dates and preserves File/Blob identity', () => {
    const date = new Date('2026-02-02');
    const blob = new Blob(['x']);
    const plain = toPlainValues({ blob, date });

    expect(plain.date).not.toBe(date);
    expect(plain.date).toEqual(date);
    expect(plain.date instanceof Date).toBe(true);
    expect(plain.blob).toBe(blob);
  });

  test('toPlainValues drops unsafe keys and replaces circular branches with undefined', () => {
    const circular: Record<string, unknown> = { name: 'a' };
    circular.self = circular;

    const unsafe: Record<string, unknown> = {};
    Object.defineProperty(unsafe, '__proto__', { enumerable: true, value: { polluted: true } });
    const plain = toPlainValues({ circular, unsafe });

    expect(plain.circular.self).toBeUndefined();
    expect(Object.keys(plain.unsafe)).toEqual([]);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(() => createForm({ initialValues: toPlainValues(circular) })).not.toThrow();
  });

  test('normalize applies at init, set, reset, and nested field writes alike', () => {
    const form = createForm<{ list: unknown[] }>({
      initialValues: { list: [new ProviderUserModel()] },
      normalize: toPlainValues,
    });

    expect(form.value.list[0]).toEqual({ email: 'a@example.com', id: 1, nested: { role: 'admin' } });

    form.set({ list: [new ProviderUserModel(2)] });
    expect(form.value.list[0]).toEqual({ email: 'a@example.com', id: 2, nested: { role: 'admin' } });

    form.reset({ list: [new ProviderUserModel(3)] });
    expect(form.value.list[0]).toEqual({ email: 'a@example.com', id: 3, nested: { role: 'admin' } });

    form.field('list').field(0).set(new ProviderUserModel(4));
    expect(form.value.list[0]).toEqual({ email: 'a@example.com', id: 4, nested: { role: 'admin' } });
  });

  test('un-normalized class instances still throw and name the offending path', () => {
    const form = createForm({ initialValues: { list: [] as unknown[] } });

    expect(() => form.reset({ list: [new ProviderUserModel()] })).toThrow(ForgeConfigError);
    expect(() => form.reset({ list: [new ProviderUserModel()] })).toThrow(/'list\[0\]'/);
    expect(() => createForm({ initialValues: { deep: { bad: new Map() } } })).toThrow(/'deep\.bad'/);
  });

  test('reports the path reached after a sibling branch was traversed', () => {
    expect(() => createForm({ initialValues: { a: { ok: 1 }, b: { bad: new Map() } } })).toThrow(/'b\.bad'/);
    expect(() => createForm({ initialValues: { list: [1, 2], tail: new Map() } })).toThrow(/'tail'/);
    expect(() => createForm({ initialValues: { rows: [[1], [new Map()]] } })).toThrow(/'rows\[1\]\[0\]'/);
  });

  test('toPlainValues applies its documented lossy conversions', () => {
    const plain = toPlainValues({ inf: Infinity, map: new Map([['x', 1]]), nan: Number.NaN, set: new Set([1]) });

    expect(plain).toEqual({ inf: undefined, map: {}, nan: undefined, set: {} });
    const sparse: (string | undefined)[] = ['a'];
    sparse[2] = 'c';
    expect(toPlainValues({ list: sparse })).toEqual({ list: ['a', 'c'] });
  });
});

describe('patch', () => {
  test('shallow-merges top-level keys with the same result as a spread set', () => {
    const form = createForm({ initialValues: { count: 1, name: 'ada' } });
    const spread = createForm({ initialValues: { count: 1, name: 'ada' } });

    form.patch({ count: 2 });
    spread.set((prev) => ({ ...prev, count: 2 }));

    expect(form.value).toEqual(spread.value);
    expect(form.value).toEqual({ count: 2, name: 'ada' });
  });

  test('accepts an updater and replaces nested values by identity without deep merge', () => {
    const form = createForm({ initialValues: { profile: { city: 'x', name: 'ada' }, tag: 'a' } });

    form.patch((prev) => ({ profile: { ...prev.profile, name: 'grace' } }));

    expect(form.value).toEqual({ profile: { city: 'x', name: 'grace' }, tag: 'a' });

    form.patch({ profile: { city: 'y', name: 'ada' } });
    expect(form.value.profile).toEqual({ city: 'y', name: 'ada' });
    expect(form.value.tag).toBe('a');
  });

  test('runs the normalize pipeline and clears issues like set', async () => {
    const form = createForm<{ count: number; name: string }>({
      initialValues: { count: 0, name: '' },
      validate: (values) => (values.name ? undefined : [{ message: 'Required', path: ['name'] }]),
    });
    const normalized = createForm<{ list: unknown[] }>({
      initialValues: { list: [] },
      normalize: toPlainValues,
    });

    await form.validate();
    expect(form.state.hasErrors).toBe(true);

    form.patch({ name: 'ada' });
    expect(form.state.issues).toBeUndefined();

    normalized.patch({ list: [new ProviderUserModel()] });
    expect(normalized.value.list[0]).toEqual({ email: 'a@example.com', id: 1, nested: { role: 'admin' } });
  });

  test('throws on a disposed form', () => {
    const form = createForm({ initialValues: { count: 1 } });
    form.dispose();

    expect(() => form.patch({ count: 2 })).toThrow(/patch/);
  });
});
