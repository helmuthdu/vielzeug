import {
  assertSafeKey,
  hasAtPath,
  immutable,
  isRecord,
  type MetaRoot,
  normalizeErrors,
  readAtPath,
  readError,
  readMeta,
  resetAtPath,
  touchAll,
  writeAtPath,
  writeMeta,
} from './core/path';
import { ForgeConfigError, ForgeDisposedError, ForgeSubmitError, ForgeValidationError } from './errors';
import type {
  Field,
  FieldState,
  Form,
  FormErrors,
  FormOptions,
  FormState,
  MaybePromise,
  ReadonlyDeep,
  SubmitResult,
  SubscribeOptions,
  Unsubscribe,
  ValidationErrors,
  ValidationResult,
} from './types';

type InternalState<TValues extends Record<string, unknown>> = Readonly<{
  baseline: TValues;
  error: string | undefined;
  errors: FormErrors<TValues> | undefined;
  isSubmitting: boolean;
  isValidating: boolean;
  submitCount: number;
  touched: MetaRoot;
  value: TValues;
}>;

function rethrowAsync(error: unknown): void {
  queueMicrotask(() => {
    throw error;
  });
}

function makeFieldState<V>(state: InternalState<Record<string, unknown>>, path: readonly string[]): FieldState<V> {
  const value = readAtPath<V>(state.value, path);
  const baseline = readAtPath<V>(state.baseline, path);

  return Object.freeze({
    dirty: value !== baseline || hasAtPath(state.value, path) !== hasAtPath(state.baseline, path),
    error: readError(state.errors, path),
    touched: readMeta(state.touched, path),
    value: value as ReadonlyDeep<V>,
  });
}

function makeFormState<TValues extends Record<string, unknown>>(current: InternalState<TValues>): FormState<TValues> {
  return Object.freeze({
    error: current.error,
    errors: current.errors,
    submitCount: current.submitCount,
    submitting: current.isSubmitting,
    touched: Object.keys(current.touched).length > 0,
    valid: current.error === undefined && current.errors === undefined,
    validating: current.isValidating,
  });
}

