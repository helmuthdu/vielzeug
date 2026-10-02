import { computed, readonly, ref } from 'vue';
import { consent, musicAllowed, requestMusicConsent } from '../../app/consent';
import { MUSIC_LIBRARY, type MusicTrack, parseTimeline } from '../../app/music';
import { stopNarration } from '../../app/narration';
import { settings } from '../../app/store';
import { createPlayerMachine } from './player-machine';
import { repeatFadeDue } from './repeat-timing';

/**
 * A YouTube-backed audio player: the IFrame API drives a hidden embed while the UI
 * renders its own play/pause/seek controls. The lifecycle and playback state live
 * in the player machine (player-machine.ts): this composable owns everything
 * continuous and imperative: script loading, player construction, state polling,
 * the crossfade, DOM placement, and the bridge from machine snapshots to Vue refs.
 * It follows the video selected in Settings: a curated suggestion with its track
 * timeline or a custom YouTube URL with a pasted timeline.
 */

// ── Script loading ─────────────────────────────────────────────────────────────

let apiPromise: Promise<void> | null = null;

function loadYouTubeAPI(): Promise<void> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const previous = (window as { onYouTubeIframeAPIReady?: () => void }).onYouTubeIframeAPIReady;
    (window as { onYouTubeIframeAPIReady?: () => void }).onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      // A failed load must clear both the promise and the dead script tag, or every
      // later attempt would wait on a callback that is never coming.
      script.onerror = () => {
        script.remove();
        apiPromise = null;
        reject(new Error('The YouTube API script failed to load.'));
      };
      document.head.appendChild(script);
    }
  });
  return apiPromise;
}

// ── Shared player state ────────────────────────────────────────────────────────

const open = ref(false);
const playing = ref(false);
const muted = ref(false);
const ready = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const videoId = ref(settings.value.musicVideoId);
const isPlaylist = ref(false);
const playlistIndex = ref(0);
const title = ref('');
const currentTrack = ref('');
/** The track start to loop when repeat is on; null = off. */
const repeatStart = ref<number | null>(null);
const tracks = ref<readonly MusicTrack[]>([]);

/** Neutral stand-in for the cover while consent is missing: nothing leaves the device. */
const COVER_PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><rect width="320" height="180" fill="#26211b"/><path d="M176 40v74a26 26 0 1 1-14-23V54l-44 10v66a26 26 0 1 1-14-23V52z" fill="#6b6255"/></svg>',
)}`;
/** Mirrors the consent signal so cover art can react to a decision without a reload. */
const coverAllowed = ref(musicAllowed());
const coverArt = computed(() =>
  coverAllowed.value ? `https://i.ytimg.com/vi/${videoId.value}/mqdefault.jpg` : COVER_PLACEHOLDER,
);

let player: YTPlayer | null = null;
let poll: ReturnType<typeof setInterval> | null = null;

type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  getVolume(): number;
  setVolume(volume: number): void;
  isMuted(): boolean;
  mute(): void;
  unMute(): void;
  loadVideoById(videoId: string): void;
  loadPlaylist(options: { index?: number; list: string; listType?: string }): void;
  nextVideo(): void;
  previousVideo(): void;
  playVideoAt(index: number): void;
  getPlaylist(): string[];
  getPlaylistIndex(): number;
  getVideoData(): { title: string; video_id: string };
};

/** Resolves the settings' video selection into a playable video with tracks. */
function resolveVideo(): {
  id: string;
  isPlaylist: boolean;
  videoTitle: string;
  trackList: readonly MusicTrack[];
} {
  const id = settings.value.musicVideoId;
  const curated = MUSIC_LIBRARY.find((v) => v.id === id);
  if (curated) return { id, isPlaylist: false, trackList: curated.tracks, videoTitle: curated.title };
  // Playlist IDs are longer than the 11-char video IDs and start with a prefix.
  if (id.length > 11) return { id, isPlaylist: true, trackList: [], videoTitle: 'Playlist' };
  const customTracks = parseTimeline(settings.value.musicTimeline);
  return { id, isPlaylist: false, trackList: customTracks, videoTitle: 'Custom video' };
}

