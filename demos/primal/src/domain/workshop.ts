import { canAffordRecipe, canCraftEquipment } from './campaign';
import type { Campaign, CampaignHunter, ForgeEquipment, Potion, ResourceId, WeaponClassId } from './types';

/**
 * What the workshop shelf shows about one recipe: where it stands for the selected hunter, and,
 * when it stands locked, why. Pure rules over campaign state: the composable maps the structural
 * lock reason onto catalog keys, keeping this module language-free like the rest of the domain.
 */
export type RecipeState = 'reference' | 'locked' | 'missing' | 'craftable' | 'owned' | 'equipped' | 'prepared';

/** Why a recipe is locked, as data: the UI fills in the localized element and class names. */
export type WorkshopLock =
  | { kind: 'awakened' }
  | { kind: 'class'; restriction: WeaponClassId }
  | { kind: 'element' }
  | { kind: 'expansion' }
  | { kind: 'level-above'; level: number }
  | { kind: 'level-below'; level: number };

/**
 * The forge gate for one piece, mirroring `unlockedEquipment`'s refusal order so the shelf's
 * lock chip and the craft command never disagree. `hunterClass` is the selected hunter's class;
 * pass `undefined` in codex mode, where no hunter is selected and class never locks. Awakened-set
 * legendaries are earned, not forged, so they never report a forge lock.
 */
export function equipmentLock(
  campaign: Campaign,
  entry: ForgeEquipment,
  hunterClass?: WeaponClassId,
): WorkshopLock | undefined {
  if (entry.type !== 'item' && entry.awakenedOnly) return { kind: 'awakened' };
  return forgeGate(campaign, entry, hunterClass);
}

/** The shared forge gate behind both the lock chip and the recipe state: level, element, class, expansion. */
function forgeGate(campaign: Campaign, entry: ForgeEquipment, hunterClass?: WeaponClassId): WorkshopLock | undefined {
  if (entry.level > campaign.forge.level) return { kind: 'level-above', level: entry.level };
  if (entry.level < campaign.forge.level) return { kind: 'level-below', level: campaign.forge.level };
  if (entry.element !== null && !campaign.forge.unlockedElementIds.includes(entry.element)) return { kind: 'element' };
  if (entry.type === 'weapon' && hunterClass !== undefined && entry.classRestriction !== hunterClass) {
    return { kind: 'class', restriction: entry.classRestriction };
  }
  if (!campaign.expansionIds.includes(entry.expansionId)) return { kind: 'expansion' };
  return undefined;
}

/** The herbalist gate for one potion: shelf level first, then the campaign's expansions. */
export function potionLock(campaign: Campaign, entry: Potion): WorkshopLock | undefined {
  if (entry.level > campaign.herbalist.level) return { kind: 'level-above', level: entry.level };
  if (entry.level < campaign.herbalist.level) return { kind: 'level-below', level: campaign.herbalist.level };
  if (!campaign.expansionIds.includes(entry.expansionId)) return { kind: 'expansion' };
  return undefined;
}

/** Where a forge recipe stands for one hunter: locked, worn, already crafted, payable, or short. */
export function equipmentRecipeState(
  campaign: Campaign,
  member: CampaignHunter,
  entry: ForgeEquipment,
  hunterClass?: WeaponClassId,
): RecipeState {
  if (forgeGate(campaign, entry, hunterClass)) return 'locked';
  if (Object.values(member.equipment).includes(entry.id)) return 'equipped';
  if (member.craftedEquipmentIds.includes(entry.id)) return 'owned';
  return canCraftEquipment(campaign, member.hunterId, entry.id) ? 'craftable' : 'missing';
}

/** Where a herbalist recipe stands for one hunter: locked, in the pouch, payable, or short. */
export function potionRecipeState(campaign: Campaign, member: CampaignHunter, entry: Potion): RecipeState {
  if (potionLock(campaign, entry)) return 'locked';
  if (member.potionInventoryIds.includes(entry.id)) return 'prepared';
  return canAffordRecipe(member.resources, entry.cost) ? 'craftable' : 'missing';
}

/**
 * The first trade the dialog can offer without asking: the earliest partner holding a different
 * resource of one the sender owns, within the same category. Pure partner scan: the dialog
 * prefills from it. `tradable` is the resources the trade dialog allows at all.
 */
export function suggestResourceTrade(
  hunters: CampaignHunter[],
  fromHunterId: string,
  tradable: ReadonlyArray<{ category: string; id: ResourceId }>,
): { offered: ResourceId; partner: string; requested: ResourceId } | undefined {
  const sender = hunters.find((hunter) => hunter.hunterId === fromHunterId);
  if (!sender) return undefined;
  const owned = tradable.filter((resource) => (sender.resources[resource.id] ?? 0) > 0);
  for (const partner of hunters) {
    if (partner.hunterId === fromHunterId) continue;
    for (const offered of owned) {
      const requested = tradable.find(
        (resource) =>
          resource.category === offered.category &&
          resource.id !== offered.id &&
          (partner.resources[resource.id] ?? 0) > 0,
      );
      if (requested) return { offered: offered.id, partner: partner.hunterId, requested: requested.id };
    }
  }
  return undefined;
}
