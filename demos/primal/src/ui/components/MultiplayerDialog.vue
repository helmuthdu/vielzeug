<script lang="ts" setup>
import { computed, onScopeDispose, ref, watch } from 'vue';
import {
  bus,
  notify,
  pendingHostSubject,
  pendingJoinCode,
  type SessionSubject,
  sessionDialogOpen,
  sessionPeers,
  sessionState,
} from '../../app/events';
import { type MessageKey, t } from '../../app/i18n';
import type { RouteName } from '../../app/router';
import {
  acceptSessionAnswer,
  beginSessionJoin,
  createSessionInvitation,
  endSession,
  kickSessionPeer,
  sessionJoinLink,
  startSessionHost,
} from '../../app/session';
import { ascents, campaigns, challenges, expeditions, notifyError } from '../../app/store';
import { navigate, useReadable } from '../../app/vue-bridge';
import { monsterById } from '../../content';
import { canHostSubject } from '../../domain/host-eligibility';
import '@vielzeug/refine/accordion';
import '@vielzeug/refine/accordion-item';
import '@vielzeug/refine/alert';
import '@vielzeug/refine/button';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/dialog';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/list';
import '@vielzeug/refine/list-item';
import '@vielzeug/refine/qr-code';
import '@vielzeug/refine/qr-scanner';
import '@vielzeug/refine/separator';
import '@vielzeug/refine/text';
import '@vielzeug/refine/textarea';

/**
 * The session surface, reachable from the navbar icon on every route. One dialog,
 * three states: no session shows the hub (host a table by picking a subject, join
 * one by scanning or pasting the invitation); a hosted session shows the share panel
 * (invitation, answer acceptance, connected players); a joined session shows the
 * guest status with the Leave action.
 */
const open = useReadable(sessionDialogOpen);
const session = useReadable(sessionState);
const peers = useReadable(sessionPeers);
const hosting = computed(() => session.value.mode === 'host');
/** The joined session's subject: non-null exactly while this tab is a guest. */
const guestSubject = computed(() => (session.value.mode === 'guest' ? session.value.subject : null));

/** The kind names for the guest status: one label per subject kind. */
const KIND_LABEL: Record<SessionSubject['kind'], MessageKey> = {
  ascent: 'shareDialog.kindAscent',
  campaign: 'shareDialog.kindCampaign',
  challenge: 'shareDialog.kindChallenge',
  expedition: 'shareDialog.kindExpedition',
};

/**
 * The statuses a listed peer can hold; mesh's full status union also covers
 * node-level states a peer row never shows, which fall back to the raw word.
 */
const PEER_STATUS_KEY: Record<string, MessageKey> = {
  connected: 'session.peerStatus.connected',
  connecting: 'session.peerStatus.connecting',
  disconnected: 'session.peerStatus.disconnected',
};
const peerStatusLabel = (status: string): string => {
  const key = PEER_STATUS_KEY[status];
  return key ? t(key) : status;
};

// ─── Guest: the joined session ──────────────────────────────────────────────

/** The joined subject's display name: expeditions go by their monster, like the hub list. */
const guestName = computed(() => {
  const state = session.value;
  if (state.mode !== 'guest') return null;
  const { id, kind } = state.subject;
  if (kind === 'expedition') {
    const monsterId = allExpeditions.value.find((entry) => entry.id === id)?.monsterId;
    return (monsterId ? monsterById(monsterId)?.name : undefined) ?? t('multiplayer.expedition');
  }
  if (kind === 'campaign') return allCampaigns.value.find((entry) => entry.id === id)?.name;
  if (kind === 'ascent') return allAscents.value.find((entry) => entry.id === id)?.name;
  return allChallenges.value.find((entry) => entry.id === id)?.name;
});

/** Where a joined session lands: one detail route per subject kind. */
const DETAIL_ROUTES: Record<SessionSubject['kind'], RouteName> = {
  ascent: 'ascentDetail',
  campaign: 'campaignDashboard',
  challenge: 'challengeDetail',
  expedition: 'expeditionDetail',
};

function openGuestSubject(): void {
  const state = session.value;
  if (state.mode !== 'guest') return;
  sessionDialogOpen.update(() => false);
  void navigate(DETAIL_ROUTES[state.subject.kind], { id: state.subject.id });
}

// ─── Host: the share panel ───────────────────────────────────────────────────

const hostInvitation = ref('');
const hostAnswer = ref('');
const inviting = ref(false);
const accepting = ref(false);
const inviteExpanded = ref(false);

