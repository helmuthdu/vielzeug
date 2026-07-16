import '@vielzeug/refine/badge';
import '@vielzeug/refine/avatar';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/icon';
import { bind, define, getHost, html, prop, useEmit } from '@vielzeug/ore';
import { when } from '@vielzeug/ore/directives';

import type { Task } from '../../core/types';

import { dueDateUrgency, formatBudget, formatDueDate } from '../../core/format';
import { userInitials, userMap } from '../../core/users';

const PRIORITY_COLOR: Record<Task['priority'], string> = {
  high: 'warning',
  low: 'secondary',
  medium: 'info',
  urgent: 'error',
};

/** The prop shape `define()` sees — `task` starts `undefined` until `renderTaskCard()` assigns it. */
type TaskCardProps = {
  dragEnabled: boolean;
  task: Task | undefined;
};

/** The contract `renderTaskCard()` guarantees: `task` is always assigned before the element is returned. */
export type TaskCardElement = HTMLElement & {
  dragEnabled: boolean;
  task: Task;
};

type TaskCardEvents = { activate: void };

/**
 * `<task-card>` — ore-authored replacement for the old imperative DOM builder. `shadow: false`
 * (light DOM) is deliberate: `app.css` targets `.task-card`/`.task-card__*` as plain descendant
 * selectors, and a shadow root would put that markup out of its reach.
 *
 * `dragEnabled` is a *separate* JS-only prop from the native `draggable` attribute (rather than
 * e.g. `prop.bool('draggable')`) on purpose: `prop.bool`'s reflection is presence-only
 * (`toggleAttribute`), but the native `draggable` content attribute is an HTML5 *enumerated*
 * attribute — it must literally be the string `"true"` for HTML5 DnD to pick the element up;
 * an empty-string presence attribute resolves to the `"auto"` default, which is not draggable for
 * a plain `<div>`. `bind()` below writes the exact `"true"` string (or removes the attribute) to
 * match what native drag-and-drop actually reads.
 */
define<TaskCardProps>('task-card', {
  props: {
    dragEnabled: prop.data<boolean>(false),
    task: prop.data<Task>(),
  },
  setup(props) {
    const emit = useEmit<TaskCardEvents>();
    const activate = (): void => {
      emit('activate');
    };

    // `renderTaskCard()` always assigns `task` before returning the element (see its own
    // comment on the pre-upgrade property capture) — safe to assert non-null everywhere below.
    const task = (): Task => props.task.value!;

    // Static, never-toggled — purely so `app.css`'s `.task-card` selector matches. `role` and
    // `tabIndex` are intentionally left unset: they're owned by @vielzeug/dnd's createSortable
    // (re-applied on every sync() call), which would fight over them with anything set here.
    getHost().classList.add('task-card');

    bind({
      attr: {
        'aria-label': () => `Open task: ${task().title}`,
        'data-task-id': () => task().id,
        draggable: () => (props.dragEnabled.value ? 'true' : null),
      },
      on: {
        click: activate,
        keydown: (event) => {
          const e = event as KeyboardEvent;

          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            activate();
          }
        },
      },
    });

    const budgetLabel = (): string | null => formatBudget(task().budget);
    const hasFooter = (): boolean => Boolean(task().assigneeId || task().dueDate || budgetLabel());
    const dueClass = (): string => {
      const urgency = dueDateUrgency(task().dueDate, task().status);

      return urgency ? `task-card__due task-card__due--${urgency}` : 'task-card__due';
    };

    return html`
      <div class="task-card__header">
        <ore-chip
          :label=${() => task().priority}
          :color=${() => PRIORITY_COLOR[task().priority]}
          variant="flat"
          size="sm"
          >${() => task().priority}</ore-chip
        >
        <span class="task-card__title">${() => task().title}</span>
      </div>
      ${when(
        () => Boolean(task().description),
        () => html`<p class="task-card__description">${() => task().description}</p>`,
      )}
      ${when(
        hasFooter,
        () => html`
          <div class="task-card__footer">
            ${when(
              () => Boolean(task().assigneeId),
              () => html`
                <ore-avatar
                  size="xs"
                  :alt=${() => userMap.value.get(task().assigneeId ?? '')?.name ?? task().assigneeId}
                  :initials=${() => userInitials(task().assigneeId ?? '')}></ore-avatar>
              `,
            )}
            ${when(
              () => Boolean(task().dueDate),
              () => html`
                <span :class=${dueClass}>
                  <ore-icon name="calendar-days" size="12"></ore-icon>${() => formatDueDate(task().dueDate!)}
                </span>
              `,
            )}
            ${when(
              () => budgetLabel() !== null,
              () => html`<span class="task-card__budget">${budgetLabel}</span>`,
            )}
          </div>
        `,
      )}
    `;
  },
  shadow: false,
});

export function renderTaskCard(
  task: Task,
  opts: {
    draggable?: boolean;
    onClick?: (taskId: string) => void;
  },
): HTMLElement {
  const el = document.createElement('task-card') as TaskCardElement;

  // Safe to assign before the element connects/upgrades: ore's props capture and coerce any
  // pre-upgrade instance property (see `hasPreUpgradeProperty` in @vielzeug/ore/props) the same
  // way React/Vue's own custom-element interop does, so these aren't lost on connect.
  el.task = task;
  el.dragEnabled = Boolean(opts.draggable);

  if (opts.onClick) {
    const onClick = opts.onClick;

    el.addEventListener('activate', () => onClick(task.id));
  }

  return el;
}
