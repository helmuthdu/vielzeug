---
title: 'Bard: API Reference'
description: Public API of @vielzeug/bard.
---

[[toc]]

## API Overview

| Symbol                 | Purpose                                     | Execution | Common gotcha                                                            |
| ---------------------- | ------------------------------------------- | --------- | ------------------------------------------------------------------------ |
| `createBard`           | Creates the disposable audio engine         | Sync      | Context is still created lazily on first audio use                       |
| `BardError`            | Base error for invalid keys, buses, regions | —         | Subclasses: `BardLoadError`, `BardDisposedError`, `BardUnsupportedError` |
| `BardLoadError`        | A manifest entry failed to fetch or decode  | —         | Original failure is in `cause`                                           |
| `BardDisposedError`    | A method ran after `dispose()`              | —         | Thrown by every engine method except `dispose`                           |
| `BardUnsupportedError` | No `AudioContext` in the runtime            | —         | `unlock()` rejects with it on servers without Web Audio                  |

## Package Entry Point

| Import                   | Purpose                                 |
| ------------------------ | --------------------------------------- |
| `@vielzeug/bard`         | Complete public Bard API                |
| `@vielzeug/bard/testing` | Deterministic Web Audio fakes for tests |

## Engine

### createBard

```ts
function createBard(options?: BardOptions): Bard;
```

Creates the engine. Touches no browser global until the first method that needs audio.

| Option                | Type                     | Default                     | Notes                                                                       |
| --------------------- | ------------------------ | --------------------------- | --------------------------------------------------------------------------- |
| `buses`               | `readonly string[]`      | `['music', 'sfx', 'voice']` | `'master'` is reserved and throws if declared                               |
| `volume`              | `number`                 | `1`                         | Master volume, linear 0..1                                                  |
| `ducking`             | `readonly DuckingRule[]` | `[]`                        | See Ducking                                                                 |
| `maxVoices`           | `number`                 | `32`                        | Engine-wide concurrent voice cap                                            |
| `autoUnlock`          | `boolean`                | `true`                      | Gesture listeners resume a suspended context                                |
| `autoSuspendOnHidden` | `boolean`                | `false`                     | Suspend on page hide, resume on show (only resumes its own suspends)        |
| `context`             | `() => AudioContext`     | lazy `new AudioContext()`   | Injection seam for tests; injected contexts are never closed by `dispose()` |

Returns the `Bard` engine.

```ts
import { createBard } from '@vielzeug/bard';

const bard = createBard({ volume: 0.9 });
```

### Bard

| Member                        | Signature                                                         | Notes                                                                                        |
| ----------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `state`                       | `'idle' \| 'suspended' \| 'running' \| 'interrupted' \| 'closed'` | `'idle'` until first lazy context creation; `'interrupted'` occurs on iOS calls              |
| `context`                     | `AudioContext \| null`                                            | Native context for advanced graph work                                                       |
| `unlock()`                    | `() => Promise<void>`                                             | Creates and resumes the context                                                              |
| `load(manifest, options?)`    | `(AssetManifest, { signal? }) => Promise<void>`                   | Deduplicates concurrent fetches per URL                                                      |
| `unload(keys?)`               | `(string \| readonly string[]) => void`                           | Stops active voices for the dropped keys                                                     |
| `has(key)`                    | `(string) => boolean`                                             | Resolves `'key:sprite'` to its parent asset                                                  |
| `play(key, options?)`         | `(string, PlayOptions?) => SoundHandle`                           | Throws `BardError` for unknown keys and streamed assets                                      |
| `synth(options)`              | `(SynthOptions) => SoundHandle`                                   | Procedural voice, self-cleaning                                                              |
| `bus(name)`                   | `(string) => BusController`                                       | `'master'` is valid; unknown names throw                                                     |
| `createDeck(options?)`        | `(DeckOptions?) => MusicDeck`                                     | Multiple decks share the engine                                                              |
| `suspend()` / `resume()`      | `() => Promise<void>`                                             | Engine-wide pause for the whole context                                                      |
| `tap(handler, options?)`      | `(BardEvent) => void` → unsubscribe                               | Handler errors are swallowed; auto-detaches on `signal`                                      |
| `dispose()`                   | `() => void`                                                      | Stops voices and decks, aborts loads, removes listeners, closes an owned context; idempotent |
| `disposed` / `disposalSignal` | `boolean` / `AbortSignal`                                         | Standard disposal contract                                                                   |

