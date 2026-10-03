import { SigilDisposedError, SigilError, SigilPermissionError, SigilUnsupportedError } from './errors';
import type { QrDetector, QrScanner, QrScannerOptions, QrScannerStatus, QrScanResult, SigilEvent } from './types';

/**
 * Scanning via the native `BarcodeDetector` API: a thin lifecycle wrapper.
 * Feature detection is lazy so importing the package is always safe (SSR).
 * No from-scratch image decoder: unsupported environments get
 * `SigilUnsupportedError` at `start()`/`detectQr()`, never at import.
 */

interface BarcodeDetectorLike {
  detect(
    source: ImageBitmapSource,
  ): Promise<ReadonlyArray<{ rawValue: string; cornerPoints?: ReadonlyArray<{ x: number; y: number }> }>>;
}

interface BarcodeDetectorCtor {
  getSupportedFormats?(): Promise<readonly string[]>;
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
}

const globalScope = globalThis as { BarcodeDetector?: BarcodeDetectorCtor };

const barcodeDetector = (): BarcodeDetectorCtor | undefined => globalScope.BarcodeDetector;

/** Sync check: `BarcodeDetector` exists. Format support needs the async variant. */
export function isQrScanSupported(): boolean {
  return typeof barcodeDetector() === 'function';
}

/** Full check: `BarcodeDetector` exists and reports `qr_code` support. */
export async function qrScanSupport(): Promise<boolean> {
  const ctor = barcodeDetector();
  if (typeof ctor !== 'function') return false;
  if (typeof ctor.getSupportedFormats !== 'function') return true;
  try {
    return (await ctor.getSupportedFormats()).includes('qr_code');
  } catch {
    return false;
  }
}

/** One-shot detection on an image source; `null` when no code is found. */
export async function detectQr(
  source: ImageBitmapSource,
  options: { signal?: AbortSignal; detector?: QrDetector } = {},
): Promise<QrScanResult | null> {
  options.signal?.throwIfAborted();
  const ctor = barcodeDetector();
  const detector = options.detector ?? (ctor ? new ctor({ formats: ['qr_code'] }) : undefined);
  if (!detector) throw new SigilUnsupportedError('BarcodeDetector is not available in this environment');
  const results = await detector.detect(source);
  options.signal?.throwIfAborted();
  const first = results[0];
  return first ? { cornerPoints: first.cornerPoints, value: first.rawValue } : null;
}

