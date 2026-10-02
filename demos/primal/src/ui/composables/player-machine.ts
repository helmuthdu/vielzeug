import { defineMachine } from '@vielzeug/clockwork';

/**
 * The music player's lifecycle as a finite machine: consent → loading → playback.
 *
 * The machine owns what was previously scattered mutable flags: `pendingPlay`,
 * `creatingPlayer`, `playing`, and the autoplay intent, and makes the failure
 * modes structurally impossible instead of conventionally avoided:
 *
 * - The double-create race: an OPEN or PLAY arriving while the player is still
 *   building re-enters the `loading` state, which aborts and restarts the single
 *   in-flight construction instead of stacking a second player over the first.
 * - The stale `playing` flag: playback state mirrors YouTube's own states, and
 *   same-state events are ignored: the 500 ms heal is an idempotent send.
 * - The autoplay intent: requested-but-never-observed playback survives in the
 *   context until playing is seen, so a browser that rejected the gesture-less
 *   first attempt retries on the first real tap.
 *
 * Everything continuous: time, volume, the crossfade, DOM placement: stays in
 * the composable; this machine is only the discrete part, pure and testable.
 */

export type PlayerEvent =
  /** Ensure a player exists: the bar's open intent. */
  | { type: 'OPEN' }
  /** Ensure a player and start playback once it exists. */
  | { type: 'PLAY' }
  /** The bar closed: playback intents cancel. */
  | { type: 'CLOSE' }
  | { type: 'PAUSE' }
  | { type: 'CONSENT_DECIDED'; allowed: boolean }
  | { type: 'PLAYER_READY' }
  | { type: 'CREATE_FAILED' }
  /** YouTube's own state numbers, mirrored from its events and the heal poll. */
  | { type: 'YT_STATE'; data: number };

export type PlayerContext = {
  /** Playback requested but never observed: keeps the gesture retry alive. */
  readonly autoplayWanted: boolean;
  /** The user asked for the bar. Survives a consent rejection until the grant. */
  readonly barWanted: boolean;
  /** `null` = never asked (the banner may show), `false` = rejected, `true` = granted. */
  readonly consentAllowed: boolean | null;
};

export interface PlayerMachineDeps {
  /**
   * Loads the YouTube API script and constructs the player. Re-entering `loading`
   * aborts the previous call's `signal`: a restarted construction must check it
   * before building, so exactly one player ever exists.
   */
  buildPlayer(args: { readonly signal: AbortSignal }): Promise<void>;
  pause(): void;
  play(): void;
  /** Shows the consent banner. */
  requestConsent(): void;
}

/** Guard: the event's YouTube state number is `expected`. */
const ytState =
  (expected: number) =>
  (args: { readonly event: { readonly data: number } }): boolean =>
    args.event.data === expected;

