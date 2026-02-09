/** biome-ignore-all lint/suspicious/noExplicitAny: - */
import { createForm } from './formit';

describe('formit', () => {
  test('initial values and getters', () => {
    const f = createForm<{ a: number; b: string }>({ initialValues: { a: 1, b: 'x' } });
    expect(f.getValue('a')).toBe(1);
    expect(f.getValues()).toEqual({ a: 1, b: 'x' });
  });

  test('setValue and subscribers', () => {
    const f = createForm<{ t?: string }>({ initialValues: { t: 'v1' } });
    const states: any[] = [];
    const unsub = f.subscribe((s) => states.push(s));
    f.setValue('t', 'v2');
    return Promise.resolve().then(() => {
      expect(f.getValue('t')).toBe('v2');
      expect(states.length).toBeGreaterThan(0);
      unsub();
    });
  });

  test('nested values and arrays via setValue', () => {
    const f = createForm<{ users?: Array<{ name: string }> }>({ initialValues: { users: [{ name: 'A' }] } });
    expect(f.getValue('users[0].name')).toBe('A');
    f.setValue('users[0].name', 'B');
    expect(f.getValue('users[0].name')).toBe('B');
    // replace whole array
    f.setValue('users', [{ name: 'X' }]);
    expect(f.getValue('users[0].name')).toBe('X');
  });

  test('validation and submit', async () => {
    const f = createForm<{ name?: string }>({
      fields: { name: { validators: (v) => (!v ? 'required' : undefined) } },
    });
    await expect(f.submit(async () => ({ ok: true }))).rejects.toMatchObject({ type: 'validation' });
    f.setValue('name', 'OK');
    await expect(f.submit(async (values) => ({ ok: true, values }))).resolves.toEqual({
      ok: true,
      values: { name: 'OK' },
    });
  });

  test('subscribeField and bind', () => {
    const f = createForm<{ x?: string }>({ initialValues: { x: 'a' } });
    const rec: any[] = [];
    const unsub = f.subscribeField('x', (s) => rec.push(s));
    const b = f.bind('x');
    b.set('z');
    expect(f.getValue('x')).toBe('z');
    b.onChange({ target: { value: 'q' } });
    expect(f.getValue('x')).toBe('q');
    unsub();
  });
});
