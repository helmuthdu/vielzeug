import { basicSetupExample } from './basic-setup';
import { bulkOperationsExample } from './bulk-operations';
import { cacheFirstExample } from './cache-first';
import { crudOperationsExample } from './crud-operations';
import { indexedDbExample } from './indexed-db';
import { queryBuilderExample } from './query-builder';
import { reactiveObserveExample } from './reactive-observe';
import { ttlExpirationExample } from './ttl-expiration';
import { watchStreamExample } from './watch-stream';

export const vaultExamples = {
  'basic-setup': basicSetupExample,
  'bulk-operations': bulkOperationsExample,
  'cache-first': cacheFirstExample,
  'crud-operations': crudOperationsExample,
  'indexed-db': indexedDbExample,
  'query-builder': queryBuilderExample,
  'reactive-observe': reactiveObserveExample,
  'reactive-watch': watchStreamExample,
  'ttl-expiration': ttlExpirationExample,
};
