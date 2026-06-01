import { basicWorkerExample } from './basic-worker';
import { errorHandlingExample } from './error-handling';
import { groupAndAbortExample } from './group-and-abort';
import { lifecycleExample } from './lifecycle';
import { poolAndBatchExample } from './pool-and-batch';
import { priorityQueueExample } from './priority-queue';

export const familiarExamples = {
  'basic-worker': basicWorkerExample,
  'error-handling': errorHandlingExample,
  'group-and-abort': groupAndAbortExample,
  lifecycle: lifecycleExample,
  'pool-and-batch': poolAndBatchExample,
  'priority-queue': priorityQueueExample,
};
