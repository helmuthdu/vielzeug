/* ============================================
   permit — Role-based permission engine
   ============================================ */

import { ANONYMOUS, WILDCARD } from './constants';

/* -------------------- Helpers -------------------- */

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Yields the effective roles for a user in resolution order (BFS over the hierarchy),
 * followed by WILDCARD. Anonymous users yield ANONYMOUS + WILDCARD only.
 */
function* getEffectiveRoles(
  user: import('./types').BaseUser | null | undefined,
  hierarchy: Map<string, Set<string>>,
): Generator<string> {
  if (!user?.id || !Array.isArray(user.roles)) {
    yield ANONYMOUS;
    yield WILDCARD;

    return;
  }

  const seen = new Set<string>();
  const queue: string[] = user.roles.map(normalize);

  for (let i = 0; i < queue.length; i++) {
    const role = queue[i] as string;

    if (seen.has(role)) continue;

    seen.add(role);
    yield role;

    for (const parent of hierarchy.get(role) ?? []) {
      if (!seen.has(parent)) queue.push(parent);
    }
  }

  yield WILDCARD;
}

/* -------------------- Standalone Utilities -------------------- */

/**
 * Returns true if the user has the given role (case-insensitive).
 * Treats a null / missing-id / missing-roles user as `anonymous`.
 */
export function hasRole(user: import('./types').BaseUser | null | undefined, role: string): boolean {
  if (!user?.id || !Array.isArray(user.roles)) return normalize(role) === ANONYMOUS;

  return user.roles.some((r) => normalize(r) === normalize(role));
}

/** Returns true if the user is unauthenticated (null, missing id, or missing roles). */
export function isAnonymous(user: import('./types').BaseUser | null | undefined): boolean {
  return !user?.id || !Array.isArray(user.roles);
}

// Internal helpers (not part of public API)
export { getEffectiveRoles, normalize };
