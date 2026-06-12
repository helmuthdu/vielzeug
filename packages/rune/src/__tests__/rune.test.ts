import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LogEntry, LogLevel, LogMiddleware, RuneOptions, Transport } from '../types';

import { lazy } from '../lazy';
import { createLogger, Rune } from '../logger';
import {
  batchTransport,
  consoleTransport,
  jsonTransport,
  pipe,
  redactTransport,
  remoteTransport,
  sampleTransport,
} from '../transports';
import { isLevelEnabled, PRIORITY } from '../types';

/* ─── Test helpers ─── */

function createTestTransport(threshold: LogLevel = 'debug'): { entries: LogEntry[]; transport: Transport } {
  const entries: LogEntry[] = [];

  const transport: Transport = (entry) => {
    if (PRIORITY[threshold] <= PRIORITY[entry.level]) entries.push(entry);
  };

  return { entries, transport };
}

function setup(opts: Partial<RuneOptions> = {}) {
  const { entries, transport } = createTestTransport();
  const log = createLogger({ logLevel: 'debug', transports: [transport], ...opts });

  return { entries, log };
}

afterEach(() => vi.restoreAllMocks());

/* ─── Construction & config ─── */

describe('construction and config', () => {
  it('supports namespace string shorthand', () => {
    expect(createLogger('MyApp').config.namespace).toBe('MyApp');
    expect(createLogger().config.namespace).toBe('');
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
    expect(cfg.transports).toHaveLength(1);
    expect(cfg.middleware).toEqual([]);
  });

  it('default Rune singleton exposes stable public API', () => {
    expect(typeof Rune.debug).toBe('function');
    expect(typeof Rune.info).toBe('function');
    expect(typeof Rune.warn).toBe('function');
    expect(typeof Rune.error).toBe('function');
    expect(typeof Rune.fatal).toBe('function');
    expect(typeof Rune.child).toBe('function');
    expect(typeof Rune.withBindings).toBe('function');
    expect(typeof Rune.time).toBe('function');
    expect(typeof Rune.group).toBe('function');
    expect(typeof Rune.groupCollapsed).toBe('function');
    expect(typeof Rune.use).toBe('function');
  });

  it('config snapshot cannot mutate logger state', () => {
    const { log } = setup({ logLevel: 'warn' });
    const cfg = log.config as Record<string, unknown>;

    cfg['logLevel'] = 'debug';
    cfg['transports'] = [];

    expect(log.config.logLevel).toBe('warn');
    expect(log.config.transports).toHaveLength(1);
  });

  it('config does not include env field', () => {
    const { log } = setup();

    expect('env' in log.config).toBe(false);
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

  it('Error with context object merges serialized error and context', () => {
    const { entries, log } = setup();

    log.error(new Error('fail'), { requestId: 'abc' }, 'request failed');

    const ctx = entries[0].context as Record<string, unknown>;

    expect(ctx['err']).toMatchObject({ message: 'fail', name: 'Error' });
    expect(ctx['requestId']).toBe('abc');
    expect(entries[0].message).toBe('request failed');
  });

  it('invalid second arg is coerced to string — does not throw', () => {
    const { entries, log } = setup();

    expect(() => log.info('msg' as any, { id: 1 } as never)).not.toThrow();
    expect(() => log.info({ id: 1 }, { bad: true } as never)).not.toThrow();
    expect(() => log.error(new Error('e'), 123 as never)).not.toThrow();

    // coerced values are used as messages
    expect(entries[0].message).toBe('msg');
    expect(entries[1].message).toBe('[object Object]');
    expect(entries[2].message).toBe('123');
  });

  it('entry timestamp is a Date instance shared across transports', () => {
    const received: Date[] = [];
    const t1: Transport = (e) => received.push(e.timestamp);
    const t2: Transport = (e) => received.push(e.timestamp);
    const log = createLogger({ transports: [t1, t2] });

    log.info('x');

    expect(received[0]).toBeInstanceOf(Date);
    expect(received[0]).toBe(received[1]); // same object reference
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

/* ─── Child and bindings composition ─── */

describe('child and bindings composition', () => {
  it('child with explicit namespace creates isolated sub-logger', () => {
    const { entries, log } = setup({ namespace: 'app' });

    log.child({ namespace: '/app.api.auth' }).info('call');

    expect(entries[0].namespace).toBe('app.api.auth');
    expect(log.config.namespace).toBe('app');
  });

  it('child with namespace from empty parent uses the given value', () => {
    const { entries, log } = setup();

    log.child({ namespace: 'api' }).info('x');

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

/* ─── onTransportError ─── */

describe('onTransportError', () => {
  it('calls onTransportError with error, entry, and transport index instead of crashing', () => {
    const errors: Array<{ error: unknown; index: number }> = [];
    const boom: Transport = () => {
      throw new Error('transport fail');
    };
    const log = createLogger({
      onTransportError: (error, _entry, index) => errors.push({ error, index }),
      transports: [boom],
    });

    expect(() => log.info('x')).not.toThrow();
    expect(errors).toHaveLength(1);
    expect(errors[0].index).toBe(0);
    expect(errors[0].error).toBeInstanceOf(Error);
  });

  it('defaults to console.warn when onTransportError is not provided', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const boom: Transport = () => {
      throw new Error('fail');
    };
    const log = createLogger({ transports: [boom] });

    log.info('x');

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('transport'), expect.any(Error));
  });
});

/* ─── Middleware (use()) ─── */

describe('middleware via use()', () => {
  it('transforms entries before dispatch', () => {
    const { entries, log } = setup();
    const enriched = log.use((entry) => ({ ...entry, message: `[enriched] ${entry.message}` }));

    enriched.info('hello');

    expect(entries[0].message).toBe('[enriched] hello');
  });

  it('returning null from middleware drops the entry', () => {
    const { entries, log } = setup();
    const filtered = log.use((entry) => (entry.level === 'debug' ? null : entry));

    filtered.debug('dropped');
    filtered.info('kept');

    expect(entries).toHaveLength(1);
    expect(entries[0].message).toBe('kept');
  });

  it('middleware stacks additively via use() chain', () => {
    const { entries, log } = setup();
    const a = log.use((entry) => ({ ...entry, message: `A:${entry.message}` }));
    const b = a.use((entry) => ({ ...entry, message: `B:${entry.message}` }));

    b.info('msg');

    expect(entries[0].message).toBe('B:A:msg');
  });

  it('child inherits middleware by default', () => {
    const { entries, log } = setup();
    const base = log.use((entry) => ({ ...entry, message: `[base] ${entry.message}` }));
    const child = base.child({ logLevel: 'debug' });

    child.info('hello');

    expect(entries[0].message).toBe('[base] hello');
  });

  it('parent is not affected by use() on child', () => {
    const { entries, log } = setup();

    log.use((entry) => ({ ...entry, message: `mutated` }));

    log.info('original');

    expect(entries[0].message).toBe('original');
  });

  it('can add tracing context via middleware', () => {
    const { entries, log } = setup();
    const mw: LogMiddleware = (entry) => ({
      ...entry,
      bindings: { ...entry.bindings, traceId: 'trace-123' },
    });
    const traced = log.use(mw);

    traced.info('request');

    expect(entries[0].bindings['traceId']).toBe('trace-123');
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
      transports: [consoleTransport({ timestamp: false })],
    });

    log.error('msg');

    const prefix = errorSpy.mock.calls[0][0] as string;

    expect(prefix).not.toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  it('includes namespace in output', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const log = createLogger({
      namespace: 'svc.api',
      transports: [consoleTransport({ timestamp: false })],
    });

    log.warn('x');

    expect(warnSpy.mock.calls[0][0]).toContain('svc.api');
  });

  it('deep-merges custom theme: only specified fields replace defaults (R6)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Pass only badge — other fields (bg, border, color) should stay from DEFAULT_THEME
    const log = createLogger({
      transports: [consoleTransport({ theme: { warn: { badge: '⚡' } } })],
    });

    log.warn('themed');

    // The badge '⚡' should appear in the output prefix
    const prefix = warnSpy.mock.calls[0][0] as string;

    expect(prefix).toContain('⚡');
  });

  it('group() reads resolved theme from RuneOptions.theme (R1)', () => {
    const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});

    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

    const log = createLogger({
      theme: { group: { badge: '📦' } },
    });

    log.group('deploy', () => {});

    const prefix = groupSpy.mock.calls[0][0] as string;

    expect(prefix).toContain('📦');
  });
});

/* ─── remoteTransport ─── */

describe('remoteTransport', () => {
  it('forwards structured payload at or above threshold', async () => {
    const handler = vi.fn();
    const log = createLogger({
      namespace: 'App',
      transports: [remoteTransport({ handler, level: 'warn' })],
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
    const log = createLogger({ bindings: { requestId: 'abc' }, transports: [remoteTransport({ handler })] });

    log.info({ route: '/users' }, 'request');

    await vi.waitFor(() =>
      expect(handler).toHaveBeenCalledWith(
        'info',
        expect.objectContaining({ context: { requestId: 'abc', route: '/users' } }),
      ),
    );
  });

  it('calls onError callback when handler throws (R3)', async () => {
    const errors: Array<{ err: unknown }> = [];
    const handler = vi.fn(() => Promise.reject(new Error('delivery failed')));
    const log = createLogger({
      transports: [
        remoteTransport({
          handler,
          onError: (err) => errors.push({ err }),
        }),
      ],
    });

    log.info('x');

    await vi.waitFor(() => expect(errors).toHaveLength(1));
    expect(errors[0].err).toBeInstanceOf(Error);
  });

  it('respects explicit env override', async () => {
    const handler = vi.fn();
    const log = createLogger({ transports: [remoteTransport({ env: 'production', handler })] });

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
    const log = createLogger({ transports: [remoteTransport({ handler })] });

    expect(() => log.error('x')).not.toThrow();

    await vi.waitFor(() =>
      expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/^\[@vielzeug\/rune\] remote transport error:/)),
    );
  });

  it('timestamp field is full ISO string, not truncated', async () => {
    const handler = vi.fn();
    const log = createLogger({ transports: [remoteTransport({ handler })] });

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
    const log = createLogger({
      bindings: { reqId: 'x' },
      transports: [jsonTransport({ output: (l) => lines.push(l) })],
    });

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

  it('uses custom field names when fields option is provided (F4)', () => {
    const lines: string[] = [];
    const log = createLogger({
      namespace: 'svc',
      transports: [
        jsonTransport({
          fields: { level: 'severity', msg: 'message', ns: 'service', time: 'timestamp' },
          output: (l) => lines.push(l),
        }),
      ],
    });

    log.warn('started');

    const record = JSON.parse(lines[0]) as Record<string, unknown>;

    expect(record['severity']).toBe('warn');
    expect(record['message']).toBe('started');
    expect(record['service']).toBe('svc');
    expect(typeof record['timestamp']).toBe('string');
    // default field names should NOT appear
    expect('level' in record).toBe(false);
    expect('msg' in record).toBe(false);
  });
});

/* ─── batchTransport ─── */

describe('batchTransport', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('buffers entries and flushes on maxSize', async () => {
    const flushed: LogEntry[][] = [];
    const batch = batchTransport({
      maxSize: 2,
      onFlush: (entries) => {
        flushed.push(entries);
      },
    });
    const log = createLogger({ transports: [batch] });

    log.info('a');
    expect(flushed).toHaveLength(0);

    log.info('b');
    // flush is async (Promise.resolve().then()) — drain the microtask queue
    await Promise.resolve();
    expect(flushed).toHaveLength(1);
    expect(flushed[0]).toHaveLength(2);
  });

  it('flushes on interval', async () => {
    const flushed: LogEntry[][] = [];
    const batch = batchTransport({
      interval: 1000,
      onFlush: (entries) => {
        flushed.push(entries);
      },
    });
    const log = createLogger({ transports: [batch] });

    log.info('x');
    expect(flushed).toHaveLength(0);

    vi.advanceTimersByTime(1000);
    await Promise.resolve();

    expect(flushed).toHaveLength(1);
    expect(flushed[0][0].message).toBe('x');
  });

  it('dispose stops interval and flushes remaining', async () => {
    const flushed: LogEntry[][] = [];
    const batch = batchTransport({
      interval: 10_000,
      onFlush: (entries) => {
        flushed.push(entries);
      },
    });
    const log = createLogger({ transports: [batch] });

    log.info('final');
    batch.dispose();
    await Promise.resolve();

    expect(flushed).toHaveLength(1);
    expect(flushed[0][0].message).toBe('final');

    vi.advanceTimersByTime(20_000);
    await Promise.resolve();

    expect(flushed).toHaveLength(1);
  });

  it('flush() empties buffer without stopping the timer', async () => {
    const flushed: LogEntry[][] = [];
    const batch = batchTransport({
      interval: 5000,
      maxSize: 100,
      onFlush: (entries) => {
        flushed.push(entries);
      },
    });
    const log = createLogger({ transports: [batch] });

    log.info('a');
    log.info('b');
    batch.flush();
    await Promise.resolve();

    expect(flushed).toHaveLength(1);
    expect(flushed[0]).toHaveLength(2);

    log.info('c');
    vi.advanceTimersByTime(5000);
    await Promise.resolve();

    expect(flushed).toHaveLength(2);
  });

  it('filters below configured level', async () => {
    const flushed: LogEntry[][] = [];
    const batch = batchTransport({
      level: 'error',
      maxSize: 1,
      onFlush: (entries) => {
        flushed.push(entries);
      },
    });
    const log = createLogger({ transports: [batch] });

    log.info('no');
    log.error('yes');
    await Promise.resolve();

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

    expect(entries.length).toBeGreaterThan(350);
    expect(entries.length).toBeLessThan(650);
  });

  it('filters below configured level before sampling', () => {
    const { entries, transport } = createTestTransport();
    const sampled = sampleTransport({ level: 'error', rate: 1, transport });
    const log = createLogger({ transports: [sampled] });

    log.info('no');
    log.error('yes');

    expect(entries).toHaveLength(1);
    expect(entries[0].level).toBe('error');
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
    const log = createLogger({ bindings: { ssn: '123-45-6789', userId: 1 }, transports: [redacted] });

    log.info('profile');

    expect(entries[0].bindings).toEqual({ ssn: '[REDACTED]', userId: 1 });
  });

  it('recursively redacts nested object fields', () => {
    const { entries, transport } = createTestTransport();
    const redacted = redactTransport({ keys: ['token'], transport });
    const log = createLogger({ transports: [redacted] });

    log.info({ auth: { token: 'secret', type: 'bearer' }, path: '/api' }, 'req');

    const ctx = entries[0].context as Record<string, Record<string, unknown>>;

    expect(ctx['auth']['token']).toBe('[REDACTED]');
    expect(ctx['auth']['type']).toBe('bearer');
  });

  it('recursively redacts fields inside arrays', () => {
    const { entries, transport } = createTestTransport();
    const redacted = redactTransport({ keys: ['token'], transport });
    const log = createLogger({ transports: [redacted] });

    log.info(
      {
        users: [
          { id: 1, token: 'secret' },
          { id: 2, token: 'also-secret' },
        ],
      },
      'users',
    );

    const ctx = entries[0].context as Record<string, Array<Record<string, unknown>>>;

    expect(ctx['users'][0]['token']).toBe('[REDACTED]');
    expect(ctx['users'][1]['token']).toBe('[REDACTED]');
    expect(ctx['users'][0]['id']).toBe(1);
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
  it('emits a debug entry with duration_ms in context and label as message (R7)', () => {
    const { entries, log } = setup();

    const value = log.time('work', () => 42);

    expect(value).toBe(42);
    expect(entries).toHaveLength(1);
    expect(entries[0].level).toBe('debug');
    expect(entries[0].message).toBe('work');
    expect(typeof (entries[0].context as Record<string, unknown>)['duration_ms']).toBe('number');
    // label is now the message — not in context
    expect('label' in (entries[0].context ?? {})).toBe(false);
  });

  it('emits on async completion', async () => {
    const { entries, log } = setup();

    const value = await log.time('async-work', () => Promise.resolve('done'));

    expect(value).toBe('done');
    expect(entries[0].message).toBe('async-work');
    expect(typeof (entries[0].context as Record<string, unknown>)['duration_ms']).toBe('number');
  });

  it('still emits when sync fn throws', () => {
    const { entries, log } = setup();

    expect(() =>
      log.time('fail', () => {
        throw new Error('boom');
      }),
    ).toThrow('boom');

    expect(entries).toHaveLength(1);
    expect(entries[0].message).toBe('fail');
  });

  it('still emits and re-throws when async fn rejects', async () => {
    const { entries, log } = setup();

    await expect(log.time('async-fail', () => Promise.reject(new Error('bad')))).rejects.toThrow('bad');

    expect(entries[0].message).toBe('async-fail');
    expect(typeof (entries[0].context as Record<string, unknown>)['duration_ms']).toBe('number');
  });

  it('skips emit but still runs fn when logLevel is off', () => {
    const { entries, log } = setup({ logLevel: 'off' });

    const value = log.time('x', () => 99);

    expect(value).toBe(99);
    expect(entries).toHaveLength(0);
  });

  it('suppresses debug entry when logLevel is above debug', () => {
    const { entries, log } = setup({ logLevel: 'info' });

    const value = log.time('task', () => 42);

    expect(value).toBe(42);
    expect(entries).toHaveLength(0);
  });

  it('accepts a custom level — emits at info level', () => {
    const { entries, log } = setup({ logLevel: 'info' });

    log.time('task', () => {}, 'info');

    expect(entries).toHaveLength(1);
    expect(entries[0].level).toBe('info');
  });

  it('flows through remoteTransport', async () => {
    const handler = vi.fn();
    const log = createLogger({ transports: [remoteTransport({ handler })] });

    log.time('measured', () => {});

    await vi.waitFor(() =>
      expect(handler).toHaveBeenCalledWith(
        'debug',
        expect.objectContaining({
          context: expect.objectContaining({ duration_ms: expect.any(Number) }),
          message: 'measured',
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

  it('always calls console.group even without a consoleTransport (R1 behavior)', () => {
    const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
    const endSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    const { transport } = createTestTransport();
    const log = createLogger({ transports: [transport] });

    const result = log.group('label', () => 'value');

    expect(result).toBe('value');
    expect(groupSpy).toHaveBeenCalledTimes(1);
    expect(endSpy).toHaveBeenCalledTimes(1);
  });
});

/* ─── New features: R5 / F1 / F2 / F5 ─── */

describe('createLogger bindings option (R5)', () => {
  it('accepts bindings in options object', () => {
    const { entries, transport } = createTestTransport();
    const log = createLogger({ bindings: { service: 'api' }, transports: [transport] });

    log.info('started');

    expect(entries[0].bindings).toEqual({ service: 'api' });
  });

  it('child merges bindings from parent and override', () => {
    const { entries, transport } = createTestTransport();
    const parent = createLogger({ bindings: { service: 'api' }, transports: [transport] });
    const child = parent.child({ bindings: { requestId: 'abc' } });

    child.info('x');

    expect(entries[0].bindings).toMatchObject({ requestId: 'abc', service: 'api' });
  });
});

describe('now option for deterministic timestamps (F1)', () => {
  it('uses the provided now() factory instead of new Date()', () => {
    const fixed = new Date('2025-01-01T00:00:00.000Z');
    const { entries, transport } = createTestTransport();
    const log = createLogger({ now: () => fixed, transports: [transport] });

    log.info('event');

    expect(entries[0].timestamp).toBe(fixed);
  });

  it('child inherits now from parent', () => {
    const fixed = new Date('2025-06-01T12:00:00.000Z');
    const { entries, transport } = createTestTransport();
    const parent = createLogger({ now: () => fixed, transports: [transport] });
    const child = parent.child({ namespace: 'child' });

    child.info('x');

    expect(entries[0].timestamp).toBe(fixed);
  });

  it('child can override now independently', () => {
    const parentNow = new Date('2025-01-01T00:00:00.000Z');
    const childNow = new Date('2025-12-31T23:59:59.999Z');
    const { entries, transport } = createTestTransport();
    const parent = createLogger({ now: () => parentNow, transports: [transport] });
    const child = parent.child({ now: () => childNow });

    parent.info('from parent');
    child.info('from child');

    expect(entries[0].timestamp).toBe(parentNow);
    expect(entries[1].timestamp).toBe(childNow);
  });
});

describe('pipe() fan-out transport (F2)', () => {
  it('dispatches to all transports in the pipe', () => {
    const a = createTestTransport();
    const b = createTestTransport();
    // pipe() with only transport args (no options object)
    const log = createLogger({ transports: [pipe(a.transport, b.transport)] });

    log.info('broadcast');

    expect(a.entries).toHaveLength(1);
    expect(b.entries).toHaveLength(1);
    expect(a.entries[0].message).toBe('broadcast');
    expect(b.entries[0].message).toBe('broadcast');
  });
});

describe('lazy bindings in per-call context (F5)', () => {
  it('resolves lazy in per-call context', () => {
    const factory = vi.fn(() => 'ctx-value');
    const { entries, log } = setup();

    log.info({ dynamic: lazy(factory) }, 'event');

    expect(factory).toHaveBeenCalledTimes(1);
    expect((entries[0].context as Record<string, unknown>)['dynamic']).toBe('ctx-value');
  });

  it('does not invoke context lazy when level is suppressed', () => {
    const factory = vi.fn(() => 'value');
    const { log } = setup({ logLevel: 'error' });

    log.debug({ cost: lazy(factory) }, 'x');

    expect(factory).not.toHaveBeenCalled();
  });
});

/* ─── sample option (F3) ─── */

describe('sample option on RuneOptions (F3)', () => {
  it('sample:1 emits all entries', () => {
    const { entries, transport } = createTestTransport();
    const log = createLogger({ sample: 1, transports: [transport] });

    for (let i = 0; i < 100; i++) log.info('x');

    expect(entries).toHaveLength(100);
  });

  it('sample:0 suppresses all entries', () => {
    const { entries, transport } = createTestTransport();
    const log = createLogger({ sample: 0, transports: [transport] });

    for (let i = 0; i < 20; i++) log.info('x');

    expect(entries).toHaveLength(0);
  });

  it('child inherits sample from parent', () => {
    const { entries, transport } = createTestTransport();
    const parent = createLogger({ sample: 0, transports: [transport] });
    const child = parent.child({ namespace: 'child' });

    for (let i = 0; i < 20; i++) child.info('x');

    expect(entries).toHaveLength(0);
  });

  it('sample is applied after middleware', () => {
    const { entries, transport } = createTestTransport();
    const dropped: string[] = [];
    const mw = (e: LogEntry | null): LogEntry | null => {
      if (e?.message === 'drop') {
        dropped.push('dropped');

        return null;
      }

      return e;
    };
    const log = createLogger({ middleware: [mw], sample: 1, transports: [transport] });

    log.info('drop');
    log.info('keep');

    expect(dropped).toHaveLength(1);
    expect(entries).toHaveLength(1);
    expect(entries[0].message).toBe('keep');
  });
});

/* ─── batchTransport onFlushError (F5) ─── */

describe('batchTransport onFlushError (F5)', () => {
  it('calls onFlushError when onFlush throws synchronously', async () => {
    const flushError = new Error('flush failed');
    const onFlushError = vi.fn();
    const onFlush = vi.fn().mockImplementation(() => {
      throw flushError;
    });

    const batch = batchTransport({ maxSize: 1, onFlush, onFlushError });
    const log = createLogger({ transports: [batch] });

    log.info('trigger flush');

    // flush runs via Promise.resolve().then() so we await a microtask
    await vi.waitFor(() => expect(onFlushError).toHaveBeenCalledOnce());

    const [entries, err] = onFlushError.mock.calls[0] as [LogEntry[], unknown];

    expect(err).toBe(flushError);
    expect(entries).toHaveLength(1);
    expect(entries[0].message).toBe('trigger flush');
  });

  it('calls onFlushError when onFlush returns a rejected promise (R3)', async () => {
    const flushError = new Error('async flush failed');
    const onFlushError = vi.fn();
    const onFlush = vi.fn().mockRejectedValue(flushError);

    const batch = batchTransport({ maxSize: 1, onFlush, onFlushError });
    const log = createLogger({ transports: [batch] });

    log.info('async trigger');

    await vi.waitFor(() => expect(onFlushError).toHaveBeenCalledOnce());

    const [entries, err] = onFlushError.mock.calls[0] as [LogEntry[], unknown];

    expect(err).toBe(flushError);
    expect(entries[0].message).toBe('async trigger');
  });
});

/* ─── pipe() fault tolerance (R3) ─── */

describe('pipe() fault tolerance (R3)', () => {
  it('continues to remaining transports when one throws', () => {
    const { entries: bEntries, transport: bTransport } = createTestTransport();

    const throwingTransport: Transport = () => {
      throw new Error('boom');
    };

    const fanout = pipe(throwingTransport, bTransport);
    const log = createLogger({ transports: [fanout] });

    expect(() => log.info('should not propagate')).not.toThrow();
    expect(bEntries).toHaveLength(1);
  });

  it('calls onError callback when a transport throws (R2)', () => {
    const errors: Array<{ err: unknown }> = [];
    const { transport: bTransport } = createTestTransport();

    const throwingTransport: Transport = () => {
      throw new Error('pipe-fail');
    };

    const fanout = pipe({ onError: (err) => errors.push({ err }) }, throwingTransport, bTransport);
    const log = createLogger({ transports: [fanout] });

    log.info('x');

    expect(errors).toHaveLength(1);
    expect(errors[0].err).toBeInstanceOf(Error);
  });

  it('pipe() with no options works as before (variadic transports)', () => {
    const a = createTestTransport();
    const b = createTestTransport();
    const log = createLogger({ transports: [pipe(a.transport, b.transport)] });

    log.info('broadcast');

    expect(a.entries).toHaveLength(1);
    expect(b.entries).toHaveLength(1);
  });
});

/* ─── consoleTransport format option (F6) ─── */

describe('consoleTransport inspectFn / format options (F6)', () => {
  it('format:json serializes context as a JSON string — message appears before JSON', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const t = consoleTransport({ format: 'json', timestamp: false });

    t({ bindings: {}, context: { a: 1 }, level: 'info', message: 'test', namespace: '', timestamp: new Date() });

    expect(infoSpy).toHaveBeenCalled();

    // message comes before the JSON string
    const args = infoSpy.mock.calls[0] as unknown[];
    const msgIdx = args.indexOf('test');
    const jsonIdx = args.findIndex((a) => typeof a === 'string' && a.includes('"a":1'));

    expect(msgIdx).toBeGreaterThanOrEqual(0);
    expect(jsonIdx).toBeGreaterThanOrEqual(0);
    expect(msgIdx).toBeLessThan(jsonIdx);

    infoSpy.mockRestore();
  });

  it('format:raw passes the object after the message', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const ctx = { x: 2 };
    const t = consoleTransport({ format: 'raw', timestamp: false });

    t({ bindings: {}, context: ctx, level: 'info', message: 'raw', namespace: '', timestamp: new Date() });

    expect(infoSpy).toHaveBeenCalled();

    // message comes before context object
    const args = infoSpy.mock.calls[0] as unknown[];
    const msgIdx = args.indexOf('raw');
    const ctxIdx = args.findIndex(
      (a) => typeof a === 'object' && a !== null && (a as Record<string, unknown>)['x'] === 2,
    );

    expect(msgIdx).toBeGreaterThanOrEqual(0);
    expect(ctxIdx).toBeGreaterThanOrEqual(0);
    expect(msgIdx).toBeLessThan(ctxIdx);

    infoSpy.mockRestore();
  });

  it('inspectFn is called with the merged context/bindings object', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const inspectFn = vi.fn((v) => `INSPECTED:${JSON.stringify(v)}`);
    const ctx = { key: 'val' };
    const t = consoleTransport({ inspectFn, timestamp: false });

    t({ bindings: {}, context: ctx, level: 'info', message: 'msg', namespace: '', timestamp: new Date() });

    expect(inspectFn).toHaveBeenCalledWith(ctx);

    const args = infoSpy.mock.calls[0] as unknown[];

    expect(args.some((a) => typeof a === 'string' && a.startsWith('INSPECTED:'))).toBe(true);

    infoSpy.mockRestore();
  });

  it('resolveTheme is called once at factory time, not per emit (R4)', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const t = consoleTransport({ timestamp: false });
    const entry = { bindings: {}, level: 'info' as const, message: 'x', namespace: '', timestamp: new Date() };

    // Emit 50 times — resolveTheme should be once at factory, not 50 times
    for (let i = 0; i < 50; i++) t(entry);

    expect(infoSpy).toHaveBeenCalledTimes(50);

    infoSpy.mockRestore();
  });
});

/* ─── isLevelEnabled (R8) ─── */

describe('isLevelEnabled (R8/R6)', () => {
  it('returns true when entry level meets threshold', () => {
    expect(isLevelEnabled('warn', 'warn')).toBe(true);
    expect(isLevelEnabled('warn', 'error')).toBe(true);
    expect(isLevelEnabled('warn', 'fatal')).toBe(true);
  });

  it('returns false when entry level is below threshold', () => {
    expect(isLevelEnabled('warn', 'debug')).toBe(false);
    expect(isLevelEnabled('warn', 'info')).toBe(false);
  });

  it('off threshold suppresses everything', () => {
    expect(isLevelEnabled('off', 'fatal')).toBe(false);
  });

  it('off level always returns false regardless of threshold (R6)', () => {
    expect(isLevelEnabled('debug', 'off')).toBe(false);
    expect(isLevelEnabled('off', 'off')).toBe(false);
  });

  it('enabled() returns false for off level (R6)', () => {
    const { log } = setup({ logLevel: 'debug' });

    expect(log.enabled('off')).toBe(false);
  });
});

/* ─── child() theme deep-merge ─── */

describe('child() theme deep-merge', () => {
  it('child theme override only replaces specified fields', () => {
    const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});

    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

    const parent = createLogger({ theme: { warn: { bg: '#111111' } } });
    // Child only changes the badge, not bg — bg from parent should still apply
    const child = parent.child({ theme: { warn: { badge: '!!' } } });

    child.group('test', () => {});

    // Theme resolution should not throw; group renders
    expect(groupSpy).toHaveBeenCalledTimes(1);
  });

  it('child without theme override inherits parent theme', () => {
    const { transport } = createTestTransport();
    const parent = createLogger({ theme: { warn: { badge: 'P' } }, transports: [transport] });
    const child = parent.child({ namespace: 'child' });

    expect(child.config.theme).toEqual(parent.config.theme);
  });

  it('child with undefined theme inherits parent theme unchanged', () => {
    const parentTheme = { error: { badge: 'E!' } };
    const parent = createLogger({ theme: parentTheme });
    const child = parent.child({});

    expect(child.config.theme).toEqual(parentTheme);
  });
});

/* ─── sample: 0.5 proportional logger-level ─── */

describe('sample option proportional rate (F3)', () => {
  it('sample:0.5 forwards approximately half of entries', () => {
    const { entries, transport } = createTestTransport();
    const log = createLogger({ sample: 0.5, transports: [transport] });

    for (let i = 0; i < 2000; i++) log.info('x');

    expect(entries.length).toBeGreaterThan(700);
    expect(entries.length).toBeLessThan(1300);
  });
});

/* ─── consoleTransport empty context ─── */

describe('consoleTransport with no context or bindings', () => {
  it('emits message-only entries without error', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const t = consoleTransport({ timestamp: false });

    // Both bindings and context empty
    expect(() =>
      t({ bindings: {}, level: 'info', message: 'hello', namespace: '', timestamp: new Date() }),
    ).not.toThrow();

    expect(infoSpy).toHaveBeenCalledTimes(1);

    const args = infoSpy.mock.calls[0] as unknown[];

    expect(args.some((a) => a === 'hello')).toBe(true);

    infoSpy.mockRestore();
  });

  it('emits entries with no message and no context without error', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const t = consoleTransport({ timestamp: false });

    expect(() => t({ bindings: {}, level: 'info', namespace: '', timestamp: new Date() })).not.toThrow();

    expect(infoSpy).toHaveBeenCalledTimes(1);

    infoSpy.mockRestore();
  });
});

/* ─── setLevel() ─── */

describe('setLevel()', () => {
  it('mutates the level threshold in-place', () => {
    const { entries, log } = setup({ logLevel: 'error' });

    log.debug('before');
    expect(entries).toHaveLength(0);

    log.setLevel('debug');
    log.debug('after');

    expect(entries).toHaveLength(1);
    expect(entries[0].message).toBe('after');
  });

  it('config.logLevel reflects the new level', () => {
    const { log } = setup({ logLevel: 'info' });

    log.setLevel('warn');

    expect(log.config.logLevel).toBe('warn');
  });

  it('enabled() reflects the updated level', () => {
    const { log } = setup({ logLevel: 'info' });

    expect(log.enabled('debug')).toBe(false);

    log.setLevel('debug');

    expect(log.enabled('debug')).toBe(true);
  });

  it('setting off silences all output', () => {
    const { entries, log } = setup({ logLevel: 'debug' });

    log.setLevel('off');
    log.fatal('silenced');

    expect(entries).toHaveLength(0);
  });
});

/* ─── time() options-object form ─── */

describe('time() opts object form', () => {
  it('accepts { level } object as third arg', () => {
    const { entries, log } = setup({ logLevel: 'info' });

    log.time('task', () => {}, { level: 'info' });

    expect(entries).toHaveLength(1);
    expect(entries[0].level).toBe('info');
  });

  it('positional string level still works (backwards compat)', () => {
    const { entries, log } = setup({ logLevel: 'info' });

    log.time('task', () => {}, 'info');

    expect(entries).toHaveLength(1);
    expect(entries[0].level).toBe('info');
  });

  it('defaults to debug when opts is undefined', () => {
    const { entries, log } = setup();

    log.time('task', () => {});

    expect(entries[0].level).toBe('debug');
  });

  it('defaults to debug when opts object has no level field', () => {
    const { entries, log } = setup();

    log.time('task', () => {}, {});

    expect(entries[0].level).toBe('debug');
  });
});

/* ─── pipe() overloads ─── */

describe('pipe() overloads', () => {
  it('variadic form works without options', () => {
    const a = createTestTransport();
    const b = createTestTransport();
    const log = createLogger({ transports: [pipe(a.transport, b.transport)] });

    log.info('x');

    expect(a.entries).toHaveLength(1);
    expect(b.entries).toHaveLength(1);
  });

  it('options-first form works with onError', () => {
    const errors: unknown[] = [];
    const boom: Transport = () => {
      throw new Error('pipe-boom');
    };
    const { entries, transport } = createTestTransport();
    const log = createLogger({ transports: [pipe({ onError: (e) => errors.push(e) }, boom, transport)] });

    log.info('x');

    expect(errors).toHaveLength(1);
    expect(entries).toHaveLength(1);
  });
});

/* ─── jsonTransport field collision ─── */

describe('jsonTransport field collision', () => {
  it('reserved fields (level, time, ns, msg) win over same-named bindings', () => {
    const lines: string[] = [];
    const log = createLogger({
      bindings: { level: 'override-attempt', msg: 'override-attempt' },
      namespace: 'svc',
      transports: [jsonTransport({ output: (l) => lines.push(l) })],
    });

    log.warn('real message');

    const record = JSON.parse(lines[0]) as Record<string, unknown>;

    expect(record['level']).toBe('warn');
    expect(record['msg']).toBe('real message');
  });

  it('context keys that match reserved fields do not clobber them', () => {
    const lines: string[] = [];
    const log = createLogger({
      transports: [jsonTransport({ output: (l) => lines.push(l) })],
    });

    log.info({ level: 'debug', time: 'not-a-timestamp' }, 'structured');

    const record = JSON.parse(lines[0]) as Record<string, unknown>;

    expect(record['level']).toBe('info');
    expect(record['msg']).toBe('structured');
  });
});

/* ─── setLevel() child inheritance ─── */

describe('setLevel() child inheritance', () => {
  it('child created after setLevel inherits the new level', () => {
    const { log } = setup({ logLevel: 'info' });

    log.setLevel('debug');

    const child = log.child();
    const childEntries: LogEntry[] = [];

    child.child({ transports: [(e) => childEntries.push(e)] }).debug('via-child');

    expect(childEntries).toHaveLength(1);
  });

  it('child created before setLevel is unaffected', () => {
    const childEntries: LogEntry[] = [];
    const { log } = setup({ logLevel: 'debug' });
    const child = log.child({ transports: [(e) => childEntries.push(e)] });

    log.setLevel('off');
    child.debug('child-still-works');

    expect(childEntries).toHaveLength(1);
  });
});

/* ─── pipe() edge cases ─── */

describe('pipe() edge cases', () => {
  it('zero-arg call returns a safe no-op transport', () => {
    const log = createLogger({ transports: [pipe()] });

    expect(() => log.info('should not throw')).not.toThrow();
  });
});

/* ─── redactTransport edge cases ─── */

describe('redactTransport edge cases', () => {
  it('empty-string replacement replaces field value with empty string', () => {
    const { entries, transport } = createTestTransport();
    const log = createLogger({
      transports: [redactTransport({ keys: ['token'], replacement: '', transport })],
    });

    log.info({ token: 'abc' }, 'msg');

    expect(entries[0].context?.['token']).toBe('');
  });
});

/* ─── jsonTransport circular reference safety ─── */

describe('jsonTransport circular reference safety', () => {
  it('calls onTransportError instead of crashing on circular bindings', () => {
    const errors: unknown[] = [];
    const circular: Record<string, unknown> = {};

    circular['self'] = circular;

    const log = createLogger({
      onTransportError: (e) => errors.push(e),
      transports: [jsonTransport()],
    });

    log.info(circular, 'circular');

    expect(errors).toHaveLength(1);
  });
});

/* ─── redactTransport depth limit ─── */

describe('redactTransport depth limit', () => {
  it('does not stack-overflow on a 100-level deep object', () => {
    const { entries, transport } = createTestTransport();

    let nested: Record<string, unknown> = { password: 'secret' };

    for (let i = 0; i < 100; i++) nested = { child: nested };

    const log = createLogger({
      transports: [redactTransport({ keys: ['password'], transport })],
    });

    expect(() => log.info(nested, 'deep')).not.toThrow();
    expect(entries).toHaveLength(1);
  });
});

/* ─── Namespace dot-joining ─── */

describe('child() namespace dot-joining', () => {
  it('joins parent and child namespace with a dot', () => {
    const parent = createLogger({ namespace: 'api' });
    const child = parent.child({ namespace: 'auth' });

    expect(child.config.namespace).toBe('api.auth');
  });

  it('root parent with no namespace just uses child name', () => {
    const parent = createLogger();
    const child = parent.child({ namespace: 'api' });

    expect(child.config.namespace).toBe('api');
  });

  it('chains multiple levels of namespaces', () => {
    const root = createLogger({ namespace: 'app' });
    const api = root.child({ namespace: 'api' });
    const auth = api.child({ namespace: 'auth' });

    expect(auth.config.namespace).toBe('app.api.auth');
  });

  it('absolute namespace (starting with /) replaces instead of joining', () => {
    const parent = createLogger({ namespace: 'api' });
    const child = parent.child({ namespace: '/root' });

    expect(child.config.namespace).toBe('root');
  });

  it('omitting namespace in child() preserves parent namespace', () => {
    const parent = createLogger({ namespace: 'api' });
    const child = parent.child();

    expect(child.config.namespace).toBe('api');
  });
});

/* ─── resetLevel() ─── */

describe('resetLevel()', () => {
  it('restores the initial log level after setLevel()', () => {
    const { log } = setup({ logLevel: 'info' });

    log.setLevel('error');
    expect(log.config.logLevel).toBe('error');

    log.resetLevel();
    expect(log.config.logLevel).toBe('info');
  });

  it('enabled() reflects the restored level', () => {
    const { log } = setup({ logLevel: 'debug' });

    log.setLevel('off');
    expect(log.enabled('debug')).toBe(false);

    log.resetLevel();
    expect(log.enabled('debug')).toBe(true);
  });

  it('resetLevel() on an unmodified logger is a no-op', () => {
    const { log } = setup({ logLevel: 'warn' });

    log.resetLevel();
    expect(log.config.logLevel).toBe('warn');
  });
});

/* ─── jsonTransport safe mode ─── */

describe('jsonTransport safe mode', () => {
  it('handles circular references without throwing when safe:true', () => {
    const lines: string[] = [];
    const log = createLogger({
      transports: [jsonTransport({ output: (l) => lines.push(l), safe: true })],
    });
    const circular: Record<string, unknown> = {};

    circular['self'] = circular;

    expect(() => log.info(circular, 'safe-circular')).not.toThrow();
    expect(lines).toHaveLength(1);

    const record = JSON.parse(lines[0]) as Record<string, unknown>;
    const selfValue = record['self'] as Record<string, unknown>;

    expect(selfValue['self']).toBe('[Circular]');
  });

  it('without safe:true circular refs still hit onTransportError', () => {
    const errors: unknown[] = [];
    const circular: Record<string, unknown> = {};

    circular['self'] = circular;

    const log = createLogger({
      onTransportError: (e) => errors.push(e),
      transports: [jsonTransport()],
    });

    log.info(circular, 'unsafe');
    expect(errors).toHaveLength(1);
  });
});

/* ─── redactTransport dot-path warning ─── */

describe('redactTransport dot-path key warning', () => {
  it('warns when a key contains a dot', () => {
    const { transport } = createTestTransport();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    redactTransport({ keys: ['user.password'], transport });

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('user.password'));
    warnSpy.mockRestore();
  });

  it('does not warn for plain keys without dots', () => {
    const { transport } = createTestTransport();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    redactTransport({ keys: ['password', 'token'], transport });

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

/* ─── batchTransport maxBuffer ─── */

describe('batchTransport maxBuffer', () => {
  it('drops oldest entries when maxBuffer is exceeded', async () => {
    const flushed: LogEntry[][] = [];
    const batch = batchTransport({
      interval: 10_000,
      maxBuffer: 2,
      maxSize: 10,
      onFlush: (entries) => {
        flushed.push(entries);
      },
    });
    const log = createLogger({ transports: [batch] });

    log.info('a');
    log.info('b');
    log.info('c'); // 'a' should be dropped — buffer capped at 2

    batch.dispose();

    await new Promise((r) => setTimeout(r, 20));

    expect(flushed[0]).toHaveLength(2);
    expect(flushed[0][0].message).toBe('b');
    expect(flushed[0][1].message).toBe('c');
  });

  it('without maxBuffer all entries are buffered', async () => {
    const flushed: LogEntry[][] = [];
    const batch = batchTransport({
      interval: 10_000,
      maxSize: 100,
      onFlush: (entries) => {
        flushed.push(entries);
      },
    });
    const log = createLogger({ transports: [batch] });

    log.info('a');
    log.info('b');
    log.info('c');
    batch.dispose();

    await new Promise((r) => setTimeout(r, 20));

    expect(flushed[0]).toHaveLength(3);
  });
});

/* ─── time() error context ─── */

describe('time() error context', () => {
  it('includes err in context when sync fn throws', () => {
    const { entries, log } = setup();

    expect(() =>
      log.time('op', () => {
        throw new Error('boom');
      }),
    ).toThrow('boom');

    expect(entries).toHaveLength(1);
    expect(entries[0].context).toMatchObject({
      duration_ms: expect.any(Number),
      err: expect.objectContaining({ message: 'boom', name: 'Error' }),
    });
    expect(entries[0].message).toBe('op');
  });

  it('includes err in context when async fn rejects', async () => {
    const { entries, log } = setup();

    await expect(log.time('async-op', () => Promise.reject(new Error('async-boom')))).rejects.toThrow('async-boom');

    expect(entries).toHaveLength(1);
    expect(entries[0].context).toMatchObject({
      duration_ms: expect.any(Number),
      err: expect.objectContaining({ message: 'async-boom' }),
    });
  });

  it('does not include err in context on success', () => {
    const { entries, log } = setup();

    log.time('ok-op', () => 42);

    expect(entries[0].context).toEqual({ duration_ms: expect.any(Number) });
    expect(entries[0].context).not.toHaveProperty('err');
  });

  it('serialises non-Error thrown values', () => {
    const { entries, log } = setup();

    expect(() =>
      log.time('str-throw', () => {
        throw 'oops';
      }),
    ).toThrow('oops');

    expect(entries[0].context).toMatchObject({
      err: expect.objectContaining({ message: 'oops' }),
    });
  });
});

/* ─── group() level gating ─── */

describe('group() level gating', () => {
  it('renders group header when level passes the threshold', () => {
    const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => undefined);
    const groupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => undefined);
    const log = createLogger({ logLevel: 'info' });

    log.group('my-group', () => {}, 'info');

    expect(groupSpy).toHaveBeenCalledTimes(1);
    expect(groupEndSpy).toHaveBeenCalledTimes(1);
    groupSpy.mockRestore();
    groupEndSpy.mockRestore();
  });

  it('suppresses group header when level is below threshold', () => {
    const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => undefined);
    const log = createLogger({ logLevel: 'warn' });

    log.group('my-group', () => {}, 'debug');

    expect(groupSpy).not.toHaveBeenCalled();
    groupSpy.mockRestore();
  });

  it('still runs the callback when group header is suppressed', () => {
    vi.spyOn(console, 'group').mockImplementation(() => undefined);
    vi.spyOn(console, 'groupEnd').mockImplementation(() => undefined);

    const log = createLogger({ logLevel: 'warn' });
    let called = false;

    log.group(
      'my-group',
      () => {
        called = true;
      },
      'debug',
    );

    expect(called).toBe(true);
  });

  it('renders group without level param (legacy behaviour)', () => {
    const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => undefined);
    const log = createLogger({ logLevel: 'warn' });

    log.group('my-group', () => {});

    expect(groupSpy).toHaveBeenCalledTimes(1);
    groupSpy.mockRestore();
  });
});

/* ─── Logger.dispose() ─── */

describe('Logger.dispose()', () => {
  it('calls dispose() on every BatchTransport in the transport array', async () => {
    const flushed: LogEntry[][] = [];
    const batch = batchTransport({
      interval: 60_000,
      maxSize: 100,
      onFlush: (entries) => {
        flushed.push(entries);
      },
    });
    const log = createLogger({ transports: [batch] });

    log.info('before-dispose');
    log.dispose();

    await new Promise((r) => setTimeout(r, 20));

    expect(flushed).toHaveLength(1);
    expect(flushed[0][0].message).toBe('before-dispose');
  });

  it('is a no-op when there are no batch transports', () => {
    const { entries, log } = setup();

    expect(() => log.dispose()).not.toThrow();

    log.info('still works');
    expect(entries).toHaveLength(1);
  });
});

/* ─── middleware undefined guard ─── */

describe('middleware undefined/null drop', () => {
  it('drops entry when middleware returns null', () => {
    const { entries, log } = setup({
      middleware: [() => null],
    });

    log.info('dropped');

    expect(entries).toHaveLength(0);
  });

  it('drops entry when JS middleware returns undefined (no return)', () => {
    const { entries, log } = setup({
      middleware: [(() => undefined) as unknown as LogMiddleware],
    });

    log.info('dropped-undef');

    expect(entries).toHaveLength(0);
  });

  it('passes through when middleware returns the entry', () => {
    const { entries, log } = setup({
      middleware: [(e) => e],
    });

    log.info('kept');

    expect(entries).toHaveLength(1);
  });
});

/* ─── lazy factory throw safety ─── */

describe('lazy factory throw safety', () => {
  it('resolves to undefined when lazy factory throws — does not crash the log call', () => {
    const { entries, log } = setup();

    expect(() => {
      const bound = log.withBindings({
        val: lazy(() => {
          throw new Error('lazy-fail');
        }),
      });

      bound.info('safe');
    }).not.toThrow();

    expect(entries).toHaveLength(1);
    expect(entries[0].bindings['val']).toBeUndefined();
  });
});
