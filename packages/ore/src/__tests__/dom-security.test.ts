import { describe, expect, it, vi } from 'vitest';

import { OreLifecycleError as OreError } from '../errors';
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

describe('OreError', () => {
  it('is instanceof Error and OreError', () => {
    const err = new OreError('setup failed', {
      cause: new Error('original'),
      component: 'my-widget',
      phase: 'setup',
    });

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(OreError);
  });

  it('preserves the message unchanged', () => {
    const err = new OreError('something went wrong', {
      cause: new Error('original'),
      component: 'my-widget',
      phase: 'setup',
    });

    expect(err.message).toBe('something went wrong');
  });

  it('exposes component and phase', () => {
    const err = new OreError('async setup failed', {
      cause: new Error('net err'),
      component: 'ore-loader',
      phase: 'async-setup',
    });

    expect(err.component).toBe('ore-loader');
    expect(err.phase).toBe('async-setup');
  });

  it('exposes the original error as cause', () => {
    const cause = new Error('original error');
    const err = new OreError('msg', { cause, component: 'x', phase: 'mounted' });

    expect(err.cause).toBe(cause);
  });

  it('OreError.is() returns true for OreError instances', () => {
    const err = new OreError('msg', { cause: new Error('x'), component: 'c', phase: 'setup' });

    expect(OreError.is(err)).toBe(true);
  });

  it('OreError.is() returns false for plain errors', () => {
    expect(OreError.is(new Error('plain'))).toBe(false);
    expect(OreError.is(null)).toBe(false);
    expect(OreError.is('string')).toBe(false);
  });

  it('has .name === "OreLifecycleError"', () => {
    const err = new OreError('msg', { cause: new Error('x'), component: 'c', phase: 'setup' });

    expect(err.name).toBe('OreLifecycleError');
  });
});
