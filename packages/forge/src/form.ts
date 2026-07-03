import { warn } from './_dev';
import { sanitizeForLog } from './_utils';
import { createFormContext } from './core/context';
import { createLifecycleOps } from './core/lifecycle';
import { createObserveOps } from './core/observe';
import { createScopedForm, type ScopeContext } from './core/scope';
import { createValidationOps } from './core/validation';
import { createValueOps } from './core/values';
import { type FlatKeyOf, type Form, type FormOptions, type ScopedValues } from './types';

/* -------------------- createForm -------------------- */

export function createForm<TInit extends object>(
  init: Omit<FormOptions<TInit & Record<string, unknown>>, 'defaultValues'> & {
    defaultValues: TInit | (() => Promise<TInit>);
  },
): Form<TInit & Record<string, unknown>>;
export function createForm<TValues extends Record<string, unknown> = Record<string, unknown>>(
  init?: FormOptions<TValues>,
): Form<TValues>;
export function createForm<TValues extends Record<string, unknown> = Record<string, unknown>>(
  init: FormOptions<TValues> = {},
): Form<TValues> {
  const ctx = createFormContext<TValues>(init);
  const valueOps = createValueOps(ctx);
  const validationOps = createValidationOps(ctx, { touchAll: valueOps.touchAll, values: valueOps.values });
  const observeOps = createObserveOps(ctx, {
    set: valueOps.set,
    touch: valueOps.touch,
    validateFields: validationOps.validateFields,
  });
  const lifecycleOps = createLifecycleOps(ctx);

  /* ---- Async defaultValues ---- */

  if (typeof init.defaultValues === 'function') {
    void init
      .defaultValues()
      .then((resolved) => {
        ctx.loadingState = false;

        if (ctx.disposed) return;

        valueOps.replace(resolved);
      })
      .catch((err: unknown) => {
        ctx.loadingState = false;

        if (ctx.disposed) return;

        warn(`defaultValues factory rejected. Form will be empty. Error: ${sanitizeForLog(String(err))}`);
        init.onLoadError?.(err);
        ctx.requestNotify();
      });
  }

  /* ======== Public form object ======== */

  // registerField/removeField/setValidator/listFields are nested under `fields`, not top-level.
  const { listFields, registerField, removeField, setValidator, ...publicValueOps } = valueOps;
  // runValidationCore is internal-only — needed by scope(), not part of the public Form<T> surface.
  const { runValidationCore, ...publicValidationOps } = validationOps;

  // `scope` is defined as a method on publicForm so that `const publicForm` can capture itself
  // via closure without a forward-reference lint disable.
  const publicForm: Form<TValues> = {
    ...publicValueOps,
    ...publicValidationOps,
    ...observeOps,
    ...lifecycleOps,
    batch: ctx.batch,
    get disposalSignal() {
      return ctx.disposeController.signal;
    },
    get disposed() {
      return ctx.disposed;
    },
    fields: {
      list: listFields,
      register: registerField,
      remove: removeField,
      setValidator,
    },
    get isLoading() {
      return ctx.loadingState;
    },
    get isSubmitting() {
      return ctx.isSubmittingState;
    },
    scope<P extends FlatKeyOf<TValues>>(prefix: P): Form<ScopedValues<TValues, P>> {
      const key = prefix as string;
      const cached = ctx.scopeCache.get(key);

      if (cached) return cached as Form<ScopedValues<TValues, P>>;

      const scopeCtx: ScopeContext<TValues> = {
        baseline: ctx.baseline,
        dirty: ctx.dirty,
        ensureNotDisposed: ctx.ensureNotDisposed,
        fieldCtrls: ctx.fieldCtrls,
        fieldErrors: ctx.fieldErrors,
        getStateSnapshot: ctx.getStateSnapshot,
        incrementSubmitCount: () => {
          ctx.submitCount++;
        },
        invalidateErrors: ctx.invalidateErrors,
        isDisposed: () => ctx.disposed,
        isSubmitting: () => ctx.isSubmittingState,
        requestNotify: ctx.requestNotify,
        root: publicForm,
        runValidationCore,
        setSubmitting: (v) => {
          ctx.isSubmittingState = v;
        },
        store: ctx.store,
        touched: ctx.touched,
        validators: ctx.validators,
      };

      const scoped = createScopedForm<TValues, P>(scopeCtx, prefix) as Form<ScopedValues<TValues, P>>;

      ctx.scopeCache.set(key, scoped as Form<never>);

      return scoped;
    },
    get state() {
      return ctx.getStateSnapshot();
    },
    // On a root form, subscribeScoped behaves identically to subscribe — no prefix filtering.
    subscribeScoped: observeOps.subscribe,
    [Symbol.dispose]() {
      this.dispose();
    },
  };

  return publicForm;
}
