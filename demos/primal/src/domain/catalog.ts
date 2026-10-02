import type { UserPrincipal } from '@vielzeug/ward';
import type { SharedBuild } from './loadout';

/**
 * The community catalog: published build snapshots other players can browse, like and
 * import. A published entry is an immutable snapshot — the existing build code — plus
 * catalog metadata; it never mirrors later local edits. Republishing replaces the
 * snapshot on purpose, unpublishing removes the entry (and its likes) for good.
 */

/** How the online list ranks entries: explicit modes only, no vague composites. */
export type CatalogSort = 'liked' | 'recent';

/** The entry's author. `id` is opaque and stable across identity upgrades; the port owns
 * the mapping to whatever a real backend uses as its account id. */
export interface CatalogAuthor {
  id: string;
  /** Empty when the source knows no display name; views fall back to localized defaults. */
  name: string;
}

/** One published build in the catalog: the immutable snapshot plus server metadata. */
export interface CatalogEntry {
  author: CatalogAuthor;
  /** The share-code snapshot: decodable by the existing import flow, nothing more. */
  code: string;
  /** The elements the snapshot's worn equipment carries, denormalized for filtering. */
  elementIds: readonly string[];
  hunterId: string;
  id: string;
  likeCount: number;
  /** Whether the viewing principal liked this entry; drives the like toggle. */
  liked: boolean;
  name: string;
  publishedAt: string;
}

/** One page of catalog entries plus the opaque cursors around it. */
export interface CatalogPage {
  /** Cursor for the next page; null after the last. */
  cursor: string | null;
  entries: readonly CatalogEntry[];
  /** Cursor for the previous page; null when already at the top. */
  previous: string | null;
  /** How many entries match the query overall: the count line over the list. */
  totalItems: number;
}

export interface CatalogListQuery {
  /** Continue from a previous page's cursor; omit to start from the top. */
  cursor?: string;
  /** Restrict to builds whose equipment carries one element; omit for all. */
  elementId?: string;
  /** Restrict to one hunter's builds; omit for all hunters. */
  hunterId?: string;
  /** Page size; the port may clamp it. */
  limit?: number;
  /** Restrict to entries whose name contains this text; omitted or empty matches all. */
  search?: string;
  sort: CatalogSort;
}

export interface CatalogPublishInput {
  build: SharedBuild;
  /** The entry to replace when republishing an updated snapshot; omit for a new entry. */
  entryId?: string;
}

/**
 * The seam between the app and the community-catalog backend. Phase 0 ships an
 * in-process stub backed by the local vault; a real backend (Cloudflare D1 or
 * Supabase) later implements the same contract. Identity is a ward principal the
 * port mints; `null` means browsing without one, and every write requires it.
 */
export interface CatalogPort {
  /** One entry by id, or null when unknown. */
  get(id: string): Promise<CatalogEntry | null>;
  /** The viewing principal; null while browsing anonymously. */
  identity(): UserPrincipal | null;
  /** Records the principal's like; resolves with the updated entry. */
  like(id: string): Promise<CatalogEntry>;
  /** One ranked page of entries. */
  list(query: CatalogListQuery): Promise<CatalogPage>;
  /** Publishes (or with `entryId`, republishes) an immutable snapshot. */
  publish(input: CatalogPublishInput): Promise<CatalogEntry>;
  /** Removes the principal's like; resolves with the updated entry. */
  unlike(id: string): Promise<CatalogEntry>;
  /** Hard-deletes one of the principal's entries; its likes go with it. */
  unpublish(id: string): Promise<void>;
}