/** The join link that carries an invitation: the QR, share button and copy/paste all hand it over. */
const invitationLink = computed(() => (hostInvitation.value ? sessionJoinLink(hostInvitation.value) : ''));

async function copy(text: string, what: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    notify('shareDialog.copySuccess', 'success', { values: { what } });
  } catch {
    notify('shareDialog.copyFailed', 'warning');
  }
}

async function shareInvitation(): Promise<void> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: t('shareDialog.shareTitle'), url: invitationLink.value });
      return;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
    }
  }
  await copy(invitationLink.value, t('shareDialog.whatSessionLink'));
}

async function newInvite(): Promise<void> {
  inviting.value = true;
  try {
    hostInvitation.value = await createSessionInvitation();
  } catch (error) {
    notifyError('shareDialog.inviteFailed', error);
  } finally {
    inviting.value = false;
  }
}

async function acceptAnswer(text: string): Promise<void> {
  const code = text.trim();
  if (!code || accepting.value) return;
  accepting.value = true;
  try {
    const peer = await acceptSessionAnswer(code);
    hostAnswer.value = '';
    notify('shareDialog.peerConnected', 'success', { values: { name: peer.name ?? t('session.playerFallback') } });
    void newInvite();
  } catch (error) {
    notifyError('shareDialog.acceptFailed', error);
  } finally {
    accepting.value = false;
  }
}

function onAnswerScan(event: Event): void {
  void acceptAnswer((event as CustomEvent<{ value: string }>).detail.value);
}

// ─── Idle: the hub ──────────────────────────────────────────────────────────

const allCampaigns = useReadable(campaigns);
const allExpeditions = useReadable(expeditions);
const allAscents = useReadable(ascents);
const allChallenges = useReadable(challenges);

type Section = 'host' | 'join';
const section = ref<Section>('host');

/** One row the host section lists: a subject this tab can start hosting. */
interface HostEntry {
  icon: string;
  label: string;
  subject: SessionSubject;
  subtitle: string;
}

const hostEntries = computed<HostEntry[]>(() => [
  ...allCampaigns.value.filter(canHostSubject).map((campaign) => ({
    icon: 'book-open',
    label: campaign.name,
    subject: { id: campaign.id, kind: 'campaign' as const },
    subtitle: t('multiplayer.campaign'),
  })),
  ...allExpeditions.value.filter(canHostSubject).map((expedition) => ({
    icon: 'map',
    label: (expedition.monsterId ? monsterById(expedition.monsterId)?.name : undefined) ?? t('multiplayer.expedition'),
    subject: { id: expedition.id, kind: 'expedition' as const },
    subtitle: t('multiplayer.expedition'),
  })),
  ...allAscents.value.filter(canHostSubject).map((ascent) => ({
    icon: 'mountain',
    label: ascent.name,
    subject: { id: ascent.id, kind: 'ascent' as const },
    subtitle: t('multiplayer.ascent'),
  })),
  ...allChallenges.value.filter(canHostSubject).map((run) => ({
    icon: 'wind',
    label: run.name,
    subject: { id: run.id, kind: 'challenge' as const },
    subtitle: t('multiplayer.challenge'),
  })),
]);

/** Starts hosting a subject, retaining an invitation when this tab already hosts it. */
function hostSubject(subject: SessionSubject): void {
  const current = session.value;
  if (current.mode === 'host' && current.subject.id === subject.id && current.subject.kind === subject.kind) {
    if (!hostInvitation.value) void newInvite();
    return;
  }
  hostInvitation.value = '';
  hostAnswer.value = '';
  startSessionHost(subject);
  void newInvite();
}

/** Picking a subject from the hub uses the same path as the management shortcut. */
function pick(entry: HostEntry): void {
  hostSubject(entry.subject);
}

// ─── Join section ───────────────────────────────────────────────────────────

const joinStep = ref<'answer' | 'invite'>('invite');
const playerName = ref('');
const invitationText = ref('');
const answerText = ref('');
const joining = ref(false);
const answerExpanded = ref(false);

const offJoined = bus.on('session:joined', ({ subject }) => {
  sessionDialogOpen.update(() => false);
  void navigate(DETAIL_ROUTES[subject.kind], { id: subject.id });
});
const offFailed = bus.on('session:failed', ({ reason }) => {
  notify(reason, 'error');
  joinStep.value = 'invite';
  answerExpanded.value = false;
});
onScopeDispose(() => {
  offJoined();
  offFailed();
});

