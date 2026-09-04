import type { LogEntry, Transport } from '@vielzeug/rune';
import { consoleTransport, createLogger, pipe } from '@vielzeug/rune';

export const logEntries: LogEntry[] = [];
const memoryTransport: Transport = (entry) => {
  logEntries.push(entry);
  if (logEntries.length > 100) logEntries.shift();
};
export const logger = createLogger({ namespace: 'crm', transports: [pipe(consoleTransport(), memoryTransport)] });
export const pipelineLogger = logger.child({ namespace: 'pipeline' });
export const apiLogger = logger.child({ namespace: 'api' });
export const syncLogger = logger.child({ namespace: 'sync' });
export const realtimeLogger = logger.child({ namespace: 'realtime' });
