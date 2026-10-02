import type { AggressionLevel, Monster, MonsterStance, MonsterStanceDamage } from '../domain/types';

type DamageRows = Partial<Record<AggressionLevel, readonly number[]>>;

const stances = (damage: readonly number[]): Partial<Record<MonsterStance, number>> =>
  Object.fromEntries(damage.map((value, index) => [index + 1, value]));

/** Turns compact aggression → per-stance rows into the public monster damage table. */
const rows = (standard: DamageRows, nightmare: DamageRows = {}): MonsterStanceDamage[] => [
  ...(Object.entries(standard) as [string, readonly number[]][]).map(([aggression, damage]) => ({
    aggression: Number(aggression) as AggressionLevel,
    nightmare: false,
    stances: stances(damage),
  })),
  ...(Object.entries(nightmare) as [string, readonly number[]][]).map(([aggression, damage]) => ({
    aggression: Number(aggression) as AggressionLevel,
    nightmare: true,
    stances: stances(damage),
  })),
];

/** Damage each player must contribute to inflict one wound. Zero is authored data, not a missing value. */
export const monsterDamageFor = (
  monster: Pick<Monster, 'stanceDamage'>,
  aggression: AggressionLevel,
  nightmare = false,
): MonsterStanceDamage | undefined =>
  monster.stanceDamage.find((row) => row.aggression === aggression && row.nightmare === nightmare);

/** Every stance card the monster owns, in play order: the union of its damage rows' stance keys. */
export const monsterStances = (monster: Pick<Monster, 'stanceDamage'>): readonly MonsterStance[] =>
  [...new Set(monster.stanceDamage.flatMap((row) => Object.keys(row.stances)))]
    .map(Number)
    .sort((left, right) => left - right) as MonsterStance[];

