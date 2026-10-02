import { tp } from '../../../app/i18n';
import type { RouteName, RouteTarget } from '../../../app/router';
import { monsterById } from '../../../content';
import type { ChroniclesCount, ChroniclesHunterLoadouts, ChroniclesOrigin } from '../../../domain/chronicles';
import { baseEquipment } from '../../../domain/deck';
import type { GameMode, Hunter } from '../../../domain/types';

/** Chapter lists never dead-end at their first rows: the first page ranks, the tail expands. */
export const LIST_PAGE_SIZE = 8;

export const page = <T>(rows: readonly T[]): T[] => rows.slice(0, LIST_PAGE_SIZE);
export const tail = <T>(rows: readonly T[]): T[] => rows.slice(LIST_PAGE_SIZE);

/** Catalog names keep their printed spelling; unknown ids stay readable for foreign saves. */
export const monsterName = (id: string) => monsterById(id)?.name ?? id;

export const formatCount = (value: number) => new Intl.NumberFormat().format(value);

export const formatRate = (value: number | null) =>
  value === null
    ? 'N/A'
    : new Intl.NumberFormat(undefined, { maximumFractionDigits: 0, style: 'percent' }).format(value);

/** Fight-clock durations: a clock below the hour, an hour span above it. */
export const formatDuration = (milliseconds: number) => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // Fights run long: a 95-minute hunt must read as an hour span, never "95:00".
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

/** Narrative spans for record highlights: every component named, zero components dropped. */
export const formatPlayTime = (milliseconds: number) => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  if (seconds > 0) return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  return `${minutes}m`;
};

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(new Date(iso));

export const formatSampleDate = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));

/** A creature's standing in the record's voice: victories first, defeats after. */
export const standing = (victories: number, defeats: number) =>
  `${tp('chronicles.victoryCount', victories, { count: victories })} · ${tp('chronicles.defeatCount', defeats, { count: defeats })}`;

/** The route that opens a record's owning game, so every hunt links back to its source. */
const ORIGIN_ROUTES: Record<GameMode, RouteName> = {
  ascent: 'ascentDetail',
  campaign: 'campaignDashboard',
  challenge: 'challengeDetail',
  expedition: 'expeditionDetail',
};

export const originRoute = (origin: ChroniclesOrigin): RouteTarget => ({
  params: { id: origin.id },
  to: ORIGIN_ROUTES[origin.kind],
});

/** The manual entry of a catalog creature: where a record's creature names link back to. */
export const monsterReference = (monsterId: string): RouteTarget => ({
  query: { entry: `monster-${monsterId}` },
  to: 'manual',
});

/** The hunter's recorded gear minus their printed base set: only what the record added. */
export const recordedEquipment = (
  loadouts: ChroniclesHunterLoadouts | undefined,
  hunter: Hunter,
): ChroniclesCount[] => {
  const baseIds = new Set(Object.values(baseEquipment(hunter)).filter((id): id is string => id !== null));

  return (loadouts?.equipment ?? []).filter(({ id }) => !baseIds.has(id));
};
