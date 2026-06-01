import { basicContainerExample } from './basic-container';
import { childContainersExample } from './child-containers';
import { classProviderExample } from './class-provider';
import { disposeLifecycleExample } from './dispose-lifecycle';
import { hasAndSyncExample } from './has-and-sync';
import { lifetimesExample } from './lifetimes';
import { scopedExecutionExample } from './scoped-execution';
import { testingExample } from './testing';
import { validateExample } from './validate';

export const conduitExamples = {
  'basic-container': basicContainerExample,
  'child-containers': childContainersExample,
  'class-provider': classProviderExample,
  'dispose-lifecycle': disposeLifecycleExample,
  'has-and-sync': hasAndSyncExample,
  lifetimes: lifetimesExample,
  'scoped-execution': scopedExecutionExample,
  testing: testingExample,
  validate: validateExample,
};
