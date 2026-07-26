import { signal } from '@vielzeug/ripple';
import { describe, expect, it, vi } from 'vitest';

import { OreLifecycleError as OreError } from '../errors';
import { createReplaceableSlot, resolveMaybeReactive, sanitizeCssToken, setAttr } from '../utils/dom';

describe('resolveMaybeReactive()', () => {
  it('returns a plain value unchanged', () => {
    expect(resolveMaybeReactive(42)).toBe(42);
    expect(resolveMaybeReactive('hi')).toBe('hi');
    expect(resolveMaybeReactive(false)).toBe(false);
  });

  it('calls a getter function and returns its result', () => {
    expect(resolveMaybeReactive(() => 'from-getter')).toBe('from-getter');
  });

  it('reads .value from a reactive signal', () => {
    const s = signal('from-signal');

    expect(resolveMaybeReactive(s)).toBe('from-signal');
  });
});

describe('sanitizeCssToken()', () => {
  it('strips semicolons and braces', () => {
    expect(sanitizeCssToken('red; }body{color:red')).toBe('red bodycolor:red');
  });

  it('leaves an already-safe token untouched', () => {
    expect(sanitizeCssToken('background-color')).toBe('background-color');
  });
});

describe('createReplaceableSlot()', () => {
  it('starts empty', () => {
    const slot = createReplaceableSlot();

    expect(slot.nodes).toEqual([]);
  });

  it('tracks nodes set via setNodes()', () => {
    const slot = createReplaceableSlot();
    const nodes = [document.createElement('div'), document.createElement('span')];

    slot.setNodes(nodes);
    expect(slot.nodes).toBe(nodes);
  });

  it('clear() removes tracked nodes from the DOM and resets to empty', () => {
    const parent = document.createElement('div');
    const child = document.createElement('span');

    parent.appendChild(child);

    const slot = createReplaceableSlot();

    slot.setNodes([child]);
    slot.clear();

    expect(parent.contains(child)).toBe(false);
    expect(slot.nodes).toEqual([]);
  });

  it('clear() runs registered cleanups in reverse registration order', () => {
    const calls: number[] = [];
    const slot = createReplaceableSlot();

    slot.registerCleanup(() => calls.push(1));
    slot.registerCleanup(() => calls.push(2));
    slot.registerCleanup(() => calls.push(3));
    slot.clear();

    expect(calls).toEqual([3, 2, 1]);
  });

  it('clear() is safe to call repeatedly with nothing tracked', () => {
    const slot = createReplaceableSlot();

    expect(() => {
      slot.clear();
      slot.clear();
    }).not.toThrow();
  });
});

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

  it('blocks data:image/svg+xml src (script-capable SVG)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const el = document.createElement('iframe');

    setAttr(el, 'src', 'data:image/svg+xml,<svg onload="alert(1)"></svg>');

    expect(el.getAttribute('src')).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Blocked dangerous URL'));
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

describe('setAttr — srcdoc blocking', () => {
  it('blocks srcdoc unconditionally (raw HTML, not a URL)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const el = document.createElement('iframe');

    setAttr(el, 'srcdoc', '<script>alert(1)</script>');

    expect(el.getAttribute('srcdoc')).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Blocked setAttribute("srcdoc"'));
    warnSpy.mockRestore();
  });

  it('removes an existing srcdoc attribute rather than leaving it stale', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const el = document.createElement('iframe');

    el.setAttribute('srcdoc', '<p>previous</p>');
    setAttr(el, 'srcdoc', '<p>next</p>');

    expect(el.getAttribute('srcdoc')).toBeNull();
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
