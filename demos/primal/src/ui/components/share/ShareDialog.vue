<script lang="ts" setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { notify } from '../../../app/events';
import { t } from '../../../app/i18n';
import { downloadBlob } from '../../poster';
import type { ShareSubject } from './share-subject';
import '@vielzeug/refine/accordion';
import '@vielzeug/refine/accordion-item';
import '@vielzeug/refine/button';
import '@vielzeug/refine/dialog';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/qr-code';
import '@vielzeug/refine/text';
import '@vielzeug/refine/textarea';

/** QR + poster + link for one shareable subject: a build or a hunt record. */
const props = defineProps<{ subject: ShareSubject | null }>();
const emit = defineEmits<{ close: [] }>();

/** The poster's QR source: always mounted, error-correction M for print robustness. */
const posterQr = ref<HTMLElement | null>(null);
const busy = ref(false);
const previewUrl = ref<string | null>(null);
/** The enlarged code view: the table ritual: hold the phone up for the other player to scan. */
const expanded = ref(false);

/** Render the poster once per open so the dialog can show what the player is about to share. */
async function ensurePreview(): Promise<void> {
  if (previewUrl.value || !props.subject) return;
  busy.value = true;
  try {
    const blob = await props.subject.render(posterQr.value);
    if (blob) previewUrl.value = URL.createObjectURL(blob);
  } catch {
    /* the preview is best-effort; the share buttons still render on demand */
  } finally {
    busy.value = false;
  }
}

function revokePreview(): void {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = null;
}

// The QR encodes synchronously on mount, so one tick after the subject arrives its SVG is ready to rasterise.
watch(
  () => props.subject,
  (subject) => {
    if (!subject) return;
    void nextTick(ensurePreview);
  },
);

async function copy(text: string, what: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    notify('shareDialog.copySuccess', 'success', { values: { what } });
  } catch {
    notify('shareDialog.copyFailed', 'warning');
  }
}

async function share(): Promise<void> {
  const subject = props.subject;
  if (!subject) return;
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: subject.texts.shareTitle, url: subject.link });
      // The sheet closed on a completed share: the ritual is done, so is the dialog.
      emit('close');
      return;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
    }
  }
  await copy(subject.link, subject.texts.whatLink);
}

/** Render the poster and hand it to the share sheet; fall back to a download where files cannot be shared. */
async function shareImage(): Promise<void> {
  const subject = props.subject;
  if (!subject || busy.value) return;
  busy.value = true;
  try {
    const blob = await subject.render(posterQr.value);
    if (!blob) {
      notify('shareDialog.posterFailed', 'warning');
      return;
    }    const file = new File([blob], subject.fileName, { type: 'image/png' });
    if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: subject.texts.shareTitle });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
      }
    }
    downloadBlob(blob, subject.fileName);
    notify('shareDialog.posterSaved', 'success');
  } catch {
    notify('shareDialog.posterFailed', 'warning');
  } finally {
    busy.value = false;
  }
}

function onOpenChange(event: Event): void {
  if (event.target !== event.currentTarget) return;
  if (!(event as CustomEvent<{ open: boolean }>).detail.open) {
    revokePreview();
    expanded.value = false;
    emit('close');
  }
}

onBeforeUnmount(revokePreview);

// The dialog renders behind a null-guard TypeScript cannot see, so the label tolerates the absent subject.
const label = (text: string | undefined): string => text ?? '';
</script>

