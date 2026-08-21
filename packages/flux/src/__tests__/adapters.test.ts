import { signal } from '@vielzeug/ripple';
import { describe, expect, it, vi } from 'vitest';

import { fromQuery } from '../adapters/courier';
import { fromBus, toBus } from '../adapters/herald';
import { fromPulse, fromRoomPresence } from '../adapters/pulse';
import { fromSignal, toSignal } from '../adapters/ripple';
import { stream } from '../core';
import { of } from '../operators/creation';
import { pipe } from '../pipe';

describe('ripple adapter', () => {
  it('bridges signals in both directions', () => {
    const source = signal(0);
    const received: number[] = [];
    const subscription = fromSignal(source).subscribe((value) => received.push(value));

    source.value = 1;
    subscription.unsubscribe();

    const target = toSignal(fromSignal(source), { initial: -1 });

    source.value = 2;
    target.dispose();

    expect(received).toEqual([0, 1]);
    expect(target.value).toBe(2);
  });

  it('disposes binding when source completes', () => {
    const binding = toSignal(of(42), { initial: 0 });

    expect(binding.value).toBe(42);
    expect(binding.disposed).toBe(true);
    expect(binding.disposalSignal.aborted).toBe(true);
  });

  it('disposes binding when source errors', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const binding = toSignal(
      stream<number>((sink) => {
        sink.error(new Error('offline'));
      }),
      { initial: 0 },
    );

    expect(binding.value).toBe(0);
    expect(binding.disposed).toBe(true);
    expect(binding.disposalSignal.aborted).toBe(true);
    error.mockRestore();
  });

  it('calls onError when source errors, then disposes', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onError = vi.fn();
    const binding = toSignal(
      stream<number>((sink) => {
        sink.error(new Error('offline'));
      }),
      { initial: 0, onError },
    );

    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect((onError.mock.calls[0][0] as Error).message).toBe('offline');
    expect(binding.disposed).toBe(true);
    expect(binding.disposalSignal.aborted).toBe(true);
    error.mockRestore();
  });

  it('does not log to console.error when onError is provided', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onError = vi.fn();
    toSignal(
      stream<number>((sink) => {
        sink.error(new Error('offline'));
      }),
      { initial: 0, onError },
    );

    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it('disposes binding when external signal aborts', () => {
    const controller = new AbortController();
    const binding = toSignal(
      stream(() => {}),
      { initial: 0, signal: controller.signal },
    );

    controller.abort();

    expect(binding.disposed).toBe(true);
    expect(binding.disposalSignal.aborted).toBe(true);
  });
});

describe('courier adapter', () => {
  it('reads snapshots and stream event payloads', async () => {
    let listener: (() => void) | undefined;
    const queryCache = {
      getSnapshot: <T>(_key: readonly unknown[]): T | null =>
        ({ data: 1, error: null, isFetching: false, status: 'success' as const, updatedAt: 0 }) as unknown as T,
      subscribe(_key: readonly unknown[], callback: () => void) {
        listener = callback;

        return () => {
          listener = undefined;
        };
      },
    };
    const query = { fetch: async () => 1, key: ['query'] as const };
    const values: Array<number | null | undefined> = [];
    const subscription = fromQuery(queryCache, query).subscribe((value) => values.push(value?.data));

    listener?.();
    subscription.unsubscribe();

    expect(values).toEqual([1, 1]);
  });
});

describe('herald and pulse adapters', () => {
  it('subscribes and forwards typed event sources', () => {
    const handlers = new Set<(value: string) => void>();
    const bus = {
      emit(_event: string, value: string) {
        handlers.forEach((handler) => {
          handler(value);
        });
      },
      on(_event: string, handler: (value: string) => void) {
        handlers.add(handler);

        return () => handlers.delete(handler);
      },
    } as unknown as import('@vielzeug/herald').Bus<{ event: string }>;
    const received: string[] = [];

    fromBus(bus, 'event').subscribe((value) => received.push(value));
    pipe(of('forwarded'), toBus(bus, 'event')).subscribe(() => {});
    bus.emit('event', 'hello');

    const pulse = {
      on: (_event: string, handler: (value: string) => void) => {
        handlers.add(handler);

        return () => handlers.delete(handler);
      },
    } as unknown as import('@vielzeug/pulse').Pulse<{ server: { event: string } }>;

    fromPulse(pulse, 'event').subscribe((value) => received.push(value));
    handlers.forEach((handler) => {
      handler('pulse');
    });

    expect(received).toContain('forwarded');
    expect(received).toContain('hello');
    expect(received).toContain('pulse');
  });

  it('emits current and changed presence state', () => {
    const members = new Map([['first', 'Ada']]);
    let joined: () => void = () => {};
    let left: () => void = () => {};
    const room = {
      onJoin(callback: () => void) {
        joined = callback;

        return () => {};
      },
      onLeave(callback: () => void) {
        left = callback;

        return () => {};
      },
      presence: {
        get value() {
          return members;
        },
      },
    } as unknown as import('@vielzeug/pulse').PresenceRoomScope<string>;
    const values: number[] = [];

    fromRoomPresence(room).subscribe((value) => values.push(value.size));
    members.set('second', 'Bea');
    joined();
    members.delete('first');
    left();

    expect(values).toEqual([1, 2, 1]);
  });
});
