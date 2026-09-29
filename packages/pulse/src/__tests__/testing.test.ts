import { afterEach, describe, expect, it, vi } from 'vitest';

import { frames, MockWebSocket } from '../testing';

describe('MockWebSocket (public testing entry)', () => {
  afterEach(() => {
    vi.useRealTimers();
    MockWebSocket.deferClose = false;
    MockWebSocket.instances = [];
  });

  it('registers instances in construction order', () => {
    const first = new MockWebSocket('ws://one');
    const second = new MockWebSocket('ws://two');

    expect(MockWebSocket.instances).toEqual([first, second]);
    expect(first.url).toBe('ws://one');
  });

  it('stays connecting until open() fires onopen', () => {
    const socket = new MockWebSocket('ws://test');
    const onopen = vi.fn();
    socket.onopen = onopen;

    expect(socket.readyState).toBe(MockWebSocket.CONNECTING);
    socket.open();
    expect(socket.readyState).toBe(MockWebSocket.OPEN);
    expect(onopen).toHaveBeenCalled();
  });

  it('auto-opens on the next macrotask when autoOpen is set', async () => {
    const socket = new MockWebSocket('ws://test', undefined, { autoOpen: true });
    const onopen = vi.fn();
    socket.onopen = onopen;

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(socket.readyState).toBe(MockWebSocket.OPEN);
    expect(onopen).toHaveBeenCalled();
  });

  it('decodes sent frames through frames()', () => {
    const socket = new MockWebSocket('ws://test');
    socket.send(JSON.stringify({ token: 't', type: 'auth' }));

    expect(frames(socket)).toEqual([{ token: 't', type: 'auth' }]);
  });

  it('delivers received frames as JSON messages', () => {
    const socket = new MockWebSocket('ws://test');
    const received: unknown[] = [];
    socket.onmessage = (event) => received.push(JSON.parse(event.data));

    socket.receive({ room: 'lobby', type: 'joined' });

    expect(received).toEqual([{ room: 'lobby', type: 'joined' }]);
  });

  it('drops with a 1006 close by default', () => {
    const socket = new MockWebSocket('ws://test');
    const closes: Array<{ code: number; reason: string }> = [];
    socket.onclose = (event) => closes.push({ code: event.code, reason: event.reason });

    socket.drop();

    expect(closes).toEqual([{ code: 1006, reason: 'network error' }]);
    expect(socket.readyState).toBe(MockWebSocket.CLOSED);
  });
});