function refreshFromSettings(): void {
  const { id, videoTitle, trackList, isPlaylist: playlist } = resolveVideo();
  const changed = id !== videoId.value;
  videoId.value = id;
  isPlaylist.value = playlist;
  title.value = videoTitle;
  tracks.value = trackList;
  currentTrack.value = trackList[0]?.title ?? videoTitle;
  if (changed && player) {
    if (playlist) {
      // Playlist swap: the object form handles mode transitions too.
      player.loadPlaylist({ index: 0, list: id, listType: 'playlist' });
      tracks.value = [];
    } else {
      // Video swap: loadVideoById resets playlist mode to single video.
      player.loadVideoById(id);
    }
    currentTime.value = 0;
    duration.value = 0;
  }
}

// ── The machine and its bridge ─────────────────────────────────────────────────

// The wrapper docks into #corner-dock (fine pointers) or #video-player-mount
// (touch): both exist only after the app shell has mounted. Construction must
// wait for that moment: placing the wrapper after the iframe exists would MOVE a
// live iframe, and moving an iframe reloads it (fresh player, onReady re-fires,
// the autoplay intent races the machine's states).
let markShell: () => void = () => undefined;
const shellReady = new Promise<void>((resolve) => {
  if (document.getElementById('corner-dock') || document.querySelector('#video-player-mount')) resolve();
  else markShell = resolve;
});

/** main.ts marks the shell mounted; a hot-replaced module finds it already up. */
export function markPlayerShellReady(): void {
  markShell();
}

/** Loads the API script and constructs the player; resolves once constructed. */
async function buildPlayer(args: { signal: AbortSignal }): Promise<void> {
  // Idempotent: re-entering the loading state (OPEN/PLAY while building) aborts and
  // restarts this invoke: a restart after the player exists must be a no-op, or the
  // second construction would attach over the live iframe and reload it.
  if (player) return;
  // Prior opt-in: without a stored "music" consent, nothing from youtube.com
  // may load: not the API script, not the iframe, not the oEmbed lookups.
  if (!musicAllowed()) return;
  await shellReady;
  await loadYouTubeAPI();
  // Re-entering the loading state aborts this call: only the newest construction runs.
  if (args.signal.aborted) return;
  const element = ensureHost();
  const YT = (window as { YT?: { Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer } }).YT;
  if (!YT?.Player) return;
  // The opening position: a saved resume point (the user closed the player
  // mid-track) wins over the curated entry's default opening. Applied through
  // the `start` player var: a seekTo on an unstarted video would START it,
  // which broke pre-load's nothing-plays promise.
  const curated = !isPlaylist.value ? MUSIC_LIBRARY.find((v) => v.id === videoId.value) : undefined;
  const startAt = isPlaylist.value ? undefined : (loadResumePosition() ?? curated?.defaultStart);
  if (startAt !== undefined && startAt > 0) currentTime.value = startAt;
  player = new YT.Player(element, {
    events: {
      onReady: () => {
        ready.value = true;
        duration.value = player?.getDuration() ?? 0;
        // Style the iframe exactly once: re-styling it later causes the
        // YouTube player to re-render and drop frames during playback.
        const iframe = videoWrapper?.querySelector('iframe');
        if (iframe) {
          iframe.removeAttribute('width');
          iframe.removeAttribute('height');
          iframe.style.cssText =
            'display:block;width:100%;height:auto;aspect-ratio:16/9;border:0;border-radius:inherit;';
        }
        showVideo();
        // Playlist: populate the track list as soon as the player is ready.
        if (isPlaylist.value) void populatePlaylistTracks();
        // Auto-play: a play intent from before the player existed: the player opened
        // with the setting on, or an open-while-loading race. It plays the moment
        // construction finishes; if YouTube refuses, the machine keeps the intent
        // armed and the first real tap retries (the gesture listener below).
        const intent = actor.snapshot.context.autoplayWanted;
        if (intent) actor.send({ type: 'PLAY' });
      },
      onStateChange: (event: { data: number }) => {
        // Playlist mode: update the track title and position from the current video.
        if (isPlaylist.value && player && event.data === 1) {
          // Repeat guard: YouTube auto-advances to the next video on end,
          // racing our data:0 replay. When the ADVANCED video starts playing,
          // detect the index change and replay the original immediately.
          const newIndex = player.getPlaylistIndex();
          if (repeatStart.value !== null && newIndex !== playlistIndex.value) {
            player.playVideoAt(playlistIndex.value);
            return;
          }
          playlistIndex.value = newIndex;
          const data = player.getVideoData();
          currentTrack.value = data.title;
          title.value = data.title;
          void populatePlaylistTracks();
        }
        if (event.data === 0 && repeatStart.value !== null && !crossfading) {
          // Immediate repeat: no crossfade for the ended state. YouTube's own
          // autoplay races any fade: the next video starts loading before the
          // fade completes. Seek or replay synchronously to win the race.
          if (isPlaylist.value) {
            // Playlist: YouTube auto-advances to the next video on end: replay
            // the current one by its stored index to override the advance.
            player?.playVideoAt(playlistIndex.value);
          } else {
            player?.seekTo(repeatStart.value, true);
            player?.playVideo();
            currentTime.value = repeatStart.value;
          }
        } else if (event.data === 0) {
          currentTime.value = 0;
        }
        // The machine mirrors YouTube's state; the same send drives the poll's heal.
        actor.send({ data: event.data, type: 'YT_STATE' });
      },
    },
    playerVars: isPlaylist.value
      ? { disablekb: 1, list: videoId.value, listType: 'playlist', modestbranding: 1, playsinline: 1, rel: 0 }
      : {
          disablekb: 1,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          ...(startAt !== undefined && startAt > 0 ? { start: Math.floor(startAt) } : {}),
        },
    // videoId must be absent (not undefined) for playlists: the list/listType
    // playerVars own the load; a present-but-undefined videoId confuses the API.
    ...(isPlaylist.value ? {} : { videoId: videoId.value }),
  }) as unknown as YTPlayer;
}