export function createQrScanner(options: QrScannerOptions): QrScanner {
  const media = options.mediaDevices ?? globalThis.navigator?.mediaDevices;
  const once = options.once ?? true;
  const intervalMs = options.intervalMs ?? 200;
  const disposal = new AbortController();
  const tappers = new Set<(event: SigilEvent) => void>();
  const handlers = new Set<(result: QrScanResult) => void>();

  let status: QrScannerStatus = 'idle';
  let stream: MediaStream | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let busy = false;
  let detector: Promise<QrDetector> | undefined;

  const emit = (event: SigilEvent): void => {
    if (tappers.size === 0) return;
    for (const handler of [...tappers]) {
      try {
        handler(event);
      } catch {
        // Observability must never affect behavior.
      }
    }
  };

  const setStatus = (next: QrScannerStatus): void => {
    if (status === next) return;
    status = next;
    emit({ status: next, type: 'status-change' });
  };

  // Read through a function: status changes across awaits via closures, and a
  // direct read would be narrowed to the pre-await value by the compiler.
  const isStarting = (): boolean => status === 'starting';

  const stopTracks = (): void => {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
    if (stream) {
      for (const track of stream.getTracks()) track.stop();
      stream = null;
    }
    options.video.srcObject = null;
  };

  const fail = (error: SigilError): void => {
    emit({ error, type: 'error' });
    stopTracks();
    setStatus('idle');
  };

  // Created on first start() so a missing BarcodeDetector never rejects a
  // promise nobody awaits (construction must stay side-effect-free).
  const getDetector = (): Promise<QrDetector> => {
    detector ??= (async () => {
      if (options.detector) return options.detector;
      const ctor = barcodeDetector();
      if (typeof ctor !== 'function')
        throw new SigilUnsupportedError('BarcodeDetector is not available in this environment');
      return new ctor({ formats: ['qr_code'] });
    })();
    return detector;
  };

  const tick = async (): Promise<void> => {
    if (status !== 'scanning' || stream === null) return;
    const video = options.video;
    if (video.readyState < 2 /* HAVE_CURRENT_DATA */) {
      emit({ reason: 'not-ready', type: 'frame-skipped' });
      return;
    }
    if (busy) {
      emit({ reason: 'busy', type: 'frame-skipped' });
      return;
    }
    busy = true;
    const started = Date.now();
    try {
      const qrDetector = await getDetector();
      const results = await qrDetector.detect(video);
      const first = results[0];
      if (first) {
        const result: QrScanResult = { cornerPoints: first.cornerPoints, value: first.rawValue };
        emit({ elapsedMs: Date.now() - started, type: 'detect', value: result.value });
        for (const handler of [...handlers]) handler(result);
        if (once) {
          stopTracks();
          setStatus('idle');
        }
      }
    } catch (error) {
      fail(error instanceof SigilError ? error : new SigilError('QR detection failed', { cause: error }));
    } finally {
      busy = false;
    }
  };

  const api: QrScanner = {
    get disposalSignal() {
      return disposal.signal;
    },
    dispose() {
      if (status === 'disposed') return;
      emit({ type: 'dispose' });
      stopTracks();
      handlers.clear();
      tappers.clear();
      setStatus('disposed');
      disposal.abort();
    },
    get disposed() {
      return status === 'disposed';
    },
    onResult(handler) {
      if (status === 'disposed') return () => {};
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    async start() {
      if (status === 'disposed') throw new SigilDisposedError('Scanner is disposed');
      if (status === 'starting' || status === 'scanning') return;
      if (!media || typeof media.getUserMedia !== 'function')
        throw new SigilUnsupportedError('getUserMedia is not available in this environment');
      // Surface a missing detector at start() (not construction) per contract.
      await getDetector();
      options.signal?.throwIfAborted();
      setStatus('starting');
      let newStream: MediaStream;
      try {
        newStream = await media.getUserMedia({ video: options.constraints ?? { facingMode: 'environment' } });
      } catch (error) {
        setStatus('idle');
        if (error instanceof DOMException && error.name === 'NotAllowedError')
          throw new SigilPermissionError('Camera permission denied', { cause: error });
        throw error instanceof Error ? error : new SigilError('Camera request failed', { cause: error });
      }
      // stop()/dispose() during the permission prompt must not resurrect the scanner.
      if (!isStarting()) {
        for (const track of newStream.getTracks()) track.stop();
        return;
      }
      stream = newStream;
      options.video.srcObject = stream;
      await options.video.play().catch(() => {});
      if (!isStarting()) {
        stopTracks();
        return;
      }
      setStatus('scanning');
      timer = setInterval(() => void tick(), intervalMs);
      void tick();
    },
    get status() {
      return status;
    },
    stop() {
      if (status === 'disposed') return;
      stopTracks();
      setStatus('idle');
    },
    tap(handler, tapOptions) {
      if (status === 'disposed') return () => {};
      tappers.add(handler);
      const off = () => tappers.delete(handler);
      tapOptions?.signal?.addEventListener('abort', off, { once: true });
      return off;
    },
    [Symbol.dispose]() {
      api.dispose();
    },
  };

  if (options.signal) {
    const onAbort = (): void => api.stop();
    options.signal.addEventListener('abort', onAbort, { once: true });
    // A long-lived signal must not retain the scanner past dispose().
    disposal.signal.addEventListener('abort', () => options.signal?.removeEventListener('abort', onAbort), {
      once: true,
    });
  }
  return api;
}
