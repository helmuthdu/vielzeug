import { bindField } from '../dom';
import { createForm } from '../index';

describe('DOM field binding', () => {
  test('reads input events, marks blur, writes external updates, and cleans up', () => {
    const form = createForm({ initialValues: { email: '' } });
    const input = document.createElement('input');
    const writes: string[] = [];
    const dispose = bindField(input, form.field('email'), {
      read: (element) => element.value,
      write: (_element, value) => writes.push(value),
    });

    input.value = 'ada@example.com';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));

    expect(form.value.email).toBe('ada@example.com');
    expect(form.field('email').touched).toBe(true);

    form.field('email').set('grace@example.com');
    expect(writes).toEqual(['', 'grace@example.com']);

    dispose();
    input.value = 'ignored@example.com';
    input.dispatchEvent(new Event('input'));
    form.field('email').set('ignored@example.com');

    expect(form.value.email).toBe('ignored@example.com');
    expect(writes).toEqual(['', 'grace@example.com']);
  });
});
