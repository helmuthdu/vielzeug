---
title: 'Necromancer Examples — Animate on Mount'
description: 'Animate a mounted DOM element with @vielzeug/necromancer.'
---

## Animate on Mount

### Problem

You need a newly mounted notice to enter with a short animation and release its native animation when the notice is removed. This uses `animate()` and its lifecycle-owned handle.

### Solution

Create the element, start its animation, and dispose the handle when removing the element.

```ts
import { animate } from '@vielzeug/necromancer';

const notice = document.createElement('div');
notice.textContent = 'Profile saved';
notice.style.cssText = 'padding: 8px 12px; background: #dcfce7; border-radius: 6px;';
document.body.append(notice);

const handle = animate(
  notice,
  [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }],
  { duration: 180, easing: 'ease-out', fill: 'both' },
);

window.setTimeout(() => {
  handle.dispose('notice removed');
  notice.remove();
}, 2_000);
```

### Pitfalls

- Start `animate()` only after the element is connected and has mounted in the browser.
- Dispose the handle before or while removing the element if the animation may still be active.
- Leave `motion` as `'system'` unless the animation is essential; reduced motion preserves the keyframes with instant timing.

### Related

- [Stagger a List](./stagger-a-list.md)
- [Necromancer Usage Guide](../usage.md)
- [AnimationHandle API](../api.md#animationhandle)
