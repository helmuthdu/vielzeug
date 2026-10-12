-- The auth issuer's own database: accounts by email, single-use magic-link tokens
-- stored as SHA-256 hashes so a database leak never leaks usable links, and the
-- durable per-account send budget that is independent of token consumption.

-- One row per email that requested a link. The row exists from the first link
-- request (last_sign_in_at NULL until a link is used); the scheduled sweep removes
-- never-verified rows once they hold no live token and no open send window.
CREATE TABLE auth_users (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL UNIQUE CHECK (email = lower(email) AND length(email) <= 320),
  created_at TEXT NOT NULL,
  last_sign_in_at TEXT,
  session_version INTEGER NOT NULL DEFAULT 0 CHECK (session_version BETWEEN 0 AND 9007199254740991)
) STRICT;

CREATE TABLE auth_schema_meta (
  id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
  applied INTEGER NOT NULL CHECK (applied >= 0)
) STRICT;
INSERT INTO auth_schema_meta (id, applied) VALUES (1, 1);

CREATE TABLE auth_tokens (
  -- The SHA-256 hex of the base64url token bytes; never the token itself.
  token_hash TEXT PRIMARY KEY NOT NULL CHECK (length(token_hash) = 64),
  user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  -- Epoch milliseconds.
  expires_at INTEGER NOT NULL,
  -- Transient redemption timestamp: the trigger stamps the account and removes
  -- this credential within the same statement, including on a trigger failure.
  redeemed_at TEXT
) STRICT;

CREATE TRIGGER auth_token_redeemed AFTER UPDATE OF redeemed_at ON auth_tokens
WHEN NEW.redeemed_at IS NOT NULL
BEGIN
  UPDATE auth_users SET last_sign_in_at = NEW.redeemed_at WHERE id = NEW.user_id;
  DELETE FROM auth_tokens WHERE token_hash = NEW.token_hash;
END;

CREATE INDEX auth_tokens_expiry ON auth_tokens(expires_at);
CREATE INDEX auth_tokens_user ON auth_tokens(user_id);

CREATE TRIGGER auth_sessions_revoked AFTER UPDATE OF session_version ON auth_users
WHEN NEW.session_version != OLD.session_version
BEGIN
  DELETE FROM auth_tokens WHERE user_id = NEW.id;
END;

-- The hourly send allowance: a fixed window opened by the first send. Consuming
-- or expiring a token never refunds it; only the window's end does.
CREATE TABLE auth_link_budget (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  -- Epoch milliseconds the current window opened.
  window_start INTEGER NOT NULL,
  sent INTEGER NOT NULL CHECK (sent >= 1)
) STRICT;

CREATE INDEX auth_link_budget_window ON auth_link_budget(window_start);

-- Singleton fixed-window admission budget, shared by every issuer isolate.
CREATE TABLE auth_sign_in_budget (
  id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
  window_start INTEGER NOT NULL,
  admitted INTEGER NOT NULL CHECK (admitted BETWEEN 1 AND 20)
) STRICT;
