---
title: 'Orbit Examples — Using Presets'
description: 'Drop-in preset examples for common tooltip, dropdown, popover, and context menu patterns.'
---

## Using Presets

The `@vielzeug/orbit/presets` sub-path exports four ready-made middleware stacks for the most common patterns. Spread them directly into `float()` or `computePosition()`.

### Tooltip

```ts
import { float } from '@vielzeug/orbit';
import { tooltip } from '@vielzeug/orbit/presets';

const handle = float(trigger, tooltipEl, tooltip());
handle.cleanup(); // on teardown
```

Default: `placement: 'top'`, `offset(8)`, `flip({ padding: 6 })`, `shift({ padding: 6 })`.

### Dropdown

```ts
import { float } from '@vielzeug/orbit';
import { dropdown } from '@vielzeug/orbit/presets';

const handle = float(trigger, menu, dropdown());
```

Default: `placement: 'bottom-start'`, `flip`, `shift`, `size` (constrains height).

### Popover

```ts
import { float } from '@vielzeug/orbit';
import { popover } from '@vielzeug/orbit/presets';

const handle = float(trigger, popoverEl, popover());
```

Default: `placement: 'top'`, `offset(12)`, `flip`, `shift`.

### Context Menu

```ts
import { computePosition } from '@vielzeug/orbit';
import { contextMenu } from '@vielzeug/orbit/presets';

document.addEventListener('contextmenu', (e) => {
  e.preventDefault();

  const virtualRef = {
    getBoundingClientRect: () => DOMRect.fromRect({ x: e.clientX, y: e.clientY, width: 0, height: 0 }),
  };

  const { x, y } = computePosition(virtualRef, menu, contextMenu());
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  menu.style.display = 'block';
});
```

Default: `placement: 'bottom-start'`, `flip`, `shift`.

---

### Customising Presets

All preset factories accept `PresetOptions`:

```ts
import type { PresetOptions } from '@vielzeug/orbit';
import { dropdown } from '@vielzeug/orbit/presets';

const custom: PresetOptions = {
  offset: 4,
  padding: 12,
  placement: 'bottom-end',
};

const handle = float(trigger, panel, dropdown(custom));
```

### Extending Presets

Spread the preset to add or override middleware:

```ts
import { float, hide } from '@vielzeug/orbit';
import { tooltip } from '@vielzeug/orbit/presets';
import type { HideData } from '@vielzeug/orbit';

const handle = float(trigger, tooltipEl, {
  ...tooltip({ placement: 'bottom' }),
  middleware: [...tooltip().middleware, hide()],
  apply(result) {
    const { referenceHidden } = (result.middlewareData.hide ?? {}) as HideData;
    tooltipEl.style.visibility = referenceHidden ? 'hidden' : 'visible';
    tooltipEl.style.left = `${result.x}px`;
    tooltipEl.style.top = `${result.y}px`;
  },
});
```
