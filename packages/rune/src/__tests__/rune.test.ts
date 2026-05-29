import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Bindings, LogEntry, LogLevel, RuneOptions, Transport } from '../types';

import { lazy } from '../lazy';
import { createLogger, Rune } from '../logger';
import {
  PRIORITY,
  batchTransport,
  consoleTransport,
  jsonTransport,
  redactTransport,
  remoteTransport,
  sampleTransport,
} from '../transports';

/* ─── Test helpers ─── */

function createTestTransport(threshold: LogLevel = 'debug'): { entries: LogEntry[]; transport: Transport } {
  const entries: LogEntry[] = [];

  const transport: Transport = (entry) => {
    if (PRIORITY[threshold] <= PRIORITY[entry.level]) entries.push(entry);
  };

  return { entries, transport };
}

function setup(opts: Partial<RuneOptions> = {}, bindings: Bindings = {}) {
  const { entries, transport } = createTestTransport();
  const log = createLogger({ logLevel: 'debug', transports: [transport], ...opts }, bindings);

  return { entries, log };
}

afterEach(() => vi.restoreAllMocks());

/* ─── Construction & config ─── */

describe('construction and config', () => {
  it('supports namespace string shorthand', () => {
    const { transport } = createTestTransport();
    const log = createLogger({ transports: [transport] });

    expect(createLogger('MyApp').config.namespace).toBe('MyApp');
    expect(log.config.namespace).toBe('');
  });

  it('creates isolated instances with independent configs', () => {
    const a = createLogger({ logLevel: 'debug' });
    const b = createLogger({ logLevel: 'error' });

    expect(a.config.logLevel).toBe('debug');
    expect(b.config.logLevel).toBe('error');
  });

  it('applies defaults when options are omitted', () => {
    const { transport } = createTestTransport();
    const log = createLogger({ transports: [transport] });
    const cfg = log.config;

    expect(cfg.logLevel).toBe('debug');
    expect(cfg.namespace).toBe('');
    expect(cfg.env).toMatch(/^(production|development)$/);
    expect(cfg.transports).toHaveLength(1);
  });

  it('default Rune singleton exposes stable public API', () => {
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
    expect(typeof Rune.lazy).toBe('undefined'); // lazy is module-level, not on logger
  });

  it('config snapshot cannot mutate logger state', () => {
    const { log } = setup({ logLevel: 'warn' });
    const cfg = log.config as Record<string, unknown>;

    cfg['logLevel'] = 'debug';
    cfg['transports'] = [];

    expect(log.config.logLevel).toBe('warn');
    expect(log.config.transports).toHaveLength(1);
  });
});

/* ─── Emit & payload semantics ─── */

describe('emit and payload semantics', () => {
  it('message-only call places message last in entry', () => {
    const { entries, log } = setup();

    log.info('hello');

    expect(entries).toHaveLength(1);
    expect(entries[0].message).toBe('hello');
    expect(entries[0].context).toBeUndefined();
    expect(entries[0].level).toBe('info');
  });

  it('context + message call sets both fields', () => {
    const { entries, log } = setup();

    log.info({ requestId: 'abc' }, 'hello');

    expect(entries[0].context).toEqual({ requestId: 'abc' });
    expect(entries[0].message).toBe('hello');
  });

  it('context-only call sets context, message undefined', () => {
    const { entries, log } = setup();

    log.info({ status: 200 });

    expect(entries[0].context).toEqual({ status: 200 });
    expect(entries[0].message).toBeUndefined();
  });

  it('Error is serialized into context.err with message fallback', () => {
    const { entries, log } = setup();

    log.error(new Error('boom'));

    const ctx = entries[0].context as Record<string, unknown>;

    expect(ctx['err']).toMatchObject({ message: 'boom', name: 'Error' });
    expect(typeof (ctx['err'] as Record<string, unknown>)['stack']).toBe('string');
    expect(entries[0].message).toBe('boom');
  });

  it('Error with override message uses the override', () => {
    const { entries, log } = setup();

    log.error(new Error('original'), 'override');

    expect(entries[0].message).toBe('override');
  });

  it('throws for string-first call with a second argument', () => {
    const { log } = setup();

    expect(() => log.info('msg', { id: 1 } as never)).toThrow('string-first log calls accept only one argument');
  });

  it('throws for context-first call with a non-string second argument', () => {
    const { log } = setup();

    expect(() => log.info({ id: 1 }, { bad: true } as never)).toThrow(
      'context-first log calls require the optional second argument to be a string message',
    );
  });

  it('throws for Error-first call with a non-string second argument', () => {
    const { log } = setup();

    expect(() => log.error(new Error('e'), 123 as never)).toThrow('error override messages must be strings');
  });

  it('entry timestamp is a Date instance shared across transports', () => {
    const received: Date[] = [];
    const t1: Transport = (e) => received.push(e.timestamp);
    const t2: Transport = (e) => received.push(e.timestamp);
    const log = createLogger({ transports: [t1, t2] });

    log.info('x');

    expect(received[0]).toBeInstanceOf(Date);
    expect(received[0]).toBe(received[1]); // same object reference (R6)
  });
});