const machine = createPlayerMachine({
  buildPlayer,
  pause: () => player?.pauseVideo(),
  play: () => player?.playVideo(),
  requestConsent: requestMusicConsent,
});
const actor = machine.createActor();

// A stored decision is the machine's starting truth; later banner answers arrive
// through the subscription below.
const initialConsent = consent.peek();
if (initialConsent.decided) actor.send({ allowed: initialConsent.music, type: 'CONSENT_DECIDED' });

/** The gesture retry for rejected autoplay: browsers refuse gesture-less playback. */
let gestureRetry: (() => void) | null = null;

function armGestureRetry(): void {
  if (gestureRetry) return;
  const retry = (): void => {
    disarmGestureRetry();
    actor.send({ type: 'PLAY' });
  };
  gestureRetry = retry;
  document.addEventListener('pointerdown', retry);
  document.addEventListener('keydown', retry);
}

function disarmGestureRetry(): void {
  if (!gestureRetry) return;
  document.removeEventListener('pointerdown', gestureRetry);
  document.removeEventListener('keydown', gestureRetry);
  gestureRetry = null;
}

actor.subscribe((snapshot) => {
  playing.value = snapshot.state === 'playing';
  // The app speaks with one voice: playing music takes the voice back from the
  // chronicler (the narration, in turn, pauses the music when it starts).
  if (snapshot.state === 'playing') stopNarration();
  // The bar follows the wish: the user's open, or playback itself (the machine
  // records it), but never while consent is still pending.
  open.value = snapshot.context.barWanted && snapshot.state !== 'consentPending';
  if (snapshot.state === 'playing') {
    // Auto-play may have started before the bar opened; reveal the hidden wrapper.
    if (videoWrapper && videoWrapper.style.display === 'none') showVideo();
    startPolling();
    disarmGestureRetry();
  }
  // An autoplay intent that never produced playback retries on the first user
  // gesture; a deliberate pause or close drops it.
  if (snapshot.state === 'paused') {
    if (snapshot.context.autoplayWanted) armGestureRetry();
    else disarmGestureRetry();
  }
});

// Resolve the video selection once at startup, then follow settings changes live :
// switching the library selection (or saving a custom timeline) swaps the playing
// video without reopening the player. The watchers live for the app's lifetime:
// this module is a singleton, mounted before the first component and never torn down.
refreshFromSettings();
/** The boot wish applies once, when the vault's settings arrive (or, on a hot-replaced
 *  module, from the already-hydrated state). Later settings changes never re-open a bar
 *  the user closed: the wish is a property of the app's start, not of the settings. */
let bootIntentSent = false;
function applyBootIntent(): void {
  if (bootIntentSent || !settings.value.musicAutoLoad) return;
  bootIntentSent = true;
  // Auto-open: the player opens (and loads) with the app. Auto-play, when set, adds the
  // music: a gesture-less attempt the machine keeps alive for the first real tap.
  actor.send({ type: 'OPEN' });
  if (settings.value.musicAutoPlay) actor.send({ type: 'PLAY' });
}
settings.subscribe(() => {
  refreshFromSettings();
  applyBootIntent();
});
// A hot-replaced module re-evaluates with the vault already hydrated: no settings
// change will ever arrive, so the boot wish is read from the current state.
applyBootIntent();

