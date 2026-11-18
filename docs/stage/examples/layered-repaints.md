---
title: 'Stage Examples: Layered Repaints'
description: First steps with @vielzeug/stage.
---

## Layered Repaints

### Problem

You have a canvas editor with a background grid, moving tokens, and a selection overlay, and a naive redraw-everything loop stutters as the scene grows.

### Solution

Give each kind of content its own layer. Only the layer you invalidate repaints; everything else composites from its cached surface.

```ts
import { createStage } from '@vielzeug/stage';

const tokens = new Map([['a', { x: 0, y: 0 }]]);

const stage = createStage(canvas, {
  background: '#0f172a',
  dpr: window.devicePixelRatio,
  height: 600,
  layers: [
    {
      id: 'grid',
      paint: (ctx, { visibleRect }) => {
        ctx.strokeStyle = '#1e293b';
        const step = 32;
        for (let x = Math.floor(visibleRect.x / step) * step; x < visibleRect.x + visibleRect.width; x += step) {
          ctx.beginPath();
          ctx.moveTo(x, visibleRect.y);
          ctx.lineTo(x, visibleRect.y + visibleRect.height);
          ctx.stroke();
        }
      },
    },
    {
      id: 'tokens',
      paint: (ctx) => {
        ctx.fillStyle = '#38bdf8';
        for (const token of tokens.values()) {
          ctx.beginPath();
          ctx.arc(token.x, token.y, 12, 0, Math.PI * 2);
          ctx.fill();
        }
      },
    },
  ],
  width: 800,
});

// Camera transforms (world→screen matrices) invalidate everything once.
stage.setTransform([1, 0, 0, 1, 100, 50]);

// Moving a token only repaints the tokens layer.
tokens.get('a')!.x += 16;
stage.invalidate('tokens');
```

### Pitfalls

- Paint callbacks draw in world units — the context transform already includes `dpr × matrix`. Resetting the transform to identity inside a paint silently breaks zoom and DPR.
- `setTransform()` and `resize()` invalidate all layers by design; don't fight it by painting the whole scene into one layer.
- `toBlob()` flushes pending repaints itself, but the composited canvas is only current after that flush — don't read pixels from the canvas directly without calling `stage.render()` first.

### Related

- [Usage Guide](../usage.md)
- [Atlas camera](/atlas/usage#basic-usage): produces the world→screen matrices Stage consumes.
