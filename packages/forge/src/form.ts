import { warn } from './_dev';
import { sanitizeForLog } from './_utils';
import { createFormContext } from './core/context';
import { createFieldOps } from './core/fields';
import { createLifecycleOps } from './core/lifecycle';
import { createFormView } from './core/view';
import { type Form, type FormOptions } from './types';

/* -------------------- createForm -------------------- */

export function createForm<TInit extends object>(
  init: Omit<FormOptions<TInit & Record<string, unknown>>, 'defaultValues'> & {
    defaultValues: TInit | (() => Promise<TInit>);
  },
): Form<TInit & Record<string, unknown>>;
export function createForm<TValues extends Record<string, unknown> = Record<string, unknown>>(
  init?: FormOptions<TValues>,
): Form<TValues>;
/**
 * Builds the shared internals (context + ops), wires async `defaultValues`, and returns
 * the root form view. All Form behavior — root and scoped — lives in `core/view.ts`;
 * this file is only construction glue.
 */
export function createForm<TValues extends Record<string, unknown> = Record<string, unknown>>(
  init: FormOptions<TValues> = {},
): Form<TValues> {
  const ctx = createFormContext<TValues>(init);
  const fieldOps = createFieldOps(ctx);
  const scopeCache = new Map<string, Form<never>>();
  const lifecycleOps = createLifecycleOps(ctx, { onDispose: () => scopeCache.clear() });

  /* ---- Async defaultValues ---- */

  if (typeof init.defaultValues === 'function') {
    void init
      .defaultValues()
      .then((resolved) => {
        ctx.loadingState = false;

        if (ctx.disposed) return;

        fieldOps.replace(resolved);
      })
      .catch((err: unknown) => {
        ctx.loadingState = false;

        if (ctx.disposed) return;

        warn(`defaultValues factory rejected. Form will be empty. Error: ${sanitizeForLog(String(err))}`);
        init.onLoadError?.(err);
        ctx.requestNotify();
      });
  }

  return createFormView({ connectDefaults: init.connect ?? {}, ctx, fieldOps, lifecycleOps, scopeCache }, '');
}
