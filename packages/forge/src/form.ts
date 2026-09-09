import { abortable } from '@vielzeug/arsenal';

import { createField, type FieldAccess } from './_field.js';
import { createNotifier } from './_notify.js';
import {
  assertSafeKey,
  immutable,
  isRecord,
  type MetaRoot,
  readAtPath,
  resetAtPath,
  touchAll,
  writeAtPath,
  writeMeta,
} from './core/path.js';
import { ForgeConfigError, ForgeDisposedError, ForgeSubmitError, ForgeValidationError } from './errors.js';
import type {
  Form,
  FormOptions,
  FormState,
  FormValidator,
  MaybePromise,
  SubmitResult,
  Unsubscribe,
  ValidationIssue,
  ValidationResult,
} from './types.js';

type Validity = 'invalid' | 'unknown' | 'valid';

type InternalState<TValues extends Record<string, unknown>> = Readonly<{
  baseline: TValues;
  issues: readonly ValidationIssue[] | undefined;
  isSubmitting: boolean;
  isValidating: boolean;
  submitCount: number;
  touched: MetaRoot;
  validity: Validity;
  value: TValues;
}>;

function normalizeIssues(result: readonly ValidationIssue[] | undefined): readonly ValidationIssue[] | undefined {
  if (result === undefined || result.length === 0) return undefined;

  return Object.freeze(
    result.map((issue) => {
      if (!issue || typeof issue.message !== 'string' || !Array.isArray(issue.path)) {
        throw new ForgeConfigError('Validators must return issues with a string message and array path.');
      }

      const path = issue.path.map((part) => {
        if (typeof part === 'number') {
          if (!Number.isSafeInteger(part) || part < 0) throw new ForgeConfigError(`Invalid issue path index ${part}.`);
          return part;
        }
        if (typeof part === 'string') {
          assertSafeKey(part);
          return part;
        }
        throw new ForgeConfigError('Issue paths may contain only string keys and non-negative integer indexes.');
      });

      return Object.freeze({ message: issue.message, path: Object.freeze(path) });
    }),
  );
}

function makeFormState<TValues extends Record<string, unknown>>(current: InternalState<TValues>): FormState {
  return Object.freeze({
    formError: current.issues?.find((issue) => issue.path.length === 0)?.message,
    hasErrors: (current.issues?.length ?? 0) > 0,
    issues: current.issues,
    submitCount: current.submitCount,
    submitting: current.isSubmitting,
    touched: Object.keys(current.touched).length > 0,
    validating: current.isValidating,
    validity: current.validity,
  });
}

