import { afterEach, describe, expect, it, vi } from 'vitest';

import { BardError } from '../errors';
import { type FakeAudioBufferSourceNode, type FakeGainNode, flush } from '../testing';
import { createHarness, installMediaSession } from './helpers';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('deck', () => {
  it('crossfades between tracks and stops the outgoing voice', async () => {
    const { bard, ctx, events } = createHarness();
    await bard.load({ a: '/a.wav', b: '/b.wav' });
    const deck = bard.createDeck();
    deck.transition('a');
    expect(deck.current).toBe('a');
    deck.transition('b', { fade: 1 });
    expect(deck.current).toBe('b');
    const first = ctx.sources[0] as FakeAudioBufferSourceNode;
    const second = ctx.sources[1] as FakeAudioBufferSourceNode;
    // Outgoing faded to 0 and stopped; incoming faded in from 0.
    const firstGain = first.connections[0] as FakeGainNode;
    expect(firstGain.gain.calls.some((c) => c.method === 'linearRampToValueAtTime' && c.value === 0)).toBe(true);
    expect(first.stops.length).toBe(1);
    const secondGain = second.connections[0] as FakeGainNode;
    expect(secondGain.gain.calls[0]).toMatchObject({ method: 'setValueAtTime', value: 0 });
    expect(secondGain.gain.calls.some((c) => c.value === 1)).toBe(true);
    expect(events.filter((e) => e.type === 'track').map((e) => (e as { key: string | null }).key)).toEqual(['a', 'b']);
    bard.dispose();
  });

  it('transition to the current key is a no-op without restarting', async () => {
    const { bard, ctx } = createHarness();
    await bard.load({ a: '/a.wav' });
    const deck = bard.createDeck();
    deck.transition('a');
    deck.transition('a');
    expect(ctx.sources.length).toBe(1);
    bard.dispose();
  });

  it('supports intro + loop points', async () => {
    const { bard, ctx } = createHarness();
    await bard.load({ a: '/a.wav' });
    const deck = bard.createDeck();
    deck.transition('a', { loop: true, loopEnd: 0.75, loopStart: 0.25 });
    const source = ctx.sources[0] as FakeAudioBufferSourceNode;
    expect(source.loop).toBe(true);
    expect(source.loopStart).toBe(0.25);
    expect(source.loopEnd).toBe(0.75);
    bard.dispose();
  });

  it('pause then play restarts from the paused offset', async () => {
    const { bard, ctx } = createHarness();
    await bard.load({ a: '/a.wav' });
    const deck = bard.createDeck();
    deck.transition('a', { fade: 0 });
    ctx.advance(1);
    deck.pause();
    expect(deck.playing).toBe(false);
    const first = ctx.sources[0] as FakeAudioBufferSourceNode;
    expect(first.stops.length).toBe(1);
    deck.play();
    const second = ctx.sources[1] as FakeAudioBufferSourceNode;
    expect(second.started[0]?.offset).toBeCloseTo(1);
    expect(deck.playing).toBe(true);
    bard.dispose();
  });

  it('stop clears the deck and emits track null', async () => {
    const { bard, events } = createHarness();
    await bard.load({ a: '/a.wav' });
    const deck = bard.createDeck();
    deck.transition('a');
    deck.stop();
    expect(deck.current).toBeNull();
    expect(events[events.length - 1]).toEqual({ key: null, type: 'track' });
    bard.dispose();
  });

  it('shuffle is deterministic with an injected random', async () => {
    const { bard } = createHarness();
    await bard.load({ a: '/a.wav', b: '/b.wav', c: '/c.wav' });
    const deck = bard.createDeck();
    // random() = 1 keeps the original order under Fisher-Yates (j === i).
    deck.queue(['a', 'b', 'c'], { random: () => 1, shuffle: true });
    expect(deck.current).toBe('a');
    deck.next();
    expect(deck.current).toBe('b');
    deck.previous();
    expect(deck.current).toBe('a');
    bard.dispose();
  });

  it('a manual transition clears the queue', async () => {
    const { bard } = createHarness();
    await bard.load({ a: '/a.wav', b: '/b.wav', c: '/c.wav' });
    const deck = bard.createDeck({ fade: 0 });
    deck.queue(['a', 'b'], { crossfade: 0 });
    await flush();
    deck.transition('c');
    deck.next(); // no queue -> no-op
    expect(deck.current).toBe('c');
    bard.dispose();
  });

  it('streams long tracks through an owned audio element', async () => {
    const { bard, elements } = createHarness();
    await bard.load({ long: { src: '/long.mp3', stream: true } });
    expect(elements.length).toBe(1);
    expect(elements[0]?.crossOrigin).toBe('anonymous');
    expect(() => bard.play('long')).toThrow(BardError);
    const deck = bard.createDeck();
    deck.transition('long', { loop: true });
    expect(elements[0]?.playing).toBe(true);
    expect(elements[0]?.loop).toBe(true);
    bard.dispose();
    expect(elements[0]?.playing).toBe(false);
  });

  it('rejects loop points on streamed tracks', async () => {
    const { bard } = createHarness();
    await bard.load({ long: { src: '/long.mp3', stream: true } });
    const deck = bard.createDeck();
    expect(() => deck.transition('long', { loopStart: 1 })).toThrow(BardError);
    bard.dispose();
  });

  it('owns mediaSession exclusively and releases on dispose', async () => {
    installMediaSession();
    const { bard } = createHarness();
    await bard.load({ a: '/a.wav' });
    const deck = bard.createDeck({ mediaSession: true });
    expect(() => bard.createDeck({ mediaSession: true })).toThrow(BardError);
    deck.transition('a');
    deck.dispose();
    const second = bard.createDeck({ mediaSession: true }); // claim released
    expect(second.disposed).toBe(false);
    bard.dispose();
  });

  it('hardware nexttrack advances the queue', async () => {
    const session = installMediaSession();
    const { bard } = createHarness();
    await bard.load({ a: '/a.wav', b: '/b.wav' });
    const deck = bard.createDeck({ fade: 0, mediaSession: true });
    deck.queue(['a', 'b'], { crossfade: 0 });
    session.handlers.get('nexttrack')?.();
    expect(deck.current).toBe('b');
    bard.dispose();
  });

  it('deck dispose stops the active slot', async () => {
    const { bard, ctx } = createHarness();
    await bard.load({ a: '/a.wav' });
    const deck = bard.createDeck();
    deck.transition('a', { loop: true });
    deck.dispose();
    const source = ctx.sources[0] as FakeAudioBufferSourceNode;
    expect(source.stops.length).toBe(1);
    expect(deck.disposed).toBe(true);
    expect(() => deck.transition('a')).toThrow(BardError);
    bard.dispose();
  });

  it('a paused deck does not auto-advance the queue when the track ends', async () => {
    const { bard } = createHarness();
    await bard.load({ a: '/a.wav', b: '/b.wav' });
    const deck = bard.createDeck({ fade: 0 });
    vi.useFakeTimers();
    try {
      deck.queue(['a', 'b'], { crossfade: 0 });
      expect(deck.current).toBe('a');
      deck.pause();
      // Buffered fake tracks are 1s long: the nearlyOver timer would fire here.
      await vi.advanceTimersByTimeAsync(1500);
    } finally {
      vi.useRealTimers();
    }
    expect(deck.current).toBe('a');
    expect(deck.playing).toBe(false);
    bard.dispose();
  });

  it('play() reschedules the queue auto-advance after resume', async () => {
    const { bard } = createHarness();
    await bard.load({ a: '/a.wav', b: '/b.wav' });
    const deck = bard.createDeck({ fade: 0 });
    vi.useFakeTimers();
    try {
      deck.queue(['a', 'b'], { crossfade: 0 });
      deck.pause();
      deck.play();
      await vi.advanceTimersByTimeAsync(1500);
    } finally {
      vi.useRealTimers();
    }
    expect(deck.current).toBe('b');
    expect(deck.playing).toBe(true);
    bard.dispose();
  });

  it('pause then play on a streamed track keeps the shared element playing', async () => {
    const { bard, elements } = createHarness();
    await bard.load({ long: { src: '/long.mp3', stream: true } });
    const deck = bard.createDeck({ fade: 0 });
    vi.useFakeTimers();
    try {
      deck.transition('long');
      deck.pause();
      deck.play();
      expect(elements[0]?.playing).toBe(true);
      // The outgoing slot's deferred teardown must not pause the reused element.
      await vi.advanceTimersByTimeAsync(100);
    } finally {
      vi.useRealTimers();
    }
    expect(elements[0]?.playing).toBe(true);
    expect(deck.playing).toBe(true);
    bard.dispose();
    expect(elements[0]?.playing).toBe(false);
  });
});
