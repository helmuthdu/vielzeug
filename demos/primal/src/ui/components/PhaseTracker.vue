<script lang="ts" setup>
import { computed } from 'vue';
import { asset } from '../../app/assets';
import { t } from '../../app/i18n';

export type PhaseEntry = Readonly<{ id: string; label: string }>;

const props = defineProps<{
  current: string;
  entries: readonly PhaseEntry[];
  /**
   * Drives plain left-clicks on revisit links (when given, the click is intercepted and routed
   * through the callback instead of the anchor's native navigation). Use it to keep phase links
   * out of the history stack; the href stays for open-in-new-tab and modifier clicks.
   */
  follow?: (phase: string) => void;
  /** Builds a phase's route href; when given, revisit-able steps render as links. */
  hrefOf?: (phase: string) => string;
  label?: string;
  revisit?: readonly string[];
}>();
const emit = defineEmits<{ revisit: [phase: string] }>();
const currentIndex = computed(() => props.entries.findIndex((entry) => entry.id === props.current));
const canRevisit = (entry: PhaseEntry, index: number) =>
  props.revisit?.includes(entry.id) === true && index < currentIndex.value;

/** Plain left-clicks follow the callback; every other click keeps the anchor's native behavior. */
function onLinkClick(event: MouseEvent, phase: string): void {
  if (
    !props.follow ||
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }
  event.preventDefault();
  props.follow(phase);
}
</script>

<template>
  <nav
    class="phases"
    :aria-label="props.label ?? t('phases.label')"
    :style="{
      '--struggle-icon': `url(${asset('/icons/icon_struggle.svg')})`,
    }">
    <div class="phases__summary">
      <span>{{ props.label ?? t('phases.progress') }}</span>
      <strong>
        {{
          t('phases.stepOf', {
            current: currentIndex + 1,
            phase: props.entries[currentIndex]?.label,
            total: props.entries.length,
          })
        }}
      </strong>
    </div>
    <ol class="phases__list" :style="{ '--phase-count': props.entries.length }">
      <li
        class="phases__item"
        v-for="(entry, index) in props.entries"
        :key="entry.id"
        :class="{
          'phases__item--complete': index < currentIndex,
          'phases__item--current': entry.id === props.current,
          'phases__item--to-current': index === currentIndex - 1,
        }">
        <a
          class="phases__step"
          v-if="canRevisit(entry, index) && hrefOf"
          :aria-label="t('phases.returnTo', { phase: entry.label })"
          :href="hrefOf(entry.id)"
          @click="onLinkClick($event, entry.id)">
          <span aria-hidden="true" class="phases__mark">
            <span class="phases__value">{{ index < currentIndex ? '✓' : index + 1 }}</span>
          </span>
          <span class="phases__label">{{ entry.label }}</span>
        </a>
        <button
          class="phases__step"
          type="button"
          v-else-if="canRevisit(entry, index)"
          :aria-label="t('phases.returnTo', { phase: entry.label })"
          @click="emit('revisit', entry.id)">
          <span aria-hidden="true" class="phases__mark">
            <span class="phases__value">{{ index < currentIndex ? '✓' : index + 1 }}</span>
          </span>
          <span class="phases__label">{{ entry.label }}</span>
        </button>
        <span class="phases__step" v-else :aria-current="entry.id === props.current ? 'step' : undefined">
          <span aria-hidden="true" class="phases__mark">
            <span class="phases__value">{{ index < currentIndex ? '✓' : index + 1 }}</span>
          </span>
          <span class="phases__label">{{ entry.label }}</span>
        </span>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.phases {
  --connector-inset: 1.3rem;
  --connector-top: 1.75rem;
}

@media (min-width: 560px) {
  .phases {
    --connector-inset: 1.5rem;
    --connector-top: 1.95rem;
  }
}

@media (min-width: 900px) {
  .phases {
    --connector-inset: 1.5rem;
    --connector-top: 1.95rem;
  }
}

.phases__summary {
  display: none;
}

.phases__list {
  display: grid;
  grid-template-columns: repeat(var(--phase-count), minmax(0, 1fr));
  min-width: 0;
  padding: 0;
  margin: 0;
  list-style: none;
}

.phases__item {
  position: relative;
  z-index: 0;
}

.phases__item:not(:last-child)::after {
  position: absolute;
  top: var(--connector-top);
  left: calc(50% + var(--connector-inset));
  z-index: 1;
  width: calc(100% - (var(--connector-inset) * 2));
  height: 2px;
  content: '';
  background: color-mix(in oklch, var(--p-gold-dim) 32%, var(--p-panel-raised));
  border-radius: var(--rounded-full);
  transform: translateY(-50%);
  transition: background var(--p-motion) var(--p-ease), opacity var(--p-motion) var(--p-ease);
}

