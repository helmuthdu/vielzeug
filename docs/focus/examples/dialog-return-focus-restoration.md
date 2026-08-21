---
title: 'Focus Examples — Dialog Return Focus Restoration'
description: 'Capture and restore focus around dialog open/close lifecycle.'
---

## Dialog Return Focus Restoration

### Problem

A dialog should return keyboard focus to its opener when the dialog closes. Native `<dialog>` does this automatically only when opened via `showModal()` from a user gesture — programmatic opens, nested dialogs, and async close flows all lose the original trigger. You need explicit capture/restore that survives opener unmount and intentional focus redirects.

### Solution

`captureFocus()` snapshots the deepest active element immediately and returns a one-shot restoration function. Call it before opening so `document.activeElement` is the trigger, then invoke the restorer on any close path.

```html
<button id="open-settings">Open settings</button>

<dialog id="settings-dialog" aria-labelledby="settings-title">
  <h2 id="settings-title">Settings</h2>
  <form method="dialog">
    <label>Theme
      <select autofocus>
        <option>System</option>
        <option>Light</option>
        <option>Dark</option>
      </select>
    </label>
    <menu>
      <button type="submit" value="save">Save</button>
      <button type="button" id="cancel-settings">Cancel</button>
    </menu>
  </form>
</dialog>
```

```ts
import { captureFocus } from '@vielzeug/focus';

const trigger = document.getElementById('open-settings')!;
const dialog = document.getElementById('settings-dialog')! as HTMLDialogElement;
const cancel = document.getElementById('cancel-settings')!;

function openSettings(): void {
  // Capture before showModal so document.activeElement is the trigger.
  const restore = captureFocus({ fallback: () => document.body });

  dialog.showModal();

  // Restore on any close path: native submit, Escape, cancel button, backdrop click.
  // The restorer is one-shot — later calls return false, so a single listener is safe.
  dialog.addEventListener('close', () => {
    // Skip restoration when the close action intentionally redirects focus.
    if (dialog.returnValue === 'save' && shouldNavigateAfterSave()) return;
    restore();
  });
}

function shouldNavigateAfterSave(): boolean {
  // Return true when "Save" navigates to a new view or focuses a confirmation toast.
  return false;
}

cancel.addEventListener('click', () => dialog.close('cancel'));

// Backdrop click dismisses — composedPath excludes the dialog panel itself.
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close('backdrop');
});

trigger.addEventListener('click', openSettings);
```

### Pitfalls

- **Capture before `showModal()`, not after.** `document.activeElement` shifts to the dialog once `showModal()` runs; capturing too late restores focus to the dialog body, not the trigger.
- **Provide a `fallback` when the opener can unmount.** A list item that opens a detail dialog can be removed from the DOM while the dialog is open (e.g. bulk-delete flow). Without a fallback, `restoreFocus` silently no-ops and focus lands on `document.body`.
- **Do not restore when the close action intentionally redirects.** If "Save" navigates to a new view or focuses a confirmation toast, restoring to the opener fights the new focus target. Branch on `dialog.returnValue` before calling the restorer.
- **The restorer is one-shot.** The first call attempts restoration; every later call returns `false`. There is no `dispose()` — the function releases its captured reference on the first call, so re-registering it on multiple `close` events is safe but only the first has an effect.

### Related

- [Usage Guide](../usage.md)
- [API Reference](../api.md)
- [Roving Tabs Keyboard Navigation](./roving-tabs-keyboard-navigation.md)
- [Refine](/refine/)
