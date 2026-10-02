import { createIndex } from '@vielzeug/scout';
import { hunters, keywords, monsters, quests } from '../content';
import type { Keyword } from '../content/keywords';
import type { Monster } from '../domain/types';

/** Fuzzy indexes for table-side lookup. Content is static, so the indexes are built once. */
export const keywordIndex = createIndex<Keyword>(keywords, { fields: [{ field: 'name', weight: 3 }, 'text', 'scope'] });

export const monsterIndex = createIndex<Monster>(monsters, {
  fields: [{ field: 'name', weight: 3 }, 'element', 'habitat', 'description'],
});

export interface GlobalSearchRecord {
  id: string;
  kind: 'Monsters' | 'Hunters' | 'Quests' | 'Keywords';
  label: string;
  meta: string;
}

const records: GlobalSearchRecord[] = [
  ...monsters.map((monster) => ({
    id: monster.id,
    kind: 'Monsters' as const,
    label: monster.name,
    meta: monster.habitat,
  })),
  ...hunters.map((hunter) => ({ id: hunter.id, kind: 'Hunters' as const, label: hunter.name, meta: hunter.title })),
  ...quests.map((quest) => ({
    id: quest.id,
    kind: 'Quests' as const,
    label: `Quest ${quest.number}: ${quest.name}`,
    meta: quest.monsterId,
  })),
  ...keywords.map((keyword) => ({
    id: keyword.id,
    kind: 'Keywords' as const,
    label: keyword.name,
    meta: keyword.text,
  })),
];

export const globalIndex = createIndex<GlobalSearchRecord>(records, {
  fields: [{ field: 'label', weight: 3 }, 'meta'],
});
