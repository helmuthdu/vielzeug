import { createField, type FieldAccess } from './_field';
import { createNotifier } from './_notify';
import {
  assertSafeKey,
  immutable,
  isRecord,
  type MetaRoot,
  normalizeErrors,
  resetAtPath,
  touchAll,
  writeAtPath,
  writeMeta,
} from './core/path';
import { ForgeConfigError, ForgeDisposedError, ForgeSubmitError, ForgeValidationError } from './errors';
import type {
  Form,
  FormErrors,
  FormOptions,
  FormState,
  MaybePromise,
  ReadonlyDeep,
  SubmitResult,
  Unsubscribe,
  ValidationErrors,
  ValidationResult,
} from './types';

type Validity = 'invalid' | 'unknown' | 'valid';

type InternalState<TValues extends Record<string, unknown>> = Readonly<{
  baseline: TValues;
  errors: FormErrors<TValues> | undefined;
  formError: string | undefined;
  isSubmitting: boolean;
  isValidating: boolean;
  submitCount: number;
  touched: MetaRoot;
  validity: Validity;
  value: TValues;
}>;

function makeFormState<TValues extends Record<string, unknown>>(current: InternalState<TValues>): FormState<TValues> {
  return Object.freeze({
    errors: current.errors,
    formError: current.formError,
    hasErrors: current.formError !== undefined || current.errors !== undefined,
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
  const notifier = createNotifier(options.onSubscriberError);
  const disposalController = new AbortController();
  let disposed = false;
  let validationController: AbortController | undefined;
  let current: InternalState<TValues> = {
    baseline: initial,
    errors: undefined,
    formError: undefined,
    isSubmitting: false,
    isValidating: false,
    submitCount: 0,
    touched: {},
    validity: 'unknown',
    value: initial,
  };

  function ensureActive(operation: string): void {
    if (disposed) throw new ForgeDisposedError(operation);
  }

  function write(update: (current: InternalState<TValues>) => InternalState<TValues>): void {
    current = Object.freeze(update(current));
    notifier.notify();
  }

  function abortValidation(): void {
    validationController?.abort();
  }

  const access: FieldAccess = {
    abortValidation,
    addListener: notifier.add,
    ensureActive,
    readState: () => current,
    resetValue(path) {
      write((c) => ({
        ...c,
        touched: writeMeta(c.touched, path, false),
        validity: 'unknown',
        value: resetAtPath(c.value, c.baseline, path),
      }));
    },
    setTouched(path, touched) {
      write((c) => ({ ...c, touched: writeMeta(c.touched, path, touched) }));
    },
    setValue(path, next) {
      write((c) => ({
        ...c,
        validity: 'unknown',
        value: writeAtPath(c.value, path, next),
      }));
    },
  };

  async function validate(externalSignal?: AbortSignal): Promise<ValidationResult<TValues>> {
    ensureActive('validate');
    abortValidation();

    const controller = new AbortController();
    const signal = externalSignal ? AbortSignal.any([controller.signal, externalSignal]) : controller.signal;

    validationController = controller;
    write((c) => ({ ...c, isValidating: true }));

    try {
      const result: ValidationErrors<TValues> | undefined = options.validate
        ? await options.validate(current.value as ReadonlyDeep<TValues>, signal)
        : undefined;

      if (signal.aborted || validationController !== controller) return Object.freeze({ status: 'aborted' });

      const errors = result?.fields
        ? (normalizeErrors(immutable(result.fields)) as FormErrors<TValues> | undefined)
        : undefined;
      const formError = result?.formError;
      const validity: Validity = errors === undefined && formError === undefined ? 'valid' : 'invalid';

      write((c) => ({ ...c, errors, formError, validity }));

      return validity === 'valid'
        ? Object.freeze({ status: 'valid' })
        : Object.freeze({ errors, formError, status: 'invalid' });
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

      const baseline = next === undefined ? current.baseline : immutable(next);

      write((c) => ({
        ...c,
        baseline,
        errors: undefined,
        formError: undefined,
        touched: {},
        validity: 'unknown',
        value: baseline,
      }));
    },
    set(next) {
      ensureActive('set');
      abortValidation();

      const value =
        typeof next === 'function' ? (next as (current: ReadonlyDeep<TValues>) => TValues)(form.value) : next;

      write((c) => ({ ...c, errors: undefined, formError: undefined, validity: 'unknown', value: immutable(value) }));
    },
    get state() {
      return makeFormState(current);
    },
    async submit<TResult = void>(
      handler: (values: ReadonlyDeep<TValues>, signal: AbortSignal) => MaybePromise<TResult>,
      externalSignal?: AbortSignal,
    ): Promise<SubmitResult<TResult, TValues>> {
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
          return Object.freeze({ errors: result.errors, formError: result.formError, status: 'invalid' });
        }

        try {
          return Object.freeze({ status: 'ok', value: await handler(form.value, signal) });
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

      if (subscribeOptions.immediate) listener(makeFormState(current));

      return notifier.add(() => listener(makeFormState(current)));
    },
    [Symbol.dispose]() {
      form.dispose();
    },
    validate,
    get value() {
      return current.value as ReadonlyDeep<TValues>;
    },
  };

  return form;
}