// Consent gate: the YouTube script must not load before the user opts in (EU
// ePrivacy / TTDSG §25 prior opt-in). The machine holds the pending intents and
// starts the load the instant a decision arrives.
consent.subscribe(() => {
  const next = consent.peek();
  coverAllowed.value = next.decided && next.music;
  if (next.decided) actor.send({ allowed: next.music, type: 'CONSENT_DECIDED' });
});

// ── Resume position ──────────────────────────────────────────────────────────
// The last playback position, persisted so closing and reopening the player
// picks up where the user left off. Stored in localStorage: it changes on
// every player close, which would churn the settings vault if it lived there.

const RESUME_KEY = 'primal:music-resume';

function saveResumePosition(): void {
  if (currentTime.value <= 0) return;
  try {
    localStorage.setItem(RESUME_KEY, JSON.stringify({ at: currentTime.value, id: videoId.value }));
  } catch {
    /* localStorage unavailable: resume is a nicety, not a guarantee */
  }
}

/** The saved position for the current video, or null when none applies. */
function loadResumePosition(): number | null {
  try {
    const raw = localStorage.getItem(RESUME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; id: string };
    if (parsed.id !== videoId.value || parsed.at <= 0) return null;
    return parsed.at;
  } catch {
    return null;
  }
}

window.addEventListener('pagehide', saveResumePosition);

// Dev only: a hot-replaced module must not orphan a playing iframe: the old
// wrapper would keep sounding with no machine left to control it, which looks
// exactly like "the music plays but the player never appears".
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    player?.pauseVideo();
    if (videoWrapper?.isConnected) videoWrapper.remove();
    stopPolling();
    disarmGestureRetry();
    window.removeEventListener('pagehide', saveResumePosition);
  });
}

// Reposition the video when the viewport or pointer type changes (resize,
// orientation, mouse connected/disconnected). Debounced: resize fires rapidly.
let repositionTimer: ReturnType<typeof setTimeout> | null = null;
window.addEventListener('resize', () => {
  if (repositionTimer) clearTimeout(repositionTimer);
  repositionTimer = setTimeout(() => {
    if (player) showVideo();
  }, 150);
});
window.matchMedia('(pointer: coarse)').addEventListener('change', () => {
  if (repositionTimer) clearTimeout(repositionTimer);
  if (player) showVideo();
});

// The wrapper is OUR element: YouTube never touches it. It owns the
// positioning, visibility, and styling. The host inside it is what YouTube
// replaces with an iframe; the iframe just fills the wrapper.
let videoWrapper: HTMLElement | null = null;

function ensureHost(): HTMLElement {
  if (videoWrapper?.isConnected) return videoWrapper.firstElementChild as HTMLElement;
  videoWrapper = document.createElement('div');
  // No initial hiding: opacity:0 makes the browser skip video compositing
  // for the iframe inside, and the frame pipeline never starts. The wrapper
  // is empty until YouTube creates the player, so there is nothing to see.
  const host = document.createElement('div');
  host.style.cssText = 'width:100%;height:100%;';
  videoWrapper.appendChild(host);
  // Born in its final home (showVideo only styles and reveals): fine pointers
  // dock under the topbar, touch devices take the in-page mount. Placing the
  // wrapper later would move a live iframe, and that reloads it.
  const parent = window.matchMedia('(pointer: coarse)').matches
    ? (document.querySelector('#video-player-mount') ?? document.body)
    : (document.getElementById('corner-dock') ?? document.body);
  parent.appendChild(videoWrapper);
  return host;
}

function showVideo(): void {
  if (!videoWrapper) return;
  const touch = window.matchMedia('(pointer: coarse)').matches;

  if (touch) {
    // Mobile and tablet: the video is part of the page: a deck-row-styled
    // content card in the document flow, paired with the promo cards in the
    // .video-area grid (which owns the outer margins).
    const mount = document.querySelector('#video-player-mount');
    if (mount && videoWrapper.parentElement !== mount) {
      videoWrapper.remove();
      mount.appendChild(videoWrapper);
    }
    // The area's grid pairs the promo column with the video (App.vue styles).
    mount?.parentElement?.classList.add('has-video');
    videoWrapper.style.cssText = [
      'display:block',
      'width:100%',
      'box-sizing:border-box',
      'padding:var(--size-2)',
      'background:var(--p-panel-sunken)',
      'border:var(--border) solid var(--p-line)',
      'border-radius:var(--rounded-sm)',
    ].join(';');
  } else {
    // Desktop: the video docks into the corner stack below the promo card.
    // #corner-dock owns the fixed geometry (top-left corner under the topbar,
    // width); the wrapper keeps only the window look. Visible only while the
    // player bar is open: closing the bar hides the video.
    const dock = document.getElementById('corner-dock');
    document.querySelector('#video-player-mount')?.parentElement?.classList.remove('has-video');
    const parent = dock ?? document.body;
    if (videoWrapper.parentElement !== parent) {
      videoWrapper.remove();
      parent.appendChild(videoWrapper);
    }
    if (!open.value) {
      videoWrapper.style.display = 'none';
      return;
    }
    videoWrapper.style.cssText = [
      'display:block',
      'opacity:1',
      'width:100%',
      'box-sizing:border-box',
      'padding:var(--size-2)',
      'background:var(--p-panel-sunken)',
      'border:var(--border) solid var(--p-line)',
      'border-radius:var(--rounded-sm)',
    ].join(';');
  }
}

