import { createWorker } from '@vielzeug/familiar';

import type { Order } from './types';

export async function exportOrdersAsCsv(orders: Order[]): Promise<void> {
  const worker = createWorker<Order[], string>(new URL('./worker-tasks.worker.ts', import.meta.url));

  try {
    const csv = await worker.run(orders);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = 'orders.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  } finally {
    worker.dispose();
  }
}
