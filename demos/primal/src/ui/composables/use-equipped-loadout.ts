import { type ComputedRef, computed } from 'vue';
import { findMatchingLoadout, loadouts } from '../../app/store';
import { useReadable } from '../../app/vue-bridge';
import type { BoardBuild, HunterLoadout } from '../../domain/types';

/**
 * The saved build the selected hunter currently wears: the match all four party boards share.
 * Reads the loadout signal through `useReadable` so the match re-runs when the library changes.
 */
export function useEquippedLoadout(
  member: () => (BoardBuild & { hunterId: string }) | undefined,
): ComputedRef<HunterLoadout | undefined> {
  const saved = useReadable(loadouts);
  return computed(() => {
    const current = member();
    return current ? findMatchingLoadout(saved.value, current.hunterId, current) : undefined;
  });
}