<template>
  <ore-dialog
    backdrop="blur"
    dismissible
    size="lg"
    :label="label(subject?.texts.dialogTitle)"
    :open="subject !== null"
    @open-change="onOpenChange">
    <!-- Enlarged code: the whole dialog becomes the thing the other player scans. -->
    <div class="share--expanded" v-if="subject && expanded">
      <ore-qr-code
        class="share__qr-large"
        error-correction="M"
        variant="card"
        :label="label(subject.texts.qrLabel)"
        :value="subject.link">
        <span slot="caption">{{ subject.caption }}</span>
      </ore-qr-code>
      <ore-text color="muted" size="sm">{{ subject.texts.shareShowHint }}</ore-text>
    </div>

    <div class="share" v-else-if="subject">
      <figure class="share__preview">
        <img
          v-if="previewUrl"
          :alt="subject.texts.shareTitle"
          :src="previewUrl ?? undefined" />
        <span class="share__preview-loading" v-else>{{ subject.texts.posterLoading }}</span>
      </figure>

      <div class="share__panel">
        <button class="share__qr-toggle" type="button" :aria-label="subject.texts.enlargeQr" @click="expanded = true">
          <ore-qr-code
            class="share__qr"
            error-correction="L"
            variant="card"
            :label="subject.texts.qrLabel"
            :value="subject.link">
            <span slot="caption">{{ subject.caption }}</span>
          </ore-qr-code>
        </button>
        <ore-text class="share__hint" color="muted" size="xs">{{ subject.texts.tapToEnlarge }}</ore-text>
        <ore-text class="share__hint" color="muted" size="sm">{{ subject.texts.hint }}</ore-text>
        <ore-text class="share__online" color="muted" size="xs" v-if="subject.texts.status">
          <ore-icon name="globe" /> {{ subject.texts.status }}
        </ore-text>
        <div class="share__actions stack" style="--stack-gap: var(--size-2)">
          <ore-button color="primary" fullwidth variant="solid" @click="share">
            <ore-icon name="share-2" slot="prefix" />
            {{ subject.texts.shareLink }}
          </ore-button>
          <div class="share__actions-secondary">
            <ore-button fullwidth variant="bordered" :disabled="busy" @click="shareImage">
              <ore-icon name="image" slot="prefix" />
              {{ subject.texts.shareImage }}
            </ore-button>
            <ore-button fullwidth variant="bordered" @click="copy(subject.code, subject.texts.whatCode)">
              <ore-icon name="copy" slot="prefix" />
              {{ subject.texts.copyCode }}
            </ore-button>
          </div>
        </div>

        <!-- The manual fallback: readable, selectable and copyable without a camera or clipboard trust. -->
        <ore-accordion size="sm" variant="text">
          <ore-accordion-item>
            <span slot="title">{{ subject.texts.manualTitle }}</span>
            <div class="share__manual stack" style="--stack-gap: var(--size-2)">
              <ore-textarea readonly :label="subject.texts.whatLink" :rows="2" :value="subject.link" />
              <ore-textarea readonly :label="subject.texts.whatCode" :rows="2" :value="subject.code" />
              <div class="share__actions-secondary">
                <ore-button size="sm" variant="bordered" @click="copy(subject.link, subject.texts.whatLink)">
                  <ore-icon name="copy" slot="prefix" />
                  {{ subject.texts.copyLink }}
                </ore-button>
                <ore-button size="sm" variant="bordered" @click="copy(subject.code, subject.texts.whatCode)">
                  <ore-icon name="copy" slot="prefix" />
                  {{ subject.texts.copyCode }}
                </ore-button>
              </div>
            </div>
          </ore-accordion-item>
        </ore-accordion>
      </div>
    </div>

    <!-- The poster's code source: mounted whenever the dialog is, so image sharing works from
         either view. Visually hidden; only its SVG is rasterised. -->
    <div aria-hidden="true" class="share__poster-qr" v-if="subject">
      <ore-qr-code
        error-correction="M"
        variant="flat"
        ref="posterQr"
        :label="label(subject.texts.qrLabel)"
        :value="subject.link" />
    </div>

    <div class="cluster" slot="footer" style="justify-content: flex-end">
      <ore-button size="sm" variant="solid" v-if="expanded" @click="expanded = false">
        <ore-icon name="arrow-left" slot="prefix" />
        {{ t('common.back') }}
      </ore-button>
      <ore-button size="sm" variant="solid" v-else @click="emit('close')">{{ subject?.texts.done ?? '' }}</ore-button>
    </div>
  </ore-dialog>
</template>

<style scoped>
/* Poster preview on the left, the scannable code and actions on the right; stacked on narrow screens. */
.share {
  display: grid;
  gap: var(--size-5);
  align-items: start;
}

@media (min-width: 640px) {
  .share {
    grid-template-columns: minmax(0, 1fr) minmax(0, 20rem);
  }
}

/* One-handed senders: the scannable code and actions come first; the poster follows below. */
@media (max-width: 639px) {
  .share__panel {
    order: 1;
  }

  .share__preview {
    order: 2;
  }
}

.share__preview {
  display: grid;
  place-items: center;
  min-height: var(--size-48);
  margin: 0;
  overflow: hidden;
  background: var(--p-panel-sunken);
  border: var(--border) solid var(--p-line);
  border-radius: var(--rounded-md);
}

.share__preview img {
  display: block;
  width: 100%;
  height: auto;
  max-height: 48dvh;
  object-fit: contain;
}

.share__preview-loading {
  padding: var(--size-6);
  font-size: var(--text-sm);
  color: var(--p-text-muted);
}

/* Code and enlarge hint sit at the top, centred; the actions follow below. */
.share__panel {
  display: flex;
  flex-direction: column;
  gap: var(--size-3);
  align-self: stretch;
  text-align: center;
}

.share__qr-toggle {
  padding: 0;
  line-height: 0;
  cursor: zoom-in;
  background: none;
  border: 0;
}

.share__qr {
  align-self: center;
  max-width: 100%;
}

.share__hint {
  text-align: center;
}

.share__online {
  display: flex;
  gap: var(--size-1);
  align-items: center;
  justify-content: center;
}

.share__actions {
  margin-block-start: auto;
}

/* The two secondary actions share a row as equal halves under the primary action. */
.share__actions-secondary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--size-2);
}

.share__manual {
  text-align: start;
}

/* Enlarged code view: the dialog is the artifact. The code sizes against the dialog body's own
   inline size (container query), never the viewport: the panel is always narrower and shorter
   than the window, and viewport units made the code overflow it. */
.share--expanded {
  display: grid;
  gap: var(--size-4);
  justify-items: center;
  container-type: inline-size;
}

.share__qr-large {
  --qr-code-size: min(92cqi, 46dvh, 30rem);
}

/* The poster's hidden QR source. */
.share__poster-qr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}
</style>
