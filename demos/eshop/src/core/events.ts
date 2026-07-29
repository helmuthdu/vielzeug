import { createBus } from '@vielzeug/herald';

import type { OrderStatus } from './types';

// A `type` alias (not `interface`) — herald's `createBus<T extends EventMap>()` constrains T to
// `Record<string, unknown>`, which only type literals satisfy structurally. Same convention as
// demos/kanban/src/core/events.ts.
export type AppEvents = {
  'cart:item-added': { modelId: string };
  'cart:item-removed': { itemId: string };
  'compare:changed': { modelIds: string[] };
  'order:placed': { orderId: string };
  'order:status-changed': { orderId: string; status: OrderStatus };
  'toast:show': { message: string; variant: 'error' | 'info' | 'success' };
};

export const bus = createBus<AppEvents>();
