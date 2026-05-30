import type { ActionArgs, ActionFn, MachineEvent } from './types.js';

/**
 * Creates an action that shallow-merges partial context updates.
 * @example
 * assign(({ context }) => ({ count: context.count + 1 }))
 */
export const assign =
  <Ctx extends object, Ev extends MachineEvent = MachineEvent>(
    fn: (args: ActionArgs<Ctx, Ev>) => Partial<Ctx>,
  ): ActionFn<Ctx, Ev> =>
  (args) => {
    Object.assign(args.context, fn(args));
  };
