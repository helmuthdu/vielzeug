import { afterEach, describe, expect, it, vi } from 'vitest';

import { createLogger, Logit } from './logit';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Create a fresh logger and spy on all console methods. */
function setup(opts = {}, bindings = {}) {
  const log = createLogger({ logLevel: 'debug', timestamp: false, ...opts }, bindings);
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
    expect(typeof Logit.withBindings).toBe('function');
    expect(typeof Logit.fatal).toBe('function');
  });
});

// ─── configure() / config ──────────────────────────────────────────────────────

describe('configure() / config', () => {
  it('applies partial updates — unset keys are preserved', () => {
    const { log } = setup();

    log.setConfig({ logLevel: 'warn' });
    expect(log.config.logLevel).toBe('warn');
    expect(log.config.variant).toBe('symbol');
  });

  it('merges remote config rather than replacing it wholesale', () => {
    const handler = vi.fn();
    const { log } = setup();

    log.setConfig({ remote: { handler, logLevel: 'warn' } });
    log.setConfig({ remote: { logLevel: 'error' } });

    expect(log.config.remote.handler).toBe(handler);
    expect(log.config.remote.logLevel).toBe('error');
  });

  it('config is a snapshot — mutating it does not affect the logger', () => {
    const { log } = setup();
    const cfg = log.config as any;

    cfg.logLevel = 'off';

    expect(log.config.logLevel).toBe('debug');
  });

  it('configure() returns the logger for fluent chaining', () => {
    const { log, spies } = setup();

    log.setConfig({ logLevel: 'error' }).error('chained');
    expect(spies.error).toHaveBeenCalledTimes(1);
  });
});

// ─── Call signature ───────────────────────────────────────────────────────────

