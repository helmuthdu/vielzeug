import { describe, expect, it } from 'vitest';
import type { CatalogEntry } from './catalog';
import { catalogActions, catalogAllows } from './catalog-policy';

/** One entry stub per ownership case: only the author id matters to the policy. */
const entry = (authorId: string): Pick<CatalogEntry, 'author'> => ({ author: { id: authorId, name: '' } });

const player = { id: 'player-1', roles: ['player'] };

describe('catalog policy', () => {
  it('lets anonymous principals view the catalog and nothing else', () => {
    expect(catalogAllows('view', null)).toBe(true);
    expect(catalogAllows('like', null)).toBe(false);
    expect(catalogAllows('import', null)).toBe(false);
    expect(catalogAllows('publish', null)).toBe(false);
  });

  it('lets players import, like and publish, including their own entries', () => {
    expect(catalogAllows('import', player, entry('other'))).toBe(true);
    expect(catalogAllows('like', player, entry('other'))).toBe(true);
    expect(catalogAllows('publish', player)).toBe(true);
    expect(catalogAllows('publish', player, entry('player-1'))).toBe(true);
  });

  it('keeps republishing and unpublishing with the entry author', () => {
    expect(catalogAllows('republish', player, entry('player-1'))).toBe(true);
    expect(catalogAllows('unpublish', player, entry('player-1'))).toBe(true);
    expect(catalogAllows('republish', player, entry('other'))).toBe(false);
    expect(catalogAllows('unpublish', player, entry('other'))).toBe(false);
  });

  it('derives anonymous browsing actions only', () => {
    expect(catalogActions(null, entry('other'))).toEqual(['view']);
  });

  it('derives view, import and like for another player’s entry', () => {
    expect(catalogActions(player, entry('other'))).toEqual(
      expect.arrayContaining(['view', 'import', 'like', 'unlike', 'publish']),
    );
    expect(catalogActions(player, entry('other'))).not.toContain('unpublish');
  });

  it('derives every action for the author’s own entry', () => {
    expect(catalogActions(player, entry('player-1'))).toEqual(
      expect.arrayContaining(['view', 'import', 'like', 'unlike', 'republish', 'unpublish']),
    );
  });
});