/** One immutable value tree and one explicit full-form validator keep form behavior locally understandable. */
export function createForm<TValues extends Record<string, unknown>>(options: FormOptions<TValues>): Form<TValues> {
  const initial = immutable(options.initialValues);

  function reportListenerError(error: unknown): void {
    if (!options.onSubscriberError) {
      rethrowAsync(error);

      return;
    }

    try {
      options.onSubscriberError(error);
    } catch (reporterError) {
      rethrowAsync(reporterError);
    }
  }

  let current: InternalState<TValues> = {
    baseline: initial,
    error: undefined,
    errors: undefined,
    isSubmitting: false,
    isValidating: false,
    submitCount: 0,
    touched: {},
    value: initial,
  };
  const listeners = new Set<() => void>();
  const disposalController = new AbortController();
  let disposed = false;
  let validationController: AbortController | undefined;

  function ensureActive(operation: string): void {
    if (disposed) throw new ForgeDisposedError(operation);
  }

  function notify(): void {
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch (error) {
        reportListenerError(error);
      }
    }
  }

  function write(update: (current: InternalState<TValues>) => InternalState<TValues>): void {
    current = Object.freeze(update(current));
    notify();
  }

  async function validate(externalSignal?: AbortSignal): Promise<ValidationResult<TValues>> {
    ensureActive('validate');
    validationController?.abort();

    const controller = new AbortController();
    const signal = externalSignal ? AbortSignal.any([controller.signal, externalSignal]) : controller.signal;

    validationController = controller;
    write((current) => ({ ...current, isValidating: true }));

    try {
      const result: ValidationErrors<TValues> | undefined = options.validate
        ? await options.validate(current.value as ReadonlyDeep<TValues>, signal)
        : undefined;

      if (signal.aborted || validationController !== controller) return Object.freeze({ status: 'aborted' });

      const errors = result?.fields
        ? (normalizeErrors(immutable(result.fields)) as FormErrors<TValues> | undefined)
        : undefined;
      const formError = result?.formError;

      write((current) => ({ ...current, error: formError, errors }));

      return errors === undefined && formError === undefined
        ? Object.freeze({ status: 'valid' })
        : Object.freeze({ errors, formError, status: 'invalid' });
    } catch (error) {
      if (signal.aborted || validationController !== controller) return Object.freeze({ status: 'aborted' });

      throw new ForgeValidationError('Form validation failed.', { cause: error });
    } finally {
      if (validationController === controller) {
        validationController = undefined;

        if (!disposed) write((current) => ({ ...current, isValidating: false }));
      }
    }
  }

  function createField<V>(path: readonly string[]): Field<V> {
    const common = {
      get dirty() {
        return makeFieldState<V>(current as InternalState<Record<string, unknown>>, path).dirty;
      },
      get error() {
        return makeFieldState<V>(current as InternalState<Record<string, unknown>>, path).error;
      },
      reset() {
        ensureActive('field().reset');
        validationController?.abort();
        write((current) => ({
          ...current,
          touched: writeMeta(current.touched, path, false),
          value: resetAtPath(current.value, current.baseline, path),
        }));
      },
      set(next: V | ((previous: ReadonlyDeep<V>) => V)) {
        ensureActive('field().set');
        validationController?.abort();

        const previous = readAtPath<V>(current.value, path) as ReadonlyDeep<V>;
        const value = typeof next === 'function' ? (next as (current: ReadonlyDeep<V>) => V)(previous) : next;

        write((current) => ({ ...current, value: writeAtPath(current.value, path, value) }));
      },
      subscribe(listener: (state: FieldState<V>) => void, subscribeOptions: SubscribeOptions = {}): Unsubscribe {
        ensureActive('field().subscribe');

        let previous = makeFieldState<V>(current as InternalState<Record<string, unknown>>, path);

        if (subscribeOptions.immediate) listener(previous);

        const filtered = () => {
          const next = makeFieldState<V>(current as InternalState<Record<string, unknown>>, path);

          if (
            next.value === previous.value &&
            next.error === previous.error &&
            next.touched === previous.touched &&
            next.dirty === previous.dirty
          ) {
            return;
          }

          previous = next;
          listener(next);
        };

        listeners.add(filtered);

        return () => listeners.delete(filtered);
      },
      touch() {
        ensureActive('field().touch');
        write((current) => ({ ...current, touched: writeMeta(current.touched, path, true) }));
      },
      get touched() {
        return makeFieldState<V>(current as InternalState<Record<string, unknown>>, path).touched;
      },
      get value() {
        return makeFieldState<V>(current as InternalState<Record<string, unknown>>, path).value;
      },
    };

    return Object.assign(common, {
      field<K extends keyof NonNullable<V> & string>(key: K): Field<NonNullable<V>[K]> {
        assertSafeKey(key);

        const currentVal = readAtPath(current.value, path);

        if (currentVal !== undefined && !isRecord(currentVal)) {
          throw new ForgeConfigError(`Cannot select '${key}' because the current field value is not an object.`);
        }

        return createField<NonNullable<V>[K]>([...path, key]);
      },
    }) as Field<V>;
  }

  const form: Form<TValues> = {
    get disposalSignal() {
      return disposalController.signal;
    },
    dispose() {
      if (disposed) return;

      disposed = true;
      disposalController.abort();
      validationController?.abort();
      listeners.clear();
    },
    get disposed() {
      return disposed;
    },
    field(key) {
      assertSafeKey(key);

      return createField<TValues[typeof key]>([key]);
    },
    reset(next) {
      ensureActive('reset');
      validationController?.abort();

      const baseline = next === undefined ? current.baseline : immutable(next);

      write((current) => ({
        ...current,
        baseline,
        error: undefined,
        errors: undefined,
        touched: {},
        value: baseline,
      }));
    },
    set(next) {
      ensureActive('set');
      validationController?.abort();

      const value =
        typeof next === 'function' ? (next as (current: ReadonlyDeep<TValues>) => TValues)(form.value) : next;

      write((current) => ({ ...current, error: undefined, errors: undefined, value: immutable(value) }));
    },
    get state() {
      return makeFormState(current);
    },
    async submit<TResult = void>(
      handler: (values: ReadonlyDeep<TValues>) => MaybePromise<TResult>,
    ): Promise<SubmitResult<TResult, TValues>> {
      ensureActive('submit');

      if (current.isSubmitting) throw new ForgeSubmitError('submit() called while a submission is already in progress');

      write((current) => ({
        ...current,
        isSubmitting: true,
        submitCount: current.submitCount + 1,
        touched: touchAll(current.value),
      }));

      try {
        const result = await validate();

        if (result.status === 'aborted') return Object.freeze({ ok: false, type: 'aborted' });

        if (result.status === 'invalid') {
          return Object.freeze({
            errors: result.errors,
            formError: result.formError,
            ok: false,
            type: 'validation',
          });
        }

        return Object.freeze({ ok: true, value: await handler(form.value) });
      } finally {
        if (!disposed) write((current) => ({ ...current, isSubmitting: false }));
      }
    },
    subscribe(listener, subscribeOptions: SubscribeOptions = {}): Unsubscribe {
      ensureActive('subscribe');

      if (subscribeOptions.immediate) listener(makeFormState(current));

      const formListener = () => listener(makeFormState(current));

      listeners.add(formListener);

      return () => listeners.delete(formListener);
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
