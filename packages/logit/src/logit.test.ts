/** biome-ignore-all lint/suspicious/noExplicitAny: test spies */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLogger, Logit } from './logit';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Create a fresh logger and spy on all console methods. */
function setup(opts = {}) {
  const log = createLogger({ logLevel: 'debug', timestamp: false, environment: false, ...opts });
  const spies = {
    log: vi.spyOn(console, 'log').mockImplementation(() => {}),
    error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    info: vi.spyOn(console, 'info').mockImplementation(() => {}),
    trace: vi.spyOn(console, 'trace').mockImplementation(() => {}),
    table: vi.spyOn(console, 'table').mockImplementation(() => {}),
    time: vi.spyOn(console, 'time').mockImplementation(() => {}),
    timeEnd: vi.spyOn(console, 'timeEnd').mockImplementation(() => {}),
    groupCollapsed: vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {}),
    groupEnd: vi.spyOn(console, 'groupEnd').mockImplementation(() => {}),
    group: vi.spyOn(console, 'group').mockImplementation(() => {}),
    assert: vi.spyOn(console, 'assert').mockImplementation(() => {}),
  };
  return { log, spies };
}

afterEach(() => vi.restoreAllMocks());

// ─── Factory ──────────────────────────────────────────────────────────────────

describe('createLogger', () => {
  it('string shorthand sets the namespace', () => {
    expect(createLogger('MyApp').getConfig().namespace).toBe('MyApp');
  });

  it('each call returns an isolated instance — config changes do not bleed', () => {
    const a = createLogger({ logLevel: 'debug' });
    const b = createLogger({ logLevel: 'error' });
    a.config({ logLevel: 'warn' });
    expect(a.getConfig().logLevel).toBe('warn');
    expect(b.getConfig().logLevel).toBe('error');
  });

  it('initial options override all defaults', () => {
    const cfg = createLogger({ logLevel: 'error', namespace: 'App', timestamp: false, variant: 'icon' }).getConfig();
    expect(cfg).toMatchObject({ logLevel: 'error', namespace: 'App', timestamp: false, variant: 'icon' });
  });

  it('Logit is a pre-created default instance with the full Logger API', () => {
    expect(typeof Logit.info).toBe('function');
    expect(typeof Logit.scope).toBe('function');
    expect(typeof Logit.child).toBe('function');
  });
});

// ─── config() / getConfig() ─────────────────────────────────────────────────

describe('config() / getConfig()', () => {
  it('applies partial updates — unset keys are preserved', () => {
    const { log } = setup();

    log.config({ logLevel: 'warn' });
    expect(log.getConfig().logLevel).toBe('warn');
    expect(log.getConfig().variant).toBe('symbol'); // default preserved
  });

  it('merges remote config rather than replacing it wholesale', () => {
    const handler = vi.fn();
    const { log } = setup();

    log.config({ remote: { handler, logLevel: 'warn' } });
    log.config({ remote: { logLevel: 'error' } }); // update level only

    // handler survives the second config call
    expect(log.getConfig().remote.handler).toBe(handler);
    expect(log.getConfig().remote.logLevel).toBe('error');
  });

  it('getConfig returns a snapshot — mutating it does not affect the logger', () => {
    const { log } = setup();
    const cfg = log.getConfig() as any;
    cfg.logLevel = 'off';

    expect(log.getConfig().logLevel).toBe('debug'); // unchanged
  });

  it('config() returns the logger for fluent chaining', () => {
    const { log, spies } = setup();
    log.config({ logLevel: 'error' }).error('chained');
    expect(spies.error).toHaveBeenCalledTimes(1);
  });
});

// ─── Emit ─────────────────────────────────────────────────────────────────────

describe('Emit', () => {
  it('routes each type to the correct console method', () => {
    const { log, spies } = setup();
    log.debug('d'); log.success('s'); log.trace('t'); log.info('i'); log.warn('w'); log.error('e');
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
    log.debug('no'); log.info('no');
    log.warn('yes'); log.error('yes');
    expect(spies.log).not.toHaveBeenCalled();
    expect(spies.info).not.toHaveBeenCalled();
    expect(spies.warn).toHaveBeenCalledTimes(1);
    expect(spies.error).toHaveBeenCalledTimes(1);
  });

  it('logLevel "off" suppresses all output including utilities', () => {
    const { log, spies } = setup({ logLevel: 'off' });
    log.debug('x'); log.error('x'); log.table([{}]);
    log.time('x'); log.group(); log.groupEnd(); log.assert(false, 'x');
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
    log.config({ logLevel: 'debug' });
    expect(log.enabled('warn')).toBe(true);
  });
});

// ─── scope() and child() ──────────────────────────────────────────────────────

