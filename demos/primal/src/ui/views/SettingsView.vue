<script lang="ts" setup>
import { formatShortcutParts } from '@vielzeug/keymap';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { consent, requestMusicConsent } from '../../app/consent';
import { notify } from '../../app/events';
import { type MessageKey, t, tp } from '../../app/i18n';
import { boundActions, shortcuts } from '../../app/keymap';
import { activityLog } from '../../app/logger';
import { extractPlaylistId, extractVideoId, MUSIC_LIBRARY, parseTimeline } from '../../app/music';
import {
  type AppLocale,
  ascents,
  campaigns,
  challenges,
  expeditions,
  exportSavedData,
  importSavedData,
  loadouts,
  notifyError,
  patchSettings,
  resetSettings,
  setLanguage,
  settings,
  type ThemePreference,
} from '../../app/store';
import { useReadable, useRouteQuery } from '../../app/vue-bridge';
import type { ExpansionId } from '../../domain/types';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import ExpansionPicker from '../components/expansions/ExpansionPicker.vue';
import PageHeader from '../components/PageHeader.vue';
import PageHeaderAction from '../components/PageHeaderAction.vue';
import RouteLink from '../components/RouteLink.vue';
import YouTubeIcon from '../components/YouTubeIcon.vue';
import '@vielzeug/refine/accordion';
import '@vielzeug/refine/accordion-item';
import '@vielzeug/refine/button';
import '@vielzeug/refine/button-group';
import '@vielzeug/refine/card';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/file-input';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/input';
import '@vielzeug/refine/keyboard-key';
import '@vielzeug/refine/list';
import '@vielzeug/refine/list-item';
import '@vielzeug/refine/select';
import '@vielzeug/refine/stats';
import '@vielzeug/refine/switch';
import '@vielzeug/refine/text';
import '@vielzeug/refine/textarea';

const themeOptions = [
  { icon: 'monitor', key: 'settings.themeSystem', value: 'system' },
  { icon: 'sun', key: 'settings.themeLight', value: 'light' },
  { icon: 'moon', key: 'settings.themeDark', value: 'dark' },
] as const satisfies readonly { icon: string; key: MessageKey; value: ThemePreference }[];

const languageOptions = [
  { key: 'settings.languageEnglish', value: 'en' },
  { key: 'settings.languageGerman', value: 'de' },
] as const satisfies readonly { key: MessageKey; value: AppLocale }[];

const shortcutKeys: Record<string, MessageKey> = {
  campaigns: 'shortcuts.campaigns',
  expeditions: 'shortcuts.expeditions',
  forge: 'shortcuts.forge',
  home: 'shortcuts.home',
  manual: 'shortcuts.manual',
  'new-game': 'shortcuts.newGame',
  player: 'shortcuts.player',
  redo: 'shortcuts.redo',
  settings: 'shortcuts.settings',
  undo: 'shortcuts.undo',
};

const current = useReadable(settings);
const routeQuery = useRouteQuery();
const musicConsent = useReadable(consent);
const musicConsentStatus = computed(() =>
  musicConsent.value.music ? t('settings.musicConsentGranted') : t('settings.musicConsentDenied'),
);
const customUrl = ref('');
const customTimeline = ref('');

const selectedMusicId = computed(() => current.value.musicVideoId);
const parsedCustomTracks = computed(() => parseTimeline(customTimeline.value));
/** Playlist URLs win when list= is present: a watch?v=X&list=Y link means the playlist; pure video URLs resolve to the video id. */
const customVideoId = computed(() => extractPlaylistId(customUrl.value) ?? extractVideoId(customUrl.value));
const currentLibraryMusic = computed(() => MUSIC_LIBRARY.find((video) => video.id === selectedMusicId.value));
/** A selection that matches no library entry is a custom video: the only trace of it lives here. */
const isCustomMusic = computed(() => Boolean(selectedMusicId.value) && !currentLibraryMusic.value);

onMounted(() => {
  if (routeQuery.value.section === 'data') {
    void nextTick(() => document.getElementById('settings-data')?.scrollIntoView({ block: 'start' }));
  }
});

// Seed the custom form from what is actually in play, so the current choice stays visible.
watch(
  () => [current.value.musicVideoId, current.value.musicTimeline] as const,
  ([id, timeline]) => {
    if (isCustomMusic.value) {
      customUrl.value = `https://www.youtube.com/watch?v=${id}`;
      customTimeline.value = timeline;
    }
  },
  { immediate: true },
);

function selectMusic(id: string): void {
  patchSettings({ musicTimeline: '', musicVideoId: id });
}

