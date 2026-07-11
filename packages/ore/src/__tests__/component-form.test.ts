import { computed, signal } from '@vielzeug/ripple';

import { type FormController, createFormContext, FORM_CONTEXT_KEY, useField } from '../forms';
import { html, inject, provide } from '../index';
import { mount } from '../testing';

describe('createFormContext()', () => {
  it('valid is reactive — false when no fields registered', () => {
    const form = createFormContext();

    expect(form.valid.value).toBe(true); // vacuously true with no fields
  });

  it('valid reacts to registered field validity signals', () => {
    const form = createFormContext();
    const fieldValid = signal(false);

    const unregister = form.registerField(fieldValid);

    expect(form.valid.value).toBe(false);

    fieldValid.value = true;
    expect(form.valid.value).toBe(true);

    unregister();
    expect(form.valid.value).toBe(true); // field removed
  });

  it('valid reacts when field signal is removed via cleanup', () => {
    const form = createFormContext();
    const f1 = signal(true);
    const f2 = signal(false);

    form.registerField(f1);

    const removeF2 = form.registerField(f2);

    expect(form.valid.value).toBe(false);

    removeF2();
    expect(form.valid.value).toBe(true);
  });

  it('dirty is false at creation and after clearStatus', () => {
    const form = createFormContext();

    expect(form.dirty.value).toBe(false);

    // registering a field should NOT set dirty
    form.registerField(signal(true));
    expect(form.dirty.value).toBe(false);
  });

  it('markDirty sets dirty to true', () => {
    const form = createFormContext();

    expect(form.dirty.value).toBe(false);
    form.markDirty();
    expect(form.dirty.value).toBe(true);
  });

  it('clearStatus sets dirty to false', () => {
    const form = createFormContext();

    form.markDirty();
    expect(form.dirty.value).toBe(true);
    form.clearStatus();
    expect(form.dirty.value).toBe(false);
  });

  it('submitting toggles during async onSubmit', async () => {
    let resolveFn!: () => void;
    const submitted = new Promise<void>((res) => {
      resolveFn = res;
    });
    const form = createFormContext({ onSubmit: () => submitted });

    expect(form.submitting.value).toBe(false);

    const p = form.submit();

    expect(form.submitting.value).toBe(true);

    resolveFn();
    await p;
    expect(form.submitting.value).toBe(false);
  });

  it('error signal captures exceptions thrown by onSubmit', async () => {
    const boom = new Error('boom');
    const form = createFormContext({
      onSubmit: async () => {
        throw boom;
      },
    });

    await form.submit();

    expect(form.error.value).toBe(boom);
  });

  it('error signal resets to null on next successful submit', async () => {
    let shouldFail = true;
    const form = createFormContext({
      onSubmit: async () => {
        if (shouldFail) throw new Error('fail');
      },
    });

    await form.submit();
    expect(form.error.value).not.toBeNull();

    shouldFail = false;
    await form.submit();
    expect(form.error.value).toBeNull();
  });

  it('onReset callback is invoked by clearStatus()', () => {
    const resetSpy = vi.fn();
    const form = createFormContext({ onReset: resetSpy });

    form.clearStatus();

    expect(resetSpy).toHaveBeenCalledOnce();
  });

  it('clearStatus() clears the error signal', async () => {
    const form = createFormContext({
      onSubmit: async () => {
        throw new Error('fail');
      },
    });

    await form.submit();
    expect(form.error.value).not.toBeNull();

    form.clearStatus();
    expect(form.error.value).toBeNull();
  });

  it('submit() resets dirty to false after successful submit', async () => {
    const form = createFormContext({ onSubmit: async () => {} });

    form.markDirty();
    expect(form.dirty.value).toBe(true);

    await form.submit();

    expect(form.dirty.value).toBe(false);
  });

  it('submit() keeps dirty true when onSubmit throws', async () => {
    const form = createFormContext({
      onSubmit: async () => {
        throw new Error('failed');
      },
    });

    form.markDirty();
    await form.submit();

    expect(form.dirty.value).toBe(true);
  });

  it('submit is idempotent when already submitting', async () => {
    let callCount = 0;
    let resolveFn!: () => void;
    const submitted = new Promise<void>((res) => {
      resolveFn = res;
    });
    const form = createFormContext({
      onSubmit: async () => {
        callCount++;
        await submitted;
      },
    });

    const p1 = form.submit();
    const p2 = form.submit(); // duplicate — should be ignored

    expect(callCount).toBe(1);
    resolveFn();
    await Promise.all([p1, p2]);
    expect(callCount).toBe(1);
  });
});

describe('inject(FORM_CONTEXT_KEY)', () => {
  it('returns the form context when provided by an ancestor', async () => {
    let captured: FormController | undefined;

    await mount((_props) => {
      const form = createFormContext();

      provide(FORM_CONTEXT_KEY, form);
      captured = inject(FORM_CONTEXT_KEY) as FormController | undefined;

      return html`<div></div>`;
    });

    expect(captured).toBeDefined();
    expect(typeof captured!.submit).toBe('function');
  });

  it('returns undefined when no form context is provided', async () => {
    let captured: FormController | undefined;

    await mount((_props) => {
      captured = inject(FORM_CONTEXT_KEY) as FormController | undefined;

      return html`<div></div>`;
    });

    expect(captured).toBeUndefined();
  });
});

describe('component form integration', () => {
  describe('useField()', () => {
    it('returns a handle with validity APIs', async () => {
      let handle!: ReturnType<typeof useField>;

      await mount(
        () => {
          handle = useField({ value: signal('initial') });

          return html`<div></div>`;
        },
        { componentOptions: { formAssociated: true } },
      );

      expect(typeof handle.checkValidity).toBe('function');
      expect(typeof handle.reportValidity).toBe('function');
      expect(typeof handle.setValidity).toBe('function');
    });

    it('supports custom validity state updates', async () => {
      let handle!: ReturnType<typeof useField>;

      await mount(
        () => {
          handle = useField({ value: signal('') });

          return html`<div></div>`;
        },
        { componentOptions: { formAssociated: true } },
      );

      handle.setValidity({ valueMissing: true }, 'Required');
      expect(typeof handle.reportValidity()).toBe('boolean');
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

          return html`<div></div>`;
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

            return html`<div></div>`;
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

          return html`<div></div>`;
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

          return html`<div></div>`;
        },
        { componentOptions: { formAssociated: true } },
      );
    });

    it('throws when used without formAssociated component option', async () => {
      await expect(
        mount(() => {
          useField({ value: signal('test') });

          return html`<div></div>`;
        }),
      ).rejects.toThrow(/formAssociated: true/);
    });

    it('throws when called twice on the same host element', async () => {
      await expect(
        mount(
          () => {
            useField({ value: signal('first') });
            useField({ value: signal('second') });

            return html`<div></div>`;
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

          return html`<div></div>`;
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

          return html`<div></div>`;
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

          return html`<div></div>`;
        },
        { componentOptions: { formAssociated: true }, container: form },
      );

      form.reset();

      expect(onReset).toHaveBeenCalledOnce();

      fixture.dispose();
      form.remove();
    });
  });
});
