import type { FormValidator, ValidateResult } from '../types';
import type { FormCore } from './core';

/** Returns true if the error is an AbortError. */
export function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError';
}

/** Composes two AbortSignals (or one plus optional) into a single signal. */
export function composeSignal(...signals: Array<AbortSignal | undefined>): AbortSignal {
  const active = signals.filter((s): s is AbortSignal => s !== undefined);

  if (active.length === 1) return active[0];

  return AbortSignal.any(active);
}

async function runFieldValidator(core: FormCore, name: string, signal: AbortSignal): Promise<string | undefined> {
  const validator = core.validators.get(name);

  if (!validator) return undefined;

  if (signal.aborted) throw signal.reason;

  const result = await validator(core.store.get(name), signal);

  return typeof result === 'string' ? result : undefined;
}

async function runFormValidator(
  core: FormCore,
  formValidator: FormValidator | undefined,
  signal: AbortSignal,
): Promise<Record<string, string>> {
  if (!formValidator) return {};

  if (signal.aborted) throw signal.reason;

  const result = await formValidator(core.values() as Record<string, unknown>, signal);
  const errors: Record<string, string> = {};

  if (result) {
    for (const [key, message] of Object.entries(result)) {
      if (typeof message === 'string') errors[key] = message;
    }
  }

  return errors;
}

function applyFieldErrors(
  core: FormCore,
  fieldSet: Set<string>,
  nextErrors: Record<string, string>,
  formErrors: Record<string, string>,
  scope: 'full' | 'partial',
): void {
  if (scope === 'full') {
    core.fieldErrors.clear();

    for (const [key, message] of Object.entries(formErrors)) {
      if (nextErrors[key] === undefined) nextErrors[key] = message;
    }

    for (const [key, message] of Object.entries(nextErrors)) core.fieldErrors.set(key, message);

    core.invalidateErrors();
    core.requestNotify();
  } else {
    const changedFields = new Set<string>();

    for (const name of fieldSet) {
      const next = nextErrors[name];
      const previous = core.fieldErrors.get(name);

      if (next !== undefined) {
        core.fieldErrors.set(name, next);

        if (previous !== next) changedFields.add(name);
      } else if (core.fieldErrors.delete(name)) {
        changedFields.add(name);
      }
    }

    if (changedFields.size > 0) core.invalidateErrors();

    core.requestNotify(changedFields);
  }
}

/**
 * Core validation runner. Handles concurrent validation, AbortSignal composition,
 * R8 symbol-based ref-counting for `validatingFields`, and partial vs full scope.
 */
export async function runValidationCore(
  core: FormCore,
  formValidator: FormValidator | undefined,
  fields: string[],
  scope: 'full' | 'partial',
  signal?: AbortSignal,
): Promise<ValidateResult & { aborted: boolean }> {
  const fieldSet = new Set(fields);
  const fieldRunCtrls = new Map<string, AbortController>();

  for (const name of fieldSet) {
    core.fieldCtrls.get(name)?.abort();

    const ctrl = new AbortController();

    core.fieldCtrls.set(name, ctrl);
    fieldRunCtrls.set(name, ctrl);
  }

  const runCtrl = new AbortController();
  const runSignal = composeSignal(runCtrl.signal, signal, core.disposeController.signal);

  core.runCtrls.add(runCtrl);

  // R8: each field gets one symbol token per concurrent run
  const runId = Symbol();

  for (const name of fieldSet) {
    let runs = core.validatingRuns.get(name);

    if (!runs) {
      runs = new Set<symbol>();
      core.validatingRuns.set(name, runs);
    }

    runs.add(runId);
  }

  core.requestNotify();

  try {
    const results = await Promise.all(
      [...fieldSet].map(async (name) => {
        const fieldSignal = scope === 'partial' ? composeSignal(fieldRunCtrls.get(name)!.signal, runSignal) : runSignal;

        return [name, await runFieldValidator(core, name, fieldSignal)] as const;
      }),
    );

    if (runSignal.aborted) {
      return { aborted: true, errors: Object.fromEntries(core.fieldErrors), valid: core.fieldErrors.size === 0 };
    }

    const nextErrors: Record<string, string> = {};

    for (const [name, message] of results) {
      if (message !== undefined) nextErrors[name] = message;
    }

    const formErrors = scope === 'full' ? await runFormValidator(core, formValidator, runSignal) : {};

    applyFieldErrors(core, fieldSet, nextErrors, formErrors, scope);

    return { aborted: false, errors: Object.fromEntries(core.fieldErrors), valid: core.fieldErrors.size === 0 };
  } catch (error) {
    if (isAbortError(error) && (scope === 'partial' || runSignal.aborted)) {
      return { aborted: true, errors: Object.fromEntries(core.fieldErrors), valid: core.fieldErrors.size === 0 };
    }

    throw error;
  } finally {
    core.runCtrls.delete(runCtrl);

    // R8: remove this run's token; delete the entry when no runs remain
    for (const name of fieldSet) {
      const runs = core.validatingRuns.get(name);

      if (runs) {
        runs.delete(runId);

        if (runs.size === 0) core.validatingRuns.delete(name);
      }
    }

    core.requestNotify();

    for (const [name, ctrl] of fieldRunCtrls) {
      if (core.fieldCtrls.get(name) === ctrl) core.fieldCtrls.delete(name);
    }
  }
}

/**
 * F4 streaming validation — yields each field result as its validator resolves.
 * Better UX for forms with validators of varying latency.
 */
export async function* validateStreamImpl(
  core: FormCore,
  _formValidator: FormValidator | undefined,
  fields: string[],
  signal?: AbortSignal,
): AsyncIterableIterator<{ error: string | undefined; field: string }> {
  const runCtrl = new AbortController();
  const runSignal = composeSignal(runCtrl.signal, signal, core.disposeController.signal);

  core.runCtrls.add(runCtrl);

  try {
    // Launch all validators concurrently; yield as each settles
    const promises = fields.map(async (name) => {
      const validator = core.validators.get(name);
      let error: string | undefined;

      if (validator && !runSignal.aborted) {
        try {
          const result = await validator(core.store.get(name), runSignal);

          error = typeof result === 'string' ? result : undefined;
        } catch (err) {
          if (!isAbortError(err)) throw err;
        }
      }

      return { error, field: name };
    });

    // Yield each as it settles using Promise.race-style iteration
    const pending = new Set(promises.map((p, i) => ({ i, p })));

    while (pending.size > 0) {
      if (runSignal.aborted) break;

      // Race: pick the first resolved promise
      const settled = await Promise.race([...pending].map(({ i, p }) => p.then((result) => ({ i, result }))));

      for (const item of pending) {
        if (item.i === settled.i) {
          pending.delete(item);
          break;
        }
      }

      if (!runSignal.aborted) {
        yield settled.result;
      }
    }
  } finally {
    core.runCtrls.delete(runCtrl);
  }
}
