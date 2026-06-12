import { basicContainerExample } from './basic-container';
import { childContainersExample } from './child-containers';
import { classProviderExample } from './class-provider';
import { disposeLifecycleExample } from './dispose-lifecycle';
import { freezeExample } from './freeze';
import { hasAndSyncExample } from './has-and-sync';
import { lifetimesExample } from './lifetimes';
import { resolveOptionalExample } from './resolve-optional';
import { scopedExecutionExample } from './scoped-execution';
import { testingExample } from './testing';
import { validateExample } from './validate';

export const conduitExamples = {
  'basic-container': basicContainerExample,
  'child-containers': childContainersExample,
  'class-provider': classProviderExample,
  'dispose-lifecycle': disposeLifecycleExample,
  freeze: freezeExample,
  'has-and-sync': hasAndSyncExample,
  lifetimes: lifetimesExample,
  'resolve-optional': resolveOptionalExample,
  'scoped-execution': scopedExecutionExample,
  testing: testingExample,
  validate: validateExample,
};
