import { computed, signal } from '@vielzeug/ripple';

import { html, useField } from '../index';
import { mount } from '../testing';

describe('useField()', () => {
  it('returns a handle with validity APIs', async () => {
    let handle!: ReturnType<typeof useField>;

    await mount(
      () => {
        handle = useField({ value: signal('initial') });

        return html`
          <div></div>
        `;
      },
      { componentOptions: { formAssociated: true } },
    );

    expect(typeof handle.checkValidity).toBe('function');
    expect(typeof handle.reportValidity).toBe('function');
    expect(typeof handle.setCustomValidity).toBe('function');
    expect(handle.internals).toBeDefined();
  });

  it('supports custom validity state updates', async () => {
    let handle!: ReturnType<typeof useField>;

    await mount(
      () => {
        handle = useField({ value: signal('') });

        return html`
          <div></div>
        `;
      },
      { componentOptions: { formAssociated: true } },
    );

    handle.setCustomValidity('Required');
    expect(handle.internals.validity.valueMissing).toBe(false);
    expect(handle.internals.validity.customError).toBe(true);
    expect(handle.reportValidity()).toBe(false);

    handle.setCustomValidity('');
    expect(handle.reportValidity()).toBe(true);
  });

  it('invokes toFormValue with current signal value immediately', async () => {
    let transformCalled = false;

    await mount(
      () => {
        useField({
          toFormValue: (value) => {
            transformCalled = true;

            return `value:${value}`;
          },
          value: signal(42),
        });

        return html`
          <div></div>
        `;
      },
      { componentOptions: { formAssociated: true } },
    );

    expect(transformCalled).toBe(true);
  });

  it('emptyStringForNull: does not throw and is accepted as an option', async () => {
    await expect(
      mount(
        () => {
          const val = signal<string | null>(null);

          useField({ emptyStringForNull: true, value: val });

          return html`
            <div></div>
          `;
        },
        { componentOptions: { formAssociated: true } },
      ),
    ).resolves.toBeDefined();
  });

  it('emptyStringForNull: custom toFormValue still receives null when emptyStringForNull is true', async () => {
    const captured: Array<unknown> = [];

    await mount(
      () => {
        const val = signal<string | null>(null);

        useField({
          emptyStringForNull: true,
          toFormValue: (v) => {
            captured.push(v);

            return v == null ? '' : String(v);
          },
          value: val,
        });

        return html`
          <div></div>
        `;
      },
      { componentOptions: { formAssociated: true } },
    );

    expect(captured.at(-1)).toBeNull();
  });

  it('emptyStringForNull defaults to false — internals handle is accessible', async () => {
    await mount(
      () => {
        const val = signal<string | null>(null);
        const handle = useField({ value: val });

        expect(typeof handle.internals.setFormValue).toBe('function');

        return html`
          <div></div>
        `;
      },
      { componentOptions: { formAssociated: true } },
    );
  });

  it('throws when used without formAssociated component option', async () => {
    await expect(
      mount(() => {
        useField({ value: signal('test') });

        return html`
          <div></div>
        `;
      }),
    ).rejects.toThrow(/formAssociated: true/);
  });

  it('throws when called twice on the same host element', async () => {
    await expect(
      mount(
        () => {
          useField({ value: signal('first') });
          useField({ value: signal('second') });

          return html`
            <div></div>
          `;
        },
        { componentOptions: { formAssociated: true } },
      ),
    ).rejects.toThrow(/useField\(\) was already called/);
  });

  it('validity: checkValidity()/reportValidity() reflect the current validity signal', async () => {
    let handle!: ReturnType<typeof useField>;
    const required = signal(true);
    const value = signal('');
    const isBlank = () => value.value.trim() === '';

    await mount(
      () => {
        handle = useField({
          validationMessage: computed(() => (required.value && isBlank() ? 'Required.' : '')),
          validity: computed(() => (required.value && isBlank() ? { valueMissing: true } : null)),
          value,
        });

        return html`
          <div></div>
        `;
      },
      { componentOptions: { formAssociated: true } },
    );

    expect(handle.checkValidity()).toBe(false);
    expect(handle.reportValidity()).toBe(false);
    expect(handle.internals.validationMessage).toBe('Required.');

    // Reactive: filling in the value clears the validity signal without re-calling useField().
    value.value = 'hi';
    expect(handle.checkValidity()).toBe(true);
    expect(handle.internals.validationMessage).toBe('');

    // Reactive the other way too: blanking it out again while required re-fails it.
    value.value = '';
    required.value = false;
    expect(handle.checkValidity()).toBe(true);
  });

  it('validity: omitting the option (or passing null) means always valid', async () => {
    let handle!: ReturnType<typeof useField>;

    await mount(
      () => {
        handle = useField({ value: signal('') });

        return html`
          <div></div>
        `;
      },
      { componentOptions: { formAssociated: true } },
    );

    expect(handle.checkValidity()).toBe(true);
  });

  it('onReset: fires when the ancestor <form> resets', async () => {
    const form = document.createElement('form');

    document.body.appendChild(form);

    const onReset = vi.fn();

    const fixture = await mount(
      () => {
        useField({ onReset, value: signal('initial') });

        return html`
          <div></div>
        `;
      },
      { componentOptions: { formAssociated: true }, container: form },
    );

    form.reset();

    expect(onReset).toHaveBeenCalledOnce();

    fixture.dispose();
    form.remove();
  });
});
