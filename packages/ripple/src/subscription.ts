import type { AsyncSubscription, CleanupFn, Subscription } from './types';

// ── SubscriptionImpl (R6, R7) ────────────────────────────────────────────────
//
// R6: [Symbol.dispose] delegates to dispose() instead of duplicating the logic.
// R7: dispose() is idempotent — calling it twice is safe (fn_ set to null after first call).

export class SubscriptionImpl implements Subscription {
  private fn_: CleanupFn | null;
  private disposed_ = false;

  constructor(fn: CleanupFn) {
    this.fn_ = fn;
  }

  get disposed(): boolean {
    return this.disposed_;
  }

  dispose(): void {
    if (this.disposed_) return;

    this.disposed_ = true;

    const fn = this.fn_!;

    this.fn_ = null;
    fn();
  }

  [Symbol.dispose](): void {
    this.dispose();
  }
}

// ── AsyncSubscriptionImpl ─────────────────────────────────────────────────────
//
// Wraps a synchronous stop handle + an async drain function.
// disposeAsync() stops the effect synchronously and then awaits full teardown.

export class AsyncSubscriptionImpl implements AsyncSubscription {
  private awaitDone_: () => Promise<void>;
  private syncStop_: Subscription;
  private disposeAsyncPromise_: Promise<void> | null = null;

  constructor(syncStop: Subscription, awaitDone: () => Promise<void>) {
    this.awaitDone_ = awaitDone;
    this.syncStop_ = syncStop;
  }

  get disposed(): boolean {
    return this.syncStop_.disposed;
  }

  dispose(): void {
    this.syncStop_.dispose();
  }

  disposeAsync(): Promise<void> {
    if (this.disposeAsyncPromise_ !== null) return this.disposeAsyncPromise_;

    this.dispose();
    this.disposeAsyncPromise_ = this.awaitDone_();

    return this.disposeAsyncPromise_;
  }

  [Symbol.dispose](): void {
    this.dispose();
  }
}
