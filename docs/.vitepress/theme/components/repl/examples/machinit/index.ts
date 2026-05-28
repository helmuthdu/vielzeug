import { asyncInvokesExample } from './async-invokes';
import { basicMachineExample } from './basic-machine';
import { contextValidationExample } from './context-validation';
import { debugTracingExample } from './debug-tracing';
import { entryExitActionsExample } from './entry-exit-actions';
import { guardsAndActionsExample } from './guards-and-actions';
import { persistenceExample } from './persistence';

export const machinitExamples = {
  'basic-machine': basicMachineExample,
  'guards-and-actions': guardsAndActionsExample,
  'entry-exit-actions': entryExitActionsExample,
  'async-invokes': asyncInvokesExample,
  'context-validation': contextValidationExample,
  'persistence': persistenceExample,
  'debug-tracing': debugTracingExample,
};
