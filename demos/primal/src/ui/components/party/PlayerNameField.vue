<script lang="ts" setup>
import { onBeforeUnmount, ref, watch } from 'vue';
import { t } from '../../../app/i18n';
import { notifyError, runCommand } from '../../../app/store';
import type { SubjectRef } from '../../../domain/types';
import '@vielzeug/refine/input';

const props = defineProps<{
  member: { hunterId: string; playerName: string };
  subject: SubjectRef;
}>();

const playerName = ref(props.member.playerName);
let timer: ReturnType<typeof setTimeout> | undefined;
let pending: { hunterId: string; name: string; subject: SubjectRef } | null = null;

function save(): void {
  if (timer) clearTimeout(timer);
  timer = undefined;
  const change = pending;
  pending = null;
  if (!change) return;
  try {
    runCommand('setHunterPlayerName', change.subject, change.hunterId, change.name);
  } catch (error) {
    notifyError('toasts.actionNotPossible', error);
  }
}

function update(event: Event): void {
  playerName.value = (event.target as HTMLInputElement).value;
  pending = { hunterId: props.member.hunterId, name: playerName.value, subject: props.subject };
  if (timer) clearTimeout(timer);
  timer = setTimeout(save, 500);
}

watch(
  () => props.member.hunterId,
  () => {
    save();
    playerName.value = props.member.playerName;
  },
);
watch(
  () => props.member.playerName,
  (value) => {
    if (!pending) playerName.value = value;
  },
);
onBeforeUnmount(save);
</script>

<template>
  <ore-input :label="t('party.playerName')" :maxlength="24" :value="playerName" @input="update" />
</template>
