import { BardLoadError } from './errors';
import type { AssetDefinition } from './types';

/** A streamed asset: an owned `<audio>` element wrapped once in a MediaElementSource. */
export interface StreamedAsset {
  readonly definition: AssetDefinition;
  disconnect(): void;
  readonly duration: number;
  readonly element: HTMLAudioElement;
  /** Resolves once the element reports playable metadata. */
  readonly ready: Promise<void>;
  readonly source: MediaElementAudioSourceNode;
}

export interface StreamManager {
  dispose(): void;
  /** Creates (once) and returns the stream for a key. */
  ensure(key: string, definition: AssetDefinition): StreamedAsset;
  get(key: string): StreamedAsset | undefined;
}

/**
 * Long-form tracks play through an owned `HTMLAudioElement` so mobile devices
 * never spike RAM decoding a ten-minute ambient file. Bard creates the
 * element, requests CORS, and wraps it exactly once: an element can only ever
 * be routed through `createMediaElementSource` a single time.
 */
export function createStreams(context: AudioContext): StreamManager {
  const streams = new Map<string, StreamedAsset>();

  return {
    dispose(): void {
      for (const stream of streams.values()) stream.disconnect();
      streams.clear();
    },
    ensure(key, definition): StreamedAsset {
      const existing = streams.get(key);
      if (existing) return existing;
      const element = document.createElement('audio');
      element.crossOrigin = 'anonymous';
      element.preload = 'auto';
      element.src = definition.src;
      // The node must exist before playback or the sound bypasses the graph.
      const source = context.createMediaElementSource(element);
      let settle!: () => void;
      let reject!: (reason: unknown) => void;
      const outcome = new Promise<void>((resolve, rejectFn) => {
        settle = resolve;
        reject = rejectFn;
      });
      // A rejection with no immediate await would surface as an unhandled
      // rejection; the deck awaits it, and the catch here keeps it quiet.
      outcome.catch(() => {});
      const onReady = (): void => {
        settle();
      };
      const onError = (): void => {
        reject(new BardLoadError(`Streaming "${key}" failed to load "${definition.src}".`));
      };
      element.addEventListener('canplay', onReady, { once: true });
      element.addEventListener('error', onError, { once: true });
      const asset: StreamedAsset = {
        definition,
        disconnect(): void {
          element.removeEventListener('canplay', onReady);
          element.removeEventListener('error', onError);
          element.pause();
          element.removeAttribute('src');
          source.disconnect();
        },
        get duration(): number {
          return element.duration;
        },
        element,
        ready: outcome,
        source,
      };
      streams.set(key, asset);
      return asset;
    },
    get(key): StreamedAsset | undefined {
      return streams.get(key);
    },
  };
}
