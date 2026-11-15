---
title: 'Bard'
description: 'Lifecycle-owned Web Audio mixing: buses with ducking, buffered SFX and sprites, procedural synth, streamed tracks, and crossfading music decks'
package: bard
category: utilities
keywords: [web-audio, audio, sfx, soundboard, crossfade, ducking, audio-sprites]
related: [necromancer]
exports: [createBard, BardError, BardLoadError]
environments: [browser, node]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="bard" />

## Why Bard?

The Web Audio API gives you nodes and params but no lifecycle: nothing stops voices, removes gesture listeners, or closes the context when your feature unmounts. Bard wraps a lazily created `AudioContext` in one disposable engine with named buses, ducking, voice caps, and a crossfading music deck.

```ts
// Before: hand-rolled graph, listeners, and teardown you must remember
const ctx = new AudioContext();
const source = ctx.createBufferSource();
source.connect(ctx.destination);
// ...who disconnects this on unmount?

// After
const bard = createBard({ ducking: [{ source: 'voice', target: 'music', gain: 0.3 }] });
await bard.load({ confirm: '/confirm.wav' });
bard.play('confirm');
bard.dispose(); // stops voices, removes listeners, closes the context
```

| Feature           | Native Web Audio                             | Bard                                         | Howler.js                                    |
| ----------------- | -------------------------------------------- | -------------------------------------------- | -------------------------------------------- |
| Bundle size       | 0 B                                          | <PackageInfo package="bard" type="size" />   | ~30 kB                                       |
| Root dependencies | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> |
| Lifecycle         | Manual node teardown                         | `dispose()` + `Symbol.dispose`               | Per-sound unload                             |
| Mixing            | Hand-built gain graph                        | Named buses, ducking rules, voice caps       | Per-sound volume only                        |
| Music transitions | Manual crossfade scheduling                  | `deck.transition()` with loop points, queue  | Not built in                                 |

<div class="decision-callout">

**Use Bard when** an interactive app needs owned audio: UI SFX with voice caps, narration that ducks music, or game-state music transitions with crossfades and loop points.

**Consider a plain `HTMLAudioElement` when** you need one background track with no mixing, sprites, or lifecycle requirements.

</div>

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/bard
```

```sh [npm]
npm install @vielzeug/bard
```

```sh [yarn]
yarn add @vielzeug/bard
```

:::

## Quick Start

Create the engine once per app, load assets, and dispose it when the owning feature unmounts. Nothing touches `AudioContext` or the DOM until the first call that needs audio, so server rendering is safe.

```ts
import { createBard } from '@vielzeug/bard';

const bard = createBard({
  ducking: [{ source: 'voice', target: 'music', gain: 0.3 }],
});

await bard.load({
  music: { src: '/theme.mp3', stream: true },
  dice: { src: '/sfx.wav', sprites: { roll: [0, 1.2] } },
});

const deck = bard.createDeck();
deck.transition('music', { loop: true });
bard.play('dice:roll', { detune: [-60, 60] });

bard.dispose();
```

## Features

<div class="features-grid">

- **`createBard()`**: one disposable owner for the context, buses, voices, and decks.
- **`bus()`**: named gain buses (`music`, `sfx`, `voice`) with click-free volume ramps.
- **`ducking`**: declarative rules that ramp a target bus while a source bus has active voices.
- **`play()`**: buffered playback with sprites, voice caps, oldest-first stealing, and detune/rate variance.
- **`synth()`**: zero-asset oscillator and noise voices with ADSR and frequency sweeps.
- **`createDeck()`**: two-slot crossfader with loop points, queue with shuffle, and opt-in Media Session.
- **`tap()`**: observability events for state changes, steals, ducks, and track changes.

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)
- [Migration](./migration.md)

</div>

## See Also

<div class="see-also">

- [Necromancer](/necromancer/): pair visual transitions with deck music transitions from the same game-state change.
- [Arsenal](/arsenal/): general-purpose utilities used across the monorepo.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
