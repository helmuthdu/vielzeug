---
title: 'Bard Examples: UI SFX Without Assets'
description: Generate ticks, warnings, and buzzes with the procedural synth so no audio files ship.
---

## UI SFX Without Assets

### Problem

A prototype needs audible feedback — button ticks, countdown warnings, error buzzes — before any sound design exists, and shipping placeholder WAV files adds weight.

### Solution

Use `synth()` with short envelopes and frequency sweeps; each voice disconnects itself when it ends.

```ts
import { createBard } from '@vielzeug/bard';

const bard = createBard();

// button tick
bard.synth({ type: 'square', freq: 1200, duration: 0.05, volume: 0.4 });

// countdown warning that rises in pitch
bard.synth({ type: 'triangle', freq: [440, 880], duration: 0.25 });

// error buzz that falls away behind a lowpass
bard.synth({
  type: 'sawtooth',
  freq: [220, 55],
  duration: 0.6,
  filter: { type: 'lowpass', frequency: [2400, 400], q: 2 },
});

// explosion-ish noise burst
bard.synth({ type: 'noise', freq: 400, duration: 0.8, envelope: { attack: 0.01, decay: 0.7, sustain: 0 } });
```

### Pitfalls

- `duration` includes the release; keep it above `attack + decay + release` sums you expect to hear.
- `freq` on a `'noise'` voice sets the bandpass cutoff, not a pitch.
- Synth voices count toward the engine's `maxVoices` cap while they sound.

### Related

- [Usage Guide: Procedural Synth](../usage.md#procedural-synth)
- [API Reference: SynthOptions](../api.md#synthoptions)
