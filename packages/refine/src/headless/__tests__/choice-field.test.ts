import { signal } from '@vielzeug/ripple';
import { afterEach, describe, expect, it } from 'vitest';

import { createChoiceField } from '../choice-field';

// ── Helpers ───────────────────────────────────────────────────────────────────

let controller: AbortController;

function makeOptions(overrides: Partial<Parameters<typeof createChoiceField>[0]> = {}) {
  controller = new AbortController();

  return {
    options: {
      disabled: signal(false),
      error: signal(''),
      helper: signal(''),
      prefix: 'choice',
      signal: controller.signal,
      value: signal<string | string[] | undefined>(''),
      ...overrides,
    },
  };
}

afterEach(() => {
  controller?.abort();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('createChoiceField', () => {
  describe('single-select mode', () => {
    it('selectValue() replaces the current selection', () => {
      const { options } = makeOptions({ value: signal('alpha') });
      const field = createChoiceField(options);

      expect(field.selectedValues.value).toEqual(['alpha']);
      expect(field.selectedValue.value).toBe('alpha');
      expect(field.formValue.value).toBe('alpha');

      field.selectValue('beta');

      expect(field.selectedValues.value).toEqual(['beta']);
      expect(field.selectedValue.value).toBe('beta');
      expect(field.formValue.value).toBe('beta');
    });
  });

  describe('multiple mode', () => {
    it('selectValue() adds without removing others', () => {
      const { options } = makeOptions({ multiple: signal(true), value: signal(['alpha']) });
      const field = createChoiceField(options);

      field.selectValue('beta');

      expect(field.selectedValues.value).toEqual(['alpha', 'beta']);
      expect(field.formValue.value).toBe('alpha,beta');
    });

    it('toggleValue() adds when absent and removes when present', () => {
      const { options } = makeOptions({ multiple: signal(true), value: signal(['alpha']) });
      const field = createChoiceField(options);

      field.toggleValue('beta');
      expect(field.selectedValues.value).toEqual(['alpha', 'beta']);

      field.toggleValue('alpha');
      expect(field.selectedValues.value).toEqual(['beta']);
    });

    it('removeValue() removes a specific value without affecting others', () => {
      const { options } = makeOptions({ multiple: signal(true), value: signal(['alpha', 'beta', 'gamma']) });
      const field = createChoiceField(options);

      field.removeValue('beta');

      expect(field.selectedValues.value).toEqual(['alpha', 'gamma']);
    });
  });

  describe('clear()', () => {
    it('empties the selection', () => {
      const { options } = makeOptions({ multiple: signal(true), value: signal(['alpha', 'beta']) });
      const field = createChoiceField(options);

      field.clear();

      expect(field.selectedValues.value).toEqual([]);
      expect(field.formValue.value).toBe('');
    });
  });

  describe('setValues() normalization', () => {
    it('dedupes and filters falsy/empty entries in multiple mode', () => {
      const { options } = makeOptions({ multiple: signal(true), value: signal([]) });
      const field = createChoiceField(options);

      field.setValues(['a', 'b', 'a', '', 'b']);

      expect(field.selectedValues.value).toEqual(['a', 'b']);
    });

    it('truncates to a single entry in single-select mode', () => {
      const { options } = makeOptions({ value: signal('') });
      const field = createChoiceField(options);

      field.setValues(['a', 'b', 'c']);

      expect(field.selectedValues.value).toEqual(['a']);
    });
  });

  describe('value parsing', () => {
    it('accepts a comma-separated string, trimming and dropping empty entries', () => {
      const { options } = makeOptions({ multiple: signal(true), value: signal('us, gb ,, de') });
      const field = createChoiceField(options);

      expect(field.selectedValues.value).toEqual(['us', 'gb', 'de']);
    });

    it('accepts a string[] and normalizes it identically', () => {
      const { options } = makeOptions({ multiple: signal(true), value: signal(['us', 'gb', '', 'de']) });
      const field = createChoiceField(options);

      expect(field.selectedValues.value).toEqual(['us', 'gb', 'de']);
    });
  });

  describe('reset()', () => {
    it('tracks a later programmatic change to options.value, as long as the user has not interacted yet', () => {
      const value = signal<string | string[] | undefined>('alpha');
      const { options } = makeOptions({ value });
      const field = createChoiceField(options);

      // Before any interaction, `options.value` hasn't been contaminated by selection-driven
      // attribute reflection yet — an async-loaded default arriving after mount is still a
      // legitimate "current default" to resync from.
      value.value = 'beta';
      expect(field.selectedValues.value).toEqual(['beta']);

      field.reset();
      expect(field.selectedValues.value).toEqual(['beta']);
    });

    it('freezes the reset target at the first interaction — later prop changes stop moving it', () => {
      const value = signal<string | string[] | undefined>('alpha');
      const { options } = makeOptions({ value });
      const field = createChoiceField(options);

      field.setValues(['gamma']); // first interaction — freezes the reset target at ['alpha']
      expect(field.selectedValues.value).toEqual(['gamma']);

      // A later prop change is still live-mirrored (the component reflects the current
      // selection back onto the attribute `value` is bound to), but it no longer moves the
      // frozen reset target.
      value.value = 'beta';
      expect(field.selectedValues.value).toEqual(['beta']);

      field.reset();
      expect(field.selectedValues.value).toEqual(['alpha']);
    });

    it('freezes the reset target on selectValue() interaction', () => {
      const value = signal<string | string[] | undefined>('alpha');
      const { options } = makeOptions({ value });
      const field = createChoiceField(options);

      field.selectValue('gamma');
      field.reset();

      expect(field.selectedValues.value).toEqual(['alpha']);
    });

    it('freezes the reset target on removeValue() interaction', () => {
      const value = signal<string | string[] | undefined>(['alpha', 'beta']);
      const { options } = makeOptions({ multiple: signal(true), value });
      const field = createChoiceField(options);

      field.removeValue('beta');
      field.reset();

      expect(field.selectedValues.value).toEqual(['alpha', 'beta']);
    });
  });

  describe('multiple toggling re-normalizes the current selection', () => {
    it('drops extra selections when multiple flips from true to false', () => {
      const multiple = signal(true);
      const { options } = makeOptions({ multiple, value: signal(['alpha', 'beta']) });
      const field = createChoiceField(options);

      expect(field.selectedValues.value).toEqual(['alpha', 'beta']);

      multiple.value = false;
      expect(field.selectedValues.value).toEqual(['alpha']);
    });

    it('re-expands from the raw prop when multiple flips from false to true', () => {
      const multiple = signal(false);
      const { options } = makeOptions({ multiple, value: signal('alpha,beta') });
      const field = createChoiceField(options);

      expect(field.selectedValues.value).toEqual(['alpha']);

      multiple.value = true;
      expect(field.selectedValues.value).toEqual(['alpha', 'beta']);
    });
  });

  describe('required / validity', () => {
    it('fails validity while required and selection is empty; passes once selected', () => {
      const required = signal(true);
      const value = signal<string | string[] | undefined>('');
      const { options } = makeOptions({ required, value });
      const field = createChoiceField(options);

      expect(field.validity.value).toEqual({ valueMissing: true });
      expect(field.validationMessage.value).toBe('Please make a selection.');

      field.selectValue('alpha');
      expect(field.validity.value).toBeNull();
      expect(field.validationMessage.value).toBe('');
    });

    it('is always valid when not required', () => {
      const { options } = makeOptions({ value: signal('') });
      const field = createChoiceField(options);

      expect(field.validity.value).toBeNull();
    });

    it('supports a custom requiredMessage', () => {
      const { options } = makeOptions({
        required: signal(true),
        requiredMessage: signal('Pick at least one option.'),
        value: signal(''),
      });
      const field = createChoiceField(options);

      expect(field.validationMessage.value).toBe('Pick at least one option.');
    });
  });

  describe('signal teardown', () => {
    it('aborting the signal tears down prop-sync reactivity', () => {
      const localController = new AbortController();
      const value = signal<string | string[] | undefined>('alpha');
      const { options } = makeOptions({ signal: localController.signal, value });
      const field = createChoiceField(options);

      expect(field.selectedValues.value).toEqual(['alpha']);

      localController.abort();

      // After teardown the field no longer follows the source.
      expect(() => {
        value.value = 'beta';
      }).not.toThrow();
      expect(field.selectedValues.value).toEqual(['alpha']);
    });

    it('aborting the signal tears down the multiple watcher too', () => {
      const localController = new AbortController();
      const multiple = signal(true);
      const value = signal<string | string[] | undefined>(['alpha', 'beta']);
      const { options } = makeOptions({ multiple, signal: localController.signal, value });
      const field = createChoiceField(options);

      expect(field.selectedValues.value).toEqual(['alpha', 'beta']);

      localController.abort();

      expect(() => {
        multiple.value = false;
      }).not.toThrow();
      // No longer re-normalized after teardown.
      expect(field.selectedValues.value).toEqual(['alpha', 'beta']);
    });
  });
});
