import { sameBuild } from '../domain/deck';
import {
  createLoadout as buildLoadout,
  decodeLoadoutCode,
  LOADOUT_NAME_MAX,
  LOADOUT_STRATEGY_MAX,
  setLoadoutMastery as pickLoadoutMastery,
  setLoadoutPotion as slotLoadoutPotion,
  toSharedBuild,
  setLoadoutEquipment as wearLoadoutEquipment,
} from '../domain/loadout';
import type { BoardBuild, EquipmentSlot, HunterLoadout, PotionSlot } from '../domain/types';
import { catalog } from './catalog';
import { notify as emitNotice } from './events';
import { now, uid } from './ids';
import { campaignLogger } from './logger';
import { forgetLoadout, loadouts, persistLoadout, recordTombstone, settings } from './subject-state';
// ---------------------------------------------------------------------------
// Loadouts: device-local saved builds, never forwarded over a session
// ---------------------------------------------------------------------------

export const loadoutsForHunter = (hunterId: string): HunterLoadout[] =>
  loadouts.value
    .filter((loadout) => loadout.hunterId === hunterId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

export const loadoutById = (id: string): HunterLoadout | undefined => loadouts.value.find((entry) => entry.id === id);

/** The saved loadout matching a build exactly, if any: what the party board shows as "equipped". */
export const findMatchingLoadout = (
  saved: HunterLoadout[],
  hunterId: string,
  build: BoardBuild,
): HunterLoadout | undefined => saved.find((loadout) => loadout.hunterId === hunterId && sameBuild(loadout, build));

export const loadoutName = (name: string): string => name.trim().slice(0, LOADOUT_NAME_MAX);
const nextLoadoutName = (hunterId: string): string => `Build ${loadoutsForHunter(hunterId).length + 1}`;

export function replaceLoadout(next: HunterLoadout, reason: string): HunterLoadout {
  const stamped = { ...next, rev: next.rev + 1 };
  loadouts.update((list) => list.map((entry) => (entry.id === stamped.id ? stamped : entry)));
  persistLoadout(stamped);
  campaignLogger.info(reason, { loadoutId: stamped.id });
  return stamped;
}

export function saveLoadout(hunterId: string, name: string, build: BoardBuild): HunterLoadout {
  const stamp = now();
  const loadout: HunterLoadout = {
    createdAt: stamp,
    deckCardIds: [...build.deckCardIds],
    equipment: { ...build.equipment },
    hunterId,
    id: uid('loadout'),
    masteryCardId: build.masteryCardId,
    name: loadoutName(name) || nextLoadoutName(hunterId),
    potionLoadoutIds: [...build.potionLoadoutIds],
    rev: 0,
    strategy: '',
    updatedAt: stamp,
  };
  loadouts.update((list) => [...list, loadout]);
  persistLoadout(loadout);
  emitNotice('toasts.buildSaved', 'success', { values: { name: loadout.name } });
  return loadout;
}

/** A new build for the library: base equipment and a fitted deck, ready to edit. */
export function createLoadout(hunterId: string, name?: string): HunterLoadout {
  const loadout = buildLoadout(hunterId, settings.value.ownedExpansionIds, {
    id: uid('loadout'),
    name: (name && loadoutName(name)) || nextLoadoutName(hunterId),
    now: now(),
  });
  loadouts.update((list) => [...list, loadout]);
  persistLoadout(loadout);
  campaignLogger.info('Build created', { loadoutId: loadout.id });
  return loadout;
}

export function setLoadoutEquipment(
  loadoutId: string,
  slot: EquipmentSlot,
  equipmentId: string | null,
): HunterLoadout | undefined {
  const loadout = loadoutById(loadoutId);
  if (!loadout) return undefined;
  return replaceLoadout(
    wearLoadoutEquipment(loadout, slot, equipmentId, settings.value.ownedExpansionIds, now()),
    'Build equipment changed',
  );
}

export function setLoadoutPotion(
  loadoutId: string,
  slot: PotionSlot,
  potionId: string | null,
): HunterLoadout | undefined {
  const loadout = loadoutById(loadoutId);
  if (!loadout) return undefined;
  return replaceLoadout(
    slotLoadoutPotion(loadout, slot, potionId, settings.value.ownedExpansionIds, now()),
    'Build potion changed',
  );
}

/** Replaces the whole board of a saved build with what a campaign or expedition hunter currently wears. */
export function updateLoadoutBuild(loadoutId: string, build: BoardBuild): HunterLoadout | undefined {
  const loadout = loadoutById(loadoutId);
  if (!loadout) return undefined;
  const next = replaceLoadout(
    {
      ...loadout,
      deckCardIds: [...build.deckCardIds],
      equipment: { ...build.equipment },
      masteryCardId: build.masteryCardId,
      potionLoadoutIds: [...build.potionLoadoutIds],
      updatedAt: now(),
    },
    'Build updated',
  );
  emitNotice('toasts.buildUpdated', 'success', { values: { name: next.name } });
  return next;
}

export function renameLoadout(loadoutId: string, name: string): HunterLoadout | undefined {
  const loadout = loadoutById(loadoutId);
  const trimmed = loadoutName(name);
  if (!loadout || !trimmed) return loadout;
  return replaceLoadout({ ...loadout, name: trimmed, updatedAt: now() }, 'Build renamed');
}

/** Stores the free-form strategy note on a saved build; empty text clears it without a toast. */
export function setLoadoutStrategy(loadoutId: string, strategy: string): HunterLoadout | undefined {
  const loadout = loadoutById(loadoutId);
  if (!loadout) return undefined;
  const trimmed = strategy.trim().slice(0, LOADOUT_STRATEGY_MAX);
  if (trimmed === loadout.strategy) return loadout;
  return replaceLoadout({ ...loadout, strategy: trimmed, updatedAt: now() }, 'Build strategy updated');
}

/** Chooses the mastery card a saved build plays. */
export function setLoadoutMastery(loadoutId: string, masteryCardId: string): HunterLoadout | undefined {
  const loadout = loadoutById(loadoutId);
  if (!loadout || loadout.masteryCardId === masteryCardId) return loadout;
  return replaceLoadout(
    pickLoadoutMastery(loadout, masteryCardId, settings.value.ownedExpansionIds, now()),
    'Build mastery changed',
  );
}

export function duplicateLoadout(loadoutId: string): HunterLoadout | undefined {
  const loadout = loadoutById(loadoutId);
  if (!loadout) return undefined;
  const copy = saveLoadout(loadout.hunterId, loadoutName(`${loadout.name} copy`), loadout);
  return loadout.strategy ? setLoadoutStrategy(copy.id, loadout.strategy) : copy;
}

/** A published build whose local edits the online snapshot does not hold yet. */
export function hasUnpublishedChanges(loadout: HunterLoadout): boolean {
  return (
    loadout.catalogEntryId !== undefined && loadout.publishedRev !== undefined && loadout.rev > loadout.publishedRev
  );
}

/**
 * Publishes (or, for a published build with local drift, republishes) the build's current
 * snapshot to the community catalog. The loadout keeps the entry link and the `rev` the
 * snapshot holds; a failed publish leaves the local state untouched.
 */
export async function publishLoadout(loadoutId: string): Promise<HunterLoadout | undefined> {
  const loadout = loadoutById(loadoutId);
  if (!loadout) return undefined;
  const entry = await catalog.publish({ build: toSharedBuild(loadout), entryId: loadout.catalogEntryId });
  // The record carrying these fields is one rev ahead of the snapshot's source rev
  // (replaceLoadout stamps it), so the drift check starts from a clean slate.
  return replaceLoadout({ ...loadout, catalogEntryId: entry.id, publishedRev: loadout.rev + 1 }, 'Build published');
}

/** Removes the build's catalog entry: the queued unpublish survives even an offline catalog. */
export function unpublishLoadout(loadoutId: string): HunterLoadout | undefined {
  const loadout = loadoutById(loadoutId);
  if (!loadout?.catalogEntryId) return loadout;
  catalog.enqueueUnpublish(loadout.catalogEntryId);
  const { catalogEntryId: _gone, publishedRev: _rev, ...unpublished } = loadout;
  return replaceLoadout(unpublished, 'Build unpublished');
}

export function removeLoadout(loadoutId: string): void {
  const loadout = loadoutById(loadoutId);
  if (!loadout) return;
  // A published build's entry must not outlive it: the unpublish is queued durably before
  // the local row goes, so the entry (and its likes) leaves the catalog even if this
  // tab dies right after the delete.
  if (loadout.catalogEntryId) catalog.enqueueUnpublish(loadout.catalogEntryId);
  loadouts.update((list) => list.filter((entry) => entry.id !== loadoutId));
  forgetLoadout(loadoutId);
  recordTombstone('loadouts', loadoutId);
  emitNotice('toasts.buildDeleted', 'info', {
    actions: [
      {
        key: 'toasts.undo',
        onClick: () => {
          if (loadoutById(loadoutId)) return;
          // The catalog entry is already going: the restored build comes back unpublished,
          // never with a dangling entry link.
          const { catalogEntryId: _gone, publishedRev: _rev, ...unpublished } = loadout;
          loadouts.update((list) => [...list, unpublished]);
          persistLoadout(unpublished);
        },
      },
    ],
    values: { name: loadout.name },
  });
}

/** Saves a shared build code as a new loadout; throws `PrimalDomainError('loadout-invalid')` for bad codes. */
export function importLoadout(code: string): HunterLoadout {
  const shared = decodeLoadoutCode(code);
  return saveLoadout(shared.hunterId, shared.name, shared);
}
