import { signal } from '@vielzeug/ripple';
import { describe, expect, it } from 'vitest';

import { fromQuery, fromSse } from '../adapters/courier';
import { fromBus, toBus } from '../adapters/herald';
import { fromPresence, fromPulse } from '../adapters/pulse';
import { fromSignal, toSignal } from '../adapters/ripple';
import { toArray } from '../operators/utility';
import { createSubject } from '../subject';

// ── Ripple adapter ──────────────────────────────────────────────────────────

describe('fromSignal()', () => {
  it('emits current value immediately on subscribe', () => {
    const sig = signal(42);
    const received: number[] = [];

    fromSignal(sig).subscribe((v) => received.push(v));
    sig.dispose();

    expect(received[0]).toBe(42);
  });

  it('emits on every signal change', () => {
    const sig = signal(0);
    const received: number[] = [];
    const unsub = fromSignal(sig).subscribe((v) => received.push(v));

    sig.value = 1;
    sig.value = 2;
    unsub();
    sig.dispose();

    expect(received).toEqual([0, 1, 2]);
  });
});

describe('toSignal()', () => {
  it('reflects source emissions as signal value', () => {
    const source = createSubject<number>();
    const sig = toSignal(source, { initial: 0 });

    source.emit(10);
    source.emit(20);
    sig.dispose();
    source.dispose();

    expect(sig.value).toBe(20);
  });

  it('stops updating signal when AbortSignal aborts', () => {
    const source = createSubject<number>();
    const ac = new AbortController();
    const sig = toSignal(source, { initial: 0, signal: ac.signal });

    source.emit(5);
    ac.abort();
    source.emit(99);

    expect(sig.value).toBe(5);
    source.dispose();
    sig.dispose();
  });

  it('stops updating signal after sig.dispose()', () => {
    const source = createSubject<number>();
    const sig = toSignal(source, { initial: 0 });

    source.emit(7);
    sig.dispose();
    source.emit(99);

    expect(sig.value).toBe(7);
    source.dispose();
  });

  it('does not update signal when signal option is already aborted', () => {
    const source = createSubject<number>();
    const ac = new AbortController();

    ac.abort();

    const sig = toSignal(source, { initial: 42, signal: ac.signal });

    source.emit(99);

    expect(sig.value).toBe(42);
    source.dispose();
    sig.dispose();
  });

  it('exposes disposed and disposalSignal properties', () => {
    const source = createSubject<number>();
    const sig = toSignal(source, { initial: 0 });

    expect(sig.disposed).toBe(false);
    expect(sig.disposalSignal.aborted).toBe(false);
    sig.dispose();
    expect(sig.disposed).toBe(true);
    expect(sig.disposalSignal.aborted).toBe(true);
    source.dispose();
  });

  it('dispose() is idempotent', () => {
    const source = createSubject<number>();
    const sig = toSignal(source, { initial: 0 });

    sig.dispose();
    sig.dispose();
    expect(sig.disposed).toBe(true);
    source.dispose();
  });

  it('[Symbol.dispose] delegates to dispose()', () => {
    const source = createSubject<number>();
    const sig = toSignal(source, { initial: 0 });

    sig[Symbol.dispose]();
    expect(sig.disposed).toBe(true);
    source.dispose();
  });

  it('exposes underlying signal via .signal property', () => {
    const source = createSubject<number>();
    const binding = toSignal(source, { initial: 0 });

    source.emit(5);
    expect(binding.signal.value).toBe(5);
    binding.dispose();
    source.dispose();
  });
});

// ── Herald adapter ──────────────────────────────────────────────────────────

type TestBusMap = { 'test:event': string };

function makeMockBus(): {
  bus: import('@vielzeug/herald').Bus<TestBusMap>;
  fire(event: 'test:event', payload: string): void;
} {
  const listeners = new Map<string, Set<(payload: string) => void>>();

  const bus = {
    emit(event: string, payload: string) {
      listeners.get(event)?.forEach((fn) => fn(payload));
    },
    on(event: string, handler: (payload: string) => void) {
      if (!listeners.has(event)) listeners.set(event, new Set());

      listeners.get(event)!.add(handler);

      return () => listeners.get(event)?.delete(handler);
    },
  } as unknown as import('@vielzeug/herald').Bus<TestBusMap>;

  return {
    bus,
    fire(event, payload) {
      (bus as unknown as { emit(e: string, p: string): void }).emit(event, payload);
    },
  };
}

describe('fromBus()', () => {
  it('emits each time the bus fires the event', () => {
    const { bus, fire } = makeMockBus();
    const received: string[] = [];

    const unsub = fromBus(bus, 'test:event').subscribe((v) => received.push(v));

    fire('test:event', 'hello');
    fire('test:event', 'world');
    unsub();
    fire('test:event', 'after');

    expect(received).toEqual(['hello', 'world']);
  });
});

