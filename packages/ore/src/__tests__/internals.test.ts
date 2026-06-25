import { debugFlush } from '../devtools';
import { OreLifecycleError, OreError, reportRuntimeError } from '../errors';
import { html } from '../index';
import {
  createDirectiveResult,
  createHtmlResult,
  createSpreadObject,
  isDirectiveResult,
  isHtmlResult,
  isSpreadObject,
} from '../types/bindings';

describe('OreLifecycleError', () => {
  it('is an instance of Error', () => {
    const cause = new Error('root cause');
    const err = new OreLifecycleError('<ore> <my-el> failed during setup (connectedCallback)', {
      cause,
      component: 'my-el',
      phase: 'setup',
    });

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(OreError);
  });

  it('exposes component and phase properties', () => {
    const cause = new Error('root');
    const err = new OreLifecycleError('msg', {
      cause,
      component: 'my-button',
      phase: 'setup',
    });

    expect(err.component).toBe('my-button');
    expect(err.phase).toBe('setup');
  });

  it('has name "OreLifecycleError"', () => {
    const err = new OreLifecycleError('msg', {
      cause: new Error('cause'),
      component: 'x',
      phase: 'setup',
    });

    expect(err.name).toBe('OreLifecycleError');
  });

  it('exposes the original cause', () => {
    const cause = new Error('original');
    const err = new OreLifecycleError('msg', { cause, component: 'x', phase: 'setup' });

    expect(err.cause).toBe(cause);
  });

  describe('OreError.is()', () => {
    it('returns true for a OreError instance', () => {
      const err = new OreLifecycleError('msg', {
        cause: new Error('cause'),
        component: 'x',
        phase: 'setup',
      });

      expect(OreError.is(err)).toBe(true);
    });

    it('returns false for a plain Error', () => {
      expect(OreError.is(new Error('plain'))).toBe(false);
    });

    it('returns false for null and primitives', () => {
      expect(OreError.is(null)).toBe(false);
      expect(OreError.is(undefined)).toBe(false);
      expect(OreError.is('string')).toBe(false);
    });
  });
});

describe('reportRuntimeError()', () => {
  it('logs to console.error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const el = document.createElement('div');

    document.body.appendChild(el);

    const err = new OreLifecycleError('msg', {
      cause: new Error('cause'),
      component: 'my-el',
      phase: 'setup',
    });

    reportRuntimeError(err, el);

    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
    el.remove();
  });

  it('dispatches a ore:error CustomEvent on the element', () => {
    const el = document.createElement('div');

    document.body.appendChild(el);

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const events: CustomEvent[] = [];

    el.addEventListener('ore:error', (e) => events.push(e as CustomEvent));

    const err = new OreLifecycleError('msg', {
      cause: new Error('cause'),
      component: 'my-el',
      phase: 'setup',
    });

    reportRuntimeError(err, el);

    expect(events).toHaveLength(1);
    expect(events[0]?.detail).toBe(err);

    spy.mockRestore();
    el.remove();
  });
});

describe('Type guards', () => {
  describe('isHtmlResult()', () => {
    it('returns true for a real HTMLResult', () => {
      const result = html`<div></div>`;

      expect(isHtmlResult(result)).toBe(true);
    });

    it('returns false for a plain object', () => {
      expect(isHtmlResult({ apply: () => {}, fragment: document.createDocumentFragment() })).toBe(false);
    });

    it('returns false for null and primitives', () => {
      expect(isHtmlResult(null)).toBe(false);
      expect(isHtmlResult(42)).toBe(false);
      expect(isHtmlResult('string')).toBe(false);
    });
  });

  describe('isDirectiveResult()', () => {
    it('returns true for a branded DirectiveResult', () => {
      const d = createDirectiveResult(() => {});

      expect(isDirectiveResult(d)).toBe(true);
    });

    it('returns false for a plain object with mount()', () => {
      expect(isDirectiveResult({ mount: () => {} })).toBe(false);
    });

    it('returns false for null', () => {
      expect(isDirectiveResult(null)).toBe(false);
    });
  });

  describe('isSpreadObject()', () => {
    it('returns true for a branded SpreadObject', () => {
      const s = createSpreadObject(() => {});

      expect(isSpreadObject(s)).toBe(true);
    });

    it('returns false for a plain object with apply()', () => {
      expect(isSpreadObject({ apply: () => {} })).toBe(false);
    });

    it('returns false for null', () => {
      expect(isSpreadObject(null)).toBe(false);
    });
  });

  describe('createHtmlResult()', () => {
    it('produces a branded HTMLResult accepted by isHtmlResult()', () => {
      const frag = document.createDocumentFragment();
      const result = createHtmlResult(frag, () => {});

      expect(isHtmlResult(result)).toBe(true);
      expect(result.fragment).toBe(frag);
    });
  });
});

describe('debugFlush()', () => {
  it('resolves without error', async () => {
    await expect(debugFlush()).resolves.toBeUndefined();
  });

  it('passes logger messages to console.debug', async () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    await debugFlush({ maxTurns: 1 });

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
