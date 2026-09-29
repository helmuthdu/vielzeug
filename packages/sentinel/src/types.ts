export type Unsubscribe = () => void;

/** Runtime events emitted by {@link Sentinel.tap}. Handler errors are swallowed. */
export type SentinelEvent = { readonly error: unknown; readonly type: 'error' } | { readonly type: 'dispose' };

/**
 * Read-only observable contract: `getSnapshot()` reads current state,
 * `subscribe()` registers a change listener. Structural by design; matches
 * `Subscribable` in `@vielzeug/arsenal`.
 */
export interface Subscribable<T> {
  getSnapshot(): T;
  subscribe(listener: () => void): Unsubscribe;
}

export interface Disposable {
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  [Symbol.dispose](): void;
}

export interface Sentinel<T> extends Subscribable<T>, Disposable {
  /** Observe runtime errors from listener dispatch. Returns an unsubscribe function. */
  tap(handler: (event: SentinelEvent) => void, options?: { readonly signal?: AbortSignal }): Unsubscribe;
}

export interface SentinelOptions {
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

export interface WakeLockState {
  /** Whether a wake lock is currently held. */
  readonly active: boolean;
  /** Whether the Screen Wake Lock API is available in this environment. */
  readonly supported: boolean;
}

/**
 * A sentinel-backed screen wake lock. `request()` acquires the lock; `release()` frees it.
 * When the tab is hidden the browser auto-releases the lock; `request()` re-acquires it
 * automatically on `visibilitychange` if the lock was active.
 */
export interface WakeLockSentinel extends Sentinel<WakeLockState> {
  /** Release the wake lock. No-op if not active. */
  release(): void;
  /** Acquire the screen wake lock. No-op if already active or unsupported. */
  request(): void;
}

export interface FullscreenState {
  /** Whether an element is currently shown fullscreen. */
  readonly active: boolean;
  /** Whether the Fullscreen API is available in this environment. */
  readonly supported: boolean;
}

/**
 * A sentinel-backed fullscreen view. `request()` enters fullscreen for an element (default:
 * the document element), `exit()` leaves it, `toggle()` flips it. All degrade silently when
 * the API is missing or the browser refuses. Disposing the sentinel exits fullscreen.
 */
export interface FullscreenSentinel extends Sentinel<FullscreenState> {
  /** Leave fullscreen. No-op when not active. */
  exit(): void;
  /** Enter fullscreen for `element` (default: the document element). No-op when already active or unsupported. */
  request(element?: Element): void;
  /** Flip fullscreen for `element` (default: the document element). */
  toggle(element?: Element): void;
}
