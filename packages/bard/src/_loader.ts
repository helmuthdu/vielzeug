import { BardError, BardLoadError } from './errors';
import type { AssetDefinition, AssetManifest } from './types';

/** A decoded asset: its buffer plus optional sprite regions. */
export interface LoadedAsset {
  readonly buffer: AudioBuffer;
  readonly definition: AssetDefinition;
}

export interface Loader {
  /** The manifest definition for `key`, including streamed entries. */
  definitionOf(key: string): AssetDefinition | undefined;
  dispose(): void;
  get(key: string): LoadedAsset | undefined;
  has(key: string): boolean;
  /** Every loaded key. */
  keys(): readonly string[];
  /** Decodes every manifest entry; concurrent loads of the same URL share one fetch. */
  load(manifest: AssetManifest, options?: { readonly signal?: AbortSignal }): Promise<void>;
  /** Drops assets (all when omitted); returns the dropped keys. */
  unload(keys?: string | readonly string[]): string[];
}

function normalizeDefinition(entry: string | AssetDefinition): AssetDefinition {
  return typeof entry === 'string' ? { src: entry } : entry;
}

/**
 * Fetch + `decodeAudioData` cache with per-URL deduplication and abort
 * support. Streamed assets are skipped here; `_stream.ts` owns them.
 */
export function createLoader(context: AudioContext): Loader {
  const assets = new Map<string, LoadedAsset>();
  /** Every manifest definition, including streamed entries that never decode. */
  const definitions = new Map<string, AssetDefinition>();
  /** In-flight fetch+decode per URL, shared across keys and calls. */
  const inflight = new Map<string, Promise<AudioBuffer>>();
  const controllers = new Set<AbortController>();

  const fetchDecode = (url: string, signal: AbortSignal): Promise<AudioBuffer> => {
    const existing = inflight.get(url);
    if (existing) return existing;
    const work = (async (): Promise<AudioBuffer> => {
      const response = await fetch(url, { signal });
      if (!response.ok) {
        throw new BardLoadError(`Fetching "${url}" failed with status ${response.status}.`, {
          cause: { status: response.status },
        });
      }
      const data = await response.arrayBuffer();
      try {
        return await context.decodeAudioData(data);
      } catch (cause) {
        throw new BardLoadError(`Decoding "${url}" failed.`, { cause });
      }
    })();
    inflight.set(url, work);
    // A failed shared fetch must not poison later loads of the same URL.
    work.catch(() => inflight.delete(url));
    return work;
  };

  return {
    definitionOf(key): AssetDefinition | undefined {
      return definitions.get(key) ?? assets.get(key)?.definition;
    },
    dispose(): void {
      for (const controller of controllers) controller.abort();
      controllers.clear();
      assets.clear();
      definitions.clear();
      inflight.clear();
    },
    get(key): LoadedAsset | undefined {
      return assets.get(key);
    },
    has(key): boolean {
      return assets.has(key) || definitions.get(key)?.stream === true;
    },
    keys(): readonly string[] {
      return [...new Set([...assets.keys(), ...definitions.keys()])];
    },
    async load(manifest, options): Promise<void> {
      const controller = new AbortController();
      controllers.add(controller);
      const onAbort = (): void => controller.abort();
      if (options?.signal) {
        if (options.signal.aborted) {
          controller.abort(options.signal.reason);
        } else {
          options.signal.addEventListener('abort', onAbort, { once: true });
        }
      }
      try {
        await Promise.all(
          Object.entries(manifest).map(async ([key, raw]) => {
            const definition = normalizeDefinition(raw);
            definitions.set(key, definition);
            if (definition.stream || assets.has(key)) return;
            try {
              const buffer = await fetchDecode(definition.src, controller.signal);
              if (controller.signal.aborted) return;
              assets.set(key, { buffer, definition });
            } catch (cause) {
              if (cause instanceof BardError) throw cause;
              throw new BardLoadError(`Loading "${key}" failed.`, { cause });
            }
          }),
        );
      } finally {
        options?.signal?.removeEventListener('abort', onAbort);
        controllers.delete(controller);
      }
    },
    unload(keys): string[] {
      const list =
        keys === undefined
          ? [...new Set([...assets.keys(), ...definitions.keys()])]
          : typeof keys === 'string'
            ? [keys]
            : [...keys];
      for (const key of list) {
        assets.delete(key);
        definitions.delete(key);
      }
      return list;
    },
  };
}

/** Parses a `'key:sprite'` reference into its parts; returns `null` for plain keys. */
export function parseSpriteKey(key: string): { asset: string; sprite: string } | null {
  const index = key.indexOf(':');
  if (index <= 0) return null;
  return { asset: key.slice(0, index), sprite: key.slice(index + 1) };
}

/** Validates a sprite region against its buffer; throws `BardError` when out of bounds. */
export function resolveSprite(asset: LoadedAsset, sprite: string, key: string): { offset: number; duration: number } {
  const region = asset.definition.sprites?.[sprite];
  if (!region) throw new BardError(`Asset "${asset.definition.src}" has no sprite "${key}".`);
  const [offset, duration] = region;
  if (offset < 0 || duration <= 0 || offset + duration > asset.buffer.duration + 1e-6) {
    throw new BardError(`Sprite "${key}" region [${offset}, ${offset + duration}] exceeds the asset duration.`);
  }
  return { duration, offset };
}
