import { basicContainerExample } from './basic-container';
import { childContainersExample } from './child-containers';
import { classProviderExample } from './class-provider';
import { disposeLifecycleExample } from './dispose-lifecycle';
import { freezeExample } from './freeze';
import { hasAndSyncExample } from './has-and-sync';
import { lifetimesExample } from './lifetimes';
import { onResolveExample } from './on-resolve';
import { resolveOptionalExample } from './resolve-optional';
import { scopedExecutionExample } from './scoped-execution';
import { syncHotPathExample } from './sync-hot-path';
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
  'on-resolve': onResolveExample,
  'resolve-optional': resolveOptionalExample,
  'scoped-execution': scopedExecutionExample,
  'sync-hot-path': syncHotPathExample,
  testing: testingExample,
  validate: validateExample,
};
