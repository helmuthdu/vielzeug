import type { SigilError } from './errors';

// ─── Encoding ────────────────────────────────────────────────────────────────

/** QR error-correction level: L (7%), M (15%), Q (25%), H (30%). */
export type QrErrorCorrection = 'L' | 'M' | 'Q' | 'H';

/** QR segment mode. `byte` encodes UTF-8 without an ECI header. */
export type QrMode = 'numeric' | 'alphanumeric' | 'byte';

export interface QrEncodeOptions {
  /** Error-correction level. Default `'M'`. */
  readonly errorCorrection?: QrErrorCorrection;
  /** Force a mask 0–7; otherwise the lowest-penalty mask wins. Exposed for tests/vectors. */
  readonly mask?: number;
  /** Minimum version; useful to keep a stable size across payload changes. */
  readonly minVersion?: number;
  /** Force a mode; otherwise the most compact mode covering the whole input is used. */
  readonly mode?: QrMode;
  /** Pin a version 1–40; otherwise the smallest that fits is used. */
  readonly version?: number;
}

/** An encoded QR symbol: a frozen square matrix of dark/light modules. */
export interface QrMatrix {
  readonly errorCorrection: QrErrorCorrection;
  /** `false` outside bounds. */
  get(x: number, y: number): boolean;
  readonly mask: number;
  readonly mode: QrMode;
  /** Row-major; `true` = dark module. Frozen. */
  readonly modules: ReadonlyArray<ReadonlyArray<boolean>>;
  /** Modules per side: `17 + 4 * version`. */
  readonly size: number;
  readonly version: number;
}

// ─── Rendering ───────────────────────────────────────────────────────────────

export interface QrSvgOptions {
  /** Module colors; defaults `currentColor`/`transparent` so the SVG themes via CSS. */
  readonly dark?: string;
  /** Accessible label → `<title>` + `role="img"`. */
  readonly label?: string;
  readonly light?: string;
  /** Quiet-zone width in modules. Default 4 (spec minimum). */
  readonly margin?: number;
  /** Merge adjacent dark modules into a single path. Default `true` → small output. */
  readonly optimizePath?: boolean;
  /** Module size in user units. Default 1 → `viewBox = size + 2*margin`; scale via CSS. */
  readonly scale?: number;
}

export interface QrCanvasOptions {
  readonly dark?: string;
  readonly light?: string;
  /** Quiet-zone width in modules. Default 4. */
  readonly margin?: number;
  /** CSS pixels per module. Default 1. */
  readonly scale?: number;
}

// ─── Scanning ────────────────────────────────────────────────────────────────

export interface QrScanResult {
  readonly cornerPoints?: ReadonlyArray<{ readonly x: number; readonly y: number }>;
  readonly value: string;
}

/** Injected QR detector — matches the native `BarcodeDetector` shape. */
export interface QrDetector {
  detect(
    source: ImageBitmapSource,
  ): Promise<ReadonlyArray<{ rawValue: string; cornerPoints?: ReadonlyArray<{ x: number; y: number }> }>>;
}

export interface QrScannerOptions {
  /** `MediaStreamConstraints['video']`; default `{ facingMode: 'environment' }`. */
  readonly constraints?: MediaTrackConstraints;
  /** Injection for tests; defaults to `new BarcodeDetector({ formats: ['qr_code'] })`. */
  readonly detector?: QrDetector;
  /** Minimum ms between detection passes. Default 200. */
  readonly intervalMs?: number;
  /** Injection for tests; defaults to `navigator.mediaDevices`. */
  readonly mediaDevices?: Pick<MediaDevices, 'getUserMedia'>;
  /** Stop after the first result. Default `true`. */
  readonly once?: boolean;
  readonly signal?: AbortSignal;
  /** Video element the camera stream is attached to. */
  readonly video: HTMLVideoElement;
}

export type QrScannerStatus = 'idle' | 'starting' | 'scanning' | 'stopped' | 'disposed';

export interface QrScanner {
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  /** Registers a result handler; returns an unsubscribe function. */
  onResult(handler: (result: QrScanResult) => void): () => void;
  /** Requests the camera, attaches the stream to `video`, and begins the detect loop. */
  start(): Promise<void>;
  readonly status: QrScannerStatus;
  /** Stops the loop and tracks; the instance stays usable. */
  stop(): void;
  /** Side-channel observation; swallowing handler errors per conventions. */
  tap(handler: (event: SigilEvent) => void, options?: { readonly signal?: AbortSignal }): () => void;
  [Symbol.dispose](): void;
}

export type SigilEvent =
  | { readonly type: 'status-change'; readonly status: QrScannerStatus }
  | { readonly type: 'detect'; readonly value: string; readonly elapsedMs: number }
  | { readonly type: 'frame-skipped'; readonly reason: 'not-ready' | 'busy' }
  | { readonly type: 'error'; readonly error: SigilError }
  | { readonly type: 'dispose' };