function applyCustomVideo(): void {
  const id = customVideoId.value;
  if (!id) {
    notify('settings.musicInvalidUrl', 'warning');
    return;
  }
  // Playlists carry their own track list: the pasted timeline only applies to single videos.
  const isPlaylist = id.length > 11;
  patchSettings({ musicTimeline: isPlaylist ? '' : customTimeline.value, musicVideoId: id });
}
const savedCampaigns = useReadable(campaigns);
const savedExpeditions = useReadable(expeditions);
const savedAscents = useReadable(ascents);
const savedWinds = useReadable(challenges);
const savedLoadouts = useReadable(loadouts);
const log = useReadable(activityLog);
/** Only shortcuts with a translated label render: a future chord must ship its key, not a blank row. */
const allShortcuts: { id: string; shortcut: string }[] = [
  ...shortcuts,
  ...boundActions,
  { id: 'player', shortcut: 'g p' },
].filter((entry) => Boolean(shortcutKeys[entry.id]));
const recent = computed(() => log.value.slice(0, 12));
/** On phones the page is several screens of scroll; these chips hop straight to a panel. */
const jumpSections = computed(() => [
  { id: 'settings-appearance', label: t('settings.titleAppearance') },
  { id: 'settings-music', label: t('settings.musicTitle') },
  { id: 'settings-shortcuts', label: t('settings.shortcutsTitle') },
  { id: 'settings-library', label: t('settings.libraryTitle') },
  { id: 'settings-data', label: t('settings.dataTitle') },
]);
const boxSummary = computed(() => tp('settings.boxSummary', current.value.ownedExpansionIds.length));
const lastSaved = computed(() => {
  const timestamps = [
    ...savedCampaigns.value,
    ...savedExpeditions.value,
    ...savedAscents.value,
    ...savedWinds.value,
  ]
    .map((entry) => Date.parse(entry.updatedAt))
    .filter(Number.isFinite);
  if (!timestamps.length) return t('settings.noSaves');
  return new Intl.DateTimeFormat(current.value.language, { dateStyle: 'medium' }).format(
    new Date(Math.max(...timestamps)),
  );
});
const backupSize = computed(() => {
  // exportSavedData() walks the vault directly, so the reactive reads below are what keep
  // this fresh: without them the size would freeze at whatever the first render measured.
  void savedCampaigns.value;
  void savedExpeditions.value;
  void savedAscents.value;
  void savedWinds.value;
  void savedLoadouts.value;
  const bytes = new Blob([exportSavedData()]).size;
  if (bytes < 1024) return `${bytes} B`;
  const kilobytes = bytes / 1024;
  return `${kilobytes.toFixed(kilobytes < 10 ? 1 : 0)} KB`;
});
const time = (stamp: Date) => stamp.toLocaleTimeString(current.value.language, { hour: '2-digit', minute: '2-digit' });
/** One keycap per key: Mac modifier symbols and Ctrl/Shift labels alike, from the keymap package. */
const keycapsFor = (shortcut: string) => formatShortcutParts(shortcut).flat();
/** The screen-reader twin spells modifiers out instead of symbols: "Ctrl then Z" reads back. */
const shortcutLabel = (shortcut: string) =>
  formatShortcutParts(shortcut, 'ctrl')
    .map((step) => step.join('+'))
    .join(` ${t('shortcuts.then')} `);
const pendingImport = ref<{ name: string; source: string } | null>(null);
const pendingReset = ref(false);
const importing = ref(false);
const savedRecently = ref(false);
let savedTimer: ReturnType<typeof setTimeout> | null = null;

function markSaved(): void {
  savedRecently.value = true;
  if (savedTimer) clearTimeout(savedTimer);
  savedTimer = setTimeout(() => {
    savedRecently.value = false;
  }, 1600);
}

function onLanguageChange(event: Event): void {
  const value =
    (event as CustomEvent<{ value?: string }>).detail?.value ??
    (event.target as HTMLElement & { value?: string }).value;
  if (value === 'en' || value === 'de') {
    setLanguage(value);
    markSaved();
  }
}

function onThemeChange(value: ThemePreference): void {
  patchSettings({ theme: value });
  markSaved();
}

function onMotionChange(event: Event): void {
  patchSettings({ reducedMotion: (event.target as HTMLInputElement).checked });
  markSaved();
}

function onAutoOpenGameSetupChange(event: Event): void {
  patchSettings({ autoOpenGameSetup: (event.target as HTMLInputElement).checked });
  markSaved();
}

function onMusicAutoLoadChange(event: Event): void {
  patchSettings({ musicAutoLoad: (event.target as HTMLInputElement).checked });
  markSaved();
}

function onMusicAutoPlayChange(event: Event): void {
  patchSettings({ musicAutoPlay: (event.target as HTMLInputElement).checked });
  markSaved();
}

function onExpansionChange(next: ExpansionId[]): void {
  updateOwnedExpansions(next);
  markSaved();
}

function confirmReset(): void {
  resetSettings();
  pendingReset.value = false;
  markSaved();
}

function updateOwnedExpansions(next: ExpansionId[]): void {
  patchSettings({ ownedExpansionIds: next });
}
const importInputKey = ref(0);

