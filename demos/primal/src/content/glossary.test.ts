import { describe, expect, it } from 'vitest';
import { gameIcons, hunterStatuses, keywords, monsterStatuses } from './index';

const allStatuses = [...hunterStatuses, ...monsterStatuses];

describe('rulebook glossary', () => {
  it('has unique keyword ids', () => {
    const ids = keywords.map((keyword) => keyword.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every keyword rule text and a slug id', () => {
    for (const keyword of keywords) {
      expect(keyword.text.length, keyword.id).toBeGreaterThan(0);
      expect(keyword.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it('resolves every token keywordId to a glossary entry', () => {
    const byId = new Map(keywords.map((keyword) => [keyword.id, keyword]));
    for (const status of allStatuses) {
      if (status.keywordId === null) continue;
      expect(byId.has(status.keywordId), `${status.id} → ${status.keywordId}`).toBe(true);
    }
  });

  it('extracts both icon tables', () => {
    expect(gameIcons.filter((icon) => icon.group === 'color').map((icon) => icon.id)).toEqual([
      'attack',
      'maneuver',
      'parry',
      'dodge',
      'offensive',
      'defensive',
    ]);
    expect(gameIcons.every((icon) => icon.name.startsWith('[') && icon.text.length > 0)).toBe(true);
  });
});
