import { afterTransitionsExample } from './after-transitions';
import { asyncInvokesExample } from './async-invokes';
import { basicMachineExample } from './basic-machine';
import { entryExitActionsExample } from './entry-exit-actions';
import { guardsAndActionsExample } from './guards-and-actions';
import { resolveAndErrorExample } from './resolve-and-error';

export const clockworkExamples = {
  'after-transitions': afterTransitionsExample,
  'async-invokes': asyncInvokesExample,
  'basic-machine': basicMachineExample,
  'entry-exit-actions': entryExitActionsExample,
  'guards-and-reducers': guardsAndActionsExample,
  'pure-transitions-and-errors': resolveAndErrorExample,
};