function downloadBackup(): void {
  const url = URL.createObjectURL(new Blob([exportSavedData()], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `primal-companion-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  notify('settings.exportToast', 'success');
}

async function selectBackup(event: Event): Promise<void> {
  const file = (event as CustomEvent<{ files?: File[] }>).detail.files?.[0];
  if (!file) return;
  try {
    pendingImport.value = { name: file.name, source: await file.text() };
  } catch {
    notify('settings.importReadFailed', 'error');
    importInputKey.value += 1;
  }
}

/** The file input refuses accept/max-size violations before they ever reach `change`; say so. */
function onFileReject(): void {
  notify('settings.importFileRejected', 'warning');
}

function cancelImport(): void {
  pendingImport.value = null;
  importInputKey.value += 1;
}

async function confirmImport(): Promise<void> {
  const pending = pendingImport.value;
  if (!pending || importing.value) return;
  importing.value = true;
  try {
    const imported = await importSavedData(pending.source);
    notify('settings.importToast', 'success', {
      values: {
        ascents: `${imported.ascents} ${tp('settings.ascentUnit', imported.ascents)}`,
        campaigns: `${imported.campaigns} ${tp('settings.campaignUnit', imported.campaigns)}`,
        expeditions: `${imported.expeditions} ${tp('settings.expeditionUnit', imported.expeditions)}`,
        windsRuns: `${imported.challenges} ${tp('settings.windsUnit', imported.challenges)}`,
      },
    });
  } catch (error) {
    notifyError('settings.importFailed', error);
  } finally {
    importing.value = false;
    cancelImport();
  }
}
</script>

<template>
  <div class="frame settings stack" style="--stack-gap: var(--size-6)">
    <PageHeader
      art="/backgrounds/bg_settings.webp"
      :eyebrow="t('settings.eyebrow')"
      :subtitle="t('settings.subtitle')"
      :title="t('settings.title')">
      <template #actions>
        <span aria-live="polite" class="settings-save-status" role="status">
          <ore-icon aria-hidden="true" name="check" size="14" />
          {{ t(savedRecently ? 'settings.saved' : 'settings.autoSave') }}
        </span>
        <PageHeaderAction icon="rotate-ccw" kind="danger" @click="pendingReset = true">
          {{ t('settings.reset') }}
        </PageHeaderAction>
      </template>
    </PageHeader>

    <nav class="settings-jumps" :aria-label="t('settings.jumpNavLabel')" >
      <a v-for="section in jumpSections" :key="section.id" :href="`#${section.id}`">{{ section.label }}</a>
    </nav>

    <div class="settings-layout">
      <ore-card
        aria-labelledby="appearance-title"
        class="settings-panel settings-panel--appearance"
        id="settings-appearance"
        padding="lg">
        <div class="settings-heading" slot="header">
          <div class="settings-heading__lead">
            <span aria-hidden="true" class="settings-heading__icon"><ore-icon name="palette" size="18" /></span>
            <div>
              <ore-text variant="overline">{{ t('settings.sectionExperience') }}</ore-text>
              <ore-text as="h2" id="appearance-title" size="sm" variant="heading">
                {{ t('settings.titleAppearance') }}
              </ore-text>
            </div>
          </div>
        </div>
        <div class="stack" style="--stack-gap: var(--size-4)">
          <div class="settings-field settings-field--stacked">
            <div class="settings-field__identity">
              <span aria-hidden="true" class="settings-field__icon"><ore-icon name="palette" size="17" /></span>
              <div class="settings-field__copy">
                <ore-text id="theme-label" weight="semibold">{{ t('settings.themeGroupLabel') }}</ore-text>
                <ore-text class="settings-field__hint" color="muted" id="theme-hint" size="sm">
                  {{ t('settings.themeHint') }}
                </ore-text>
              </div>
            </div>
            <ore-button-group
              aria-describedby="theme-hint"
              aria-labelledby="theme-label"
              attached
              class="settings-theme-options"
              fullwidth
              rounded="sm"
              :label="t('settings.themeGroupLabel')">
              <ore-button
                color="primary"
                v-for="option in themeOptions"
                :key="option.value"
                :aria-pressed="current.theme === option.value"
                :class="{ 'is-selected': current.theme === option.value }"
                :variant="current.theme === option.value ? 'solid' : 'bordered'"
                @click="onThemeChange(option.value)">
                <ore-icon aria-hidden="true" size="16" slot="prefix" :name="option.icon" />
                {{ t(option.key) }}
              </ore-button>
            </ore-button-group>
          </div>
          <div class="settings-field settings-field--row">
            <div class="settings-field__identity">
              <span aria-hidden="true" class="settings-field__icon"><ore-icon name="languages" size="17" /></span>
              <div class="settings-field__copy">
                <ore-text id="language-label" weight="semibold">{{ t('settings.languageLabel') }}</ore-text>
                <ore-text class="settings-field__hint" color="muted" id="language-hint" size="sm">
                  {{ t('settings.languageHint') }}
                </ore-text>
              </div>
            </div>
            <ore-select
              aria-describedby="language-hint"
              aria-labelledby="language-label"
              class="language-select"
              color="secondary"
              hide-label
              rounded="sm"
              variant="bordered"
              :label="t('settings.languageLabel')"
              :value="current.language"
              @change="onLanguageChange">
              <option v-for="option in languageOptions" :key="option.value" :value="option.value">
                {{ t(option.key) }}
              </option>
            </ore-select>
          </div>
          <div class="settings-field settings-field--row">
            <div class="settings-field__identity">
              <span aria-hidden="true" class="settings-field__icon"><ore-icon name="zap-off" size="17" /></span>
              <div class="settings-field__copy">
                <ore-text weight="semibold">{{ t('settings.motionLabel') }}</ore-text>
                <ore-text class="settings-field__hint" color="muted" size="sm">{{ t('settings.motionHint') }}</ore-text>
              </div>
            </div>
            <ore-switch
              color="primary"
              :aria-label="t('settings.motionRowLabel')"
              :checked="current.reducedMotion"
              @change="onMotionChange" />
          </div>
        </div>
      </ore-card>

      <ore-card
        aria-labelledby="music-title"
        class="settings-panel settings-panel--music"
        id="settings-music"
        padding="lg">
        <div class="settings-heading" slot="header">
          <div class="settings-heading__lead">
            <span aria-hidden="true" class="settings-heading__icon"><ore-icon name="headphones" size="18" /></span>
            <div>
              <ore-text variant="overline">{{ t('settings.musicSection') }}</ore-text>
              <ore-text as="h2" id="music-title" size="sm" variant="heading">
                {{ t('settings.musicTitle') }}
              </ore-text>
            </div>
          </div>
          <div class="settings-heading__meta">
            <ore-text color="muted" size="sm">{{ t('settings.musicHint') }}</ore-text>
          </div>
        </div>

        <div class="stack" style="--stack-gap: var(--size-4)">
          <div class="settings-field settings-field--row">
            <div class="settings-field__identity">
              <span aria-hidden="true" class="settings-field__icon"><ore-icon name="shield-check" size="17" /></span>
              <div class="settings-field__copy">
                <ore-text weight="semibold">{{ t('consent.musicLabel') }}</ore-text>
                <ore-text class="settings-field__hint" color="muted" size="sm">
                  {{ musicConsentStatus }}
                </ore-text>
              </div>
            </div>
            <ore-button size="sm" variant="bordered" @click="requestMusicConsent()">
              {{ t('consent.change') }}
            </ore-button>
          </div>

          <div class="settings-field settings-field--row">
            <div class="settings-field__identity">
              <span aria-hidden="true" class="settings-field__icon"><ore-icon name="zap" size="17" /></span>
              <div class="settings-field__copy">
                <ore-text weight="semibold">{{ t('settings.musicAutoLoadLabel') }}</ore-text>
                <ore-text class="settings-field__hint" color="muted" size="sm">
                  {{ t('settings.musicAutoLoadHint') }}
                </ore-text>
              </div>
            </div>
            <ore-switch
              color="primary"
              :aria-label="t('settings.musicAutoLoadLabel')"
              :checked="current.musicAutoLoad"
              @change="onMusicAutoLoadChange" />
          </div>

          <div class="settings-field settings-field--row">
            <div class="settings-field__identity">
              <span aria-hidden="true" class="settings-field__icon"><ore-icon name="play" size="17" /></span>
              <div class="settings-field__copy">
                <ore-text weight="semibold">{{ t('settings.musicAutoPlayLabel') }}</ore-text>
                <ore-text class="settings-field__hint" color="muted" size="sm">
                  {{ t('settings.musicAutoPlayHint') }}
                </ore-text>
              </div>
            </div>
            <ore-switch
              color="primary"
              :aria-label="t('settings.musicAutoPlayLabel')"
              :checked="current.musicAutoPlay"
              @change="onMusicAutoPlayChange" />
          </div>

          <fieldset class="music-suggestions" :aria-label="t('settings.musicSuggestions')">
            <div
              class="music-suggestion"
              v-for="video in MUSIC_LIBRARY"
              :key="video.id"
              :class="{ 'music-suggestion--active': selectedMusicId === video.id }">
              <button
                class="music-suggestion__select"
                type="button"
                :aria-pressed="selectedMusicId === video.id"
                @click="selectMusic(video.id)">
                <span class="music-suggestion__name">{{ video.title }}</span>
                <span class="music-suggestion__meta">{{ video.tracks.length }} tracks</span>
              </button>
              <a
                class="music-suggestion__link"
                rel="noopener noreferrer"
                target="_blank"
                :aria-label="t('settings.musicOpenOnYouTube', { title: video.title })"
                :href="`https://www.youtube.com/watch?v=${video.id}`">
                <YouTubeIcon :size="14" />
              </a>
            </div>
          </fieldset>

          <details class="music-custom" :class="{ 'music-custom--active': isCustomMusic }">
            <summary>{{ t('settings.musicCustomLabel') }}</summary>
            <div class="stack" style="--stack-gap: var(--size-3)">
              <ore-input
                fullwidth
                :label="t('settings.musicUrlLabel')"
                :placeholder="t('settings.musicUrlPlaceholder')"
                :value="customUrl"
                @input="customUrl = ($event.target as HTMLInputElement).value" />
              <ore-textarea
                fullwidth
                :label="t('settings.musicTimelineLabel')"
                :placeholder="t('settings.musicTimelinePlaceholder')"
                :rows="5"
                :value="customTimeline"
                @input="customTimeline = ($event.target as HTMLTextAreaElement).value" />
              <ore-text color="muted" size="sm" v-if="parsedCustomTracks.length">
                {{ t('settings.musicTracksParsed', { count: parsedCustomTracks.length }) }}
              </ore-text>
              <ore-button
                color="primary"
                size="sm"
                variant="solid"
                :disabled="!customVideoId"
                @click="applyCustomVideo">
                {{ t('settings.musicApply') }}
              </ore-button>
            </div>
          </details>
        </div>
      </ore-card>

      <ore-card
        aria-labelledby="keys-title"
        class="settings-panel settings-panel--shortcuts"
        id="settings-shortcuts"
        padding="lg">
        <div class="settings-heading" slot="header">
          <div class="settings-heading__lead">
            <span aria-hidden="true" class="settings-heading__icon"><ore-icon name="keyboard" size="18" /></span>
            <div>
              <ore-text variant="overline">{{ t('settings.sectionNavigation') }}</ore-text>
              <ore-text as="h2" id="keys-title" size="sm" variant="heading">
                {{ t('settings.shortcutsTitle') }}
              </ore-text>
            </div>
          </div>
          <ore-text color="muted" size="sm">{{ t('shortcuts.sequenceHint') }}</ore-text>
        </div>
        <dl class="shortcut-list">
          <div class="shortcut-row" v-for="entry in allShortcuts" :key="entry.id">
            <dt>
              <ore-text size="sm" weight="medium">{{ t(shortcutKeys[entry.id] ?? '') }}</ore-text>
            </dt>
            <dd>
              <span class="visually-hidden">{{ shortcutLabel(entry.shortcut) }}</span>
              <ore-keyboard-shortcut aria-hidden="true">
                <template v-for="key in keycapsFor(entry.shortcut)" :key="key">
                  <ore-keyboard-key>{{ key }}</ore-keyboard-key>
                </template>
              </ore-keyboard-shortcut>
            </dd>
          </div>
        </dl>
      </ore-card>

      <ore-card
        aria-labelledby="library-title"
        class="settings-panel settings-panel--wide"
        id="settings-library"
        padding="lg">
        <div class="settings-heading" slot="header">
          <div class="settings-heading__lead">
            <span aria-hidden="true" class="settings-heading__icon"><ore-icon name="package" size="18" /></span>
            <div>
              <ore-text variant="overline">{{ t('settings.librarySection') }}</ore-text>
              <ore-text as="h2" id="library-title" size="sm" variant="heading">
                {{ t('settings.libraryTitle') }}
              </ore-text>
            </div>
          </div>
          <div class="settings-heading__meta">
            <ore-chip color="primary" size="sm" variant="flat">{{ boxSummary }}</ore-chip>
            <ore-text color="muted" size="sm">{{ t('settings.libraryCopy') }}</ore-text>
          </div>
        </div>

        <ExpansionPicker :model-value="current.ownedExpansionIds" @update:model-value="onExpansionChange" />
        <div class="settings-field settings-field--row">
          <div class="settings-field__identity">
            <span aria-hidden="true" class="settings-field__icon"><ore-icon name="settings" size="17" /></span>
            <div class="settings-field__copy">
              <ore-text weight="semibold">{{ t('settings.autoOpenGameSetupLabel') }}</ore-text>
              <ore-text class="settings-field__hint" color="muted" size="sm">
                {{ t('settings.autoOpenGameSetupHint') }}
              </ore-text>
            </div>
          </div>
          <ore-switch
            color="primary"
            :aria-label="t('settings.autoOpenGameSetupLabel')"
            :checked="current.autoOpenGameSetup"
            @change="onAutoOpenGameSetupChange" />
        </div>
      </ore-card>

      <ore-card
        aria-labelledby="data-title"
        class="settings-panel settings-panel--wide"
        id="settings-data"
        padding="lg">
        <div class="settings-heading" slot="header">
          <div class="settings-heading__lead">
            <span aria-hidden="true" class="settings-heading__icon"><ore-icon name="database" size="18" /></span>
            <div>
              <ore-text variant="overline">{{ t('settings.backupSection') }}</ore-text>
              <ore-text as="h2" id="data-title" size="sm" variant="heading">{{ t('settings.dataTitle') }}</ore-text>
            </div>
          </div>
          <ore-text color="muted" size="sm">{{ t('settings.dataCopy') }}</ore-text>
        </div>
        <div class="data-tools">
          <section class="data-tool stack" style="--stack-gap: var(--size-3)">
            <div>
              <ore-text weight="semibold">{{ t('settings.exportTitle') }}</ore-text>
              <ore-text color="muted" size="sm">{{ t('settings.exportCopy') }}</ore-text>
            </div>
            <fieldset class="backup-metadata">
              <legend class="visually-hidden">{{ t('settings.backupContents') }}</legend>
              <ore-stats
                size="sm"
                variant="plain"
                :label="t('settings.statsCampaigns')"
                :value="String(savedCampaigns.length)" />
              <ore-stats
                size="sm"
                variant="plain"
                :label="t('settings.statsExpeditions')"
                :value="String(savedExpeditions.length)" />
              <ore-stats
                size="sm"
                variant="plain"
                :label="t('settings.statsAscents')"
                :value="String(savedAscents.length)" />
              <ore-stats
                size="sm"
                variant="plain"
                :label="t('settings.statsWinds')"
                :value="String(savedWinds.length)" />
              <ore-stats
                size="sm"
                variant="plain"
                :label="t('settings.statsBuilds')"
                :value="String(savedLoadouts.length)" />
              <ore-stats size="sm" variant="plain" :label="t('settings.lastUpdated')" :value="lastSaved" />
              <ore-stats size="sm" variant="plain" :label="t('settings.backupSize')" :value="backupSize" />
            </fieldset>
            <ore-button color="primary" variant="flat" @click="downloadBackup">
              {{ t('settings.exportButton') }}
            </ore-button>
          </section>
          <section class="data-tool stack" style="--stack-gap: var(--size-3)">
            <div>
              <ore-text weight="semibold">{{ t('settings.importButton') }}</ore-text>
              <ore-text color="muted" size="sm">{{ t('settings.importCopy') }}</ore-text>
            </div>
            <ore-file-input
              accept=".json,application/json"
              max-size="26214400"
              size="sm"
              :key="importInputKey"
              :browse-label="t('settings.importBrowseLabel')"
              :dropzone-active-label="t('settings.importDropActiveLabel')"
              :dropzone-hint="t('settings.importFileHelper')"
              :dropzone-label="t('settings.importDropzoneLabel')"
              :files-label="t('settings.importFilesLabel')"
              :label="t('settings.importFileLabel')"
              @change="selectBackup"
              @reject="onFileReject" />
          </section>
        </div>
        <RouteLink class="data-privacy-link" to="privacy">{{ t('consent.privacyLink') }}</RouteLink>
      </ore-card>

      <ore-card class="settings-panel settings-panel--wide" id="settings-diagnostics" padding="lg">
        <ore-accordion class="diagnostics" size="sm" variant="text">
          <ore-accordion-item>
            <span slot="title">
              <ore-text as="h2" size="sm" variant="heading">{{ t('settings.diagnostics') }}</ore-text>
            </span>
            <span slot="subtitle">{{ t('settings.diagnosticsSubtitle') }}</span>
            <ore-list class="activity-list" size="sm" variant="plain">
              <ore-list-item v-for="(entry, index) in recent" :key="index">
                <span class="activity-signal" slot="leading">
                  <span class="numeral time">{{ time(entry.timestamp) }}</span>
                  <ore-chip size="sm" variant="outline">{{ entry.namespace }}</ore-chip>
                </span>
                <ore-text size="sm">{{ entry.message }}</ore-text>
              </ore-list-item>
              <ore-list-item v-if="!recent.length">
                <ore-text color="muted" size="sm">{{ t('settings.diagnosticsEmpty') }}</ore-text>
              </ore-list-item>
            </ore-list>
          </ore-accordion-item>
        </ore-accordion>
      </ore-card>
    </div>

    <ConfirmDialog
      danger
      :confirm-label="t('settings.resetConfirmLabel')"
      :open="pendingReset"
      :title="t('settings.resetConfirmTitle')"
      @cancel="pendingReset = false"
      @confirm="confirmReset">
      <ore-text size="sm">{{ t('settings.resetConfirmBody') }}</ore-text>
    </ConfirmDialog>

    <ConfirmDialog
      danger
      :confirm-disabled="importing"
      :confirm-label="t('settings.importConfirm')"
      :open="pendingImport !== null"
      :title="t('settings.importDialogTitle')"
      @cancel="cancelImport"
      @confirm="confirmImport">
      <div class="stack" style="--stack-gap: var(--size-2)">
        <ore-text>{{ t('settings.importDialogBody', { name: pendingImport?.name ?? '' }) }}</ore-text>
        <ore-text color="muted" size="sm">{{ t('settings.importDialogWarn') }}</ore-text>
      </div>
    </ConfirmDialog>
  </div>
</template>

<style scoped>
.settings-layout {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--size-6);
  align-items: start;
}

.settings-panel {
  --card-shadow: none;
  min-width: 0;
}

/* Anchor jumps from the section chips land clear of the top edge. */
.settings-panel {
  scroll-margin-block-start: var(--size-6);
}

.settings-jumps {
  display: none;
}

/* Below the two-column width the page is several screens of scroll; chips hop to a panel. */
@media (width < 900px) {
  .settings-jumps {
    display: flex;
    gap: var(--size-2);
    padding-bottom: var(--size-1);
    overflow-x: auto;
    scrollbar-width: none;
  }
}

.settings-jumps a {
  display: inline-flex;
  flex: none;
  align-items: center;
  min-height: 2.75rem;
  padding: var(--size-1) var(--size-3);
  font-size: var(--text-sm);
  color: var(--p-text);
  text-decoration: none;
  background: var(--p-panel-sunken);
  border: var(--border) solid var(--p-line);
  border-radius: var(--rounded-full);
}

.settings-jumps a:hover,
.settings-jumps a:focus-visible {
  border-color: var(--p-gold);
}

.settings-jumps a:focus-visible {
  outline: 2px solid var(--p-gold);
  outline-offset: 2px;
}

.settings-panel--wide {
  grid-column: 1 / -1;
}

.settings-heading {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-2) var(--size-6);
  align-items: end;
  justify-content: space-between;
}

.settings-heading__lead {
  display: flex;
  gap: var(--size-3);
  align-items: center;
}

.settings-heading__icon {
  display: grid;
  place-items: center;
  width: var(--size-8);
  height: var(--size-8);
  color: var(--p-gold);
  background: var(--p-panel-sunken);
  border-radius: var(--rounded-full);
}

.settings-heading__meta {
  display: flex;
  flex-direction: column;
  gap: var(--size-1);
  align-items: flex-end;
  text-align: right;
}

.diagnostics {
  border-top-color: var(--p-line);
}

.diagnostics ore-accordion-item {
  --accordion-item-details-padding: 0;
  --accordion-item-summary-padding: var(--size-3) 0;
}

.settings-save-status {
  display: inline-flex;
  gap: var(--size-1);
  align-items: center;
  font-size: var(--text-xs);
  color: var(--p-text-muted);
}

.settings-field {
  display: flex;
  gap: var(--size-3);
  align-items: center;
}

.settings-field--row {
  justify-content: space-between;
  padding-top: var(--size-5);
  margin-top: var(--size-2);
  border-top: var(--border) solid var(--p-line);
}

.settings-field--stacked {
  flex-direction: column;
  align-items: stretch;
}

.settings-field__identity {
  display: flex;
  gap: var(--size-3);
  align-items: center;
  min-width: 0;
}

.settings-field--stacked .settings-field__identity {
  align-items: flex-start;
}

.settings-field__icon {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: var(--size-8);
  height: var(--size-8);
  color: var(--p-gold);
  background: var(--p-panel-sunken);
  border-radius: var(--rounded-full);
}

.settings-field__copy {
  display: grid;
  gap: 0;
  min-width: 0;
}

.settings-field__hint {
  line-height: var(--leading-snug);
}

.language-select {
  flex-shrink: 0;
  width: var(--size-44);
}

.settings-theme-options {
  width: 100%;
}

.data-tools {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border: var(--border) solid var(--p-line);
  border-radius: var(--rounded-sm);
}

.data-tool {
  align-content: space-between;
  min-width: 0;
  padding: var(--size-4);
}

.data-tool + .data-tool {
  border-left: var(--border) solid var(--p-line);
}

.backup-metadata {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  min-inline-size: 0;
  padding: 0;
  margin: 0;
  border-block: var(--border) solid var(--p-line);
  border-inline: 0;
}

.backup-metadata ore-stats {
  --stats-bg: transparent;
  --stats-padding: var(--size-3) 0;
  --stats-value-size: var(--text-md);
}

.data-tool ore-button {
  justify-self: start;
}

/* The privacy note sits with the data tools because it documents exactly them:
   where saves live, what backups contain, and what shared sessions exchange. */
.data-privacy-link {
  margin-block-start: var(--size-3);
  font-size: var(--text-sm);
  color: var(--color-primary);
  text-decoration: underline;
}

.data-privacy-link:hover,
.data-privacy-link:focus-visible {
  text-decoration-thickness: var(--border-2);
}

.shortcut-list {
  display: grid;
  gap: 0;
  margin: 0;
}

.shortcut-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--size-4);
  align-items: center;
  min-height: var(--size-12);
  padding-block: var(--size-2);
  border-bottom: var(--border) solid var(--p-line);
}

