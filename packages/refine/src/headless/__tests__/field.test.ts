import { html } from '@vielzeug/ore';
import { mount } from '@vielzeug/ore/testing';
import { signal } from '@vielzeug/ripple';
import { describe, expect, it, vi } from 'vitest';

import { createCheckable } from '../checkable';
import { createChoiceField } from '../choice-field';
import { createCounterState, createErrorHelperState } from '../field-base';
import { createTextField } from '../text-field';

describe('field controls', () => {
  describe('createTextField()', () => {
    it('creates a text field handle with stable ids', async () => {
      let handle!: ReturnType<typeof createTextField>;

      await mount(
        () => {
          handle = createTextField({
            prefix: 'field',
            signal: new AbortController().signal,
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
      expect(handle.labelId).toMatch(/^label-/);
    });

    it('syncs its local value from the source signal', async () => {
      let handle!: ReturnType<typeof createTextField>;
      let value!: ReturnType<typeof signal<string>>;

      await mount(
        () => {
          value = signal('hello');
          handle = createTextField({
            prefix: 'test',
            signal: new AbortController().signal,
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
            signal: new AbortController().signal,
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
            signal: new AbortController().signal,
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
            signal: new AbortController().signal,
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

  describe('createTextField() wire() value sync (B3/C3)', () => {
    it('syncs value on input events even when only onChange is configured', () => {
      const ac = new AbortController();
      const prop = signal('');
      const handle = createTextField({ signal: ac.signal, value: prop });
      const input = document.createElement('input');

      input.value = 'typed';
      handle.wire(input, ac.signal);

      input.dispatchEvent(new Event('input', { bubbles: true }));

      expect(handle.value.value).toBe('typed');

      ac.abort();
    });

    it('syncs value on input events even when no callbacks are configured', () => {
      const ac = new AbortController();
      const prop = signal('');
      const handle = createTextField({ signal: ac.signal, value: prop });
      const input = document.createElement('input');

      input.value = 'hello';
      handle.wire(input, ac.signal);

      input.dispatchEvent(new Event('input', { bubbles: true }));

      expect(handle.value.value).toBe('hello');

      ac.abort();
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
            signal: new AbortController().signal,
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
            signal: new AbortController().signal,
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
      expect(handle.helperText.value).toBe('Hint');
    });

    it('removeValue removes a specific value without affecting others', async () => {
      let handle!: ReturnType<typeof createChoiceField>;

      await mount(
        () => {
          handle = createChoiceField({
            disabled: signal(false),
            multiple: signal(true),
            prefix: 'choice-remove',
            signal: new AbortController().signal,
            value: signal(['alpha', 'beta', 'gamma']),
          });

          return html`<div></div>`;
        },
        { componentOptions: { formAssociated: true } },
      );

      handle.removeValue('beta');
      expect(handle.selectedValues.value).toEqual(['alpha', 'gamma']);
    });

    it('clear resets selection to empty', async () => {
      let handle!: ReturnType<typeof createChoiceField>;

      await mount(
        () => {
          handle = createChoiceField({
            disabled: signal(false),
            multiple: signal(true),
            prefix: 'choice-clear',
            signal: new AbortController().signal,
            value: signal(['alpha', 'beta']),
          });

          return html`<div></div>`;
        },
        { componentOptions: { formAssociated: true } },
      );

      handle.clear();
      expect(handle.selectedValues.value).toEqual([]);
      expect(handle.formValue.value).toBe('');
    });

    it('deduplicates values in multiple mode', async () => {
      let handle!: ReturnType<typeof createChoiceField>;

      await mount(
        () => {
          handle = createChoiceField({
            disabled: signal(false),
            multiple: signal(true),
            prefix: 'choice-dedup',
            signal: new AbortController().signal,
            value: signal(['alpha']),
          });

          return html`<div></div>`;
        },
        { componentOptions: { formAssociated: true } },
      );

      handle.setValues(['alpha', 'alpha', 'beta']);
      expect(handle.selectedValues.value).toEqual(['alpha', 'beta']);
    });
  });

  describe('createErrorHelperState()', () => {
    it('derives helper/error text', () => {
      const error = signal<string | undefined>(undefined);
      const helper = signal<string | undefined>('Helper text');
      const state = createErrorHelperState({ error, helper });

      expect(state.value.helperText).toBe('Helper text');
      expect(state.value.errorText).toBe('');

      error.value = 'Error text';
      expect(state.value.errorText).toBe('Error text');
      expect(state.value.helperText).toBe('Helper text');
    });
  });

  describe('createCounterState()', () => {
    it('derives counter thresholds from value and maxLength', () => {
      const value = signal('123456789');
      const maxLength = signal<number | undefined>(10);
      const counter = createCounterState({ maxLength, value });

      expect(counter.value.counterNearLimit).toBe(true);
      expect(counter.value.counterAtLimit).toBe(false);
      expect(counter.value.counterText).toBe('9 / 10');
    });

    it('reports at-limit when value length equals maxLength', () => {
      const value = signal('1234567890');
      const maxLength = signal<number | undefined>(10);
      const counter = createCounterState({ maxLength, value });

      expect(counter.value.counterAtLimit).toBe(true);
    });
  });

  describe('createErrorHelperState() text mode', () => {
    it('prefers error text when error exists', () => {
      const state = createErrorHelperState({
        error: signal('Required'),
        helper: signal('Hint'),
      });

      expect(state.value.errorText).toBe('Required');
      expect(state.value.helperText).toBe('Hint');
    });

    it('provides helper text when no error exists', () => {
      const state = createErrorHelperState({
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
          signal: new AbortController().signal,
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
          signal: new AbortController().signal,
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
        const tf = createTextField({ prefix: 'test', signal: new AbortController().signal, value: signal('') });

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
            indeterminate,
            prefix: 'test',
            signal: new AbortController().signal,
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
      expect(handle.helperText.value).toBe('Check helper');
    });

    it('toggles checked state for standalone controls', async () => {
      let handle!: ReturnType<typeof createCheckable>;

      await mount(
        () => {
          handle = createCheckable({
            checked: signal(false),
            prefix: 'test',
            signal: new AbortController().signal,
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
            indeterminate: signal(true),
            prefix: 'test',
            signal: new AbortController().signal,
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
            prefix: 'test',
            signal: new AbortController().signal,
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
            indeterminate: signal(true),
            onToggle,
            prefix: 'test',
            signal: new AbortController().signal,
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

  describe('createField() — hasLabel override', () => {
    it('uses hasLabel signal to override label visibility when provided', async () => {
      let handle!: ReturnType<typeof createTextField>;
      const hasLabel = signal(true);

      await mount(
        () => {
          handle = createTextField({
            hasLabel,
            prefix: 'field',
            signal: new AbortController().signal,
            value: signal(''),
          });

          return html`<div></div>`;
        },
        { componentOptions: { formAssociated: true } },
      );

      // hasLabel=true → label visible, ariaLabelledBy non-null
      expect(handle.labelVisible.value).toBe(true);
      expect(handle.ariaLabelledBy.value).not.toBeNull();

      hasLabel.value = false;

      // hasLabel=false → label hidden, ariaLabelledBy null
      expect(handle.labelVisible.value).toBe(false);
      expect(handle.ariaLabelledBy.value).toBeNull();
    });

    it('hasLabel takes precedence over the label text signal', async () => {
      let handle!: ReturnType<typeof createTextField>;
      const hasLabel = signal(true);
      const label = signal<string | undefined>(undefined);

      await mount(
        () => {
          handle = createTextField({
            hasLabel,
            label,
            prefix: 'field',
            signal: new AbortController().signal,
            value: signal(''),
          });

          return html`<div></div>`;
        },
        { componentOptions: { formAssociated: true } },
      );

      // label prop is empty, but hasLabel override forces it visible
      expect(handle.labelVisible.value).toBe(true);

      hasLabel.value = false;
      expect(handle.labelVisible.value).toBe(false);
    });
  });

  describe('createTextField() signal option', () => {
    it('disposes the value-sync watcher when the signal is aborted', async () => {
      let handle!: ReturnType<typeof createTextField>;
      let externalValue!: ReturnType<typeof signal<string>>;
      const controller = new AbortController();

      await mount(
        () => {
          externalValue = signal('initial');
          handle = createTextField({
            prefix: 'signal-test',
            signal: controller.signal,
            value: externalValue,
          });

          return html`<div></div>`;
        },
        { componentOptions: { formAssociated: true } },
      );

      expect(handle.value.value).toBe('initial');

      // Abort the lifecycle — disposes the watcher
      controller.abort();

      // External value changes should no longer sync into the local handle
      externalValue.value = 'after-abort';
      expect(handle.value.value).toBe('initial');
    });
  });

  describe('createTextField() clear()', () => {
    it('resets value to empty and fires onInput + onChange with empty string', async () => {
      const inputSpy = vi.fn();
      const changeSpy = vi.fn();
      let handle!: ReturnType<typeof createTextField>;

      await mount(
        () => {
          handle = createTextField({
            onChange: changeSpy,
            onInput: inputSpy,
            prefix: 'clear-test',
            signal: new AbortController().signal,
            value: signal('hello'),
          });

          return html`<div></div>`;
        },
        { componentOptions: { formAssociated: true } },
      );

      handle.clear();

      expect(handle.value.value).toBe('');
      expect(inputSpy).toHaveBeenCalledOnce();
      expect(inputSpy).toHaveBeenCalledWith(expect.any(Event), '');
      expect(changeSpy).toHaveBeenCalledOnce();
      expect(changeSpy).toHaveBeenCalledWith(expect.any(Event), '');
    });
  });

  describe('createChoiceField() teardown', () => {
    it('disposes watch subscriptions when signal is aborted', async () => {
      let handle!: ReturnType<typeof createChoiceField>;
      let valueSignal!: ReturnType<typeof signal<string>>;
      const controller = new AbortController();

      await mount(
        () => {
          valueSignal = signal('a');
          handle = createChoiceField({
            prefix: 'choice-teardown',
            signal: controller.signal,
            value: valueSignal,
          });

          return html`<div></div>`;
        },
        { componentOptions: { formAssociated: true } },
      );

      expect(handle.selectedValue.value).toBe('a');

      controller.abort();

      // After abort, value changes should no longer sync into selectedValues
      valueSignal.value = 'b';
      expect(handle.selectedValue.value).toBe('a');
    });

    it('aborts cleanly without re-syncing after abort', async () => {
      let handle!: ReturnType<typeof createChoiceField>;
      let valueSignal!: ReturnType<typeof signal<string>>;
      const controller = new AbortController();

      await mount(
        () => {
          valueSignal = signal('x');
          handle = createChoiceField({
            prefix: 'choice-abort',
            signal: controller.signal,
            value: valueSignal,
          });

          return html`<div></div>`;
        },
        { componentOptions: { formAssociated: true } },
      );

      expect(handle.selectedValue.value).toBe('x');

      controller.abort();

      valueSignal.value = 'y';
      expect(handle.selectedValue.value).toBe('x');
    });
  });

  describe('createTextField() wire() — double-detach guard', () => {
    it('calling the returned detach function more than once is a no-op', async () => {
      const changeSpy = vi.fn();

      const fixture = await mount(() => {
        const tf = createTextField({
          onChange: changeSpy,
          prefix: 'test',
          signal: new AbortController().signal,
          value: signal(''),
        });

        return html`<input
          ref=${(el: HTMLInputElement | null) => {
            if (el) {
              const detach = tf.wire(el);

              // Call detach twice immediately to exercise the guard
              detach();
              detach();
            }
          }} />`;
      });

      const input = fixture.query('input') as HTMLInputElement;

      input.value = 'hi';
      input.dispatchEvent(new Event('change'));

      // After detach, no further change events should fire
      expect(changeSpy).not.toHaveBeenCalled();
    });

    it('AbortSignal detach + manual detach() does not double-remove listeners', async () => {
      const controller = new AbortController();
      const changeSpy = vi.fn();
      let detach!: () => void;

      const fixture = await mount(() => {
        const tf = createTextField({
          onChange: changeSpy,
          prefix: 'test',
          signal: new AbortController().signal,
          value: signal(''),
        });

        return html`<input
          ref=${(el: HTMLInputElement | null) => {
            if (el) {
              detach = tf.wire(el, controller.signal);
            }
          }} />`;
      });

      const input = fixture.query('input') as HTMLInputElement;

      // Abort cleans up via signal
      controller.abort();

      // Manual call should be a no-op (guarded)
      expect(() => detach()).not.toThrow();

      input.value = 'world';
      input.dispatchEvent(new Event('change'));

      // Listener was removed — no call
      expect(changeSpy).not.toHaveBeenCalled();
    });
  });
});
