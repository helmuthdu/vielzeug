// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { createApp, defineComponent, h, nextTick, ref } from 'vue';
import AudioPlayerBar from './AudioPlayerBar.vue';

const audio = vi.hoisted(() => ({ hidePlayer: vi.fn() }));

vi.mock('../../composables/use-youtube-audio', () => ({
  useYouTubeAudio: () => ({
    coverArt: ref(''),
    currentTime: ref(12),
    currentTrack: ref('Track'),
    duration: ref(50),
    formatTime: () => '0:12',
    hidePlayer: audio.hidePlayer,
    isPlaylist: ref(false),
    muted: ref(false),
    nextTrack: vi.fn(),
    open: ref(true),
    playing: ref(true),
    playlistIndex: ref(0),
    playTrack: vi.fn(),
    previousTrack: vi.fn(),
    ready: ref(true),
    repeatStart: ref(null),
    seekTo: vi.fn(),
    title: ref('Title'),
    toggleMute: vi.fn(),
    togglePlay: vi.fn(),
    toggleRepeat: vi.fn(),
    tracks: ref(Array.from({ length: 13 }, (_, index) => ({ start: index * 3, title: `Track ${index + 1}` }))),
  }),
}));

function mountAudioBar(): { app: ReturnType<typeof createApp>; container: HTMLDivElement } {
  const container = document.createElement('div');
  const app = createApp(AudioPlayerBar);
  for (const tag of ['ore-button', 'ore-icon', 'ore-popover']) {
    app.component(
      tag,
      defineComponent({
        setup(_, { attrs, slots }) {
          return () =>
            h(
              tag,
              attrs,
              Object.values(slots).flatMap((slot) => slot?.() ?? []),
            );
        },
      }),
    );
  }
  app.mount(container);
  return { app, container };
}

describe('AudioPlayerBar', () => {
  it('shows chapter boundaries on playlists with more than 12 tracks', () => {
    const { app, container } = mountAudioBar();

    expect(container.querySelectorAll('.audio-bar__tracklist-item')).toHaveLength(13);
    expect(container.querySelector('.audio-bar__seek')?.getAttribute('aria-valuemax')).toBe('50');
    expect(container.querySelectorAll('.audio-bar__divider')).toHaveLength(12);
    expect(container.querySelectorAll('.audio-bar__divider--dense')).toHaveLength(12);
    app.unmount();
  });

  it('minimizes without closing playback and can restore the controls', async () => {
    const { app, container } = mountAudioBar();

    container.querySelector<HTMLElement>('[aria-label="Minimize player"]')?.click();
    await nextTick();
    expect(container.querySelector('.audio-bar--minimized')).not.toBeNull();
    expect(container.querySelector('.audio-bar__controls')).toBeNull();
    expect(audio.hidePlayer).not.toHaveBeenCalled();
    expect(container.querySelector('.audio-bar__sr')?.textContent).toContain('Playing');

    container.querySelector<HTMLElement>('[aria-label="Expand player"]')?.click();
    await nextTick();
    expect(container.querySelector('.audio-bar__controls')).not.toBeNull();
    app.unmount();
  });
});
