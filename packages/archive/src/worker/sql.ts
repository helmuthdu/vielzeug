/**
 * The runtime SQL the package-owned migration (`packages/archive/migrations/`) must
 * serve. The collection dimension is data (`collection` column, `publication_tags`),
 * never DDL. The migration also stamps the storage schema (`archive_schema_meta`,
 * equal to `ARCHIVE_SCHEMA_VERSION`), which health reads back.
 */

/** SQL is centralized so every mutation's ownership and no-op predicates are reviewable. */
export const SQL = {
  auditErasure: `INSERT INTO moderation_actions(id, operator_id, action, collection, target_id, created_at)
    SELECT ?, ?, 'erase-publisher', NULL, id, ? FROM publishers WHERE id = ?`,
  auditHide: `INSERT INTO moderation_actions(id, operator_id, action, collection, target_id, created_at)
    SELECT ?, ?, ?, collection, id, ? FROM publications
    WHERE id = ? AND collection = ? AND (hidden_at IS NOT NULL) <> ?`,
  auditRemoval: `INSERT INTO moderation_actions(id, operator_id, action, collection, target_id, created_at)
    SELECT ?, ?, 'remove', collection, id, ? FROM publications WHERE id = ? AND collection = ?`,
  deletePublisher: `DELETE FROM publishers WHERE id = ?`,
  deleteSubjectPublisher: `DELETE FROM publishers WHERE issuer = ? AND subject = ?`,
  expireRequests: `DELETE FROM publication_requests WHERE expires_at <= ?`,
  expireRevocations: `DELETE FROM revoked_subjects WHERE expires_at <= ?`,
  hidePublication: `UPDATE publications SET hidden_at = ?
    WHERE id = ? AND collection = ? AND hidden_at IS NULL`,
  insertLike: `INSERT INTO likes(publication_id, publisher_id, created_at)
    SELECT id, ?, ? FROM publications WHERE id = ? AND hidden_at IS NULL
    ON CONFLICT(publication_id, publisher_id) DO NOTHING`,
  insertPublication: `INSERT INTO publications(
      id, owner_id, collection, client_key, schema_version, content_version, payload_json,
      content_hash, filter_value, title, tags_json, published_at, updated_at
    ) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    WHERE (SELECT count(*) FROM publications WHERE owner_id = ? AND collection = ?) < ?
      AND NOT EXISTS (
        SELECT 1 FROM publication_requests
        WHERE owner_id = ? AND collection = ? AND client_key = ? AND expires_at > ?
      )
    ON CONFLICT(collection, owner_id, client_key) DO NOTHING`,
  insertPublisher: `INSERT INTO publishers(id, issuer, subject, display_name, created_at)
    SELECT ?, ?, ?, ?, ?
    WHERE NOT EXISTS (SELECT 1 FROM revoked_subjects WHERE issuer = ? AND subject = ? AND expires_at > ?)
    ON CONFLICT(issuer, subject) DO NOTHING`,
  insertReport: `INSERT INTO publication_reports(id, publication_id, reporter_id, reason, created_at)
    SELECT ?, id, ?, ?, ? FROM publications WHERE id = ? AND collection = ? AND hidden_at IS NULL
    ON CONFLICT(publication_id, reporter_id) DO NOTHING`,
  insertRequest: `INSERT INTO publication_requests(
      owner_id, collection, client_key, payload_hash, publication_id, created_at, expires_at
    ) SELECT ?, ?, ?, ?, p.id, ?, ? FROM publications p
    WHERE p.owner_id = ? AND p.collection = ? AND p.client_key = ? AND p.content_hash = ?
    ON CONFLICT(owner_id, collection, client_key) DO NOTHING`,
  likeState: `SELECT p.id, p.like_count, EXISTS(SELECT 1 FROM likes l WHERE l.publication_id = p.id AND l.publisher_id = ?) AS liked FROM publications p WHERE p.id = ? AND p.hidden_at IS NULL`,
  ownPublications: `SELECT p.*, u.display_name AS author_name
    FROM publications p JOIN publishers u ON u.id = p.owner_id
    WHERE p.owner_id = ? AND p.collection = ? ORDER BY p.published_at DESC, p.id DESC LIMIT ?`,
  /** The public detail row: a hidden entry is invisible to everyone but its owner. */
  publication: `SELECT p.*, u.display_name AS author_name
    FROM publications p JOIN publishers u ON u.id = p.owner_id
    WHERE p.id = ? AND p.collection = ? AND p.hidden_at IS NULL`,
  /** The owner's row regardless of moderation state: update/delete decisions need it. */
  publicationAny: `SELECT p.*, u.display_name AS author_name
    FROM publications p JOIN publishers u ON u.id = p.owner_id WHERE p.id = ? AND p.collection = ?`,
  publicationByKey: `SELECT p.*, u.display_name AS author_name
    FROM publications p JOIN publishers u ON u.id = p.owner_id
    WHERE p.owner_id = ? AND p.collection = ? AND p.client_key = ?`,
  publisher: `SELECT id, display_name, created_at FROM publishers WHERE issuer = ? AND subject = ?`,
  publisherById: `SELECT id FROM publishers WHERE id = ?`,
  removeLike: `DELETE FROM likes WHERE publication_id = ? AND publisher_id = ?
    AND EXISTS (SELECT 1 FROM publications p WHERE p.id = likes.publication_id AND p.hidden_at IS NULL)`,
  removePublication: `DELETE FROM publications WHERE id = ? AND owner_id = ?`,
  removePublicationAny: `DELETE FROM publications WHERE id = ? AND collection = ?`,
  renamePublisher: `UPDATE publishers SET display_name = ? WHERE id = ? AND display_name <> ?`,
  reportById: `SELECT r.id FROM publication_reports r JOIN publications p ON p.id = r.publication_id
    WHERE r.id = ? AND p.collection = ?`,
  request: `SELECT payload_hash, publication_id, expires_at FROM publication_requests
    WHERE owner_id = ? AND collection = ? AND client_key = ?`,
  resolveReport: `UPDATE publication_reports SET resolved_at = ?
    WHERE id = ? AND resolved_at IS NULL AND publication_id IN
      (SELECT id FROM publications WHERE collection = ?)`,
  revokedSubject: `SELECT 1 AS revoked FROM revoked_subjects WHERE issuer = ? AND subject = ? AND expires_at > ?`,
  revokeSubject: `INSERT INTO revoked_subjects(issuer, subject, expires_at) VALUES (?, ?, ?)
    ON CONFLICT(issuer, subject) DO UPDATE SET expires_at = MAX(expires_at, excluded.expires_at)`,
  /** The storage schema stamp the final migration writes; health reads it back. */
  schemaVersion: `SELECT applied FROM archive_schema_meta`,
  unhidePublication: `UPDATE publications SET hidden_at = NULL
    WHERE id = ? AND collection = ? AND hidden_at IS NOT NULL`,
  updatePublication: `UPDATE publications SET
      schema_version = ?, content_version = ?, payload_json = ?, content_hash = ?,
      filter_value = ?, title = ?, tags_json = ?, updated_at = ?, revision = revision + 1
    WHERE id = ? AND owner_id = ? AND revision = ? AND content_hash <> ? AND hidden_at IS NULL`,
} as const;

