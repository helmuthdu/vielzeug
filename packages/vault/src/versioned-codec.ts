import type { VaultCodec } from './ttl';

import { VaultError } from './errors';

/**
 * A single version entry in a `createVersionedCodec` definition.
 * `version` must be a non-negative integer. `codec` is the codec responsible for
 * encoding/decoding records that carry this version number.
 */
export type CodecVersion = {
  codec: VaultCodec;
  version: number;
};

/**
 * Creates a versioned codec that prepends a `__v` field to every encoded envelope.
 * When decoding, the `__v` field selects the matching codec from `versions`.
 * This allows safe codec upgrades: old records encoded with a previous codec continue
 * to decode correctly as long as the old codec remains in `versions`.
 *
 * ```ts
 * const v1Codec: VaultCodec = { ... };
 * const v2Codec: VaultCodec = { ... }; // newer, more compact format
 *
 * const codec = createVersionedCodec([
 *   { version: 1, codec: v1Codec },
 *   { version: 2, codec: v2Codec },
 * ], 2); // write new records with version 2
 *
 * const db = createMemory({ schema, codec });
 * // Old records (version 1) are decoded by v1Codec; new records use v2Codec.
 * ```
 *
 * **Rules:**
 * - `currentVersion` must be one of the versions listed in `versions`.
 * - Version numbers must be unique non-negative integers.
 * - The current version's codec is used for all new writes.
 * - Unrecognised `__v` values cause `decode` to return `undefined` (treated as corrupt).
 * - **Migration note:** records written by any other codec (including `defaultCodec`) lack
 *   the `__v` field and will decode as `undefined` — they will be treated as missing/expired.
 *   Perform a data migration or clear the store before switching to a versioned codec.
 */
export function createVersionedCodec(versions: CodecVersion[], currentVersion: number): VaultCodec {
  if (versions.length === 0) {
    throw new VaultError('createVersionedCodec: at least one version entry is required');
  }

  const byVersion = new Map<number, VaultCodec>();

  for (const entry of versions) {
    if (!Number.isInteger(entry.version) || entry.version < 0) {
      throw new VaultError(
        `createVersionedCodec: version must be a non-negative integer, got ${String(entry.version)}`,
      );
    }

    if (byVersion.has(entry.version)) {
      throw new VaultError(`createVersionedCodec: duplicate version ${String(entry.version)}`);
    }

    byVersion.set(entry.version, entry.codec);
  }

  if (!byVersion.has(currentVersion)) {
    throw new VaultError(`createVersionedCodec: currentVersion ${String(currentVersion)} is not listed in versions`);
  }

  const writeCodec = byVersion.get(currentVersion)!;

  return {
    decode<T>(raw: unknown): { expiresAt?: number; value: T } | undefined {
      if (typeof raw !== 'object' || raw === null || !('__v' in raw)) {
        return undefined;
      }

      const wrapper = raw as { __d: unknown; __v: unknown };
      const version = wrapper.__v;

      if (typeof version !== 'number') return undefined;

      const codec = byVersion.get(version);

      if (!codec) return undefined;

      return codec.decode<T>(wrapper.__d);
    },

    encode<T>(value: T, expiresAt?: number): unknown {
      return { __d: writeCodec.encode(value, expiresAt), __v: currentVersion };
    },
  };
}
