import { exposeTask } from '@vielzeug/familiar/protocol';
import { toCsv } from '@vielzeug/tabula';

import type { Order } from './types';

function serializeOrdersAsCsv(orders: Order[]): string {
  return toCsv([
    ['id', 'userId', 'status', 'placedAt', 'estimatedDeliveryDate', 'total', 'paymentMethod', 'models'],
    ...orders.map((order) => [
      order.id,
      order.userId,
      order.status,
      order.placedAt,
      order.estimatedDeliveryDate,
      order.pricing.total,
      order.paymentMethod,
      order.items.map((item) => item.modelName).join(' + '),
    ]),
  ]);
}

exposeTask(serializeOrdersAsCsv);
