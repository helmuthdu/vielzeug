import { t } from '../../../app/i18n';
import { forgeElementLabel } from '../../../content';
import type { ForgeEquipment, Potion } from '../../../domain/types';
import type { PickerEntry } from './SlotPicker.vue';

/** One equipment piece as the picker list and the full-card detail show it. */
export function equipmentPickerEntry(piece: ForgeEquipment, effective = false, weaponSlot = false): PickerEntry {
  return {
    artwork: piece.artwork,
    damage: piece.type === 'weapon' ? piece.damage : null,
    /** The deck composition a weapon demands: the pre-commit knowledge for the pivotal pick. */
    deckComposition: piece.type === 'weapon' ? piece.deckComposition : null,
    description: piece.description,
    effective,
    elementLabel: piece.element ? forgeElementLabel(piece.element) : undefined,
    health: piece.type === 'armor' || piece.type === 'helm' ? piece.health : null,
    id: piece.id,
    level: piece.level,
    name: piece.name,
    subtitle: piece.element
      ? `${t('party.levelShort')} ${piece.level} · ${forgeElementLabel(piece.element)}`
      : `${t('party.levelShort')} ${piece.level}`,
    tall: weaponSlot,
  };
}

/** One potion as the picker list and the full-card detail show it. */
export function potionPickerEntry(potion: Potion): PickerEntry {
  return {
    artwork: potion.artwork,
    description: potion.description,
    id: potion.id,
    level: potion.level,
    name: potion.name,
    subtitle: `${t('party.levelShort')} ${potion.level}`,
  };
}
