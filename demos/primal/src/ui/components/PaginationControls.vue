<script lang="ts" setup>
import type { CursorPagination, PagePagination } from '@vielzeug/sourcerer';
import { computed } from 'vue';
import { t } from '../../app/i18n';
import '@vielzeug/refine/button';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/text';
import '@vielzeug/refine/tooltip';

/**
 * The pager row for paginated lists. Two pagination shapes, one component: numbered
 * pages (local sources) render "page / count" and emit page numbers; cursor pages
 * (remote sources) render the direction buttons only and emit previous and next,
 * since a cursor knows no page numbers.
 */
const props = defineProps<{ pagination: PagePagination | CursorPagination }>();
const emit = defineEmits<{ next: []; page: [page: number]; previous: [] }>();

/** The shape-neutral pager state both modes render from. */
const pager = computed(() => {
  const pagination = props.pagination;
  if ('page' in pagination) {
    return {
      current: pagination.page,
      hasNext: pagination.hasNext,
      hasPrevious: pagination.hasPrevious,
      label: `${pagination.page} / ${pagination.pageCount}`,
      status: t('common.pageStatus', { page: pagination.page, total: pagination.pageCount }),
    };
  }
  return {
    current: null,
    hasNext: pagination.nextCursor !== undefined,
    hasPrevious: pagination.previousCursor !== undefined,
    label: '',
    status: '',
  };
});

function goBack(): void {
  if ('page' in props.pagination) emit('page', props.pagination.page - 1);
  else emit('previous');
}

function goNext(): void {
  if ('page' in props.pagination) emit('page', props.pagination.page + 1);
  else emit('next');
}
</script>

<template>
  <nav
    class="pagination"
    v-if="pager.hasPrevious || pager.hasNext"
    :aria-label="t('common.pagination')">
    <ore-tooltip :content="t('common.previousPage')" :delay="400">
      <ore-button
        icon-only
        size="sm"
        variant="bordered"
        :disabled="!pager.hasPrevious"
        :label="t('common.previousPage')"
        @click="goBack">
        <ore-icon aria-hidden="true" name="chevron-left" />
      </ore-button>
    </ore-tooltip>
    <template v-if="pager.current !== null">
      <ore-text aria-current="page" color="muted" size="sm">
        {{ pager.label }}
      </ore-text>
      <span aria-live="polite" class="visually-hidden" role="status">
        {{ pager.status }}
      </span>
    </template>
    <ore-tooltip :content="t('common.nextPage')" :delay="400">
      <ore-button
        icon-only
        size="sm"
        variant="bordered"
        :disabled="!pager.hasNext"
        :label="t('common.nextPage')"
        @click="goNext">
        <ore-icon aria-hidden="true" name="chevron-right" />
      </ore-button>
    </ore-tooltip>
  </nav>
</template>

<style scoped>
.pagination {
  display: flex;
  gap: var(--size-3);
  align-items: center;
  justify-content: center;
}
</style>
