import { afterTransitionsExample } from './after-transitions';
import { asyncInvokesExample } from './async-invokes';
import { basicMachineExample } from './basic-machine';
import { contextValidationExample } from './context-validation';
import { debugTracingExample } from './debug-tracing';
import { entryExitActionsExample } from './entry-exit-actions';
import { guardsAndActionsExample } from './guards-and-actions';
import { middlewareExample } from './middleware';
import { persistenceExample } from './persistence';

export const clockworkExamples = {
  'after-transitions': afterTransitionsExample,
  'async-invokes': asyncInvokesExample,
  'basic-machine': basicMachineExample,
  'context-validation': contextValidationExample,
  'debug-tracing': debugTracingExample,
  'entry-exit-actions': entryExitActionsExample,
  'guards-and-actions': guardsAndActionsExample,
  middleware: middlewareExample,
  persistence: persistenceExample,
};
