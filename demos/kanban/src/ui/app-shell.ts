import '@vielzeug/refine/button';
import '@vielzeug/refine/navbar';
import '@vielzeug/refine/avatar';
import '@vielzeug/refine/command-palette';
import '@vielzeug/refine/toast';
import type { ToastElement } from '@vielzeug/refine/toast';

import { createKeymap } from '@vielzeug/keymap';
import { define, html, onCleanup, ref } from '@vielzeug/ore';
import { each, when } from '@vielzeug/ore/directives';
import { computed, effect, signal } from '@vielzeug/ripple';

import type { RouteNames } from '../core/router';

import { activeRoute } from '../core/board-store';
import { exportTasksAsCsv } from '../core/csv-export';
import { bus } from '../core/events';
import { ledger } from '../core/history';
import { t } from '../core/i18n';
import { presenceCount, presenceSignal, setupRealtime } from '../core/realtime';
import { router } from '../core/router';
import { taskIndex } from '../core/search-index';
import { initialsFromName } from '../core/users';
import { openTaskDialog } from './components/task-dialog';
import { createAnalyticsView } from './views/analytics';
import { createBacklogView } from './views/backlog';
import { createBoardView } from './views/board';
import { createSettingsView } from './views/settings';

/** Mirrors refine's (unexported) `CommandPaletteItemInput` shape — only the fields this shell uses. */
interface PaletteItem {
  group: string;
  label: string;
  value: string;
}

const VIEWS: RouteNames[] = ['board', 'backlog', 'analytics', 'settings'];

// Rebuilt on every call rather than once at module scope, so it re-translates when
// `itemsForQuery()`'s caller (a `computed()`, see `paletteItems` below) re-runs on locale change.
function buildStaticItems(): PaletteItem[] {
  return [
    ...VIEWS.map((route) => ({
      group: t('command.navigate'),
      label: `${t('command.goTo')} ${t(`nav.${route}`)}`,
      value: `nav:${route}`,
    })),
    { group: t('command.actions'), label: t('command.createTask'), value: 'action:create-task' },
  ];
}

/** Command palette owns its own filtering (`no-filter`) so scout's fuzzy ranking drives task results. */
function itemsForQuery(query: string): PaletteItem[] {
  const q = query.trim().toLowerCase();
  const staticItems = buildStaticItems();

  if (!q) return staticItems;

  const matchedStatic = staticItems.filter((item) => item.label.toLowerCase().includes(q));
  const taskResults = taskIndex.search(q, { limit: 8 }).map((r) => ({
    group: t('command.tasks'),
    label: r.item.title,
    value: `task:${r.item.id}`,
  }));

  return [...matchedStatic, ...taskResults];
}

/**
 * True while focus is inside a text field — including one behind a shadow boundary, like every
 * refine input (`document.activeElement` reports only the outer custom element; the real native
 * `<input>` is one `shadowRoot.activeElement` hop deeper). Guards the global undo/redo shortcut
 * below from hijacking the browser's own native text-undo while editing a field.
 */
function isTypingInField(): boolean {
  let el: Element | null = document.activeElement;

  while (el) {
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || (el as HTMLElement).isContentEditable) return true;

    el = el.shadowRoot?.activeElement ?? null;
  }

  return false;
}

