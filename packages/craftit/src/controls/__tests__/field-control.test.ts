import { signal } from '@vielzeug/stateit';
import { describe, expect, it, vi } from 'vitest';

import {
  createChoiceFieldControl,
  createTextFieldControl,
  mountTextFieldLifecycle,
  createAssistiveState,
  createCheckableStateControl,
} from '../field-control';
import { createValidationControl } from '../internal/control-state';
import { html, onElement, ref } from '../../index';
import { mount } from '../../testing';

describe('field controls', () => {
  describe('createValidationControl()', () => {
    it('reports validity when trigger matches validation mode', () => {
      const reportValidity = vi.fn();
      const validateOn = signal<'blur' | 'change' | 'submit' | undefined>('change');
      const validation = createValidationControl(validateOn, { reportValidity });

      validation.triggerValidation('change');

      expect(reportValidity).toHaveBeenCalledTimes(1);
    });

    it('does not report validity when trigger does not match validation mode', () => {
      const reportValidity = vi.fn();
      const validateOn = signal<'blur' | 'change' | 'submit' | undefined>('submit');
      const validation = createValidationControl(validateOn, { reportValidity });

      validation.triggerValidation('blur');
      validation.triggerValidation('change');

      expect(reportValidity).not.toHaveBeenCalled();
    });

    it('does not report validity when validation mode is undefined', () => {
      const reportValidity = vi.fn();
      const validation = createValidationControl(undefined, { reportValidity });

      validation.triggerValidation('change');

      expect(reportValidity).not.toHaveBeenCalled();
    });
  });

  describe('createTextFieldControl()', () => {
    it('creates a text field handle with stable ids and refs', async () => {
      let handle!: ReturnType<typeof createTextFieldControl>;

      await mount({
        formAssociated: true,
        setup: () => {
          handle = createTextFieldControl({
            name: signal('email'),
            prefix: 'field',
            value: signal(''),
          });

          return html`<div></div>`;
        },
      });

      expect(handle.fieldId).toBe('field-email');
      expect(handle.errorId).toBe('error-field-email');
      expect(handle.helperId).toBe('helper-field-email');
      expect(handle.labelInsetId).toBe('label-field-email');
      expect(handle.labelOutsideId).toBe('label-field-email-outside');
      expect(handle.labelInsetRef).toBeDefined();
      expect(handle.labelOutsideRef).toBeDefined();
    });

    it('syncs its local value from the source signal', async () => {
      let handle!: ReturnType<typeof createTextFieldControl>;
      let value!: ReturnType<typeof signal<string>>;

      await mount({
        formAssociated: true,
        setup: () => {
          value = signal('hello');
          handle = createTextFieldControl({
            prefix: 'test',
            value,
          });

          return html`<div></div>`;
        },
      });

      expect(handle.value.value).toBe('hello');
      value.value = 'world';
      expect(handle.value.value).toBe('world');
    });

    it('normalizes undefined source values to an empty string', async () => {
      let handle!: ReturnType<typeof createTextFieldControl>;

      await mount({
        formAssociated: true,
        setup: () => {
          handle = createTextFieldControl({
            prefix: 'test',
            value: signal<string | undefined>(undefined),
          });

          return html`<div></div>`;
        },
      });

      expect(handle.value.value).toBe('');
    });

    it('keeps base ids stable while source state changes', async () => {
      let handle!: ReturnType<typeof createTextFieldControl>;
      let value!: ReturnType<typeof signal<string>>;

      await mount({
        formAssociated: true,
        setup: () => {
          value = signal('01234567');
          handle = createTextFieldControl({
            prefix: 'test',
            value,
          });

          return html`<div></div>`;
        },
      });

      expect(handle.fieldId).toBeTruthy();
      expect(handle.helperId).toBeTruthy();
      expect(handle.errorId).toBeTruthy();

      value.value = '';
      expect(handle.value.value).toBe('');
    });

    it('merges local disabled with context disabled and uses context validateOn by default', async () => {
      let handle!: ReturnType<typeof createTextFieldControl>;
      let contextDisabled!: ReturnType<typeof signal<boolean>>;

      await mount({
        formAssociated: true,
        setup: () => {
          contextDisabled = signal(false);

          handle = createTextFieldControl({
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
      });

      expect(handle.disabled.value).toBe(false);
      expect(handle.validateOn?.value).toBe('change');

      contextDisabled.value = true;
      expect(handle.disabled.value).toBe(true);
    });
  });

  describe('createChoiceFieldControl()', () => {
    it('normalizes controlled csv values and projects a form value', async () => {
      let handle!: ReturnType<typeof createChoiceFieldControl<string>>;

      await mount({
        formAssociated: true,
        setup: () => {
          handle = createChoiceFieldControl({
            getValue: (value) => value,
            mapControlledValue: (value) => value,
            multiple: signal(true),
            prefix: 'choice',
            value: signal('us, gb ,, de'),
          });

          return html`<div></div>`;
        },
      });

      expect(handle.selectedItems.value).toEqual(['us', 'gb', 'de']);
      expect(handle.selectedValues.value).toEqual(['us', 'gb', 'de']);
      expect(handle.formValue.value).toBe('us,gb,de');
    });

    it('supports single and multiple selection helpers for object-backed items', async () => {
      let handle!: ReturnType<typeof createChoiceFieldControl<{ label: string; value: string }>>;
      let multiple!: ReturnType<typeof signal<boolean>>;
      let contextDisabled!: ReturnType<typeof signal<boolean>>;

      await mount({
        formAssociated: true,
        setup: () => {
          multiple = signal(true);
          contextDisabled = signal(false);
          handle = createChoiceFieldControl({
            context: {
              disabled: contextDisabled,
              validateOn: signal<'blur' | 'change' | 'submit' | undefined>('blur'),
            },
            disabled: signal(false),
            error: signal<string | undefined>(''),
            getValue: (item) => item.value,
            helper: signal<string | undefined>('Hint'),
            mapControlledValue: (value) => ({ label: '', value }),
            multiple,
            prefix: 'choice',
            value: signal('alpha'),
          });

          return html`<div></div>`;
        },
      });

      expect(handle.selectedItems.value).toEqual([{ label: '', value: 'alpha' }]);
      expect(handle.validateOn?.value).toBe('blur');

      handle.selectItem({ label: 'Beta', value: 'beta' });
      expect(handle.selectedValues.value).toEqual(['alpha', 'beta']);

      handle.toggleItem({ label: 'Alpha', value: 'alpha' });
      expect(handle.selectedValues.value).toEqual(['beta']);

      multiple.value = false;
      handle.replaceSelectedItems([
        { label: 'One', value: 'one' },
        { label: 'Two', value: 'two' },
      ]);
      expect(handle.selectedValues.value).toEqual(['one']);

      contextDisabled.value = true;
      expect(handle.disabled.value).toBe(true);
      expect(handle.assistive.value.text).toBe('Hint');
    });
  });

  describe('createAssistiveState()', () => {
    it('derives helper/error visibility and counter thresholds', () => {
      const value = signal('123456789');
      const error = signal<string | undefined>(undefined);
      const helper = signal<string | undefined>('Helper text');
      const maxLength = signal<number | undefined>(10);
      const state = createAssistiveState({ error, helper, maxLength, value });

      expect(state.value.showHelper).toBe(true);
      expect(state.value.hasError).toBe(false);
      expect(state.value.counterNearLimit).toBe(true);
      expect(state.value.counterAtLimit).toBe(false);

      error.value = 'Error text';
      expect(state.value.hasError).toBe(true);
      expect(state.value.showHelper).toBe(false);
      expect(state.value.errorText).toBe('Error text');
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
    it('prefers error text and marks error mode when error exists', () => {
      const state = createAssistiveState({
        error: signal('Required'),
        helper: signal('Hint'),
      });

      expect(state.value.text).toBe('Required');
      expect(state.value.hidden).toBe(false);
      expect(state.value.isError).toBe(true);
    });

    it('falls back to helper text when no error exists', () => {
      const state = createAssistiveState({
        error: signal(''),
        helper: signal('Hint'),
      });

      expect(state.value.text).toBe('Hint');
      expect(state.value.hidden).toBe(false);
      expect(state.value.isError).toBe(false);
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

  describe('createCheckableStateControl()', () => {
    it('syncs checked and indeterminate state from source signals', async () => {
      let handle!: ReturnType<typeof createCheckableStateControl>;
      let checked!: ReturnType<typeof signal<boolean>>;
      let indeterminate!: ReturnType<typeof signal<boolean>>;

      await mount({
        formAssociated: true,
        setup: () => {
          checked = signal(true);
          indeterminate = signal(true);
          handle = createCheckableStateControl({
            checked,
            helper: signal<string | undefined>('Check helper'),
            indeterminate,
            prefix: 'test',
            value: signal('opt'),
          });

          return html`<div></div>`;
        },
      });

      expect(handle.checked.value).toBe(true);
      expect(handle.indeterminate.value).toBe(true);

      checked.value = false;
      indeterminate.value = false;
      expect(handle.checked.value).toBe(false);
      expect(handle.indeterminate.value).toBe(false);
      expect(handle.assistive.value.text).toBe('Check helper');
    });

    it('toggles checked state for standalone controls', async () => {
      let handle!: ReturnType<typeof createCheckableStateControl>;

      await mount({
        formAssociated: true,
        setup: () => {
          handle = createCheckableStateControl({
            checked: signal(false),
            prefix: 'test',
            value: signal('opt'),
          });

          return html`<div></div>`;
        },
      });

      handle.toggle(new Event('change'));
      expect(handle.checked.value).toBe(true);

      handle.toggle(new Event('change'));
      expect(handle.checked.value).toBe(false);
    });

    it('clears indeterminate before toggling when configured', async () => {
      let handle!: ReturnType<typeof createCheckableStateControl>;

      await mount({
        formAssociated: true,
        setup: () => {
          handle = createCheckableStateControl({
            checked: signal(false),
            clearIndeterminateFirst: true,
            indeterminate: signal(true),
            prefix: 'test',
            value: signal('opt'),
          });

          return html`<div></div>`;
        },
      });

      handle.toggle(new Event('change'));
      expect(handle.indeterminate.value).toBe(false);
      expect(handle.checked.value).toBe(false);
    });

    it('does not toggle when disabled', async () => {
      let handle!: ReturnType<typeof createCheckableStateControl>;

      await mount({
        formAssociated: true,
        setup: () => {
          handle = createCheckableStateControl({
            checked: signal(false),
            disabled: signal(true),
            prefix: 'test',
            value: signal('opt'),
          });

          return html`<div></div>`;
        },
      });

      handle.toggle(new Event('change'));
      expect(handle.checked.value).toBe(false);
    });

    it('delegates group toggles and forwards the toggle payload', async () => {
      let handle!: ReturnType<typeof createCheckableStateControl>;
      const toggle = vi.fn();
      const onToggle = vi.fn();

      await mount({
        formAssociated: true,
        setup: () => {
          handle = createCheckableStateControl({
            checked: signal(false),
            group: { toggle },
            indeterminate: signal(true),
            onToggle,
            prefix: 'test',
            value: signal('val'),
          });

          return html`<div></div>`;
        },
      });

      const event = new Event('change');

      handle.toggle(event);

      expect(toggle).toHaveBeenCalledWith('val', event);
      expect(handle.indeterminate.value).toBe(false);
      expect(onToggle).toHaveBeenCalledWith({
        checked: false,
        fieldValue: 'val',
        originalEvent: event,
      });
    });
  });
});
