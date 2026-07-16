import '@vielzeug/refine/dialog';
import '@vielzeug/refine/input';
import '@vielzeug/refine/textarea';
import '@vielzeug/refine/select';
import '@vielzeug/refine/date-picker';
import '@vielzeug/refine/number-input';
import '@vielzeug/refine/button';
import { define, html } from '@vielzeug/ore';
import { when } from '@vielzeug/ore/directives';
import { computed, effect, signal } from '@vielzeug/ripple';

import type { Task, TaskPriority, TaskStatus } from '../../core/types';

import { currentUser } from '../../core/auth';
import { boardSignal } from '../../core/board-store';
import { t } from '../../core/i18n';
import { seedUsers } from '../../core/seed-data';
import {
  attemptCreateTask,
  attemptDeleteTask,
  attemptEditTask,
  canDeleteTask,
  canUpdateTask,
} from '../../core/task-actions';

export type TaskDialogRequest = { kind: 'create'; status: TaskStatus } | { kind: 'edit'; taskId: string };

const requestSignal = signal<TaskDialogRequest | null>(null);

export function openTaskDialog(request: TaskDialogRequest): void {
  requestSignal.value = request;
}

// ── Static option data ───────────────────────────────────────────────────────
// `computed()`, not a plain array — re-translates when the locale changes. `t()` itself isn't
// ripple-reactive (see i18n.ts's own comment on `t()`), but reading `currentLocale.value`
// transitively through it (every call here does) registers the dependency these need.

const STATUS_OPTIONS = computed<Array<{ label: string; value: TaskStatus }>>(() => [
  { label: t('task.todo'), value: 'todo' },
  { label: t('task.inProgress'), value: 'in-progress' },
  { label: t('task.review'), value: 'review' },
  { label: t('task.done'), value: 'done' },
]);

const PRIORITY_OPTIONS = computed<Array<{ label: string; value: TaskPriority }>>(() => [
  { label: t('priority.low'), value: 'low' },
  { label: t('priority.medium'), value: 'medium' },
  { label: t('priority.high'), value: 'high' },
  { label: t('priority.urgent'), value: 'urgent' },
]);

const ASSIGNEE_OPTIONS: Array<{ label: string; value: string }> = [
  { label: 'Unassigned', value: '' },
  ...seedUsers.map((u) => ({ label: u.name, value: u.id })),
];

/**
 * A draft mirrors what the user has typed/picked so far. It exists because every refine field
 * here (`ore-input`/`ore-textarea`/`ore-select`/`ore-date-picker`/`ore-number-input`) is a
 * *controlled* component: its `value` prop only ever reflects what was last set from the outside
 * (via the `:value=` bindings below) — typing into the field updates its own internal render
 * state and fires an `input`/`change` event, but never writes back into that prop. Reading
 * `el.value` at save time would silently return the pre-edit value, not what the user typed.
 * `@vielzeug/ore/directives`' `model()` doesn't help here either — it hardcodes native
 * `<input>`/`<select>`/`<textarea>` event/value shapes, not these components' custom event
 * `detail` payloads (`values`/`isoValue`/etc. — see each field's `@change`/`@input` below). Each
 * field's own event listener keeps this draft signal current instead.
 */
interface TaskDraft {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string;
  dueDate: string;
  budgetAmount: number | null;
}

function emptyDraft(status: TaskStatus): TaskDraft {
  return { assigneeId: '', budgetAmount: null, description: '', dueDate: '', priority: 'medium', status, title: '' };
}

