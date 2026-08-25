import { createIndexedDbPostmasterStore } from '../indexeddb.ts';
import { describePostmasterStore } from './store-contract.ts';

describePostmasterStore('IndexedDB Postmaster store', {
  create: () => Promise.resolve(createIndexedDbPostmasterStore({ name: `postmaster-test-${crypto.randomUUID()}` })),
});