export function createPlayerMachine(deps: PlayerMachineDeps) {
  return defineMachine<PlayerContext, PlayerEvent>()({
    context: { autoplayWanted: false, barWanted: false, consentAllowed: null },
    initial: 'idle',
    states: {
      buffering: {
        on: {
          CLOSE: {
            effects: [() => deps.pause()],
            reduce: ({ context }) => ({ ...context, autoplayWanted: false, barWanted: false }),
            target: 'paused',
          },
          OPEN: { reduce: ({ context }) => ({ ...context, barWanted: true }), target: 'buffering' },
          PAUSE: {
            effects: [() => deps.pause()],
            reduce: ({ context }) => ({ ...context, autoplayWanted: false }),
            target: 'paused',
          },
          // A play intent while buffering (the gesture retry, a re-fired onReady) must
          // not be eaten: without this handler the intent vanished: no retry armed,
          // no playback: leaving music that never starts.
          PLAY: {
            effects: [() => deps.play()],
            reduce: ({ context }) => ({ ...context, autoplayWanted: true }),
            target: 'buffering',
          },
          YT_STATE: [
            {
              guard: ytState(1),
              // Playing music is itself a bar intent: transport controls must exist,
              // so background-started playback (auto-play, the boot open) keeps the
              // bar open across the pause that follows.
              reduce: ({ context }) => ({ ...context, autoplayWanted: false, barWanted: true }),
              target: 'playing',
            },
            { guard: ytState(2), target: 'paused' },
            { guard: ytState(0), target: 'paused' },
            // Cued (5) and unstarted (-1) are not-playing too: without these
            // guards the heal poll could not recover a player that stopped itself.
            { guard: ytState(5), target: 'paused' },
            { guard: ytState(-1), target: 'paused' },
          ],
        },
      },
      consentPending: {
        entry: [() => deps.requestConsent()],
        on: {
          CLOSE: { reduce: ({ context }) => ({ ...context, autoplayWanted: false, barWanted: false }), target: 'idle' },
          CONSENT_DECIDED: [
            {
              guard: ({ event }) => event.allowed,
              reduce: ({ context, event }) => ({ ...context, consentAllowed: event.allowed }),
              target: 'loading',
            },
            // Rejected: the bar stays closed; the intent survives for a later grant.
            { reduce: ({ context, event }) => ({ ...context, consentAllowed: event.allowed }), target: 'idle' },
          ],
          // An auto-play intent arriving while the banner is up: the player opened
          // with the setting on: survives the decision like any other intent.
          PLAY: {
            reduce: ({ context }) => ({ ...context, autoplayWanted: true, barWanted: true }),
            target: 'consentPending',
          },
        },
      },
      idle: {
        on: {
          CLOSE: { reduce: ({ context }) => ({ ...context, autoplayWanted: false, barWanted: false }), target: 'idle' },
          CONSENT_DECIDED: [
            {
              guard: ({ context, event }) => event.allowed && (context.autoplayWanted || context.barWanted),
              reduce: ({ context, event }) => ({ ...context, consentAllowed: event.allowed }),
              target: 'loading',
            },
            { reduce: ({ context, event }) => ({ ...context, consentAllowed: event.allowed }), target: 'idle' },
          ],
          OPEN: [
            {
              guard: ({ context }) => context.consentAllowed === true,
              reduce: ({ context }) => ({ ...context, barWanted: true }),
              target: 'loading',
            },
            { reduce: ({ context }) => ({ ...context, barWanted: true }), target: 'consentPending' },
          ],
          PLAY: [
            {
              guard: ({ context }) => context.consentAllowed === true,
              reduce: ({ context }) => ({ ...context, autoplayWanted: true, barWanted: true }),
              target: 'loading',
            },
            {
              reduce: ({ context }) => ({ ...context, autoplayWanted: true, barWanted: true }),
              target: 'consentPending',
            },
          ],
        },
      },
      loading: {
        invoke: [
          {
            onDone: () => ({ type: 'PLAYER_READY' }),
            onError: () => ({ type: 'CREATE_FAILED' }),
            src: (args) => deps.buildPlayer(args),
          },
        ],
        on: {
          CREATE_FAILED: { target: 'idle' },
          // Open and play intents during the load only update the context: the
          // re-entry restarts the single in-flight construction (abort + rebuild).
          OPEN: { reduce: ({ context }) => ({ ...context, barWanted: true }), target: 'loading' },
          PLAY: { reduce: ({ context }) => ({ ...context, autoplayWanted: true, barWanted: true }), target: 'loading' },
          PLAYER_READY: { target: 'paused' },
        },
      },
      paused: {
        on: {
          CLOSE: {
            effects: [() => deps.pause()],
            reduce: ({ context }) => ({ ...context, autoplayWanted: false, barWanted: false }),
            target: 'paused',
          },
          // A pre-loaded player exists without the bar; opening it is only a wish
          // update: the player is already built.
          OPEN: { reduce: ({ context }) => ({ ...context, barWanted: true }), target: 'paused' },
          PLAY: {
            effects: [() => deps.play()],
            reduce: ({ context }) => ({ ...context, autoplayWanted: true }),
            target: 'paused',
          },
          YT_STATE: [
            {
              guard: ytState(1),
              // Playing music is itself a bar intent: transport controls must exist,
              // so background-started playback (auto-play, the boot open) keeps the
              // bar open across the pause that follows.
              reduce: ({ context }) => ({ ...context, autoplayWanted: false, barWanted: true }),
              target: 'playing',
            },
            { guard: ytState(3), target: 'buffering' },
          ],
        },
      },
      playing: {
        on: {
          CLOSE: {
            effects: [() => deps.pause()],
            reduce: ({ context }) => ({ ...context, autoplayWanted: false, barWanted: false }),
            target: 'paused',
          },
          OPEN: { reduce: ({ context }) => ({ ...context, barWanted: true }), target: 'playing' },
          PAUSE: {
            effects: [() => deps.pause()],
            reduce: ({ context }) => ({ ...context, autoplayWanted: false }),
            target: 'paused',
          },
          YT_STATE: [
            { guard: ytState(2), target: 'paused' },
            { guard: ytState(3), target: 'buffering' },
            { guard: ytState(0), target: 'paused' },
            // Cued (5) and unstarted (-1) are not-playing too: without these
            // guards the heal poll could not recover a player that stopped itself.
            { guard: ytState(5), target: 'paused' },
            { guard: ytState(-1), target: 'paused' },
          ],
        },
      },
    },
  });
}
