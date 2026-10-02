import { type ComputedRef, computed } from 'vue';
import { loadouts } from '../../app/store';
import { useReadable } from '../../app/vue-bridge';
import { hunterById } from '../../content';
import { type BuildAvailability, buildAvailability, type DeckContext, sameBuild } from '../../domain/deck';
import type { Hunter, HunterLoadout, HuntSubject } from '../../domain/types';

/**
 * One of a hunter's saved builds, judged against what its mode can supply. Unavailable builds
 * stay selectable with their missing pieces listed: the dialog explains instead of hiding.
 */
export interface PartyBuildOption {
  availability: BuildAvailability;
  /** The board already wears this exact build. */
  equipped: boolean;
  loadout: HunterLoadout;
  missing: number;
}

/** One party hunter and their saved builds, newest first: the row the party load dialog picks from. */
export interface PartyBuildRow {
  hunter: Hunter;
  options: PartyBuildOption[];
}

/**
 * The whole party's saved builds, one row per hunter. The context factory arrives per view :
 * each mode supplies its own deck context, so the verdicts stay mode-generic.
 */
export function usePartyBuilds<S extends HuntSubject>(
  subject: () => S | undefined,
  contextFor: (subject: S, member: S['hunters'][number], hunter: Hunter) => DeckContext,
): ComputedRef<PartyBuildRow[]> {
  const saved = useReadable(loadouts);
  return computed(() => {
    const current = subject();
    if (!current) return [];
    return current.hunters.flatMap((member) => {
      const hunter = hunterById(member.hunterId);
      if (!hunter) return [];
      const options = saved.value
        .filter((entry) => entry.hunterId === member.hunterId)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        .map((loadout) => {
          const availability = buildAvailability(loadout, contextFor(current, member, hunter));
          return {
            availability,
            equipped: sameBuild(loadout, member),
            loadout,
            missing:
              availability.missingCardIds.length +
              availability.missingEquipmentIds.length +
              availability.missingPotionIds.length,
          };
        });
      return [{ hunter, options }];
    });
  });
}
