import { basicContainerExample } from './basic-container';
import { disposeLifecycleExample } from './dispose-lifecycle';
import { lifetimesExample } from './lifetimes';
import { scopedExecutionExample } from './scoped-execution';
import { testingExample } from './testing';
import { validateExample } from './validate';

export const conduitExamples = {
  'basic-container': basicContainerExample,
  'dispose-lifecycle': disposeLifecycleExample,
  lifetimes: lifetimesExample,
  'scoped-execution': scopedExecutionExample,
  testing: testingExample,
  validate: validateExample,
};
