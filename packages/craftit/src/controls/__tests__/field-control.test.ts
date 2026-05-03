import { signal } from '@vielzeug/stateit';
import { describe, expect, it, vi } from 'vitest';

import { html, onElement, ref } from '../../index';
import { mount } from '../../testing';
import { createCheckableState } from '../checkable-control';
import { createChoiceField } from '../choice-field-control';
import { createAssistiveState, mountTextFieldLifecycle } from '../field-control';
import { createTextField } from '../text-field-control';

describe('field controls', () => {
  describe('createTextField()', () => {
    it('creates a text field handle with stable ids', async () => {
      let handle!: ReturnType<typeof createTextField>;

      await mount(
        () => {
          handle = createTextField({
            name: signal('email'),
            prefix: 'field',
            value: signal(''),
          });

          return html`<div></div>`;
        },
        { componentOptions: { formAssociated: true } },
      );

      expect(handle.fieldId).toBe('field-email');
      expect(handle.errorId).toBe('error-field-email');
      expect(handle.helperId).toBe('helper-field-email');
      expect(handle.labelInsetId).toBe('label-field-email');
      expect(handle.labelOutsideId).toBe('label-field-email-outside');
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
      expect(handle.helperId).toBeTruthy();
      expect(handle.errorId).toBeTruthy();

      value.value = '';
      expect(handle.value.value).toBe('');
    });

    it('merges local disabled with context disabled', async () => {
      let handle!: ReturnType<typeof createTextField>;
      let contextDisabled!: ReturnType<typeof signal<boolean>>;

      await mount(
        () => {
          contextDisabled = signal(false);

          handle = createTextField({
            context: {
              disabled: contextDisabled,
              validateOn: signal<'blur' | 'change' | 'submit' | undefined>('change'),
            },
            disabled: signal(false),
            prefix: 'model',
            value: signal('a'),
          });

          return html`<div></div>`;
        },
        { componentOptions: { formAssociated: true } },
      );

      expect(handle.disabled.value).toBe(false);

      contextDisabled.value = true;
      expect(handle.disabled.value).toBe(true);
    });

    it('throws without formAssociated', async () => {
      await expect(
        mount(() => {
          createTextField({
            prefix: 'standalone',
            validateOn: signal<'blur' | 'change' | 'submit' | undefined>('change'),
            value: signal('initial'),
          });

          return html`<div></div>`;
        }),
      ).rejects.toThrow('formAssociated: true');
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
      let contextDisabled!: ReturnType<typeof signal<boolean>>;

      await mount(
        () => {
          multiple = signal(true);
          contextDisabled = signal(false);
          handle = createChoiceField({
            context: {
              disabled: contextDisabled,
              validateOn: signal<'blur' | 'change' | 'submit' | undefined>('blur'),
            },
            disabled: signal(false),
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

      contextDisabled.value = true;
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

  describe('mountTextFieldLifecycle()', () => {
    it('wires input/change/blur and validation triggers in one call', async () => {
      const inputSpy = vi.fn();
      const changeSpy = vi.fn();
      const blurSpy = vi.fn();
      const validateSpy = vi.fn();

      const fixture = await mount(() => {
        const inputRef = ref<HTMLInputElement>();

        onElement(inputRef, (el) => {
          mountTextFieldLifecycle({
            element: el,
            onBlur: blurSpy,
            onChange: changeSpy,
            onInput: inputSpy,
            triggerValidation: validateSpy,
          });
        });

        return html`<input ref=${inputRef} />`;
      });

      const input = fixture.query('input') as HTMLInputElement;

      input.value = 'hello';
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('change'));
      input.dispatchEvent(new FocusEvent('blur'));

      expect(inputSpy).toHaveBeenCalledTimes(1);
      expect(changeSpy).toHaveBeenCalledTimes(1);
      expect(blurSpy).toHaveBeenCalledTimes(1);
      expect(validateSpy).toHaveBeenCalledWith('change');
      expect(validateSpy).toHaveBeenCalledWith('blur');
    });
  });

  describe('createCheckableState()', () => {
    it('syncs checked and indeterminate state from source signals', async () => {
      let handle!: ReturnType<typeof createCheckableState>;
      let checked!: ReturnType<typeof signal<boolean>>;
      let indeterminate!: ReturnType<typeof signal<boolean>>;

      await mount(
        () => {
          checked = signal(true);
          indeterminate = signal(true);
          handle = createCheckableState({
            checked,
            helper: signal<string | undefined>('Check helper'),
            indeterminate,
            prefix: 'test',
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
      let handle!: ReturnType<typeof createCheckableState>;

      await mount(
        () => {
          handle = createCheckableState({
            checked: signal(false),
            prefix: 'test',
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
      let handle!: ReturnType<typeof createCheckableState>;

      await mount(
        () => {
          handle = createCheckableState({
            checked: signal(false),
            clearIndeterminateFirst: true,
            indeterminate: signal(true),
            prefix: 'test',
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
      let handle!: ReturnType<typeof createCheckableState>;

      await mount(
        () => {
          handle = createCheckableState({
            checked: signal(false),
            disabled: signal(true),
            prefix: 'test',
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
      let handle!: ReturnType<typeof createCheckableState>;
      const toggle = vi.fn();
      const onToggle = vi.fn();

      await mount(
        () => {
          handle = createCheckableState({
            checked: signal(false),
            group: { toggle },
            indeterminate: signal(true),
            onToggle,
            prefix: 'test',
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