.shortcut-row:last-child {
  border-bottom: 0;
}

.shortcut-row dd {
  margin: 0;
}

.shortcut-then {
  padding-inline: var(--size-1);
  font-size: var(--text-xs);
  color: var(--p-text-muted);
}

.activity-list {
  max-height: var(--size-96);
  overflow-y: auto;
  scrollbar-gutter: stable;
}

.activity-signal {
  display: flex;
  gap: var(--size-2);
  align-items: center;
}

.time {
  font-size: var(--text-sm);
  color: var(--p-text-muted);
}

/* ── Music ────────────────────────────────────────────────────────────────── */

.music-suggestions {
  display: grid;
  gap: var(--size-2);
  padding: 0;
  margin: 0;
  border: 0;
}

.music-suggestion {
  display: flex;
  gap: var(--size-1);
  align-items: stretch;
  background: var(--p-panel-sunken);
  border: var(--border) solid var(--p-line);
  border-radius: var(--rounded-sm);
  transition: border-color var(--p-motion) var(--p-ease);
}

.music-suggestion:hover {
  border-color: var(--p-line-strong);
}

.music-suggestion--active {
  background: color-mix(in oklch, var(--p-gold) 8%, var(--p-panel));
  border-color: var(--p-gold);
}

.music-suggestion__select {
  display: flex;
  flex: 1;
  gap: var(--size-3);
  align-items: center;
  justify-content: space-between;
  min-height: 2.75rem;
  padding: var(--size-3) var(--size-4);
  font-family: inherit;
  text-align: start;
  cursor: pointer;
  background: none;
  border: 0;
}

