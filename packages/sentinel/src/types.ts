import type { Readable, Ripple } from '@vielzeug/ripple';

export interface Sentinel<T> extends Readable<T> {
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  [Symbol.dispose](): void;
}

export interface SentinelOptions {
  readonly runtime?: Pick<Ripple, 'signal'>;
  readonly signal?: AbortSignal;
}

export interface WindowSentinelOptions extends SentinelOptions {
  readonly target?: Window;
}

export interface ViewportState {
  readonly dpr: number;
  readonly height: number;
  readonly width: number;
}

export interface NetworkConnectionSnapshot {
  readonly downlink?: number;
  readonly effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  readonly rtt?: number;
  readonly saveData?: boolean;
}

export interface NetworkState {
  readonly connection: NetworkConnectionSnapshot | null;
  readonly online: boolean;
}

export interface MediaQueryState {
  readonly matches: boolean;
}

export interface ElementSizeState {
  readonly height: number;
  readonly width: number;
}

export interface IntersectionState {
  readonly intersectionRatio: number;
  readonly isIntersecting: boolean;
}
