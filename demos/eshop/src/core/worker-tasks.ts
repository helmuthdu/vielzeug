import { createWorker } from '@vielzeug/familiar';

import type { Order } from './types';

function serializeOrdersAsCsv(orders: Order[]): string {
  const header = 'id,userId,status,placedAt,estimatedDeliveryDate,totalAmount,paymentMethod,models';
  const rows = orders.map((o) =>
    [
      o.id,
      o.userId,
      o.status,
      o.placedAt,
      o.estimatedDeliveryDate,
      o.totalAmount,
      o.paymentMethod,
      o.items.map((i) => i.modelName).join(' + '),
    ]
      .map((v) => JSON.stringify(String(v)))
      .join(','),
  );

  return [header, ...rows].join('\n');
}

/**
 * Exports orders to a downloadable CSV via a `@vielzeug/familiar` worker thread — kept off the
 * main thread the same way demos/kanban/src/core/csv-export.ts does, scoped to this one call
 * (no long-lived pool to justify a module-scope singleton).
 */
export async function exportOrdersAsCsv(orders: Order[]): Promise<void> {
  const worker = createWorker(serializeOrdersAsCsv);

  try {
    const csv = await worker.run(orders);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = 'orders.csv';
    a.click();
    URL.revokeObjectURL(url);
  } finally {
    worker.dispose();
  }
}
