import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FakeAudioBufferSourceNode, FakeOscillatorNode } from '../testing';
import { createHarness } from './helpers';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('voice pool', () => {
  it('routes play through gain -> bus input', async () => {
    const { bard, ctx } = createHarness();
    await bard.load({ ping: '/ping.wav' });
    bard.play('ping');
    const source = ctx.sources[0] as FakeAudioBufferSourceNode;
    expect(source.buffer).not.toBeNull();
    const gain = source.connections[0];
    expect(gain).toBeDefined();
    expect(gain?.connections.length).toBeGreaterThan(0);
    bard.dispose();
  });

  it('applies deterministic detune and rate from ranges', async () => {
    const { bard, ctx } = createHarness();
    await bard.load({ ping: '/ping.wav' });
    bard.play('ping', { detune: [-100, 100], random: () => 0.5, rate: [0.5, 1.5] });
    const source = ctx.sources[0] as FakeAudioBufferSourceNode;
    expect(source.detune.value).toBe(0);
    expect(source.playbackRate.value).toBe(1);
    bard.play('ping', { detune: [-100, 100], random: () => 1 });
    expect((ctx.sources[1] as FakeAudioBufferSourceNode).detune.value).toBe(100);
    bard.dispose();
  });

  it('steals the oldest voice past maxVoices for a key', async () => {
    const { bard, ctx, events } = createHarness();
    await bard.load({ ping: '/ping.wav' });
    const a = bard.play('ping', { loop: true, maxVoices: 1 });
    const b = bard.play('ping', { loop: true, maxVoices: 1 });
    expect(a.disposed).toBe(true); // stolen: fading out
    const first = ctx.sources[0] as FakeAudioBufferSourceNode;
    expect(first.stops.length).toBe(1); // stolen with a micro-fade stop
    expect(events.some((e) => e.type === 'steal')).toBe(true);
    expect(b.disposed).toBe(false);
    bard.dispose();
  });

  it('respects the global maxVoices cap', async () => {
    const { bard, ctx } = createHarness({ maxVoices: 2 });
    await bard.load({ a: '/a.wav', b: '/b.wav' });
    bard.play('a', { loop: true });
    bard.play('b', { loop: true });
    bard.play('a', { loop: true });
    expect((ctx.sources[0] as FakeAudioBufferSourceNode).stops.length).toBe(1);
    bard.dispose();
  });

  it('finished resolves when the source ends', async () => {
    const { bard, ctx } = createHarness();
    await bard.load({ ping: '/ping.wav' });
    const handle = bard.play('ping');
    const source = ctx.sources[0] as FakeAudioBufferSourceNode;
    ctx.advance(2);
    source.emitEnded();
    await expect(handle.finished).resolves.toBeUndefined();
    bard.dispose();
  });

  it('stop fades out before stopping', async () => {
    const { bard, ctx } = createHarness();
    await bard.load({ ping: '/ping.wav' });
    const handle = bard.play('ping', { loop: true });
    handle.stop({ fade: 0.5 });
    const source = ctx.sources[0] as FakeAudioBufferSourceNode;
    const gain = source.connections[0] as import('../testing').FakeGainNode;
    expect(gain.gain.used('linearRampToValueAtTime')).toBe(true);
    expect(source.stops[source.stops.length - 1]).toBeCloseTo(0.5);
    bard.dispose();
  });

  it('setVolume and setPan work on the handle', async () => {
    const { bard, ctx } = createHarness();
    await bard.load({ ping: '/ping.wav' });
    const handle = bard.play('ping', { loop: true, pan: 0.5 });
    handle.setVolume(0.25, { fade: 0.1 });
    handle.setPan(-1);
    const source = ctx.sources[0] as FakeAudioBufferSourceNode;
    const gain = source.connections[0] as import('../testing').FakeGainNode;
    const panner = gain.connections[0] as import('../testing').FakeStereoPannerNode;
    expect(panner.pan.value).toBe(-1);
    expect(gain.gain.calls.some((c) => c.value === 0.25)).toBe(true);
    bard.dispose();
  });
});

describe('synth', () => {
  it('builds osc -> gain with an ADSR envelope', () => {
    const { bard, ctx } = createHarness();
    bard.synth({ duration: 0.5, envelope: { attack: 0.1, decay: 0.1, release: 0.1, sustain: 0.5 }, freq: 440 });
    const osc = ctx.sources[0] as FakeOscillatorNode;
    expect(osc.type).toBe('sine');
    expect(osc.frequency.calls[0]).toMatchObject({ method: 'setValueAtTime', value: 440 });
    const gain = osc.connections[0] as import('../testing').FakeGainNode;
    expect(gain.gain.used('linearRampToValueAtTime')).toBe(true);
    bard.dispose();
  });

  it('sweeps frequency exponentially for tuple freq', () => {
    const { bard, ctx } = createHarness();
    bard.synth({ duration: 0.4, freq: [440, 110] });
    const osc = ctx.sources[0] as FakeOscillatorNode;
    expect(osc.frequency.used('exponentialRampToValueAtTime')).toBe(true);
    expect(osc.frequency.calls.some((c) => c.value === 110)).toBe(true);
    bard.dispose();
  });

  it('routes noise through a bandpass when freq is given', () => {
    const { bard, ctx } = createHarness();
    bard.synth({ duration: 0.2, freq: 800, type: 'noise' });
    const source = ctx.sources[0] as FakeAudioBufferSourceNode;
    const filter = source.connections[0] as import('../testing').FakeBiquadFilterNode;
    expect(filter.frequency.calls[0]?.value).toBe(800);
    bard.dispose();
  });

  it('disconnects its nodes when the voice ends', () => {
    const { bard, ctx } = createHarness();
    bard.synth({ duration: 0.2, freq: 440 });
    const osc = ctx.sources[0] as FakeOscillatorNode;
    const gain = osc.connections[0] as import('../testing').FakeGainNode;
    ctx.advance(1);
    osc.emitEnded();
    expect(osc.disconnected).toBeGreaterThan(0);
    expect(gain.disconnected).toBeGreaterThan(0);
    bard.dispose();
  });

  it('rejects a non-positive duration', () => {
    const { bard } = createHarness();
    expect(() => bard.synth({ duration: 0 })).toThrow();
    bard.dispose();
  });
});
