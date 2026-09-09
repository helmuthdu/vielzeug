/**
 * Store-author interfaces for implementing custom Postmaster stores.
 *
 * Common consumers should import from `@vielzeug/postmaster` (the root
 * entry point) which exposes only job definitions and the processor.
 * This subpath is for store authors who need `StoredJob`, `StoreTx`,
 * and `PostmasterStore` to implement a durable backend.
 */
export type {
  EntryFilter,
  PostmasterStats,
  PostmasterStore,
  StoredFailure,
  StoredJob,
  StoreTx,
} from './types.ts';