.music-suggestion__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--p-text);
  white-space: nowrap;
}

.music-suggestion__meta {
  flex-shrink: 0;
  font-size: var(--text-xs);
  color: var(--p-text-muted);
  white-space: nowrap;
}

.music-suggestion__link {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  min-width: 2.75rem;
  min-height: 2.75rem;
  padding-inline: var(--size-3);
  font-size: var(--text-xs);
  color: var(--p-text-muted);
  text-decoration: none;
  border-inline-start: var(--border) solid var(--p-line);
}

.music-suggestion__link:hover {
  color: var(--p-gold);
}

.music-suggestion__link-label {
  font-size: var(--text-xs);
}

.music-custom {
  font-size: var(--text-sm);
}

.music-custom summary {
  padding: var(--size-2) 0;
  font-size: var(--text-sm);
  color: var(--p-text-muted);
  cursor: pointer;
}

/* The chosen custom video reads as picked: same gold the active suggestion row carries. */
.music-custom--active summary {
  color: var(--p-gold);
}

.music-custom--active[open] {
  border-block-start: var(--border) solid color-mix(in oklch, var(--p-gold) 45%, transparent);
}

/* ── Mobile ───────────────────────────────────────────────────────────────── */

/* Desktop: appearance + shortcuts stack in the left column; music fills the right. */
@media (width >= 900px) {
  .settings-panel--appearance {
    grid-row: 1;
    grid-column: 1;
  }

  .settings-panel--music {
    grid-row: 1 / 3;
    grid-column: 2;
  }

  .settings-panel--shortcuts {
    grid-row: 2;
    grid-column: 1;
  }
}