/* ─── Level gating ─── */

describe('level gating', () => {
  it('routes levels to correct console methods', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const log = createLogger({ logLevel: 'debug', transports: [consoleTransport({ timestamp: false })] });

    log.debug('d');
    log.info('i');
    log.warn('w');
    log.error('e');
    log.fatal('f');

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(2); // error + fatal both use console.error
  });

  it('suppresses entries below threshold in test transport', () => {
    const { entries, log } = setup({ logLevel: 'warn' });

    log.debug('no');
    log.info('no');
    log.warn('yes');
    log.error('yes');

    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.level)).toEqual(['warn', 'error']);
  });

  it('suppresses all entries at off', () => {
    const { entries, log } = setup({ logLevel: 'off' });

    log.debug('x');
    log.fatal('x');

    expect(entries).toHaveLength(0);
  });

  it('enabled() reflects configured threshold', () => {
    const { log } = setup({ logLevel: 'warn' });

    expect(log.enabled('fatal')).toBe(true);
    expect(log.enabled('error')).toBe(true);
    expect(log.enabled('warn')).toBe(true);
    expect(log.enabled('info')).toBe(false);
    expect(log.enabled('debug')).toBe(false);
  });
});

/* ─── Child, scope, and bindings composition ─── */

describe('child, scope, and bindings composition', () => {
  it('scope creates dotted namespace and does not mutate parent', () => {
    const { entries, log } = setup({ namespace: 'app' });

    log.scope('api').scope('auth').info('call');

    expect(entries[0].namespace).toBe('app.api.auth');
    expect(log.config.namespace).toBe('app');
  });

  it('scope from empty namespace produces single segment', () => {
    const { entries, log } = setup();

    log.scope('api').info('x');

    expect(entries[0].namespace).toBe('api');
  });

  it('child overrides selected fields and preserves others', () => {
    const parent = createLogger({ logLevel: 'warn', namespace: 'app' });
    const child = parent.child({ logLevel: 'debug' });

    expect(child.config.logLevel).toBe('debug');
    expect(child.config.namespace).toBe('app');
    expect(parent.config.logLevel).toBe('warn');
  });

  it('child inherits transports by default', () => {
    const { entries, transport } = createTestTransport();
    const parent = createLogger({ transports: [transport] });
    const child = parent.child({ logLevel: 'debug' });

    child.info('x');

    expect(entries).toHaveLength(1);
    expect(child.config.transports).toHaveLength(1);
  });

  it('child can replace transports by passing transports: []', () => {
    const { entries, transport } = createTestTransport();
    const parent = createLogger({ transports: [transport] });
    const child = parent.child({ transports: [] });

    child.info('x');

    expect(entries).toHaveLength(0);
  });

  it('child can add additional transports', () => {
    const a = createTestTransport();
    const b = createTestTransport();
    const parent = createLogger({ transports: [a.transport] });
    const child = parent.child({ transports: [a.transport, b.transport] });

    child.info('x');

    expect(a.entries).toHaveLength(1);
    expect(b.entries).toHaveLength(1);
  });

  it('withBindings pins context on every call', () => {
    const { entries, log } = setup();
    const reqLog = log.withBindings({ requestId: 'abc' });

    reqLog.info('hello');

    expect(entries[0].bindings).toEqual({ requestId: 'abc' });
    expect(entries[0].message).toBe('hello');
  });

  it('per-call context overrides colliding binding keys', () => {
    const { entries, log } = setup();
    const reqLog = log.withBindings({ requestId: 'base', source: 'api' });

    reqLog.info({ requestId: 'override' }, 'msg');

    expect(entries[0].bindings).toMatchObject({ requestId: 'base', source: 'api' });
    expect(entries[0].context).toEqual({ requestId: 'override' });
  });

  it('bindings getter returns a defensive snapshot', () => {
    const { log } = setup();
    const reqLog = log.withBindings({ a: 1 });
    const snap = reqLog.bindings as Record<string, unknown>;

    snap['a'] = 999;

    expect(reqLog.bindings).toEqual({ a: 1 });
  });

  it('withBindings stacks additively through chains', () => {
    const { entries, log } = setup();
    const base = log.withBindings({ service: 'api' });
    const req = base.withBindings({ requestId: 'xyz' });

    req.info('x');

    expect(entries[0].bindings).toMatchObject({ requestId: 'xyz', service: 'api' });
  });
});

