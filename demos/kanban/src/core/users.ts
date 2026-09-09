import { computed, resource } from '@vielzeug/ripple';
import { getUsers } from './api';
import { seedUsers } from './seed-data';
import type { User } from './types';

/**
 * Reactive user directory. The reactive/async split mirrors how the pieces now compose:
 * `@vielzeug/ripple`'s `resource()` owns the async state lifecycle (pending → success/error,
 * with `previous` retention across reloads), while `@vielzeug/courier`'s opt-in read cache (see
 * api.ts's `getUsers`) owns HTTP request dedup + TTL. The loader takes no reactive source deps,
 * so it runs once on creation; `usersResource.reload()` re-fetches through the same cached path.
 */
const usersResource = resource(
  () => null,
  () => getUsers(),
);

/**
 * The user list as a plain reactive value: seed data while pending or on error, the fetched
 * directory on success. Consumers (task-dialog, task-card, backlog) read this rather than the
 * resource's `AsyncState` shape, so the courier/ripple split stays an internal detail.
 */
export const usersSignal = computed<User[]>(() => {
  const state = usersResource.value;

  return state.status === 'success' ? state.value : seedUsers;
});

export const userMap = computed(() => new Map(usersSignal.value.map((user) => [user.id, user])));

/** Up-to-2-letter initials from a display name, e.g. "Alice Chen" → "AC". */
export function initialsFromName(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

/** Up-to-2-letter initials for a user id, falling back to the id itself if unknown. */
export function userInitials(id: string): string {
  return initialsFromName(userMap.value.get(id)?.name ?? id);
}
