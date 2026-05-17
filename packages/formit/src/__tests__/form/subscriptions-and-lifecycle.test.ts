import { createForm } from '../../index';

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

    await form.validateTouched();

    expect(aCalls).toBe(1);
    expect(bCalls).toBe(0);
  });
});

describe('form lifecycle', () => {
  test('dispose prevents further mutations', () => {
    const form = createForm({ defaultValues: { x: 1 } });

    form.dispose();

    expect(() => form.set('x', 2)).toThrow('Cannot modify a disposed form');
    expect(() => form.bind('x')).toThrow('Cannot modify a disposed form');
  });

  test('subscribe and subscribeField become no-ops after dispose', () => {
    const form = createForm({ defaultValues: { x: 1 } });

    form.dispose();

    expect(() => form.subscribe(() => {})).not.toThrow();
    expect(() => form.subscribeField('x', () => {})).not.toThrow();
  });
});
