import { invariant, OreInternalError, OreLifecycleError, OreError, reportRuntimeError } from '../errors';
import { html } from '../index';
import { beginPendingWork, hasPendingWork } from '../runtime';
import { createHtmlResult, isHtmlResult } from '../template/result';
import { debugFlush, flush, OreTimeoutError } from '../testing';

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

  it('exposes component, phase, and the original cause', () => {
    const cause = new Error('root');
    const err = new OreLifecycleError('msg', {
      cause,
      component: 'my-button',
      phase: 'setup',
    });

    expect(err.component).toBe('my-button');
    expect(err.phase).toBe('setup');
    expect(err.cause).toBe(cause);
    expect(err.name).toBe('OreLifecycleError');
  });

  describe('OreError.is()', () => {
    it('recognizes Ore errors only', () => {
      const err = new OreLifecycleError('msg', {
        cause: new Error('cause'),
        component: 'x',
        phase: 'setup',
      });

      expect(OreError.is(err)).toBe(true);
      expect(OreError.is(new Error('plain'))).toBe(false);
      expect(OreError.is(null)).toBe(false);
    });
  });
});

describe('invariant()', () => {
  it('does not throw for truthy values', () => {
    expect(() => invariant(true, 'unreachable')).not.toThrow();
    expect(() => invariant('non-empty', 'unreachable')).not.toThrow();
  });

  it('throws an OreInternalError and narrows the asserted value', () => {
    expect(() => invariant(false, 'compiled path missing')).toThrow(OreInternalError);

    const value: string | null = 'present';

    invariant(value, 'value must be present');
    expect(value.length).toBeGreaterThan(0);
  });
});

describe('reportRuntimeError()', () => {
  it('logs and dispatches ore:error with the structured failure', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const el = document.createElement('div');
    const events: CustomEvent[] = [];
    const err = new OreLifecycleError('msg', {
      cause: new Error('cause'),
      component: 'my-el',
      phase: 'setup',
    });

    document.body.appendChild(el);
    el.addEventListener('ore:error', (event) => events.push(event as CustomEvent));
    reportRuntimeError(err, el);

    expect(spy).toHaveBeenCalledOnce();
    expect(events[0]?.detail).toBe(err);

    spy.mockRestore();
    el.remove();
  });
});

describe('HTML result branding', () => {
  it('recognizes real HTML results and rejects lookalikes', () => {
    const result = html`
      <div></div>
    `;

    expect(isHtmlResult(result)).toBe(true);
    expect(isHtmlResult({ apply: () => {}, fragment: document.createDocumentFragment() })).toBe(false);
  });

  it('brands internal compiled results', () => {
    const fragment = document.createDocumentFragment();
    const result = createHtmlResult(fragment, () => {});

    expect(isHtmlResult(result)).toBe(true);
    expect(result.fragment).toBe(fragment);
  });
});

describe('debugFlush()', () => {
  it('resolves and logs diagnostics', async () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    await expect(debugFlush()).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();

    spy.mockRestore();
  });
});

describe('runtime pending work', () => {
  it('tracks work until every idempotent end callback runs', () => {
    const endA = beginPendingWork();
    const endB = beginPendingWork();

    expect(hasPendingWork()).toBe(true);

    endA();
    endA();
    expect(hasPendingWork()).toBe(true);

    endB();
    expect(hasPendingWork()).toBe(false);
  });

  it('makes flush fail when work never settles', async () => {
    const end = beginPendingWork();

    try {
      await expect(flush()).rejects.toBeInstanceOf(OreTimeoutError);
    } finally {
      end();
    }
  });
});
