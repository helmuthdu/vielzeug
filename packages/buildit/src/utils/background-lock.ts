/**
 * Shared background-lock utility for overlay components (dialog, drawer, etc.).
 *
 * Uses a reference count so that multiple stacked overlays each call
 * lockBackground / unlockBackground independently without interfering with
 * each other.  The `inert` attribute is applied once when the first overlay
 * opens and removed once the last one closes.
 */

let lockCount = 0;
let lockedEls: Element[] = [];

/**
 * Marks all `document.body` children except the direct ancestor of `host` as
 * `inert`.  Safe to call from multiple overlays at once — only the first call
 * actually mutates the DOM.
 */
export function lockBackground(host: Element): void {
  if (lockCount === 0) {
    let ancestor: Element = host;

    while (ancestor.parentElement && ancestor.parentElement !== document.body) {
      ancestor = ancestor.parentElement;
    }

    lockedEls = Array.from(document.body.children).filter((el) => el !== ancestor && !el.hasAttribute('inert'));

    for (const el of lockedEls) el.setAttribute('inert', '');
  }

  lockCount++;
}

/**
 * Decrements the lock count.  When it reaches zero, removes `inert` from all
 * elements that were locked by `lockBackground`.
 */
export function unlockBackground(): void {
  lockCount = Math.max(0, lockCount - 1);

  if (lockCount === 0) {
    for (const el of lockedEls) el.removeAttribute('inert');
    lockedEls = [];
  }
}
