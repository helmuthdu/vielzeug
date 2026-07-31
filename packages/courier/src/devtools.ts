import type { Courier, CourierOptions } from './courier';

import { createCourier } from './courier';
import { withLogging } from './interceptors';

export function debugCourier(options?: CourierOptions): Courier {
  const client = createCourier(options);

  client.use(withLogging());

  return client;
}
