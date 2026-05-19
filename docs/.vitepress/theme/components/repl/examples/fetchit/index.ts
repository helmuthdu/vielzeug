import { createFetchitExample } from './create-fetchit';
import { httpClientBasicExample } from './http-client-basic';
import { httpClientHeadersExample } from './http-client-headers';
import { httpClientMethodsExample } from './http-client-methods';
import { httpClientParamsExample } from './http-client-params';
import { httpInterceptorsExample } from './http-interceptors';
import { queryClientBasicExample } from './query-client-basic';
import { queryClientInvalidateExample } from './query-client-invalidate';
import { queryClientMutationsExample } from './query-client-mutations';
import { queryClientSubscriptionsExample } from './query-client-subscriptions';
import { streamReadableExample } from './stream-readable';
import { streamSseExample } from './stream-sse';

export const fetchitExamples = {
  'create-fetchit': createFetchitExample,
  'http-client-basic': httpClientBasicExample,
  'http-client-headers': httpClientHeadersExample,
  'http-client-methods': httpClientMethodsExample,
  'http-client-params': httpClientParamsExample,
  'http-interceptors': httpInterceptorsExample,
  'query-client-basic': queryClientBasicExample,
  'query-client-invalidate': queryClientInvalidateExample,
  'query-client-mutations': queryClientMutationsExample,
  'query-client-subscriptions': queryClientSubscriptionsExample,
  'stream-readable': streamReadableExample,
  'stream-sse': streamSseExample,
};