async function join(text: string): Promise<void> {
  const code = text.trim();
  if (!code || joining.value) return;
  joining.value = true;
  try {
    // One session per tab: joining another table ends the session this tab holds first.
    if (session.value.mode !== null) endSession();
    answerText.value = await beginSessionJoin(code, playerName.value.trim() || t('session.playerFallback'));
    joinStep.value = 'answer';
    answerExpanded.value = true;
  } catch (error) {
    notifyError('joinDialog.readFailed', error);
  } finally {
    joining.value = false;
  }
}

function onScan(event: Event): void {
  void join((event as CustomEvent<{ value: string }>).detail.value);
}

/** Copies the answer code so it can be sent to the host as text instead of shown on screen. */
async function copyAnswer(): Promise<void> {
  try {
    await navigator.clipboard.writeText(answerText.value);
    notify('joinDialog.answerCopied', 'success');
  } catch {
    notify('shareDialog.copyFailed', 'warning');
  }
}

// ─── Shared ─────────────────────────────────────────────────────────────────

function onOpenChange(event: Event): void {
  if (event.target !== event.currentTarget) return;
  if (!(event as CustomEvent<{ open: boolean }>).detail.open) sessionDialogOpen.update(() => false);
}

function closeSession(): void {
  endSession();
  sessionDialogOpen.update(() => false);
}

watch(open, (isOpen) => {
  if (!isOpen) {
    // Abandon a pending join that never connected; a live session keeps running.
    if (session.value.mode !== 'guest' && joinStep.value !== 'invite') endSession();
    joinStep.value = 'invite';
    invitationText.value = '';
    answerText.value = '';
    answerExpanded.value = false;
    section.value = 'host';
  } else if (hosting.value && !hostInvitation.value) {
    // Reopened while hosting: the share panel picks a fresh invitation up again.
    void newInvite();
  }
});

// A `/join/:code` deep link opens the dialog straight onto the join flow with the code consumed.
const pendingJoin = useReadable(pendingJoinCode);
const pendingHost = useReadable(pendingHostSubject);
watch(
  [pendingJoin, open],
  ([code, isOpen]) => {
    if (!isOpen || !code) return;
    pendingJoinCode.update(() => null);
    section.value = 'join';
    void join(code);
  },
  { immediate: true },
);

watch(
  [pendingHost, open],
  ([subject, isOpen]) => {
    if (!isOpen || !subject) return;
    pendingHostSubject.update(() => null);
    section.value = 'host';
    hostSubject(subject);
  },
  { immediate: true },
);

const dialogSize = computed(() => {
  if (answerExpanded.value) return 'lg';
  if (inviteExpanded.value) return 'lg';
  if (hosting.value) return 'md';
  return 'sm';
});
</script>

