import { defineField, html, signal } from '../index';
import { mount } from '../testing';

describe('component form integration', () => {
  describe('defineField()', () => {
    it('returns a handle with validity APIs', async () => {
      let handle!: ReturnType<typeof defineField>;

      await mount(
        () => {
          handle = defineField({ value: signal('initial') });

          return html`<div></div>`;
        },
        { componentOptions: { formAssociated: true } },
      );

      expect(typeof handle.checkValidity).toBe('function');
      expect(typeof handle.reportValidity).toBe('function');
      expect(typeof handle.setValidity).toBe('function');
    });

    it('supports custom validity state updates', async () => {
      let handle!: ReturnType<typeof defineField>;

      await mount(
        () => {
          handle = defineField({ value: signal('') });

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
          defineField({
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

    it('throws when used without formAssociated component option', async () => {
      await expect(
        mount(() => {
          defineField({ value: signal('test') });

          return html`<div></div>`;
        }),
      ).rejects.toThrow(/formAssociated: true/);
    });
  });
});
