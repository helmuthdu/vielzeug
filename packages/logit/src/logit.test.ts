import { afterEach, describe, expect, it, vi } from 'vitest';

import { createLogger, Logit } from './logit';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Create a fresh logger and spy on all console methods. */
function setup(opts = {}) {
  const log = createLogger({ environment: false, logLevel: 'debug', timestamp: false, ...opts });
  const spies = {
    assert: vi.spyOn(console, 'assert').mockImplementation(() => {}),
    error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    group: vi.spyOn(console, 'group').mockImplementation(() => {}),
    groupCollapsed: vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {}),
    groupEnd: vi.spyOn(console, 'groupEnd').mockImplementation(() => {}),
    info: vi.spyOn(console, 'info').mockImplementation(() => {}),
    log: vi.spyOn(console, 'log').mockImplementation(() => {}),
    table: vi.spyOn(console, 'table').mockImplementation(() => {}),
    time: vi.spyOn(console, 'time').mockImplementation(() => {}),
    timeEnd: vi.spyOn(console, 'timeEnd').mockImplementation(() => {}),
    trace: vi.spyOn(console, 'trace').mockImplementation(() => {}),
    warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
  };

  return { log, spies };
}

afterEach(() => vi.restoreAllMocks());

// ─── Factory ──────────────────────────────────────────────────────────────────

describe('createLogger', () => {
  it('string shorthand sets the namespace', () => {
    expect(createLogger('MyApp').config.namespace).toBe('MyApp');
  });

  it('each call returns an isolated instance — config changes do not bleed', () => {
    const a = createLogger({ logLevel: 'debug' });
    const b = createLogger({ logLevel: 'error' });

    a.setConfig({ logLevel: 'warn' });
    expect(a.config.logLevel).toBe('warn');
    expect(b.config.logLevel).toBe('error');
  });

  it('initial options override all defaults', () => {
    const cfg = createLogger({ logLevel: 'error', namespace: 'App', timestamp: false, variant: 'icon' }).config;

    expect(cfg).toMatchObject({ logLevel: 'error', namespace: 'App', timestamp: false, variant: 'icon' });
  });

  it('Logit is a pre-created default instance with the full Logger API', () => {
    expect(typeof Logit.info).toBe('function');
    expect(typeof Logit.scope).toBe('function');
    expect(typeof Logit.child).toBe('function');
  });
});

// ─── configure() / config ──────────────────────────────────────────────────────

describe('configure() / config', () => {
  it('applies partial updates — unset keys are preserved', () => {
    const { log } = setup();

    log.setConfig({ logLevel: 'warn' });
    expect(log.config.logLevel).toBe('warn');
    expect(log.config.variant).toBe('symbol'); // default preserved
  });

  it('merges remote config rather than replacing it wholesale', () => {
    const handler = vi.fn();
    const { log } = setup();

    log.setConfig({ remote: { handler, logLevel: 'warn' } });
    log.setConfig({ remote: { logLevel: 'error' } }); // update level only

    // handler survives the second config call
    expect(log.config.remote.handler).toBe(handler);
    expect(log.config.remote.logLevel).toBe('error');
  });

  it('config is a snapshot — mutating it does not affect the logger', () => {
    const { log } = setup();
    const cfg = log.config as any;

    cfg.logLevel = 'off';

    expect(log.config.logLevel).toBe('debug'); // unchanged
  });

  it('configure() returns the logger for fluent chaining', () => {
    const { log, spies } = setup();

    log.setConfig({ logLevel: 'error' }).error('chained');
    expect(spies.error).toHaveBeenCalledTimes(1);
  });
});

// ─── Emit ─────────────────────────────────────────────────────────────────────