<template>
  <ore-dialog
    backdrop="blur"
    :label="t('multiplayer.title')"
    :open="open"
    :size="dialogSize"
    @open-change="onOpenChange">
    <!-- Guest: the joined session -->
    <div class="mp mp--guest" v-if="guestSubject">
      <p class="mp__guest-status">
        <span aria-hidden="true" class="mp__dot" />
        {{ t('session.liveSession') }}
      </p>
      <ore-text as="h3" size="sm" variant="heading">{{ guestName ?? t(KIND_LABEL[guestSubject.kind]) }}</ore-text>
      <ore-text color="muted" size="sm">
        {{ t('session.guestHint', { kind: t(KIND_LABEL[guestSubject.kind]) }) }}
      </ore-text>
      <div class="cluster mp__guest-actions">
        <ore-button variant="bordered" @click="openGuestSubject">
          <ore-icon name="arrow-right-left" slot="prefix" />
          {{ t('session.openSubject', { kind: t(KIND_LABEL[guestSubject.kind]) }) }}
        </ore-button>
        <ore-button color="error" variant="ghost" @click="closeSession">{{ t('session.leave') }}</ore-button>
      </div>
    </div>

    <!-- Host: the share panel -->
    <div class="session" v-else-if="hosting">
      <!-- The one constraint worth reading before handing the invitation over. -->
      <ore-alert color="info" size="sm" variant="flat">
        <ore-icon name="wifi" slot="icon" />
        {{ t('multiplayer.networkHint') }}
      </ore-alert>

      <div class="session__expanded" v-if="inviteExpanded">
        <ore-qr-code
          class="session__qr-large"
          error-correction="L"
          variant="card"
          :label="t('shareDialog.invitationQrLabel')"
          :value="invitationLink">
          <span slot="caption">{{ t('shareDialog.invitationCaption') }}</span>
        </ore-qr-code>
        <ore-text color="muted" size="sm">{{ t('shareDialog.showToPlayer') }}</ore-text>
        <ore-button variant="bordered" @click="inviteExpanded = false">
          <ore-icon name="arrow-left" slot="prefix" />
          {{ t('common.back') }}
        </ore-button>
      </div>

      <template v-else>
        <ore-text color="muted" size="sm">
          {{ t('shareDialog.hostingHint') }}
        </ore-text>
        <div class="session__invite" v-if="hostInvitation">
          <div class="session__qr">
            <button
              class="session__qr-toggle"
              type="button"
              :aria-label="t('shareDialog.enlargeInvitation')"
              @click="inviteExpanded = true">
              <ore-qr-code error-correction="L" variant="card" :label="t('shareDialog.invitationQrLabel')" :value="invitationLink">
                <span slot="caption">{{ t('shareDialog.invitationCaption') }}</span>
              </ore-qr-code>
            </button>
            <ore-text color="muted" size="xs">{{ t('shareDialog.tapToEnlarge') }}</ore-text>
            <ore-button size="sm" variant="bordered" @click="shareInvitation">
              <ore-icon name="share-2" slot="prefix" />
              {{ t('shareDialog.shareLink') }}
            </ore-button>
          </div>
          <ore-qr-scanner
            class="session__scanner"
            size="sm"
            :active="open"
            :label="t('shareDialog.scanAnswer')"
            :once="false"
            @scan="onAnswerScan">
            <span slot="unsupported">{{ t('shareDialog.scanUnsupported') }}</span>
          </ore-qr-scanner>
        </div>
        <ore-button size="sm" variant="bordered" v-else :loading="inviting" @click="newInvite">
          {{ t('shareDialog.createInvitation') }}
        </ore-button>

        <ore-separator />

        <section class="session__step" :aria-label="t('shareDialog.connectedPlayers')">
          <ore-text as="h3" size="sm" variant="heading">{{ t('shareDialog.playersCount', { count: peers.length }) }}</ore-text>
          <ore-text color="muted" size="sm" v-if="!peers.length">{{ t('shareDialog.noPlayers') }}</ore-text>
          <ore-list v-else>
            <ore-list-item v-for="peer in peers" :key="peer.id">
              <span slot="leading"><ore-icon name="user" /></span>
              {{ peer.name ?? t('session.playerFallback') }}
              <ore-chip size="sm" slot="trailing" :color="peer.status === 'connected' ? 'success' : 'warning'">
                {{ peerStatusLabel(peer.status) }}
              </ore-chip>
              <ore-button size="sm" slot="trailing" variant="ghost" @click="kickSessionPeer(peer.id)">
                {{ t('shareDialog.kick') }}
              </ore-button>
            </ore-list-item>
          </ore-list>
        </section>

        <ore-accordion size="sm" variant="text">
          <ore-accordion-item>
            <span slot="title">{{ t('shareDialog.manualTitle') }}</span>
            <div class="session__manual">
              <div class="stack" style="--stack-gap: var(--size-2)">
                <!-- The manual fallback carries the raw code: the link already travels as the QR
                     and the share button above. The guest's paste field accepts either. -->
                <ore-textarea readonly :label="t('shareDialog.invitationLabel')" :rows="3" :value="hostInvitation" />
                <ore-button size="sm" variant="bordered" @click="copy(hostInvitation, t('shareDialog.whatInvitation'))">
                  <ore-icon name="copy" slot="prefix" />
                  {{ t('shareDialog.copyInvitation') }}
                </ore-button>
              </div>
              <div class="session__answer">
                <ore-textarea
                  :label="t('shareDialog.answerLabel')"
                  :placeholder="t('shareDialog.answerPlaceholder')"
                  :rows="2"
                  :value="hostAnswer"
                  @input="hostAnswer = ($event.target as HTMLTextAreaElement).value" />
                <ore-button
                  size="sm"
                  variant="bordered"
                  :disabled="!hostAnswer.trim()"
                  :loading="accepting"
                  @click="acceptAnswer(hostAnswer)">
                  {{ t('shareDialog.acceptAnswer') }}
                </ore-button>
              </div>
            </div>
          </ore-accordion-item>
        </ore-accordion>
      </template>
    </div>

    <!-- Idle: the hub -->
    <template v-else>
      <!-- Answer QR fills the dialog while the host has not accepted yet. -->
      <div class="mp__answer-full" v-if="answerExpanded && joinStep === 'answer'">
        <ore-qr-code class="mp__qr-large" error-correction="L" variant="card" :label="t('joinDialog.answerCodeQrLabel')" :value="answerText" />
        <ore-text color="muted" size="sm">{{ t('joinDialog.showToHost') }}</ore-text>
        <div class="cluster mp__expanded-actions">
          <ore-button variant="bordered" @click="answerExpanded = false">
            <ore-icon name="arrow-left" slot="prefix" />
            {{ t('common.back') }}
          </ore-button>
          <ore-button variant="bordered" @click="copyAnswer">
            <ore-icon name="copy" slot="prefix" />
            {{ t('joinDialog.copyAnswer') }}
          </ore-button>
        </div>
      </div>

      <div class="mp" v-else>
        <!-- The same-network requirement rides above the tabs: read before hosting or joining. -->
        <ore-alert color="info" size="sm" variant="flat">
          <ore-icon name="wifi" slot="icon" />
          {{ t('multiplayer.networkHint') }}
        </ore-alert>

        <!-- Section switcher -->
        <div class="mp__tabs" role="tablist" :aria-label="t('multiplayer.title')">
          <button
            class="mp__tab"
            role="tab"
            type="button"
            :aria-selected="section === 'host'"
            :class="{ 'mp__tab--active': section === 'host' }"
            @click="section = 'host'">
            {{ t('multiplayer.hostTab') }}
          </button>
          <button
            class="mp__tab"
            role="tab"
            type="button"
            :aria-selected="section === 'join'"
            :class="{ 'mp__tab--active': section === 'join' }"
            @click="section = 'join'">
            {{ t('multiplayer.joinTab') }}
          </button>
        </div>

        <!-- Host: pick a subject to share -->
        <div class="mp__section" v-if="section === 'host'">
          <ore-text color="muted" size="sm" v-if="!hostEntries.length">{{ t('multiplayer.empty') }}</ore-text>
          <section class="mp__host-list" v-else :aria-label="t('multiplayer.hostTab')">
            <ore-list>
              <ore-list-item button v-for="entry in hostEntries" :key="entry.subject.id" @click="pick(entry)">
                <span slot="leading"><ore-icon :name="entry.icon" /></span>
                <span>{{ entry.label }}</span>
                <span class="mp__kind" slot="trailing">{{ entry.subtitle }}</span>
              </ore-list-item>
            </ore-list>
          </section>
        </div>

        <!-- Join: consume the host's invitation -->
        <div class="mp__section" v-else>
          <template v-if="joinStep === 'invite'">
            <ore-input
              :label="t('joinDialog.yourName')"
              :placeholder="t('session.playerFallback')"
              :value="playerName"
              @input="playerName = ($event.target as HTMLInputElement).value" />
            <ore-qr-scanner :active="open && section === 'join'" :label="t('joinDialog.scanLabel')" @scan="onScan">
              <span slot="unsupported">{{ t('joinDialog.scanUnsupported') }}</span>
            </ore-qr-scanner>
            <ore-accordion size="sm" variant="text">
              <ore-accordion-item>
                <span slot="title">{{ t('joinDialog.manualTitle') }}</span>
                <div class="mp__manual">
                  <ore-textarea
                    :label="t('joinDialog.invitationLabel')"
                    :placeholder="t('joinDialog.invitationPlaceholder')"
                    :rows="3"
                    :value="invitationText"
                    @input="invitationText = ($event.target as HTMLTextAreaElement).value" />
                  <ore-button
                    color="primary"
                    size="sm"
                    variant="solid"
                    :disabled="!invitationText.trim()"
                    :loading="joining"
                    @click="join(invitationText)">
                    {{ t('joinDialog.createAnswer') }}
                  </ore-button>
                </div>
              </ore-accordion-item>
            </ore-accordion>
          </template>

          <template v-else>
            <ore-text as="h3" size="sm" variant="heading">{{ t('joinDialog.answerTitle') }}</ore-text>
            <ore-text color="muted" size="sm">{{ t('joinDialog.answerHint') }}</ore-text>
            <div class="mp__answer">
              <div class="mp__qr">
                <button
                  class="mp__qr-toggle"
                  type="button"
                  :aria-label="t('joinDialog.enlargeAnswer')"
                  @click="answerExpanded = true">
                  <ore-qr-code error-correction="L" variant="card" :label="t('joinDialog.answerCodeQrLabel')" :value="answerText" />
                </button>
                <ore-text color="muted" size="xs">{{ t('joinDialog.tapToEnlarge') }}</ore-text>
              </div>
              <div class="stack" style="--stack-gap: var(--size-2); flex: 1">
                <ore-textarea readonly :label="t('joinDialog.answerLabel')" :rows="4" :value="answerText" />
                <ore-button size="sm" variant="bordered" @click="copyAnswer">
                  <ore-icon name="copy" slot="prefix" />
                  {{ t('joinDialog.copyAnswer') }}
                </ore-button>
                <ore-text color="muted" size="sm">{{ t('joinDialog.waiting') }}</ore-text>
              </div>
            </div>
          </template>
        </div>
      </div>
    </template>

    <div class="cluster" slot="footer" style="justify-content: flex-end">
      <ore-button color="error" size="sm" variant="ghost" v-if="hosting && !inviteExpanded" @click="closeSession">
        {{ t('shareDialog.endSession') }}
      </ore-button>
      <ore-button size="sm" variant="solid" @click="sessionDialogOpen.update(() => false)">
        {{ t('shareDialog.done') }}
      </ore-button>
    </div>
  </ore-dialog>
