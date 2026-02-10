/** biome-ignore-all lint/suspicious/noExplicitAny: test spies */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Logit } from './logit';

describe('Logit', () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;
  let consoleInfoSpy: any;
  let consoleTraceSpy: any;
  let consoleTableSpy: any;
  let consoleTimeSpy: any;
  let consoleTimeEndSpy: any;
  let consoleGroupCollapsedSpy: any;
  let consoleGroupEndSpy: any;
  let consoleAssertSpy: any;

  beforeEach(() => {
    // Reset Logit to default state
    Logit.initialise({
      environment: true,
      logLevel: 'debug',
      namespace: '',
      timestamp: true,
      variant: 'symbol',
    });

    // Spy on console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleTraceSpy = vi.spyOn(console, 'trace').mockImplementation(() => {});
    consoleTableSpy = vi.spyOn(console, 'table').mockImplementation(() => {});
    consoleTimeSpy = vi.spyOn(console, 'time').mockImplementation(() => {});
    consoleTimeEndSpy = vi.spyOn(console, 'timeEnd').mockImplementation(() => {});
    consoleGroupCollapsedSpy = vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
    consoleGroupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    consoleAssertSpy = vi.spyOn(console, 'assert').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Logging', () => {
    it('logs all message types with multiple arguments', () => {
      Logit.debug('debug', { data: 1 });
      Logit.trace('trace');
      Logit.info('info', 123);
      Logit.success('success');
      Logit.warn('warn', null, undefined);
      Logit.error('error', [1, 2, 3]);

      expect(consoleLogSpy).toHaveBeenCalledTimes(2); // debug, success
      expect(consoleTraceSpy).toHaveBeenCalledTimes(1);
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Log Level Filtering', () => {
    it('filters logs based on level (error, warn, off)', () => {
      Logit.setLogLevel('error');
      Logit.debug('no');
      Logit.info('no');
      Logit.warn('no');
      Logit.error('yes');
      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();

      vi.clearAllMocks();
      Logit.setLogLevel('warn');
      Logit.info('no');
      Logit.warn('yes');
      Logit.error('yes');
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();

      vi.clearAllMocks();
      Logit.setLogLevel('off');
      Logit.debug('no');
      Logit.error('no');
      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('Configuration & Getters', () => {
    it('gets and sets all configuration options', () => {
      Logit.setLogLevel('warn');
      expect(Logit.getLevel()).toBe('warn');

      Logit.setPrefix('App');
      expect(Logit.getPrefix()).toBe('App');

      Logit.toggleTimestamp(false);
      expect(Logit.getTimestamp()).toBe(false);

      Logit.toggleEnvironment(false);
      expect(Logit.getEnvironment()).toBe(false);

      Logit.setVariant('text');
      expect(Logit.getVariant()).toBe('text');
    });

    it('toggles configuration without arguments', () => {
      // Toggle timestamp (starts as true from beforeEach)
      Logit.toggleTimestamp(); // Should toggle to false
      expect(Logit.getTimestamp()).toBe(false);

      Logit.toggleTimestamp(); // Should toggle back to true
      expect(Logit.getTimestamp()).toBe(true);

      // Toggle environment (starts as true from beforeEach)
      Logit.toggleEnvironment(); // Should toggle to false
      expect(Logit.getEnvironment()).toBe(false);

      Logit.toggleEnvironment(); // Should toggle back to true
      expect(Logit.getEnvironment()).toBe(true);
    });

    it('initializes with custom options and merges remote config', () => {
      const remoteHandler = vi.fn();

      Logit.initialise({
        environment: false,
        logLevel: 'error',
        namespace: 'TestApp',
        remote: { handler: remoteHandler, logLevel: 'warn' },
        timestamp: false,
        variant: 'icon',
      });

      expect(Logit.getLevel()).toBe('error');
      expect(Logit.getPrefix()).toBe('TestApp');
      expect(Logit.getTimestamp()).toBe(false);
      expect(Logit.getEnvironment()).toBe(false);
      expect(Logit.getVariant()).toBe('icon');
    });
  });

  describe('Display Variants', () => {
    it('works with all variants (text, icon, symbol)', () => {
      const variants: Array<'text' | 'icon' | 'symbol'> = ['text', 'icon', 'symbol'];

      variants.forEach((variant) => {
        Logit.setVariant(variant);
        Logit.info('test');
        expect(consoleInfoSpy).toHaveBeenCalled();
        vi.clearAllMocks();
      });
    });
  });

  describe('Namespace', () => {
    it('includes namespace in log output', () => {
      Logit.setPrefix('MyApp');
      Logit.info('test');

      const formatString = consoleInfoSpy.mock.calls[0][0];
      expect(formatString).toContain('MyApp');
    });
  });

  describe('Scoped Logger', () => {
    it('creates scoped logger without mutating global state', () => {
      Logit.setPrefix('Global');
      const apiLogger = Logit.scope('api');
      const dbLogger = Logit.scope('database');

      apiLogger.info('API call');
      let formatString = consoleInfoSpy.mock.calls[0][0];
      expect(formatString).toContain('Global.api');

      vi.clearAllMocks();

      dbLogger.error('DB error');
      formatString = consoleErrorSpy.mock.calls[0][0];
      expect(formatString).toContain('Global.database');

      // Global namespace unchanged
      expect(Logit.getPrefix()).toBe('Global');
    });

    it('supports all log methods in scoped logger', () => {
      const scoped = Logit.scope('test');

      scoped.debug('debug');
      scoped.trace('trace');
      scoped.info('info');
      scoped.success('success');
      scoped.warn('warn');
      scoped.error('error');

      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
      expect(consoleTraceSpy).toHaveBeenCalledTimes(1);
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('creates nested scopes', () => {
      Logit.setPrefix('outer');
      const inner = Logit.scope('inner');

      Logit.setPrefix('');
      inner.info('nested');

      const formatString = consoleInfoSpy.mock.calls[0][0];
      expect(formatString).toContain('outer.inner');
    });
  });

  describe('Remote Logging', () => {
    it('sends logs with metadata to remote handler', async () => {
      const remoteHandler = vi.fn();

      Logit.setRemote({
        handler: remoteHandler,
        logLevel: 'info',
      });

      Logit.setPrefix('App');
      Logit.toggleTimestamp(true);
      Logit.debug('debug'); // Below threshold

      await vi.waitFor(() => expect(remoteHandler).not.toHaveBeenCalled());

      Logit.info('info message');

      await vi.waitFor(() => {
        expect(remoteHandler).toHaveBeenCalledWith(
          'info',
          expect.objectContaining({
            args: ['info message'],
            environment: expect.stringMatching(/production|development/),
            namespace: 'App',
            timestamp: expect.any(String),
          }),
        );
      });
    });

    it('respects independent remote log level', async () => {
      const remoteHandler = vi.fn();

      Logit.setLogLevel('debug');
      Logit.setRemote({ handler: remoteHandler, logLevel: 'warn' });

      Logit.info('info');
      expect(consoleInfoSpy).toHaveBeenCalled(); // Console logs
      await vi.waitFor(() => expect(remoteHandler).not.toHaveBeenCalled()); // Remote doesn't

      Logit.warn('warn');
      expect(consoleWarnSpy).toHaveBeenCalled();
      await vi.waitFor(() =>
        expect(remoteHandler).toHaveBeenCalledWith(
          'warn',
          expect.objectContaining({
            args: ['warn'],
          }),
        ),
      );
    });

    it('updates remote log level dynamically', async () => {
      const remoteHandler = vi.fn();

      Logit.setRemote({ handler: remoteHandler, logLevel: 'error' });

      Logit.warn('warning');
      await vi.waitFor(() => expect(remoteHandler).not.toHaveBeenCalled());

      Logit.setRemoteLogLevel('warn');
      Logit.warn('warning');

      await vi.waitFor(() =>
        expect(remoteHandler).toHaveBeenCalledWith(
          'warn',
          expect.objectContaining({
            args: ['warning'],
          }),
        ),
      );
    });
  });

  describe('Utility Methods', () => {
    it('handles table, time, groups, and assert', () => {
      const data = [{ age: 30, name: 'Alice' }];

      Logit.table(data);
      expect(consoleTableSpy).toHaveBeenCalledWith(data);

      Logit.time('timer');
      expect(consoleTimeSpy).toHaveBeenCalledWith('timer');

      Logit.timeEnd('timer');
      expect(consoleTimeEndSpy).toHaveBeenCalledWith('timer');

      Logit.groupCollapsed('Group', 'LABEL', Date.now() - 1000);
      expect(consoleGroupCollapsedSpy).toHaveBeenCalled();
      expect(consoleGroupCollapsedSpy.mock.calls[0][0]).toContain('LABEL');

      Logit.groupEnd();
      expect(consoleGroupEndSpy).toHaveBeenCalled();

      Logit.assert(false, 'Failed', { error: true });
      expect(consoleAssertSpy).toHaveBeenCalledWith(false, 'Failed', { error: true });
    });

    it('respects log level for utility methods', () => {
      Logit.setLogLevel('off');

      Logit.table([{}]);
      Logit.time('t');
      Logit.timeEnd('t');
      Logit.groupCollapsed('g');
      Logit.groupEnd();

      expect(consoleTableSpy).not.toHaveBeenCalled();
      expect(consoleTimeSpy).not.toHaveBeenCalled();
      expect(consoleTimeEndSpy).not.toHaveBeenCalled();
      expect(consoleGroupCollapsedSpy).not.toHaveBeenCalled();
      expect(consoleGroupEndSpy).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles no arguments, null, undefined, and complex objects', () => {
      Logit.info();
      Logit.info(null, undefined);
      Logit.info({ arr: [1, 2, 3], fn: () => {}, nested: { deep: { value: 123 } } });

      expect(consoleInfoSpy).toHaveBeenCalledTimes(3);
    });
  });
});