/* ─── consoleTransport ─── */

describe('consoleTransport', () => {
  it('filters entries below its own level threshold', () => {
    const t = consoleTransport({ level: 'error', timestamp: false });
    const log = createLogger({ logLevel: 'debug', transports: [t] });
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    log.info('no');
    log.error('yes');

    expect(infoSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('respects timestamp: false', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const log = createLogger({
      namespace: 'ns',
      transports: [consoleTransport({ timestamp: false, variant: 'text' })],
    });

    log.error('msg');

    const call = errorSpy.mock.calls[0];

    // In Node (test runner), the prefix should not contain HH:MM:SS format
    const prefix = call[0] as string;

    expect(prefix).not.toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  it('includes namespace in output', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const log = createLogger({
      namespace: 'svc.api',
      transports: [consoleTransport({ timestamp: false, variant: 'text' })],
    });

    log.warn('x');

    expect(warnSpy.mock.calls[0][0]).toContain('svc.api');
  });
});

/* ─── remoteTransport ─── */

describe('remoteTransport', () => {
  it('forwards structured payload at or above threshold', async () => {
    const handler = vi.fn();
    const { entries, transport: testT } = createTestTransport();
    const log = createLogger({
      namespace: 'App',
      transports: [testT, remoteTransport(handler, { level: 'warn' })],
    });

    log.info('below');
    await vi.waitFor(() => expect(handler).not.toHaveBeenCalled());

    log.error({ id: 1 }, 'boom');
    await vi.waitFor(() =>
      expect(handler).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({
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
    const log = createLogger({ transports: [remoteTransport(handler)] }, { requestId: 'abc' });

    log.info({ route: '/users' }, 'request');

    await vi.waitFor(() =>
      expect(handler).toHaveBeenCalledWith(
        'info',
        expect.objectContaining({ context: { requestId: 'abc', route: '/users' } }),
      ),
    );
  });

  it('respects explicit env override', async () => {
    const handler = vi.fn();
    const log = createLogger({ transports: [remoteTransport(handler, { env: 'production' })] });

    log.info('x');

    await vi.waitFor(() =>
      expect(handler).toHaveBeenCalledWith('info', expect.objectContaining({ env: 'production' })),
    );
  });

  it('swallows handler errors to console.warn', async () => {
    const handler = vi.fn(() => {
      throw new Error('fail');
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const log = createLogger({ transports: [remoteTransport(handler)] });

    expect(() => log.error('x')).not.toThrow();

    await vi.waitFor(() => expect(warnSpy).toHaveBeenCalledWith('[rune] remote transport error:', expect.any(Error)));
  });

  it('timestamp field is full ISO string, not truncated', async () => {
    const handler = vi.fn();
    const log = createLogger({ transports: [remoteTransport(handler)] });

    log.info('x');

    await vi.waitFor(() => {
      const data = handler.mock.calls[0][1] as { timestamp: string };

      expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
});

/* ─── jsonTransport ─── */

describe('jsonTransport', () => {
  it('outputs valid NDJSON with level, time, and message', () => {
    const lines: string[] = [];
    const log = createLogger({ transports: [jsonTransport({ output: (l) => lines.push(l) })] });

    log.info('server started');

    expect(lines).toHaveLength(1);

    const record = JSON.parse(lines[0]) as Record<string, unknown>;

    expect(record['level']).toBe('info');
    expect(record['msg']).toBe('server started');
    expect(typeof record['time']).toBe('string');
  });

  it('includes namespace as ns field', () => {
    const lines: string[] = [];
    const log = createLogger({
      namespace: 'api',
      transports: [jsonTransport({ output: (l) => lines.push(l) })],
    });

    log.warn('slow');

    const record = JSON.parse(lines[0]) as Record<string, unknown>;

    expect(record['ns']).toBe('api');
  });

  it('merges bindings and context into the flat record', () => {
    const lines: string[] = [];
    const log = createLogger({ transports: [jsonTransport({ output: (l) => lines.push(l) })] }, { reqId: 'x' });

    log.info({ path: '/api' }, 'request');

    const record = JSON.parse(lines[0]) as Record<string, unknown>;

    expect(record['reqId']).toBe('x');
    expect(record['path']).toBe('/api');
  });

  it('filters below configured level', () => {
    const lines: string[] = [];
    const log = createLogger({ transports: [jsonTransport({ level: 'error', output: (l) => lines.push(l) })] });

    log.info('no');
    log.error('yes');

    expect(lines).toHaveLength(1);
  });
});

/* ─── batchTransport ─── */

describe('batchTransport', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('buffers entries and flushes on maxSize', () => {
    const flushed: LogEntry[][] = [];
    const batch = batchTransport({ maxSize: 2, onFlush: (entries) => flushed.push(entries) });
    const log = createLogger({ transports: [batch] });

    log.info('a');
    expect(flushed).toHaveLength(0);

    log.info('b');
    expect(flushed).toHaveLength(1);
    expect(flushed[0]).toHaveLength(2);
  });

  it('flushes on interval', () => {
    const flushed: LogEntry[][] = [];
    const batch = batchTransport({ interval: 1000, onFlush: (entries) => flushed.push(entries) });
    const log = createLogger({ transports: [batch] });

    log.info('x');
    expect(flushed).toHaveLength(0);

    vi.advanceTimersByTime(1000);

    expect(flushed).toHaveLength(1);
    expect(flushed[0][0].message).toBe('x');
  });

  it('dispose stops interval and flushes remaining', () => {
    const flushed: LogEntry[][] = [];
    const batch = batchTransport({ interval: 10_000, onFlush: (entries) => flushed.push(entries) });
    const log = createLogger({ transports: [batch] });

    log.info('final');
    batch.dispose();

    expect(flushed).toHaveLength(1);
    expect(flushed[0][0].message).toBe('final');

    // No more flushes after dispose
    vi.advanceTimersByTime(20_000);

    expect(flushed).toHaveLength(1);
  });

  it('flush() empties buffer without stopping the timer', () => {
    const flushed: LogEntry[][] = [];
    const batch = batchTransport({ interval: 5000, maxSize: 100, onFlush: (entries) => flushed.push(entries) });
    const log = createLogger({ transports: [batch] });

    log.info('a');
    log.info('b');
    batch.flush();

    expect(flushed).toHaveLength(1);
    expect(flushed[0]).toHaveLength(2);

    // Timer still running — interval fires later
    log.info('c');
    vi.advanceTimersByTime(5000);

    expect(flushed).toHaveLength(2);
  });

  it('filters below configured level', () => {
    const flushed: LogEntry[][] = [];
    const batch = batchTransport({ level: 'error', maxSize: 1, onFlush: (entries) => flushed.push(entries) });
    const log = createLogger({ transports: [batch] });

    log.info('no');
    log.error('yes');

    expect(flushed).toHaveLength(1);
    expect(flushed[0][0].level).toBe('error');
  });
});

/* ─── sampleTransport ─── */

describe('sampleTransport', () => {
  it('forwards at rate 1.0', () => {
    const { entries, transport } = createTestTransport();
    const sampled = sampleTransport({ rate: 1, transport });
    const log = createLogger({ transports: [sampled] });

    for (let i = 0; i < 10; i++) log.info('x');

    expect(entries).toHaveLength(10);
  });

  it('forwards none at rate 0.0', () => {
    const { entries, transport } = createTestTransport();
    const sampled = sampleTransport({ rate: 0, transport });
    const log = createLogger({ transports: [sampled] });

    for (let i = 0; i < 10; i++) log.info('x');

    expect(entries).toHaveLength(0);
  });

  it('forwards approximately the right proportion at rate 0.5', () => {
    const { entries, transport } = createTestTransport();
    const sampled = sampleTransport({ rate: 0.5, transport });
    const log = createLogger({ transports: [sampled] });

    for (let i = 0; i < 1000; i++) log.info('x');

    // With 1000 samples at 50% rate, expect between 350 and 650
    expect(entries.length).toBeGreaterThan(350);
    expect(entries.length).toBeLessThan(650);
  });
});

/* ─── redactTransport ─── */

describe('redactTransport', () => {
  it('replaces specified keys with [REDACTED] in context', () => {
    const { entries, transport } = createTestTransport();
    const redacted = redactTransport({ keys: ['password', 'token'], transport });
    const log = createLogger({ transports: [redacted] });

    log.info({ password: 'secret', user: 'alice' }, 'login');

    expect(entries[0].context).toEqual({ password: '[REDACTED]', user: 'alice' });
  });

  it('replaces specified keys in bindings', () => {
    const { entries, transport } = createTestTransport();
    const redacted = redactTransport({ keys: ['ssn'], transport });
    const log = createLogger({ transports: [redacted] }, { ssn: '123-45-6789', userId: 1 });

    log.info('profile');

    expect(entries[0].bindings).toEqual({ ssn: '[REDACTED]', userId: 1 });
  });

  it('recursively redacts nested fields', () => {
    const { entries, transport } = createTestTransport();
    const redacted = redactTransport({ keys: ['token'], transport });
    const log = createLogger({ transports: [redacted] });

    log.info({ auth: { token: 'secret', type: 'bearer' }, path: '/api' }, 'req');

    const ctx = entries[0].context as Record<string, Record<string, unknown>>;

    expect(ctx['auth']['token']).toBe('[REDACTED]');
    expect(ctx['auth']['type']).toBe('bearer');
    expect(ctx['path']).toBe('/api');
  });

  it('accepts a custom replacement value', () => {
    const { entries, transport } = createTestTransport();
    const redacted = redactTransport({ keys: ['secret'], replacement: '***', transport });
    const log = createLogger({ transports: [redacted] });

    log.info({ secret: 'abc' }, 'x');

    expect(entries[0].context).toEqual({ secret: '***' });
  });

  it('does not mutate the original entry', () => {
    const originals: LogEntry[] = [];
    const original: Transport = (e) => originals.push(e);
    const { entries: redactedEntries, transport: redactedT } = createTestTransport();
    const redacted = redactTransport({ keys: ['token'], transport: redactedT });

    const log = createLogger({ transports: [original, redacted] });

    log.info({ token: 'secret' }, 'x');

    expect((originals[0].context as Record<string, unknown>)['token']).toBe('secret');
    expect((redactedEntries[0].context as Record<string, unknown>)['token']).toBe('[REDACTED]');
  });
});

/* ─── Lazy bindings ─── */

describe('lazy bindings', () => {
  it('resolves the factory only when the entry is emitted', () => {
    const factory = vi.fn(() => 'expensive');
    const { entries, log } = setup();

    const boundLog = log.withBindings({ computed: lazy(factory) });

    expect(factory).not.toHaveBeenCalled();

    boundLog.info('x');

    expect(factory).toHaveBeenCalledTimes(1);
    expect(entries[0].bindings['computed']).toBe('expensive');
  });

  it('does not invoke factory when level is suppressed', () => {
    const factory = vi.fn(() => 'value');
    const { log } = setup({ logLevel: 'error' });
    const boundLog = log.withBindings({ expensive: lazy(factory) });

    boundLog.debug('x');
    boundLog.info('x');

    expect(factory).not.toHaveBeenCalled();
  });

  it('invokes factory on every emit that passes the level', () => {
    let count = 0;
    const { entries, log } = setup();
    const boundLog = log.withBindings({ tick: lazy(() => ++count) });

    boundLog.info('a');
    boundLog.info('b');

    expect(entries[0].bindings['tick']).toBe(1);
    expect(entries[1].bindings['tick']).toBe(2);
  });

  it('non-lazy bindings are passed through unchanged', () => {
    const { entries, log } = setup();
    const boundLog = log.withBindings({ a: 1, b: 'two' });

    boundLog.info('x');

    expect(entries[0].bindings).toEqual({ a: 1, b: 'two' });
  });
});

/* ─── time() ─── */

describe('time()', () => {
  it('emits a debug entry with duration_ms in context', () => {
    const { entries, log } = setup();

    const value = log.time('work', () => 42);

    expect(value).toBe(42);
    expect(entries).toHaveLength(1);
    expect(entries[0].level).toBe('debug');
    expect(entries[0].message).toBe('timer: work');
    expect(typeof (entries[0].context as Record<string, unknown>)['duration_ms']).toBe('number');
  });

  it('emits on async completion', async () => {
    const { entries, log } = setup();

    const value = await log.time('async-work', () => Promise.resolve('done'));

    expect(value).toBe('done');
    expect(entries[0].message).toBe('timer: async-work');
  });

  it('still emits when sync fn throws', () => {
    const { entries, log } = setup();

    expect(() =>
      log.time('fail', () => {
        throw new Error('boom');
      }),
    ).toThrow('boom');

    expect(entries).toHaveLength(1);
    expect(entries[0].message).toBe('timer: fail');
  });

  it('still emits when async fn rejects', async () => {
    const { entries, log } = setup();

    await expect(log.time('async-fail', () => Promise.reject(new Error('bad')))).rejects.toThrow('bad');

    expect(entries[0].message).toBe('timer: async-fail');
  });

  it('skips emit but still runs fn when logLevel is off', () => {
    const { entries, log } = setup({ logLevel: 'off' });

    const value = log.time('x', () => 99);

    expect(value).toBe(99);
    expect(entries).toHaveLength(0);
  });

  it('measures but suppresses debug entry when logLevel is above debug', () => {
    const { entries, log } = setup({ logLevel: 'info' });

    const value = log.time('task', () => 42);

    expect(value).toBe(42);
    expect(entries).toHaveLength(0); // debug entry gated by logLevel
  });

  it('flows through remoteTransport', async () => {
    const handler = vi.fn();
    const log = createLogger({ transports: [remoteTransport(handler)] });

    log.time('measured', () => {});

    await vi.waitFor(() =>
      expect(handler).toHaveBeenCalledWith(
        'debug',
        expect.objectContaining({
          context: expect.objectContaining({ duration_ms: expect.any(Number) }),
          message: 'timer: measured',
        }),
      ),
    );
  });
});

/* ─── group/groupCollapsed ─── */

describe('group and groupCollapsed', () => {
  it('wraps sync callback in console.group and closes it', () => {
    const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
    const endSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    const log = createLogger({ transports: [consoleTransport()] });

    const result = log.group('label', () => 'value');

    expect(result).toBe('value');
    expect(groupSpy).toHaveBeenCalledTimes(1);
    expect(endSpy).toHaveBeenCalledTimes(1);
  });

  it('wraps async callback and closes after resolution', async () => {
    const collapsedSpy = vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
    const endSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    const log = createLogger({ transports: [consoleTransport()] });

    await expect(log.groupCollapsed('async', async () => 'done')).resolves.toBe('done');

    expect(collapsedSpy).toHaveBeenCalledTimes(1);
    expect(endSpy).toHaveBeenCalledTimes(1);
  });

  it('closes group even when sync callback throws', () => {
    vi.spyOn(console, 'group').mockImplementation(() => {});

    const endSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    const log = createLogger({ transports: [consoleTransport()] });

    expect(() =>
      log.group('x', () => {
        throw new Error('boom');
      }),
    ).toThrow('boom');

    expect(endSpy).toHaveBeenCalledTimes(1);
  });

  it('closes group even when async callback rejects', async () => {
    vi.spyOn(console, 'group').mockImplementation(() => {});

    const endSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    const log = createLogger({ transports: [consoleTransport()] });

    await expect(log.group('x', () => Promise.reject(new Error('fail')))).rejects.toThrow('fail');

    expect(endSpy).toHaveBeenCalledTimes(1);
  });

  it('off bypasses group wrappers but still executes callback', async () => {
    const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
    const { log } = setup({ logLevel: 'off' });

    const sync = log.group('x', () => 1);
    const async_ = await log.groupCollapsed('y', async () => 2);

    expect(sync).toBe(1);
    expect(async_).toBe(2);
    expect(groupSpy).not.toHaveBeenCalled();
  });

  it('does not call console.group when no consoleTransport is configured', () => {
    const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
    const endSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    const { transport } = createTestTransport();
    const log = createLogger({ transports: [transport] });

    const result = log.group('label', () => 'value');

    expect(result).toBe('value');
    expect(groupSpy).not.toHaveBeenCalled();
    expect(endSpy).not.toHaveBeenCalled();
  });
});
