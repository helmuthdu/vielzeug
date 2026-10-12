import { describe, expect, it } from 'vitest';
import { likedPublicationsSql, listPublicationsSql, type PublicationCursor } from '../worker/sql';

/** A well-formed keyset cursor for assertions; values are arbitrary but stable. */
const cursor = (): PublicationCursor => ({
  id: '0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d',
  likeCount: 5,
  publishedAt: '2026-01-01T00:00:00.000Z',
});

describe('listPublicationsSql ordering', () => {
  it('orders recent pages by published_at then id descending', () => {
    const bound = listPublicationsSql({ collection: 'fixture', limit: 11, sort: 'recent' });
    expect(bound.sql).toContain('ORDER BY p.published_at DESC, p.id DESC LIMIT ?');
    expect(bound.parameters).toEqual(['fixture', 11]);
  });

  it('orders liked pages by like_count, published_at then id descending', () => {
    const bound = listPublicationsSql({ collection: 'fixture', limit: 11, sort: 'liked' });
    expect(bound.sql).toContain('ORDER BY p.like_count DESC, p.published_at DESC, p.id DESC LIMIT ?');
    expect(bound.parameters).toEqual(['fixture', 11]);
  });
});

describe('listPublicationsSql filter composition', () => {
  it('always scopes the query to the collection dimension and public visibility', () => {
    const bound = listPublicationsSql({ collection: 'fixture', limit: 11, sort: 'recent' });
    expect(bound.sql).toContain('WHERE p.collection = ? AND p.hidden_at IS NULL');
    expect(bound.parameters[0]).toBe('fixture');
  });

  it('adds an author equality predicate over the public publisher id', () => {
    const bound = listPublicationsSql({
      author: '0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d',
      collection: 'fixture',
      limit: 11,
      sort: 'recent',
    });
    expect(bound.sql).toContain('p.owner_id = ?');
    expect(bound.parameters).toEqual(['fixture', '0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d', 11]);
  });

  it('adds a scalar filter equality predicate', () => {
    const bound = listPublicationsSql({ collection: 'fixture', filter: 'even', limit: 11, sort: 'recent' });
    expect(bound.sql).toContain('p.filter_value = ?');
    expect(bound.parameters).toEqual(['fixture', 'even', 11]);
  });

  it('adds a tag existence predicate over publication_tags', () => {
    const bound = listPublicationsSql({ collection: 'fixture', limit: 11, sort: 'recent', tag: 'low' });
    expect(bound.sql).toContain('EXISTS (');
    expect(bound.sql).toContain('SELECT 1 FROM publication_tags t WHERE t.publication_id = p.id AND t.tag = ?');
    expect(bound.parameters).toEqual(['fixture', 'low', 11]);
  });

  it('adds an FTS match predicate over the title index', () => {
    const bound = listPublicationsSql({
      collection: 'fixture',
      limit: 11,
      searchMatch: '"hunter"*',
      sort: 'recent',
    });
    expect(bound.sql).toContain('SELECT rowid FROM publication_search WHERE publication_search MATCH ?');
    expect(bound.parameters).toEqual(['fixture', '"hunter"*', 11]);
  });

  it('composes author, collection, filter, tag and search in authored parameter order', () => {
    const bound = listPublicationsSql({
      author: '0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d',
      collection: 'fixture',
      filter: 'odd',
      limit: 11,
      searchMatch: '"fire"*',
      sort: 'recent',
      tag: 'high',
    });
    expect(bound.sql).toContain(
      'WHERE p.collection = ? AND p.hidden_at IS NULL AND p.owner_id = ? AND p.filter_value = ?',
    );
    expect(bound.parameters).toEqual(['fixture', '0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d', 'odd', 'high', '"fire"*', 11]);
  });
});

describe('listPublicationsSql cursor keysets', () => {
  it('compares recent pages forward with a two-column keyset', () => {
    const bound = listPublicationsSql({
      collection: 'fixture',
      cursor: cursor(),
      direction: 'next',
      limit: 11,
      sort: 'recent',
    });
    expect(bound.sql).toContain('(p.published_at < ? OR (p.published_at = ? AND p.id < ?))');
    expect(bound.parameters).toEqual([
      'fixture',
      '2026-01-01T00:00:00.000Z',
      '2026-01-01T00:00:00.000Z',
      cursor().id,
      11,
    ]);
  });

  it('compares liked pages forward with the three-column keyset', () => {
    const bound = listPublicationsSql({
      collection: 'fixture',
      cursor: cursor(),
      direction: 'next',
      limit: 11,
      sort: 'liked',
    });
    expect(bound.sql).toContain(
      '(p.like_count < ? OR (p.like_count = ? AND (\n        p.published_at < ? OR (p.published_at = ? AND p.id < ?)\n      )))',
    );
    expect(bound.parameters).toEqual([
      'fixture',
      5,
      5,
      '2026-01-01T00:00:00.000Z',
      '2026-01-01T00:00:00.000Z',
      cursor().id,
      11,
    ]);
  });

  it('flips the comparison direction for previous pages', () => {
    const bound = listPublicationsSql({
      collection: 'fixture',
      cursor: cursor(),
      direction: 'previous',
      limit: 11,
      sort: 'recent',
    });
    expect(bound.sql).toContain('(p.published_at > ? OR (p.published_at = ? AND p.id > ?))');
    expect(bound.sql).toContain('ORDER BY p.published_at ASC, p.id ASC LIMIT ?');
  });

  it('flips the liked comparison direction for previous pages', () => {
    const bound = listPublicationsSql({
      collection: 'fixture',
      cursor: cursor(),
      direction: 'previous',
      limit: 11,
      sort: 'liked',
    });
    expect(bound.sql).toContain('(p.like_count > ? OR (p.like_count = ? AND (');
    expect(bound.sql).toContain('ORDER BY p.like_count ASC, p.published_at ASC, p.id ASC LIMIT ?');
  });
});

describe('likedPublicationsSql', () => {
  it('binds the publisher id and the requested entry ids', () => {
    const bound = likedPublicationsSql('publisher-1', ['a', 'b']);
    expect(bound.sql).toContain('AND publication_id IN (?, ?)');
    expect(bound.parameters).toEqual(['publisher-1', 'a', 'b']);
  });

  it('matches nothing for an empty id list', () => {
    const bound = likedPublicationsSql('publisher-1', []);
    expect(bound.sql).toContain('AND publication_id IN (NULL)');
    expect(bound.parameters).toEqual(['publisher-1']);
  });
});
