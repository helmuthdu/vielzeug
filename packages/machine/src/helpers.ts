import type { ActionArgs, ActionFn, MachineEvent } from './types.js';

/**
 * Creates an action that shallow-merges partial context updates.
 * Note: Uses `Object.assign` — performs a shallow merge. For nested objects,
 * spread the nested property explicitly:
 * `assign(({ context }) => ({ nested: { ...context.nested, key: val } }))`
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
