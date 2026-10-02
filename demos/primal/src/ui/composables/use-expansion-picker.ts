/**
 * Shared logic for both expansion pickers: the Settings page's illustrated cards
 * (`ExpansionPicker`) and the setup dialog's switch rows (`ExpansionSwitchList`).
 * They differ only in markup; grouping, core handling and toggling live here.
 */
import { computed } from 'vue';
import { t } from '../../app/i18n';
import { expansions } from '../../content';
import type { ExpansionId } from '../../domain/types';

/** The always-included core box, stated once above the optional families. */
export const coreExpansion = expansions.find((expansion) => expansion.required)!;

/** The optional boxes grouped by what they add, in catalog order within each family. */
export const expansionFamilies = computed(() => {
  const order = ['monsters', 'hunters', 'biomes'] as const;
  const groups = new Map<(typeof order)[number], typeof expansions>(order.map((family) => [family, []]));
  for (const expansion of expansions) {
    if (expansion.required) continue;
    groups.get(expansion.family as (typeof order)[number])!.push(expansion);
  }
  return order
    .map((family) => ({ expansions: groups.get(family)!, label: t(`expansionPicker.family.${family}`) }))
    .filter((group) => group.expansions.length > 0);
});

/** Immutably add or remove one optional expansion from the selected set. */
export function toggleExpansion(selected: ExpansionId[], id: ExpansionId, checked: boolean): ExpansionId[] {
  const without = selected.filter((entry) => entry !== id);
  return checked ? [...without, id] : without;
}
