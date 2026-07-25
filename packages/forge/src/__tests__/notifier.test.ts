import type { FieldState, FormState } from '../types';

import { createNotifier, type NotifierDeps } from '../core/notifier';

/**
 * Direct unit tests for `createNotifier()`'s own contract — independent of `createForm()`.
 * The rest of the suite exercises this module transitively through the public `Form<T>` API;
 * these tests pin the three behaviors that are easy to get wrong in a future edit to
 * `requestNotify()`'s three-branch dispatch and haven't had a dedicated regression test.
 */
function testDeps(): NotifierDeps & { fieldStateOf: Map<string, FieldState<unknown>>; invalidateCount: number } {
  const fieldStateOf = new Map<string, FieldState<unknown>>();
  let invalidateCount = 0;

  return {
    buildFieldState: (name) =>
      fieldStateOf.get(name) ?? { dirty: false, error: undefined, hasError: false, touched: false, value: undefined },
    computeState: (): FormState => ({
      errors: {},
      isDirty: false,
      isLoading: false,
      isSubmitting: false,
      isTouched: false,
      isValid: true,
      isValidating: false,
      submitCount: 0,
      touchedFields: [],
      validatingFields: [],
    }),
    fieldStateOf,
    invalidateCaches: () => {
      invalidateCount++;
    },
    get invalidateCount() {
      return invalidateCount;
    },
  };
}

describe('createNotifier()', () => {
  test('requestNotify() invalidates caches exactly once per call, regardless of target shape', () => {
    const deps = testDeps();
    const notifier = createNotifier(deps);

    notifier.requestNotify();
    notifier.requestNotify('a');
    notifier.requestNotify(['a', 'b']);

    expect(deps.invalidateCount).toBe(3);
  });

  test('requestNotify(undefined) clears the full field-state cache', () => {
    const deps = testDeps();
    const notifier = createNotifier(deps);

    deps.fieldStateOf.set('a', { dirty: false, error: undefined, hasError: false, touched: false, value: 1 });

    const first = notifier.getFieldSnapshot('a');

    deps.fieldStateOf.set('a', { dirty: false, error: undefined, hasError: false, touched: false, value: 2 });
    // Cached — same object back until something invalidates it.
    expect(notifier.getFieldSnapshot('a')).toBe(first);

    notifier.requestNotify();

    const second = notifier.getFieldSnapshot('a');

    expect(second).not.toBe(first);
    expect(second.value).toBe(2);
  });

  test("requestNotify(name) only invalidates that field's cache, leaving others untouched", () => {
    const deps = testDeps();
    const notifier = createNotifier(deps);

    deps.fieldStateOf.set('a', { dirty: false, error: undefined, hasError: false, touched: false, value: 1 });
    deps.fieldStateOf.set('b', { dirty: false, error: undefined, hasError: false, touched: false, value: 1 });

    const aBefore = notifier.getFieldSnapshot('a');
    const bBefore = notifier.getFieldSnapshot('b');

    deps.fieldStateOf.set('a', { dirty: false, error: undefined, hasError: false, touched: false, value: 2 });
    deps.fieldStateOf.set('b', { dirty: false, error: undefined, hasError: false, touched: false, value: 2 });

    notifier.requestNotify('a');

    expect(notifier.getFieldSnapshot('a')).not.toBe(aBefore);
    expect(notifier.getFieldSnapshot('b')).toBe(bBefore);
  });

  test('requestNotify(iterable) invalidates exactly the named fields', () => {
    const deps = testDeps();
    const notifier = createNotifier(deps);

    for (const name of ['a', 'b', 'c']) {
      deps.fieldStateOf.set(name, { dirty: false, error: undefined, hasError: false, touched: false, value: 1 });
      notifier.getFieldSnapshot(name);
    }

    const before = {
      a: notifier.getFieldSnapshot('a'),
      b: notifier.getFieldSnapshot('b'),
      c: notifier.getFieldSnapshot('c'),
    };

    for (const name of ['a', 'b', 'c']) {
      deps.fieldStateOf.set(name, { dirty: false, error: undefined, hasError: false, touched: false, value: 2 });
    }

    notifier.requestNotify(['a', 'c']);

    expect(notifier.getFieldSnapshot('a')).not.toBe(before.a);
    expect(notifier.getFieldSnapshot('b')).toBe(before.b);
    expect(notifier.getFieldSnapshot('c')).not.toBe(before.c);
  });

  test('dispose() makes subscribe() and subscribeField() return no-op unsubscribes, and stops notifying', () => {
    const deps = testDeps();
    const notifier = createNotifier(deps);
    const calls: FormState[] = [];

    notifier.subscribe((state) => calls.push(state));
    notifier.dispose();

    const unsubscribeAfterDispose = notifier.subscribe((state) => calls.push(state));
    const fieldUnsubscribeAfterDispose = notifier.subscribeField('a', () => calls.push({} as FormState));

    notifier.requestNotify();

    expect(calls).toHaveLength(0);
    expect(() => unsubscribeAfterDispose()).not.toThrow();
    expect(() => fieldUnsubscribeAfterDispose()).not.toThrow();
  });

  test('subscribe({ sync: true }) delivers the current snapshot immediately, before any mutation', () => {
    const deps = testDeps();
    const notifier = createNotifier(deps);
    const calls: FormState[] = [];

    notifier.subscribe((state) => calls.push(state), { sync: true });

    expect(calls).toHaveLength(1);
    expect(calls[0]).toBe(notifier.getStateSnapshot());
  });

  test('getOrCreateFieldSignal() returns the same signal instance for repeated calls with the same key', () => {
    const deps = testDeps();
    const notifier = createNotifier(deps);

    expect(notifier.getOrCreateFieldSignal('a')).toBe(notifier.getOrCreateFieldSignal('a'));
  });
});
