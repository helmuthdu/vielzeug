import '@vielzeug/refine/input';
import '@vielzeug/refine/select';
import '@vielzeug/refine/button';
import '@vielzeug/refine/badge';
import '@vielzeug/refine/avatar';
import { define, html, onCleanup, onMounted, ref } from '@vielzeug/ore';
import { computed, effect, signal } from '@vielzeug/ripple';
import { toSearchMatcher } from '@vielzeug/scout';
import { createVirtualScroller } from '@vielzeug/scroll';
import { boardSignal } from '../../core/board-store';
import { controlValue } from '../../core/control-value';
import { formatDueDate } from '../../core/format';
import { t } from '../../core/i18n';
import { taskIndex } from '../../core/search-index';
import type { Task, TaskStatus } from '../../core/types';
import { userInitials, userMap } from '../../core/users';
import { openTaskDialog } from '../components/task-dialog';

const ITEM_HEIGHT = 72;
const PAGE_SIZE = 50;

// `computed()`, not a plain array — see task-dialog.ts's STATUS_OPTIONS for why.
const STATUS_OPTIONS = computed<Array<{ label: string; value: TaskStatus | '' }>>(() => [
  { label: t('task.allStatuses'), value: '' },
  { label: t('task.todo'), value: 'todo' },
  { label: t('task.inProgress'), value: 'in-progress' },
  { label: t('task.review'), value: 'review' },
  { label: t('task.done'), value: 'done' },
]);

const STATUS_COLOR: Record<TaskStatus, string> = {
  done: 'success',
  'in-progress': 'primary',
  review: 'warning',
  todo: 'secondary',
};

const PRIORITY_COLOR: Record<Task['priority'], string> = {
  high: 'var(--color-warning)',
  low: 'var(--color-contrast-400)',
  medium: 'var(--color-info, var(--color-primary))',
  urgent: 'var(--color-error)',
};

function renderTaskRow(task: Task, el: HTMLElement, onOpen: (taskId: string) => void): void {
  el.className = 'backlog__task';
  el.dataset.taskId = task.id;
  el.setAttribute('role', 'button');
  el.tabIndex = 0;
  el.style.setProperty('--priority-color', PRIORITY_COLOR[task.priority]);

  // Recycled across renders (@vielzeug/scroll reuses row elements) — clear, then rebuild via
  // textContent/createElement rather than innerHTML: task title/description are now user-authored
  // (the task dialog lets anyone create/edit a task), so interpolating them into an HTML string
  // would be a stored-XSS vector.
  el.replaceChildren();

  const priorityDot = document.createElement('span');

  priorityDot.className = 'backlog__task-priority';
  priorityDot.title = `${task.priority} priority`;
  el.appendChild(priorityDot);

  const main = document.createElement('span');

  main.className = 'backlog__task-main';

  const titleEl = document.createElement('span');

  titleEl.className = 'backlog__task-title';
  titleEl.textContent = task.title;
  main.appendChild(titleEl);

  const descEl = document.createElement('span');

  descEl.className = 'backlog__task-desc';
  descEl.textContent = task.description;
  main.appendChild(descEl);

  el.appendChild(main);

  if (task.assigneeId) {
    const av = document.createElement('ore-avatar') as HTMLElement;

    av.setAttribute('size', 'xs');
    av.setAttribute('alt', userMap.value.get(task.assigneeId)?.name ?? task.assigneeId);
    av.setAttribute('initials', userInitials(task.assigneeId));
    el.appendChild(av);
  } else {
    el.appendChild(document.createElement('span'));
  }

  const due = document.createElement('span');

  due.className = 'backlog__task-due';
  due.textContent = task.dueDate ? formatDueDate(task.dueDate) : '';
  el.appendChild(due);

  const badge = document.createElement('ore-badge') as HTMLElement;

  badge.setAttribute('color', STATUS_COLOR[task.status]);
  badge.setAttribute('variant', 'flat');
  badge.setAttribute('size', 'sm');
  badge.textContent = task.status;
  el.appendChild(badge);

  el.onclick = () => onOpen(task.id);
  el.onkeydown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen(task.id);
    }
  };
}

/**
 * `<backlog-view>` — page chrome (heading, toolbar, pagination) is declarative; the list itself
 * stays entirely imperative. `@vielzeug/scroll`'s `createVirtualScroller` owns a *recycled* pool
 * of row elements it reuses across renders — that pooling contract is inherently imperative (an
 * `each()`-style keyed reconciler would fight it, not complement it), so `renderTaskRow()` and
 * the scroller wiring below are unchanged from the pre-ore version, just moved into `onMounted()`.
 */
