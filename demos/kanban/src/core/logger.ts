import type { LogEntry, Transport } from '@vielzeug/rune';

import { createLogger, consoleTransport, pipe } from '@vielzeug/rune';

const MAX_RING_BUFFER_SIZE = 200;

export const ringBuffer: LogEntry[] = [];

const ringBufferTransport: Transport = (entry: LogEntry): void => {
  ringBuffer.push(entry);

  if (ringBuffer.length > MAX_RING_BUFFER_SIZE) {
    ringBuffer.splice(0, ringBuffer.length - MAX_RING_BUFFER_SIZE);
  }
};

export const logger = createLogger({
  namespace: 'kanban',
  transports: [pipe(consoleTransport(), ringBufferTransport)],
});
