-- The community-archive D1 schema: the canonical, collection-agnostic DDL owned by
-- @vielzeug/archive. Deployments point wrangler's `migrations_dir` here (or copy this
-- file into their own migration chain) and never edit its shape — the runtime SQL in
-- the package is written against exactly this schema, and the package's own
-- integration suite runs against this same file. The collection dimension is data
-- (the `collection` column and `publication_tags` rows), never DDL.

CREATE TABLE publishers (
  id TEXT PRIMARY KEY NOT NULL,
  issuer TEXT NOT NULL,
  subject TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '' CHECK (length(display_name) <= 24),
  created_at TEXT NOT NULL,
  UNIQUE (issuer, subject)
) STRICT;

CREATE TABLE revoked_subjects (
  issuer TEXT NOT NULL,
  subject TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (issuer, subject)
) STRICT;
CREATE INDEX idx_revoked_subjects_expiry ON revoked_subjects(expires_at);

CREATE TABLE publications (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
  collection TEXT NOT NULL CHECK (length(collection) BETWEEN 1 AND 32),
  client_key TEXT NOT NULL,
  schema_version INTEGER NOT NULL CHECK (schema_version >= 1),
  content_version INTEGER NOT NULL CHECK (content_version >= 1),
  payload_json TEXT NOT NULL CHECK (
    json_valid(payload_json) AND json_type(payload_json) = 'object'
    AND length(CAST(payload_json AS BLOB)) <= 8192
  ),
  content_hash TEXT NOT NULL CHECK (length(content_hash) = 64),
  filter_value TEXT NULL,
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 128),
  tags_json TEXT NOT NULL CHECK (
    json_valid(tags_json) AND json_type(tags_json) = 'array'
    AND json_array_length(tags_json) <= 16
  ),
  published_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  like_count INTEGER NOT NULL DEFAULT 0 CHECK (like_count >= 0),
  -- Operator moderation: set while an operator has removed the entry from public
  -- view. The row, its likes and its retry key stay intact — only the public
  -- surfaces and owner edits stop serving it.
  hidden_at TEXT NULL,
  UNIQUE (collection, owner_id, client_key)
) STRICT;

CREATE INDEX publications_collection_recent ON publications(collection, published_at DESC, id DESC);
CREATE INDEX publications_collection_liked ON publications(collection, like_count DESC, published_at DESC, id DESC);
CREATE INDEX publications_collection_filter ON publications(collection, filter_value);
CREATE INDEX publications_owner ON publications(owner_id, collection, published_at DESC, id DESC);

CREATE TABLE publication_tags (
  publication_id TEXT NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  PRIMARY KEY (publication_id, tag)
) STRICT;

CREATE INDEX publication_tags_filter ON publication_tags(tag, publication_id);

CREATE TABLE likes (
  publication_id TEXT NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  publisher_id TEXT NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (publication_id, publisher_id)
) STRICT;

CREATE INDEX likes_publisher ON likes(publisher_id, created_at DESC, publication_id DESC);

-- A removed publication retains only its retry key and hash until expiry, not its content.
CREATE TABLE publication_requests (
  owner_id TEXT NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
  collection TEXT NOT NULL,
  client_key TEXT NOT NULL,
  payload_hash TEXT NOT NULL CHECK (length(payload_hash) = 64),
  publication_id TEXT REFERENCES publications(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (owner_id, collection, client_key)
) STRICT;

CREATE INDEX publication_requests_expiry ON publication_requests(expires_at);

-- Reader abuse reports, idempotent per (entry, reporter); the operator queue reads
-- them newest-first.
CREATE TABLE publication_reports (
  id TEXT PRIMARY KEY NOT NULL,
  publication_id TEXT NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  reporter_id TEXT NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (length(trim(reason)) BETWEEN 1 AND 256),
  created_at TEXT NOT NULL,
  resolved_at TEXT NULL,
  UNIQUE (publication_id, reporter_id)
) STRICT;

CREATE INDEX publication_reports_recent ON publication_reports(created_at DESC, id DESC);
CREATE INDEX publication_reports_owner ON publication_reports(reporter_id, created_at DESC, id DESC);

-- The operator accountability log: every effective moderation action, appended in the
-- same transaction that applies it. No foreign keys by design — the audit must
-- outlive the rows it references (a removal deletes its own target, an operator's
-- own erasure must not erase their history) — and no content either: operator and
-- target ids, the action kind, and the time are the whole record. `collection` is
-- NULL only for the deployment-wide publisher erasure.
CREATE TABLE moderation_actions (
  id TEXT PRIMARY KEY NOT NULL,
  operator_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('hide', 'unhide', 'remove', 'erase-publisher')),
  collection TEXT NULL CHECK (collection IS NULL OR (length(collection) BETWEEN 1 AND 32)),
  target_id TEXT NOT NULL,
  created_at TEXT NOT NULL
) STRICT;

CREATE INDEX moderation_actions_recent ON moderation_actions(created_at DESC, id DESC);

CREATE VIRTUAL TABLE publication_search USING fts5(
  title,
  content = 'publications',
  content_rowid = 'rowid',
  tokenize = 'unicode61'
);

CREATE TRIGGER publications_tags_insert AFTER INSERT ON publications BEGIN
  INSERT INTO publication_tags(publication_id, tag)
  SELECT NEW.id, value FROM json_each(NEW.tags_json);
END;

CREATE TRIGGER publications_tags_update
AFTER UPDATE OF tags_json ON publications
WHEN NEW.tags_json <> OLD.tags_json BEGIN
  DELETE FROM publication_tags WHERE publication_id = NEW.id;
  INSERT INTO publication_tags(publication_id, tag)
  SELECT NEW.id, value FROM json_each(NEW.tags_json);
END;

CREATE TRIGGER publications_search_insert AFTER INSERT ON publications BEGIN
  INSERT INTO publication_search(rowid, title) VALUES (NEW.rowid, NEW.title);
END;

CREATE TRIGGER publications_search_delete AFTER DELETE ON publications BEGIN
  INSERT INTO publication_search(publication_search, rowid, title)
  VALUES ('delete', OLD.rowid, OLD.title);
END;

CREATE TRIGGER publications_search_update
AFTER UPDATE OF title ON publications
WHEN NEW.title <> OLD.title BEGIN
  INSERT INTO publication_search(publication_search, rowid, title)
  VALUES ('delete', OLD.rowid, OLD.title);
  INSERT INTO publication_search(rowid, title) VALUES (NEW.rowid, NEW.title);
END;

CREATE TRIGGER likes_insert AFTER INSERT ON likes BEGIN
  UPDATE publications SET like_count = like_count + 1 WHERE id = NEW.publication_id;
END;

CREATE TRIGGER likes_delete AFTER DELETE ON likes BEGIN
  UPDATE publications SET like_count = like_count - 1 WHERE id = OLD.publication_id;
END;

-- The storage schema stamp health reads back: one ordinary row, because D1 does not
-- authorize PRAGMA writes. The value must equal ARCHIVE_SCHEMA_VERSION in the
-- package; a database reporting a different stamp answers health 'degraded'.
CREATE TABLE archive_schema_meta (
  applied INTEGER NOT NULL CHECK (applied >= 1)
) STRICT;
INSERT INTO archive_schema_meta(applied) VALUES (1);
