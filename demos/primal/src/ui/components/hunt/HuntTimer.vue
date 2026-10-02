<script lang="ts" setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { formatDuration } from '../../../app/format';
import { t } from '../../../app/i18n';
import type { HuntTimer } from '../../../domain/types';
import '@vielzeug/refine/button';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/tooltip';

const props = defineProps<{
  timer: HuntTimer;
}>();

const emit = defineEmits<{ pause: []; reset: []; start: [] }>();

const running = computed(() => props.timer.startedAt !== null);
const nowMs = ref(Date.now());
let interval: number | undefined;

const disarm = () => {
  if (interval !== undefined) {
    window.clearInterval(interval);
    interval = undefined;
  }
};

watch(
  running,
  (on) => {
    disarm();
    if (on) interval = window.setInterval(() => (nowMs.value = Date.now()), 500);
  },
  { immediate: true },
);
onBeforeUnmount(disarm);

const elapsed = computed(
  () =>
    props.timer.elapsedMs + (props.timer.startedAt ? Math.max(0, nowMs.value - Date.parse(props.timer.startedAt)) : 0),
);
const display = computed(() => formatDuration(elapsed.value));
const isoDuration = computed(() => `PT${Math.floor(elapsed.value / 1000)}S`);
const used = computed(() => elapsed.value > 0 || running.value);
</script>

<template>
  <div class="hunt-timer" :class="{ 'hunt-timer--idle': !running }">
    <ore-icon aria-hidden="true" class="hunt-timer__icon" name="timer" />
    <time class="hunt-timer__value" :datetime="isoDuration">{{ display }}</time>
    <div class="hunt-timer__controls">
      <ore-tooltip v-if="!running" :content="t('huntTimer.start')" :delay="400">
        <ore-button color="primary" icon-only size="sm" variant="ghost" :label="t('huntTimer.start')"
          @click="emit('start')">
          <ore-icon aria-hidden="true" name="play" />
        </ore-button>
      </ore-tooltip>
      <ore-tooltip v-else :content="t('huntTimer.pause')" :delay="400">
        <ore-button icon-only size="sm" variant="ghost" :label="t('huntTimer.pause')" @click="emit('pause')">
          <ore-icon aria-hidden="true" name="pause" />
        </ore-button>
      </ore-tooltip>
      <ore-tooltip :content="t('huntTimer.reset')" :delay="400">
        <ore-button icon-only size="sm" variant="ghost" :disabled="!used" :label="t('huntTimer.reset')"
          @click="emit('reset')">
          <ore-icon aria-hidden="true" name="rotate-ccw" />
        </ore-button>
      </ore-tooltip>
    </div>
  </div>
</template>

<style scoped>
.hunt-timer {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-2);
  align-items: center;
  padding: var(--size-1) var(--size-2);
  background: color-mix(in oklch, var(--p-panel) 78%, transparent);
  border-radius: var(--rounded-md);
  backdrop-filter: blur(8px);
}

.hunt-timer__icon {
  color: var(--p-text-muted);
}

.hunt-timer__value {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  font-variant-numeric: tabular-nums;
  line-height: var(--leading-tight);
  transition: color var(--transition-fast);
}

/* The clock is the fight's live state and its most-glanced element: the face dims
   whenever the fight's time is not running, readable at arm's length without
   reading a button. */
.hunt-timer--idle .hunt-timer__value {
  color: var(--p-text-muted);
}

.hunt-timer__controls {
  display: flex;
}
</style>
