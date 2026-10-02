<script lang="ts" setup>
import { asset } from '../../app/assets';
import '@vielzeug/refine/text';

const props = defineProps<{
  /** CSS `background-position` for the art: portrait art anchors its subject instead of the
   *  default centre, which crops a standing figure's head in the wide header band. */
  artPosition?: string;
  art?: string;
  compact?: boolean;
  eyebrow?: string;
  title: string;
  subtitle?: string;
}>();
</script>

<template>
  <header
    class="page-header"
    :class="{ 'page-header--compact': props.compact, 'page-header--illustrated': props.art }"
    :style="{
      ...(props.art ? { '--page-header-art': `url(${asset(props.art)})` } : {}),
      ...(props.art && props.artPosition ? { '--page-header-art-position': props.artPosition } : {}),
    }">
    <div class="stack" style="--stack-gap: 0.35rem">
      <ore-text variant="overline" v-if="eyebrow">{{ eyebrow }}</ore-text>
      <ore-text as="h1" class="page-header__title" size="lg" variant="heading">{{ title }}</ore-text>
      <ore-text class="page-header__subtitle" color="muted" v-if="subtitle">{{ subtitle }}</ore-text>
    </div>
    <div class="page-header__center" v-if="$slots.center"><slot name="center" /></div>
    <div class="cluster" v-if="$slots.actions"><slot name="actions" /></div>
  </header>
</template>

<style scoped>
.page-header {
  box-sizing: border-box;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: 1rem 2rem;
  align-items: flex-end;
  /* A text-only header is a quiet title band: it clears the copy and no more, never staging
     the tall margin an illustrated band reserves for its art. */
  min-height: 9rem;
  padding-bottom: 1rem;
  margin-bottom: 1.5rem;
}

.page-header--illustrated {
  position: relative;
  /* The illustrated band is a fixed stage: every art page wears the same masthead height, so
     navigating never shifts the page's vertical rhythm. Content anchors to the band's bottom. */
  height: 15rem;
  padding: clamp(1.25rem, 3vw, 2.5rem);
  overflow: hidden;
  background: var(--p-panel-sunken);
  border: var(--border) solid var(--p-line);
  border-radius: var(--rounded-sm);
  isolation: isolate;
}

.page-header--illustrated::before,
.page-header--illustrated::after {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: '';
}

.page-header--illustrated::before {
  right: -20%;
  left: 5%;
  z-index: -2;
  background: var(--page-header-art) var(--page-header-art-position, center) / cover no-repeat;
}

.page-header--illustrated::after {
  z-index: -1;
  background: linear-gradient(
    90deg,
    var(--p-panel) 0%,
    color-mix(in oklch, var(--p-panel) 96%, transparent) 42%,
    color-mix(in oklch, var(--p-panel) 72%, transparent) 58%,
    transparent 82%
  );
}

.page-header--illustrated > * {
  position: relative;
  z-index: 1;
}

.page-header > .stack {
  grid-column: 1;
  min-width: 0;
}

.page-header__center {
  display: flex;
  grid-column: 2;
  justify-content: center;
  min-width: 0;
}

.page-header > .cluster {
  grid-column: 3;
  justify-content: flex-end;
  justify-self: end;
  min-width: 0;
}

.page-header__title {
  --text-size: clamp(1.5rem, 1.1rem + 1.6vw, 2.4rem);
}

.page-header__subtitle {
  max-width: 60ch;
}

@media (width < 640px) {
  /* Phone width is one column for every variant: a wide action cluster beside the text
     crushes it into a sliver (a five-action detail header left the title 55px wide), and
     coarse-pointer promotion grows the buttons past what a side column can hold. The phone
     header also sizes to its content again: both desktop bands assume art-room width. */
  .page-header {
    grid-template-columns: minmax(0, 1fr);
    min-height: 0;
  }

  .page-header--illustrated {
    height: auto;
    min-height: 13rem;
  }

  /* A compact illustrated header trades art space for reachability (list pages). */
  .page-header--illustrated.page-header--compact {
    min-height: 8rem;
  }

  .page-header__center {
    grid-row: 3;
    grid-column: 1;
  }

  .page-header > .cluster {
    grid-row: 2;
    grid-column: 1;
    justify-self: start;
  }

  .page-header--illustrated {
    padding: var(--size-3);
  }

  .page-header--illustrated::before {
    left: 0;
  }

  .page-header--illustrated::after {
    background: linear-gradient(
      90deg,
      var(--p-panel) 0%,
      color-mix(in oklch, var(--p-panel) 94%, transparent) 56%,
      color-mix(in oklch, var(--p-panel) 64%, transparent) 100%
    );
  }
}
</style>
