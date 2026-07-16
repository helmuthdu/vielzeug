import '@vielzeug/refine/button';
import { createSortable, createSortableScope } from '@vielzeug/dnd';
import { bind, define, getHost, html, onCleanup, onMounted, prop, ref } from '@vielzeug/ore';
import { when } from '@vielzeug/ore/directives';
import { computed, effect } from '@vielzeug/ripple';

import { boardSignal } from '../../core/board-store';
import { attemptMoveTask, canCreateTask } from '../../core/task-actions';
import { type Task, type TaskStatus } from '../../core/types';
import { renderTaskCard } from './task-card';
import { openTaskDialog } from './task-dialog';

// ONE scope instance shared across every column — required for cross-column drag.
export const sharedScope = createSortableScope();

interface ColumnOptions {
  status: TaskStatus;
  items: () => Task[];
  onReorder: (ids: string[]) => void;
}

interface ColumnHandle {
  dispose(): void;
  sync(): void;
}

function createColumn(containerEl: HTMLElement, opts: ColumnOptions): ColumnHandle {
  const sortable = createSortable({
    element: containerEl,
    getKey: (el) => el.dataset['taskId'] ?? '',
    onReorder: ({ ids }) => opts.onReorder(ids),
    scope: sharedScope,
  });

  return {
    dispose(): void {
      sortable.dispose();
    },
    sync(): void {
      sortable.sync();
    },
  };
}

const STATUSES = ['todo', 'in-progress', 'review', 'done'] as const;

/**
 * `<board-column>` — one Kanban column: header (title + count), the `@vielzeug/dnd`-managed
 * card list, and the optional "add task" button. Absorbs what used to be `board.ts`'s per-column
 * for-loop body, now one component per column instead of duplicated inline logic.
 *
 * **`status` is read as `props.status.value` fresh at every use site below, never captured into
 * a local `const` once.** Reason: `board-view` passes it via a `:status=` template binding, and
 * ore's `HTMLResult.mount()` inserts the fragment (connecting — and running `setup()` for — every
 * custom element inside it, this one included) *before* applying that binding (see
 * `createHtmlResult` in `@vielzeug/ore`'s `types/bindings.ts`). A one-time `props.status.value`
 * read during `setup()` therefore always observes `prop.oneOf`'s default ("todo"), not the real
 * per-column value — which only lands a moment later, once the parent's binding actually applies.
 * Reading the prop signal fresh everywhere (function bodies, computed callbacks) self-corrects the
 * instant the real value arrives, since none of them ever ran to completion on the stale value in
 * a way that matters (the DnD wiring below is the one place this self-correction is load-bearing:
 * without it, `onReorder`'s `attemptMoveTask` target would stay wrong forever, not just at boot).
 *
 * The `createColumn()`/`effect()`/dragend-flush wiring is deliberately done inside `onMounted()`,
 * not directly in `setup()`: the reconcile effect must never run before `itemsRef.value` *and*
 * `col` both exist, and starting it fresh inside `onMounted()` (which only fires once the
 * template — and therefore the ref — is mounted) sidesteps having to reason about a `ref()`
 * signal and a plain `col` variable becoming valid on two different reactive turns.
 */
define<{ status: TaskStatus }>('board-column', {
  props: {
    status: prop.oneOf(STATUSES, 'todo'),
  },
  setup(props) {
    const meta = (): (typeof boardSignal.value.columns)[number] =>
      boardSignal.value.columns.find((c) => c.id === props.status.value)!;
    const tasksComputed = computed(() => boardSignal.value.tasks.filter((t) => t.status === props.status.value));
    const canAddTask = computed(() => canCreateTask());

    getHost().classList.add('board__column');
    bind({ attr: { 'data-status': () => props.status.value } });

    const itemsRef = ref<HTMLElement>();
    let col: ColumnHandle | null = null;
    const currentTaskIds = new Set<string>(
      boardSignal.value.tasks.filter((t) => t.status === props.status.value).map((t) => t.id),
    );

    // Always rebuilds every card from the current task data (not just add/remove-by-id): an
    // edited task (title/priority/due date/…) needs its card content to change too, and a card
    // whose position in `tasks` moved (e.g. via undo/redo) needs to move in the DOM to match.
    // `col.sync()` re-applies the sortable's own DOM bookkeeping afterward — its own docs call
    // this out as the supported way to refresh a sortable's children.
    function reconcile(tasks: Task[]): void {
      const container = itemsRef.value;

      if (!container || !col) return;

      currentTaskIds.clear();
      for (const t of tasks) currentTaskIds.add(t.id);

      container.replaceChildren(
        ...tasks.map((task) =>
          renderTaskCard(task, { draggable: true, onClick: (taskId) => openTaskDialog({ kind: 'edit', taskId }) }),
        ),
      );

      col.sync();
    }

    onMounted(() => {
      const container = itemsRef.value!;

      col = createColumn(container, {
        items: () => boardSignal.value.tasks.filter((t) => t.status === props.status.value),
        onReorder: (ids) => {
          for (const id of ids) {
            if (!currentTaskIds.has(id)) {
              const task = boardSignal.value.tasks.find((t) => t.id === id);

              if (!task) continue;

              void attemptMoveTask(task, props.status.value);
            }
          }
        },
        status: props.status.value,
      });

      const stop = effect(() => {
        const tasks = tasksComputed.value;

        // Never mutate card DOM while a drag is in flight — the DnD session holds
        // live DOM references; replacing nodes mid-drag causes the placeholder glitch.
        if (sharedScope.isDragging) return;

        reconcile(tasks);
      });

      // Flush deferred reactive renders after any drag ends. Effects skipped during isDragging
      // need one nudge to reconcile the DOM once commitSession has updated boardSignal.
      const onDragEnd = (): void => {
        queueMicrotask(() => reconcile(tasksComputed.value));
      };

      document.addEventListener('dragend', onDragEnd, { signal: sharedScope.disposalSignal });

      onCleanup(() => {
        stop.dispose();
        col?.dispose();
        col = null;
      });
    });

    return html`
      <div class="board__column-header">
        <div class="board__column-heading">
          <span class="board__column-dot"></span>
          <h2 class="board__column-title">${() => meta().title}</h2>
        </div>
        <span
          class="board__column-count"
          ?data-over-limit=${() => {
            const wipLimit = meta().wipLimit;

            return Boolean(wipLimit && tasksComputed.value.length > wipLimit);
          }}
          >${() => tasksComputed.value.length}</span
        >
      </div>
      <div class="board__column-items" ref=${itemsRef}></div>
      ${when(
        () => canAddTask.value,
        () => html`
          <ore-button
            class="board__column-add"
            variant="ghost"
            size="sm"
            @click=${() => openTaskDialog({ kind: 'create', status: props.status.value })}
            >+ Add task</ore-button
          >
        `,
      )}
    `;
  },
  shadow: false,
});
