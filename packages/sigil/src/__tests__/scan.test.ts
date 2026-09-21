// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SigilDisposedError, SigilPermissionError, SigilUnsupportedError } from '../errors';
import { createQrScanner, detectQr } from '../scan';
import type { QrDetector, QrScanResult, SigilEvent } from '../types';

const video = () => {
  const v = document.createElement('video');
  Object.defineProperty(v, 'readyState', { configurable: true, value: 4, writable: true });
  Object.defineProperty(v, 'srcObject', { configurable: true, value: null, writable: true });
  v.play = () => Promise.resolve();
  return v;
};

const fakeStream = () => {
  const tracks = [{ kind: 'video', stop: vi.fn() } as unknown as MediaStreamTrack];
  return { getTracks: () => tracks } as unknown as MediaStream;
};

const fakeMedia = (stream = fakeStream()) => ({
  getUserMedia: vi.fn(async () => stream),
});

const detectorOf = (results: Array<{ rawValue: string }>): QrDetector => ({
  detect: vi.fn(async () => results),
});

describe('detectQr', () => {
  it('returns null when no code is found', async () => {
    const detector = detectorOf([]);
    const result = await detectQr({} as ImageBitmapSource, { detector });
    expect(result).toBeNull();
    expect(detector.detect).toHaveBeenCalledOnce();
  });

  it('returns the first result value and corner points', async () => {
    const cornerPoints = [{ x: 1, y: 2 }];
    const withCorners: QrDetector = { detect: async () => [{ cornerPoints, rawValue: 'payload' }] };
    expect(await detectQr({} as ImageBitmapSource, { detector: withCorners })).toEqual({
      cornerPoints,
      value: 'payload',
    });
  });

  it('throws SigilUnsupportedError without a detector or BarcodeDetector', async () => {
    await expect(detectQr({} as ImageBitmapSource)).rejects.toBeInstanceOf(SigilUnsupportedError);
  });

  it('honors an aborted signal', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(detectQr({} as ImageBitmapSource, { signal: controller.signal })).rejects.toThrow();
  });
});

describe('createQrScanner', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const scanner = (over: Partial<Parameters<typeof createQrScanner>[0]> = {}) =>
    createQrScanner({
      detector: detectorOf([{ rawValue: 'found' }]),
      mediaDevices: fakeMedia(),
      video: video(),
      ...over,
    });

  it('requests the environment camera and attaches the stream to video', async () => {
    const media = fakeMedia();
    const v = video();
    const s = scanner({ mediaDevices: media, video: v });
    await s.start();
    expect(media.getUserMedia).toHaveBeenCalledWith({ video: { facingMode: 'environment' } });
    expect(v.srcObject).not.toBeNull();
    expect(s.status).toBe('scanning');
    s.dispose();
  });

  it('honors custom video constraints', async () => {
    const media = fakeMedia();
    const s = scanner({ constraints: { facingMode: 'user' }, mediaDevices: media });
    await s.start();
    expect(media.getUserMedia).toHaveBeenCalledWith({ video: { facingMode: 'user' } });
    s.dispose();
  });

  it('delivers results via onResult and stops after first by default', async () => {
    const s = scanner();
    const results: QrScanResult[] = [];
    s.onResult((r) => results.push(r));
    await s.start();
    await vi.advanceTimersByTimeAsync(250);
    expect(results.map((r) => r.value)).toEqual(['found']);
    expect(s.status).toBe('stopped'); // once=true stopped the stream
    s.dispose();
  });

  it('keeps scanning when once=false', async () => {
    const s = scanner({ once: false });
    const values: string[] = [];
    s.onResult((r) => values.push(r.value));
    await s.start();
    await vi.advanceTimersByTimeAsync(450);
    expect(values.length).toBeGreaterThanOrEqual(2);
    expect(s.status).toBe('scanning');
    s.dispose();
  });

  it('respects intervalMs between detection passes', async () => {
    const detector = detectorOf([]);
    const s = scanner({ detector, intervalMs: 500 });
    await s.start();
    await vi.advanceTimersByTimeAsync(450);
    const calls1 = (detector.detect as ReturnType<typeof vi.fn>).mock.calls.length;
    await vi.advanceTimersByTimeAsync(500);
    const calls2 = (detector.detect as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(calls2).toBeGreaterThan(calls1);
    s.dispose();
  });

  it('emits frame-skipped when the video is not ready', async () => {
    const v = video();
    Object.defineProperty(v, 'readyState', { value: 0 });
    const events: SigilEvent[] = [];
    const s = scanner({ video: v });
    s.tap((e) => events.push(e));
    await s.start();
    await vi.advanceTimersByTimeAsync(250);
    expect(events.some((e) => e.type === 'frame-skipped' && e.reason === 'not-ready')).toBe(true);
    s.dispose();
  });

  it('emits status-change and detect events through tap', async () => {
    const events: SigilEvent[] = [];
    const s = scanner();
    s.tap((e) => events.push(e));
    await s.start();
    await vi.advanceTimersByTimeAsync(250);
    const types = events.map((e) => e.type);
    expect(types).toContain('status-change');
    expect(types).toContain('detect');
    s.dispose();
    expect(events.some((e) => e.type === 'dispose')).toBe(true);
  });

  it('maps permission denial to SigilPermissionError', async () => {
    const media = {
      getUserMedia: vi.fn(async () => {
        throw new DOMException('denied', 'NotAllowedError');
      }),
    };
    const s = scanner({ mediaDevices: media });
    await expect(s.start()).rejects.toBeInstanceOf(SigilPermissionError);
    expect(s.status).toBe('idle');
    s.dispose();
  });

  it('throws SigilUnsupportedError at start(), not construction, when no detector exists', async () => {
    const s = createQrScanner({ mediaDevices: fakeMedia(), video: video() });
    expect(s.status).toBe('idle');
    await expect(s.start()).rejects.toBeInstanceOf(SigilUnsupportedError);
    s.dispose();
  });

  it('throws SigilUnsupportedError when getUserMedia is missing', async () => {
    const s = createQrScanner({
      detector: detectorOf([]),
      mediaDevices: {} as Pick<MediaDevices, 'getUserMedia'>,
      video: video(),
    });
    await expect(s.start()).rejects.toBeInstanceOf(SigilUnsupportedError);
    s.dispose();
  });

  it('stop() halts the loop and tracks but keeps the instance usable', async () => {
    const stream = fakeStream();
    const s = scanner({ mediaDevices: fakeMedia(stream) });
    await s.start();
    s.stop();
    expect(s.status).toBe('stopped');
    expect(stream.getTracks()[0].stop).toHaveBeenCalled();
    expect(s.disposed).toBe(false);
    s.dispose();
  });

  it('dispose() stops tracks, aborts the signal, and emits dispose', async () => {
    const stream = fakeStream();
    const events: SigilEvent[] = [];
    const s = scanner({ mediaDevices: fakeMedia(stream) });
    s.tap((e) => events.push(e));
    await s.start();
    s.dispose();
    expect(s.status).toBe('disposed');
    expect(s.disposed).toBe(true);
    expect(s.disposalSignal.aborted).toBe(true);
    expect(stream.getTracks()[0].stop).toHaveBeenCalled();
    expect(events[events.length - 1]?.type ?? events.find((e) => e.type === 'dispose')?.type).toBe('dispose');
    await expect(s.start()).rejects.toBeInstanceOf(SigilDisposedError);
  });

  it('tap after dispose returns a no-op unsubscribe', () => {
    const s = scanner();
    s.dispose();
    const off = s.tap(() => {});
    expect(() => off()).not.toThrow();
  });
});
