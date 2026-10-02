import { type ComputedRef, computed, type Ref, ref } from 'vue';
import { t } from '../../app/i18n';
import { runCommand } from '../../app/store';
import { hunterById, stepCards } from '../../content';
import type { DeckContext, DeckReport } from '../../domain/deck';
import { fitDeck, validateDeck } from '../../domain/deck';
import type {
  BoardBuild,
  EquipmentSlot,
  Hunter,
  HunterCard,
  HunterLoadout,
  PotionSlot,
  SkillBranchId,
  SkillStep,
  SubjectRef,
} from '../../domain/types';
import { buildShareSubject, type ShareSubject } from '../components/share/share-subject';
import { useEquippedLoadout } from './use-equipped-loadout';

/** The party member the shared deck/board operations touch: the worn build plus who wears it. */
export type PartyMember = BoardBuild & { hunterId: string };

/** One party member's pending skill-tree upgrade, awaiting the confirm dialog. */
export interface PendingUpgrade {
  branch: SkillBranchId;
  step: SkillStep;
}

/**
 * The party workspace every mode shares: resolve the selected hunter, validate and auto-fit
 * their action deck, wear equipment and potions, consume them in the hunt, apply a saved
 * build, share it, and run the skill-tree upgrade through its confirm dialog. Campaign,
 * expedition, ascent and challenge differ only in *when* editing is allowed and *which* deck
 * context applies, so those two decisions are passed in as getters and the operations are
 * written once here, like `use-subject` does for the board views.
 *
 * Commands run through `runCommand`, which already reports a domain refusal as a toast and
 * returns `undefined`; the upgrade dialog stays open on a refusal because the command's
 * `undefined` return is the single source of "did it happen".
 */
export interface PartyDeckOptions<M extends PartyMember> {
  /** Whether equipment/potion/deck edits are accepted right now. */
  canConsume: () => boolean;
  /** Whether the board is editable right now. */
  canEdit: () => boolean;
  /** Whether a skill-tree step can be spent right now (the preparation phase). */
  canUpgrade: () => boolean;
  /** The mode's deck context for a member and hunter; `undefined` until both resolve. */
  contextFor: (member: M, hunter: Hunter) => DeckContext | undefined;
  /** Overrides the wear path (the Winds reward one-pick); defaults to the shared `equipEquipment`. */
  equip?: (member: M, slot: EquipmentSlot, equipmentId: string | null) => void;
  /** Runs after a skill-point spend succeeds (close the branch sheet). */
  onUpgradeConfirmed?: () => void;
  /** The party roster to select from. */
  party: () => readonly M[];
  /** The selected hunter id; empty falls back to the first member. */
  selectedId: () => string;
  /** The routed subject the commands act on; `null` until the entity resolves. */
  subject: () => SubjectRef | null;
}

export interface PartyDeck<M extends PartyMember> {
  applyLoadout: (loadout: HunterLoadout) => void;
  autoFitDeck: () => void;
  canConsume: ComputedRef<boolean>;
  canEdit: ComputedRef<boolean>;
  changeEquipment: (slot: EquipmentSlot, equipmentId: string | null) => void;
  changePotion: (slot: PotionSlot, potionId: string | null) => void;
  confirmUpgrade: () => void;
  consumePotion: (potionId: string) => void;
  context: ComputedRef<DeckContext | undefined>;
  equippedLoadout: ComputedRef<HunterLoadout | undefined>;
  openBranch: Ref<SkillBranchId | null>;
  pendingUpgrade: Ref<PendingUpgrade | null>;
  pendingUpgradeCards: ComputedRef<HunterCard[]>;
  picking: Ref<boolean>;
  report: ComputedRef<DeckReport | undefined>;
  requestUpgrade: (branch: SkillBranchId, step: SkillStep) => void;
  selectedHunter: ComputedRef<Hunter | undefined>;
  selectedMember: ComputedRef<M | null>;
  shareBuild: () => void;
  sharing: Ref<ShareSubject | null>;
  toggleCard: (card: HunterCard) => void;
  viewedCard: Ref<HunterCard | null>;
  viewedCardLocked: ComputedRef<string | undefined>;
  viewedCardSelected: ComputedRef<boolean | undefined>;
}