describe('Call signature', () => {
  it('log.info("message") — string-only form', () => {
    const { log, spies } = setup();

    log.info('hello');

    const call = spies.info.mock.calls[0];

    // last arg is the message string
    expect(call[call.length - 1]).toBe('hello');
  });

  it('log.info(context, "message") — context-first form', () => {
    const { log, spies } = setup();

    log.info({ requestId: 'abc' }, 'hello');

    const call = spies.info.mock.calls[0];

    expect(call[call.length - 2]).toEqual({ requestId: 'abc' });
    expect(call[call.length - 1]).toBe('hello');
  });

  it('log.info() — zero-arg form does not throw', () => {
    const { log, spies } = setup();

    log.info();
    expect(spies.info).toHaveBeenCalledTimes(1);
  });

  it('log.error(new Error()) — auto-serializes Error, uses err.message', () => {
    const { log, spies } = setup();
    const err = new Error('boom');

    log.error(err);

    const call = spies.error.mock.calls[0];
    const ctx = call[call.length - 2] as any;

    expect(ctx.err.message).toBe('boom');
    expect(ctx.err.name).toBe('Error');
    expect(typeof ctx.err.stack).toBe('string');
    expect(call[call.length - 1]).toBe('boom');
  });

  it('log.error(new Error(), "override") — message override respected', () => {
    const { log, spies } = setup();
    const err = new Error('original');

    log.error(err, 'custom');

    const call = spies.error.mock.calls[0];

    expect(call[call.length - 1]).toBe('custom');

    const ctx = call[call.length - 2] as any;

    expect(ctx.err.message).toBe('original');
  });

  it('includes namespace in the format string when set', () => {
    const { log, spies } = setup({ namespace: 'MyApp' });

    log.info('x');
    expect(spies.info.mock.calls[0][0]).toContain('MyApp');
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
  it('routes each type to the correct console method', () => {
    const { log, spies } = setup();

    log.debug('d');
    log.trace('t');
    log.info('i');
    log.warn('w');
    log.error('e');
    log.fatal('f');
    expect(spies.log).toHaveBeenCalledTimes(1); // debug
    expect(spies.trace).toHaveBeenCalledTimes(1);
    expect(spies.info).toHaveBeenCalledTimes(1);
    expect(spies.warn).toHaveBeenCalledTimes(1);
    expect(spies.error).toHaveBeenCalledTimes(2); // error + fatal → console.error
  });

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

  it('fatal is above error in priority', () => {
    const { log, spies } = setup({ logLevel: 'error' });

    log.error('e');
    log.fatal('f');
    expect(spies.error).toHaveBeenCalledTimes(2);
  });

  it('logLevel "off" suppresses all output including utilities', () => {
    const { log, spies } = setup({ logLevel: 'off' });

    log.debug('x');
    log.fatal('x');
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

    expect(log.enabled('fatal')).toBe(true);
    expect(log.enabled('error')).toBe(true);
    expect(log.enabled('warn')).toBe(true);
    expect(log.enabled('info')).toBe(false);
    expect(log.enabled('debug')).toBe(false);
  });

  it('enabled() updates live after setConfig() changes the level', () => {
    const { log } = setup({ logLevel: 'error' });

    expect(log.enabled('warn')).toBe(false);
    log.setConfig({ logLevel: 'debug' });
    expect(log.enabled('warn')).toBe(true);
  });

  it('logLevel "info" keeps info-level logs enabled', () => {
    const { log, spies } = setup({ logLevel: 'info' });

    log.info('i');
    expect(spies.info).toHaveBeenCalledTimes(1);
  });
});

// ─── scope() and child() ──────────────────────────────────────────────────────

describe('scope() and child()', () => {
  it('scope() prepends namespace to the output', () => {
    const { log, spies } = setup({ namespace: 'Global' });

    log.scope('api').info('call');
    expect(spies.info.mock.calls[0][0]).toContain('Global.api');
    expect(log.config.namespace).toBe('Global');
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

  it('scope() bakes in the namespace at call time', () => {
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

// ─── withBindings() ───────────────────────────────────────────────────────────

describe('withBindings()', () => {
  it('pinned fields are merged into every log call', () => {
    const { log, spies } = setup();
    const child = log.withBindings({ requestId: 'abc' });

    child.info('hello');

    const call = spies.info.mock.calls[0];

    // context object should be the second-to-last arg, message last
    expect(call[call.length - 2]).toEqual(expect.objectContaining({ requestId: 'abc' }));
    expect(call[call.length - 1]).toBe('hello');
  });

  it('per-call context merges with bindings — call-site wins on collision', () => {
    const { log, spies } = setup();
    const child = log.withBindings({ extra: 'x', requestId: 'base' });

    child.info({ requestId: 'override' }, 'msg');

    const ctx = spies.info.mock.calls[0][spies.info.mock.calls[0].length - 2] as any;

    expect(ctx.requestId).toBe('override');
    expect(ctx.extra).toBe('x');
  });

  it('bindings getter returns snapshot', () => {
    const parent = createLogger();
    const child = parent.withBindings({ userId: 1 });

    expect(child.bindings).toEqual({ userId: 1 });
  });

  it('parent bindings are not affected by withBindings()', () => {
    const parent = createLogger();

    parent.withBindings({ userId: 1 });
    expect(parent.bindings).toEqual({});
  });

  it('bindings are inherited through child()', () => {
    const { log } = setup();
    const withCtx = log.withBindings({ requestId: 'abc' });
    const scoped = withCtx.child({ logLevel: 'error' });

    expect(scoped.bindings).toEqual({ requestId: 'abc' });
  });

  it('withBindings() on a withBindings() child merges additively', () => {
    const { log } = setup();
    const a = log.withBindings({ a: 1 });
    const b = a.withBindings({ b: 2 });

    expect(b.bindings).toEqual({ a: 1, b: 2 });
  });

  it('no context object emitted when only message is logged with no bindings', () => {
    const { log, spies } = setup();

    log.info('hello');

    const call = spies.info.mock.calls[0];

    // should only be format-string + style args + the message; no context obj before message
    expect(call[call.length - 1]).toBe('hello');
    expect(typeof call[call.length - 2]).not.toBe('object');
  });
});

// ─── Fatal level ──────────────────────────────────────────────────────────────

describe('Fatal level', () => {
  it('fatal() routes to console.error', () => {
    const { log, spies } = setup();

    log.fatal('critical');
    expect(spies.error).toHaveBeenCalledTimes(1);
  });

  it('fatal() accepts (context, message) form', () => {
    const { log, spies } = setup();

    log.fatal({ service: 'api' }, 'terminating');

    const call = spies.error.mock.calls[0];

    expect(call[call.length - 2]).toEqual({ service: 'api' });
    expect(call[call.length - 1]).toBe('terminating');
  });

  it('fatal() accepts Error auto-serialization', () => {
    const { log, spies } = setup();
    const err = new Error('fatal boom');

    log.fatal(err);

    const ctx = spies.error.mock.calls[0][spies.error.mock.calls[0].length - 2] as any;

    expect(ctx.err.message).toBe('fatal boom');
  });

  it('fatal is above error — logLevel "error" still shows fatal', () => {
    const { log, spies } = setup({ logLevel: 'error' });

    log.warn('no');
    log.error('yes');
    log.fatal('yes');
    expect(spies.warn).not.toHaveBeenCalled();
    expect(spies.error).toHaveBeenCalledTimes(2);
  });

  it('fatal is suppressed at logLevel "off"', () => {
    const { log, spies } = setup({ logLevel: 'off' });

    log.fatal('x');
    expect(spies.error).not.toHaveBeenCalled();
  });
});

// ─── Error serialization ─────────────────────────────────────────────────────

describe('Error serialization', () => {
  it('Error passed as first arg is serialized into context.err', () => {
    const { log, spies } = setup();

    log.error(new Error('boom'));

    const call = spies.error.mock.calls[0];
    const ctx = call[call.length - 2] as any;

    expect(ctx.err).toEqual(expect.objectContaining({ message: 'boom', name: 'Error' }));
  });

  it('custom Error subclass name is preserved', () => {
    class DatabaseError extends Error {
      constructor(msg: string) {
        super(msg);
        this.name = 'DatabaseError';
      }
    }

    const { log, spies } = setup();

    log.error(new DatabaseError('connection lost'));

    const ctx = spies.error.mock.calls[0][spies.error.mock.calls[0].length - 2] as any;

    expect(ctx.err.name).toBe('DatabaseError');
  });

  it('err is included in remote payload context', async () => {
    const handler = vi.fn();
    const { log } = setup({ remote: { handler, logLevel: 'debug' } });

    log.error(new Error('remote err'));
    await vi.waitFor(() =>
      expect(handler).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({
          context: expect.objectContaining({ err: expect.objectContaining({ message: 'remote err' }) }),
        }),
      ),
    );
  });
});

// ─── Remote Logging ───────────────────────────────────────────────────────────

describe('Remote Logging', () => {
  it('dispatches structured RemoteLogData above threshold', async () => {
    const handler = vi.fn();
    const { log } = setup({
      namespace: 'App',
      remote: { handler, logLevel: 'info' },
      timestamp: true,
    });

    log.debug('below threshold');
    await vi.waitFor(() => expect(handler).not.toHaveBeenCalled());

    log.info({ userId: 42 }, 'user action');
    await vi.waitFor(() =>
      expect(handler).toHaveBeenCalledWith(
        'info',
        expect.objectContaining({
          context: { userId: 42 },
          env: expect.stringMatching(/production|development/),
          level: 'info',
          message: 'user action',
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
    expect(spies.info).toHaveBeenCalled();
    await vi.waitFor(() => expect(handler).not.toHaveBeenCalled());

    log.warn('w');
    expect(spies.warn).toHaveBeenCalled();
    await vi.waitFor(() => expect(handler).toHaveBeenCalledWith('warn', expect.objectContaining({ message: 'w' })));
  });

  it('remote config can be updated dynamically', async () => {
    const handler = vi.fn();
    const { log } = setup({ remote: { handler, logLevel: 'error' } });

    log.warn('w1');
    await vi.waitFor(() => expect(handler).not.toHaveBeenCalled());

    log.setConfig({ remote: { handler, logLevel: 'warn' } });
    log.warn('w2');
    await vi.waitFor(() => expect(handler).toHaveBeenCalledWith('warn', expect.objectContaining({ message: 'w2' })));
  });

  it('omits context and timestamp from remote data when not configured', async () => {
    const handler = vi.fn();
    const { log } = setup({ remote: { handler, logLevel: 'debug' }, timestamp: false });

    log.info('msg');
    await vi.waitFor(() =>
      expect(handler).toHaveBeenCalledWith(
        'info',
        expect.objectContaining({ context: undefined, namespace: undefined, timestamp: undefined }),
      ),
    );
  });

  it('fires handler when only a handler is set — logLevel defaults to debug', async () => {
    const handler = vi.fn();
    const { log } = setup({ remote: { handler } });

    log.info('msg');
    await vi.waitFor(() => expect(handler).toHaveBeenCalledWith('info', expect.objectContaining({ message: 'msg' })));
  });

  it('warns when remote handler throws', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { log } = setup({
      remote: {
        handler: () => {
          throw new Error('remote boom');
        },
      },
    });

    log.info('msg');
    await vi.waitFor(() => expect(warnSpy).toHaveBeenCalledWith('[logit] remote handler error:', expect.any(Error)));
  });

  it('bindings are included in remote context', async () => {
    const handler = vi.fn();
    const { log } = setup({ remote: { handler, logLevel: 'debug' } });
    const req = log.withBindings({ requestId: 'xyz' });

    req.info('msg');
    await vi.waitFor(() =>
      expect(handler).toHaveBeenCalledWith(
        'info',
        expect.objectContaining({ context: expect.objectContaining({ requestId: 'xyz' }) }),
      ),
    );
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

  it('prefixes the label with [namespace] when set', () => {
    const { log, spies } = setup({ namespace: 'db' });

    log.time('query', () => {});
    expect(spies.time).toHaveBeenCalledWith('[db] query');
    expect(spies.timeEnd).toHaveBeenCalledWith('[db] query');
  });

  it('fn still runs and value is returned when logLevel is off', () => {
    const { log, spies } = setup({ logLevel: 'off' });
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

  it('groupCollapsed(label, fn) uses console.groupCollapsed', () => {
    const { log, spies } = setup();

    log.groupCollapsed('DETAILS', () => {});
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

  it('group stays active at info level', () => {
    const { log, spies } = setup({ logLevel: 'info' });
    const result = log.group('x', () => 'done');

    expect(result).toBe('done');
    expect(spies.group).toHaveBeenCalledOnce();
    expect(spies.groupEnd).toHaveBeenCalledOnce();
  });

  it('fn still runs and value is returned when suppressed at "off"', () => {
    const { log, spies } = setup({ logLevel: 'off' });
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

  it('adds namespace context using a group wrapper', () => {
    const { log, spies } = setup({ namespace: 'App' });

    log.table([{ id: 1 }]);
    expect(spies.group).toHaveBeenCalledWith('[App]');
    expect(spies.table).toHaveBeenCalledWith([{ id: 1 }], undefined);
    expect(spies.groupEnd).toHaveBeenCalledOnce();
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

  it('includes namespace prefix when set', () => {
    const { log, spies } = setup({ namespace: 'App' });

    log.assert(false, 'msg');
    expect(spies.assert).toHaveBeenCalledWith(false, '[App]', 'msg');
  });
});
