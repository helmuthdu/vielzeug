import { describe, expect, it, vi } from 'vitest';

import { CraftError } from '../errors';
import { setAttr } from '../utils/dom';

describe('setAttr — URL security', () => {
  it('blocks javascript: href', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const el = document.createElement('a');

    setAttr(el, 'href', 'javascript:alert(1)');

    expect(el.getAttribute('href')).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Blocked dangerous URL'));
    warnSpy.mockRestore();
  });

  it('blocks vbscript: href', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const el = document.createElement('a');

    setAttr(el, 'href', 'vbscript:msgbox(1)');

    expect(el.getAttribute('href')).toBeNull();
    warnSpy.mockRestore();
  });

  it('blocks data:text/html src', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const el = document.createElement('iframe');

    setAttr(el, 'src', 'data:text/html,<script>alert(1)</script>');

    expect(el.getAttribute('src')).toBeNull();
    warnSpy.mockRestore();
  });

  it('blocks data:application/xhtml+xml src', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const el = document.createElement('iframe');

    setAttr(el, 'src', 'data:application/xhtml+xml,<html/>');

    expect(el.getAttribute('src')).toBeNull();
    warnSpy.mockRestore();
  });

  it('allows plain data:image/ src', () => {
    const el = document.createElement('img');

    setAttr(el, 'src', 'data:image/png;base64,abc123');

    expect(el.getAttribute('src')).toBe('data:image/png;base64,abc123');
  });

  it('allows safe https: href', () => {
    const el = document.createElement('a');

    setAttr(el, 'href', 'https://example.com');

    expect(el.getAttribute('href')).toBe('https://example.com');
  });

  it('allows safe relative href', () => {
    const el = document.createElement('a');

    setAttr(el, 'href', '/about');

    expect(el.getAttribute('href')).toBe('/about');
  });

  it('removes the attribute when value is null', () => {
    const el = document.createElement('div');

    el.setAttribute('data-foo', 'bar');
    setAttr(el, 'data-foo', null);

    expect(el.getAttribute('data-foo')).toBeNull();
  });

  it('removes the attribute when value is false', () => {
    const el = document.createElement('div');

    el.setAttribute('data-active', '');
    setAttr(el, 'data-active', false);

    expect(el.getAttribute('data-active')).toBeNull();
  });

  it('sets true as the string "true"', () => {
    const el = document.createElement('div');

    setAttr(el, 'aria-hidden', true);

    expect(el.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('setAttr — on* attribute blocking', () => {
  it('blocks onclick attribute', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const el = document.createElement('div');

    setAttr(el, 'onclick', 'alert(1)');

    expect(el.getAttribute('onclick')).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Blocked setAttribute'));
    warnSpy.mockRestore();
  });

  it('blocks onmouseover attribute', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const el = document.createElement('div');

    setAttr(el, 'onmouseover', 'alert(1)');

    expect(el.getAttribute('onmouseover')).toBeNull();
    warnSpy.mockRestore();
  });
});

describe('CraftError', () => {
  it('is instanceof Error and CraftError', () => {
    const err = new CraftError('setup failed', {
      cause: new Error('original'),
      component: 'my-widget',
      phase: 'setup',
    });

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(CraftError);
  });

  it('prefixes the message with [@vielzeug/craft]', () => {
    const err = new CraftError('something went wrong', {
      cause: new Error('original'),
      component: 'my-widget',
      phase: 'setup',
    });

    expect(err.message).toContain('[@vielzeug/craft]');
    expect(err.message).toContain('something went wrong');
  });

  it('exposes component and phase', () => {
    const err = new CraftError('async setup failed', {
      cause: new Error('net err'),
      component: 'sg-loader',
      phase: 'async-setup',
    });

    expect(err.component).toBe('sg-loader');
    expect(err.phase).toBe('async-setup');
  });

  it('exposes the original error as cause', () => {
    const cause = new Error('original error');
    const err = new CraftError('msg', { cause, component: 'x', phase: 'mounted' });

    expect(err.cause).toBe(cause);
  });

  it('CraftError.is() returns true for CraftError instances', () => {
    const err = new CraftError('msg', { cause: new Error('x'), component: 'c', phase: 'setup' });

    expect(CraftError.is(err)).toBe(true);
  });

  it('CraftError.is() returns false for plain errors', () => {
    expect(CraftError.is(new Error('plain'))).toBe(false);
    expect(CraftError.is(null)).toBe(false);
    expect(CraftError.is('string')).toBe(false);
  });

  it('has .name === "CraftError"', () => {
    const err = new CraftError('msg', { cause: new Error('x'), component: 'c', phase: 'setup' });

    expect(err.name).toBe('CraftError');
  });
});
