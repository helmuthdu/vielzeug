# @vielzeug/bard

> Lifecycle-owned Web Audio mixing: buses with ducking, buffered SFX and sprites, procedural synth, streamed tracks, and crossfading music decks

## Installation

```sh
pnpm add @vielzeug/bard
npm install @vielzeug/bard
yarn add @vielzeug/bard
```

## Quick Start

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

bard.dispose(); // stops voices, removes listeners, closes the context
```

The engine owns the `AudioContext` until you dispose it: voices, gesture listeners, pending fetches, and decks are all released by one call. Importing on a server touches nothing until the first audio call.

## Features

- **`bus()`**: named gain buses with click-free volume ramps and `ducking` rules.
- **`play()`**: buffered SFX with sprites, voice caps, and detune/rate variance.
- **`synth()`**: zero-asset oscillator and noise voices with ADSR envelopes.
- **`createDeck()`**: crossfading music deck with loop points, queue, and Media Session.
- **`@vielzeug/bard/testing`**: deterministic Web Audio fakes with a manual clock.

## Documentation

- [Overview](https://vielzeug.dev/bard/)
- [Usage Guide](https://vielzeug.dev/bard/usage)
- [API Reference](https://vielzeug.dev/bard/api)
- [Examples](https://vielzeug.dev/bard/examples)
- [Migration](https://vielzeug.dev/bard/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu): part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
