import { afterEach, describe, expect, it, vi } from 'vitest';

import { createLogger, Logit } from './logit';

function setup(opts = {}, bindings = {}) {
  const log = createLogger({ logLevel: 'debug', timestamp: false, ...opts }, bindings);
  const spies = {
    error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    group: vi.spyOn(console, 'group').mockImplementation(() => {}),
    groupCollapsed: vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {}),
    groupEnd: vi.spyOn(console, 'groupEnd').mockImplementation(() => {}),
    info: vi.spyOn(console, 'info').mockImplementation(() => {}),
    log: vi.spyOn(console, 'log').mockImplementation(() => {}),
    time: vi.spyOn(console, 'time').mockImplementation(() => {}),
    timeEnd: vi.spyOn(console, 'timeEnd').mockImplementation(() => {}),
    warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
  };

  return { log, spies };
}

afterEach(() => vi.restoreAllMocks());

describe('createLogger', () => {
  it('string shorthand sets the namespace', () => {
    expect(createLogger('MyApp').config.namespace).toBe('MyApp');
  });

  it('returns isolated instances', () => {
    const a = createLogger({ logLevel: 'debug' });
    const b = createLogger({ logLevel: 'error' });

    expect(a.config.logLevel).toBe('debug');
    expect(b.config.logLevel).toBe('error');
  });

  it('applies defaults', () => {
    const cfg = createLogger().config;

    expect(cfg.logLevel).toBe('debug');
    expect(cfg.timestamp).toBe(true);
    expect(cfg.variant).toBe('symbol');
    expect(cfg.namespace).toBe('');
  });

  it('Logit exposes v3 logger surface', () => {
    expect(typeof Logit.info).toBe('function');
    expect(typeof Logit.error).toBe('function');
    expect(typeof Logit.fatal).toBe('function');
    expect(typeof Logit.scope).toBe('function');
    expect(typeof Logit.child).toBe('function');
    expect(typeof Logit.withBindings).toBe('function');
    expect(typeof Logit.time).toBe('function');
    expect(typeof Logit.group).toBe('function');
    expect(typeof Logit.groupCollapsed).toBe('function');
  });
});

describe('call signature', () => {
  it('supports message-only form', () => {
    const { log, spies } = setup();

    log.info('hello');

    const call = spies.info.mock.calls[0];

    expect(call[call.length - 1]).toBe('hello');
  });

  it('supports context-first form', () => {
    const { log, spies } = setup();

    log.info({ requestId: 'abc' }, 'hello');

    const call = spies.info.mock.calls[0];

    expect(call[call.length - 2]).toEqual({ requestId: 'abc' });
    expect(call[call.length - 1]).toBe('hello');
  });

  it('serializes Error in error/fatal methods', () => {
    const { log, spies } = setup();

    log.error(new Error('boom'));
    log.fatal(new Error('fatal boom'));

    const errCtx = spies.error.mock.calls[0][spies.error.mock.calls[0].length - 2] as any;
    const fatalCtx = spies.error.mock.calls[1][spies.error.mock.calls[1].length - 2] as any;

    expect(errCtx.err.message).toBe('boom');
    expect(fatalCtx.err.message).toBe('fatal boom');
  });

  it('no-arg call is a no-op', () => {
    const { log, spies } = setup();

    log.info();

    expect(spies.info).not.toHaveBeenCalled();
  });
});

describe('level filtering', () => {
  it('routes each level to expected console method', () => {
    const { log, spies } = setup();

    log.debug('d');
    log.info('i');
    log.warn('w');
    log.error('e');
    log.fatal('f');

    expect(spies.log).toHaveBeenCalledTimes(1);
    expect(spies.info).toHaveBeenCalledTimes(1);
    expect(spies.warn).toHaveBeenCalledTimes(1);
    expect(spies.error).toHaveBeenCalledTimes(2);
  });

  it('suppresses logs below threshold', () => {
    const { log, spies } = setup({ logLevel: 'warn' });

    log.debug('no');
    log.info('no');
    log.warn('yes');

    expect(spies.log).not.toHaveBeenCalled();
    expect(spies.info).not.toHaveBeenCalled();
    expect(spies.warn).toHaveBeenCalledTimes(1);
  });

  it('off suppresses all log output', () => {
    const { log, spies } = setup({ logLevel: 'off' });

    log.debug('x');
    log.fatal('x');

    expect(spies.log).not.toHaveBeenCalled();
    expect(spies.error).not.toHaveBeenCalled();
  });

  it('enabled reflects threshold', () => {
    const { log } = setup({ logLevel: 'warn' });

    expect(log.enabled('fatal')).toBe(true);
    expect(log.enabled('error')).toBe(true);
    expect(log.enabled('warn')).toBe(true);
    expect(log.enabled('info')).toBe(false);
    expect(log.enabled('debug')).toBe(false);
  });
});

