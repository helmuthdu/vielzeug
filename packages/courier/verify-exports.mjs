import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const modules = [await import('./dist/index.js'), require('./dist/index.cjs')];

for (const courierModule of modules) {
  const networkCourier = courierModule.createCourier({
    fetch: async () => {
      throw new TypeError('network unavailable');
    },
  });

  if (typeof networkCourier.clearCache !== 'function') throw new Error('clearCache missing from Courier instance');
  if (typeof networkCourier.invalidateCache !== 'function')
    throw new Error('invalidateCache missing from Courier instance');
  if (typeof networkCourier.prefetch !== 'function') throw new Error('prefetch missing from Courier instance');
  if (typeof networkCourier.tap !== 'function') throw new Error('tap export missing from Courier instance');

  let cachedCalls = 0;
  const cachedCourier = courierModule.createCourier({
    fetch: async () => {
      cachedCalls++;
      return Response.json({ ok: true });
    },
  });
  const cache = { key: ['health'] };
  await cachedCourier.prefetch('/health', { cache });
  await cachedCourier.get('/health', { cache });
  if (cachedCalls !== 1) throw new Error('prefetch did not warm the parsed response cache');
  cachedCourier.invalidateCache(['health']);
  await cachedCourier.get('/health', { cache });
  if (cachedCalls !== 2) throw new Error('cache prefix invalidation failed');

  try {
    await networkCourier.get('/health');
    throw new Error('expected request to reject');
  } catch (error) {
    if (!(error instanceof courierModule.CourierError)) throw new Error('CourierError identity mismatch');
    if (!(error instanceof courierModule.CourierNetworkError)) throw new Error('CourierNetworkError identity mismatch');
    if (error.name !== 'CourierNetworkError') throw new Error(`unexpected error name: ${error.name}`);
  }

  const httpCourier = courierModule.createCourier({ fetch: async () => new Response(null, { status: 404 }) });
  try {
    await httpCourier.get('/missing');
    throw new Error('expected request to reject');
  } catch (error) {
    if (!courierModule.CourierHttpError.is(error, 404)) throw new Error('CourierHttpError identity mismatch');
    if (error.name !== 'CourierHttpError') throw new Error(`unexpected error name: ${error.name}`);
  }
}
