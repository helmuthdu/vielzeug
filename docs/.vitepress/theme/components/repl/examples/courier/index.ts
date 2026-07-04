import { batcherExample } from './batcher';
import { cachePersistExample } from './cache-persist';
import { createCourierExample } from './create-courier';
import { debugCourierExample } from './debug-courier';
import { httpClientBasicExample } from './http-client-basic';
import { httpClientHeadersExample } from './http-client-headers';
import { httpClientMethodsExample } from './http-client-methods';
import { httpClientParamsExample } from './http-client-params';
import { httpInterceptorsExample } from './http-interceptors';
import { mutationSettledExample } from './mutation-settled';
import { queryClientBasicExample } from './query-client-basic';
import { queryClientInvalidateExample } from './query-client-invalidate';
import { queryClientMutationsExample } from './query-client-mutations';
import { queryClientObserveExample } from './query-client-observe';
import { queryClientSubscriptionsExample } from './query-client-subscriptions';
import { streamReadableExample } from './stream-readable';
import { streamSseExample } from './stream-sse';
import { syncStoreExample } from './sync-store';

export const courierExamples = {
  batcher: batcherExample,
  'cache-persist': cachePersistExample,
  'create-courier': createCourierExample,
  'debug-courier': debugCourierExample,
  'http-client-basic': httpClientBasicExample,
  'http-client-headers': httpClientHeadersExample,
  'http-client-methods': httpClientMethodsExample,
  'http-client-params': httpClientParamsExample,
  'http-interceptors': httpInterceptorsExample,
  'mutation-settled': mutationSettledExample,
  'query-client-basic': queryClientBasicExample,
  'query-client-invalidate': queryClientInvalidateExample,
  'query-client-mutations': queryClientMutationsExample,
  'query-client-observe': queryClientObserveExample,
  'query-client-watchkey': queryClientSubscriptionsExample,
  'stream-readable': streamReadableExample,
  'stream-sse': streamSseExample,
  'sync-store': syncStoreExample,
};