export const monsterDamage: Record<string, MonsterStanceDamage[]> = {
  dygorax: rows(
    { 0: [2, 3, 4], 1: [5, 7, 10], 2: [9, 15, 18], 3: [15, 20, 25] },
    { 1: [7, 8, 12], 2: [12, 16, 22], 3: [18, 25, 30] },
  ),
  felaxir: rows(
    { 0: [2, 3, 4], 1: [6, 7, 9], 2: [12, 14, 20], 3: [18, 25, 28] },
    { 1: [6, 8, 12], 2: [14, 16, 25], 3: [20, 30, 35] },
  ),
  hurom: rows(
    { 0: [2, 2, 3], 1: [4, 6, 7], 2: [9, 14, 17], 3: [15, 20, 25] },
    { 1: [5, 7, 8], 2: [10, 18, 20], 3: [18, 25, 28] },
  ),
  hydar: rows(
    { 0: [2, 3, 3], 1: [4, 6, 8], 2: [12, 15, 18], 3: [18, 22, 28] },
    { 1: [5, 7, 10], 2: [15, 18, 22], 3: [18, 28, 35] },
  ),
  jekoros: rows(
    { 0: [2, 4, 5], 1: [7, 8, 12], 2: [12, 17, 22], 3: [20, 25, 30] },
    { 1: [8, 10, 14], 2: [15, 18, 25], 3: [25, 28, 35] },
  ),
  kharja: rows(
    { 0: [2, 3, 5], 1: [5, 7, 12], 2: [10, 16, 20], 3: [15, 25, 30] },
    { 1: [6, 8, 15], 2: [12, 18, 22], 3: [21, 28, 35] },
  ),
  korowon: rows(
    { 0: [2, 0, 4], 1: [2, 0, 8], 2: [13, 0, 16], 3: [20, 0, 25] },
    { 1: [7, 0, 10], 2: [15, 0, 20], 3: [22, 0, 30] },
  ),
  mamuraak: rows(
    { 0: [3, 4, 5], 1: [6, 8, 10], 2: [12, 18, 20], 3: [20, 25, 30] },
    { 1: [7, 10, 12], 2: [15, 18, 22], 3: [23, 30, 35] },
  ),
  morkraas: rows(
    { 0: [2, 3, 5], 1: [6, 8, 10], 2: [14, 16, 20], 3: [20, 25, 30] },
    { 1: [7, 10, 12], 2: [15, 18, 25], 3: [25, 30, 35] },
  ),
  nagarjas: rows(
    { 0: [4, 4, 5], 1: [5, 6, 7], 2: [11, 15, 16], 3: [18, 22, 28] },
    { 1: [6, 7, 8], 2: [12, 16, 20], 3: [24, 26, 30] },
  ),
  orouxen: rows(
    { 0: [2, 3, 4], 1: [6, 7, 8], 2: [10, 15, 20], 3: [20, 22, 26] },
    { 1: [8, 9, 10], 2: [14, 18, 22], 3: [25, 28, 30] },
  ),
  ozew: rows(
    { 0: [3, 2, 2], 1: [7, 5, 3], 2: [16, 12, 9], 3: [25, 18, 15] },
    { 1: [9, 6, 3], 2: [20, 15, 10], 3: [30, 25, 15] },
  ),
  pazis: rows(
    { 0: [2, 2, 3], 1: [4, 5, 7], 2: [10, 13, 17], 3: [18, 20, 25] },
    { 1: [5, 7, 8], 2: [13, 17, 20], 3: [20, 25, 30] },
  ),
  reikal: rows(
    { 0: [2, 3, 5], 1: [6, 8, 10], 2: [12, 16, 20], 3: [18, 22, 30] },
    { 1: [8, 10, 11], 2: [15, 18, 25], 3: [22, 26, 36] },
  ),
  sirkaaj: rows(
    { 0: [2, 3, 3], 1: [5, 6, 9], 2: [13, 16, 20], 3: [22, 25, 28] },
    { 1: [5, 8, 10], 2: [15, 18, 20], 3: [25, 28, 30] },
  ),
  taraska: rows(
    { 0: [3, 4, 5], 1: [7, 8, 9], 2: [14, 16, 20], 3: [22, 25, 28] },
    { 1: [7, 9, 15], 2: [15, 20, 25], 3: [25, 30, 38] },
  ),
  tarragua: rows(
    { 0: [2, 3, 4], 1: [6, 7, 8], 2: [10, 14, 18], 3: [16, 18, 22] },
    { 1: [7, 8, 9], 2: [12, 15, 20], 3: [18, 20, 22] },
  ),
  'the-awakened': rows({ 3: [30, 40, 50, 60, 60] }),
  toramat: rows(
    { 0: [2, 3, 3], 1: [4, 6, 9], 2: [10, 16, 20], 3: [18, 25, 30] },
    { 1: [5, 8, 10], 2: [12, 18, 25], 3: [25, 28, 35] },
  ),
  vyraxen: rows(
    { 0: [2, 3, 4], 1: [5, 7, 10], 2: [10, 15, 20], 3: [18, 24, 30] },
    { 1: [6, 9, 12], 2: [12, 18, 25], 3: [25, 30, 40] },
  ),
  xitheros: rows(
    { 0: [3, 4, 5], 1: [7, 8, 12], 2: [15, 20, 25], 3: [20, 25, 35] },
    { 1: [9, 10, 13], 2: [16, 22, 25], 3: [25, 30, 40] },
  ),
  zekalith: rows(
    { 0: [2, 3, 3], 1: [4, 7, 8], 2: [10, 16, 18], 3: [15, 24, 28] },
    { 1: [5, 7, 9], 2: [12, 16, 20], 3: [20, 25, 28] },
  ),
  zekath: rows(
    { 0: [2, 3, 3], 1: [4, 7, 8], 2: [10, 16, 18], 3: [15, 24, 28] },
    { 1: [5, 8, 10], 2: [12, 18, 24], 3: [20, 26, 32] },
  ),
};
