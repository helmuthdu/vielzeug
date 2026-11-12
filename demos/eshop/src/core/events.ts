import { createBus } from '@vielzeug/herald';

import type { OrderStatus } from './types';

export type AppEvents = {
  'cart:item-added': { modelId: string };
  'cart:item-removed': { itemId: string };
  'compare:changed': { modelIds: string[] };
  'order:placed': { orderId: string };
  'order:status-changed': { orderId: string; status: OrderStatus };
  'toast:show': { message: string; status: 'danger' | 'info' | 'success' };
};

export const bus = createBus<AppEvents>();
