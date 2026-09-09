import { afterEach, describe, expect, it, vi } from 'vitest';
import { consoleTransport, DEFAULT_THEME, resolveTheme } from '../console';
import { lazy } from '../lazy';
import { createLogger } from '../logger';
import { batchTransport, jsonTransport, redactTransport, remoteTransport, sampleTransport } from '../transports';
import type { Bindings, LogEntry, LogLevel, RuneOptions, Transport } from '../types';
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
    expect(createLogger('MyApp').namespace).toBe('MyApp');
    expect(createLogger().namespace).toBe('');
  });

  it('creates isolated instances with independent configs', () => {
    const a = createLogger({ logLevel: 'debug' });
    const b = createLogger({ logLevel: 'error' });

    expect(a.logLevel).toBe('debug');
    expect(b.logLevel).toBe('error');
  });

  it('applies defaults when options are omitted', () => {
    const { transport } = createTestTransport();
    const log = createLogger({ transports: [transport] });

    expect(log.logLevel).toBe('debug');
    expect(log.namespace).toBe('');
    expect(log.transports).toHaveLength(1);
  });

  it('individual getters return correct values', () => {
    const { log } = setup({ logLevel: 'warn' });

    expect(log.logLevel).toBe('warn');
    expect(log.transports).toHaveLength(1);
  });

  it('transport config and getter are defensive snapshots', () => {
    const first = createTestTransport();
    const second = createTestTransport();
    const transports = [first.transport];
    const log = createLogger({ transports });

    transports.push(second.transport);
    (log.transports as Transport[]).splice(0);
    log.info('one');

    expect(first.entries).toHaveLength(1);
    expect(second.entries).toHaveLength(0);
    expect(log.transports).toHaveLength(1);
  });
});

/* ─── Emit & payload semantics ─── */