</template>

<style scoped>
/* The stacks carry inputs whose intrinsic floors (textarea 12rem) would otherwise
   stretch the implicit grid tracks past the dialog box: minmax(0, 1fr) lets every
   level shrink to the dialog's content width. */
.mp,
.mp__section,
.mp__manual,
.session,
.session__step,
.session__manual,
.session__answer {
  grid-template-columns: minmax(0, 1fr);
}

.mp {
  display: grid;
  gap: var(--size-4);
}

.mp--guest {
  gap: var(--size-3);
  justify-items: start;
}

.mp__guest-status {
  display: flex;
  gap: var(--size-2);
  align-items: center;
  margin: 0;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--p-text-strong);
}

.mp__dot {
  width: var(--size-2);
  height: var(--size-2);
  background: var(--color-success);
  border-radius: var(--rounded-full);
}

.mp__guest-actions {
  gap: var(--size-2);
  margin-top: var(--size-2);
}

.mp__tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--size-1);
  padding: var(--size-0-5);
  background: var(--p-panel-muted);
  border-radius: var(--rounded-md);
}

.mp__tab {
  padding: var(--size-1) var(--size-2);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--p-text-muted);
  cursor: pointer;
  background: none;
  border: 0;
  border-radius: var(--rounded-sm);
  transition:
    color var(--transition-fast) var(--p-ease),
    background-color var(--transition-fast) var(--p-ease);
}

