import '@vielzeug/refine/input';
import '@vielzeug/refine/select';
import '@vielzeug/refine/button';
import '@vielzeug/refine/badge';
import '@vielzeug/refine/avatar';
import { define, html, onCleanup, onMounted, ref } from '@vielzeug/ore';
import { computed, signal } from '@vielzeug/ripple';
import { toSearchMatcher } from '@vielzeug/scout';
import { createVirtualScroller } from '@vielzeug/scroll';
import { createLocalSource } from '@vielzeug/sourcerer';

import type { Task, TaskStatus } from '../../core/types';

import { boardSignal } from '../../core/board-store';
import { formatDueDate } from '../../core/format';
import { t } from '../../core/i18n';
import { taskIndex } from '../../core/search-index';
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
  el.dataset['taskId'] = task.id;
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
    // Split into raw page-state signals + a derived `t()` string, rather than one settable
    // string signal — a plain string set once inside `syncView()` (below) would go stale in
    // whatever language it was built in until the next page change; deriving it lets it
    // re-translate immediately when the locale changes too.
    const pageNumber = signal(1);
    const pageCount = signal(1);
    const totalItems = signal(0);
    const pageInfoText = computed(() =>
      t('backlog.pageInfo', { page: pageNumber.value, pageCount: pageCount.value, total: totalItems.value }),
    );
    const canGoPrev = signal(false);
    const canGoNext = signal(false);

    const listAreaRef = ref<HTMLElement>();

    let statusFilter: TaskStatus | '' = '';

    const source = createLocalSource<Task>(boardSignal.value.tasks, {
      initialQuery: { pageSize: PAGE_SIZE },
      match: toSearchMatcher(taskIndex),
    });

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

      function syncView(): void {
        const snapshot = source.snapshot;

        scroller.setItems([...snapshot.data]);

        pageNumber.value = snapshot.pagination.index;
        pageCount.value = snapshot.pagination.count;
        totalItems.value = snapshot.pagination.total;
        canGoPrev.value = snapshot.pagination.hasPrevious;
        canGoNext.value = snapshot.pagination.hasNext;
      }

      source.subscribe(syncView);
      syncView();

      let _prevTasks = boardSignal.value.tasks;

      function refreshSourceData(): void {
        const tasks = boardSignal.value.tasks;

        if (tasks === _prevTasks) return;

        _prevTasks = tasks;

        const filtered = statusFilter ? tasks.filter((t) => t.status === statusFilter) : tasks;

        source.setData(filtered);
      }

      const boardSub = boardSignal.subscribe(refreshSourceData);

      onCleanup(() => {
        boardSub.dispose();
        scroller.dispose();
        source.dispose();
      });
    });

    const onSearchInput = (e: Event): void => {
      const query = (e.currentTarget as HTMLElementTagNameMap['ore-input']).value ?? '';

      source.setQuery({ search: query });
    };

    const onSearchChange = (e: Event): void => {
      const query = (e.currentTarget as HTMLElementTagNameMap['ore-input']).value ?? '';

      source.setQuery({ search: query });
    };

    const onFilterChange = (e: Event): void => {
      statusFilter = (e.currentTarget as HTMLElementTagNameMap['ore-select']).value as TaskStatus | '';

      const tasks = boardSignal.value.tasks;
      const filtered = statusFilter ? tasks.filter((t) => t.status === statusFilter) : tasks;

      source.setData(filtered);
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
          @click=${() => source.page.previous()}>
          ${() => t('backlog.prev')}
        </ore-button>
        <span class="backlog__pagination-info">${pageInfoText}</span>
        <ore-button variant="bordered" size="sm" ?disabled=${() => !canGoNext.value} @click=${() => source.page.next()}>
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