interface ForwardFilter {
  cursor: { createdAt: string; id: string } | null;
  limit: number;
}

const forwardWhere = (column: string, id: string, filter: ForwardFilter): BoundSql => ({
  parameters: filter.cursor === null ? [] : [filter.cursor.createdAt, filter.cursor.createdAt, filter.cursor.id],
  sql: filter.cursor === null ? '' : ` AND (${column} < ? OR (${column} = ? AND ${id} < ?))`,
});

export function likesPageSql(publisherId: string, filter: ForwardFilter): BoundSql {
  const cursor = forwardWhere('created_at', 'publication_id', filter);
  return {
    parameters: [publisherId, ...cursor.parameters, filter.limit],
    sql: `SELECT publication_id, created_at FROM likes WHERE publisher_id = ?${cursor.sql}
      ORDER BY created_at DESC, publication_id DESC LIMIT ?`,
  };
}

export function moderationLogSql(filter: ForwardFilter): BoundSql {
  const cursor = forwardWhere('created_at', 'id', filter);
  return {
    parameters: [...cursor.parameters, filter.limit],
    sql: `SELECT id, action, collection, operator_id, target_id, created_at FROM moderation_actions
      WHERE 1=1${cursor.sql} ORDER BY created_at DESC, id DESC LIMIT ?`,
  };
}