describe('Emit', () => {
  it('routes each type to the correct console method', () => {
    const { log, spies } = setup();

    log.debug('d');
    log.success('s');
    log.trace('t');
    log.info('i');
    log.warn('w');
    log.error('e');
    expect(spies.log).toHaveBeenCalledTimes(2); // debug + success → console.log
    expect(spies.trace).toHaveBeenCalledTimes(1);
    expect(spies.info).toHaveBeenCalledTimes(1);
    expect(spies.warn).toHaveBeenCalledTimes(1);
    expect(spies.error).toHaveBeenCalledTimes(1);
  });

  it('forwards all user arguments verbatim after the format prefix', () => {
    const { log, spies } = setup();

    log.info('msg', 42, null, undefined, { nested: true });

    const call = spies.info.mock.calls[0];

    expect(call[0]).toMatch(/%c.*%c/);
    expect(call.slice(-5)).toEqual(['msg', 42, null, undefined, { nested: true }]);
  });

  it('handles zero args and falsy values without throwing', () => {
    const { log, spies } = setup();

    log.info();
    log.warn(null, undefined, 0, false, '');
    expect(spies.info).toHaveBeenCalledTimes(1);
    expect(spies.warn).toHaveBeenCalledTimes(1);
  });

  it('includes namespace in the format string when set', () => {
    const { log, spies } = setup({ namespace: 'MyApp' });

    log.info('x');
    expect(spies.info.mock.calls[0][0]).toContain('MyApp');
  });

  it('omits namespace segment entirely when namespace is empty', () => {
    const { log, spies } = setup({ namespace: '' });

    log.info('x');
    expect(spies.info.mock.calls[0][0]).not.toMatch(/%c\s*%c/);
  });

  it.each(['text', 'icon', 'symbol'] as const)('variant "%s" produces a valid format string', (variant) => {
    const { log, spies } = setup({ variant });

    log.info('x');
    expect(spies.info).toHaveBeenCalledOnce();
    expect(typeof spies.info.mock.calls[0][0]).toBe('string');
  });
});

// ─── Log Level Filtering ──────────────────────────────────────────────────────

describe('Log Level Filtering', () => {
  it('suppresses calls below the configured level', () => {
    const { log, spies } = setup({ logLevel: 'warn' });

    log.debug('no');
    log.info('no');
    log.warn('yes');
    log.error('yes');
    expect(spies.log).not.toHaveBeenCalled();
    expect(spies.info).not.toHaveBeenCalled();
    expect(spies.warn).toHaveBeenCalledTimes(1);
    expect(spies.error).toHaveBeenCalledTimes(1);
  });

  it('logLevel "off" suppresses all output including utilities', () => {
    const { log, spies } = setup({ logLevel: 'off' });

    log.debug('x');
    log.error('x');
    log.table([{}]);
    log.time('x', () => {});
    log.group('x', () => {});
    log.assert(false, 'x');
    expect(spies.log).not.toHaveBeenCalled();
    expect(spies.error).not.toHaveBeenCalled();
    expect(spies.table).not.toHaveBeenCalled();
    expect(spies.time).not.toHaveBeenCalled();
    expect(spies.group).not.toHaveBeenCalled();
    expect(spies.groupEnd).not.toHaveBeenCalled();
    expect(spies.assert).not.toHaveBeenCalled();
  });

  it('enabled() reflects the current logLevel threshold', () => {
    const { log } = setup({ logLevel: 'warn' });

    expect(log.enabled('error')).toBe(true);
    expect(log.enabled('warn')).toBe(true);
    expect(log.enabled('info')).toBe(false);
    expect(log.enabled('debug')).toBe(false);
  });

  it('enabled() updates live after config() changes the level', () => {
    const { log } = setup({ logLevel: 'error' });

    expect(log.enabled('warn')).toBe(false);
    log.setConfig({ logLevel: 'debug' });
    expect(log.enabled('warn')).toBe(true);
  });
});

// ─── scope() and child() ──────────────────────────────────────────────────────

describe('scope() and child()', () => {
  it('scope() prepends namespace to the output', () => {
    const { log, spies } = setup({ namespace: 'Global' });

    log.scope('api').info('call');
    expect(spies.info.mock.calls[0][0]).toContain('Global.api');
    expect(log.config.namespace).toBe('Global'); // parent unchanged
  });

  it('scope() works when the parent has no namespace', () => {
    const { log, spies } = setup();

    log.scope('api').info('x');
    expect(spies.info.mock.calls[0][0]).toContain('api');
  });

  it('scope() is chainable — builds dotted paths', () => {
    const { log, spies } = setup();

    log.scope('api').scope('auth').warn('expired');
    expect(spies.warn.mock.calls[0][0]).toContain('api.auth');
  });

  it('scope() bakes in the namespace at call time — later parent changes are ignored', () => {
    const { log, spies } = setup({ namespace: 'A' });
    const scoped = log.scope('sub');

    log.setConfig({ namespace: 'B' });
    scoped.info('x');
    expect(spies.info.mock.calls[0][0]).toContain('A.sub');
    expect(spies.info.mock.calls[0][0]).not.toContain('B');
  });

  it('child() inherits a full snapshot of the parent config', () => {
    const parent = createLogger({ logLevel: 'warn', namespace: 'App', variant: 'icon' });

    expect(parent.child().config).toMatchObject({ logLevel: 'warn', namespace: 'App', variant: 'icon' });
  });

  it('child() overrides do not affect the parent', () => {
    const parent = createLogger({ logLevel: 'warn', namespace: 'App' });
    const child = parent.child({ logLevel: 'debug', namespace: 'Child' });

    expect(child.config.logLevel).toBe('debug');
    expect(parent.config.logLevel).toBe('warn');
    expect(parent.config.namespace).toBe('App');
  });

  it('parent config changes after child() do not affect the child', () => {
    const parent = createLogger({ logLevel: 'info' });
    const child = parent.child();

    parent.setConfig({ logLevel: 'error' });
    expect(child.config.logLevel).toBe('info');
  });

  it('child() merges remote config — parent handler is inherited by default', () => {
    const handler = vi.fn();
    const child = createLogger({ remote: { handler, logLevel: 'warn' } }).child({ remote: { logLevel: 'debug' } });

    expect(child.config.remote.handler).toBe(handler);
    expect(child.config.remote.logLevel).toBe('debug');
  });
});

