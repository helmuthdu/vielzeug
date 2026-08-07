import { exposeTask } from '@vielzeug/familiar/protocol';

import type { Order } from './types';

function serializeOrdersAsCsv(orders: Order[]): string {
  const header = 'id,userId,status,placedAt,estimatedDeliveryDate,totalAmount,paymentMethod,models';
  const rows = orders.map((order) =>
    [
      order.id,
      order.userId,
      order.status,
      order.placedAt,
      order.estimatedDeliveryDate,
      order.totalAmount,
      order.paymentMethod,
      order.items.map((item) => item.modelName).join(' + '),
    ]
      .map((value) => JSON.stringify(String(value)))
      .join(','),
  );

  return [header, ...rows].join('\n');
}

exposeTask(serializeOrdersAsCsv);