---

## Playback

### SoundHandle

Returned by `play()` and `synth()`.

| Member                                        | Signature                        | Notes                                       |
| --------------------------------------------- | -------------------------------- | ------------------------------------------- |
| `stop(options?)`                              | `(FadeOptions?) => void`         | Fades (default 15 ms micro-fade) then stops |
| `setVolume(volume, options?)`                 | `(number, FadeOptions?) => void` | Ramped, never clicks                        |
| `setPan(pan)`                                 | `(-1..1) => void`                | No-op when the voice has no panner          |
| `finished`                                    | `Promise<void>`                  | Resolves on natural end, stop, or dispose   |
| `dispose()` / `disposed` / `[Symbol.dispose]` |                                  | Immediate stop and node release             |

### PlayOptions

| Option                  | Type                   | Default       | Notes                                  |
| ----------------------- | ---------------------- | ------------- | -------------------------------------- |
| `bus`                   | `string`               | `'sfx'`       | Destination bus                        |
| `volume`                | `number`               | `1`           | Linear 0..1                            |
| `pan`                   | `number`               | —             | -1..1; adds a `StereoPannerNode`       |
| `loop`                  | `boolean`              | `false`       | Loops the buffer or sprite region      |
| `loopStart` / `loopEnd` | `number`               | —             | Absolute buffer seconds                |
| `offset`                | `number`               | `0`           | Start offset in seconds                |
| `detune`                | `number \| [min, max]` | —             | Cents; ranges sampled per voice        |
| `rate`                  | `number \| [min, max]` | —             | Playback rate; shifts pitch on buffers |
| `maxVoices`             | `number`               | —             | Per-key cap; oldest copy is stolen     |
| `fadeIn`                | `number`               | —             | Seconds from 0 to `volume`             |
| `random`                | `() => number`         | `Math.random` | Deterministic sampling in tests        |

### SynthOptions

| Option                                         | Type                                                        | Default                                                      | Notes                                                           |
| ---------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------- |
| `type`                                         | `'sine' \| 'square' \| 'sawtooth' \| 'triangle' \| 'noise'` | `'sine'`                                                     | `'noise'` uses a cached white-noise buffer                      |
| `freq`                                         | `number \| [from, to]`                                      | `440`                                                        | Tuple sweeps exponentially; maps to filter cutoff for `'noise'` |
| `duration`                                     | `number`                                                    | `0.3`                                                        | Total seconds including release; must be positive               |
| `envelope`                                     | `SynthEnvelope`                                             | `{ attack: 0.005, decay: 0.05, sustain: 0.6, release: 0.1 }` | ADSR; `sustain` is a level                                      |
| `filter`                                       | `SynthFilter`                                               | —                                                            | Biquad stage before the envelope                                |
| `bus` / `volume` / `pan` / `detune` / `random` | as in `PlayOptions`                                         |                                                              |                                                                 |

---

## Mixing

### DuckingRule

```ts
interface DuckingRule {
  readonly source: string;
  readonly target: string;
  readonly gain: number; // duck level, linear 0..1
  readonly attack?: number; // seconds, default 0.2
  readonly release?: number; // seconds, default 0.8
}
```

While the `source` bus has active voices, `target` ramps to `gain`; when they end it ramps back to 1. Multiple rules on one target take the lowest active gain.

### BusController

