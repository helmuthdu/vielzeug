import { createForm, ForgeDisposedError, ForgeError } from '../../index';

describe('form subscriptions', () => {
  test('subscribe with sync:true sends immediate current snapshot', () => {
    const form = createForm({ defaultValues: { x: 1 } });
    let stateSubmitCount = -1;

    form.subscribe(
      (state) => {
        stateSubmitCount = state.submitCount;
      },
      { sync: true },
    );

    expect(stateSubmitCount).toBe(0);
  });

  test('unsubscribe stops future form notifications', () => {
    const form = createForm({ defaultValues: { x: 1 } });
    let calls = 0;
    const unsubscribe = form.subscribe(() => {
      calls++;
    });

    unsubscribe();
    form.set('x', 2);

    expect(calls).toBe(0);
  });

  test('subscribeField only fires for its field', () => {
    const form = createForm({ defaultValues: { a: 1, b: 2 } });
    let calls = 0;

    form.subscribeField('b', () => {
      calls++;
    });

    form.set('a', 99);

    expect(calls).toBe(0);
  });

  test('multiple listeners on same field are all notified', () => {
    const form = createForm({ defaultValues: { x: 0 } });
    let a = 0;
    let b = 0;

    form.subscribeField('x', () => {
      a++;
    });
    form.subscribeField('x', () => {
      b++;
    });

    form.set('x', 1);

    expect(a).toBe(1);
    expect(b).toBe(1);
  });

  test('batch groups multiple writes into one form notification', () => {
    const form = createForm({ defaultValues: { a: 1, b: 2 } });
    let calls = 0;

    form.subscribe(() => {
      calls++;
    });

    form.batch(() => {
      form.set('a', 10);
      form.set('b', 20);
    });

    expect(calls).toBe(1);
  });

  test('partial validation only notifies subscribed fields that actually change', async () => {
    const form = createForm({
      defaultValues: { a: '', b: '' },
      validators: {
        a: (value: unknown) => (!value ? 'Required' : undefined),
        b: (value: unknown) => (!value ? 'Required' : undefined),
      },
    });
    let aCalls = 0;
    let bCalls = 0;

    form.subscribeField('a', () => {
      aCalls++;
    });
    form.subscribeField('b', () => {
      bCalls++;
    });

    form.touch('a');
    aCalls = 0;
    bCalls = 0;

    await form.validateFields([...form.state.touchedFields]);

    expect(aCalls).toBe(1);
    expect(bCalls).toBe(0);
  });
});

describe('form lifecycle', () => {
  test('dispose prevents further mutations', () => {
    const form = createForm({ defaultValues: { x: 1 } });

    form.dispose();

    expect(() => form.set('x', 2)).toThrow('Cannot call set() on a disposed form');
    expect(() => form.connect('x')).toThrow('Cannot call connect() on a disposed form');
  });

  test('mutating a disposed form throws a ForgeDisposedError instance, and ForgeError.is() recognizes it', () => {
    const form = createForm({ defaultValues: { x: 1 } });

    form.dispose();

    let caught: unknown;

    try {
      form.set('x', 2);
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(ForgeDisposedError);
    expect(caught).toBeInstanceOf(ForgeError);
    expect(ForgeError.is(caught)).toBe(true);
  });

  test('subscribe and subscribeField become no-ops after dispose', () => {
    const form = createForm({ defaultValues: { x: 1 } });

    form.dispose();

    expect(() => form.subscribe(() => {})).not.toThrow();
    expect(() => form.subscribeField('x', () => {})).not.toThrow();
  });

  test('disposalSignal is not aborted before dispose() and aborts when dispose() is called', () => {
    const form = createForm({ defaultValues: { x: 1 } });

    expect(form.disposalSignal.aborted).toBe(false);

    form.dispose();

    expect(form.disposalSignal.aborted).toBe(true);
  });

  test('disposalSignal returns the same AbortSignal instance across repeated reads', () => {
    const form = createForm({ defaultValues: { x: 1 } });

    expect(form.disposalSignal).toBe(form.disposalSignal);
  });
});

describe('batch() error handling', () => {
  test('subscribers still receive notification after batch callback throws', () => {
    const form = createForm({ defaultValues: { x: 1, y: 2 } });

    const states: number[] = [];

    form.subscribe((s) => states.push((s.errors as Record<string, string>)['x'] ? 1 : 0));
    states.length = 0;

    try {
      form.batch(() => {
        form.set('x', 99);
        throw new Error('oops');
      });
    } catch {
      // expected
    }

    // Notification should have fired with the partially mutated state (x=99)
    expect(states).toHaveLength(1);
    expect(form.get('x')).toBe(99);
  });

  test('pending flags are drained after batch callback throws', () => {
    const form = createForm({ defaultValues: { a: 1 } });

    let calls = 0;

    form.subscribe(() => calls++);
    calls = 0;

    try {
      form.batch(() => {
        form.set('a', 2);
        throw new Error('fail');
      });
    } catch {
      // expected
    }

    // A subsequent normal mutation should still trigger exactly one notification
    form.set('a', 3);
    expect(calls).toBe(2); // one from the throw, one from the subsequent set
  });
});

describe('touchAll', () => {
  test('touchAll() marks every store field and every validator-only field as touched', () => {
    const form = createForm<Record<string, unknown>>({ defaultValues: { email: '', name: '' } });

    // A field with only a validator, no store entry — reachable exclusively via validators.keys().
    form.fields.setValidator('age', () => undefined);

    form.touchAll();

    expect(form.field('name').touched).toBe(true);
    expect(form.field('email').touched).toBe(true);
    expect(form.field('age').touched).toBe(true);
  });

  test('untouchAll() clears all touched fields and fires subscriber notification', () => {
    const form = createForm({ defaultValues: { email: '', name: '' } });

    form.touch('name');
    form.touch('email');
    expect(form.state.touchedFields).toHaveLength(2);

    const notifications: number[] = [];

    form.subscribe(() => notifications.push(1));

    form.untouchAll();

    expect(form.state.touchedFields).toHaveLength(0);
    expect(form.field('name').touched).toBe(false);
    expect(form.field('email').touched).toBe(false);
    expect(notifications.length).toBeGreaterThanOrEqual(1);
  });
});
