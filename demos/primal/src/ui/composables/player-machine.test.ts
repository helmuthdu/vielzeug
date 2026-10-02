import { describe, expect, it, vi } from 'vitest';
import { createPlayerMachine, type PlayerMachineDeps } from './player-machine';

interface Harness {
  actor: ReturnType<ReturnType<typeof createPlayerMachine>['createActor']>;
  buildPlayer: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  play: ReturnType<typeof vi.fn>;
  requestConsent: ReturnType<typeof vi.fn>;
  /** Lets the pending `buildPlayer` calls finish so `PLAYER_READY` can arrive. */
  resolveBuild(): Promise<void>;
}

/** A machine with controlled doubles; `buildPlayer` finishes only when resolved. */
const createHarness = (): Harness => {
  const resolvers: Array<() => void> = [];
  const buildPlayer = vi.fn((args: { signal: AbortSignal }) => {
    // An aborted construction settles too: clockwork drops its result.
    args.signal.addEventListener(
      'abort',
      () => {
        resolvers.splice(0).forEach((resolve) => {
          resolve();
        });
      },
      { once: true },
    );
    return new Promise<void>((resolve) => resolvers.push(resolve));
  });
  const requestConsent = vi.fn();
  const play = vi.fn();
  const pause = vi.fn();
  const machine = createPlayerMachine({ buildPlayer, pause, play, requestConsent } satisfies PlayerMachineDeps);
  const resolveBuild = async (): Promise<void> => {
    resolvers.splice(0).forEach((resolve) => {
      resolve();
    });
    await Promise.resolve();
    await Promise.resolve();
  };
  return { actor: machine.createActor(), buildPlayer, pause, play, requestConsent, resolveBuild };
};

/** Expresses the open intent, grants consent, and waits for the paused-ready player. */
const readyPlayer = async (harness: Harness): Promise<void> => {
  harness.actor.send({ type: 'OPEN' });
  harness.actor.send({ allowed: true, type: 'CONSENT_DECIDED' });
  await vi.waitFor(() => expect(harness.buildPlayer).toHaveBeenCalledTimes(1));
  await harness.resolveBuild();
  await vi.waitFor(() => expect(harness.actor.snapshot.state).toBe('paused'));
};