export function usePartyDeck<M extends PartyMember>(options: PartyDeckOptions<M>): PartyDeck<M> {
  const canEdit = computed(options.canEdit);
  const canConsume = computed(options.canConsume);

  const selectedMember = computed<M | null>(() => {
    const party = options.party();
    const fallback = party[0] ?? null;
    const id = options.selectedId() || fallback?.hunterId;
    return party.find((member) => member.hunterId === id) ?? fallback;
  });
  const selectedHunter = computed(() => (selectedMember.value ? hunterById(selectedMember.value.hunterId) : undefined));

  const context = computed(() => {
    const member = selectedMember.value;
    const hunter = selectedHunter.value;
    return member && hunter ? options.contextFor(member, hunter) : undefined;
  });
  const report = computed(() =>
    context.value && selectedMember.value ? validateDeck(selectedMember.value.deckCardIds, context.value) : undefined,
  );
  const equippedLoadout = useEquippedLoadout(() => selectedMember.value ?? undefined);

  const sharing = ref<ShareSubject | null>(null);
  const picking = ref(false);
  const openBranch = ref<SkillBranchId | null>(null);
  const pendingUpgrade = ref<PendingUpgrade | null>(null);
  const pendingUpgradeCards = computed(() =>
    pendingUpgrade.value && selectedHunter.value
      ? stepCards(selectedHunter.value, pendingUpgrade.value.branch, pendingUpgrade.value.step)
      : [],
  );
  const viewedCard = ref<HunterCard | null>(null);
  const viewedCardLocked = computed(() => {
    const card = viewedCard.value;
    const deckContext = context.value;
    if (!card || !deckContext || card.step === 'S') return undefined;
    return deckContext.availableCardIds.has(card.id)
      ? undefined
      : t('party.branchStep', { id: card.step[0], step: card.step.slice(1) });
  });
  const viewedCardSelected = computed(() => {
    if (!canEdit.value || !viewedCard.value || viewedCardLocked.value) return undefined;
    return selectedMember.value?.deckCardIds.includes(viewedCard.value.id) ?? false;
  });

  function toggleCard(card: HunterCard): void {
    const member = selectedMember.value;
    const subject = options.subject();
    if (!member || !subject || !canEdit.value) return;
    const ids = new Set(member.deckCardIds);
    if (ids.has(card.id)) ids.delete(card.id);
    else ids.add(card.id);
    runCommand('setHunterDeck', subject, member.hunterId, [...ids]);
  }

  function changeEquipment(slot: EquipmentSlot, equipmentId: string | null): void {
    const member = selectedMember.value;
    if (!member || !canEdit.value) return;
    if (options.equip) {
      options.equip(member, slot, equipmentId);
      return;
    }
    const subject = options.subject();
    if (!subject) return;
    runCommand('equipEquipment', subject, member.hunterId, slot, equipmentId);
  }

  function changePotion(slot: PotionSlot, potionId: string | null): void {
    const member = selectedMember.value;
    const subject = options.subject();
    if (!member || !subject || !canEdit.value) return;
    runCommand('equipPotion', subject, member.hunterId, slot, potionId);
  }

  function consumePotion(potionId: string): void {
    const member = selectedMember.value;
    const subject = options.subject();
    if (!member || !subject || !canConsume.value) return;
    runCommand('consumePotion', subject, member.hunterId, potionId);
  }

  function applyLoadout(loadout: HunterLoadout): void {
    const member = selectedMember.value;
    const subject = options.subject();
    if (!member || !subject || !canEdit.value) return;
    runCommand('applyLoadout', subject, member.hunterId, loadout);
    picking.value = false;
  }

  function autoFitDeck(): void {
    const member = selectedMember.value;
    const subject = options.subject();
    const deckContext = context.value;
    if (!member || !subject || !deckContext || !canEdit.value) return;
    runCommand('setHunterDeck', subject, member.hunterId, fitDeck(member.deckCardIds, deckContext));
  }

  function shareBuild(): void {
    const member = selectedMember.value;
    const hunter = selectedHunter.value;
    if (!member || !hunter) return;
    sharing.value = buildShareSubject({
      build: {
        deckCardIds: member.deckCardIds,
        equipment: member.equipment,
        hunterId: hunter.id,
        masteryCardId: member.masteryCardId,
        name: equippedLoadout.value?.name ?? hunter.name,
        potionLoadoutIds: member.potionLoadoutIds,
      },
    });
  }

  function requestUpgrade(branch: SkillBranchId, step: SkillStep): void {
    if (options.canUpgrade()) pendingUpgrade.value = { branch, step };
  }

  function confirmUpgrade(): void {
    const member = selectedMember.value;
    const subject = options.subject();
    const upgrade = pendingUpgrade.value;
    pendingUpgrade.value = null;
    if (!member || !subject || !upgrade) return;
    // A domain refusal returns undefined, so the sheet stays open exactly when the spend failed.
    if (runCommand('spendSkillPoint', subject, member.hunterId, upgrade.branch)) options.onUpgradeConfirmed?.();
  }

  return {
    applyLoadout,
    autoFitDeck,
    canConsume,
    canEdit,
    changeEquipment,
    changePotion,
    confirmUpgrade,
    consumePotion,
    context,
    equippedLoadout,
    openBranch,
    pendingUpgrade,
    pendingUpgradeCards,
    picking,
    report,
    requestUpgrade,
    selectedHunter,
    selectedMember,
    shareBuild,
    sharing,
    toggleCard,
    viewedCard,
    viewedCardLocked,
    viewedCardSelected,
  };
}