describe('toBus()', () => {
  it('forwards source emissions to the bus and passes values through', () => {
    const { bus } = makeMockBus();
    const received: string[] = [];
    const forwarded: string[] = [];

    fromBus(bus, 'test:event').subscribe((v) => forwarded.push(v));

    const source = createSubject<string>();

    source.pipe(toBus(bus, 'test:event')).subscribe((v) => received.push(v));

    source.emit('ping');
    source.dispose();

    expect(received).toEqual(['ping']);
    expect(forwarded).toEqual(['ping']);
  });
});

// ── Pulse adapter ───────────────────────────────────────────────────────────

type TestPulseMap = { 'chat:message': string };

function makeMockPulse(): {
  fire(event: 'chat:message', payload: string): void;
  pulse: import('@vielzeug/pulse').Pulse<TestPulseMap>;
} {
  const listeners = new Map<string, Set<(payload: string) => void>>();

  const pulse = {
    on(event: string, handler: (payload: string) => void) {
      if (!listeners.has(event)) listeners.set(event, new Set());

      listeners.get(event)!.add(handler);

      return () => listeners.get(event)?.delete(handler);
    },
  } as unknown as import('@vielzeug/pulse').Pulse<TestPulseMap>;

  return {
    fire(event, payload) {
      listeners.get(event)?.forEach((fn) => fn(payload));
    },
    pulse,
  };
}

describe('fromPulse()', () => {
  it('emits each time the pulse fires the event', () => {
    const { fire, pulse } = makeMockPulse();
    const received: string[] = [];

    const unsub = fromPulse(pulse, 'chat:message').subscribe((v) => received.push(v));

    fire('chat:message', 'hi');
    fire('chat:message', 'there');
    unsub();
    fire('chat:message', 'gone');

    expect(received).toEqual(['hi', 'there']);
  });
});

describe('fromPresence()', () => {
  it('emits current state then updates on join/leave', () => {
    const members = new Map<string, string>([['a', 'Alice']]);
    const joinListeners = new Set<() => void>();
    const leaveListeners = new Set<() => void>();

    const presence = {
      onJoin(fn: () => void) {
        joinListeners.add(fn);

        return () => joinListeners.delete(fn);
      },
      onLeave(fn: () => void) {
        leaveListeners.add(fn);

        return () => leaveListeners.delete(fn);
      },
      state: {
        get value() {
          return members as ReadonlyMap<string, string>;
        },
      },
    } as unknown as import('@vielzeug/pulse').PresenceChannel<string>;

    const snapshots: string[][] = [];
    const unsub = fromPresence(presence).subscribe((m) => {
      snapshots.push([...m.keys()]);
    });

    members.set('b', 'Bob');
    joinListeners.forEach((fn) => fn());
    members.delete('a');
    leaveListeners.forEach((fn) => fn());
    unsub();

    expect(snapshots).toEqual([['a'], ['a', 'b'], ['b']]);
  });
});

// ── Courier adapter ─────────────────────────────────────────────────────────

describe('fromSse()', () => {
  it('emits typed SSE events', () => {
    type Events = { message: string };

    const listeners = new Map<string, Set<(data: string) => void>>();

    const source = {
      on(event: string, handler: (data: string) => void) {
        if (!listeners.has(event)) listeners.set(event, new Set());

        listeners.get(event)!.add(handler);

        return () => listeners.get(event)?.delete(handler);
      },
    } as unknown as import('@vielzeug/courier').SseSource<Events>;

    const received: string[] = [];
    const unsub = fromSse(source, 'message').subscribe((v) => received.push(v));

    listeners.get('message')?.forEach((fn) => fn('event-1'));
    listeners.get('message')?.forEach((fn) => fn('event-2'));
    unsub();
    listeners.get('message')?.forEach((fn) => fn('event-3'));

    expect(received).toEqual(['event-1', 'event-2']);
  });
});

describe('fromQuery()', () => {
  it('emits current state then on every change', () => {
    let storeValue = 1;
    const changeListeners = new Set<() => void>();

    const store = {
      peek() {
        return storeValue;
      },
      subscribe(fn: () => void) {
        changeListeners.add(fn);

        return () => changeListeners.delete(fn);
      },
    };

    const received: number[] = [];
    const unsub = fromQuery(store).subscribe((v) => received.push(v));

    storeValue = 2;
    changeListeners.forEach((fn) => fn());
    storeValue = 3;
    changeListeners.forEach((fn) => fn());
    unsub();
    storeValue = 4;
    changeListeners.forEach((fn) => fn());

    expect(received).toEqual([1, 2, 3]);
  });
});
