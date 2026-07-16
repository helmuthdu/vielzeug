import type { QueryState } from '@vielzeug/courier';

/**
 * Reactive user directory — the one place this app fetches "the user list", chained through
 * three packages so each does the job it's built for: `@vielzeug/courier`'s query cache fetches
 * and caches the mock `/api/users` response, `@vielzeug/flux`'s `fromQuery` adapts its
 * `SyncStore` into a stream, and `@vielzeug/ripple`'s `toSignal` lands that stream as a reactive
 * signal every view below can read. `userInitials()`/`userMap` are exported from here too so the
 * lookup logic exists in exactly one place instead of being copy-pasted per view.
 */
import { fromQuery, toSignal } from '@vielzeug/flux';
import { computed } from '@vielzeug/ripple';

import type { User } from './types';

import { courier, getUsers } from './api';
import { seedUsers } from './seed-data';

const usersStore = courier.query.observe<User[]>({
  fn: () => getUsers(),
  initialData: () => seedUsers,
  key: ['users'],
  staleTime: 60_000,
});

const usersBinding = toSignal(fromQuery<QueryState<User[]>>(usersStore), { initial: usersStore.peek() });

export const usersSignal = computed<User[]>(() => usersBinding.value.data ?? seedUsers);

export const userMap = computed(() => new Map(usersSignal.value.map((u) => [u.id, u])));

/** Up-to-2-letter initials from a display name, e.g. "Alice Chen" → "AC". */
export function initialsFromName(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

/** Up-to-2-letter initials for a user id, falling back to the id itself if unknown. */
export function userInitials(id: string): string {
  return initialsFromName(userMap.value.get(id)?.name ?? id);
}