describe('scope() and child()', () => {
  it('scope() prepends namespace to the output', () => {
    const { log, spies } = setup({ namespace: 'Global' });
    log.scope('api').info('call');
    expect(spies.info.mock.calls[0][0]).toContain('Global.api');
    expect(log.getConfig().namespace).toBe('Global'); // parent unchanged
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
    log.config({ namespace: 'B' });
    scoped.info('x');
    expect(spies.info.mock.calls[0][0]).toContain('A.sub');
    expect(spies.info.mock.calls[0][0]).not.toContain('B');
  });

  it('child() inherits a full snapshot of the parent config', () => {
    const parent = createLogger({ logLevel: 'warn', namespace: 'App', variant: 'icon' });
    expect(parent.child().getConfig()).toMatchObject({ logLevel: 'warn', namespace: 'App', variant: 'icon' });
  });

  it('child() overrides do not affect the parent', () => {
    const parent = createLogger({ logLevel: 'warn', namespace: 'App' });
    const child = parent.child({ logLevel: 'debug', namespace: 'Child' });
    expect(child.getConfig().logLevel).toBe('debug');
    expect(parent.getConfig().logLevel).toBe('warn');
    expect(parent.getConfig().namespace).toBe('App');
  });

  it('parent config changes after child() do not affect the child', () => {
    const parent = createLogger({ logLevel: 'info' });
    const child = parent.child();
    parent.config({ logLevel: 'error' });
    expect(child.getConfig().logLevel).toBe('info');
  });

  it('child() merges remote config — parent handler is inherited by default', () => {
    const handler = vi.fn();
    const child = createLogger({ remote: { handler, logLevel: 'warn' } }).child({ remote: { logLevel: 'debug' } });
    expect(child.getConfig().remote.handler).toBe(handler);
    expect(child.getConfig().remote.logLevel).toBe('debug');
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
          environment: expect.stringMatching(/production|development/),
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

    log.config({ remote: { handler, logLevel: 'warn' } });
    log.warn('w2');
    await vi.waitFor(() => expect(handler).toHaveBeenCalledWith('warn', expect.objectContaining({ args: ['w2'] })));
  });

  it('omits namespace and timestamp from remote data when not configured', async () => {
    const handler = vi.fn();
    const { log } = setup({ timestamp: false, remote: { handler, logLevel: 'debug' } });

    log.info('msg');
    await vi.waitFor(() =>
      expect(handler).toHaveBeenCalledWith(
        'info',
        expect.objectContaining({ namespace: undefined, timestamp: undefined }),
      ),
    );
  });
});

// ─── Timers ───────────────────────────────────────────────────────────────────

describe('Timers', () => {
  it('time() and timeEnd() forward the label to console', () => {
    const { log, spies } = setup();
    log.time('render'); log.timeEnd('render');
    expect(spies.time).toHaveBeenCalledWith('render');
    expect(spies.timeEnd).toHaveBeenCalledWith('render');
  });

  it('prefixes the label with [namespace] when set to avoid collisions', () => {
    const { log, spies } = setup({ namespace: 'db' });
    log.time('query'); log.timeEnd('query');
    expect(spies.time).toHaveBeenCalledWith('[db] query');
    expect(spies.timeEnd).toHaveBeenCalledWith('[db] query');
  });

  it('suppressed below the "time" priority level', () => {
    const { log, spies } = setup({ logLevel: 'table' });
    log.time('x');
    expect(spies.time).not.toHaveBeenCalled();
  });
});

// ─── Groups ───────────────────────────────────────────────────────────────────

describe('Groups', () => {
  it('group() calls console.group with the label in the output', () => {
    const { log, spies } = setup();
    log.group('SECTION');
    expect(spies.group).toHaveBeenCalledOnce();
    expect(spies.group.mock.calls[0][0]).toContain('SECTION');
  });

  it('groupCollapsed() calls console.groupCollapsed with the label', () => {
    const { log, spies } = setup();
    log.groupCollapsed('DETAILS');
    expect(spies.groupCollapsed).toHaveBeenCalledOnce();
    expect(spies.groupCollapsed.mock.calls[0][0]).toContain('DETAILS');
  });

  it('groupEnd() closes the active group', () => {
    const { log, spies } = setup();
    log.group(); log.groupEnd();
    expect(spies.groupEnd).toHaveBeenCalledOnce();
  });

  it('all group methods are suppressed below the debug level', () => {
    const { log, spies } = setup({ logLevel: 'info' });
    log.group(); log.groupCollapsed(); log.groupEnd();
    expect(spies.group).not.toHaveBeenCalled();
    expect(spies.groupCollapsed).not.toHaveBeenCalled();
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

  it('suppressed below the "table" priority level', () => {
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

  it('suppressed below the error threshold', () => {
    const { log, spies } = setup({ logLevel: 'off' });
    log.assert(false, 'x');
    expect(spies.assert).not.toHaveBeenCalled();
  });
});
