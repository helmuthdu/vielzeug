import { warn } from './_dev';
import { sanitizeForLog } from './_utils';
import { createFormContext } from './core/context';
import { createFieldOps } from './core/fields';
import { createLifecycleOps } from './core/lifecycle';
import { createObserveOps } from './core/observe';
import { createScopedForm, type ScopeContext } from './core/scope';
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
  const fieldOps = createFieldOps(ctx);
  const observeOps = createObserveOps(ctx, {
    connectDefaults: init.connect ?? {},
    set: fieldOps.set,
    touch: fieldOps.touch,
    validateFields: fieldOps.validateFields,
  });
  // scope() results are memoized per prefix — not part of the shared FormContext bag since
  // it's purely a Form-object-level cache, not state any core/*.ts module needs to read.
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

  /* ======== Public form object ======== */

  // registerField/removeField/setValidator/listFields are nested under `fields`, not top-level.
  // patchKeys/replaceKeys/resetErrorsKeys/resetKeys/runValidationCore/touchAllKeys/untouchAllKeys
  // are internal-only — scope() below passes a slice of them to createScopedForm() so scoped
  // bulk operations share these primitives instead of reimplementing each loop a second time.
  const {
    listFields,
    patchKeys,
    registerField,
    removeField,
    replaceKeys,
    resetErrorsKeys,
    resetKeys,
    runValidationCore,
    setValidator,
    touchAllKeys,
    untouchAllKeys,
    ...publicFieldOps
  } = fieldOps;
  // snapshot/restore are nested under `history`, not top-level.
  const { restore, snapshot, ...publicLifecycleOps } = lifecycleOps;

  // `scope` is defined as a method on publicForm so that `const publicForm` can capture itself
  // via closure without a forward-reference lint disable.
  const publicForm: Form<TValues> = {
    ...publicFieldOps,
    ...observeOps,
    ...publicLifecycleOps,
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
    history: { restore, snapshot },
    get isLoading() {
      return ctx.loadingState;
    },
    get isSubmitting() {
      return ctx.isSubmittingState;
    },
    scope<P extends FlatKeyOf<TValues>>(prefix: P): Form<ScopedValues<TValues, P>> {
      const key = prefix as string;
      const cached = scopeCache.get(key);

      if (cached) return cached as Form<ScopedValues<TValues, P>>;

      const scopeCtx: ScopeContext<TValues> = {
        ctx,
        fieldOps: {
          patchKeys,
          replaceKeys,
          resetErrorsKeys,
          resetKeys,
          runValidationCore,
          touchAllKeys,
          untouchAllKeys,
        },
        root: publicForm,
      };

      const scoped = createScopedForm<TValues, P>(scopeCtx, prefix) as Form<ScopedValues<TValues, P>>;

      scopeCache.set(key, scoped as Form<never>);

      return scoped;
    },
    get state() {
      return ctx.getStateSnapshot();
    },
    [Symbol.dispose]() {
      this.dispose();
    },
  };

  return publicForm;
}