/**
 * Populates the track list from the loaded playlist: indexes from
 * getPlaylist(), titles from YouTube's oEmbed endpoint (no API key needed).
 * getPlaylist() may return empty while the playlist data is still loading :
 * retried with a short backoff. Falls back to "Video N" when titles fail.
 */
async function populatePlaylistTracks(): Promise<void> {
  if (!player || !isPlaylist.value || tracks.value.length > 0) return;
  let ids = player.getPlaylist();
  for (let attempt = 0; attempt < 5 && (!ids || ids.length === 0); attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (!player) return;
    ids = player.getPlaylist();
  }
  if (!ids?.length) return;
  const list = await Promise.all(
    ids.map(async (id: string, index: number): Promise<MusicTrack> => {
      try {
        const res = await fetch(`https://www.youtube.com/oembed?url=https://youtu.be/${id}&format=json`);
        const data = (await res.json()) as { title?: string };
        return { start: index, title: data.title ?? `Video ${index + 1}` };
      } catch {
        return { start: index, title: `Video ${index + 1}` };
      }
    }),
  );
  tracks.value = list;
}

function startPolling(): void {
  if (poll) return;
  poll = setInterval(() => {
    // YouTube's API methods exist only after onReady; `player` is assigned when
    // construction starts, and showPlayer starts this poll before the first build
    // completes: ticks during the build must not touch the API yet.
    if (!player || !ready.value) return;
    // The player is the source of truth: the heal send is idempotent (same-state
    // events are ignored), and a dropped state event cannot freeze the bar.
    actor.send({ data: player.getPlayerState(), type: 'YT_STATE' });
    if (!playing.value) return;
    currentTime.value = player.getCurrentTime();
    duration.value = player.getDuration();
    // Timeline tracks only: playlist indexes are not timestamps: the title
    // comes from onStateChange's getVideoData() and repeat uses YouTube's own.
    if (isPlaylist.value) return;
    const track = tracks.value.filter((t) => t.start <= currentTime.value).at(-1);
    if (track) currentTrack.value = track.title;
    // Start before the boundary: the 600ms fade and up to one 500ms poll must finish
    // before the next track becomes audible.
    const loop = repeatStart.value;
    if (loop !== null && !crossfading) {
      const boundary = tracks.value.find((t) => t.start > loop + 0.5)?.start ?? duration.value;
      if (repeatFadeDue(currentTime.value, loop, boundary)) {
        crossfading = true;
        void crossfadeLoop(loop);
      }
    }
  }, 500);
}

function stopPolling(): void {
  if (poll) {
    clearInterval(poll);
    poll = null;
  }
}

// There is deliberately no player teardown: the YouTube API's destroy corrupts its
// internal state and breaks subsequently created players (controls stop responding).
// The player lives for the app's lifetime; only its wrapper is ever re-positioned.

// ── Public API ─────────────────────────────────────────────────────────────────

export function showPlayer(): void {
  actor.send({ type: 'OPEN' });
  // Auto-play: opening the player is a user gesture, so playback may begin now :
  // nothing for the browser to block. The intent survives a player that is still
  // building (it plays on ready) and a consent banner (it plays on the grant).
  if (settings.value.musicAutoPlay && actor.snapshot.state !== 'playing') actor.send({ type: 'PLAY' });
  showVideo();
  startPolling();
}

export function hidePlayer(): void {
  actor.send({ type: 'CLOSE' });
  saveResumePosition();
  stopPolling();
  showVideo();
}

/** Pauses the music without closing the bar: the narration takes the room. */
export function pauseMusic(): void {
  actor.send({ type: 'PAUSE' });
}