// ─── Remote Logging ───────────────────────────────────────────────────────────

describe('Remote Logging', () => {
  it('dispatches to remote handler with full metadata above threshold', async () => {
    const handler = vi.fn();
    const { log } = setup({
      namespace: 'App',
      remote: { handler, logLevel: 'info' },
      timestamp: true,
    });

    log.debug('below threshold'); // should NOT fire remote
    await vi.waitFor(() => expect(handler).not.toHaveBeenCalled());

    log.info('message');
    await vi.waitFor(() =>
      expect(handler).toHaveBeenCalledWith(
        'info',
        expect.objectContaining({
          args: ['message'],
          env: expect.stringMatching(/production|development/),
          namespace: 'App',
          timestamp: expect.any(String),
        }),
      ),
    );
  });

  it('remote and console levels are independent', async () => {
    const handler = vi.fn();
    const { log, spies } = setup({ logLevel: 'debug', remote: { handler, logLevel: 'warn' } });

    log.info('i');
    expect(spies.info).toHaveBeenCalled(); // console logs it
    await vi.waitFor(() => expect(handler).not.toHaveBeenCalled()); // remote doesn't

    log.warn('w');
    expect(spies.warn).toHaveBeenCalled();
    await vi.waitFor(() => expect(handler).toHaveBeenCalledWith('warn', expect.objectContaining({ args: ['w'] })));
  });

  it('remote config can be updated dynamically', async () => {
    const handler = vi.fn();
    const { log } = setup({ remote: { handler, logLevel: 'error' } });

    log.warn('w1');
    await vi.waitFor(() => expect(handler).not.toHaveBeenCalled());

    log.setConfig({ remote: { handler, logLevel: 'warn' } });
    log.warn('w2');
    await vi.waitFor(() => expect(handler).toHaveBeenCalledWith('warn', expect.objectContaining({ args: ['w2'] })));
  });

  it('omits namespace and timestamp from remote data when not configured', async () => {
    const handler = vi.fn();
    const { log } = setup({ remote: { handler, logLevel: 'debug' }, timestamp: false });

    log.info('msg');
    await vi.waitFor(() =>
      expect(handler).toHaveBeenCalledWith(
        'info',
        expect.objectContaining({ namespace: undefined, timestamp: undefined }),
      ),
    );
  });

  it('fires handler when only a handler is set — logLevel defaults to debug', async () => {
    const handler = vi.fn();
    const { log } = setup({ remote: { handler } }); // no explicit logLevel

    log.info('msg');
    await vi.waitFor(() => expect(handler).toHaveBeenCalledWith('info', expect.objectContaining({ args: ['msg'] })));
  });
});

// ─── Timers ───────────────────────────────────────────────────────────────────

describe('Timers', () => {
  it('time(label, fn) wraps fn in console.time / timeEnd and returns the value', () => {
    const { log, spies } = setup();
    const result = log.time('render', () => 42);

    expect(result).toBe(42);
    expect(spies.time).toHaveBeenCalledWith('render');
    expect(spies.timeEnd).toHaveBeenCalledWith('render');
  });

  it('timeEnd is called even when fn throws', () => {
    const { log, spies } = setup();

    expect(() =>
      log.time('op', () => {
        throw new Error('boom');
      }),
    ).toThrow('boom');
    expect(spies.timeEnd).toHaveBeenCalledWith('op');
  });

  it('timeEnd is called even when async fn rejects', async () => {
    const { log, spies } = setup();

    await expect(log.time('op', () => Promise.reject(new Error('async boom')))).rejects.toThrow('async boom');
    expect(spies.timeEnd).toHaveBeenCalledWith('op');
  });

  it('prefixes the label with [namespace] when set to avoid collisions', () => {
    const { log, spies } = setup({ namespace: 'db' });

    log.time('query', () => {});
    expect(spies.time).toHaveBeenCalledWith('[db] query');
    expect(spies.timeEnd).toHaveBeenCalledWith('[db] query');
  });

  it('fn still runs and value is returned when logLevel suppresses the timer', () => {
    const { log, spies } = setup({ logLevel: 'info' });
    const result = log.time('x', () => 'done');

    expect(result).toBe('done');
    expect(spies.time).not.toHaveBeenCalled();
    expect(spies.timeEnd).not.toHaveBeenCalled();
  });

  it('supports async fn — timeEnd fires after the promise resolves', async () => {
    const { log, spies } = setup();
    const result = await log.time('fetch', () => Promise.resolve('data'));

    expect(result).toBe('data');
    expect(spies.time).toHaveBeenCalledWith('fetch');
    expect(spies.timeEnd).toHaveBeenCalledWith('fetch');
  });
});

