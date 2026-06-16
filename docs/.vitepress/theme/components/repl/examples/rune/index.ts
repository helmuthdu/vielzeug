import { basicLoggingExample } from './basic-logging';
import { configurationExample } from './configuration';
import { dataLoggingExample } from './data-logging';
import { lifecycleExample } from './lifecycle';
import { logLevelsExample } from './log-levels';
import { scopedLoggingExample } from './scoped-logging';

export const runeExamples = {
  'basic-logging': basicLoggingExample,
  'lazy-and-timing': dataLoggingExample,
  'level-filtering': logLevelsExample,
  lifecycle: lifecycleExample,
  'scoped-loggers': scopedLoggingExample,
  'transport-pipeline': configurationExample,
};