describe('player machine', () => {
  it('asks for consent before loading when nobody has decided yet', () => {
    const { actor, requestConsent, buildPlayer } = createHarness();

    actor.send({ type: 'OPEN' });

    expect(actor.snapshot.state).toBe('consentPending');
    expect(requestConsent).toHaveBeenCalledTimes(1);
    expect(buildPlayer).not.toHaveBeenCalled();
    expect(actor.snapshot.context.barWanted).toBe(true);
  });

  it('loads the player once consent is granted', async () => {
    const harness = createHarness();
    harness.actor.send({ type: 'OPEN' });

    harness.actor.send({ allowed: true, type: 'CONSENT_DECIDED' });
    expect(harness.actor.snapshot.state).toBe('loading');
    await vi.waitFor(() => expect(harness.buildPlayer).toHaveBeenCalledTimes(1));

    await harness.resolveBuild();
    await vi.waitFor(() => expect(harness.actor.snapshot.state).toBe('paused'));
  });

  it('keeps the bar closed and the intent alive when consent is rejected', () => {
    const { actor } = createHarness();
    actor.send({ type: 'PLAY' });

    actor.send({ allowed: false, type: 'CONSENT_DECIDED' });

    expect(actor.snapshot.state).toBe('idle');
    expect(actor.snapshot.context).toMatchObject({ autoplayWanted: true, barWanted: true });

    // A later grant, e.g. changed in settings, still starts the load.
    actor.send({ allowed: true, type: 'CONSENT_DECIDED' });
    expect(actor.snapshot.state).toBe('loading');
  });

  it('keeps an auto-play intent that arrives while the banner is still up', () => {
    const { actor } = createHarness();

    // The player opens with auto-play on before consent has been decided.
    actor.send({ type: 'OPEN' });
    actor.send({ type: 'PLAY' });

    expect(actor.snapshot.state).toBe('consentPending');
    expect(actor.snapshot.context).toMatchObject({ autoplayWanted: true, barWanted: true });

    // The grant loads the player with the intent intact: ready fires it.
    actor.send({ allowed: true, type: 'CONSENT_DECIDED' });
    expect(actor.snapshot.state).toBe('loading');
    expect(actor.snapshot.context.autoplayWanted).toBe(true);
  });

  it('aborts and restarts the single construction when OPEN re-enters loading', async () => {
    const harness = createHarness();
    harness.actor.send({ type: 'OPEN' });
    harness.actor.send({ allowed: true, type: 'CONSENT_DECIDED' });
    await vi.waitFor(() => expect(harness.buildPlayer).toHaveBeenCalledTimes(1));

    // The user opens the bar while the player is still building: the in-flight
    // construction is aborted and restarted, never duplicated.
    harness.actor.send({ type: 'OPEN' });

    expect(harness.actor.snapshot.state).toBe('loading');
    expect(harness.actor.snapshot.context.barWanted).toBe(true);
    await vi.waitFor(() => expect(harness.buildPlayer).toHaveBeenCalledTimes(2));
    expect(harness.buildPlayer.mock.calls[0]![0].signal.aborted).toBe(true);
    expect(harness.buildPlayer.mock.calls[1]![0].signal.aborted).toBe(false);

    // The restart's completion is the one that readies the player.
    await harness.resolveBuild();
    await vi.waitFor(() => expect(harness.actor.snapshot.state).toBe('paused'));
  });

  it('plays on command and mirrors YouTube playing state', async () => {
    const harness = createHarness();
    await readyPlayer(harness);

    harness.actor.send({ type: 'PLAY' });
    expect(harness.play).toHaveBeenCalledTimes(1);
    expect(harness.actor.snapshot.context.autoplayWanted).toBe(true);

    harness.actor.send({ data: 1, type: 'YT_STATE' });
    expect(harness.actor.snapshot.state).toBe('playing');
    expect(harness.actor.snapshot.context.autoplayWanted).toBe(false);
  });

  it('closes from playing: pauses and cancels the autoplay intent', async () => {
    const harness = createHarness();
    await readyPlayer(harness);
    harness.actor.send({ type: 'PLAY' });
    harness.actor.send({ data: 1, type: 'YT_STATE' });

    harness.actor.send({ type: 'CLOSE' });

    expect(harness.actor.snapshot.state).toBe('paused');
    expect(harness.pause).toHaveBeenCalledTimes(1);
    expect(harness.actor.snapshot.context).toMatchObject({ autoplayWanted: false, barWanted: false });
  });

  it('pauses on command without touching the bar intent', async () => {
    const harness = createHarness();
    await readyPlayer(harness);
    harness.actor.send({ type: 'PLAY' });
    harness.actor.send({ data: 1, type: 'YT_STATE' });

    harness.actor.send({ type: 'PAUSE' });

    expect(harness.actor.snapshot.state).toBe('paused');
    expect(harness.pause).toHaveBeenCalledTimes(1);
    expect(harness.actor.snapshot.context.barWanted).toBe(true);
  });

  it('keeps the bar wanted after pausing started playback', async () => {
    const harness = createHarness();
    await readyPlayer(harness);

    // Playback starts; playing music is itself a bar intent.
    harness.actor.send({ type: 'PLAY' });
    harness.actor.send({ data: 1, type: 'YT_STATE' });
    expect(harness.actor.snapshot.context.barWanted).toBe(true);

    // Pausing keeps the bar open: only CLOSE retires the wish.
    harness.actor.send({ type: 'PAUSE' });
    expect(harness.actor.snapshot.state).toBe('paused');
    expect(harness.actor.snapshot.context.barWanted).toBe(true);

    harness.actor.send({ type: 'CLOSE' });
    expect(harness.actor.snapshot.context.barWanted).toBe(false);

    // Closing is not terminal: clicking the audio icon again reopens the bar.
    harness.actor.send({ type: 'OPEN' });
    expect(harness.actor.snapshot.state).toBe('paused');
    expect(harness.actor.snapshot.context.barWanted).toBe(true);
  });

  it('ignores same-state YouTube events: the heal poll is idempotent', async () => {
    const harness = createHarness();
    await readyPlayer(harness);
    harness.actor.send({ type: 'PLAY' });
    harness.actor.send({ data: 1, type: 'YT_STATE' });
    expect(harness.actor.snapshot.state).toBe('playing');

    expect(harness.actor.can({ data: 1, type: 'YT_STATE' })).toBe(false);
    harness.actor.send({ data: 1, type: 'YT_STATE' });
    expect(harness.actor.snapshot.state).toBe('playing');

    // The paused state ignores every other paused-shaped number (2, 5, -1).
    harness.actor.send({ data: 2, type: 'YT_STATE' });
    expect(harness.actor.snapshot.state).toBe('paused');
    expect(harness.actor.can({ data: 2, type: 'YT_STATE' })).toBe(false);
    expect(harness.actor.can({ data: 5, type: 'YT_STATE' })).toBe(false);
  });

  it('buffers between paused and playing as YouTube reports it', async () => {
    const harness = createHarness();
    await readyPlayer(harness);
    harness.actor.send({ type: 'PLAY' });

    harness.actor.send({ data: 3, type: 'YT_STATE' });
    expect(harness.actor.snapshot.state).toBe('buffering');
    harness.actor.send({ data: 1, type: 'YT_STATE' });
    expect(harness.actor.snapshot.state).toBe('playing');
    harness.actor.send({ data: 3, type: 'YT_STATE' });
    expect(harness.actor.snapshot.state).toBe('buffering');
    harness.actor.send({ data: 2, type: 'YT_STATE' });
    expect(harness.actor.snapshot.state).toBe('paused');
  });

  it('keeps a play intent that lands while buffering: it must not be eaten', async () => {
    const harness = createHarness();
    await readyPlayer(harness);
    // Auto-play's first attempt is rejected; the machine sits paused, intent kept.
    harness.actor.send({ type: 'PLAY' });

    // The retry (or a re-fired onReady) lands while YouTube is already buffering:
    // without a PLAY handler in buffering, the intent vanished: no playback, no
    // bar, no retry left armed.
    harness.actor.send({ data: 3, type: 'YT_STATE' });
    expect(harness.actor.snapshot.state).toBe('buffering');
    harness.actor.send({ type: 'PLAY' });

    expect(harness.play).toHaveBeenCalledTimes(2);
    expect(harness.actor.snapshot.context.autoplayWanted).toBe(true);

    // Playback observed → playing, and the bar opens with it.
    harness.actor.send({ data: 1, type: 'YT_STATE' });
    expect(harness.actor.snapshot.state).toBe('playing');
    expect(harness.actor.snapshot.context.barWanted).toBe(true);
  });

  it('recovers to paused when YouTube reports cued or unstarted while playing', async () => {
    const harness = createHarness();
    await readyPlayer(harness);
    harness.actor.send({ type: 'PLAY' });
    harness.actor.send({ data: 1, type: 'YT_STATE' });
    expect(harness.actor.snapshot.state).toBe('playing');

    // A player that stops itself reports cued (5) or unstarted (-1): the
    // machine must leave playing, or the bar and its controls lie.
    harness.actor.send({ data: 5, type: 'YT_STATE' });
    expect(harness.actor.snapshot.state).toBe('paused');
    harness.actor.send({ data: 1, type: 'YT_STATE' });
    harness.actor.send({ data: -1, type: 'YT_STATE' });
    expect(harness.actor.snapshot.state).toBe('paused');
  });

  it('goes back to idle on a failed creation and retries on the next intent', async () => {
    const buildPlayer = vi.fn(() => Promise.reject(new Error('script failed')));
    const machine = createPlayerMachine({
      buildPlayer,
      pause: () => {},
      play: () => {},
      requestConsent: () => {},
    } satisfies PlayerMachineDeps);
    const actor = machine.createActor();

    actor.send({ type: 'OPEN' });
    actor.send({ allowed: true, type: 'CONSENT_DECIDED' });
    await vi.waitFor(() => expect(actor.snapshot.state).toBe('idle'));

    // The wish survives the failure; the next open attempt retries the build.
    actor.send({ type: 'OPEN' });
    expect(actor.snapshot.state).toBe('loading');
  });
});
