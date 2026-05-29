---
title: 'Orbit Examples — Popover with Arrow'
description: 'Popover with Arrow examples for orbit.'
---

## Popover with Arrow

### Solution

```ts
import { arrow, autoUpdate, flip, hide, offset, computePosition, shift } from '@vielzeug/orbit';

const trigger = document.querySelector<HTMLElement>('#btn')!;
const popover = document.querySelector<HTMLElement>('#popover')!;
const arrowEl = popover.querySelector<HTMLElement>('.arrow')!;

let cleanup: (() => void) | null = null;

function update() {
  const result = computePosition(trigger, popover, {
    placement: 'top',
    middleware: [offset(12), flip(), shift({ padding: 8 }), arrow({ element: arrowEl, padding: 8 }), hide()],
  });

  popover.style.left = `${result.x}px`;
  popover.style.top = `${result.y}px`;

  popover.dataset.placement = result.placement;

  const arrowData = result.middlewareData.arrow as { x?: number; y?: number } | undefined;
  arrowEl.style.left = arrowData?.x != null ? `${arrowData.x}px` : '';
  arrowEl.style.top = arrowData?.y != null ? `${arrowData.y}px` : '';

  const hideData = result.middlewareData.hide as { escaped?: boolean; referenceHidden?: boolean } | undefined;
  popover.style.visibility = hideData?.referenceHidden ? 'hidden' : 'visible';
}

trigger.addEventListener('click', () => {
  if (popover.hasAttribute('data-open')) {
    popover.removeAttribute('data-open');
    cleanup?.();
    cleanup = null;
    return;
  }

  popover.setAttribute('data-open', '');
  cleanup = autoUpdate(trigger, popover, update);
});
```

```css
#popover .arrow {
  position: absolute;
}

#popover[data-placement^='top'] .arrow {
  bottom: -5px;
}

#popover[data-placement^='bottom'] .arrow {
  top: -5px;
}

#popover[data-placement^='left'] .arrow {
  right: -5px;
}

#popover[data-placement^='right'] .arrow {
  left: -5px;
}
```