define('app-shell', {
  setup() {
    setupRealtime();

    const toastRef = ref<ToastElement>();

    // Bridge core/events.ts's `bus` 'toast:show' → `ore-toast`. Lives here (app-shell), not in
    // any individual view — `attemptCreateTask`/`attemptEditTask`/etc. are reachable from every
    // view via `task-dialog`, so a bridge scoped to one view only shows feedback while that one
    // view happens to be mounted.
    const unsubscribeToast = bus.on('toast:show', ({ message, variant }) => {
      toastRef.value?.add({ color: variant, message });
    });

    onCleanup(unsubscribeToast);

    // `presenceSignal`'s values carry no `id` of their own (see `PresenceUser`) — the member ID
    // only exists as the map key, so it's folded into each entry here for `each()`'s key fn.
    const presenceUsers = computed(() =>
      [...presenceSignal.value.entries()].slice(0, 4).map(([id, user]) => ({ id, name: user.name })),
    );

    const paletteQuery = signal('');
    const paletteItems = computed(() => itemsForQuery(paletteQuery.value));
    const paletteRef = ref<HTMLElement & { open: boolean }>();

    const onPaletteSelect = (e: Event): void => {
      const value = (e as CustomEvent<{ value: string }>).detail.value;

      if (value.startsWith('nav:')) {
        void router.navigate({ name: value.slice(4) as RouteNames });
      } else if (value === 'action:create-task') {
        openTaskDialog({ kind: 'create', status: 'todo' });
      } else if (value.startsWith('task:')) {
        openTaskDialog({ kind: 'edit', taskId: value.slice(5) });
      }
    };

    const openPalette = (): void => {
      paletteQuery.value = '';

      const palette = paletteRef.value;

      if (palette) palette.open = true;
    };

    // Main content: still a plain view-swap (child views are plain `createXView(): HTMLElement`
    // factories, not yet ore components themselves) — `ref()` gives us the mounted container
    // without falling back to manual `document.createElement('main')` + `appendChild` wiring.
    const mainRef = ref<HTMLElement>();

    function renderView(routeName: string | null): void {
      const main = mainRef.value;

      if (!main) return;

      main.replaceChildren();

      if (routeName === 'board') main.appendChild(createBoardView());
      else if (routeName === 'backlog') main.appendChild(createBacklogView());
      else if (routeName === 'analytics') main.appendChild(createAnalyticsView());
      else if (routeName === 'settings') main.appendChild(createSettingsView());
      else main.appendChild(document.createTextNode('Not found'));
    }

    // Re-runs once `mainRef` resolves (a signal write from the template's `ref=` binding) and
    // again on every subsequent route change — replaces the old "render once + separate
    // router.subscribe" pair with a single reactive effect.
    effect(() => renderView(activeRoute.value));

    // The undo/redo history (core/history.ts's `ledger`) previously had no UI beyond
    // Settings' buttons — surfaced here too since it's the one piece of state every other
    // action in the app feeds into, and power users expect ⌘Z regardless of which view they're on.
    // Note: ⌘K isn't bound here — `ore-command-palette` already registers its own global
    // `mod+k` shortcut internally (its `shortcut` prop, default `"mod+k"`). Adding a second
    // app-level binding for the same combo raced with it: this handler's `openPalette()` opened
    // the palette, then the component's own internal binding — reacting to that same keypress —
    // saw it as already open and closed it right back, net result "nothing visibly happens".
    const keymap = createKeymap(
      {
        'mod+shift+z': () => {
          if (ledger.canRedo.value) void ledger.redo();
        },
        'mod+z': () => {
          if (ledger.canUndo.value) void ledger.undo();
        },
      },
      { when: () => !isTypingInField() },
    );
    const unmountKeymap = keymap.mount(document);

    onCleanup(() => {
      unmountKeymap();
      keymap.dispose();
    });

    return html`
      <ore-navbar sticky elevation="1">
        <span slot="logo" style="font-weight:700;font-size:1.1rem;letter-spacing:-0.02em;color:var(--color-primary)"
          >✦ Kanban</span
        >
        ${each(
          VIEWS,
          (route) => route,
          // No leading/trailing whitespace outside the root tag — see the equivalent comment in
          // views/board.ts's `each()` call for why (spurious disconnect/reconnect on every render).
          (route) =>
            html`<ore-navbar-item
              ?active=${() => activeRoute.value === route.value}
              @click=${() => void router.navigate({ name: route.value })}
              >${() => t(`nav.${route.value}`)}</ore-navbar-item
            >`,
        )}
        <!--
          Mirrors the routes/actions above into the mobile-menu slot — ore-navbar hides the
          default/end slots outright below its breakpoint (nowhere for a slotted node to
          "move" to; a slot's assigned nodes always render in their assigned slot), and only
          shows its hamburger toggle at all once this slot has content of its own. Without this,
          narrow viewports had literally no way to navigate or reach any of these actions.
        -->
        ${each(
          VIEWS,
          (route) => route,
          (route) =>
            html`<ore-navbar-item
              slot="mobile-menu"
              ?active=${() => activeRoute.value === route.value}
              @click=${() => void router.navigate({ name: route.value })}
              >${() => t(`nav.${route.value}`)}</ore-navbar-item
            >`,
        )}
        <ore-navbar-item slot="mobile-menu" ?disabled=${() => !ledger.canUndo.value} @click=${() => void ledger.undo()}
          >${() => t('action.undo')}</ore-navbar-item
        >
        <ore-navbar-item slot="mobile-menu" ?disabled=${() => !ledger.canRedo.value} @click=${() => void ledger.redo()}
          >${() => t('action.redo')}</ore-navbar-item
        >
        <ore-navbar-item slot="mobile-menu" @click=${openPalette}>${() => t('action.search')}</ore-navbar-item>
        <ore-navbar-item slot="mobile-menu" @click=${() => void exportTasksAsCsv()}
          >${() => t('action.export')} CSV</ore-navbar-item
        >
        <div slot="end" style="display:flex;align-items:center;gap:0.5rem">
          <div class="presence-avatars">
            ${each(
              presenceUsers,
              (u) => u.id,
              (u) =>
                html`<ore-avatar
                  size="xs"
                  status="online"
                  :alt=${() => u.value.name}
                  :initials=${() => initialsFromName(u.value.name)}></ore-avatar>`,
            )}
            ${when(
              () => presenceCount.value > 0,
              () =>
                html`<span class="presence-count"
                  >${() => t('presence.viewing', { count: presenceCount.value })}</span
                >`,
            )}
          </div>
          <ore-button
            variant="ghost"
            size="sm"
            ?disabled=${() => !ledger.canUndo.value}
            @click=${() => void ledger.undo()}
            >${() => t('action.undo')} ⌘Z</ore-button
          >
          <ore-button
            variant="ghost"
            size="sm"
            ?disabled=${() => !ledger.canRedo.value}
            @click=${() => void ledger.redo()}
            >${() => t('action.redo')} ⇧⌘Z</ore-button
          >
          <ore-button variant="ghost" size="sm" @click=${openPalette}>${() => t('action.search')} ⌘K</ore-button>
          <ore-button variant="ghost" size="sm" @click=${() => void exportTasksAsCsv()}
            >${() => t('action.export')} CSV</ore-button
          >
        </div>
      </ore-navbar>
      <main class="app-main" ref=${mainRef}></main>
      <ore-command-palette
        ref=${paletteRef}
        label="Command palette"
        placeholder="Search tasks, jump to a view…"
        no-filter
        :items=${paletteItems}
        @search=${(e: Event) => {
          paletteQuery.value = (e as CustomEvent<{ query: string }>).detail.query;
        }}
        @select=${onPaletteSelect}></ore-command-palette>
      <task-dialog></task-dialog>
      <ore-toast ref=${toastRef} position="bottom-right"></ore-toast>
    `;
  },
  shadow: false,
});

export function createAppShell(): HTMLElement {
  const shell = document.createElement('app-shell');

  shell.className = 'app-shell';

  return shell;
}
