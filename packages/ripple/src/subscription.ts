import type { AsyncSubscription, CleanupFn, Subscription } from './types';

// ── SubscriptionImpl ────────────────────────────────────────────────────────
//
// [Symbol.dispose] delegates to dispose() instead of duplicating the logic.
// dispose() is idempotent — calling it twice is safe (fn_ set to null after first call).

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
// run() awaits the current in-flight run without stopping the effect.
// [Symbol.asyncDispose] stops the effect synchronously and then awaits full teardown.

export class AsyncSubscriptionImpl implements AsyncSubscription {
  private awaitDone_: () => Promise<void>;
  private getCurrentRun_: () => Promise<void> | null;
  private syncStop_: Subscription;
  private asyncDisposePromise_: Promise<void> | null = null;

  constructor(syncStop: Subscription, awaitDone: () => Promise<void>, getCurrentRun: () => Promise<void> | null) {
    this.awaitDone_ = awaitDone;
    this.getCurrentRun_ = getCurrentRun;
    this.syncStop_ = syncStop;
  }

  get disposed(): boolean {
    return this.syncStop_.disposed;
  }

  dispose(): void {
    this.syncStop_.dispose();
  }

  run(): Promise<void> {
    return this.getCurrentRun_() ?? Promise.resolve();
  }

  [Symbol.dispose](): void {
    this.dispose();
  }

  [Symbol.asyncDispose](): Promise<void> {
    if (this.asyncDisposePromise_ !== null) return this.asyncDisposePromise_;

    this.dispose();
    this.asyncDisposePromise_ = this.awaitDone_();

    return this.asyncDisposePromise_;
  }
}