define('backlog-view', {
  setup() {
    // Derived arrays replace the former local source: filter + paginate are ordinary
    // computed values over board + search + status signals, keeping ranking and
    // filtering explicit in the application layer.
    const searchSignal = signal('');
    const pageSignal = signal(1);
    const statusFilterSignal = signal<TaskStatus | ''>('');

    const matcher = toSearchMatcher(taskIndex);

    const filteredTasks = computed(() => {
      const tasks = boardSignal.value.tasks;
      const status = statusFilterSignal.value;
      const statusFiltered = status ? tasks.filter((task) => task.status === status) : tasks;
      const search = searchSignal.value;

      return search ? statusFiltered.filter((task) => matcher(task, search)) : statusFiltered;
    });

    const pageCount = computed(() => Math.max(1, Math.ceil(filteredTasks.value.length / PAGE_SIZE)));
    const safePage = computed(() => Math.min(pageSignal.value, pageCount.value));
    const pagedTasks = computed(() => {
      const start = (safePage.value - 1) * PAGE_SIZE;

      return filteredTasks.value.slice(start, start + PAGE_SIZE);
    });

    const pageInfoText = computed(() =>
      t('backlog.pageInfo', { page: safePage.value, pageCount: pageCount.value, total: filteredTasks.value.length }),
    );
    const canGoPrev = computed(() => safePage.value > 1);
    const canGoNext = computed(() => safePage.value < pageCount.value);

    const listAreaRef = ref<HTMLElement>();

    const openTask = (taskId: string): void => openTaskDialog({ kind: 'edit', taskId });

    onMounted(() => {
      const listArea = listAreaRef.value!;

      const scroller = createVirtualScroller<Task>(listArea, {
        estimateSize: ITEM_HEIGHT,
        getItemKey: (_index, task) => task.id,
        render({ items, listEl, recycle }) {
          for (const { data, size, start } of items) {
            const el = recycle(data.id, () => document.createElement('div'));

            el.style.cssText = `position:absolute;top:${start}px;width:100%;height:${size}px;`;
            renderTaskRow(data, el, openTask);

            if (!el.parentElement) listEl.appendChild(el);
          }
        },
      });

      const syncEffect = effect(() => {
        scroller.setItems([...pagedTasks.value]);
      });

      onCleanup(() => {
        syncEffect.dispose();
        scroller.dispose();
      });
    });

    const onSearchInput = (e: Event): void => {
      searchSignal.value = controlValue(e) ?? '';
      pageSignal.value = 1;
    };

    const onSearchChange = (e: Event): void => {
      searchSignal.value = controlValue(e) ?? '';
      pageSignal.value = 1;
    };

    const onFilterChange = (e: Event): void => {
      statusFilterSignal.value = (controlValue(e) ?? '') as TaskStatus | '';
      pageSignal.value = 1;
    };

    return html`
      <h1>${() => t('backlog.title')}</h1>
      <div class="backlog__toolbar">
        <ore-input
          placeholder=${() => t('backlog.searchPlaceholder')}
          type="search"
          clearable
          @input=${onSearchInput}
          @change=${onSearchChange}></ore-input>
        <ore-select
          placeholder=${() => t('backlog.filterByStatus')}
          options=${STATUS_OPTIONS}
          @change=${onFilterChange}></ore-select>
      </div>
      <div class="backlog__list-area" ref=${listAreaRef}></div>
      <div class="backlog__pagination">
        <ore-button
          variant="bordered"
          size="sm"
          ?disabled=${() => !canGoPrev.value}
          @click=${() => {
            pageSignal.value = safePage.value - 1;
          }}>
          ${() => t('backlog.prev')}
        </ore-button>
        <span class="backlog__pagination-info">${pageInfoText}</span>
        <ore-button
          variant="bordered"
          size="sm"
          ?disabled=${() => !canGoNext.value}
          @click=${() => {
            pageSignal.value = safePage.value + 1;
          }}>
          ${() => t('backlog.next')}
        </ore-button>
      </div>
    `;
  },
  shadow: false,
});

export function createBacklogView(): HTMLElement {
  const el = document.createElement('backlog-view');

  el.className = 'backlog';

  return el;
}