/* Glow layer: blurred line behind the connector. */
.phases__item:not(:last-child)::before {
  position: absolute;
  top: var(--connector-top);
  left: calc(50% + var(--connector-inset));
  z-index: -1;
  width: calc(100% - (var(--connector-inset) * 2));
  height: 2px;
  content: '';
  background: transparent;
  border-radius: var(--rounded-full);
  opacity: 0;
  filter: blur(0.4rem);
  transform: translateY(-50%);
  transition: opacity var(--p-motion) var(--p-ease);
}

@media (max-width: 899px) and (min-width: 560px) {
  .phases__item:not(:last-child)::after,
  .phases__item:not(:last-child)::before {
    height: 2px;
  }
}

.phases__item--complete:not(:last-child)::after {
  background: var(--p-river);
  opacity: 1;
}

.phases__item--complete:not(:last-child)::before {
  background: var(--p-river);
  opacity: 0.3;
}

.phases__item--to-current:not(:last-child)::after {
  background: linear-gradient(90deg, var(--p-river) 0%, var(--p-blood) 100%);
  opacity: 1;
}

.phases__item--to-current:not(:last-child)::before {
  background: linear-gradient(90deg, var(--p-river) 0%, var(--p-blood) 100%);
  opacity: 0.3;
}

.phases__item--current:not(:last-child)::after {
  background: linear-gradient(
    90deg,
    var(--p-blood) 0%,
    color-mix(in oklch, var(--p-gold-dim) 32%, var(--p-panel-raised)) 90%
  );
  opacity: 1;
}

.phases__item--current:not(:last-child)::before {
  background: var(--p-blood);
  opacity: 0.3;
}

.phases__step {
  box-sizing: border-box;
  display: grid;
  gap: 0.35rem;
  justify-items: center;
  width: 100%;
  min-height: 5rem;
  padding: 0.35rem;
  font-family: var(--p-heading);
  font-size: 0.75rem;
  color: var(--p-text-muted);
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-decoration: none;
  background: transparent;
  border: 0;
}

button.phases__step {
  cursor: pointer;
}

button.phases__step:hover {
  color: var(--p-gold);
}

button.phases__step:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.phases__mark {
  --phase-mark-bg: color-mix(in oklch, var(--p-gold-dim) 32%, var(--p-panel-raised));
  --phase-mark-color: var(--p-text-strong);
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3.2rem;
  color: var(--phase-mark-color);
}

.phases__mark::before {
  position: absolute;
  inset: 0;
  z-index: -1;
  content: '';
  background: var(--phase-mark-bg);
  mask: var(--struggle-icon) center / contain no-repeat;
}

.phases__value {
  position: relative;
  z-index: 1;
  padding-top: 0.05rem;
  font-weight: 800;
}

.phases__item--complete .phases__mark {
  --phase-mark-bg: var(--p-river);
  --phase-mark-color: var(--p-text-strong);
}

.phases__item--current .phases__mark {
  --phase-mark-bg: var(--p-blood);
  --phase-mark-color: var(--p-text-strong);
  filter: drop-shadow(0 0 0.3rem color-mix(in oklch, var(--p-blood) 35%, transparent));
}

button.phases__step:hover .phases__mark {
  --phase-mark-bg: color-mix(in oklch, var(--p-gold-dim) 55%, var(--p-panel-raised));
  --phase-mark-color: var(--p-text-strong);
}

.phases__item--current .phases__step {
  font-weight: 700;
  color: var(--p-blood);
}

@media (width < 560px) {
  .phases {
    --connector-inset: 0.95rem;
  }

  .phases__summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--size-4);
    margin-bottom: var(--size-4);
    font-size: 0.8rem;
    color: var(--p-text-muted);
    background: var(--p-panel-sunken);
    border: 1px solid var(--p-line);
    border-radius: var(--rounded-sm);
  }

  .phases__summary strong {
    color: var(--p-text-strong);
  }

  .phases__list {
    grid-template-columns: repeat(var(--phase-count), minmax(0, 1fr));
  }

  .phases__step {
    min-height: 3.5rem;
    padding-inline: 0;
  }

  .phases__mark {
    width: 2.65rem;
    height: 2.8rem;
  }

  .phases__label {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    overflow: hidden;
    white-space: nowrap;
    border: 0;
    clip: rect(0, 0, 0, 0);
  }
}
</style>
