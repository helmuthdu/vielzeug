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

  describe('Basic logging methods', () => {
    it('logs debug messages', () => {
      Logit.debug('test message');
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('logs info messages', () => {
      Logit.info('info message');
      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    it('logs success messages', () => {
      Logit.success('success message');
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('logs warning messages', () => {
      Logit.warn('warning message');
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('logs error messages', () => {
      Logit.error('error message');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('logs trace messages', () => {
      Logit.trace('trace message');
      expect(consoleTraceSpy).toHaveBeenCalled();
    });

    it('handles multiple arguments', () => {
      Logit.info('message', { key: 'value' }, 123);
      expect(consoleInfoSpy).toHaveBeenCalled();
    });
  });

  describe('Log level filtering', () => {
    it('respects log level settings', () => {
      Logit.setLogLevel('error');

      Logit.debug('should not log');
      Logit.info('should not log');
      Logit.warn('should not log');
      Logit.error('should log');

      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('disables all logs when set to "off"', () => {
      Logit.setLogLevel('off');

      Logit.debug('test');
      Logit.info('test');
      Logit.error('test');

      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('allows all logs when set to "debug"', () => {
      Logit.setLogLevel('debug');

      Logit.debug('test');
      Logit.info('test');
      Logit.error('test');

      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleInfoSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('filters intermediate log levels correctly', () => {
      Logit.setLogLevel('warn');

      Logit.debug('should not log');
      Logit.info('should not log');
      Logit.warn('should log');
      Logit.error('should log');

      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('Configuration', () => {
    it('gets and sets log level', () => {
      Logit.setLogLevel('warn');
      expect(Logit.getLevel()).toBe('warn');

      Logit.setLogLevel('error');
      expect(Logit.getLevel()).toBe('error');
    });

    it('gets and sets namespace prefix', () => {
      Logit.setPrefix('MyApp');
      expect(Logit.getPrefix()).toBe('MyApp');

      Logit.setPrefix('');
      expect(Logit.getPrefix()).toBe('');
    });

    it('gets and sets timestamp visibility', () => {
      Logit.showTimestamp(false);
      expect(Logit.getTimestamp()).toBe(false);

      Logit.showTimestamp(true);
      expect(Logit.getTimestamp()).toBe(true);
    });

    it('sets display variant', () => {
      Logit.setVariant('text');
      Logit.info('test');
      expect(consoleInfoSpy).toHaveBeenCalled();

      Logit.setVariant('icon');
      Logit.info('test');
      expect(consoleInfoSpy).toHaveBeenCalled();

      Logit.setVariant('symbol');
      Logit.info('test');
      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    it('toggles environment indicator', () => {
      Logit.showEnvironment(false);
      Logit.info('test');
      expect(consoleInfoSpy).toHaveBeenCalled();

      Logit.showEnvironment(true);
      Logit.info('test');
      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    it('initializes with custom options', () => {
      Logit.initialise({
        environment: false,
        logLevel: 'error',
        namespace: 'TestApp',
        timestamp: false,
        variant: 'text',
      });

      expect(Logit.getLevel()).toBe('error');
      expect(Logit.getPrefix()).toBe('TestApp');
      expect(Logit.getTimestamp()).toBe(false);
    });
  });

  describe('Remote logging', () => {
    it('sends logs to remote handler when configured', () => {
      const remoteHandler = vi.fn();

      Logit.setRemote({
        handler: remoteHandler,
        logLevel: 'info',
      });

      Logit.debug('debug message');
      expect(remoteHandler).not.toHaveBeenCalled();

      Logit.info('info message');
      expect(remoteHandler).toHaveBeenCalledWith('info', 'info message');

      Logit.error('error message');
      expect(remoteHandler).toHaveBeenCalledWith('error', 'error message');
    });

    it('respects remote log level independently', () => {
      const remoteHandler = vi.fn();

      Logit.setLogLevel('debug');
      Logit.setRemote({
        handler: remoteHandler,
        logLevel: 'warn',
      });

      Logit.info('info message');
      expect(consoleInfoSpy).toHaveBeenCalled();
      expect(remoteHandler).not.toHaveBeenCalled();

      Logit.warn('warn message');
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(remoteHandler).toHaveBeenCalledWith('warn', 'warn message');
    });

    it('updates remote log level independently', () => {
      const remoteHandler = vi.fn();

      Logit.setRemote({
        handler: remoteHandler,
        logLevel: 'error',
      });

      Logit.warn('warning');
      expect(remoteHandler).not.toHaveBeenCalled();

      Logit.setRemoteLogLevel('warn');
      Logit.warn('warning');
      expect(remoteHandler).toHaveBeenCalledWith('warn', 'warning');
    });
  });

  describe('Utility methods', () => {
    it('creates table output', () => {
      const data = [
        { age: 30, name: 'Alice' },
        { age: 25, name: 'Bob' },
      ];

      Logit.table(data);
      expect(consoleTableSpy).toHaveBeenCalledWith(data);
    });

    it('respects log level for table output', () => {
      Logit.setLogLevel('off');

      Logit.table([{ a: 1 }]);
      expect(consoleTableSpy).not.toHaveBeenCalled();
    });

    it('starts and ends timers', () => {
      Logit.time('myTimer');
      expect(consoleTimeSpy).toHaveBeenCalledWith('myTimer');

      Logit.timeEnd('myTimer');
      expect(consoleTimeEndSpy).toHaveBeenCalledWith('myTimer');
    });

    it('respects log level for timers', () => {
      Logit.setLogLevel('off');

      Logit.time('timer');
      Logit.timeEnd('timer');

      expect(consoleTimeSpy).not.toHaveBeenCalled();
      expect(consoleTimeEndSpy).not.toHaveBeenCalled();
    });

    it('creates and ends console groups', () => {
      Logit.groupCollapsed('Group Title');
      expect(consoleGroupCollapsedSpy).toHaveBeenCalled();

      Logit.groupEnd();
      expect(consoleGroupEndSpy).toHaveBeenCalled();
    });

    it('respects log level for groups', () => {
      Logit.setLogLevel('off');

      Logit.groupCollapsed('Group');
      Logit.groupEnd();

      expect(consoleGroupCollapsedSpy).not.toHaveBeenCalled();
      expect(consoleGroupEndSpy).not.toHaveBeenCalled();
    });

    it('handles custom group labels and timestamps', () => {
      const startTime = Date.now() - 1000;

      Logit.groupCollapsed('My Group', 'CUSTOM', startTime);
      expect(consoleGroupCollapsedSpy).toHaveBeenCalled();

      const callArgs = consoleGroupCollapsedSpy.mock.calls[0];
      expect(callArgs[0]).toContain('CUSTOM');
      expect(callArgs[0]).toContain('My Group');
    });

    it('asserts conditions', () => {
      Logit.assert(true, 'Should pass', { data: 'test' });
      expect(consoleAssertSpy).toHaveBeenCalledWith(true, 'Should pass', { data: 'test' });

      Logit.assert(false, 'Should fail', { error: true });
      expect(consoleAssertSpy).toHaveBeenCalledWith(false, 'Should fail', { error: true });
    });
  });

  describe('Namespace handling', () => {
    it('includes namespace in log output when set', () => {
      Logit.setPrefix('MyApp');
      Logit.info('test message');

      expect(consoleInfoSpy).toHaveBeenCalled();
      const formatString = consoleInfoSpy.mock.calls[0][0];
      expect(formatString).toContain('MyApp');
    });

    it('does not include namespace when empty', () => {
      Logit.setPrefix('');
      Logit.info('test message');

      expect(consoleInfoSpy).toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('handles logging with no arguments', () => {
      Logit.info();
      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    it('handles logging with complex objects', () => {
      const complexObj = {
        array: [1, 2, 3],
        fn: () => {},
        nested: { deep: { value: 123 } },
      };

      Logit.debug(complexObj);
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('handles logging with null and undefined', () => {
      Logit.info(null, undefined);
      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    it('handles rapid log level changes', () => {
      Logit.setLogLevel('debug');
      Logit.setLogLevel('info');
      Logit.setLogLevel('warn');
      Logit.setLogLevel('error');

      expect(Logit.getLevel()).toBe('error');
    });
  });

  describe('Type coverage', () => {
    it('supports all log types in sequence', () => {
      Logit.debug('debug');
      Logit.trace('trace');
      Logit.info('info');
      Logit.success('success');
      Logit.warn('warn');
      Logit.error('error');

      expect(consoleLogSpy).toHaveBeenCalledTimes(2); // debug, success
      expect(consoleTraceSpy).toHaveBeenCalledTimes(1); // trace
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });
  });
});
