<script lang="ts" setup>
import '@vielzeug/refine/card';
import '@vielzeug/refine/text';

defineProps<{
  context: string;
  lastLabel: string;
  title: string;
}>();
</script>

<template>
  <ore-card class="session-card" padding="none">
    <article class="session-record">
      <div aria-hidden="true" class="session-record__marker">
        <slot name="marker"></slot>
      </div>
      <div class="session-record__body">
        <div class="session-record__content">
          <div class="session-record__heading">
            <ore-text as="h3" size="sm" variant="heading">{{ title }}</ore-text>
            <slot name="status"></slot>
          </div>
          <ore-text color="muted" size="sm">{{ context }}</ore-text>
          <ore-text color="muted" variant="caption">{{ lastLabel }}</ore-text>
          <div class="session-record__meta"><slot name="meta"></slot></div>
        </div>
        <div class="session-record__actions"><slot name="actions"></slot></div>
      </div>
    </article>
  </ore-card>
</template>

<style scoped>
.session-card {
  --card-shadow: none;
  min-width: 0;
}

.session-record {
  --session-marker-image-size: 4.5rem;
  --session-marker-padding: var(--size-4);
  --session-marker-size: calc(
    var(--session-marker-image-size) + var(--session-marker-padding) + var(--session-marker-padding) + var(--border)
  );
  display: grid;
  grid-template-columns: var(--session-marker-size) minmax(0, 1fr);
  min-width: 0;
  min-height: var(--session-marker-size);
}

.session-record__marker {
  display: grid;
  place-items: center;
  min-width: 0;
  padding: var(--session-marker-padding);
  background: var(--p-panel-sunken);
  border-right: var(--border) solid var(--p-line);
}

.session-record__marker :deep(img) {
  width: var(--session-marker-image-size);
  height: var(--session-marker-image-size);
  object-fit: contain;
}

.session-record__body {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  padding: 1rem;
}

.session-record__content {
  display: grid;
  flex: 1 1 24rem;
  gap: 0.25rem;
  min-width: 0;
}

.session-record__heading {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  justify-content: flex-start;
}

.session-record__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  min-height: 2rem;
  padding-top: 0.25rem;
}

.session-record__actions {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  justify-content: flex-end;
}

@media (width < 640px) {
  .session-record {
    --session-marker-image-size: 6.5rem;
    grid-template-columns: minmax(0, 1fr);
    min-height: 0;
  }

  .session-record__marker {
    box-sizing: border-box;
    display: grid;
    min-height: var(--session-marker-size);
    padding: var(--session-marker-padding);
    border-right: 0;
    border-bottom: var(--border) solid var(--p-line);
  }

  .session-record__body {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--size-3);
    padding: var(--size-3);
  }

  .session-record__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--size-2);
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }
}
</style>
