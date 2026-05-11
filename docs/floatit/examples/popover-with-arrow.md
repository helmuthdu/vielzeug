---
title: 'Floatit Examples — Popover with Arrow'
description: 'Popover with Arrow examples for floatit.'
---

## Popover with Arrow

## Runnable Example

```ts
import { arrow, autoUpdate, flip, getArrowData, getHideData, hide, offset, positionFloat, shift } from '@vielzeug/floatit';

const trigger = document.querySelector<HTMLElement>('#btn')!;
const popover = document.querySelector<HTMLElement>('#popover')!;
const arrowEl = popover.querySelector<HTMLElement>('.arrow')!;

let cleanup: (() => void) | null = null;

function update() {
  const result = positionFloat(trigger, popover, {
    placement: 'top',
    middleware: [
      offset(12),
      flip(),
      shift({ padding: 8 }),
      arrow({ element: arrowEl, padding: 8 }),
      hide(),
    ],
  });

  popover.dataset.placement = result.placement;

  const arrowData = getArrowData(result);
  arrowEl.style.left = arrowData?.x != null ? `${arrowData.x}px` : '';
  arrowEl.style.top = arrowData?.y != null ? `${arrowData.y}px` : '';

  const hideData = getHideData(result);
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
