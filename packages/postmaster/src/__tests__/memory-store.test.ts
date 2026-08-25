import { createMemoryPostmasterStore } from '../testing.ts';
import { describePostmasterStore } from './store-contract.ts';

describePostmasterStore('memory Postmaster store', {
  create: () => Promise.resolve(createMemoryPostmasterStore()),
});
