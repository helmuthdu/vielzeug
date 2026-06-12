import type { BeforeLeaveBlocker, NavigationDestination } from './types';

/**
 * A registered leave guard. `routes` scopes the guard to navigations that depart from
 * any route whose name appears in the array (matched against any node in the active branch,
 * not just the leaf). When `routes` is omitted the guard fires on every navigation.
 */
export type RegisteredBlocker = {
  handler: BeforeLeaveBlocker;
  routes?: string[];
};

/**
 * Run all registered leave blockers in registration order.
 * Guards whose `routes` filter does not overlap the current active match names are skipped.
 * Returns `false` as soon as any blocker returns `false`; returns `true` if all pass.
 *
 * A snapshot of the blocker set is taken before iteration so that guards added or removed
 * during execution do not affect the current run.
 *
 * R4: `destination` is passed to each blocker so guards can make context-aware decisions.
 */
export async function runLeaveBlockers(
  blockers: ReadonlySet<RegisteredBlocker>,
  activeMatchNames: readonly string[],
  destination: NavigationDestination,
): Promise<boolean> {
  const activeNames = new Set(activeMatchNames);
  // Snapshot so that removals during iteration don't skip entries.
  const snapshot = [...blockers];

  for (const { handler, routes } of snapshot) {
    if (routes !== undefined && !routes.some((name) => activeNames.has(name))) continue;

    const allowed = await handler(destination);

    if (!allowed) return false;
  }

  return true;
}
