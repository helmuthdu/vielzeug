import { basicSetupExample } from './basic-setup';
import { bulkOperationsExample } from './bulk-operations';
import { cacheFirstExample } from './cache-first';
import { crudOperationsExample } from './crud-operations';
import { filteringExample } from './filtering';
import { indexedDbExample } from './indexed-db';
import { pruneScheduleExample } from './prune-schedule';
import { reactiveObserveExample } from './reactive-observe';
import { ttlExpirationExample } from './ttl-expiration';

export const vaultExamples = {
  'basic-setup': basicSetupExample,
  'bulk-operations': bulkOperationsExample,
  'cache-first': cacheFirstExample,
  'crud-operations': crudOperationsExample,
  filtering: filteringExample,
  'indexed-db': indexedDbExample,
  'prune-schedule': pruneScheduleExample,
  'reactive-observe': reactiveObserveExample,
  'ttl-expiration': ttlExpirationExample,
};
