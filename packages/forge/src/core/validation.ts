import { isAbortError } from '@vielzeug/arsenal';

import type { FormContext } from './context';
import type { ValueOps } from './values';

import { anySignal, isSafeKey } from '../_utils';
import { ForgeSubmitError, ForgeValidationError } from '../errors';
import { type FlatKeyOf, FORM_ERROR, type MaybePromise, type SubmitResult, type ValidateResult } from '../types';
import { createAsyncQueue } from './asyncQueue';

/**
 * Validation + submit operations: field/form validator execution, error application,
 * `validate()`/`validateFields()`/`validateStream()`, and `submit()`/`submitOrThrow()`.
 * Moved verbatim from `createForm()`'s "Validation" and "Submit" sections.
 */
export function createValidationOps<TValues extends Record<string, unknown>>(
  ctx: FormContext<TValues>,
  deps: Pick<ValueOps<TValues>, 'touchAll' | 'values'>,
) {
  async function runFieldValidator(name: string, signal: AbortSignal): Promise<string | undefined> {
    const validator = ctx.validators.get(name);

    if (!validator) return undefined;

    if (signal.aborted) throw signal.reason;

    const result = await validator(ctx.store.get(name), signal);

    return typeof result === 'string' ? result : undefined;
  }

  async function runFormValidator(signal: AbortSignal): Promise<Record<string, string>> {
    if (!ctx.formValidator) return {};

    if (signal.aborted) throw signal.reason;

    const result = await ctx.formValidator(deps.values(), signal);
    const errors: Record<string, string> = {};

    if (result) {
      for (const [key, message] of Object.entries(result)) {
        // Security: a custom FormValidator function is caller-authored code — its returned
        // keys are just as untrusted as a schema's `issue.path`. Reject reserved segments.
        if (isSafeKey(key) && typeof message === 'string') errors[key] = message;
      }
    }

    return errors;
  }

  function applyFieldErrors(
    fieldSet: Set<string>,
    nextErrors: Record<string, string>,
    formErrors: Record<string, string>,
    scope: 'full' | 'partial',
  ): void {
    if (scope === 'full') {
      ctx.fieldErrors.clear();

      for (const [key, message] of Object.entries(formErrors)) {
        if (nextErrors[key] === undefined) nextErrors[key] = message;
      }

      for (const [key, message] of Object.entries(nextErrors)) ctx.fieldErrors.set(key, message);

      ctx.invalidateErrors();
      ctx.requestNotify();
    } else {
      const changedFields = new Set<string>();

      for (const name of fieldSet) {
        const next = nextErrors[name];
        const previous = ctx.fieldErrors.get(name);

        if (next !== undefined) {
          ctx.fieldErrors.set(name, next);

          if (previous !== next) changedFields.add(name);
        } else if (ctx.fieldErrors.delete(name)) {
          changedFields.add(name);
        }
      }

      if (changedFields.size > 0) ctx.invalidateErrors();

      ctx.requestNotify(changedFields);
    }
  }

  async function runValidationCore(
    fields: string[],
    scope: 'full' | 'partial',
    signal?: AbortSignal,
  ): Promise<ValidateResult & { aborted: boolean }> {
    const fieldSet = new Set(fields);
    const fieldRunCtrls = new Map<string, AbortController>();

    for (const name of fieldSet) {
      ctx.fieldCtrls.get(name)?.abort();

      const ctrl = new AbortController();

      ctx.fieldCtrls.set(name, ctrl);
      fieldRunCtrls.set(name, ctrl);
    }

    const runCtrl = new AbortController();
    const runSignal = anySignal(runCtrl.signal, signal, ctx.disposeController.signal)!;

    ctx.runCtrls.add(runCtrl);

    // Symbol-based ref-counting: each run gets a unique token per field.
    // The field leaves validatingFields only when its Set empties — impossible to miscount.
    const runId = Symbol();

    for (const name of fieldSet) {
      let runs = ctx.validatingRuns.get(name);

      if (!runs) {
        runs = new Set<symbol>();
        ctx.validatingRuns.set(name, runs);
      }

      runs.add(runId);
    }

    ctx.requestNotify();

    try {
      const results = await Promise.all(
        [...fieldSet].map(async (name) => {
          const fieldSignal = scope === 'partial' ? anySignal(fieldRunCtrls.get(name)!.signal, runSignal)! : runSignal;

          return [name, await runFieldValidator(name, fieldSignal)] as const;
        }),
      );

      if (runSignal.aborted) {
        return { aborted: true, errors: Object.fromEntries(ctx.fieldErrors), valid: ctx.fieldErrors.size === 0 };
      }

      const nextErrors: Record<string, string> = {};

      for (const [name, message] of results) {
        if (message !== undefined) nextErrors[name] = message;
      }

      const formErrors = scope === 'full' ? await runFormValidator(runSignal) : {};

      applyFieldErrors(fieldSet, nextErrors, formErrors, scope);

      return { aborted: false, errors: Object.fromEntries(ctx.fieldErrors), valid: ctx.fieldErrors.size === 0 };
    } catch (error) {
      if (isAbortError(error)) {
        return { aborted: true, errors: Object.fromEntries(ctx.fieldErrors), valid: ctx.fieldErrors.size === 0 };
      }

      throw error;
    } finally {
      ctx.runCtrls.delete(runCtrl);

      for (const name of fieldSet) {
        const runs = ctx.validatingRuns.get(name);

        if (runs) {
          runs.delete(runId);

          if (runs.size === 0) ctx.validatingRuns.delete(name);
        }
      }

      ctx.requestNotify();

      for (const [name, ctrl] of fieldRunCtrls) {
        if (ctx.fieldCtrls.get(name) === ctrl) ctx.fieldCtrls.delete(name);
      }
    }
  }

  async function validateFields(
    fields: FlatKeyOf<TValues>[] | string[],
    signal?: AbortSignal,
  ): Promise<ValidateResult> {
    ctx.ensureNotDisposed();

    const result = await runValidationCore(fields as string[], 'partial', signal);

    return { errors: result.errors, valid: result.valid };
  }

  async function validate(
    nameOrFieldsOrSignal?: FlatKeyOf<TValues> | FlatKeyOf<TValues>[] | AbortSignal,
    signal?: AbortSignal,
  ): Promise<ValidateResult> {
    ctx.ensureNotDisposed();

    if (nameOrFieldsOrSignal === undefined || nameOrFieldsOrSignal instanceof AbortSignal) {
      const result = await runValidationCore(
        [...ctx.validators.keys()],
        'full',
        nameOrFieldsOrSignal as AbortSignal | undefined,
      );

      return { errors: result.errors, valid: result.valid };
    }

    if (Array.isArray(nameOrFieldsOrSignal)) {
      return validateFields(nameOrFieldsOrSignal, signal);
    }

    await validateFields([nameOrFieldsOrSignal], signal);

    const name = nameOrFieldsOrSignal as string;
    const error = ctx.fieldErrors.get(name);

    return { errors: error !== undefined ? { [name]: error } : {}, valid: error === undefined };
  }

  /* ======== Submit ======== */

  async function submitOrThrow<TResult = void>(handler: (values: TValues) => MaybePromise<TResult>): Promise<TResult> {
    const result = await submit(handler);

    if (!result.ok) throw new ForgeValidationError(result.errors as Record<string, string>);

    return result.value;
  }

  async function submit<TResult = void>(
    handler: (values: TValues) => MaybePromise<TResult>,
  ): Promise<SubmitResult<TResult>> {
    ctx.ensureNotDisposed();

    if (ctx.isSubmittingState) throw new ForgeSubmitError('submit() called while a submission is already in progress');

    ctx.batch(() => {
      ctx.submitCount++;
      ctx.isSubmittingState = true;
      deps.touchAll();
    });

    try {
      const validation = await runValidationCore([...ctx.validators.keys()], 'full');

      ctx.ensureNotDisposed();

      if (!validation.valid) {
        return { errors: validation.errors, ok: false, type: 'validation' };
      }

      return { ok: true, value: await handler(deps.values()) };
    } finally {
      ctx.isSubmittingState = false;

      if (!ctx.disposed) ctx.requestNotify();
    }
  }

  /* ======== validateStream ======== */

  function validateStream(signal?: AbortSignal): AsyncIterableIterator<{ error: string | undefined; field: string }> {
    ctx.ensureNotDisposed();

    const fields = [...ctx.validators.keys()];
    const ctrl = new AbortController();
    const combined = signal
      ? anySignal(ctrl.signal, signal, ctx.disposeController.signal)!
      : anySignal(ctrl.signal, ctx.disposeController.signal)!;

    type Item = { error: string | undefined; field: string };

    const queue = createAsyncQueue<Item>(() => ctrl.abort());

    // Run validators read-only — does NOT write to fieldErrors or fire requestNotify.
    // Each result is yielded as it settles; the form-level validator is yielded last.
    Promise.all(
      fields.map(async (f) => {
        if (combined.aborted) return;

        try {
          const error = await runFieldValidator(f, combined);

          if (!combined.aborted) queue.push({ error, field: f });
        } catch (err) {
          if (!isAbortError(err)) throw err;

          // aborted or disposed — skip this field
        }
      }),
    )
      .then(async () => {
        // Yield the form-level validator result last (F4: streams _form key too)
        if (ctx.formValidator && !combined.aborted) {
          try {
            const formErrors = await runFormValidator(combined);

            if (!combined.aborted) {
              const allKeys = new Set([FORM_ERROR, ...Object.keys(formErrors)]);

              for (const key of allKeys) {
                queue.push({ error: formErrors[key], field: key });
              }
            }
          } catch {
            // aborted
          }
        }
      })
      .catch((err) => {
        if (!isAbortError(err)) {
          ctrl.abort();
          queue.fail(err);
        }
      })
      .finally(() => {
        ctrl.abort();
        queue.finish();
      });

    return queue.iterator;
  }

  return { runValidationCore, submit, submitOrThrow, validate, validateFields, validateStream };
}

export type ValidationOps<TValues extends Record<string, unknown>> = ReturnType<typeof createValidationOps<TValues>>;
