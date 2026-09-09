import { isEqual } from '@vielzeug/arsenal';

import {
  assertArrayIndex,
  assertSafeKey,
  findIssue,
  hasAtPath,
  isRecord,
  type MetaRoot,
  readAtPath,
  readMeta,
} from './core/path.js';
import { ForgeConfigError } from './errors.js';
import type { Field, FieldState, SubscribeOptions, Unsubscribe, ValidationIssue } from './types.js';

type FieldSourceState = {
  baseline: unknown;
  issues: readonly ValidationIssue[] | undefined;
  touched: MetaRoot;
  value: unknown;
};

export interface FieldAccess {
  abortValidation(): void;
  addListener(listener: (state: FieldSourceState) => void): Unsubscribe;
  ensureActive(operation: string): void;
  invokeListener(listener: () => void): void;
  readState(): FieldSourceState;
  resetValue(path: readonly (string | number)[]): void;
  setTouched(path: readonly (string | number)[], touched: boolean): void;
  setValue(path: readonly (string | number)[], next: unknown | ((previous: unknown) => unknown)): void;
}

function makeFieldState<V>(state: FieldSourceState, path: readonly (string | number)[]): FieldState<V> {
  const value = readAtPath<V>(state.value, path);
  const baseline = readAtPath<V>(state.baseline, path);

  return Object.freeze({
    dirty: !isEqual(value, baseline) || hasAtPath(state.value, path) !== hasAtPath(state.baseline, path),
    error: findIssue(state.issues, path),
    touched: readMeta(state.touched, path),
    value: value as FieldState<V>['value'],
  });
}

export function createField<V>(path: readonly (string | number)[], access: FieldAccess): Field<V> {
  const common = {
    get dirty() {
      return makeFieldState<V>(access.readState(), path).dirty;
    },
    get error() {
      return makeFieldState<V>(access.readState(), path).error;
    },
    reset() {
      access.ensureActive('field().reset');
      access.abortValidation();
      access.resetValue(path);
    },
    set(next: V | ((previous: FieldState<V>['value']) => V)) {
      access.ensureActive('field().set');
      access.abortValidation();

      access.setValue(path, next as unknown | ((previous: unknown) => unknown));
    },
    get state() {
      return makeFieldState<V>(access.readState(), path);
    },
    subscribe(listener: (state: FieldState<V>) => void, subscribeOptions: SubscribeOptions = {}): Unsubscribe {
      access.ensureActive('field().subscribe');

      let previous = makeFieldState<V>(access.readState(), path);

      if (subscribeOptions.immediate) access.invokeListener(() => listener(previous));

      const filtered = (state: FieldSourceState) => {
        const next = makeFieldState<V>(state, path);

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

      return access.addListener(filtered);
    },
    touch() {
      access.ensureActive('field().touch');
      access.setTouched(path, true);
    },
    get touched() {
      return makeFieldState<V>(access.readState(), path).touched;
    },
    get value() {
      return makeFieldState<V>(access.readState(), path).value;
    },
  };

  return Object.assign(common, {
    field(key: string | number): Field<unknown> {
      if (typeof key === 'number') {
        assertArrayIndex(key);
        const currentVal = readAtPath(access.readState().value, path);

        if (currentVal !== undefined && !Array.isArray(currentVal)) {
          throw new ForgeConfigError(`Cannot index ${key} because the current field value is not an array.`);
        }

        return createField([...path, key], access);
      }

      assertSafeKey(key);

      const currentVal = readAtPath(access.readState().value, path);

      if (currentVal !== undefined && !isRecord(currentVal)) {
        throw new ForgeConfigError(`Cannot select '${key}' because the current field value is not an object.`);
      }

      return createField([...path, key], access);
    },
  }) as unknown as Field<V>;
}