export function toggleMute(): void {
  if (!player) return;
  if (player.isMuted()) {
    player.unMute();
    muted.value = false;
  } else {
    player.mute();
    muted.value = true;
  }
}

export function setVolumeLevel(level: number): void {
  if (!player) return;
  player.setVolume(Math.round(Math.min(100, Math.max(0, level))));
}

function togglePlay(): void {
  // The machine's live state decides: never a cached flag.
  actor.send(actor.snapshot.state === 'playing' ? { type: 'PAUSE' } : { type: 'PLAY' });
}

/** Jumps to the next track boundary; in playlist mode, the next video. */
export function nextTrack(): void {
  if (isPlaylist.value) {
    player?.nextVideo();
    return;
  }
  const next = tracks.value.find((t) => t.start > currentTime.value + 0.5);
  if (next) seekTo(next.start);
}

/**
 * Standard music-player behavior: more than three seconds into a track restarts it,
 * otherwise jumps to the previous track's start.
 */
export function previousTrack(): void {
  if (isPlaylist.value) {
    player?.previousVideo();
    return;
  }
  const previous = [...tracks.value].reverse().find((t) => t.start < currentTime.value - 3);
  if (previous) seekTo(previous.start);
  else if (tracks.value.length && currentTime.value > 3) seekTo(tracks.value[0].start);
  else seekTo(0);
}

/** Selects a track from the list: playlists jump to that video, timelines seek. */
export function playTrack(track: MusicTrack): void {
  if (isPlaylist.value) {
    player?.playVideoAt(Math.round(track.start));
    return;
  }
  seekTo(track.start);
}

function seekTo(seconds: number): void {
  if (!player) return;
  // The seek bar always seeks within the current video: including playlists,
  // where the bar's fraction maps to the video's timeline, not playlist indexes.
  // (Playlist navigation uses nextTrack/previousTrack and the track list.)
  player.seekTo(seconds, true);
  if (isPlaylist.value) return;
  currentTime.value = seconds;
  const track = tracks.value.filter((t) => t.start <= seconds).at(-1);
  if (track) currentTrack.value = track.title;
  if (repeatStart.value !== null && track) repeatStart.value = track.start;
}

// ── Crossfade ──────────────────────────────────────────────────────────────────

/** The volume to restore after a fade; captured before each fade-out. */
let savedVolume = 100;
/** True while a repeat crossfade is running: the poll must not re-trigger it. */
let crossfading = false;

async function fadeVolume(to: number, ms: number): Promise<void> {
  if (!player) return;
  const from = player.getVolume();
  const steps = 20;
  for (let i = 1; i <= steps; i++) {
    player.setVolume(from + ((to - from) * i) / steps);
    await new Promise((r) => setTimeout(r, ms / steps));
  }
}

/** Fades out, jumps to the loop anchor, fades back in: a smooth repeat seam. */
async function crossfadeLoop(target: number): Promise<void> {
  try {
    if (!player) return;
    savedVolume = Math.max(player.getVolume(), 1); // 0 would stay silent forever
    await fadeVolume(0, 600);
    player.seekTo(target, true);
    currentTime.value = target;
    player.playVideo();
    await fadeVolume(savedVolume, 600);
  } finally {
    crossfading = false;
  }
}

/** Loops the current timeline track until toggled off; follows seeks to other tracks. */
export function toggleRepeat(): void {
  if (repeatStart.value !== null) {
    repeatStart.value = null;
    return;
  }
  const track = tracks.value.filter((t) => t.start <= currentTime.value).at(-1);
  // No tracks (custom video without timeline): repeat the whole video from the start.
  repeatStart.value = track?.start ?? 0;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function useYouTubeAudio() {
  return {
    coverArt,
    currentTime: readonly(currentTime),
    currentTrack: readonly(currentTrack),
    duration: readonly(duration),
    formatTime,
    hidePlayer,
    isPlaylist: readonly(isPlaylist),
    muted: readonly(muted),
    nextTrack,
    open: readonly(open),
    pauseMusic,
    playing: readonly(playing),
    playlistIndex: readonly(playlistIndex),
    playTrack,
    previousTrack,
    ready: readonly(ready),
    repeatStart: readonly(repeatStart),
    seekTo,
    setVolumeLevel,
    showPlayer,
    title: readonly(title),
    toggleMute,
    togglePlay,
    toggleRepeat,
    tracks: tracks,
    videoId: readonly(videoId),
  };
}
