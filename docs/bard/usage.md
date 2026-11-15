---
title: 'Bard: Usage Guide'
description: Play sounds, mix buses with ducking, generate synth SFX, and crossfade music with @vielzeug/bard.
---

[[toc]]

## Basic Usage

Create one engine per app, load a manifest, and play through a bus. Dispose the engine when its owning feature unmounts.

```ts
import { createBard } from '@vielzeug/bard';

const bard = createBard();
await bard.load({ click: '/click.wav', boom: '/boom.wav' });

const handle = bard.play('boom', { volume: 0.8, pan: -0.3 });
await handle.finished;
bard.dispose();
```

`play()` returns a `SoundHandle` immediately; audio starts once the browser allows it. `finished` resolves when the voice ends, is stopped, or is disposed.

## Unlocking Audio

Browsers start the `AudioContext` suspended until a user gesture. Bard attaches capture-phase listeners for `pointerup`, `touchend`, `keydown`, and `click` and resumes the context inside the first one. All listeners are removed once the context is running.

```ts
const bard = createBard(); // listeners attach on first audio use
await bard.unlock(); // or resume programmatically inside your own handler
```

`autoUnlock: false` skips the gesture listeners entirely; call `resume()` from your own gesture handler instead.

## Buses and Volume

Voices route to a named bus: `voice -> [pan] -> bus -> master -> destination`. The defaults are `music`, `sfx`, and `voice`; override with `buses`. Volume changes always ramp, so they never click.

```ts
const music = bard.bus('music');
music.setVolume(0.6, { fade: 0.5 });
music.mute();
music.unmute();
```

`bard.bus('master')` controls the output stage for every bus.

## Ducking

A ducking rule ramps a target bus down while the source bus has active voices, and back up when they end. Narration over music is the canonical case.

```ts
const bard = createBard({
  ducking: [{ source: 'voice', target: 'music', gain: 0.3, attack: 0.2, release: 0.8 }],
});

await bard.load({ announce: '/announce.wav' });
const voice = bard.play('announce', { bus: 'voice' });
// music is now at 30% until the announcement ends
await voice.finished; // music ramps back to 100%
```

Ducking uses its own gain stage per bus, so it never fights user volume automation.

## Sound Sprites

Bundle many short SFX into one file and address regions with `key:sprite`. The region is `[startSeconds, durationSeconds]`.

```ts
await bard.load({
  ui: { src: '/ui.wav', sprites: { open: [0, 0.4], close: [0.5, 0.4] } },
});

bard.play('ui:open');
bard.play('ui:close', { bus: 'sfx' });
```

## Voice Caps and Variance

`maxVoices` caps concurrent copies of one key; the oldest copy is stolen with a micro-fade. The engine-wide cap is `maxVoices` in `createBard` (default 32). Ranges for `detune` and `rate` keep repeated hits from sounding identical.

```ts
for (let i = 0; i < 10; i += 1) {
  bard.play('ui:open', { maxVoices: 3, detune: [-100, 100], rate: [0.95, 1.05] });
}
```

Note: `rate` shifts pitch on buffer sources. Pitch-preserving playback belongs on a streamed `HTMLAudioElement`.

## Procedural Synth

`synth()` builds an oscillator or noise burst with an ADSR envelope and optional filter, and disconnects itself when done. No assets required.

```ts
// countdown tick
bard.synth({ type: 'square', freq: 880, duration: 0.08 });

// descending error buzz with a lowpass
bard.synth({
  type: 'sawtooth',
  freq: [220, 55],
  duration: 0.6,
  filter: { type: 'lowpass', frequency: [2400, 400] },
});
```

## Music Deck

A deck crossfades between two slots. Transition to game states, loop the body of a track after its intro, or queue continuous playback.

```ts
const deck = bard.createDeck({ fade: 2.5 });

// intro plays once, then the region loops seamlessly
deck.transition('bossTheme', { loop: true, loopStart: 12.5 });

// later: crossfade to the victory track
deck.transition('victory', { fade: 4 });

// continuous ambient playback with deterministic shuffle
deck.queue(['forest', 'cave', 'village'], { shuffle: true, crossfade: 6, repeat: true });
deck.next();
```

`pause()` then `play()` resumes from the paused position. A manual `transition()` takes over from the queue.

## Streaming Long Tracks

Mark an asset `stream: true` to play it through an owned `<audio>` element instead of decoding it into an `AudioBuffer`. Mobile devices never spike RAM on ten-minute ambient tracks. Streamed assets are deck-only; `play()` on them throws.

```ts
await bard.load({
  ambient: { src: 'https://cdn.example.com/forest.mp3', stream: true },
});
bard.createDeck().transition('ambient', { loop: true });
```

The element requests CORS (`crossOrigin: 'anonymous'`); a CDN without CORS headers plays silent through Web Audio. Streamed loops cover the whole file: `loopStart`/`loopEnd` throw.

## Media Session

`mediaSession: true` claims `navigator.mediaSession` for one deck: metadata from the asset's `meta`, hardware play/pause/next/previous. A second claim throws instead of stealing controls; disposing the deck releases the claim.

```ts
await bard.load({
  theme: { src: '/theme.mp3', meta: { title: 'Hunt Theme', artist: 'Bard' } },
});
const deck = bard.createDeck({ mediaSession: true });
deck.transition('theme');
```

## Testing

`@vielzeug/bard/testing` ships deterministic fakes: a context with a manual clock, recorded param automation, and fake media elements. Bard's own suite uses them.

```ts
import { createBard } from '@vielzeug/bard';
import { FakeAudioContext } from '@vielzeug/bard/testing';

const ctx = new FakeAudioContext();
const bard = createBard({ context: () => ctx });
await bard.load({ ping: '/ping.wav' });
bard.play('ping');
ctx.advance(2); // clock moves, sources past their stop time fire 'ended'
```

## Framework Integration

::: code-group

```tsx [React]
import { useEffect, useState } from 'react';
import { createBard, type Bard } from '@vielzeug/bard';

export function useBard() {
  const [bard, setBard] = useState<Bard | null>(null);
  useEffect(() => {
    const engine = createBard();
    setBard(engine);
    return () => engine.dispose();
  }, []);
  return bard;
}
```

```vue [Vue 3]
<script setup lang="ts">
import { onMounted, onUnmounted, shallowRef } from 'vue';
import { createBard } from '@vielzeug/bard';

const bard = shallowRef<ReturnType<typeof createBard> | null>(null);
onMounted(() => (bard.value = createBard()));
onUnmounted(() => bard.value?.dispose());
</script>
```

```svelte [Svelte]
<script lang="ts">
  import { createBard } from '@vielzeug/bard';
  import { onDestroy } from 'svelte';

  const bard = createBard();
  onDestroy(() => bard.dispose());
</script>
```

:::

Create the engine in a mount hook, not at module scope: only mount lifecycle proves a browser runtime exists.

## Best Practices

- Create one engine per app and pass it down; contexts are a limited hardware resource.
- Dispose the engine with its owning feature; `using` works via `Symbol.dispose`.
- Keep streamed assets for tracks longer than a few minutes; buffers are better for SFX.
- Give narration its own `voice` bus and duck `music` from it, rather than fading tracks by hand.
- Inject `random` in tests so detune, rate, and shuffle are deterministic.
- Watch `tap()` events (`steal`, `duck`, `load-error`) in development to catch mixing problems early.
- Call `unlock()` from your own first-gesture UI when you want audio live before the next interaction.
