import { computed, signal } from '@vielzeug/ripple';
import { courier, getUsers } from './api';
import { seedUsers } from './seed-data';
import type { User } from './types';

const usersKey = ['users'] as const;
const usersDefinition = {
  fetch: () => getUsers(),
  key: usersKey,
  staleTime: 60_000,
};

courier.queries.set(usersKey, seedUsers);

export const usersSignal = signal<User[]>(seedUsers);

courier.queries.subscribe(usersKey, () => {
  usersSignal.value = courier.queries.getSnapshot<User[]>(usersKey)?.data ?? seedUsers;
});
void courier.queries.fetch(usersDefinition);

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
