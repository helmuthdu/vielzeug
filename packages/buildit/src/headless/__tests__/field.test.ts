import { html } from '@vielzeug/craftit';
import { mount } from '@vielzeug/craftit/testing';
import { signal } from '@vielzeug/stateit';
import { describe, expect, it, vi } from 'vitest';

import { createCheckable } from '../checkable';
import { createChoiceField } from '../choice-field';
import { createAssistiveState } from '../text-field';
import { createTextField } from '../text-field';

describe('field controls', () => {
  describe('createTextField()', () => {
    it('creates a text field handle with stable ids', async () => {
      let handle!: ReturnType<typeof createTextField>;

      await mount(
        () => {
          handle = createTextField({
            prefix: 'field',
            value: signal(''),
          });

          return html`<div></div>`;
        },
        { componentOptions: { formAssociated: true } },
      );

      // IDs are stable, non-empty strings with the right prefix
      expect(handle.fieldId).toMatch(/^field-/);
      expect(handle.errorId).toMatch(/^error-/);
      expect(handle.assistiveId).toMatch(/^helper-/);
      expect(handle.label.inset.id).toMatch(/^label-/);
      expect(handle.label.outside.id).toMatch(/^label-.*-outside$/);
    });

    it('syncs its local value from the source signal', async () => {
      let handle!: ReturnType<typeof createTextField>;
      let value!: ReturnType<typeof signal<string>>;

      await mount(
        () => {
          value = signal('hello');
          handle = createTextField({
            prefix: 'test',
            value,
          });

          return html`<div></div>`;
        },
        { componentOptions: { formAssociated: true } },
      );

      expect(handle.value.value).toBe('hello');
      value.value = 'world';
      expect(handle.value.value).toBe('world');
    });

    it('normalizes undefined source values to an empty string', async () => {
      let handle!: ReturnType<typeof createTextField>;

      await mount(
        () => {
          handle = createTextField({
            prefix: 'test',
            value: signal<string | undefined>(undefined),
          });

          return html`<div></div>`;
        },
        { componentOptions: { formAssociated: true } },
      );

      expect(handle.value.value).toBe('');
    });

    it('keeps base ids stable while source state changes', async () => {
      let handle!: ReturnType<typeof createTextField>;
      let value!: ReturnType<typeof signal<string>>;

      await mount(
        () => {
          value = signal('01234567');
          handle = createTextField({
            prefix: 'test',
            value,
          });

          return html`<div></div>`;
        },
        { componentOptions: { formAssociated: true } },
      );

      expect(handle.fieldId).toBeTruthy();
      expect(handle.assistiveId).toBeTruthy();
      expect(handle.errorId).toBeTruthy();

      value.value = '';
      expect(handle.value.value).toBe('');
    });

    it('reflects local disabled signal', async () => {
      let handle!: ReturnType<typeof createTextField>;
      let localDisabled!: ReturnType<typeof signal<boolean>>;

      await mount(
        () => {
          localDisabled = signal(false);

          handle = createTextField({
            disabled: localDisabled,
            prefix: 'model',
            value: signal('a'),
          });

          return html`<div></div>`;
        },
        { componentOptions: { formAssociated: true } },
      );

      expect(handle.disabled.value).toBe(false);

      localDisabled.value = true;
      expect(handle.disabled.value).toBe(true);
    });
  });

  describe('createChoiceField()', () => {
    it('normalizes controlled csv values and projects a form value', async () => {
      let handle!: ReturnType<typeof createChoiceField>;

      await mount(
        () => {
          handle = createChoiceField({
            multiple: signal(true),
            prefix: 'choice',
            value: signal('us, gb ,, de'),
          });

          return html`<div></div>`;
        },
        { componentOptions: { formAssociated: true } },
      );

      expect(handle.selectedValues.value).toEqual(['us', 'gb', 'de']);
      expect(handle.formValue.value).toBe('us,gb,de');
    });

    it('supports single and multiple selection helpers', async () => {
      let handle!: ReturnType<typeof createChoiceField>;
      let multiple!: ReturnType<typeof signal<boolean>>;
      let localDisabled!: ReturnType<typeof signal<boolean>>;

      await mount(
        () => {
          multiple = signal(true);
          localDisabled = signal(false);
          handle = createChoiceField({
            disabled: localDisabled,
            error: signal<string | undefined>(''),
            helper: signal<string | undefined>('Hint'),
            multiple,
            prefix: 'choice',
            value: signal('alpha'),
          });

          return html`<div></div>`;
        },
        { componentOptions: { formAssociated: true } },
      );

      expect(handle.selectedValues.value).toEqual(['alpha']);

      handle.selectValue('beta');
      expect(handle.selectedValues.value).toEqual(['alpha', 'beta']);

      handle.toggleValue('alpha');
      expect(handle.selectedValues.value).toEqual(['beta']);

      multiple.value = false;
      handle.setValues(['one', 'two']);
      expect(handle.selectedValues.value).toEqual(['one']);

      localDisabled.value = true;
      expect(handle.disabled.value).toBe(true);
      expect(handle.assistive.value.helperText).toBe('Hint');
    });
  });

  describe('createAssistiveState()', () => {
    it('derives helper/error visibility and counter thresholds', () => {
      const value = signal('123456789');
      const error = signal<string | undefined>(undefined);
      const helper = signal<string | undefined>('Helper text');
      const maxLength = signal<number | undefined>(10);
      const state = createAssistiveState({ error, helper, maxLength, value });

      expect(state.value.helperText).toBe('Helper text');
      expect(state.value.errorText).toBe('');
      expect(state.value.counterNearLimit).toBe(true);
      expect(state.value.counterAtLimit).toBe(false);

      error.value = 'Error text';
      expect(state.value.errorText).toBe('Error text');
      expect(state.value.helperText).toBe('Helper text');
    });

    it('accepts numeric maxlength values coming through attribute-style strings', () => {
      const value = signal('12345');
      const maxLength = signal<unknown>('10');
      const state = createAssistiveState({
        maxLength: maxLength as never,
        value,
      });

      expect(state.value.hasCounter).toBe(true);
      expect(state.value.counterText).toBe('5 / 10');
    });
  });

  describe('createAssistiveState() text mode', () => {
    it('prefers error text when error exists', () => {
      const state = createAssistiveState({
        error: signal('Required'),
        helper: signal('Hint'),
      });

      expect(state.value.errorText).toBe('Required');
      expect(state.value.helperText).toBe('Hint');
    });

    it('provides helper text when no error exists', () => {
      const state = createAssistiveState({
        error: signal(''),
        helper: signal('Hint'),
      });

      expect(state.value.errorText).toBe('');
      expect(state.value.helperText).toBe('Hint');
    });
  });

  describe('createTextField() native listeners', () => {
    it('fires onChange on change events when wire is used', async () => {
      const changeSpy = vi.fn();

      const fixture = await mount(() => {
        const tf = createTextField({
          onChange: changeSpy,
          prefix: 'test',
          value: signal(''),
        });

        return html`<input
          ref=${(el: HTMLInputElement | null) => {
            if (el) tf.wire(el);
          }} />`;
      });

      const input = fixture.query('input') as HTMLInputElement;

      input.value = 'hello';
      input.dispatchEvent(new Event('change'));

      expect(changeSpy).toHaveBeenCalledTimes(1);
      expect(changeSpy).toHaveBeenCalledWith(expect.any(Event), 'hello');
    });

    it('fires onFocus when the input receives focus via wire', async () => {
      const focusSpy = vi.fn();

      const fixture = await mount(() => {
        const tf = createTextField({
          onFocus: focusSpy,
          prefix: 'test',
          value: signal(''),
        });

        return html`<input
          ref=${(el: HTMLInputElement | null) => {
            if (el) tf.wire(el);
          }} />`;
      });

      const input = fixture.query('input') as HTMLInputElement;

      input.dispatchEvent(new FocusEvent('focus', { bubbles: true }));

      expect(focusSpy).toHaveBeenCalledTimes(1);
      expect(focusSpy).toHaveBeenCalledWith(expect.any(FocusEvent));
    });

    it('does not attach focus listener when onFocus is omitted', async () => {
      // Should not throw — absence of onFocus is a valid case.
      const fixture = await mount(() => {
        const tf = createTextField({ prefix: 'test', value: signal('') });

        return html`<input
          ref=${(el: HTMLInputElement | null) => {
            if (el) tf.wire(el);
          }} />`;
      });

      const input = fixture.query('input') as HTMLInputElement;

      expect(() => input.dispatchEvent(new FocusEvent('focus', { bubbles: true }))).not.toThrow();
    });
  });

  describe('createCheckable()', () => {
    it('syncs checked and indeterminate state from source signals', async () => {
      let handle!: ReturnType<typeof createCheckable>;
      let checked!: ReturnType<typeof signal<boolean>>;
      let indeterminate!: ReturnType<typeof signal<boolean>>;

      await mount(
        () => {
          checked = signal(true);
          indeterminate = signal(true);
          handle = createCheckable({
            checked,
            helper: signal<string | undefined>('Check helper'),
            host: document.createElement('div'),
            indeterminate,
            prefix: 'test',
            role: 'checkbox',
            value: signal('opt'),
          });

          return html`<div></div>`;
        },
        { componentOptions: { formAssociated: true } },
      );

      expect(handle.checked.value).toBe(true);
      expect(handle.indeterminate.value).toBe(true);

      checked.value = false;
      indeterminate.value = false;
      expect(handle.checked.value).toBe(false);
      expect(handle.indeterminate.value).toBe(false);
      expect(handle.assistive.value.helperText).toBe('Check helper');
    });

    it('toggles checked state for standalone controls', async () => {
      let handle!: ReturnType<typeof createCheckable>;

      await mount(
        () => {
          handle = createCheckable({
            checked: signal(false),
            host: document.createElement('div'),
            prefix: 'test',
            role: 'checkbox',
            value: signal('opt'),
          });

          return html`<div></div>`;
        },
        { componentOptions: { formAssociated: true } },
      );

      handle.toggle(new Event('change'));
      expect(handle.checked.value).toBe(true);

      handle.toggle(new Event('change'));
      expect(handle.checked.value).toBe(false);
    });

    it('clears indeterminate before toggling when configured', async () => {
      let handle!: ReturnType<typeof createCheckable>;

      await mount(
        () => {
          handle = createCheckable({
            checked: signal(false),
            clearIndeterminateFirst: true,
            host: document.createElement('div'),
            indeterminate: signal(true),
            prefix: 'test',
            role: 'checkbox',
            value: signal('opt'),
          });

          return html`<div></div>`;
        },
        { componentOptions: { formAssociated: true } },
      );

      handle.toggle(new Event('change'));
      expect(handle.indeterminate.value).toBe(false);
      expect(handle.checked.value).toBe(false);
    });

    it('does not toggle when disabled', async () => {
      let handle!: ReturnType<typeof createCheckable>;

      await mount(
        () => {
          handle = createCheckable({
            checked: signal(false),
            disabled: signal(true),
            host: document.createElement('div'),
            prefix: 'test',
            role: 'checkbox',
            value: signal('opt'),
          });

          return html`<div></div>`;
        },
        { componentOptions: { formAssociated: true } },
      );

      handle.toggle(new Event('change'));
      expect(handle.checked.value).toBe(false);
    });

    it('delegates group toggles and forwards the toggle payload', async () => {
      let handle!: ReturnType<typeof createCheckable>;
      const toggle = vi.fn();
      const onToggle = vi.fn();

      await mount(
        () => {
          handle = createCheckable({
            checked: signal(false),
            group: { toggle },
            host: document.createElement('div'),
            indeterminate: signal(true),
            onToggle,
            prefix: 'test',
            role: 'checkbox',
            value: signal('val'),
          });

          return html`<div></div>`;
        },
        { componentOptions: { formAssociated: true } },
      );

      const event = new Event('change');

      handle.toggle(event);

      expect(toggle).toHaveBeenCalledWith('val', event);
      expect(handle.indeterminate.value).toBe(false);
      expect(onToggle).toHaveBeenCalledWith({
        checked: false,
        originalEvent: event,
        value: 'val',
      });
    });
  });
});
