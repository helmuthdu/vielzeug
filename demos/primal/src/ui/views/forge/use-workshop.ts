import { computed, onBeforeUnmount, reactive, ref, type UnwrapNestedRefs, watch } from 'vue';
import { asset } from '../../../app/assets';
import { t } from '../../../app/i18n';
import { campaigns, runCommand } from '../../../app/store';
import { useReadable, useRouteParams } from '../../../app/vue-bridge';
import {
  expansions,
  forgeById,
  forgeElementLabel,
  forgeEquipment,
  forgeTypeLabel,
  hunterById,
  potions,
  resources,
  weaponClassById,
} from '../../../content';
import {
  applyEquipmentCraftPayment,
  type CraftRequirement,
  type CraftTender,
  canAffordRecipe,
  canCraftEquipment,
  craftTenderOptions,
  type EquipmentCraftPayment,
  equipmentCraftCost,
  equipmentCraftPaymentErrors,
  equipmentCraftRequirements,
  equipmentUpgradeSource,
  exactEquipmentCraftPayment,
  recipeCostOptions,
} from '../../../domain/campaign';
import type {
  CampaignHunter,
  ElementId,
  EquipmentSlot,
  ExpansionId,
  ForgeEquipment,
  Potion,
  PotionCategory,
  RecipeCost,
  ResourceBundle,
  ResourceId,
  SubjectRef,
  WeaponDamage,
} from '../../../domain/types';
import {
  equipmentLock,
  equipmentRecipeState,
  potionLock,
  potionRecipeState,
  type RecipeState,
  suggestResourceTrade,
  type WorkshopLock,
} from '../../../domain/workshop';

export type WorkshopMode = 'forge' | 'herbalist';
export type EquipmentSlotFilter = 'all' | EquipmentSlot;
export type PotionCategoryFilter = 'all' | PotionCategory;

/** The herbalist shelf's category tabs, in display order. */
export const potionCategories = [
  'healing',
  'offense',
  'defense',
  'utility',
] as const satisfies readonly PotionCategory[];
export type WorkshopScope = 'craftable' | 'owned' | 'all';
export type RecipeEntry = ForgeEquipment | Potion;
export type WorkshopAction = { entry: ForgeEquipment; kind: 'craft' } | { entry: Potion; kind: 'prepare' };

export interface ShelfItem {
  entries: RecipeEntry[];
  entry: RecipeEntry;
  key: string;
  name: string;
  state: RecipeState;
  upgradeAvailable: boolean;
}

export interface PaymentSummary {
  available: number;
  id: ResourceId;
  name: string;
  remaining: number;
  shortage: number;
  spent: number;
}

interface RecipeFamily<T extends RecipeEntry> {
  entries: T[];
  expansionId: ExpansionId;
  key: string;
  name: string;
}

export const equipmentSlots = ['weapon', 'armor', 'helm', 'item'] as const satisfies readonly EquipmentSlot[];
export const elements = resources.filter((entry) => entry.category === 'element');
const materials = resources.filter((entry) => entry.category === 'material');
export const plants = resources.filter((entry) => entry.category === 'plant');
const tradableResources = [...elements, ...materials];
const resourceById = (id: ResourceId | '') => resources.find((resource) => resource.id === id);

export const isEquipment = (entry: RecipeEntry): entry is ForgeEquipment => 'type' in entry;

function families<T extends RecipeEntry>(entries: T[], keyFor: (entry: T) => string): RecipeFamily<T>[] {
  const groups = new Map<string, RecipeFamily<T>>();
  for (const entry of entries) {
    const key = keyFor(entry);
    const family = groups.get(key) ?? { entries: [], expansionId: entry.expansionId, key, name: entry.name };
    family.entries.push(entry);
    groups.set(key, family);
  }
  return [...groups.values()].map((family) => ({
    ...family,
    entries: family.entries.sort((left, right) => left.level - right.level),
  }));
}

// Reward items are quest grants, never forgeable: the codex lists only craftable pieces.
const equipmentFamilies = families(
  forgeEquipment.filter((entry) => entry.type !== 'item' || !entry.rewardOnly),
  (entry) => `${entry.expansionId}:${entry.familyId}`,
);
// Reward potions are quest grants, never preparable: the same rule as reward items.
const potionFamilies = families(
  potions.filter((entry) => !entry.rewardOnly),
  (entry) => `${entry.expansionId}:${entry.name}`,
);

const tenderValue = (tender: CraftTender): string =>
  tender.kind === 'equipment' ? `equipment:${tender.equipmentId}` : `resources:${tender.resourceIds.join('+')}`;

