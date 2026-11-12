import { isEqual } from '@vielzeug/arsenal';

import {
  assertArrayIndex,
  assertSafeKey,
  findIssue,
  formatValuePath,
  hasAtPath,
  isRecord,
  readAtPath,
} from './core/path.js';
import type { TouchedPaths } from './core/touched.js';
import { ForgeConfigError } from './errors.js';
import type { Field, FieldState, SubscribeOptions, Unsubscribe, ValidationIssue } from './types.js';

type FieldSourceState = {
  baseline: unknown;
  issues: readonly ValidationIssue[] | undefined;
  touched: TouchedPaths;
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

function makeFieldState<V>(
  state: FieldSourceState,
  path: readonly (string | number)[],
  touchedKey: string,
): FieldState<V> {
  const value = readAtPath<V>(state.value, path);
  const baseline = readAtPath<V>(state.baseline, path);

  return Object.freeze({
    dirty: !isEqual(value, baseline) || hasAtPath(state.value, path) !== hasAtPath(state.baseline, path),
    error: findIssue(state.issues, path),
    touched: state.touched.has(touchedKey),
    value: value as FieldState<V>['value'],
  });
}

export function createField<V>(path: readonly (string | number)[], access: FieldAccess): Field<V> {
  const touchedKey = formatValuePath(path);
  const readField = (): FieldState<V> => makeFieldState<V>(access.readState(), path, touchedKey);
  const common = {
    get dirty() {
      return readField().dirty;
    },
    get error() {
      return readField().error;
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
      return readField();
    },
    subscribe(listener: (state: FieldState<V>) => void, subscribeOptions: SubscribeOptions = {}): Unsubscribe {
      access.ensureActive('field().subscribe');

      let previous = readField();

      if (subscribeOptions.immediate) access.invokeListener(() => listener(previous));

      const filtered = (source: FieldSourceState) => {
        const next = makeFieldState<V>(source, path, touchedKey);

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
      return readField().touched;
    },
    get value() {
      return readField().value;
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