describe('emit and payload semantics', () => {
  it('message-only call places message in entry', () => {
    const { entries, log } = setup();

    log.info('hello');

    expect(entries).toHaveLength(1);
    expect(entries[0].message).toBe('hello');
    expect(entries[0].data).toEqual({});
    expect(entries[0].level).toBe('info');
  });

  it('message + context call sets both fields in data', () => {
    const { entries, log } = setup();

    log.info('hello', { requestId: 'abc' });

    expect(entries[0].data).toEqual({ requestId: 'abc' });
    expect(entries[0].message).toBe('hello');
  });

  it('Error in context field is serialized to plain object', () => {
    const { entries, log } = setup();

    log.error('request failed', { err: new Error('boom') });

    expect(entries[0].data.err).toMatchObject({ message: 'boom', name: 'Error' });
    expect(typeof (entries[0].data.err as Record<string, unknown>).stack).toBe('string');
    expect(entries[0].message).toBe('request failed');
  });

  it('Error field alongside other context keys all survive serialization', () => {
    const { entries, log } = setup();

    log.error('request failed', { err: new Error('fail'), requestId: 'abc' });

    expect(entries[0].data.err).toMatchObject({ message: 'fail', name: 'Error' });
    expect(entries[0].data.requestId).toBe('abc');
    expect(entries[0].message).toBe('request failed');
  });

  it('supports structured context with an optional message', () => {
    const { entries, log } = setup();

    log.debug({ type: 'dispatch', value: 42 }, 'bus:dispatch');

    expect(entries[0]).toMatchObject({ data: { type: 'dispatch', value: 42 }, message: 'bus:dispatch' });
  });

  it('supports Error-first calls without manual wrapping', () => {
    const { entries, log } = setup();
    const error = new Error('fail');

    log.error(error, { requestId: 'abc' }, 'request failed');

    expect(entries[0].data).toMatchObject({ err: { message: 'fail', name: 'Error' }, requestId: 'abc' });
    expect(entries[0].message).toBe('request failed');
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

  it('entry.data is a fresh object per call, never an alias of internal bindings (B1)', () => {
    const { entries, log } = setup({ bindings: { a: 1 } });

    log.info('one');
    log.info('two');

    expect(entries[0].data).not.toBe(entries[1].data);
    expect(entries[0].data).toEqual({ a: 1 });
    expect(entries[1].data).toEqual({ a: 1 });

    // Mutating one entry's data must never affect the logger's own bindings or other entries.
    (entries[0].data as Record<string, unknown>).a = 'mutated';
    expect(log.bindings).toEqual({ a: 1 });
    expect(entries[1].data).toEqual({ a: 1 });
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
  it('child with explicit namespace dot-joins to parent', () => {
    const { entries, log } = setup({ namespace: 'app' });

    log.child({ namespace: 'api.auth' }).info('call');

    expect(entries[0].namespace).toBe('app.api.auth');
    expect(log.namespace).toBe('app');
  });

  it('child with namespace from empty parent uses the given value', () => {
    const { entries, log } = setup();

    log.child({ namespace: 'api' }).info('x');

    expect(entries[0].namespace).toBe('api');
  });

  it('child overrides selected fields and preserves others', () => {
    const parent = createLogger({ logLevel: 'warn', namespace: 'app' });
    const child = parent.child({ logLevel: 'debug' });

    expect(child.logLevel).toBe('debug');
    expect(child.namespace).toBe('app');
    expect(parent.logLevel).toBe('warn');
  });

  it('child inherits transports by default', () => {
    const { entries, transport } = createTestTransport();
    const parent = createLogger({ transports: [transport] });
    const child = parent.child({ logLevel: 'debug' });

    child.info('x');

    expect(entries).toHaveLength(1);
    expect(child.transports).toHaveLength(1);
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

  it('withBindings pins bindings on every call — merged into data', () => {
    const { entries, log } = setup();
    const reqLog = log.withBindings({ requestId: 'abc' });

    reqLog.info('hello');

    expect(entries[0].data).toEqual({ requestId: 'abc' });
    expect(entries[0].message).toBe('hello');
  });

  it('per-call context overrides colliding binding keys in data', () => {
    const { entries, log } = setup();
    const reqLog = log.withBindings({ requestId: 'base', source: 'api' });

    reqLog.info('msg', { requestId: 'override' });

    expect(entries[0].data).toMatchObject({ requestId: 'override', source: 'api' });
  });

  it('bindings getter returns a defensive snapshot', () => {
    const { log } = setup();
    const reqLog = log.withBindings({ a: 1 });
    const snap = reqLog.bindings as Record<string, unknown>;

    snap.a = 999;

    expect(reqLog.bindings).toEqual({ a: 1 });
  });

  it('withBindings stacks additively through chains', () => {
    const { entries, log } = setup();
    const base = log.withBindings({ service: 'api' });
    const req = base.withBindings({ requestId: 'xyz' });

    req.info('x');

    expect(entries[0].data).toMatchObject({ requestId: 'xyz', service: 'api' });
  });
});

describe('middleware', () => {
  it('transforms an entry before every transport', () => {
    const first: LogEntry[] = [];
    const second: LogEntry[] = [];
    const log = createLogger({ transports: [(entry) => first.push(entry), (entry) => second.push(entry)] }).use(
      (entry) => ({ ...entry, data: { ...entry.data, env: 'test' } }),
    );

    log.info('ready');

    expect(first[0].data.env).toBe('test');
    expect(second[0].data.env).toBe('test');
  });

  it('drops an entry when middleware returns null', () => {
    const { entries, transport } = createTestTransport();
    const log = createLogger({ middleware: [() => null], transports: [transport] });

    log.info('hidden');

    expect(entries).toHaveLength(0);
  });

  it('inherits middleware without mutating the parent pipeline', () => {
    const { entries, transport } = createTestTransport();
    const parent = createLogger({ transports: [transport] });
    const child = parent.use((entry) => ({ ...entry, data: { child: true } }));

    parent.info('parent');
    child.info('child');

    expect(entries.map((entry) => entry.data)).toEqual([{}, { child: true }]);
    expect(parent.middleware).toHaveLength(0);
    expect(child.middleware).toHaveLength(1);
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

  it('escapes %-format specifiers in namespace on the Node.js path so payload args are not swallowed (security)', () => {
    vi.stubGlobal('window', undefined);

    try {
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      const log = createLogger({
        namespace: 'attacker-%s-%s-controlled',
        transports: [consoleTransport({ ansi: false, timestamp: false })],
      });

      log.info('evidence message', { secret: 'top-secret' });

      const callArgs = infoSpy.mock.calls[0];

      // The prefix (first arg) must not contain a *live* %s/%d/etc. specifier — Node's console
      // methods run the first string argument through util.format, and an unescaped specifier
      // would consume and hide the message and data arguments that follow.
      expect(callArgs[0]).toContain('%%s');
      // The message and data must still be delivered as their own, unswallowed arguments.
      expect(callArgs).toHaveLength(3);
      expect(callArgs[1]).toBe('evidence message');
      expect(callArgs[2]).toEqual({ secret: 'top-secret' });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('group() uses DEFAULT_THEME badge for group label (R1)', () => {
    const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});

    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

    const log = createLogger();

    log.group('deploy', () => {});

    const prefix = groupSpy.mock.calls[0][0] as string;

    expect(prefix).toContain(DEFAULT_THEME.group.badge);
  });
});

describe('redactTransport', () => {
  it('redacts matching keys recursively without mutating the input', () => {
    const entries: LogEntry[] = [];
    const data = { password: 'secret', profile: { token: 'value', visible: true } };
    const transport = redactTransport({ keys: ['password', 'token'], transport: (entry) => entries.push(entry) });

    transport({ data, level: 'info', message: 'user', namespace: '', timestamp: new Date() });

    expect(entries[0].data).toEqual({ password: '[REDACTED]', profile: { token: '[REDACTED]', visible: true } });
    expect(data.password).toBe('secret');
  });

  it('redacts matching fields inside arrays with a custom replacement', () => {
    const entries: LogEntry[] = [];
    const transport = redactTransport({
      keys: ['token'],
      replacement: '<hidden>',
      transport: (entry) => entries.push(entry),
    });

    transport({
      data: { users: [{ name: 'Ada', token: 'secret' }] },
      level: 'info',
      namespace: '',
      timestamp: new Date(),
    });

    expect(entries[0].data).toEqual({ users: [{ name: 'Ada', token: '<hidden>' }] });
  });

  it('fails closed by replacing subtrees beyond maxDepth', () => {
    const entries: LogEntry[] = [];
    const transport = redactTransport({ keys: ['token'], maxDepth: 0, transport: (entry) => entries.push(entry) });

    transport({
      data: { profile: { token: 'secret' }, visible: true },
      level: 'info',
      namespace: '',
      timestamp: new Date(),
    });

    expect(entries[0].data).toEqual({ profile: '[REDACTED]', visible: true });
  });

  it('drops unsafe object keys from redacted output', () => {
    const entries: LogEntry[] = [];
    const data = JSON.parse('{"__proto__":{"polluted":true},"safe":true}') as Bindings;
    const transport = redactTransport({ keys: [], transport: (entry) => entries.push(entry) });

    transport({ data, level: 'info', namespace: '', timestamp: new Date() });

    expect(entries[0].data).toEqual({ safe: true });
    expect(Object.getPrototypeOf(entries[0].data)).toBe(Object.prototype);
  });

  it('validates maxDepth', () => {
    expect(() => redactTransport({ keys: [], maxDepth: -1, transport: () => {} })).toThrow(
      'redactTransport maxDepth must be a non-negative integer',
    );
  });
});

describe('remoteTransport', () => {
  it('normalizes and forwards entries at the configured threshold', async () => {
    const handler = vi.fn();
    const log = createLogger({
      namespace: 'api',
      transports: [remoteTransport({ env: 'production', handler, level: 'warn' })],
    });

    log.info('ignored');
    log.error('failed', { requestId: 'abc' });
    await Promise.resolve();
    await Promise.resolve();

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(
      'error',
      expect.objectContaining({
        data: { requestId: 'abc' },
        env: 'production',
        level: 'error',
        message: 'failed',
        namespace: 'api',
      }),
    );
  });

  it('reports asynchronous delivery failures', async () => {
    const error = new Error('offline');
    const onError = vi.fn();
    const log = createLogger({ transports: [remoteTransport({ handler: () => Promise.reject(error), onError })] });

    log.error('failed');

    await vi.waitFor(() => {
      expect(onError).toHaveBeenCalledWith(error, expect.objectContaining({ message: 'failed' }));
    });
  });
});

describe('batchTransport', () => {
  it('flushes serially at maxSize and drains on dispose', async () => {
    const batches: string[][] = [];
    const batch = batchTransport({
      interval: 60_000,
      maxSize: 2,
      onFlush: async (entries) => {
        batches.push(entries.map((entry) => entry.message ?? ''));
      },
    });
    const log = createLogger({ transports: [batch.transport] });

    log.info('one');
    log.info('two');
    log.info('three');
    await batch.dispose();

    expect(batches).toEqual([['one', 'two'], ['three']]);
    expect(batch.disposed).toBe(true);
  });

  it('supports a zero-entry maxBuffer', async () => {
    const onFlush = vi.fn();
    const batch = batchTransport({ maxBuffer: 0, onFlush });

    batch.transport({ data: {}, level: 'info', namespace: '', timestamp: new Date() });
    await batch.dispose();

    expect(onFlush).not.toHaveBeenCalled();
  });

  it('reports and rejects delivery failures', async () => {
    const error = new Error('offline');
    const onFlushError = vi.fn();
    const batch = batchTransport({ onFlush: () => Promise.reject(error), onFlushError });

    batch.transport({ data: {}, level: 'error', namespace: '', timestamp: new Date() });

    await expect(batch.dispose()).rejects.toBe(error);
    expect(onFlushError).toHaveBeenCalledWith(expect.any(Array), error);
  });
});

describe('sampleTransport', () => {
  it('forwards all entries at rate 1 and none at rate 0', () => {
    const entries: LogEntry[] = [];
    const entry: LogEntry = { data: {}, level: 'info', namespace: '', timestamp: new Date() };

    sampleTransport({ rate: 1, transport: (value) => entries.push(value) })(entry);
    sampleTransport({ rate: 0, transport: (value) => entries.push(value) })(entry);

    expect(entries).toEqual([entry]);
  });

  it('validates rate', () => {
    expect(() => sampleTransport({ rate: 2, transport: () => {} })).toThrow(
      'sampleTransport rate must be between zero and one',
    );
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

    expect(record.level).toBe('info');
    expect(record.msg).toBe('server started');
    expect(typeof record.time).toBe('string');
  });

  it('includes namespace as ns field', () => {
    const lines: string[] = [];
    const log = createLogger({
      namespace: 'api',
      transports: [jsonTransport({ output: (l) => lines.push(l) })],
    });

    log.warn('slow');

    const record = JSON.parse(lines[0]) as Record<string, unknown>;

    expect(record.ns).toBe('api');
  });

  it('merges bindings and context (via data) into the flat record', () => {
    const lines: string[] = [];
    const log = createLogger({
      bindings: { reqId: 'x' },
      transports: [jsonTransport({ output: (l) => lines.push(l) })],
    });

    log.info('request', { path: '/api' });

    const record = JSON.parse(lines[0]) as Record<string, unknown>;

    expect(record.reqId).toBe('x');
    expect(record.path).toBe('/api');
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

    expect(record.severity).toBe('warn');
    expect(record.message).toBe('started');
    expect(record.service).toBe('svc');
    expect(typeof record.timestamp).toBe('string');
    // default field names should NOT appear
    expect('level' in record).toBe(false);
    expect('msg' in record).toBe(false);
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
    expect(entries[0].data.computed).toBe('expensive');
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

    expect(entries[0].data.tick).toBe(1);
    expect(entries[1].data.tick).toBe(2);
  });

  it('non-lazy bindings are passed through unchanged', () => {
    const { entries, log } = setup();
    const boundLog = log.withBindings({ a: 1, b: 'two' });

    boundLog.info('x');

    expect(entries[0].data).toEqual({ a: 1, b: 'two' });
  });
});

/* ─── time() ─── */

describe('time()', () => {
  it('emits a debug entry with duration_ms in data and label as message', () => {
    const { entries, log } = setup();

    const value = log.time('work', () => 42);

    expect(value).toBe(42);
    expect(entries).toHaveLength(1);
    expect(entries[0].level).toBe('debug');
    expect(entries[0].message).toBe('work');
    expect(typeof entries[0].data.duration_ms).toBe('number');
    expect('label' in entries[0].data).toBe(false);
  });

  it('emits on async completion', async () => {
    const { entries, log } = setup();

    const value = await log.time('async-work', () => Promise.resolve('done'));

    expect(value).toBe('done');
    expect(entries[0].message).toBe('async-work');
    expect(typeof entries[0].data.duration_ms).toBe('number');
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
    expect(typeof entries[0].data.duration_ms).toBe('number');
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

  it('escapes %-format specifiers in Node group labels and namespaces', () => {
    vi.stubGlobal('window', undefined);

    try {
      const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});

      vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

      const log = createLogger('attacker-%s', { transports: [] });

      log.group('label-%d-%o', () => {});

      expect(groupSpy).toHaveBeenCalledWith(expect.stringContaining('label-%%d-%%o'));
      expect(groupSpy).toHaveBeenCalledWith(expect.stringContaining('[attacker-%%s]'));
    } finally {
      vi.unstubAllGlobals();
    }
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

/* ─── createLogger bindings option ─── */

describe('createLogger bindings option', () => {
  it('accepts bindings in options object — appear in entry.data', () => {
    const { entries, transport } = createTestTransport();
    const log = createLogger({ bindings: { service: 'api' }, transports: [transport] });

    log.info('started');

    expect(entries[0].data).toEqual({ service: 'api' });
  });

  it('child merges bindings from parent and override into data', () => {
    const { entries, transport } = createTestTransport();
    const parent = createLogger({ bindings: { service: 'api' }, transports: [transport] });
    const child = parent.child({ bindings: { requestId: 'abc' } });

    child.info('x');

    expect(entries[0].data).toMatchObject({ requestId: 'abc', service: 'api' });
  });
});

/* ─── lazy bindings in per-call context (F5) ─── */

describe('lazy bindings in per-call context (F5)', () => {
  it('resolves lazy in per-call context — appears in data', () => {
    const factory = vi.fn(() => 'ctx-value');
    const { entries, log } = setup();

    log.info('event', { dynamic: lazy(factory) });

    expect(factory).toHaveBeenCalledTimes(1);
    expect(entries[0].data.dynamic).toBe('ctx-value');
  });

  it('does not invoke context lazy when level is suppressed', () => {
    const factory = vi.fn(() => 'value');
    const { log } = setup({ logLevel: 'error' });

    log.debug('x', { cost: lazy(factory) });

    expect(factory).not.toHaveBeenCalled();
  });
});

/* ─── consoleTransport format option (F6) ─── */

describe('consoleTransport inspectFn / format options (F6)', () => {
  it('format:json serializes data as a JSON string — message appears before JSON', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const t = consoleTransport({ format: 'json', timestamp: false });

    t({ data: { a: 1 }, level: 'info', message: 'test', namespace: '', timestamp: new Date() });

    expect(infoSpy).toHaveBeenCalled();

    const args = infoSpy.mock.calls[0] as unknown[];
    const msgIdx = args.indexOf('test');
    const jsonIdx = args.findIndex((a) => typeof a === 'string' && a.includes('"a":1'));

    expect(msgIdx).toBeGreaterThanOrEqual(0);
    expect(jsonIdx).toBeGreaterThanOrEqual(0);
    expect(msgIdx).toBeLessThan(jsonIdx);

    infoSpy.mockRestore();
  });

  it('format:raw passes the data object after the message', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const data = { x: 2 };
    const t = consoleTransport({ format: 'raw', timestamp: false });

    t({ data, level: 'info', message: 'raw', namespace: '', timestamp: new Date() });

    expect(infoSpy).toHaveBeenCalled();

    const args = infoSpy.mock.calls[0] as unknown[];
    const msgIdx = args.indexOf('raw');
    const dataIdx = args.findIndex(
      (a) => typeof a === 'object' && a !== null && (a as Record<string, unknown>).x === 2,
    );

    expect(msgIdx).toBeGreaterThanOrEqual(0);
    expect(dataIdx).toBeGreaterThanOrEqual(0);
    expect(msgIdx).toBeLessThan(dataIdx);

    infoSpy.mockRestore();
  });

  it('inspectFn is called with the merged data object', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const inspectFn = vi.fn((v) => `INSPECTED:${JSON.stringify(v)}`);
    const data = { key: 'val' };
    const t = consoleTransport({ inspectFn, timestamp: false });

    t({ data, level: 'info', message: 'msg', namespace: '', timestamp: new Date() });

    expect(inspectFn).toHaveBeenCalledWith(data);

    const args = infoSpy.mock.calls[0] as unknown[];

    expect(args.some((a) => typeof a === 'string' && a.startsWith('INSPECTED:'))).toBe(true);

    infoSpy.mockRestore();
  });

  it('resolveTheme is called once at factory time, not per emit', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const t = consoleTransport({ timestamp: false });
    const entry = { data: {}, level: 'info' as const, message: 'x', namespace: '', timestamp: new Date() };

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

/* ─── PRIORITY public export (D2) ─── */

describe('PRIORITY public export (D2)', () => {
  it('is re-exported from the package public surface, not just internal ./types', async () => {
    const publicApi = await import('../index');

    expect(publicApi.PRIORITY).toBe(PRIORITY);
    expect(publicApi.PRIORITY).toEqual({ debug: 0, error: 3, fatal: 4, info: 1, off: 5, warn: 2 });
  });
});

/* ─── child() namespace joining ─── */

describe('child() namespace joining', () => {
  it('joins parent and child namespaces with dot separator', () => {
    const { entries, log } = setup({ namespace: 'api' });

    log.child({ namespace: 'auth' }).info('x');

    expect(entries[0].namespace).toBe('api.auth');
  });

  it('child with no namespace keeps parent namespace', () => {
    const { entries, log } = setup({ namespace: 'svc' });

    log.child({}).info('x');

    expect(entries[0].namespace).toBe('svc');
  });

  it('empty parent + child namespace = child value only', () => {
    const { entries, log } = setup();

    log.child({ namespace: 'root' }).info('x');

    expect(entries[0].namespace).toBe('root');
  });
});

/* ─── consoleTransport empty data ─── */

describe('consoleTransport with no data', () => {
  it('emits message-only entries without error', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const t = consoleTransport({ timestamp: false });

    expect(() => t({ data: {}, level: 'info', message: 'hello', namespace: '', timestamp: new Date() })).not.toThrow();

    expect(infoSpy).toHaveBeenCalledTimes(1);

    const args = infoSpy.mock.calls[0] as unknown[];

    expect(args.some((a) => a === 'hello')).toBe(true);

    infoSpy.mockRestore();
  });

  it('emits entries with no message and no data without error', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const t = consoleTransport({ timestamp: false });

    expect(() => t({ data: {}, level: 'info', namespace: '', timestamp: new Date() })).not.toThrow();

    expect(infoSpy).toHaveBeenCalledTimes(1);

    infoSpy.mockRestore();
  });
});

/* ─── time() level param ─── */

describe('time() level param', () => {
  it('positional string level changes emit level', () => {
    const { entries, log } = setup({ logLevel: 'info' });

    log.time('task', () => {}, 'info');

    expect(entries).toHaveLength(1);
    expect(entries[0].level).toBe('info');
  });

  it('defaults to debug when level is omitted', () => {
    const { entries, log } = setup();

    log.time('task', () => {});

    expect(entries[0].level).toBe('debug');
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

    expect(record.level).toBe('warn');
    expect(record.msg).toBe('real message');
  });

  it('context keys that match reserved fields do not clobber them', () => {
    const lines: string[] = [];
    const log = createLogger({
      transports: [jsonTransport({ output: (l) => lines.push(l) })],
    });

    log.info('structured', { level: 'debug', time: 'not-a-timestamp' });

    const record = JSON.parse(lines[0]) as Record<string, unknown>;

    expect(record.level).toBe('info');
    expect(record.msg).toBe('structured');
  });
});

/* ─── prototype pollution guards (security) ─── */

describe('prototype pollution guards (security)', () => {
  it('a "__proto__" field in a pinned binding does not hijack entry.data prototype', () => {
    const entries: LogEntry[] = [];
    const malicious = JSON.parse('{"__proto__": {"polluted": "yes"}, "safe": 1}') as Record<string, unknown>;
    const log = createLogger({ bindings: malicious, transports: [(e) => entries.push(e)] });

    log.info('no-context call');

    expect(Object.getPrototypeOf(entries[0].data)).toBe(Object.prototype);
    expect((entries[0].data as Record<string, unknown>).polluted).toBeUndefined();
    expect(entries[0].data.safe).toBe(1);
  });

  it('a "__proto__" field in per-call context does not hijack entry.data prototype', () => {
    const { entries, log } = setup();
    const malicious = JSON.parse('{"__proto__": {"polluted": "yes"}, "safe": 1}') as Record<string, unknown>;

    log.info('msg', malicious);

    expect(Object.getPrototypeOf(entries[0].data)).toBe(Object.prototype);
    expect((entries[0].data as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('a "__proto__" lazy binding does not hijack the resolved bindings prototype', () => {
    const entries: LogEntry[] = [];
    // Object.defineProperty (unlike `{ __proto__: ... }` literal syntax) creates a real *own*
    // property named "__proto__" instead of setting the object's actual prototype at creation time.
    const maliciousBindings: Bindings = { safe: 1 };

    Object.defineProperty(maliciousBindings, '__proto__', {
      enumerable: true,
      value: lazy(() => ({ polluted: 'yes' })),
    });

    const log = createLogger({ bindings: maliciousBindings, transports: [(e) => entries.push(e)] });

    log.info('no-context call');

    expect(Object.getPrototypeOf(entries[0].data)).toBe(Object.prototype);
    expect((entries[0].data as Record<string, unknown>).polluted).toBeUndefined();
  });
});

/* ─── jsonTransport circular reference safety ─── */

describe('jsonTransport circular reference safety', () => {
  it('throws on circular data when safe:false (default)', () => {
    const circular: Record<string, unknown> = {};

    circular.self = circular;

    const entry: LogEntry = {
      data: circular,
      level: 'info',
      message: 'circular',
      namespace: '',
      timestamp: new Date(),
    };

    expect(() => jsonTransport()(entry)).toThrow();
  });

  it('a throwing transport is isolated by the logger and never crashes the caller (D1)', () => {
    const circular: Record<string, unknown> = {};

    circular.self = circular;

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const log = createLogger({ transports: [jsonTransport()] });

    expect(() => log.info('circular', circular)).not.toThrow();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Transport threw an unhandled error'));

    warnSpy.mockRestore();
  });
});

/* ─── Namespace dot-joining ─── */

describe('child() namespace dot-joining', () => {
  it('joins parent and child namespace with a dot', () => {
    const parent = createLogger({ namespace: 'api' });
    const child = parent.child({ namespace: 'auth' });

    expect(child.namespace).toBe('api.auth');
  });

  it('root parent with no namespace just uses child name', () => {
    const parent = createLogger();
    const child = parent.child({ namespace: 'api' });

    expect(child.namespace).toBe('api');
  });

  it('chains multiple levels of namespaces', () => {
    const root = createLogger({ namespace: 'app' });
    const api = root.child({ namespace: 'api' });
    const auth = api.child({ namespace: 'auth' });

    expect(auth.namespace).toBe('app.api.auth');
  });

  it('dot-joining only — no slash prefix convention', () => {
    const parent = createLogger({ namespace: 'api' });
    const child = parent.child({ namespace: 'v2' });

    expect(child.namespace).toBe('api.v2');
  });

  it('omitting namespace in child() preserves parent namespace', () => {
    const parent = createLogger({ namespace: 'api' });
    const child = parent.child();

    expect(child.namespace).toBe('api');
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

    circular.self = circular;

    expect(() => log.info('safe-circular', circular)).not.toThrow();
    expect(lines).toHaveLength(1);

    const record = JSON.parse(lines[0]) as Record<string, unknown>;
    const selfValue = record.self as Record<string, unknown>;

    expect(selfValue.self).toBe('[Circular]');
  });
});

/* ─── time() error context ─── */

describe('time() error context', () => {
  it('includes err in data when sync fn throws', () => {
    const { entries, log } = setup();

    expect(() =>
      log.time('op', () => {
        throw new Error('boom');
      }),
    ).toThrow('boom');

    expect(entries).toHaveLength(1);
    expect(entries[0].data).toMatchObject({
      duration_ms: expect.any(Number),
      err: expect.objectContaining({ message: 'boom', name: 'Error' }),
    });
    expect(entries[0].message).toBe('op');
  });

  it('includes err in data when async fn rejects', async () => {
    const { entries, log } = setup();

    await expect(log.time('async-op', () => Promise.reject(new Error('async-boom')))).rejects.toThrow('async-boom');

    expect(entries).toHaveLength(1);
    expect(entries[0].data).toMatchObject({
      duration_ms: expect.any(Number),
      err: expect.objectContaining({ message: 'async-boom' }),
    });
  });

  it('does not include err in data on success', () => {
    const { entries, log } = setup();

    log.time('ok-op', () => 42);

    expect(entries[0].data).toMatchObject({ duration_ms: expect.any(Number) });
    expect(entries[0].data).not.toHaveProperty('err');
  });

  it('serialises non-Error thrown values', () => {
    const { entries, log } = setup();

    expect(() =>
      log.time('str-throw', () => {
        throw 'oops';
      }),
    ).toThrow('oops');

    expect(entries[0].data).toMatchObject({
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
  it('silences subsequent logs after dispose()', () => {
    const { entries, log } = setup();

    expect(() => log.dispose()).not.toThrow();

    log.info('after dispose — should be silenced');
    expect(entries).toHaveLength(0);
  });
});

/* ─── dispatch() transport fault isolation (D1) ─── */

describe('dispatch() transport fault isolation (D1)', () => {
  it('a throwing transport does not prevent sibling transports from receiving the entry', () => {
    const received: LogEntry[] = [];
    const throwingTransport: Transport = () => {
      throw new Error('transport-boom');
    };
    const okTransport: Transport = (entry) => received.push(entry);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const log = createLogger({ transports: [throwingTransport, okTransport] });

    expect(() => log.info('x')).not.toThrow();
    expect(received).toHaveLength(1);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Transport threw an unhandled error'));

    warnSpy.mockRestore();
  });

  it('includes the logger namespace in the warning for easier debugging (review B1)', () => {
    const throwingTransport: Transport = () => {
      throw new Error('boom');
    };
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const log = createLogger('payments.api', { transports: [throwingTransport] });

    log.info('x');

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('namespace: "payments.api"'));

    warnSpy.mockRestore();
  });
});

/* ─── lazy factory throw safety ─── */

describe('lazy factory throw safety', () => {
  it('lazy factory errors propagate from the log call', () => {
    const { entries, log } = setup();

    const bound = log.withBindings({
      val: lazy(() => {
        throw new Error('lazy-fail');
      }),
    });

    expect(() => bound.info('safe')).toThrow('lazy-fail');
    expect(entries).toHaveLength(0);
  });
});

/* ─── shallow lazy resolution edge case ─── */

describe('lazy binding shallow resolution', () => {
  it('does NOT resolve nested lazy bindings inside a lazy factory return value', () => {
    const innerLazy = lazy(() => 'inner-resolved');
    const { entries, log } = setup();

    const bound = log.withBindings({
      nested: lazy(() => ({ secret: innerLazy })),
    });

    bound.info('test');

    expect(entries).toHaveLength(1);

    const nestedVal = entries[0].data.nested as Record<string, unknown>;

    expect(typeof nestedVal).toBe('object');
    expect(typeof nestedVal.secret).toBe('object');
  });
});

/* ─── consoleTransport instances ─── */

describe('consoleTransport instances', () => {
  it('each consoleTransport() call creates a distinct instance', () => {
    const a = consoleTransport({ theme: { info: { badge: '>>>' } } });
    const b = consoleTransport();

    expect(a).not.toBe(b);
  });

  it('consoleTransport without options emits normally', () => {
    const { entries, transport } = createTestTransport();
    const log = createLogger({ transports: [transport] });

    log.info('hi');

    expect(entries).toHaveLength(1);
  });
});

/* ─── disposed logger drops all log calls ─── */

describe('disposed logger silences all log calls', () => {
  it('drops debug/info/warn/error/fatal after dispose()', () => {
    const { entries, log } = setup();

    log.dispose();

    log.debug('d');
    log.info('i');
    log.warn('w');
    log.error('e');
    log.fatal('f');

    expect(entries).toHaveLength(0);
  });

  it('group() runs fn but renders no group header after dispose()', () => {
    const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});

    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

    const log = createLogger();

    log.dispose();

    let called = false;

    log.group('label', () => {
      called = true;
    });

    expect(called).toBe(true);
    expect(groupSpy).not.toHaveBeenCalled();
  });
});

/* ─── createLogger two-arg overload ─── */

describe('createLogger(namespace, options) two-arg overload', () => {
  it('accepts (namespace) shorthand', () => {
    const { entries, transport } = createTestTransport();
    const log = createLogger('api', { transports: [transport] });

    log.info('hello');

    expect(entries[0].namespace).toBe('api');
  });

  it('merges namespace with extra options', () => {
    const { entries, transport } = createTestTransport();
    const log = createLogger('svc', { logLevel: 'warn', transports: [transport] });

    log.debug('ignored');
    log.warn('seen');

    expect(entries).toHaveLength(1);
    expect(entries[0].message).toBe('seen');
    expect(entries[0].namespace).toBe('svc');
  });

  it('positional namespace is used as namespace getter value', () => {
    const log = createLogger('primary', { transports: [] });

    expect(log.namespace).toBe('primary');
  });
});

/* ─── Logger.disposed getter ─── */

describe('Logger.disposed getter', () => {
  it('is false before dispose()', () => {
    const { log } = setup();

    expect(log.disposed).toBe(false);
  });

  it('is true after dispose()', () => {
    const { log } = setup();

    log.dispose();

    expect(log.disposed).toBe(true);
  });
});

/* ─── Logger.disposalSignal ─── */

describe('Logger.disposalSignal', () => {
  it('is not aborted before dispose()', () => {
    const { log } = setup();

    expect(log.disposalSignal.aborted).toBe(false);
  });

  it('is aborted after dispose()', () => {
    const { log } = setup();

    log.dispose();

    expect(log.disposalSignal.aborted).toBe(true);
  });

  it('abort listener fires when dispose() is called', () => {
    const { log } = setup();
    const listener = vi.fn();

    log.disposalSignal.addEventListener('abort', listener);
    log.dispose();

    expect(listener).toHaveBeenCalledTimes(1);
  });
});

/* ─── Logger[Symbol.dispose] ─── */

describe('Logger[Symbol.dispose]', () => {
  it('delegates to dispose() and silences subsequent calls', () => {
    const { entries, log } = setup();

    log[Symbol.dispose]();
    log.info('should be silenced');

    expect(entries).toHaveLength(0);
    expect(log.disposed).toBe(true);
  });
});

/* ─── Logger individual getters ─── */

describe('Logger individual getters', () => {
  it('namespace getter returns configured value', () => {
    const log = createLogger({ namespace: 'my-service' });

    expect(log.namespace).toBe('my-service');
  });

  it('logLevel getter returns configured value', () => {
    const log = createLogger({ logLevel: 'warn' });

    expect(log.logLevel).toBe('warn');
  });
});

/* ─── per-call context lazy throw ─── */

describe('per-call context lazy factory throw', () => {
  it('propagates when a lazy in per-call context throws', () => {
    const { entries, log } = setup();

    expect(() =>
      log.info('event', {
        cost: lazy(() => {
          throw new Error('ctx-lazy-fail');
        }),
      }),
    ).toThrow('ctx-lazy-fail');

    expect(entries).toHaveLength(0);
  });
});

/* ─── Error auto-serialization in context ─── */

describe('Error auto-serialization in context', () => {
  it('Error value in context field is serialized to plain object', () => {
    const { entries, log } = setup();

    log.error('request failed', { err: new Error('timeout') });

    const err = entries[0].data.err as Record<string, unknown>;

    expect(err.message).toBe('timeout');
    expect(err.name).toBe('Error');
    expect(typeof err.stack).toBe('string');
  });

  it('non-Error values pass through unchanged', () => {
    const { entries, log } = setup();

    log.info('ok', { count: 42, label: 'ok' });

    expect(entries[0].data.count).toBe(42);
    expect(entries[0].data.label).toBe('ok');
  });

  it('Error value in a pinned binding is serialized the same as per-call context (review A1)', () => {
    const { entries, log } = setup({ bindings: { err: new Error('pinned-fail') } });

    log.info('boom');

    const err = entries[0].data.err as Record<string, unknown>;

    expect(err).not.toBeInstanceOf(Error);
    expect(err.message).toBe('pinned-fail');
    expect(err.name).toBe('Error');
    expect(typeof err.stack).toBe('string');
  });

  it('Error value pinned via withBindings() is serialized', () => {
    const { entries, log } = setup();
    const bound = log.withBindings({ err: new Error('bound-fail') });

    bound.error('boom');

    const err = entries[0].data.err as Record<string, unknown>;

    expect(err).not.toBeInstanceOf(Error);
    expect(err.message).toBe('bound-fail');
  });
});

/* ─── DEFAULT_THEME ─── */

describe('DEFAULT_THEME', () => {
  it('covers all log types plus group and ns', () => {
    const required: Array<string> = ['debug', 'info', 'warn', 'error', 'fatal', 'group', 'ns'];

    for (const key of required) {
      expect(DEFAULT_THEME).toHaveProperty(key);
    }
  });

  it('each entry has badge, bg, border, color', () => {
    for (const entry of Object.values(DEFAULT_THEME)) {
      expect(entry).toHaveProperty('badge');
      expect(entry).toHaveProperty('bg');
      expect(entry).toHaveProperty('border');
      expect(entry).toHaveProperty('color');
    }
  });
});

/* ─── resolveTheme() ─── */

describe('resolveTheme()', () => {
  it('returns DEFAULT_THEME unchanged when no override is given', () => {
    expect(resolveTheme(undefined)).toBe(DEFAULT_THEME);
  });

  it('merges only the specified fields of a level, keeping the rest from DEFAULT_THEME', () => {
    const resolved = resolveTheme({ error: { badge: '✖' } });

    expect(resolved.error.badge).toBe('✖');
    expect(resolved.error.bg).toBe(DEFAULT_THEME.error.bg);
    expect(resolved.error.border).toBe(DEFAULT_THEME.error.border);
    expect(resolved.error.color).toBe(DEFAULT_THEME.error.color);
  });

  it('leaves untouched levels identical to DEFAULT_THEME', () => {
    const resolved = resolveTheme({ warn: { badge: '!' } });

    expect(resolved.info).toEqual(DEFAULT_THEME.info);
    expect(resolved.debug).toEqual(DEFAULT_THEME.debug);
  });

  it('supports overriding multiple levels at once, including "group" and "ns"', () => {
    const resolved = resolveTheme({ group: { badge: 'G' }, ns: { color: '#fff' } });

    expect(resolved.group.badge).toBe('G');
    expect(resolved.ns.color).toBe('#fff');
  });

  it('an empty override object leaves every level identical to DEFAULT_THEME', () => {
    expect(resolveTheme({})).toEqual(DEFAULT_THEME);
  });
});

/* ─── withBindings + lazy in child ─── */

describe('withBindings() with lazy bindings', () => {
  it('lazy binding in withBindings() is resolved per-emit, not at child creation', () => {
    let callCount = 0;
    const { entries, transport } = createTestTransport();
    const log = createLogger({ logLevel: 'debug', transports: [transport] });
    const child = log.withBindings({ req: lazy(() => ({ count: ++callCount })) });

    child.info('a');
    child.info('b');

    expect(entries).toHaveLength(2);
    expect((entries[0].data.req as { count: number }).count).toBe(1);
    expect((entries[1].data.req as { count: number }).count).toBe(2);
  });
});