.mp__tab--active {
  color: var(--p-text-strong);
  background: var(--p-panel-raised);
}

.mp__section {
  display: grid;
  gap: var(--size-3);
}

.mp__host-list {
  max-height: min(var(--size-72), 40dvh);
  overflow-y: auto;
  overscroll-behavior: contain;
}

.mp__kind {
  font-size: var(--text-xs);
  color: var(--p-text-muted);
}

/* The answer code wraps under the dialog's narrow content: its QR line centers,
   the code text fills the line below. */
.mp__answer {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-4);
  align-items: flex-start;
  justify-content: center;
}

.mp__qr {
  display: grid;
  gap: var(--size-1);
  justify-items: center;
}

.mp__qr-toggle {
  padding: 0;
  line-height: 0;
  cursor: zoom-in;
  background: none;
  border: 0;
}

.mp__manual {
  display: grid;
  gap: var(--size-2);
}

.mp__answer-full {
  display: grid;
  gap: var(--size-3);
  justify-items: center;
}

.mp__expanded-actions {
  gap: var(--size-2);
}

.mp__qr-large {
  --qr-code-size: min(78vmin, 60dvh, 560px);
}

.session {
  display: grid;
  gap: var(--size-4);
}

.session__step {
  display: grid;
  gap: var(--size-3);
}

.session__invite {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-4);
  align-items: flex-start;
}

.session__qr {
  display: grid;
  gap: var(--size-1);
  justify-items: center;
}

.session__qr-toggle {
  padding: 0;
  line-height: 0;
  cursor: zoom-in;
  background: none;
  border: 0;
}

.session__expanded {
  display: grid;
  gap: var(--size-3);
  justify-items: center;
}

.session__qr-large {
  --qr-code-size: min(78vmin, 60dvh, 560px);
}

.session__answer {
  display: grid;
  gap: var(--size-2);
}

.session__scanner {
  flex: 1;
  min-width: min(100%, 220px);
}

.session__manual {
  display: grid;
  gap: var(--size-4);
}
</style>