| Member                              | Notes                                  |
| ----------------------------------- | -------------------------------------- |
| `name`                              | Bus name                               |
| `volume` / `setVolume(v, options?)` | User volume stage, ramped              |
| `muted` / `mute()` / `unmute()`     | Ramped mute                            |
| `duckLevel`                         | Current duck multiplier (1 = unducked) |

---

## Music Deck

### MusicDeck

| Member                                        | Signature                                     | Notes                                           |
| --------------------------------------------- | --------------------------------------------- | ----------------------------------------------- |
| `current`                                     | `string \| null`                              | Active track key                                |
| `playing`                                     | `boolean`                                     | `false` while paused or stopped                 |
| `transition(key, options?)`                   | `(string, TransitionOptions?) => SoundHandle` | Crossfades; same key returns the current handle |
| `queue(keys, options?)`                       | `(readonly string[], QueueOptions?) => void`  | Replaces the queue and starts its first track   |
| `next()` / `previous()`                       | `() => void`                                  | No-op without a queue                           |
| `pause()` / `play()`                          | `() => void`                                  | `play()` resumes from the paused offset         |
| `stop(options?)`                              | `(FadeOptions?) => void`                      | Stops and clears queue and slot                 |
| `dispose()` / `disposed` / `[Symbol.dispose]` |                                               | Releases a Media Session claim                  |

`TransitionOptions`: `fade`, `loop`, `loopStart`, `loopEnd`, `offset`.
`QueueOptions`: `shuffle`, `crossfade`, `repeat`, `random`.

### DeckOptions

| Option         | Type      | Default   | Notes                                                  |
| -------------- | --------- | --------- | ------------------------------------------------------ |
| `bus`          | `string`  | `'music'` | Destination bus                                        |
| `mediaSession` | `boolean` | `false`   | Claims `navigator.mediaSession`; a second claim throws |
| `fade`         | `number`  | `2`       | Default crossfade seconds                              |

---

## Assets

### AssetManifest

```ts
type AssetManifest = Readonly<Record<string, string | AssetDefinition>>;

interface AssetDefinition {
  readonly src: string;
  readonly sprites?: Readonly<Record<string, readonly [start: number, duration: number]>>;
  readonly stream?: boolean; // deck-only playback via an owned <audio> element
  readonly meta?: AssetMeta; // Media Session metadata
}
```

A bare string is shorthand for `{ src }`. Sprite regions are `[startSeconds, durationSeconds]` and play as `'key:sprite'`; out-of-bounds regions throw `BardError`.

---

## Observability

### BardEvent

| Event        | Payload                | Fires                                    |
| ------------ | ---------------------- | ---------------------------------------- |
| `state`      | `state`                | Context lifecycle changes                |
| `load`       | `key`                  | A manifest entry finished loading        |
| `load-error` | `key`, `error`         | A load failed                            |
| `steal`      | `key`                  | A voice was stolen past a cap            |
| `duck`       | `bus`, `level`, `ramp` | A bus duck level changed                 |
| `track`      | `key \| null`          | The deck changed tracks                  |
| `dispose`    | —                      | Emitted once at the start of `dispose()` |

---

## Testing

`@vielzeug/bard/testing` exports `FakeAudioContext` (manual clock via `advance(seconds)`, recorded `FakeAudioParam` automation), `FakeMediaElement`, `FakeMediaSession`, and `flush()`. Inject the fake with `createBard({ context: () => fake })`.

---

## Errors

| Error               | Trigger                                                          | Notes                                                     |
| ------------------- | ---------------------------------------------------------------- | --------------------------------------------------------- |
| `BardError`         | Unknown key/bus/sprite, reserved bus name, streamed-asset misuse | Base class                                                |
| `BardLoadError`     | Fetch or `decodeAudioData` failure                               | `cause` carries the original error or `{ status }`        |
| `BardDisposedError` | Engine use after `dispose()`                                     | Also `BardUnsupportedError` when no `AudioContext` exists |
