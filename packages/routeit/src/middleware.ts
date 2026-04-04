import type { Middleware, RouteContext, RouteHandler } from './types';

/** -------------------- Middleware Execution -------------------- **/

export async function runMiddleware(
  context: RouteContext,
  globalMiddleware: Middleware[],
  routeMiddleware: Middleware[],
  handler?: RouteHandler,
): Promise<void> {
  const stack = [...globalMiddleware, ...routeMiddleware];
  let index = -1;

  const dispatch = async (i: number): Promise<void> => {
    if (i <= index) throw new Error('[routeit] next() called multiple times');

    index = i;

    if (i === stack.length) {
      if (handler) await handler(context);

      return;
    }

    await stack[i](context, () => dispatch(i + 1));
  };

  await dispatch(0);
}