export function reportsPageSql(
  scope: { collection: string; resolved: boolean } | { publisherId: string },
  filter: ForwardFilter,
): BoundSql {
  const cursor = forwardWhere('r.created_at', 'r.id', filter);
  const operator = 'collection' in scope;
  return {
    parameters: [operator ? scope.collection : scope.publisherId, ...cursor.parameters, filter.limit],
    sql: `SELECT r.*, p.collection, p.title AS entry_title, u.display_name AS reporter_name
      FROM publication_reports r JOIN publications p ON p.id = r.publication_id
      JOIN publishers u ON u.id = r.reporter_id
      WHERE ${operator ? `p.collection = ? AND r.resolved_at IS ${scope.resolved ? 'NOT ' : ''}NULL` : 'r.reporter_id = ?'}
      ${cursor.sql} ORDER BY r.created_at DESC, r.id DESC LIMIT ?`,
  };
}

/** The entry-list keyset boundary: the shared cursor with its sort field resolved. */
export interface PublicationCursor {
  createdAt: string;
  id: string;
  likeCount: number;
}

export interface PublicationFilter {
  /** Restrict to one author's publisher id; omit for all authors. */
  author?: string;
  collection: string;
  /** Forward keyset boundary: `createdAt`/`id` plus the liked sort's `likeCount`. */
  cursor?: PublicationCursor;
  filter?: string;
  limit: number;
  /** Quoted word-prefix terms, normalized before reaching the SQL boundary. */
  searchMatch?: string;
  sort: 'liked' | 'recent';
  tag?: string;
}

export interface BoundSql {
  parameters: (string | number)[];
  sql: string;
}

/** Only fixed SQL fragments are combined; all filters and cursor values remain bindings. */
export function listPublicationsSql(filter: PublicationFilter): BoundSql {
  const where: string[] = [];
  const parameters: (string | number)[] = [];
  where.push('p.collection = ?');
  parameters.push(filter.collection);
  // Public lists never surface operator-hidden entries.
  where.push('p.hidden_at IS NULL');
  if (filter.author) {
    where.push('p.owner_id = ?');
    parameters.push(filter.author);
  }
  if (filter.filter) {
    where.push('p.filter_value = ?');
    parameters.push(filter.filter);
  }
  if (filter.tag) {
    where.push(`EXISTS (
      SELECT 1 FROM publication_tags t WHERE t.publication_id = p.id AND t.tag = ?
    )`);
    parameters.push(filter.tag);
  }
  if (filter.searchMatch) {
    where.push(`p.rowid IN (
      SELECT rowid FROM publication_search WHERE publication_search MATCH ?
    )`);
    parameters.push(filter.searchMatch);
  }
  // Forward-only keyset walk: every list orders DESC and the cursor is the last
  // row of the previous page.
  const cursor = filter.cursor;
  if (cursor) {
    if (filter.sort === 'liked') {
      where.push(`(p.like_count < ? OR (p.like_count = ? AND (
        p.published_at < ? OR (p.published_at = ? AND p.id < ?)
      )))`);
      parameters.push(cursor.likeCount, cursor.likeCount, cursor.createdAt, cursor.createdAt, cursor.id);
    } else {
      where.push('(p.published_at < ? OR (p.published_at = ? AND p.id < ?))');
      parameters.push(cursor.createdAt, cursor.createdAt, cursor.id);
    }
  }
  const order =
    filter.sort === 'liked' ? 'p.like_count DESC, p.published_at DESC, p.id DESC' : 'p.published_at DESC, p.id DESC';
  parameters.push(filter.limit);
  return {
    parameters,
    sql: `SELECT p.*, u.display_name AS author_name
      FROM publications p JOIN publishers u ON u.id = p.owner_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY ${order} LIMIT ?`,
  };
}

export function likedPublicationsSql(publisherId: string, publicationIds: readonly string[]): BoundSql {
  return {
    parameters: [publisherId, ...publicationIds],
    sql: `SELECT publication_id FROM likes WHERE publisher_id = ?
      AND publication_id IN (${publicationIds.map(() => '?').join(', ') || 'NULL'})`,
  };
}
