<script lang="ts" setup>
import { computed, ref } from 'vue';
import { pendingHostSubject, type SessionSubject, sessionDialogOpen, sessionState } from '../../app/events';
import { t } from '../../app/i18n';
import { useReadable } from '../../app/vue-bridge';
import { ASCENT_NAME_MAX } from '../../domain/ascent';
import ConfirmDialog from './ConfirmDialog.vue';
import LinkButton from './LinkButton.vue';
import '@vielzeug/refine/button';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/input';
import '@vielzeug/refine/text';

/**
 * The management band every game mode's detail screen wears at the page's end: the run's
 * standing on this device and its delete, confirmed through the shared dialog. Views pass
 * their own delete copy and react to the confirmed event.
 */
const props = withDefaults(
  defineProps<{
    deleteBody: string;
    deleteLabel: string;
    deleteTitle: string;
    guest?: boolean;
    hostable: boolean;
    name?: string;
    nameLabel?: string;
    renameTitle?: string;
    subject: SessionSubject;
  }>(),
  { guest: false },
);

const emit = defineEmits<{ remove: []; rename: [name: string] }>();

const confirming = ref(false);
const renaming = ref(false);
const draftName = ref('');
const session = useReadable(sessionState);
const hostingThisGame = computed(
  () =>
    session.value.mode === 'host' &&
    session.value.subject.id === props.subject.id &&
    session.value.subject.kind === props.subject.kind,
);

function openRename(name: string): void {
  draftName.value = name;
  renaming.value = true;
}

function confirmRename(): void {
  const name = draftName.value.trim();
  if (!name || name.length > ASCENT_NAME_MAX) return;
  renaming.value = false;
  emit('rename', name);
}

function confirm(): void {
  confirming.value = false;
  emit('remove');
}

function openSession(): void {
  pendingHostSubject.update(() => props.subject);
  sessionDialogOpen.update(() => true);
}

</script>

<template>
  <section aria-labelledby="management-title" class="management">
    <div>
      <ore-text as="h2" id="management-title" size="xs" variant="overline">
        {{ t(props.guest ? 'management.guestTitle' : 'management.title') }}
      </ore-text>
      <ore-text color="muted" size="sm">{{ t(props.guest ? 'management.guestHint' : 'management.hint') }}</ore-text>
    </div>
    <div class="management__actions">
      <div class="management__utilities" v-if="!props.guest">
        <ore-button size="md" variant="ghost" v-if="props.name !== undefined" @click="openRename(props.name)">
          <ore-icon name="pencil" slot="prefix" />
          {{ t('campaigns.rename') }}
        </ore-button>
        <slot />
        <ore-button class="management__share" size="md" variant="ghost" v-if="props.hostable || hostingThisGame" @click="openSession">
          <ore-icon name="waypoints" slot="prefix" />
          {{ t(hostingThisGame ? 'management.sessionDetails' : 'management.hostSession') }}
        </ore-button>
        <LinkButton
          class="management__backup"
          size="md"
          to="settings"
          variant="ghost"
          :query="{ section: 'data' }">
          <ore-icon name="database" slot="prefix" />
          {{ t('management.backup') }}
        </LinkButton>
      </div>
      <div class="management__primary" v-if="!props.guest && $slots.primary">
        <slot name="primary" />
      </div>
      <div class="management__remove">
        <ore-button
          size="md"
          :color="props.guest ? undefined : 'error'"
          :variant="props.guest ? 'bordered' : 'ghost'"
          @click="confirming = true">
          <ore-icon slot="prefix" :name="props.guest ? 'log-out' : 'trash-2'" />
          {{ props.guest ? t('management.leaveLabel') : props.deleteLabel }}
        </ore-button>
      </div>
    </div>

    <ConfirmDialog
      :confirm-disabled="!draftName.trim() || draftName.trim().length > ASCENT_NAME_MAX"
      :confirm-label="t('campaigns.save')"
      :open="renaming"
      :title="renameTitle ?? t('campaigns.renameTitle')"
      @cancel="renaming = false"
      @confirm="confirmRename">
      <form @submit.prevent="confirmRename">
        <ore-input
          fullwidth
          :label="nameLabel ?? t('campaignCreate.nameLabel')"
          :maxlength="ASCENT_NAME_MAX"
          :value="draftName"
          @input="draftName = ($event.target as HTMLInputElement).value" />
      </form>
    </ConfirmDialog>

    <ConfirmDialog
      :confirm-label="props.guest ? t('management.leaveLabel') : t('common.delete')"
      :danger="!props.guest"
      :open="confirming"
      :title="props.guest ? t('management.leaveTitle') : props.deleteTitle"
      @cancel="confirming = false"
      @confirm="confirm">
      <ore-text>{{ props.guest ? t('management.leaveBody') : props.deleteBody }}</ore-text>
    </ConfirmDialog>
  </section>
</template>

<style scoped>
.management {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--size-4);
  align-items: center;
  padding-block: var(--size-4);
  border-top: var(--border) solid var(--p-line);
}

.management__actions {
  display: flex;
  gap: var(--size-3);
  align-items: center;
  justify-content: flex-end;
}

.management__utilities {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-2);
  align-items: center;
}

.management__remove {
  padding-inline-start: var(--size-3);
  border-inline-start: var(--border) solid var(--p-line);
}

.management__primary > :deep(*) {
  width: 100%;
}

@media (width < 960px) {
  .management {
    grid-template-columns: minmax(0, 1fr);
  }

  .management__actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  .management__utilities {
    display: flex;
    flex-wrap: wrap;
  }

  .management__utilities > :deep(*) {
    flex: 1 1 calc((100% - var(--size-2)) / 2);
    min-width: 0;
  }

  .management__remove {
    padding-block-start: var(--size-3);
    padding-inline-start: 0;
    border-block-start: var(--border) solid var(--p-line);
    border-inline-start: 0;
  }

  .management__remove > :deep(*) {
    width: 100%;
  }
}

@media (width < 380px) {
  .management__utilities > :deep(*) {
    flex: 0 0 auto;
    width: 100%;
  }
}

@media (width < 400px) {
  .management__utilities > :deep(.management__share),
  .management__utilities > :deep(.management__backup) {
    flex-basis: 100%;
  }
}
</style>
