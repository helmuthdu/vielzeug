import { assertSafeKey, hasAtPath, isRecord, type MetaRoot, readAtPath, readError, readMeta } from './core/path';
import { ForgeConfigError } from './errors';
import type { Field, FieldState, ReadonlyDeep, SubscribeOptions, Unsubscribe } from './types';

export interface FieldAccess {
  abortValidation(): void;
  addListener(listener: () => void): Unsubscribe;
  ensureActive(operation: string): void;
  readState(): { baseline: unknown; errors: unknown; touched: MetaRoot; value: unknown };
  resetValue(path: readonly (string | number)[]): void;
  setTouched(path: readonly (string | number)[], touched: boolean): void;
  setValue(path: readonly (string | number)[], next: unknown): void;
}

function makeFieldState<V>(
  state: { baseline: unknown; errors: unknown; touched: MetaRoot; value: unknown },
  path: readonly (string | number)[],
): FieldState<V> {
  const value = readAtPath<V>(state.value, path);
  const baseline = readAtPath<V>(state.baseline, path);

  return Object.freeze({
    dirty: value !== baseline || hasAtPath(state.value, path) !== hasAtPath(state.baseline, path),
    error: readError(state.errors, path),
    touched: readMeta(state.touched, path),
    value: value as ReadonlyDeep<V>,
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
    set(next: V | ((previous: ReadonlyDeep<V>) => V)) {
      access.ensureActive('field().set');
      access.abortValidation();

      const previous = readAtPath<V>(access.readState().value, path) as ReadonlyDeep<V>;
      const value = typeof next === 'function' ? (next as (current: ReadonlyDeep<V>) => V)(previous) : next;

      access.setValue(path, value);
    },
    get state() {
      return makeFieldState<V>(access.readState(), path);
    },
    subscribe(listener: (state: FieldState<V>) => void, subscribeOptions: SubscribeOptions = {}): Unsubscribe {
      access.ensureActive('field().subscribe');

      let previous = makeFieldState<V>(access.readState(), path);

      if (subscribeOptions.immediate) listener(previous);

      const filtered = () => {
        const next = makeFieldState<V>(access.readState(), path);

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