@media (width < 900px) {
  .settings-layout {
    grid-template-columns: 1fr;
    gap: var(--size-4);
  }

  .data-tools {
    grid-template-columns: 1fr;
  }

  .data-tool + .data-tool {
    border-top: var(--border) solid var(--p-line);
    border-left: 0;
  }

  .settings-panel--wide {
    grid-column: auto;
  }

  /* Heading: stack hint text below the title, aligned with the title text
     (indented past the icon) instead of the card edge. */
  .settings-heading {
    flex-direction: column;
    gap: var(--size-2);
    align-items: flex-start;
  }

  .settings-heading__meta {
    align-items: flex-start;
    text-align: left;
  }
}

@media (width < 600px) {
  /* Tighter cards on phones: the content needs the room more than the padding does. */
  .settings-panel {
    --card-padding: var(--size-3);
  }

  /* Music suggestions: tighter padding: the name truncates, the count stays right. */
  .music-suggestion__select {
    gap: var(--size-2);
    padding: var(--size-2) var(--size-3);
  }

  .music-suggestion__link {
    padding-inline: var(--size-2);
  }
}

@media (width < 480px) {
  /* eShop pattern: label left, control right: always. The field identity
     (icon + text) shrinks and wraps; the control stays right-aligned. */
  .settings-field--row {
    flex-wrap: wrap;
  }

  .settings-field__identity {
    flex: 1;
    min-width: min(60%, 12rem);
  }

  /* Long hint text wraps within the identity, never pushes the control off the row. */
  .settings-field__copy {
    overflow-wrap: break-word;
  }

  /* Only the language field stacks: its select is wide enough to need its own line. */
  .settings-field:has(.language-select) {
    flex-direction: column;
    align-items: stretch;
  }

  .language-select {
    width: 100%;
  }

  .activity-signal {
    display: grid;
    gap: var(--size-1);
  }

  /* Backup stats: single column on the narrowest phones: four stats in a row is too tight. */
  .backup-metadata {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
