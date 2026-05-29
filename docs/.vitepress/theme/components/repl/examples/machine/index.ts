import { asyncInvokesExample } from './async-invokes';
import { basicMachineExample } from './basic-machine';
import { contextValidationExample } from './context-validation';
import { debugTracingExample } from './debug-tracing';
import { entryExitActionsExample } from './entry-exit-actions';
import { guardsAndActionsExample } from './guards-and-actions';
import { persistenceExample } from './persistence';

export const machineExamples = {
  'async-invokes': asyncInvokesExample,
  'basic-machine': basicMachineExample,
  'context-validation': contextValidationExample,
  'debug-tracing': debugTracingExample,
  'entry-exit-actions': entryExitActionsExample,
  'guards-and-actions': guardsAndActionsExample,
  persistence: persistenceExample,
};