/** One immutable value tree and one explicit full-form validator keep form behavior locally understandable. */
export function createForm<TValues extends Record<string, unknown>>(options: FormOptions<TValues>): Form<TValues> {
  const initial = immutable(options.initialValues);
  const notifier = createNotifier<InternalState<TValues>>(options.onSubscriberError);
  const disposalController = new AbortController();
  let disposed = false;
  let dispatching = false;
  const pendingWrites: Array<(current: InternalState<TValues>) => InternalState<TValues>> = [];
  let validationController: AbortController | undefined;
  let revision = 0;
  let validatedSnapshot: { revision: number; value: TValues } | undefined;
  let current: InternalState<TValues> = {
    baseline: initial,
    isSubmitting: false,
    issues: undefined,
    isValidating: false,
    submitCount: 0,
    touched: {},
    validity: 'unknown',
    value: initial,
  };
  let publicState = makeFormState(current);

  function ensureActive(operation: string): void {
    if (disposed) throw new ForgeDisposedError(operation);
  }

  function write(update: (current: InternalState<TValues>) => InternalState<TValues>): void {
    pendingWrites.push(update);
    if (dispatching) return;

    dispatching = true;
    try {
      while (pendingWrites.length > 0) {
        current = Object.freeze(pendingWrites.shift()!(current));
        publicState = makeFormState(current);
        notifier.notify(current);
      }
    } finally {
      dispatching = false;
    }
  }

  function abortValidation(): void {
    validationController?.abort();
  }

  const access: FieldAccess = {
    abortValidation,
    addListener: notifier.add,
    ensureActive,
    invokeListener: notifier.call,
    readState: () => current,
    resetValue(path) {
      write((c) => {
        revision++;
        validatedSnapshot = undefined;
        return {
          ...c,
          touched: writeMeta(c.touched, path, false),
          validity: 'unknown',
          value: resetAtPath(c.value, c.baseline, path),
        };
      });
    },
    setTouched(path, touched) {
      write((c) => ({ ...c, touched: writeMeta(c.touched, path, touched) }));
    },
    setValue(path, next) {
      write((c) => {
        const previous = readAtPath(c.value, path);
        const value = typeof next === 'function' ? next(previous) : next;
        revision++;
        validatedSnapshot = undefined;
        return { ...c, validity: 'unknown', value: writeAtPath(c.value, path, value) };
      });
    },
  };

  async function validate(externalSignal?: AbortSignal): Promise<ValidationResult> {
    ensureActive('validate');
    abortValidation();

    const controller = new AbortController();
    const signal = externalSignal ? AbortSignal.any([controller.signal, externalSignal]) : controller.signal;
    if (signal.aborted) return Object.freeze({ status: 'aborted' });

    const snapshot = current.value;
    const snapshotRevision = revision;
    validationController = controller;
    validatedSnapshot = undefined;
    write((c) => ({ ...c, isValidating: true }));

    try {
      if (signal.aborted || revision !== snapshotRevision) return Object.freeze({ status: 'aborted' });
      const result: readonly ValidationIssue[] | undefined = options.validate
        ? await abortable(
            Promise.resolve(options.validate(snapshot as Parameters<FormValidator<TValues>>[0], signal)),
            signal,
          )
        : undefined;

      if (signal.aborted || validationController !== controller || revision !== snapshotRevision) {
        return Object.freeze({ status: 'aborted' });
      }

      const issues = normalizeIssues(result);
      const validity: Validity = issues === undefined ? 'valid' : 'invalid';
      validationController = undefined;
      write((c) => ({ ...c, issues, isValidating: false, validity }));

      if (signal.aborted || revision !== snapshotRevision || validationController !== undefined) {
        return Object.freeze({ status: 'aborted' });
      }

      validatedSnapshot = validity === 'valid' ? { revision, value: snapshot } : undefined;
      return validity === 'valid'
        ? Object.freeze({ status: 'valid' })
        : Object.freeze({ issues: issues as readonly ValidationIssue[], status: 'invalid' });
    } catch (error) {
      if (signal.aborted || validationController !== controller) return Object.freeze({ status: 'aborted' });
      throw new ForgeValidationError('Form validation failed.', { cause: error });
    } finally {
      if (validationController === controller) {
        validationController = undefined;
        if (!disposed) write((c) => ({ ...c, isValidating: false }));
      }
    }
  }

  const form: Form<TValues> = {
    get disposalSignal() {
      return disposalController.signal;
    },
    dispose() {
      if (disposed) return;

      disposed = true;
      pendingWrites.length = 0;
      validatedSnapshot = undefined;
      disposalController.abort();
      abortValidation();
      notifier.clear();
    },
    get disposed() {
      return disposed;
    },
    field(key) {
      assertSafeKey(key);
      if (!isRecord(current.value)) throw new ForgeConfigError('Form value must be an object.');

      return createField<TValues[typeof key]>([key], access);
    },
    reset(next) {
      ensureActive('reset');
      abortValidation();

      const replacement = next === undefined ? undefined : immutable(next);
      write((c) => {
        const baseline = replacement ?? c.baseline;
        revision++;
        validatedSnapshot = undefined;
        return { ...c, baseline, issues: undefined, touched: {}, validity: 'unknown', value: baseline };
      });
    },
    set(next) {
      ensureActive('set');
      abortValidation();

      write((c) => {
        const value =
          typeof next === 'function'
            ? (next as (previous: Form<TValues>['value']) => TValues)(c.value as Form<TValues>['value'])
            : next;
        revision++;
        validatedSnapshot = undefined;
        return { ...c, issues: undefined, validity: 'unknown', value: immutable(value) };
      });
    },
    get state() {
      return publicState;
    },
    async submit<TResult = void>(
      handler: (values: Form<TValues>['value'], signal: AbortSignal) => MaybePromise<TResult>,
      externalSignal?: AbortSignal,
    ): Promise<SubmitResult<TResult>> {
      ensureActive('submit');

      if (current.isSubmitting) {
        throw new ForgeSubmitError('submit() called while a submission is already in progress');
      }

      const signal = externalSignal
        ? AbortSignal.any([disposalController.signal, externalSignal])
        : disposalController.signal;

      write((c) => ({
        ...c,
        isSubmitting: true,
        submitCount: c.submitCount + 1,
        touched: touchAll(c.value),
      }));

      try {
        const result = await validate(externalSignal);

        if (result.status === 'aborted') return Object.freeze({ status: 'aborted' });

        if (result.status === 'invalid') {
          return Object.freeze({ issues: result.issues, status: 'invalid' });
        }

        const validated = validatedSnapshot;
        if (!validated || validated.revision !== revision || signal.aborted) {
          return Object.freeze({ status: 'aborted' });
        }

        try {
          return Object.freeze({
            status: 'ok',
            value: await handler(validated.value as Form<TValues>['value'], signal),
          });
        } catch (error) {
          if (signal.aborted) return Object.freeze({ status: 'aborted' });

          throw error;
        }
      } finally {
        if (!disposed) write((c) => ({ ...c, isSubmitting: false }));
      }
    },
    subscribe(listener, subscribeOptions = {}): Unsubscribe {
      ensureActive('subscribe');

      if (subscribeOptions.immediate) notifier.call(() => listener(publicState));

      return notifier.add(() => listener(publicState));
    },
    [Symbol.dispose]() {
      form.dispose();
    },
    validate,
    get value() {
      return current.value as Form<TValues>['value'];
    },
  };

  return form;
}
