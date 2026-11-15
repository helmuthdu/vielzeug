---
title: 'Bard Examples: Game-State Music Transitions'
description: Crossfade between phase tracks with intro loop points using a Bard music deck.
---

## Game-State Music Transitions

### Problem

A tabletop companion app switches music as the game state changes (Preparation → Hunt → Enraged). Each track has an intro that plays once, then a body that loops, and switches must crossfade without a gap.

### Solution

Load the tracks, then drive one deck from your state machine; `loopStart` marks where each body begins.

```ts
import { createBard } from '@vielzeug/bard';

const bard = createBard();
await bard.load({
  prep: { src: '/prep.mp3', meta: { title: 'Preparation' } },
  hunt: { src: '/hunt.mp3', meta: { title: 'The Hunt' } },
  enraged: { src: '/enraged.mp3', meta: { title: 'Enraged' } },
});

const deck = bard.createDeck({ fade: 2.5 });

function enterPhase(phase: 'prep' | 'hunt' | 'enraged'): void {
  const loopStart = { prep: 8, hunt: 12, enraged: 6 }[phase];
  deck.transition(phase, { loop: true, loopStart });
}

enterPhase('hunt'); // crossfades from prep over 2.5 s
```

#### With a Continuous Queue

For ambient playback between game states, queue with a fixed crossfade and let the deck advance itself.

```ts
deck.queue(['prep', 'hunt', 'enraged'], { crossfade: 6, repeat: true });
deck.next(); // skip ahead manually at any time
```

### Pitfalls

- Transitioning to the current key is a no-op that returns the live handle, so re-entrant state changes are safe.
- A manual `transition()` clears an active queue; call `queue()` again to resume continuous playback.
- `loopStart` is absolute buffer seconds for buffered tracks; streamed tracks loop the whole file only.

### Related

- [Usage Guide: Music Deck](../usage.md#music-deck)
- [API Reference: MusicDeck](../api.md#musicdeck)
