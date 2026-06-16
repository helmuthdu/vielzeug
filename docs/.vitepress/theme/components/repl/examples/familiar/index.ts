import { basicWorkerExample } from './basic-worker';
import { disposalSignalExample } from './disposal-signal';
import { errorHandlingExample } from './error-handling';
import { groupAndAbortExample } from './group-and-abort';
import { groupWithSignalExample } from './group-with-signal';
import { lifecycleExample } from './lifecycle';
import { poolAndBatchExample } from './pool-and-batch';
import { priorityQueueExample } from './priority-queue';
import { streamingExample } from './streaming';

const browserOnly = true;

export const familiarExamples = {
  'basic-worker': { ...basicWorkerExample, browserOnly },
  'disposal-signal': { ...disposalSignalExample, browserOnly },
  'error-handling': { ...errorHandlingExample, browserOnly },
  'group-and-abort': { ...groupAndAbortExample, browserOnly },
  'group-with-signal': { ...groupWithSignalExample, browserOnly },
  lifecycle: { ...lifecycleExample, browserOnly },
  'pool-and-batch': { ...poolAndBatchExample, browserOnly },
  'priority-queue': { ...priorityQueueExample, browserOnly },
  streaming: { ...streamingExample, browserOnly },
};
