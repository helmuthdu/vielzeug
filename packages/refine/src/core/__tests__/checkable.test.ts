import { signal } from '@vielzeug/ripple';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createCheckable } from '../checkable';

// ── Helpers ───────────────────────────────────────────────────────────────────

let controller: AbortController;

function makeOptions(overrides: Partial<Parameters<typeof createCheckable>[0]> = {}) {
  controller = new AbortController();

  return {
    options: {
      checked: signal(false),
      disabled: signal(false),
      error: signal(''),
      helper: signal(''),
      prefix: 'check',
      signal: controller.signal,
      value: signal('on'),
      ...overrides,
    },
  };
}

afterEach(() => {
  controller?.abort();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('createCheckable', () => {
  describe('checked / indeterminate sync', () => {
    it('syncs checked from the source signal', () => {
      const src = signal(false);
      const { options } = makeOptions({ checked: src });
      const ctrl = createCheckable(options);

      expect(ctrl.checked.value).toBe(false);
      src.value = true;
      expect(ctrl.checked.value).toBe(true);
    });

    it('syncs indeterminate from the source signal', () => {
      const src = signal(false);
      const { options } = makeOptions({ indeterminate: src });
      const ctrl = createCheckable(options);

      expect(ctrl.indeterminate.value).toBe(false);
      src.value = true;
      expect(ctrl.indeterminate.value).toBe(true);
    });

    it('defaults indeterminate to false when not provided', () => {
      const { options } = makeOptions();
      const ctrl = createCheckable(options);

      expect(ctrl.indeterminate.value).toBe(false);
    });
  });

  describe('toggle()', () => {
    it('flips checked when not disabled', () => {
      const { options } = makeOptions({ checked: signal(false) });
      const ctrl = createCheckable(options);
      const event = new Event('click');

      ctrl.toggle(event);
      expect(ctrl.checked.value).toBe(true);
      ctrl.toggle(event);
      expect(ctrl.checked.value).toBe(false);
    });

    it('does nothing when disabled', () => {
      const { options } = makeOptions({ checked: signal(false), disabled: signal(true) });
      const ctrl = createCheckable(options);

      ctrl.toggle(new Event('click'));
      expect(ctrl.checked.value).toBe(false);
    });

    it('calls onToggle with the correct payload', () => {
      const onToggle = vi.fn();
      const { options } = makeOptions({ onToggle });
      const ctrl = createCheckable(options);
      const event = new Event('click');

      ctrl.toggle(event);
      expect(onToggle).toHaveBeenCalledOnce();
      expect(onToggle.mock.calls[0][0]).toMatchObject({ checked: true, originalEvent: event, value: 'on' });
    });

    it('delegates to group.toggle instead of flipping locally when in a group', () => {
      const groupToggle = vi.fn();
      const { options } = makeOptions({ group: { toggle: groupToggle } });
      const ctrl = createCheckable(options);

      ctrl.toggle(new Event('click'));
      expect(groupToggle).toHaveBeenCalledWith('on', expect.any(Event));
      // local checked stays false — group owns the state
      expect(ctrl.checked.value).toBe(false);
    });
  });

  describe('clearIndeterminateFirst', () => {
    it('clears indeterminate on first toggle without flipping checked', () => {
      const { options } = makeOptions({
        checked: signal(false),
        clearIndeterminateFirst: true,
        indeterminate: signal(true),
      });
      const ctrl = createCheckable(options);

      ctrl.toggle(new Event('click'));
      expect(ctrl.indeterminate.value).toBe(false);
      expect(ctrl.checked.value).toBe(false);
    });

    it('flips checked on the second toggle after clearing indeterminate', () => {
      const { options } = makeOptions({
        checked: signal(false),
        clearIndeterminateFirst: true,
        indeterminate: signal(true),
      });
      const ctrl = createCheckable(options);

      ctrl.toggle(new Event('click')); // clears indeterminate
      ctrl.toggle(new Event('click')); // now flips checked
      expect(ctrl.indeterminate.value).toBe(false);
      expect(ctrl.checked.value).toBe(true);
    });

    it('flips checked directly when clearIndeterminateFirst is false', () => {
      const { options } = makeOptions({
        checked: signal(false),
        clearIndeterminateFirst: false,
        indeterminate: signal(true),
      });
      const ctrl = createCheckable(options);

      ctrl.toggle(new Event('click'));
      expect(ctrl.checked.value).toBe(true);
      expect(ctrl.indeterminate.value).toBe(false);
    });
  });

  describe('checkableFormValue', () => {
    it('returns the value string when checked', () => {
      const { options } = makeOptions({ checked: signal(true), value: signal('yes') });
      const ctrl = createCheckable(options);

      expect(ctrl.checkableFormValue.value).toBe('yes');
    });

    it('returns null when unchecked', () => {
      const { options } = makeOptions({ checked: signal(false) });
      const ctrl = createCheckable(options);

      expect(ctrl.checkableFormValue.value).toBeNull();
    });

    it('returns null when indeterminate regardless of checked', () => {
      const { options } = makeOptions({ checked: signal(true), indeterminate: signal(true) });
      const ctrl = createCheckable(options);

      expect(ctrl.checkableFormValue.value).toBeNull();
    });
  });

  describe('required / validity', () => {
    it('fails validity while required and unchecked; passes once checked', () => {
      const required = signal(true);
      const checked = signal(false);
      const { options } = makeOptions({ checked, required });
      const ctrl = createCheckable(options);

      expect(ctrl.validity.value).toEqual({ valueMissing: true });
      expect(ctrl.validationMessage.value).toBe('This field is required.');

      checked.value = true;
      expect(ctrl.validity.value).toBeNull();
      expect(ctrl.validationMessage.value).toBe('');
    });

    it('treats indeterminate as unchecked for validity purposes', () => {
      const { options } = makeOptions({
        checked: signal(true),
        indeterminate: signal(true),
        required: signal(true),
      });
      const ctrl = createCheckable(options);

      expect(ctrl.validity.value).toEqual({ valueMissing: true });
    });

    it('is always valid when not required', () => {
      const { options } = makeOptions({ checked: signal(false) });
      const ctrl = createCheckable(options);

      expect(ctrl.validity.value).toBeNull();
    });

    it('supports a custom requiredMessage', () => {
      const { options } = makeOptions({
        checked: signal(false),
        required: signal(true),
        requiredMessage: signal('You must agree to continue.'),
      });
      const ctrl = createCheckable(options);

      expect(ctrl.validationMessage.value).toBe('You must agree to continue.');
    });
  });

  describe('reset()', () => {
    it('restores checked/indeterminate to the value captured when the control was created', () => {
      const { options } = makeOptions({ checked: signal(false) });
      const ctrl = createCheckable(options);

      ctrl.toggle(new Event('click'));
      expect(ctrl.checked.value).toBe(true);

      ctrl.reset();
      expect(ctrl.checked.value).toBe(false);
    });

    it('tracks a later programmatic change to the checked option, as long as the user has not interacted yet', () => {
      const checked = signal(false);
      const { options } = makeOptions({ checked });
      const ctrl = createCheckable(options);

      // Before any interaction, `options.checked` hasn't been contaminated by the click-driven
      // attribute reflection yet — an async-loaded default arriving after mount is still a
      // legitimate "current default" to resync from, same as `createTextField`.
      checked.value = true;
      expect(ctrl.checked.value).toBe(true);

      ctrl.reset();
      expect(ctrl.checked.value).toBe(true);
    });

    it('freezes the reset target at the first interaction — later programmatic changes stop moving it', () => {
      const checked = signal(false);
      const { options } = makeOptions({ checked });
      const ctrl = createCheckable(options);

      ctrl.toggle(new Event('click')); // first interaction — freezes the reset target at `false`

      // Unlike `createTextField`, changing the source option *after* interaction does not move
      // the reset target — `options.checked` gets rewritten by every click (via the host
      // attribute reflection), so it can't double as "the default to revert to" anymore.
      checked.value = true;
      expect(ctrl.checked.value).toBe(true);

      ctrl.reset();
      expect(ctrl.checked.value).toBe(false);
    });
  });

  describe('attachFormField() / triggerValidation()', () => {
    it('calls reportValidity on the attached field when validateOn matches', () => {
      const validateOn = signal<'change' | undefined>('change');
      const reportValidity = vi.fn();
      const { options } = makeOptions({ validateOn });
      const ctrl = createCheckable(options);

      ctrl.attachFormField({ reportValidity });
      ctrl.triggerValidation('change');
      expect(reportValidity).toHaveBeenCalledOnce();
    });

    it('does not call reportValidity when validateOn does not match', () => {
      const validateOn = signal<'blur' | undefined>('blur');
      const reportValidity = vi.fn();
      const { options } = makeOptions({ validateOn });
      const ctrl = createCheckable(options);

      ctrl.attachFormField({ reportValidity });
      ctrl.triggerValidation('change');
      expect(reportValidity).not.toHaveBeenCalled();
    });

    it('warns and does not throw when triggerValidation runs before attachFormField was ever called', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const validateOn = signal<'change' | undefined>('change');
      const { options } = makeOptions({ validateOn });
      const ctrl = createCheckable(options);

      expect(() => ctrl.triggerValidation('change')).not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[@vielzeug/refine]'));
      warnSpy.mockRestore();
    });
  });

  describe('handleClick()', () => {
    it('returns false and does nothing when disabled', () => {
      const onToggle = vi.fn();
      const { options } = makeOptions({ disabled: signal(true), onToggle });
      const ctrl = createCheckable(options);

      const result = ctrl.handleClick(new MouseEvent('click'));

      expect(result).toBe(false);
      expect(onToggle).not.toHaveBeenCalled();
    });

    it('calls toggle and returns true when enabled', () => {
      const onToggle = vi.fn();
      const { options } = makeOptions({ onToggle });
      const ctrl = createCheckable(options);

      const result = ctrl.handleClick(new MouseEvent('click'));

      expect(result).toBe(true);
      expect(onToggle).toHaveBeenCalledOnce();
    });
  });

  describe('handleKeydown()', () => {
    it('triggers toggle on Space key', () => {
      const onToggle = vi.fn();
      const { options } = makeOptions({ onToggle });
      const ctrl = createCheckable(options);

      ctrl.handleKeydown(new KeyboardEvent('keydown', { key: ' ' }));
      expect(onToggle).toHaveBeenCalledOnce();
    });

    it('triggers toggle on Enter key', () => {
      const onToggle = vi.fn();
      const { options } = makeOptions({ onToggle });
      const ctrl = createCheckable(options);

      ctrl.handleKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(onToggle).toHaveBeenCalledOnce();
    });

    it('does nothing for other keys', () => {
      const onToggle = vi.fn();
      const { options } = makeOptions({ onToggle });
      const ctrl = createCheckable(options);

      ctrl.handleKeydown(new KeyboardEvent('keydown', { key: 'Tab' }));
      expect(onToggle).not.toHaveBeenCalled();
    });

    it('returns false and does nothing when disabled', () => {
      const onToggle = vi.fn();
      const { options } = makeOptions({ disabled: signal(true), onToggle });
      const ctrl = createCheckable(options);

      const result = ctrl.handleKeydown(new KeyboardEvent('keydown', { key: ' ' }));

      expect(result).toBe(false);
      expect(onToggle).not.toHaveBeenCalled();
    });
  });

  describe('a11y ids and signals', () => {
    it('exposes a stable assistiveId string', () => {
      const { options } = makeOptions();
      const ctrl = createCheckable(options);

      expect(typeof ctrl.assistiveId).toBe('string');
      expect(ctrl.assistiveId.length).toBeGreaterThan(0);
    });

    it('exposes a stable labelId string', () => {
      const { options } = makeOptions();
      const ctrl = createCheckable(options);

      expect(typeof ctrl.labelId).toBe('string');
      expect(ctrl.labelId.length).toBeGreaterThan(0);
    });

    it('disabled signal reflects correctly when disabled', () => {
      const disabled = signal(true);
      const { options } = makeOptions({ disabled });
      const ctrl = createCheckable(options);

      expect(ctrl.disabled.value).toBe(true);
    });

    it('disabled signal reflects correctly when not disabled', () => {
      const disabled = signal(false);
      const { options } = makeOptions({ disabled });
      const ctrl = createCheckable(options);

      expect(ctrl.disabled.value).toBe(false);
    });

    it('disabled signal updates reactively', () => {
      const disabled = signal(false);
      const { options } = makeOptions({ disabled });
      const ctrl = createCheckable(options);

      expect(ctrl.disabled.value).toBe(false);
      disabled.value = true;
      expect(ctrl.disabled.value).toBe(true);
      disabled.value = false;
      expect(ctrl.disabled.value).toBe(false);
    });

    it('errorText signal reflects error text', () => {
      const error = signal('Required');
      const { options } = makeOptions({ error });
      const ctrl = createCheckable(options);

      expect(ctrl.errorText.value).toBe('Required');
    });
  });

  describe('signal teardown', () => {
    it('aborting the signal tears down prop-sync reactivity', () => {
      const localController = new AbortController();
      const srcChecked = signal(false);
      const { options } = makeOptions({ checked: srcChecked, signal: localController.signal });
      const ctrl = createCheckable(options);

      expect(ctrl.checked.value).toBe(false);

      localController.abort();

      // After teardown the internal synced signal no longer follows the source.
      srcChecked.value = true;
      expect(ctrl.checked.value).toBe(false);
    });
  });
});
