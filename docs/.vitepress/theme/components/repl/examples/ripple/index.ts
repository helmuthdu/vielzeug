import { basicSignalExample } from './basic-signal';
import { batchUntrackExample } from './batch-untrack';
import { derivedSignalsExample } from './derived-signals';
import { disposalExample } from './disposal';
import { effectOptionsExample } from './effect-options';
import { nextValueExample } from './next-value';
import { scopeExample } from './scope-cleanup';
import { scopeSetupExample } from './scope-setup';
import { storeBasicsExample } from './store-basics';
import { storeHistoryExample } from './store-history';
import { storeLensesExample } from './store-lenses';
import { storeTodoListExample } from './store-todo-list';
import { watchAndSubscribeExample } from './watch-and-subscribe';

export const rippleExamples = {
  'basic-signal': basicSignalExample,
  'batch-untrack': batchUntrackExample,
  'derived-signals': derivedSignalsExample,
  disposal: disposalExample,
  'effect-options': effectOptionsExample,
  'next-value': nextValueExample,
  'scope-cleanup': scopeExample,
  'scope-setup': scopeSetupExample,
  'store-basics': storeBasicsExample,
  'store-history': storeHistoryExample,
  'store-lenses': storeLensesExample,
  'store-todo-list': storeTodoListExample,
  'watch-and-subscribe': watchAndSubscribeExample,
};
