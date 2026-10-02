<script lang="ts" setup>
import { computed } from 'vue';
import { asset } from '../../../app/assets';
import { t } from '../../../app/i18n';
import CardText from '../CardText.vue';
import type { BoardRule, RulePart } from './rules';
import '@vielzeug/refine/alert';
import '@vielzeug/refine/drawer';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/text';

/** Bottom sheet with the full rulebook text for one board token, status or terrain. */
const props = defineProps<{ rule: BoardRule | null; weaponIcon?: string }>();
const emit = defineEmits<{ close: [] }>();

function onOpenChange(event: Event): void {
  if (event.target !== event.currentTarget) return;
  if (!(event as CustomEvent<{ open: boolean }>).detail.open) emit('close');
}

const showTiming = computed(() => props.rule?.hint && props.rule.available);
const showUnavailable = computed(() => props.rule && !props.rule.available);
const showNoRule = computed(() => props.rule && props.rule.parts.length === 0);

const triggerParts = computed(() => props.rule?.parts.filter((p) => p.tone === 'trigger') ?? []);
const effectPart = computed<RulePart | null>(
  () => props.rule?.parts.find((p) => p.tone === 'effect') ?? null,
);
const noteParts = computed(() => props.rule?.parts.filter((p) => p.tone === 'note') ?? []);

const triggerText = computed(() =>
  triggerParts.value.map((p) => p.text).join(': '),
);
</script>

<template>
  <ore-drawer
    backdrop="blur"
    placement="bottom"
    style="--drawer-size: 28rem"
    :open="rule !== null"
    @open-change="onOpenChange">
    <article class="rule" v-if="rule">
      <header class="rule__head">
        <img alt="" class="rule__art" v-if="rule.art" :src="asset(rule.art)" />
        <span aria-hidden="true" class="rule__glyph" v-else>
          <ore-icon :name="rule.icon" />
        </span>
        <ore-text as="h2" class="rule__name" size="md" variant="heading">{{ rule.name }}</ore-text>
      </header>

      <ore-alert class="rule__unavailable" color="info" size="sm" variant="flat" v-if="showUnavailable">
        <ore-icon aria-hidden="true" name="help-circle" slot="icon" />
        {{ t('tokenRule.unavailable') }}
      </ore-alert>

      <div class="rule__main" v-if="effectPart || showTiming || triggerText">
        <ore-text class="rule__when" color="muted" size="sm" v-if="showTiming">
          {{ rule.hint }}
        </ore-text>
        <ore-text class="rule__trigger" color="muted" size="sm" v-if="triggerText">
          {{ triggerText }}
        </ore-text>
        <ore-text class="rule__effect" size="sm" v-if="effectPart">
          <CardText :text="effectPart.text" :weapon-icon="weaponIcon" />
        </ore-text>
      </div>

      <ul class="rule__notes" v-if="noteParts.length > 0">
        <li class="rule__note" v-for="(note, i) in noteParts" :key="`note-${i}`">
          <ore-text size="sm"><CardText :text="note.text" :weapon-icon="weaponIcon" /></ore-text>
        </li>
      </ul>

      <ore-text class="rule__no-rule" color="muted" size="sm" v-if="showNoRule">
        {{ t('tokenRule.noRule') }}
      </ore-text>
    </article>
  </ore-drawer>
</template>

<style scoped>
.rule {
  display: grid;
  gap: var(--size-3);
  max-width: 72ch;
  padding-block-end: var(--size-4);
  margin-inline: auto;
}

.rule__head {
  display: flex;
  gap: var(--size-3);
  align-items: center;
}

.rule__art,
.rule__glyph {
  flex-shrink: 0;
  width: var(--size-10);
  height: var(--size-10);
}

.rule__art {
  object-fit: contain;
}

.rule__glyph {
  display: grid;
  place-items: center;
  font-size: var(--text-xl);
  color: var(--p-gold);
  background: var(--p-panel-sunken);
  border-radius: var(--rounded-full);
}

.rule__name {
  font-family: var(--p-heading);
  line-height: var(--leading-tight);
}

.rule__unavailable {
  min-width: 0;
}

.rule__main {
  display: grid;
  gap: var(--size-1);
}

.rule__when {
  font-style: italic;
}

.rule__trigger {
  font-style: italic;
}

.rule__effect {
  line-height: var(--leading-snug);
}

/* Multi-line effects: the mastery's two faces: read as separate paragraphs,
   not one wrapped block: a half-line of air between the CardText lines. */
.rule__effect :deep(.card-text + .card-text) {
  margin-block-start: var(--size-1-5);
}

.rule__notes {
  display: grid;
  gap: var(--size-2);
  padding: 0;
  padding-inline-start: var(--size-5);
  margin: 0;
  list-style: disc;
}

.rule__note {
  padding-inline-start: var(--size-1);
  line-height: var(--leading-snug);
}

.rule__note ::part(content) {
  line-height: var(--leading-snug);
}

.rule__no-rule {
  line-height: var(--leading-relaxed);
}
</style>
