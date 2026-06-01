import { createForm } from '../../index';
import type { Form } from '../../types';

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

  test.each([
    ['insert', (form: Form<Record<string, unknown>>) => form.array('x').insert(0, 'v')],
    ['move', (form: Form<Record<string, unknown>>) => form.array('x').move(0, 1)],
    ['remove', (form: Form<Record<string, unknown>>) => form.array('x').remove(0)],
    ['replace', (form: Form<Record<string, unknown>>) => form.array('x').replace(0, 'v')],
    ['swap', (form: Form<Record<string, unknown>>) => form.array('x').swap(0, 1)],
  ])('%s is a no-op when target field is not an array', (_, operation) => {
    const form = createForm({ defaultValues: { x: 1 } }) as unknown as Form<Record<string, unknown>>;

    expect(() => operation(form)).not.toThrow();
    expect(form.get('x')).toBe(1);
  });
});