/**
 * The complete workshop screen as one reactive view model: route and hunter selection,
 * the recipe shelf, the detail pane, the craft/prepare payment flow, and the trade dialog.
 * ForgeView calls this once and hands the model to its child components as a single prop.
 */
function createWorkshop() {
  const params = useRouteParams();
  const allCampaigns = useReadable(campaigns);
  const campaignId = computed(() => params.value.id);
  const campaign = computed(() => allCampaigns.value.find((entry) => entry.id === campaignId.value));
  const campaignRoute = computed(() => campaignId.value !== undefined);
  const selectedHunterId = ref('');
  const selectedMember = computed<CampaignHunter | undefined>(() => {
    const current = campaign.value;
    if (!current) return undefined;
    return current.hunters.find((hunter) => hunter.hunterId === selectedHunterId.value) ?? current.hunters[0];
  });
  const selectedHunter = computed(() => (selectedMember.value ? hunterById(selectedMember.value.hunterId) : undefined));
  const mode = ref<WorkshopMode>('forge');
  const slot = ref<EquipmentSlotFilter>('all');
  const potionCategory = ref<PotionCategoryFilter>('all');
  const scope = ref<WorkshopScope>('craftable');
  const codexMode = ref(!campaignRoute.value);
  const query = ref('');
  const elementFilter = ref<'all' | ElementId>('all');
  const expansionFilter = ref<'all' | ExpansionId>('all');
  const selectedFamilyKey = ref('');
  const selectedLevel = ref(1);
  const mobileDetail = ref(false);
  const zoomedArt = ref<{ name: string; src: string } | null>(null);
  const pendingAction = ref<WorkshopAction | null>(null);
  const paymentDraft = ref<ResourceBundle>({});
  const craftPaymentDraft = ref<EquipmentCraftPayment>({ allocations: {} });
  const trading = ref(false);
  const tradeToHunterId = ref('');
  const offeredResourceId = ref<ResourceId | ''>('');
  const requestedResourceId = ref<ResourceId | ''>('');
  const equipAfterCraft = ref(true);
  const craftingPulse = ref('');
  let pulseTimer: number | undefined;

  const mastheadArt = computed(() =>
    mode.value === 'forge' ? '/backgrounds/bg_forge.webp' : '/backgrounds/bg_herbalist.webp',
  );
  const mastheadTitle = computed(() => t(mode.value === 'forge' ? 'forge.forgeTitle' : 'forge.herbalistTitle'));
  const mastheadSubtitle = computed(() =>
    t(mode.value === 'forge' ? 'forge.forgeSubtitle' : 'forge.herbalistSubtitle'),
  );
  const resourceCount = (id: ResourceId) => selectedMember.value?.resources[id] ?? 0;
  const availablePlants = () => plants.reduce((total, plant) => total + resourceCount(plant.id), 0);
  const anyPlantCost = (cost: RecipeCost | null) => (cost && 'anyPlants' in cost ? cost.anyPlants : null);
  const displayedCost = (cost: RecipeCost | null): ResourceBundle => recipeCostOptions(cost)[0] ?? {};
  const recipeIcon = (entry: RecipeEntry): string => {
    if (!isEquipment(entry)) return '/icons/icon_potion.svg';
    if (entry.type === 'weapon' && entry.classRestriction) return weaponClassById(entry.classRestriction).icon;
    return `/icons/icon_${entry.type === 'helm' ? 'helmet' : entry.type}.svg`;
  };
  const damageLabel = (damage: WeaponDamage | null | undefined) => {
    if (damage === null || damage === undefined) return 'N/A';
    return Array.isArray(damage)
      ? t('forge.damageNormalPiercing', { normal: damage[0], piercing: damage[1] })
      : String(damage);
  };
  const expansionName = (id: ExpansionId) => expansions.find((entry) => entry.id === id)?.name ?? id;
  const discipline = (entry: ForgeEquipment) =>
    entry.type === 'weapon' && entry.classRestriction
      ? weaponClassById(entry.classRestriction).name
      : forgeElementLabel(entry.element);

  function equipmentState(entry: ForgeEquipment): RecipeState {
    const current = campaign.value;
    const member = selectedMember.value;
    if (!current || !member) return 'reference';
    return equipmentRecipeState(current, member, entry, selectedHunter.value?.classId);
  }

  function potionState(entry: Potion): RecipeState {
    const current = campaign.value;
    const member = selectedMember.value;
    if (!current || !member) return 'reference';
    return potionRecipeState(current, member, entry);
  }

  const entryState = (entry: RecipeEntry) => (isEquipment(entry) ? equipmentState(entry) : potionState(entry));
  const potionCategoryLabel = (category: PotionCategory): string =>
    t(
      category === 'healing'
        ? 'forge.potionHealing'
        : category === 'offense'
          ? 'forge.potionOffense'
          : category === 'defense'
            ? 'forge.potionDefense'
            : 'forge.potionUtility',
    );
  const stateLabel = computed<Record<RecipeState, string>>(() => ({
    craftable: t('forge.stateCraftable'),
    equipped: t('forge.stateEquipped'),
    locked: t('forge.stateLocked'),
    missing: t('forge.stateMissing'),
    owned: t('forge.stateOwned'),
    prepared: t('forge.statePrepared'),
    reference: t('forge.stateCodex'),
  }));
  const stateColor = (state: RecipeState): 'primary' | 'success' | 'warning' => {
    if (state === 'craftable') return 'success';
    if (state === 'locked' || state === 'missing') return 'warning';
    return 'primary';
  };
  const stateRank: Record<RecipeState, number> = {
    craftable: 0,
    equipped: 1,
    locked: 4,
    missing: 3,
    owned: 2,
    prepared: 2,
    reference: 5,
  };

  /** Short localized cause shown where an item is locked: the shelf chip and detail footer. */
  const lockReason = (entry: RecipeEntry): string => {
    const current = campaign.value;
    if (!current) return '';
    const lock: WorkshopLock | undefined = isEquipment(entry)
      ? equipmentLock(current, entry, selectedHunter.value?.classId)
      : potionLock(current, entry);
    if (!lock) return '';
    switch (lock.kind) {
      case 'awakened':
        return t('forge.lockAwakenedSet');
      case 'class':
        return t('forge.lockClass', { class: weaponClassById(lock.restriction).name });
      case 'element':
        return t('forge.lockElement', { element: forgeElementLabel((entry as ForgeEquipment).element) });
      case 'expansion':
        return t('forge.lockExpansion');
      case 'level-above':
        return isEquipment(entry)
          ? t('forge.lockForgeLevel', { level: lock.level })
          : t('forge.lockHerbalistLevel', { level: lock.level });
      case 'level-below':
        return isEquipment(entry)
          ? t('forge.lockForgeBelow', { level: lock.level })
          : t('forge.lockHerbalistBelow', { level: lock.level });
    }
  };

  /** Seat-badge answer: can the given hunter pay for (and legally craft) the selected recipe? */
  const seatCanCraft = (hunterId: string): boolean => {
    const entry = selectedEntry.value;
    const current = campaign.value;
    if (!entry || !current) return false;
    if (isEquipment(entry)) return canCraftEquipment(current, hunterId, entry.id);
    const member = current.hunters.find((hunter) => hunter.hunterId === hunterId);
    return member ? canAffordRecipe(member.resources, entry.cost) : false;
  };

  function preferredLevel(): number {
    if (!campaign.value) return 1;
    return mode.value === 'forge' ? campaign.value.forge.level : campaign.value.herbalist.level;
  }

  function displayEntry<T extends RecipeEntry>(entries: T[]): T {
    const level = preferredLevel();
    return entries.find((entry) => entry.level === level) ?? entries[0];
  }

  const shelfItems = computed<ShelfItem[]>(() => {
    const search = query.value.trim().toLowerCase();
    const source: ShelfItem[] =
      mode.value === 'forge'
        ? equipmentFamilies
            .filter((family) => slot.value === 'all' || family.entries[0]?.type === slot.value)
            .map((family) => {
              const entry = displayEntry(family.entries);
              return {
                entries: family.entries,
                entry,
                key: family.key,
                name: family.name,
                state: equipmentState(entry),
                upgradeAvailable: Boolean(equipmentUpgradeSource(entry, selectedMember.value)),
              };
            })
        : potionFamilies
            .filter((family) => potionCategory.value === 'all' || family.entries[0]?.category === potionCategory.value)
            .map((family) => {
              const entry = displayEntry(family.entries);
              return {
                entries: family.entries,
                entry,
                key: family.key,
                name: family.name,
                state: potionState(entry),
                upgradeAvailable: false,
              };
            });
    return source
      .filter((item) => {
        if (!codexMode.value && item.state === 'locked' && scope.value !== 'all') return false;
        if (!codexMode.value && scope.value === 'craftable' && item.state !== 'craftable') return false;
        if (!codexMode.value && scope.value === 'owned' && !['owned', 'equipped', 'prepared'].includes(item.state))
          return false;
        if (codexMode.value && search && !`${item.name} ${item.entry.description}`.toLowerCase().includes(search))
          return false;
        if (codexMode.value && expansionFilter.value !== 'all' && item.entry.expansionId !== expansionFilter.value)
          return false;
        if (codexMode.value && mode.value === 'forge' && elementFilter.value !== 'all') {
          if (!isEquipment(item.entry) || item.entry.element !== elementFilter.value) return false;
        }
        return true;
      })
      .sort((left, right) => stateRank[left.state] - stateRank[right.state] || left.name.localeCompare(right.name));
  });

  const shelfGroups = computed(() => {
    if (codexMode.value || scope.value !== 'all') {
      return [
        {
          items: shelfItems.value,
          label: codexMode.value ? t('forge.codex') : stateLabel.value[shelfItems.value[0]?.state ?? 'reference'],
        },
      ];
    }
    const groups: Array<{ label: string; states: RecipeState[] }> = [
      { label: t('forge.readyToCraft'), states: ['craftable'] },
      { label: t('forge.owned'), states: ['owned', 'equipped', 'prepared'] },
      { label: t('forge.missing'), states: ['missing'] },
      { label: t('forge.lockedGroup'), states: ['locked'] },
    ];
    return groups
      .map((group) => ({
        items: shelfItems.value.filter((item) => group.states.includes(item.state)),
        label: group.label,
      }))
      .filter((group) => group.items.length);
  });

  const selectedItem = computed(
    () => shelfItems.value.find((item) => item.key === selectedFamilyKey.value) ?? shelfItems.value[0],
  );
  const selectedEntry = computed(() => {
    const item = selectedItem.value;
    return item?.entries.find((entry) => entry.level === selectedLevel.value) ?? item?.entry;
  });
  const selectedCost = computed(() => {
    const entry = selectedEntry.value;
    return entry && isEquipment(entry) ? equipmentCraftCost(entry, selectedMember.value) : (entry?.cost ?? null);
  });
  const selectedUpgradeSource = computed(() => {
    const entry = selectedEntry.value;
    return entry && isEquipment(entry) ? equipmentUpgradeSource(entry, selectedMember.value) : undefined;
  });
  const selectedState = computed(() => (selectedEntry.value ? entryState(selectedEntry.value) : 'reference'));

  // The payment panel lives inline in the detail pane; navigating to another recipe or level
  // while a payment is drafted closes it: the exact prefill makes redoing it one tap.
  watch(
    () => selectedEntry.value?.id,
    (id, previous) => {
      if (previous !== undefined && pendingAction.value && pendingAction.value.entry.id !== id) {
        pendingAction.value = null;
      }
    },
  );
  const currentEquipment = computed(() => {
    const entry = selectedEntry.value;
    if (!entry || !isEquipment(entry)) return undefined;
    const id = selectedMember.value?.equipment[`${entry.type}Id`];
    return id ? forgeById(id) : undefined;
  });
  /**
   * Pouch rows for the tray: owned resources grouped by game category, with the drafted payment
   * applied live (spent) and required-but-unowned resources of the recipe in play shown at zero
   * so the wallet reads as a planning board, not a receipt.
   */
  const walletGroups = computed(() => {
    const spentMap = new Map<ResourceId, number>();
    for (const summary of [...paymentResourceSummary.value, ...potionResourceSummary.value]) {
      if (summary.spent > 0) spentMap.set(summary.id, (spentMap.get(summary.id) ?? 0) + summary.spent);
    }
    const cost = pendingCost.value ?? selectedCost.value;
    // With no drafted payment, preview the selected recipe's cost on selection so the pouch
    // answers "what would this cost me?" before the craft button is pressed. Wildcard
    // (any-plant) costs stay unpreviewed: only the payment drawer can allocate those.
    if (!pendingAction.value && cost && !('anyPlants' in cost)) {
      for (const [id, amount] of Object.entries(displayedCost(cost))) {
        spentMap.set(id as ResourceId, (spentMap.get(id as ResourceId) ?? 0) + amount);
      }
    }
    const required = new Set(cost && !('anyPlants' in cost) ? Object.keys(displayedCost(cost)) : []);
    return (['element', 'material', 'plant'] as const)
      .map((category) => ({
        category,
        items: resources
          .filter((resource) => resource.category === category)
          .flatMap((resource) => {
            const count = selectedMember.value?.resources[resource.id] ?? 0;
            if (count === 0 && !required.has(resource.id)) return [];
            return [{ count, id: resource.id, spent: Math.min(count, spentMap.get(resource.id) ?? 0) }];
          }),
      }))
      .filter((group) => group.items.length > 0);
  });
  const activeWorkshopLevel = computed(() =>
    mode.value === 'forge' ? campaign.value?.forge.level : campaign.value?.herbalist.level,
  );
  const pendingCost = computed(() => {
    const action = pendingAction.value;
    if (!action) return null;
    return action.kind === 'craft' ? equipmentCraftCost(action.entry, selectedMember.value) : action.entry.cost;
  });
  const pendingRequirements = computed(() => {
    const action = pendingAction.value;
    return action?.kind === 'craft' ? equipmentCraftRequirements(action.entry, selectedMember.value) : [];
  });
  const pendingUpgradeSource = computed(() => {
    const action = pendingAction.value;
    return action?.kind === 'craft' ? equipmentUpgradeSource(action.entry, selectedMember.value) : undefined;
  });
  const selectedPlantTotal = computed(() =>
    Object.values(paymentDraft.value).reduce((total, amount) => total + (amount ?? 0), 0),
  );
  const pendingDiscardedEquipment = computed(() =>
    [
      ...new Set([
        ...(pendingUpgradeSource.value ? [pendingUpgradeSource.value.id] : []),
        ...Object.values(craftPaymentDraft.value.allocations).flatMap((tender) =>
          tender.kind === 'equipment' ? [tender.equipmentId] : [],
        ),
      ]),
    ].flatMap((id) => {
      const equipment = forgeById(id);
      return equipment ? [equipment] : [];
    }),
  );
  const paymentResourceSummary = computed<PaymentSummary[]>(() => {
    const counts = new Map<ResourceId, number>();
    for (const tender of Object.values(craftPaymentDraft.value.allocations)) {
      if (tender.kind !== 'resources') continue;
      for (const id of tender.resourceIds) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return [...counts].map(([id, spent]) => {
      const available = resourceCount(id);
      return {
        available,
        id,
        name: resourceById(id)?.name ?? id,
        remaining: Math.max(0, available - spent),
        shortage: Math.max(0, spent - available),
        spent,
      };
    });
  });
  const potionResourceSummary = computed<PaymentSummary[]>(() =>
    (Object.entries(paymentDraft.value) as Array<[ResourceId, number]>).flatMap(([id, spent]) => {
      if (!spent) return [];
      const available = resourceCount(id);
      return [
        {
          available,
          id,
          name: resourceById(id)?.name ?? id,
          remaining: Math.max(0, available - spent),
          shortage: Math.max(0, spent - available),
          spent,
        },
      ];
    }),
  );
  const loadoutOutcome = computed(() => {
    const action = pendingAction.value;
    if (action?.kind !== 'craft') return '';
    if (equipAfterCraft.value) {
      return currentEquipment.value
        ? t('forge.replaces', { current: currentEquipment.value.name, name: action.entry.name })
        : t('forge.fillsSlot', { name: action.entry.name, slot: forgeTypeLabel(action.entry.type).toLowerCase() });
    }
    const emptied = Object.entries(selectedMember.value?.equipment ?? {}).flatMap(([key, id]) =>
      id && pendingDiscardedEquipment.value.some((equipment) => equipment.id === id)
        ? [forgeTypeLabel(key.replace(/Id$/, '') as EquipmentSlot)]
        : [],
    );
    return emptied.length ? t('forge.becomeEmpty', { slots: emptied.join(', ') }) : t('forge.loadoutUnchanged');
  });
  const craftPaymentErrors = computed(() => {
    const action = pendingAction.value;
    const member = selectedMember.value;
    return action?.kind === 'craft' && member
      ? equipmentCraftPaymentErrors(action.entry, member, craftPaymentDraft.value)
      : {};
  });
  const paymentValid = computed(() => {
    const action = pendingAction.value;
    const member = selectedMember.value;
    if (!action || !member || !pendingCost.value) return true;
    if (action.kind === 'craft') {
      try {
        applyEquipmentCraftPayment(action.entry, member, craftPaymentDraft.value);
        return true;
      } catch {
        return false;
      }
    }
    const cost = pendingCost.value;
    return 'anyPlants' in cost
      ? selectedPlantTotal.value === cost.anyPlants && canAffordRecipe(member.resources, paymentDraft.value)
      : canAffordRecipe(member.resources, cost);
  });
  const tradePartners = computed(
    () => campaign.value?.hunters.filter((hunter) => hunter.hunterId !== selectedMember.value?.hunterId) ?? [],
  );
  const tradeTarget = computed(() => tradePartners.value.find((hunter) => hunter.hunterId === tradeToHunterId.value));
  const offeredResources = computed(() =>
    tradableResources.filter((resource) => (selectedMember.value?.resources[resource.id] ?? 0) > 0),
  );
  const requestedResources = computed(() => {
    const category = resourceById(offeredResourceId.value)?.category;
    return tradableResources.filter(
      (resource) => resource.category === category && (tradeTarget.value?.resources[resource.id] ?? 0) > 0,
    );
  });
  const defaultTrade = computed(() => {
    const current = campaign.value;
    const member = selectedMember.value;
    if (!current || !member) return undefined;
    return suggestResourceTrade(current.hunters, member.hunterId, tradableResources);
  });
  const tradeValid = computed(
    () =>
      Boolean(tradeTarget.value && offeredResourceId.value && requestedResourceId.value) &&
      offeredResourceId.value !== requestedResourceId.value,
  );

  watch(
    () => campaign.value?.id,
    () => {
      selectedHunterId.value = campaign.value?.hunters[0]?.hunterId ?? '';
      codexMode.value = !campaign.value;
    },
    { immediate: true },
  );
  watch(
    shelfItems,
    (items) => {
      if (!items.some((item) => item.key === selectedFamilyKey.value)) {
        selectedFamilyKey.value = items[0]?.key ?? '';
        selectedLevel.value = items[0]?.entry.level ?? 1;
      }
    },
    { immediate: true },
  );
  watch([mode, slot, codexMode, query, elementFilter, expansionFilter, selectedHunterId], () => {
    mobileDetail.value = false;
  });

  function eventValue(event: Event): string {
    return (
      (event as CustomEvent<{ value: string }>).detail?.value ?? (event.target as HTMLElement & { value: string }).value
    );
  }

  function selectFamilyFromList(event: Event): void {
    const item = shelfItems.value.find((candidate) => candidate.key === eventValue(event));
    if (item) void selectFamily(item);
  }

  function selectFamily(item: ShelfItem): void {
    selectedFamilyKey.value = item.key;
    selectedLevel.value = item.entry.level;
    mobileDetail.value = true;
  }

  function changeMode(event: Event): void {
    const value = eventValue(event);
    if (value === 'forge' || value === 'herbalist') mode.value = value;
  }

  function changeSlot(event: Event): void {
    const value = eventValue(event);
    if (value === 'all' || equipmentSlots.includes(value as EquipmentSlot)) slot.value = value as EquipmentSlotFilter;
  }

  function changePotionCategory(event: Event): void {
    const value = eventValue(event);
    if (value === 'all' || potionCategories.includes(value as PotionCategory)) {
      potionCategory.value = value as PotionCategoryFilter;
    }
  }

  function changeScope(event: Event): void {
    const value = eventValue(event);
    if (value === 'craftable' || value === 'owned' || value === 'all') {
      scope.value = value;
      mobileDetail.value = false;
    }
  }

  function setCodexMode(open: boolean): void {
    codexMode.value = open;
    mobileDetail.value = false;
  }

  const subject = (id: string): SubjectRef => ({ id, kind: 'campaign' });

  const requirementLabel = (requirement: CraftRequirement): string =>
    `${requirement.kind === 'element' ? t('forge.requirementKindElement') : t('forge.requirementKindMaterial')} · ${resourceById(requirement.resourceId)?.name ?? requirement.resourceId}`;
  const paymentOptions = (requirement: CraftRequirement): CraftTender[] =>
    selectedMember.value
      ? craftTenderOptions(
          requirement,
          selectedMember.value,
          pendingUpgradeSource.value ? [pendingUpgradeSource.value.id] : [],
        )
      : [];
  const tenderOptionIcons = (tender: CraftTender): string[] | undefined => {
    if (tender.kind === 'equipment') {
      const piece = forgeById(tender.equipmentId);
      return piece ? [asset(recipeIcon(piece))] : undefined;
    }
    const icons = [...new Set(tender.resourceIds)]
      .map((id) => resourceById(id)?.icon)
      .filter((icon): icon is string => Boolean(icon))
      .map((icon) => asset(icon));
    return icons.length ? icons : undefined;
  };
  const allocatedResourceCount = (requirementId: string, resourceId: ResourceId): number =>
    Object.entries(craftPaymentDraft.value.allocations).reduce(
      (total, [id, tender]) =>
        id === requirementId || tender.kind === 'equipment'
          ? total
          : total + tender.resourceIds.filter((resource) => resource === resourceId).length,
      0,
    );
  const paymentOptionDisabled = (requirement: CraftRequirement, tender: CraftTender): boolean => {
    const selected = craftPaymentDraft.value.allocations[requirement.id];
    if (selected && tenderValue(selected) === tenderValue(tender)) return false;
    const action = pendingAction.value;
    const member = selectedMember.value;
    if (action?.kind !== 'craft' || !member) return true;
    const allocations = { ...craftPaymentDraft.value.allocations, [requirement.id]: tender };
    const candidateErrors = equipmentCraftPaymentErrors(action.entry, member, { allocations });
    return Object.keys(candidateErrors).some(
      (id) => id === requirement.id || (Boolean(allocations[id]) && !craftPaymentErrors.value[id]),
    );
  };
  const equipmentPaymentConsequence = (equipmentId?: string): string => {
    if (!equipmentId) return '';
    const slotKey = Object.entries(selectedMember.value?.equipment ?? {}).find(([, id]) => id === equipmentId)?.[0];
    if (!slotKey) return t('forge.equipmentReturned');
    const slotType = slotKey.replace(/Id$/, '') as EquipmentSlot;
    const action = pendingAction.value;
    return action?.kind === 'craft' && equipAfterCraft.value && action.entry.type === slotType
      ? t('forge.equippedConsequenceReplace', { name: action.entry.name })
      : t('forge.equippedConsequenceSlot', { slot: forgeTypeLabel(slotType).toLowerCase() });
  };

  function setTender(requirementId: string, tender: CraftTender | null): void {
    const allocations = { ...craftPaymentDraft.value.allocations };
    if (tender) allocations[requirementId] = tender;
    else delete allocations[requirementId];
    craftPaymentDraft.value = { allocations };
  }

  function cancelAction(): void {
    pendingAction.value = null;
  }

  function openTrade(): void {
    const selection = defaultTrade.value;
    tradeToHunterId.value = selection?.partner ?? '';
    offeredResourceId.value = selection?.offered ?? '';
    requestedResourceId.value = selection?.requested ?? '';
    trading.value = true;
  }

  function changeTradePartner(event: Event): void {
    tradeToHunterId.value = eventValue(event);
    requestedResourceId.value = '';
  }

  function changeOfferedResource(event: Event): void {
    offeredResourceId.value = eventValue(event) as ResourceId | '';
    requestedResourceId.value = '';
  }

  function confirmTrade(): void {
    const current = campaign.value;
    const member = selectedMember.value;
    if (!current || !member || !tradeToHunterId.value || !offeredResourceId.value || !requestedResourceId.value) return;
    const changed =
      runCommand(
        'tradeHunterResources',
        subject(current.id),
        member.hunterId,
        tradeToHunterId.value,
        offeredResourceId.value as ResourceId,
        requestedResourceId.value as ResourceId,
      ) !== undefined;
    if (changed) trading.value = false;
  }

  function requestAction(action: WorkshopAction): void {
    pendingAction.value = action;
    paymentDraft.value = action.kind === 'prepare' ? { ...displayedCost(action.entry.cost) } : {};
    if (action.kind === 'craft') {
      const exact = exactEquipmentCraftPayment(action.entry, selectedMember.value);
      craftPaymentDraft.value = {
        allocations: Object.fromEntries(
          equipmentCraftRequirements(action.entry, selectedMember.value).flatMap((requirement) => {
            const tender = exact.allocations[requirement.id];
            return tender && paymentOptions(requirement).some((option) => tenderValue(option) === tenderValue(tender))
              ? [[requirement.id, tender]]
              : [];
          }),
        ),
      };
    }
    equipAfterCraft.value = action.kind !== 'craft' || currentEquipment.value === undefined;
  }

  function adjustPlant(id: ResourceId, delta: number): void {
    const limit = resourceCount(id);
    const next = Math.min(limit, Math.max(0, (paymentDraft.value[id] ?? 0) + delta));
    paymentDraft.value = { ...paymentDraft.value, [id]: next };
  }

  /**
   * Confirm button copy for the pending action. Escalates when the payment discards equipment
   * so the button itself names the irreversible part, not just the label string on a chip.
   */
  const confirmLabel = computed(() => {
    const action = pendingAction.value;
    if (!action) return '';
    const verb =
      action.kind === 'prepare'
        ? t('forge.confirmLabelPrepare')
        : pendingUpgradeSource.value
          ? t('forge.confirmLabelUpgrade')
          : t('forge.confirmLabelCraft');
    const discarded = pendingDiscardedEquipment.value.filter(
      (equipment) => equipment.id !== pendingUpgradeSource.value?.id,
    );
    return discarded.length
      ? t('forge.craftAndDiscard', { names: discarded.map((e) => e.name).join(', '), verb })
      : verb;
  });

  /** Drawer title for the pending action: the verb plus the entry being crafted or prepared. */
  const paymentTitle = computed(() => {
    const action = pendingAction.value;
    if (!action) return t('forge.paymentPanel');
    if (action.kind === 'prepare') return `${t('forge.confirmLabelPrepare')} ${action.entry.name}`;
    return `${t(pendingUpgradeSource.value ? 'forge.confirmLabelUpgrade' : 'forge.confirmLabelCraft')} ${action.entry.name}`;
  });

  function confirmAction(): void {
    const current = campaign.value;
    const member = selectedMember.value;
    const action = pendingAction.value;
    if (!current || !member || !action) return;
    let changed = false;
    if (action.kind === 'craft') {
      changed =
        runCommand('craftCampaignEquipment', subject(current.id), member.hunterId, action.entry.id, {
          equip: equipAfterCraft.value,
          payment: craftPaymentDraft.value,
        }) !== undefined;
    }
    if (action.kind === 'prepare') {
      const payment = Object.keys(paymentDraft.value).length ? paymentDraft.value : undefined;
      changed =
        runCommand('prepareCampaignPotion', subject(current.id), member.hunterId, action.entry.id, payment) !==
        undefined;
    }
    if (changed) {
      craftingPulse.value = action.entry.id;
      if (pulseTimer) window.clearTimeout(pulseTimer);
      pulseTimer = window.setTimeout(() => {
        craftingPulse.value = '';
      }, 650);
    }
    pendingAction.value = null;
  }

  function equip(entry: ForgeEquipment | null, equipmentSlot: EquipmentSlot): void {
    const current = campaign.value;
    const member = selectedMember.value;
    if (!current || !member) return;
    runCommand('equipEquipment', subject(current.id), member.hunterId, equipmentSlot, entry?.id ?? null);
  }

  onBeforeUnmount(() => {
    if (pulseTimer) window.clearTimeout(pulseTimer);
  });

  return {
    activeWorkshopLevel,
    adjustPlant,
    allocatedResourceCount,
    anyPlantCost,
    availablePlants,
    campaign,
    campaignRoute,
    cancelAction,
    changeMode,
    changeOfferedResource,
    changePotionCategory,
    changeScope,
    changeSlot,
    changeTradePartner,
    codexMode,
    confirmAction,
    confirmLabel,
    confirmTrade,
    craftingPulse,
    craftPaymentDraft,
    craftPaymentErrors,
    currentEquipment,
    damageLabel,
    defaultTrade,
    discipline,
    displayedCost,
    elementFilter,
    elements,
    entryState,
    equip,
    equipAfterCraft,
    equipmentPaymentConsequence,
    equipmentSlots,
    eventValue,
    expansionFilter,
    expansionName,
    expansions,
    forgeElementLabel,
    forgeTypeLabel,
    hunterById,
    loadoutOutcome,
    lockReason,
    mastheadArt,
    mastheadSubtitle,
    mastheadTitle,
    mobileDetail,
    mode,
    offeredResourceId,
    offeredResources,
    openTrade,
    paymentDraft,
    paymentOptionDisabled,
    paymentOptions,
    paymentResourceSummary,
    paymentTitle,
    paymentValid,
    pendingAction,
    pendingCost,
    pendingDiscardedEquipment,
    pendingRequirements,
    pendingUpgradeSource,
    plants,
    potionCategories,
    potionCategory,
    potionCategoryLabel,
    potionResourceSummary,
    query,
    recipeIcon,
    requestAction,
    requestedResourceId,
    requestedResources,
    requirementLabel,
    resourceCount,
    scope,
    seatCanCraft,
    selectedCost,
    selectedEntry,
    selectedHunter,
    selectedHunterId,
    selectedItem,
    selectedLevel,
    selectedMember,
    selectedPlantTotal,
    selectedState,
    selectedUpgradeSource,
    selectFamily,
    selectFamilyFromList,
    setCodexMode,
    setTender,
    shelfGroups,
    shelfItems,
    slot,
    stateColor,
    stateLabel,
    tenderOptionIcons,
    tenderValue,
    tradePartners,
    tradeTarget,
    tradeToHunterId,
    tradeValid,
    trading,
    walletGroups,
    zoomedArt,
  };
}

export type Workshop = ReturnType<typeof createWorkshop>;
/** The workshop model after reactive() unwraps its refs: the type children receive. */
export type WorkshopModel = UnwrapNestedRefs<Workshop>;

/** Creates the workshop view model. Must be called during setup; call inside reactive() for child props. */
export function useWorkshop(): WorkshopModel {
  return reactive(createWorkshop());
}
