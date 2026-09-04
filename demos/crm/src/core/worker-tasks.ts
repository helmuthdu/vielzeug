import { createWorker } from '@vielzeug/familiar';
import type { Contact } from './types';

export async function countContactsByTitle(contacts: Contact[]): Promise<Record<string, number>> {
  const worker = createWorker<Contact[], Record<string, number>>(
    new URL('../workers/analytics.worker.ts', import.meta.url),
  );
  try {
    return await worker.run(contacts);
  } finally {
    worker.dispose();
  }
}
