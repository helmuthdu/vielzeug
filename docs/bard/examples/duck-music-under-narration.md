---
title: 'Bard Examples: Duck Music Under Narration'
description: Ramp the music bus down while a voice bus has active playback, and back up when it ends.
---

## Duck Music Under Narration

### Problem

Card text-to-speech or a game master's recorded announcements must sit above the music without hand-rolling fades for every line.

### Solution

Play narration on the `voice` bus and declare a ducking rule from `voice` to `music`; Bard ramps the music down when any voice is active and back up when the last one ends.

```ts
import { createBard } from '@vielzeug/bard';

const bard = createBard({
  ducking: [{ source: 'voice', target: 'music', gain: 0.25, attack: 0.2, release: 0.8 }],
});

await bard.load({
  theme: { src: '/theme.mp3', stream: true },
  cards: { src: '/cards.wav', sprites: { card1: [0, 4.2], card2: [4.5, 3.1] } },
});

bard.createDeck().transition('theme', { loop: true });

function narrate(sprite: string): void {
  bard.play(`cards:${sprite}`, { bus: 'voice' });
}

narrate('card1'); // music drops to 25%
narrate('card2'); // still ducked until both lines finish
```

### Pitfalls

- Ducking counts active voices per bus, so overlapping lines keep the duck held until the last one ends.
- Duck automation and `bus('music').setVolume()` use separate gain stages; combining them is safe.
- The rule's `gain` is linear: 0.25 is roughly −12 dB, not 25 dB.

### Related

- [Usage Guide: Ducking](../usage.md#ducking)
- [Usage Guide: Sound Sprites](../usage.md#sound-sprites)