describe('scope, child, and bindings', () => {
  it('scope composes namespace and keeps parent unchanged', () => {
    const { log, spies } = setup({ namespace: 'app' });

    log.scope('api').info('call');

    expect(spies.info.mock.calls[0][0]).toContain('app.api');
    expect(log.config.namespace).toBe('app');
  });

  it('child overrides config and keeps parent immutable', () => {
    const parent = createLogger({ logLevel: 'warn', namespace: 'app' });
    const child = parent.child({ logLevel: 'debug', namespace: 'app.worker' });

    expect(parent.config.logLevel).toBe('warn');
    expect(child.config.logLevel).toBe('debug');
    expect(parent.config.namespace).toBe('app');
    expect(child.config.namespace).toBe('app.worker');
  });

  it('withBindings pins context for every call', () => {
    const { log, spies } = setup();

    const reqLog = log.withBindings({ requestId: 'abc' });

    reqLog.info('hello');

    const call = spies.info.mock.calls[0];

    expect(call[call.length - 2]).toEqual({ requestId: 'abc' });
    expect(call[call.length - 1]).toBe('hello');
  });

  it('withBindings merges with per-call context (call wins)', () => {
    const { log, spies } = setup();
    const reqLog = log.withBindings({ requestId: 'base', source: 'api' });

    reqLog.info({ requestId: 'override' }, 'msg');

    const ctx = spies.info.mock.calls[0][spies.info.mock.calls[0].length - 2] as any;

    expect(ctx.requestId).toBe('override');
    expect(ctx.source).toBe('api');
  });

  it('bindings snapshot is readonly copy', () => {
    const reqLog = createLogger().withBindings({ a: 1 });

    const snapshot = reqLog.bindings as any;

    snapshot.a = 2;

    expect(reqLog.bindings).toEqual({ a: 1 });
  });
});

describe('remote logging', () => {
  it('forwards structured data above remote threshold', async () => {
    const handler = vi.fn();
    const { log } = setup({
      namespace: 'App',
      remote: { handler, logLevel: 'warn' },
      timestamp: true,
    });

    log.info('no');
    await vi.waitFor(() => expect(handler).not.toHaveBeenCalled());

    log.error({ id: 1 }, 'boom');
    await vi.waitFor(() =>
      expect(handler).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({
          context: { id: 1 },
          env: expect.stringMatching(/production|development/),
          level: 'error',
          message: 'boom',
          namespace: 'App',
          timestamp: expect.any(String),
        }),
      ),
    );
  });

  it('remote defaults to debug when handler is set without logLevel', async () => {
    const handler = vi.fn();
    const { log } = setup({ remote: { handler } });

    log.debug('x');

    await vi.waitFor(() => expect(handler).toHaveBeenCalledTimes(1));
  });

  it('includes bindings in remote context', async () => {
    const handler = vi.fn();
    const { log } = setup({ remote: { handler } }, { requestId: 'abc' });

    log.info({ route: '/users' }, 'request');

    await vi.waitFor(() =>
      expect(handler).toHaveBeenCalledWith(
        'info',
        expect.objectContaining({
          context: { requestId: 'abc', route: '/users' },
        }),
      ),
    );
  });

  it('warns when remote handler throws', async () => {
    const handler = vi.fn(() => {
      throw new Error('fail');
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { log } = setup({ remote: { handler } });

    log.error('x');

    await vi.waitFor(() => expect(warn).toHaveBeenCalledWith('[logit] remote handler error:', expect.any(Error)));
  });
});

describe('timers and groups', () => {
  it('time wraps sync function and returns value', () => {
    const { log, spies } = setup({ namespace: 'App' });

    const value = log.time('work', () => 42);

    expect(value).toBe(42);
    expect(spies.time).toHaveBeenCalledWith('[App] work');
    expect(spies.timeEnd).toHaveBeenCalledWith('[App] work');
  });

  it('timeEnd executes when fn throws', () => {
    const { log, spies } = setup();

    expect(() =>
      log.time('work', () => {
        throw new Error('boom');
      }),
    ).toThrow('boom');

    expect(spies.time).toHaveBeenCalledWith('work');
    expect(spies.timeEnd).toHaveBeenCalledWith('work');
  });

  it('group closes on sync and async flows', async () => {
    const { log, spies } = setup();

    const result = log.group('sync', () => 'ok');

    expect(result).toBe('ok');
    expect(spies.group).toHaveBeenCalledTimes(1);
    expect(spies.groupEnd).toHaveBeenCalledTimes(1);

    await expect(log.groupCollapsed('async', async () => 'done')).resolves.toBe('done');
    expect(spies.groupCollapsed).toHaveBeenCalledTimes(1);
    expect(spies.groupEnd).toHaveBeenCalledTimes(2);
  });

  it('off suppresses timer/group wrappers but still executes fn', async () => {
    const { log, spies } = setup({ logLevel: 'off' });

    const sync = log.time('x', () => 1);
    const asyncValue = await log.group('x', async () => 2);

    expect(sync).toBe(1);
    expect(asyncValue).toBe(2);
    expect(spies.time).not.toHaveBeenCalled();
    expect(spies.group).not.toHaveBeenCalled();
    expect(spies.groupEnd).not.toHaveBeenCalled();
  });
});
