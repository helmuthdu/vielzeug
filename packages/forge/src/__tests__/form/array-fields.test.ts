import type { Form } from '../../types';

import { createForm } from '../../index';

describe('array field helpers', () => {
  test('append adds an item to existing array', () => {
    const form = createForm({ defaultValues: { tags: ['a', 'b'] } });

    form.array('tags').append('c');

    expect(form.get('tags')).toEqual(['a', 'b', 'c']);
  });

  test('prepend creates array when field is unset', () => {
    const form = createForm<Record<string, unknown>>({});

    form.array('tags').prepend('first');

    expect(form.get('tags')).toEqual(['first']);
  });

  test('insert adds item at specific index', () => {
    const form = createForm({ defaultValues: { tags: ['a', 'c'] } });

    form.array('tags').insert(1, 'b');

    expect(form.get('tags')).toEqual(['a', 'b', 'c']);
  });

  test('remove deletes an item by index', () => {
    const form = createForm({ defaultValues: { tags: ['a', 'b', 'c'] } });

    form.array('tags').remove(1);

    expect(form.get('tags')).toEqual(['a', 'c']);
  });

  test('move reorders array values', () => {
    const form = createForm({ defaultValues: { tags: ['a', 'b', 'c', 'd'] } });

    form.array('tags').move(0, 2);

    expect(form.get('tags')).toEqual(['b', 'c', 'a', 'd']);
  });

  test('swap exchanges two values', () => {
    const form = createForm({ defaultValues: { tags: ['a', 'b', 'c'] } });

    form.array('tags').swap(0, 2);

    expect(form.get('tags')).toEqual(['c', 'b', 'a']);
  });

  test('replace updates value at index', () => {
    const form = createForm({ defaultValues: { tags: ['a', 'b', 'c'] } });

    form.array('tags').replace(1, 'z');

    expect(form.get('tags')).toEqual(['a', 'z', 'c']);
  });

  test('append on undefined field creates [value]', () => {
    const form = createForm({ defaultValues: {} as { tags?: string[] } });

    form.array('tags').append('first');

    expect(form.get('tags')).toEqual(['first']);
  });

  const arrayOps: [string, (form: Form<Record<string, unknown>>) => void][] = [
    ['append', (form) => form.array('x').append('v')],
    ['insert', (form) => form.array('x').insert(0, 'v')],
    ['move', (form) => form.array('x').move(0, 1)],
    ['prepend', (form) => form.array('x').prepend('v')],
    ['remove', (form) => form.array('x').remove(0)],
    ['replace', (form) => form.array('x').replace(0, 'v')],
    ['swap', (form) => form.array('x').swap(0, 1)],
  ];

  test.each(arrayOps)('%s is a no-op when target field is not an array', (_, operation) => {
    const form = createForm({ defaultValues: { x: 1 } }) as unknown as Form<Record<string, unknown>>;

    expect(() => operation(form)).not.toThrow();
    expect(form.get('x')).toBe(1);
  });

  test.each(arrayOps)('%s is a no-op when target field is null', (_, operation) => {
    const form = createForm({ defaultValues: { x: null } }) as unknown as Form<Record<string, unknown>>;

    expect(() => operation(form)).not.toThrow();
    expect(form.get('x')).toBeNull();
  });
});

describe('array field helpers — boundary indices', () => {
  test('insert at an index beyond array length appends at the end (native splice semantics)', () => {
    const form = createForm({ defaultValues: { tags: ['a', 'b'] } });

    form.array('tags').insert(10, 'z');

    expect(form.get('tags')).toEqual(['a', 'b', 'z']);
  });

  test('insert at a negative index inserts relative to the end (native splice semantics)', () => {
    const form = createForm({ defaultValues: { tags: ['a', 'b'] } });

    form.array('tags').insert(-1, 'z');

    expect(form.get('tags')).toEqual(['a', 'z', 'b']);
  });

  test('remove with an out-of-range index is a no-op', () => {
    const form = createForm({ defaultValues: { tags: ['a', 'b'] } });

    form.array('tags').remove(10);

    expect(form.get('tags')).toEqual(['a', 'b']);
  });

  test('move with identical from/to indices leaves the array unchanged', () => {
    const form = createForm({ defaultValues: { tags: ['a', 'b', 'c'] } });

    form.array('tags').move(1, 1);

    expect(form.get('tags')).toEqual(['a', 'b', 'c']);
  });

  test('swap with identical indices leaves the array unchanged', () => {
    const form = createForm({ defaultValues: { tags: ['a', 'b', 'c'] } });

    form.array('tags').swap(1, 1);

    expect(form.get('tags')).toEqual(['a', 'b', 'c']);
  });
});
