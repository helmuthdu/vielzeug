import { afterEach, describe, expect, it } from 'vitest';

import { elementDirection } from '../direction';

describe('elementDirection()', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('dir');
  });

  it('returns "ltr" for null', () => {
    expect(elementDirection(null)).toBe('ltr');
  });

  it('defaults to "ltr" when no dir attribute is present anywhere', () => {
    const el = document.createElement('div');

    document.body.appendChild(el);

    expect(elementDirection(el)).toBe('ltr');
  });

  it('reads an explicit dir="rtl" on the element itself', () => {
    const el = document.createElement('div');

    el.setAttribute('dir', 'rtl');
    document.body.appendChild(el);

    expect(elementDirection(el)).toBe('rtl');
  });

  it('inherits dir="rtl" from an ancestor', () => {
    const wrapper = document.createElement('div');
    const el = document.createElement('span');

    wrapper.setAttribute('dir', 'rtl');
    wrapper.appendChild(el);
    document.body.appendChild(wrapper);

    expect(elementDirection(el)).toBe('rtl');
  });

  it('inherits dir="rtl" set on <html>', () => {
    const el = document.createElement('div');

    document.body.appendChild(el);
    document.documentElement.setAttribute('dir', 'rtl');

    expect(elementDirection(el)).toBe('rtl');
  });

  it('the closest explicit dir ancestor wins over a farther one', () => {
    const outer = document.createElement('div');
    const inner = document.createElement('div');
    const el = document.createElement('span');

    outer.setAttribute('dir', 'rtl');
    inner.setAttribute('dir', 'ltr');
    inner.appendChild(el);
    outer.appendChild(inner);
    document.body.appendChild(outer);

    expect(elementDirection(el)).toBe('ltr');
  });

  it('falls back to computed style direction when no dir attribute is found', () => {
    const el = document.createElement('div');

    el.style.direction = 'rtl';
    document.body.appendChild(el);

    expect(elementDirection(el)).toBe('rtl');
  });
});
