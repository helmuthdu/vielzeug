import { BardError } from './errors';
import type { AssetMeta } from './types';

export interface MediaSessionOwner {
  release(): void;
  setMetadata(meta: AssetMeta | undefined, key: string): void;
  setPlaybackState(state: MediaSessionPlaybackState): void;
}

export interface MediaSessionManager {
  /** Claims the page-global `navigator.mediaSession`; a second owner throws. */
  claim(handlers: {
    onPlay(): void;
    onPause(): void;
    onStop(): void;
    onNextTrack(): void;
    onPreviousTrack(): void;
  }): MediaSessionOwner;
}

type SessionAction = 'play' | 'pause' | 'stop' | 'nexttrack' | 'previoustrack';

/**
 * `navigator.mediaSession` is a page-global singleton, so bard treats it as a
 * claimable resource: at most one deck may own it, and claiming twice throws
 * instead of silently stealing hardware controls from the first owner.
 */
export function createMediaSession(): MediaSessionManager {
  let claimed = false;
  return {
    claim(handlers) {
      if (claimed) throw new BardError('Another deck already owns navigator.mediaSession.');
      const session = typeof navigator === 'undefined' ? undefined : navigator.mediaSession;
      if (!session) throw new BardError('This runtime does not provide navigator.mediaSession.');
      claimed = true;
      const bindings: ReadonlyArray<readonly [SessionAction, () => void]> = [
        ['play', handlers.onPlay],
        ['pause', handlers.onPause],
        ['stop', handlers.onStop],
        ['nexttrack', handlers.onNextTrack],
        ['previoustrack', handlers.onPreviousTrack],
      ];
      for (const [action, handler] of bindings) {
        try {
          session.setActionHandler(action, handler);
        } catch {
          // Unsupported action on this platform.
        }
      }
      return {
        release(): void {
          for (const [action] of bindings) {
            try {
              session.setActionHandler(action, null);
            } catch {
              // Already cleared.
            }
          }
          session.metadata = null;
          claimed = false;
        },
        setMetadata(meta, key): void {
          if (!meta) {
            session.metadata = null;
            return;
          }
          session.metadata = new MediaMetadata({
            album: meta.album ?? '',
            artist: meta.artist ?? '',
            artwork: (meta.artwork ?? []).map((image) => ({
              sizes: image.sizes ?? '',
              src: image.src,
              type: image.type ?? '',
            })),
            title: meta.title ?? key,
          });
        },
        setPlaybackState(state): void {
          try {
            session.playbackState = state;
          } catch {
            // Read-only on some platforms.
          }
        },
      };
    },
  };
}
