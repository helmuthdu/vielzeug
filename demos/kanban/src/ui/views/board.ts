import '@vielzeug/refine/grid';
import '@vielzeug/refine/grid-item';

import '../components/column';
import { define, html } from '@vielzeug/ore';
import { each } from '@vielzeug/ore/directives';

import { boardSignal } from '../../core/board-store';

// ── createBoardView ──────────────────────────────────────────────────────────

define('board-view', {
  setup() {
    // Toast plumbing (bus 'toast:show' → ore-toast) now lives in app-shell.ts, not here — this
    // view used to own both the `<ore-toast>` element and the bus bridge, but both are
    // per-*view* only while board-view is mounted. `attemptEditTask`/`attemptDeleteTask`/etc are
    // callable from anywhere a task dialog can open (e.g. Backlog), so a save/delete from any
    // other view fired `bus.emit('toast:show', ...)` into a bus with zero listeners — no visible
    // feedback at all, not even a plain-text fallback. app-shell mounts once for the app's whole
    // lifetime, so the bridge now does too.
    return html`
      <ore-grid cols="1" cols-md="2" cols-lg="4" gap="md" fullwidth>
        ${each(
          boardSignal.value.columns,
          (col) => col.id,
          // Single-line, no leading/trailing whitespace outside the root tag: `each()`'s DOM
          // reordering pass compares `entry.nodes[0]` against `cursor.previousSibling` by
          // identity, so a leading whitespace text node (from a multi-line template starting
          // with a newline) makes every entry look "out of place" on first mount, forcing a
          // real disconnect+reconnect (`insertBefore` on an already-connected node disconnects
          // then reconnects it per the DOM spec) for every item, every render, defeating the
          // whole point of the optimization. Fatal for anything that calls `attachInternals()` —
          // e.g. `ore-button` — since that throws the second time it runs.
          (col) => html`<ore-grid-item><board-column :status=${() => col.value.id}></board-column></ore-grid-item>`,
        )}
      </ore-grid>
    `;
  },
  shadow: false,
});

export function createBoardView(): HTMLElement {
  const el = document.createElement('board-view');

  el.className = 'board-root';

  return el;
}