define('task-dialog', {
  setup() {
    const draft = signal<TaskDraft>(emptyDraft('todo'));
    const editingTask = signal<Task | null>(null);
    const dialogLabel = signal('New task');
    const saveLabel = signal('Create');
    const readOnly = computed(() => {
      const task = editingTask.value;

      return task ? !canUpdateTask(task) : false;
    });
    const canSave = computed(() => {
      const task = editingTask.value;

      return task ? canUpdateTask(task) : true;
    });
    const canDelete = computed(() => {
      const task = editingTask.value;

      return task ? canDeleteTask(task) : false;
    });
    // Only shown after a failed save attempt — an empty title on first open isn't an "error"
    // yet, just an unfilled required field (see `<ore-input required>` below).
    const titleTouched = signal(false);
    const confirmDeleteOpen = signal(false);

    const titleError = computed(() =>
      titleTouched.value && draft.value.title.trim() === '' ? 'Title is required' : '',
    );

    const patchDraft = (patch: Partial<TaskDraft>): void => {
      draft.value = { ...draft.value, ...patch };
    };

    function populate(request: TaskDialogRequest): void {
      titleTouched.value = false;
      confirmDeleteOpen.value = false;

      if (request.kind === 'create') {
        editingTask.value = null;
        draft.value = emptyDraft(request.status);
        dialogLabel.value = 'New task';
        saveLabel.value = 'Create';

        return;
      }

      const task = boardSignal.value.tasks.find((t) => t.id === request.taskId) ?? null;

      editingTask.value = task;

      if (!task) return;

      draft.value = {
        assigneeId: task.assigneeId ?? '',
        budgetAmount: task.budget ? Number(task.budget.amount) : null,
        description: task.description,
        dueDate: task.dueDate ?? '',
        priority: task.priority,
        status: task.status,
        title: task.title,
      };
      dialogLabel.value = task.title;
      saveLabel.value = 'Save';
    }

    effect(() => {
      const request = requestSignal.value;

      if (request) populate(request);
    });

    // `@close=` below is bound directly on `<ore-dialog>`, so it also receives any bubbling
    // `close`-named event from a *descendant* field — `ore-select`/`ore-combobox` each fire their
    // own public `close` event when their dropdown closes, which bubbles right through this
    // dialog's light DOM (no shadow boundary to cross for this hop, since `<ore-dialog>` is a
    // direct light-DOM ancestor of every field here). Without the `e.target` check, selecting an
    // option in any dropdown field closes the whole dialog instead of just that field's dropdown.
    // Also reused as `@click=` on the "Close" button, where `e.target === e.currentTarget` holds
    // for a genuine click (native `click` retargets correctly at shadow boundaries), so the guard
    // is a no-op there.
    const onCancel = (e?: Event): void => {
      if (e && e.target !== e.currentTarget) return;

      requestSignal.value = null;
    };

    const onSave = (): void => {
      void (async () => {
        const title = draft.value.title.trim();

        if (!title) {
          titleTouched.value = true;

          return;
        }

        const patch = {
          assigneeId: draft.value.assigneeId || null,
          budget:
            draft.value.budgetAmount != null ? { amount: draft.value.budgetAmount.toFixed(2), currency: 'USD' } : null,
          description: draft.value.description,
          dueDate: draft.value.dueDate || null,
          priority: draft.value.priority,
          status: draft.value.status,
          title,
        };

        const task = editingTask.value;
        const ok = task
          ? await attemptEditTask(task, patch)
          : Boolean(await attemptCreateTask({ ...patch, ownerId: currentUser.value.id }));

        if (ok) requestSignal.value = null;
      })();
    };

    // "Delete" only opens the confirmation dialog — attemptDeleteTask() is irreversible (no
    // ledger entry to undo it with, unlike edits/moves), so a misclick must not be one click away.
    const onDeleteRequest = (): void => {
      confirmDeleteOpen.value = true;
    };

    // See `onCancel`'s comment above — same dual `@close=`/`@click=` reuse, same guard.
    const onDeleteCancel = (e?: Event): void => {
      if (e && e.target !== e.currentTarget) return;

      confirmDeleteOpen.value = false;
    };

    const onDeleteConfirm = (): void => {
      const task = editingTask.value;

      confirmDeleteOpen.value = false;

      if (!task) return;

      void attemptDeleteTask(task).then((ok) => {
        if (ok) requestSignal.value = null;
      });
    };

    return html`
      <ore-dialog
        size="md"
        dismissible
        :label=${dialogLabel}
        ?open=${() => requestSignal.value !== null}
        @close=${onCancel}>
        <div style="display:flex;flex-direction:column;gap:var(--size-4)">
          <ore-input
            label="Title"
            required
            ?disabled=${readOnly}
            :value=${() => draft.value.title}
            :error=${titleError}
            @input=${(e: Event) => patchDraft({ title: (e as CustomEvent<{ value: string }>).detail.value })}></ore-input>
          <ore-textarea
            label="Description"
            rows="3"
            ?disabled=${readOnly}
            :value=${() => draft.value.description}
            @input=${(e: Event) => patchDraft({ description: (e as CustomEvent<{ value: string }>).detail.value })}></ore-textarea>
          <div style="display:grid;grid-template-columns:minmax(0, 1fr) minmax(0, 1fr);gap:var(--size-4)">
            <ore-select
              label="Status"
              :options=${STATUS_OPTIONS}
              ?disabled=${readOnly}
              :value=${() => draft.value.status}
              @change=${(e: Event) =>
                patchDraft({
                  status: ((e as CustomEvent<{ values: string[] }>).detail.values[0] ??
                    draft.value.status) as TaskStatus,
                })}></ore-select>
            <ore-select
              label="Priority"
              :options=${PRIORITY_OPTIONS}
              ?disabled=${readOnly}
              :value=${() => draft.value.priority}
              @change=${(e: Event) =>
                patchDraft({
                  priority: ((e as CustomEvent<{ values: string[] }>).detail.values[0] ??
                    draft.value.priority) as TaskPriority,
                })}></ore-select>
          </div>
          <div style="display:grid;grid-template-columns:minmax(0, 1fr) minmax(0, 1fr);gap:var(--size-4)">
            <ore-select
              label="Assignee"
              :options=${ASSIGNEE_OPTIONS}
              ?disabled=${readOnly}
              :value=${() => draft.value.assigneeId}
              @change=${(e: Event) =>
                patchDraft({
                  assigneeId: (e as CustomEvent<{ values: string[] }>).detail.values[0] ?? '',
                })}></ore-select>
            <ore-date-picker
              label="Due date"
              ?disabled=${readOnly}
              :value=${() => draft.value.dueDate}
              @change=${(e: Event) =>
                patchDraft({
                  dueDate: (e as CustomEvent<{ isoValue: string | null }>).detail.isoValue ?? '',
                })}></ore-date-picker>
          </div>
          <div style="display:grid;grid-template-columns:minmax(0, 1fr) minmax(0, 1fr);gap:var(--size-4)">
            <ore-number-input
              label="Budget (USD)"
              min="0"
              ?disabled=${readOnly}
              :value=${() => draft.value.budgetAmount}
              @input=${(e: Event) =>
                patchDraft({
                  budgetAmount: (e as CustomEvent<{ value: number | null }>).detail.value,
                })}></ore-number-input>
            <div></div>
          </div>
        </div>
        <div slot="footer" style="display:flex;justify-content:space-between;width:100%">
          ${when(
            canDelete,
            () => html`<ore-button variant="ghost" color="error" @click=${onDeleteRequest}>Delete</ore-button>`,
            () => html`<span></span>`,
          )}
          <div style="display:flex;gap:var(--size-2)">
            <ore-button variant="bordered" @click=${onCancel}>Close</ore-button>
            ${when(
              canSave,
              () => html`<ore-button variant="solid" color="primary" @click=${onSave}>${saveLabel}</ore-button>`,
            )}
          </div>
        </div>
      </ore-dialog>
      <ore-dialog size="sm" dismissible label="Delete task?" ?open=${confirmDeleteOpen} @close=${onDeleteCancel}>
        <p>
          This deletes <strong>${() => editingTask.value?.title ?? 'this task'}</strong> permanently. This action cannot
          be undone.
        </p>
        <div slot="footer" style="display:flex;justify-content:flex-end;gap:var(--size-2);width:100%">
          <ore-button variant="bordered" @click=${onDeleteCancel}>Cancel</ore-button>
          <ore-button variant="solid" color="error" @click=${onDeleteConfirm}>Delete</ore-button>
        </div>
      </ore-dialog>
    `;
  },
  shadow: false,
});
