import { afterEach, describe, expect, it, vi } from 'vitest';

import { createLogger, Rune } from './rune';

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

describe('rune v3 logger', () => {
  describe('construction and config shape', () => {
    it('supports namespace string shorthand', () => {
      expect(createLogger('MyApp').config.namespace).toBe('MyApp');
    });

    it('creates isolated instances', () => {
      const a = createLogger({ logLevel: 'debug' });
      const b = createLogger({ logLevel: 'error' });

      expect(a.config.logLevel).toBe('debug');
      expect(b.config.logLevel).toBe('error');
    });

    it('applies defaults when options are omitted', () => {
      const cfg = createLogger().config;

      expect(cfg).toMatchObject({
        logLevel: 'debug',
        namespace: '',
        timestamp: true,
        variant: 'symbol',
      });
      expect(cfg.remote).toBeUndefined();
    });

    it('exposes stable public API on default instance', () => {
      expect(typeof Rune.debug).toBe('function');
      expect(typeof Rune.info).toBe('function');
      expect(typeof Rune.warn).toBe('function');
      expect(typeof Rune.error).toBe('function');
      expect(typeof Rune.fatal).toBe('function');
      expect(typeof Rune.child).toBe('function');
      expect(typeof Rune.scope).toBe('function');
      expect(typeof Rune.withBindings).toBe('function');
      expect(typeof Rune.time).toBe('function');
      expect(typeof Rune.group).toBe('function');
      expect(typeof Rune.groupCollapsed).toBe('function');
    });

    it('returns config snapshots that cannot mutate logger state', () => {
      const log = createLogger({ logLevel: 'warn', remote: { handler: vi.fn(), logLevel: 'error' } });
      const cfg = log.config as any;

      cfg.logLevel = 'debug';
      cfg.remote.logLevel = 'debug';

      expect(log.config.logLevel).toBe('warn');
      expect(log.config.remote?.logLevel).toBe('error');
    });
  });

  describe('emit call forms and payload semantics', () => {
    it('supports message-only calls', () => {
      const { log, spies } = setup();

      log.info('hello');

      const call = spies.info.mock.calls[0];

      expect(call[call.length - 1]).toBe('hello');
    });

    it('supports context + message calls', () => {
      const { log, spies } = setup();

      log.info({ requestId: 'abc' }, 'hello');

      const call = spies.info.mock.calls[0];

      expect(call[call.length - 2]).toEqual({ requestId: 'abc' });
      expect(call[call.length - 1]).toBe('hello');
    });

    it('serializes Error context and keeps override message when provided', () => {
      const { log, spies } = setup();

      log.error(new Error('boom'), 'override');

      const call = spies.error.mock.calls[0];
      const ctx = call[call.length - 2] as any;

      expect(ctx.err).toEqual(expect.objectContaining({ message: 'boom', name: 'Error' }));
      expect(typeof ctx.err.stack).toBe('string');
      expect(call[call.length - 1]).toBe('override');
    });

    it('does not emit for no-arg log calls', () => {
      const { log, spies } = setup();

      log.info();

      expect(spies.info).not.toHaveBeenCalled();
    });

    it('throws for invalid string-first structured calls instead of dropping context', () => {
      const { log } = setup();

      expect(() => log.info('user created', { id: 1 } as never)).toThrow(
        'string-first log calls accept only one argument',
      );
    });

    it('throws when context-first calls pass a non-string message', () => {
      const { log } = setup();

      expect(() => log.info({ id: 1 }, { bad: true } as never)).toThrow(
        'context-first log calls require the optional second argument to be a string message',
      );
    });

    it('uses selected variant and includes namespace in prefix', () => {
      const { log, spies } = setup({ namespace: 'svc.api', variant: 'text' });

      log.warn('x');

      expect(spies.warn.mock.calls[0][0]).toContain('WARN');
      expect(spies.warn.mock.calls[0][0]).toContain('svc.api');
    });
  });

  describe('level gating and routing', () => {
    it('routes levels to expected console methods', () => {
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

    it('suppresses below threshold', () => {
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

    it('suppresses all log lines at off', () => {
      const { log, spies } = setup({ logLevel: 'off' });

      log.debug('x');
      log.fatal('x');

      expect(spies.log).not.toHaveBeenCalled();
      expect(spies.error).not.toHaveBeenCalled();
    });

    it('enabled reflects configured threshold', () => {
      const { log } = setup({ logLevel: 'warn' });

      expect(log.enabled('fatal')).toBe(true);
      expect(log.enabled('error')).toBe(true);
      expect(log.enabled('warn')).toBe(true);
      expect(log.enabled('info')).toBe(false);
      expect(log.enabled('debug')).toBe(false);
    });
  });

  describe('child, scope, and bindings composition', () => {
    it('scope creates dotted namespace without mutating parent', () => {
      const { log, spies } = setup({ namespace: 'app' });

      log.scope('api').scope('auth').info('call');

      expect(spies.info.mock.calls[0][0]).toContain('app.api.auth');
      expect(log.config.namespace).toBe('app');
    });

    it('child overrides selected fields and preserves others', () => {
      const parent = createLogger({ logLevel: 'warn', namespace: 'app', timestamp: false, variant: 'symbol' });
      const child = parent.child({ logLevel: 'debug' });

      expect(child.config.logLevel).toBe('debug');
      expect(child.config.namespace).toBe('app');
      expect(child.config.timestamp).toBe(false);
      expect(child.config.variant).toBe('symbol');
      expect(parent.config.logLevel).toBe('warn');
    });

    it('child can disable inherited remote config by passing remote: null', async () => {
      vi.spyOn(console, 'info').mockImplementation(() => {});

      const handler = vi.fn();
      const parent = createLogger({ remote: { handler } });
      const child = parent.child({ remote: null });

      child.info('x');
      await Promise.resolve();

      expect(handler).not.toHaveBeenCalled();
      expect(child.config.remote).toBeUndefined();
      expect(parent.config.remote).toBeDefined();
    });

    it('child can override only remote.logLevel while inheriting parent handler', async () => {
      vi.spyOn(console, 'info').mockImplementation(() => {});
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      const handler = vi.fn();
      const parent = createLogger({ remote: { handler, logLevel: 'error' } });
      const child = parent.child({ remote: { logLevel: 'warn' } });

      child.info('no');
      await Promise.resolve();
      expect(handler).not.toHaveBeenCalled();

      child.warn('yes');
      await vi.waitFor(() => expect(handler).toHaveBeenCalledTimes(1));

      expect(child.config.remote?.logLevel).toBe('warn');
    });

    it('child can replace inherited remote handler', async () => {
      vi.spyOn(console, 'info').mockImplementation(() => {});

      const oldHandler = vi.fn();
      const newHandler = vi.fn();
      const parent = createLogger({ remote: { handler: oldHandler, logLevel: 'error' } });
      const child = parent.child({ remote: { handler: newHandler, logLevel: 'debug' } });

      child.info('x');
      await vi.waitFor(() => expect(newHandler).toHaveBeenCalledTimes(1));
      expect(oldHandler).not.toHaveBeenCalled();
    });

    it('withBindings pins context on all calls', () => {
      const { log, spies } = setup();
      const reqLog = log.withBindings({ requestId: 'abc' });

      reqLog.info('hello');

      const call = spies.info.mock.calls[0];

      expect(call[call.length - 2]).toEqual({ requestId: 'abc' });
      expect(call[call.length - 1]).toBe('hello');
    });

    it('per-call context overrides colliding binding keys', () => {
      const { log, spies } = setup();
      const reqLog = log.withBindings({ requestId: 'base', source: 'api' });

      reqLog.info({ requestId: 'override' }, 'msg');

      const ctx = spies.info.mock.calls[0][spies.info.mock.calls[0].length - 2] as any;

      expect(ctx.requestId).toBe('override');
      expect(ctx.source).toBe('api');
    });

    it('bindings getter returns a defensive snapshot', () => {
      const reqLog = createLogger().withBindings({ a: 1 });
      const snapshot = reqLog.bindings as any;

      snapshot.a = 2;

      expect(reqLog.bindings).toEqual({ a: 1 });
    });
  });

  describe('remote forwarding behavior', () => {
    it('throws when remote.logLevel is configured without any handler', () => {
      expect(() => createLogger({ remote: { logLevel: 'warn' } })).toThrow(
        '[rune] remote.logLevel requires a remote.handler (or inherited handler via child())',
      );
    });

    it('forwards structured payload only at/above remote threshold', async () => {
      const handler = vi.fn();
      const { log } = setup({
        namespace: 'App',
        remote: { handler, logLevel: 'warn' },
        timestamp: true,
      });

      log.info('below');
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

    it('includes merged bindings in remote context', async () => {
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

    it('omits namespace and timestamp when unset/disabled', async () => {
      const handler = vi.fn();
      const { log } = setup({ remote: { handler }, timestamp: false });

      log.info('x');

      await vi.waitFor(() =>
        expect(handler).toHaveBeenCalledWith(
          'info',
          expect.objectContaining({ namespace: undefined, timestamp: undefined }),
        ),
      );
    });

    it('warns and does not throw when remote handler fails', async () => {
      const handler = vi.fn(() => {
        throw new Error('fail');
      });
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { log } = setup({ remote: { handler } });

      expect(() => log.error('x')).not.toThrow();

      await vi.waitFor(() => expect(warnSpy).toHaveBeenCalledWith('[rune] remote handler error:', expect.any(Error)));
    });
  });

  describe('time and group wrappers', () => {
    it('time wraps sync function and returns value', () => {
      const { log, spies } = setup({ namespace: 'App' });

      const value = log.time('work', () => 42);

      expect(value).toBe(42);
      expect(spies.time).toHaveBeenCalledWith('[App] work');
      expect(spies.timeEnd).toHaveBeenCalledWith('[App] work');
    });

    it('timeEnd runs when wrapped sync function throws', () => {
      const { log, spies } = setup();

      expect(() =>
        log.time('work', () => {
          throw new Error('boom');
        }),
      ).toThrow('boom');

      expect(spies.time).toHaveBeenCalledWith('work');
      expect(spies.timeEnd).toHaveBeenCalledWith('work');
    });

    it('timeEnd runs when wrapped async function rejects', async () => {
      const { log, spies } = setup();

      await expect(log.time('async-work', () => Promise.reject(new Error('fail')))).rejects.toThrow('fail');

      expect(spies.time).toHaveBeenCalledWith('async-work');
      expect(spies.timeEnd).toHaveBeenCalledWith('async-work');
    });

    it('group and groupCollapsed close correctly for sync and async callbacks', async () => {
      const { log, spies } = setup();

      const sync = log.group('sync', () => 'ok');

      expect(sync).toBe('ok');
      expect(spies.group).toHaveBeenCalledTimes(1);
      expect(spies.groupEnd).toHaveBeenCalledTimes(1);

      await expect(log.groupCollapsed('async', async () => 'done')).resolves.toBe('done');
      expect(spies.groupCollapsed).toHaveBeenCalledTimes(1);
      expect(spies.groupEnd).toHaveBeenCalledTimes(2);
    });

    it('groupEnd runs when grouped async callback rejects', async () => {
      const { log, spies } = setup();

      await expect(log.group('x', () => Promise.reject(new Error('fail')))).rejects.toThrow('fail');

      expect(spies.group).toHaveBeenCalledTimes(1);
      expect(spies.groupEnd).toHaveBeenCalledTimes(1);
    });

    it('off bypasses timer/group wrappers but still executes callback', async () => {
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
});
