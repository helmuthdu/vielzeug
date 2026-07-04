/**
 * Node compatibility helper: `unref()`s a timer so a pending per-task timeout/watchdog does not
 * keep a Node event loop (e.g. a Worker polyfill) alive. Browsers return a plain number from
 * `setTimeout`/`setInterval`, so this is a no-op there.
 *
 * Not part of the public API surface.
 */
export function unrefTimer(timer: ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>): void {
  if (typeof timer === 'object' && timer !== null && 'unref' in timer) {
    (timer as { unref(): void }).unref();
  }
}
