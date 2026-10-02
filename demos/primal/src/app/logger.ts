import { signal } from '@vielzeug/ripple';
import type { LogEntry, Transport } from '@vielzeug/rune';
import { consoleTransport, createLogger } from '@vielzeug/rune';

const HISTORY_LIMIT = 50;

/** Recent log entries double as the in-app activity history shown in Settings. */
export const activityLog = signal<LogEntry[]>([]);

const memoryTransport: Transport = (entry) => {
  activityLog.update((entries) => [entry, ...entries].slice(0, HISTORY_LIMIT));
};

export const logger = createLogger({
  namespace: 'primal',
  // Production keeps the in-app activity history but quiets the console to warnings;
  // development logs everything.
  transports: [consoleTransport({ level: import.meta.env.PROD ? 'warn' : 'debug' }), memoryTransport],
});
export const campaignLogger = logger.child({ namespace: 'campaign' });
export const expeditionLogger = logger.child({ namespace: 'expedition' });
