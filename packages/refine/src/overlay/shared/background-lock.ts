/**
 * Shared background-lock utility for overlay components (dialog, drawer, etc.).
 *
 * Uses a reference count so that multiple stacked overlays each call
 * lock / unlock independently without interfering with each other. The `inert`
 * attribute is applied once when the first overlay opens and removed once the
 * last one closes.
 *
 * The factory pattern (`createBackgroundLock`) provides test-isolated instances.
 * The module-level `lockBackground` / `unlockBackground` are the defaults used
 * by all runtime components.
 */

export type BackgroundLock = {
  lock(host: Element): void;
  unlock(): void;
};

export function createBackgroundLock(): BackgroundLock {
  let lockCount = 0;
  let lockedEls: Element[] = [];

  return {
    lock(host: Element): void {
      if (lockCount === 0) {
        let ancestor: Element = host;

        while (ancestor.parentElement && ancestor.parentElement !== document.body) {
          ancestor = ancestor.parentElement;
        }

        lockedEls = Array.from(document.body.children).filter((el) => el !== ancestor && !el.hasAttribute('inert'));

        for (const el of lockedEls) el.setAttribute('inert', '');
      }

      lockCount++;
    },

    unlock(): void {
      lockCount = Math.max(0, lockCount - 1);

      if (lockCount === 0) {
        for (const el of lockedEls) el.removeAttribute('inert');
        lockedEls = [];
      }
    },
  };
}

const _default = createBackgroundLock();

/** Marks sibling elements as inert. Safe to call from multiple concurrent overlays. */
export const lockBackground = (host: Element): void => _default.lock(host);

/** Releases the background lock. Removes inert when all overlays have closed. */
export const unlockBackground = (): void => _default.unlock();
