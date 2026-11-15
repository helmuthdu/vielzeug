import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FakeGainNode } from '../testing';
import { createHarness, gains } from './helpers';

afterEach(() => {
  vi.unstubAllGlobals();
});

/** The bus stage gains: per bus, creation order is input, duck, volume; master is first. */
function busGains(ctx: ReturnType<typeof createHarness>['ctx'], bus: 'music' | 'sfx' | 'voice') {
  const all = gains(ctx);
  const offset = bus === 'music' ? 1 : bus === 'sfx' ? 4 : 7;
  return {
    duck: all[offset + 1] as FakeGainNode,
    input: all[offset] as FakeGainNode,
    volume: all[offset + 2] as FakeGainNode,
  };
}

describe('buses', () => {
  it('creates master plus the default buses', () => {
    const { bard, ctx } = createHarness();
    bard.bus('music');
    expect(gains(ctx).length).toBeGreaterThanOrEqual(10);
    expect(bard.bus('master').name).toBe('master');
    bard.dispose();
  });

  it('ramps volume with a linear ramp instead of assigning value', () => {
    const { bard, ctx } = createHarness();
    const music = bard.bus('music');
    music.setVolume(0.5, { fade: 0.4 });
    const { volume } = busGains(ctx, 'music');
    expect(volume.gain.used('linearRampToValueAtTime')).toBe(true);
    const last = volume.gain.calls[volume.gain.calls.length - 1];
    expect(last).toMatchObject({ method: 'linearRampToValueAtTime', value: 0.5 });
    expect(music.volume).toBe(0.5);
    bard.dispose();
  });

  it('mute and unmute ramp to 0 and back', () => {
    const { bard, ctx } = createHarness();
    const music = bard.bus('music');
    music.mute();
    const { volume } = busGains(ctx, 'music');
    expect(volume.gain.calls.some((c) => c.value === 0)).toBe(true);
    expect(music.muted).toBe(true);
    music.unmute();
    expect(music.muted).toBe(false);
    bard.dispose();
  });
});

describe('ducking', () => {
  it('ducks the target while the source has voices and releases when they end', async () => {
    const { bard, ctx, events } = createHarness({
      ducking: [{ attack: 0.2, gain: 0.3, release: 0.8, source: 'voice', target: 'music' }],
    });
    await bard.load({ ping: '/ping.wav' });
    const { duck } = busGains(ctx, 'music');
    const handle = bard.play('ping', { bus: 'voice' });
    expect(duck.gain.calls.some((c) => c.method === 'linearRampToValueAtTime' && c.value === 0.3)).toBe(true);
    expect(bard.bus('music').duckLevel).toBe(0.3);
    expect(events.some((e) => e.type === 'duck')).toBe(true);

    handle.dispose();
    expect(duck.gain.calls.some((c) => c.method === 'linearRampToValueAtTime' && c.value === 1)).toBe(true);
    expect(bard.bus('music').duckLevel).toBe(1);
    bard.dispose();
  });

  it('keeps ducking while any of several source voices is active', async () => {
    const { bard, ctx } = createHarness({
      ducking: [{ gain: 0.3, source: 'voice', target: 'music' }],
    });
    await bard.load({ ping: '/ping.wav' });
    const a = bard.play('ping', { bus: 'voice' });
    const b = bard.play('ping', { bus: 'voice' });
    a.dispose();
    const { duck } = busGains(ctx, 'music');
    const last = duck.gain.calls[duck.gain.calls.length - 1];
    expect(last.value).toBe(0.3); // still ducked
    b.dispose();
    expect(duck.gain.calls[duck.gain.calls.length - 1]?.value).toBe(1);
    bard.dispose();
  });

  it('ducking and user volume use separate stages', async () => {
    const { bard, ctx } = createHarness({
      ducking: [{ gain: 0.3, source: 'voice', target: 'music' }],
    });
    await bard.load({ ping: '/ping.wav' });
    bard.bus('music').setVolume(0.5);
    bard.play('ping', { bus: 'voice' });
    const { duck, volume } = busGains(ctx, 'music');
    expect(duck.gain.calls.some((c) => c.value === 0.3)).toBe(true);
    expect(volume.gain.calls.some((c) => c.value === 0.5)).toBe(true);
    expect(volume.gain.calls.some((c) => c.value === 0.3)).toBe(false);
    bard.dispose();
  });
});
