import { asyncResourceExample } from './async-resource';
import { basicSignalExample } from './basic-signal';
import { batchUntrackExample } from './batch-untrack';
import { effectOptionsExample } from './effect-options';
import { scopeExample } from './scope-cleanup';
import { storeBasicsExample } from './store-basics';
import { watchAndSubscribeExample } from './watch-and-subscribe';

export const rippleExamples = {
  'async-resource': asyncResourceExample,
  'basic-signal': basicSignalExample,
  'batch-untrack': batchUntrackExample,
  'effect-options': effectOptionsExample,
  'scope-ownership': scopeExample,
  'store-basics': storeBasicsExample,
  'watch-selected-value': watchAndSubscribeExample,
};
