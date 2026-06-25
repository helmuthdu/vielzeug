import { describe, expect, it } from 'vitest';

import {
  attrsToHtml,
  getAriaDescribedBy,
  getAriaLabel,
  getAriaLabelledBy,
  getAriaState,
  getRole,
  isAriaChecked,
  isAriaDisabled,
  isAriaExpanded,
  isAriaHidden,
  isAriaIndeterminate,
  isAriaInvalid,
  isAriaPressed,
  isAriaRequired,
  keyEvent,
  propsToAttrs,
  queryAllInShadow,
  queryInShadow,
} from '..';

// ── ARIA attribute helpers ────────────────────────────────────────────────────

describe('ARIA attribute helpers', () => {
  it('isAriaInvalid returns true for aria-invalid="true"', () => {
    const el = document.createElement('div');

    el.setAttribute('aria-invalid', 'true');
    expect(isAriaInvalid(el)).toBe(true);
    expect(isAriaInvalid(document.createElement('div'))).toBe(false);
  });

  it('isAriaDisabled returns true for aria-disabled="true"', () => {
    const el = document.createElement('div');

    el.setAttribute('aria-disabled', 'true');
    expect(isAriaDisabled(el)).toBe(true);
    expect(isAriaDisabled(document.createElement('div'))).toBe(false);
  });

  it('isAriaChecked / isAriaIndeterminate', () => {
    const el = document.createElement('div');

    el.setAttribute('aria-checked', 'true');
    expect(isAriaChecked(el)).toBe(true);
    expect(isAriaIndeterminate(el)).toBe(false);

    el.setAttribute('aria-checked', 'mixed');
    expect(isAriaChecked(el)).toBe(false);
    expect(isAriaIndeterminate(el)).toBe(true);
  });

  it('isAriaExpanded, isAriaPressed, isAriaRequired, isAriaHidden', () => {
    const el = document.createElement('div');

    el.setAttribute('aria-expanded', 'true');
    el.setAttribute('aria-pressed', 'true');
    el.setAttribute('aria-required', 'true');
    el.setAttribute('aria-hidden', 'true');

    expect(isAriaExpanded(el)).toBe(true);
    expect(isAriaPressed(el)).toBe(true);
    expect(isAriaRequired(el)).toBe(true);
    expect(isAriaHidden(el)).toBe(true);
  });

  it('getAriaLabel / getAriaLabelledBy / getAriaDescribedBy / getRole', () => {
    const el = document.createElement('div');

    expect(getAriaLabel(el)).toBeNull();
    expect(getAriaLabelledBy(el)).toBeNull();
    expect(getAriaDescribedBy(el)).toBeNull();
    expect(getRole(el)).toBeNull();

    el.setAttribute('aria-label', 'My label');
    el.setAttribute('aria-labelledby', 'label-id');
    el.setAttribute('aria-describedby', 'desc-id');
    el.setAttribute('role', 'button');

    expect(getAriaLabel(el)).toBe('My label');
    expect(getAriaLabelledBy(el)).toBe('label-id');
    expect(getAriaDescribedBy(el)).toBe('desc-id');
    expect(getRole(el)).toBe('button');
  });
});

// ── getAriaState ──────────────────────────────────────────────────────────────

describe('getAriaState()', () => {
  it('returns null for each property when attributes are absent', () => {
    const el = document.createElement('div');
    const state = getAriaState(el);

    expect(state.ariaLabel).toBeNull();
    expect(state.checked).toBeNull();
    expect(state.disabled).toBeNull();
    expect(state.expanded).toBeNull();
    expect(state.invalid).toBeNull();
    expect(state.labelledby).toBeNull();
    expect(state.required).toBeNull();
    expect(state.role).toBeNull();
  });

  it('returns attribute values when set', () => {
    const el = document.createElement('div');

    el.setAttribute('aria-label', 'Test');
    el.setAttribute('aria-checked', 'true');
    el.setAttribute('aria-disabled', 'true');
    el.setAttribute('role', 'checkbox');

    expect(getAriaState(el)).toMatchObject({
      ariaLabel: 'Test',
      checked: 'true',
      disabled: 'true',
      role: 'checkbox',
    });
  });
});

// ── queryInShadow / queryAllInShadow ──────────────────────────────────────────

describe('queryInShadow()', () => {
  it('returns null when element has no shadow root', () => {
    const el = document.createElement('div');

    expect(queryInShadow(el, 'button')).toBeNull();
  });
});

describe('queryAllInShadow()', () => {
  it('returns an empty array when element has no shadow root', () => {
    const el = document.createElement('div');

    expect(queryAllInShadow(el, 'button')).toEqual([]);
  });
});

// ── keyEvent ──────────────────────────────────────────────────────────────────

describe('keyEvent()', () => {
  it('creates a keyboard event with the given key', () => {
    const event = keyEvent('Enter');

    expect(event.type).toBe('keydown');
    expect(event.key).toBe('Enter');
    expect(event.bubbles).toBe(true);
    expect(event.cancelable).toBe(true);
  });

  it('merges custom init options', () => {
    const event = keyEvent('Escape', { ctrlKey: true });

    expect(event.key).toBe('Escape');
    expect(event.ctrlKey).toBe(true);
  });
});

// ── propsToAttrs ──────────────────────────────────────────────────────────────

describe('propsToAttrs()', () => {
  it('maps true to empty string (boolean attribute)', () => {
    expect(propsToAttrs({ disabled: true })).toEqual({ disabled: '' });
  });

  it('omits false, null, undefined values', () => {
    expect(propsToAttrs({ a: false, b: null, c: undefined })).toEqual({});
  });

  it('stringifies numbers and strings', () => {
    expect(propsToAttrs({ maxlength: 100, size: 'md' })).toEqual({ maxlength: '100', size: 'md' });
  });

  it('joins primitive arrays with commas', () => {
    expect(propsToAttrs({ tags: ['a', 'b', 'c'] })).toEqual({ tags: 'a,b,c' });
  });

  it('omits arrays of objects silently', () => {
    expect(propsToAttrs({ items: [{ id: 1 }] })).toEqual({});
  });

  it('returns an empty record for empty props', () => {
    expect(propsToAttrs({})).toEqual({});
    expect(propsToAttrs()).toEqual({});
  });
});

// ── attrsToHtml ───────────────────────────────────────────────────────────────

describe('attrsToHtml()', () => {
  it('renders a boolean attribute (empty value) without quotes', () => {
    expect(attrsToHtml({ disabled: '' })).toBe('disabled');
  });

  it('renders a string attribute with quoted value', () => {
    expect(attrsToHtml({ label: 'Name' })).toBe('label="Name"');
  });

  it('escapes double quotes in values', () => {
    expect(attrsToHtml({ title: 'Say "hello"' })).toBe('title="Say &quot;hello&quot;"');
  });

  it('joins multiple attributes with spaces', () => {
    const result = attrsToHtml({ disabled: '', label: 'Name' });

    expect(result).toBe('disabled label="Name"');
  });

  it('returns an empty string for an empty attrs object', () => {
    expect(attrsToHtml({})).toBe('');
  });
});