// ─── Groups ───────────────────────────────────────────────────────────────────

describe('Groups', () => {
  it('group(label, fn) opens the group, runs fn, closes it and returns the value', () => {
    const { log, spies } = setup();
    const result = log.group('SECTION', () => 42);

    expect(result).toBe(42);
    expect(spies.group).toHaveBeenCalledOnce();
    expect(spies.group.mock.calls[0][0]).toContain('SECTION');
    expect(spies.groupEnd).toHaveBeenCalledOnce();
  });

  it('collapsed=true uses console.groupCollapsed', () => {
    const { log, spies } = setup();

    log.group('DETAILS', () => {}, true);
    expect(spies.groupCollapsed).toHaveBeenCalledOnce();
    expect(spies.groupCollapsed.mock.calls[0][0]).toContain('DETAILS');
    expect(spies.groupEnd).toHaveBeenCalledOnce();
  });

  it('groupEnd is called even when fn throws', () => {
    const { log, spies } = setup();

    expect(() =>
      log.group('op', () => {
        throw new Error('boom');
      }),
    ).toThrow('boom');
    expect(spies.groupEnd).toHaveBeenCalledOnce();
  });

  it('groupEnd is called even when async fn rejects', async () => {
    const { log, spies } = setup();

    await expect(log.group('op', () => Promise.reject(new Error('async boom')))).rejects.toThrow('async boom');
    expect(spies.groupEnd).toHaveBeenCalledOnce();
  });

  it('supports async fn — groupEnd fires after the promise resolves', async () => {
    const { log, spies } = setup();
    const result = await log.group('fetch', () => Promise.resolve('data'));

    expect(result).toBe('data');
    expect(spies.group).toHaveBeenCalledOnce();
    expect(spies.groupEnd).toHaveBeenCalledOnce();
  });

  it('fn always runs and value is returned when the group wrapper is suppressed', () => {
    const { log, spies } = setup({ logLevel: 'info' });
    const result = log.group('x', () => 'done');

    expect(result).toBe('done');
    expect(spies.group).not.toHaveBeenCalled();
    expect(spies.groupEnd).not.toHaveBeenCalled();
  });

  it('group wrapper and groupEnd are suppressed at logLevel "off"', () => {
    const { log, spies } = setup({ logLevel: 'off' });

    log.group('x', () => {});
    expect(spies.group).not.toHaveBeenCalled();
    expect(spies.groupEnd).not.toHaveBeenCalled();
  });
});

// ─── Table ────────────────────────────────────────────────────────────────────

describe('Table', () => {
  it('forwards data and optional properties to console.table', () => {
    const { log, spies } = setup();

    log.table([{ name: 'Alice' }]);
    expect(spies.table).toHaveBeenCalledWith([{ name: 'Alice' }], undefined);
    log.table([{ name: 'Alice' }], ['name']);
    expect(spies.table).toHaveBeenCalledWith([{ name: 'Alice' }], ['name']);
  });

  it('suppressed when logLevel is above debug', () => {
    const { log, spies } = setup({ logLevel: 'info' });

    log.table([{}]);
    expect(spies.table).not.toHaveBeenCalled();
  });
});

// ─── Assert ───────────────────────────────────────────────────────────────────

describe('Assert', () => {
  it('forwards condition and args to console.assert', () => {
    const { log, spies } = setup();

    log.assert(false, 'msg', { code: 42 });
    expect(spies.assert).toHaveBeenCalledWith(false, 'msg', { code: 42 });
  });

  it('suppressed when logLevel is off', () => {
    const { log, spies } = setup({ logLevel: 'off' });

    log.assert(false, 'x');
    expect(spies.assert).not.toHaveBeenCalled();
  });
});
