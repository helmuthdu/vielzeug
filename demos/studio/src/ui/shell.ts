import '@vielzeug/refine/button';
import '@vielzeug/refine/button-group';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/icons/lucide/all';
import '@vielzeug/refine/navbar';
import '@vielzeug/refine/tooltip';

import type { Camera } from '@vielzeug/atlas';
import { formatShortcut } from '@vielzeug/keymap';
import { createThemeController, type ThemePreference } from '@vielzeug/refine/theme';
import { watch } from '@vielzeug/ripple';

import { studioStore } from '../core/persist.ts';

/**
 * The persistent app chrome, floating over the scene canvas: brand, scene
 * tabs, and the theme toggle (in the navbar's `persistent` slot so it survives
 * the mobile collapse, where the `end` slot hides). The theme cycles light →
 * dark → system and persists the choice in the studio store, next to the
 * scenes it decorates.
 *
 * The zoom cluster is built here but lives in each scene's bottom dock:
 * `createZoomCluster()` hands the scene a wired element and the shell keeps
 * driving it (label, enablement, clicks) against whichever camera is
 * attached.
 */

/** What a scene hands back: cleanup, plus the camera the shell's zoom cluster drives. */
export type SceneHandle = {
  camera?: Camera | null;
  /**
   * The scene's bottom dock. When present, main.ts appends the shell's zoom
   * cluster to it (scenes stay independent of the shell itself).
   */
  dock?: HTMLElement | undefined;
  /** Restore the scene's framing; omitted when there is nothing to frame. */
  fit?: (() => void) | undefined;
  dispose(): void;
};

export type SceneInfo = {
  label: string;
  /** Hash route target, e.g. `#/board`. */
  href: string;
};

export type Shell = {
  root: HTMLElement;
  /** Reflect the active route in the tabs and breadcrumb. */
  setScene(scene: SceneInfo): void;
  /**
   * Wire the zoom cluster to a scene camera. `fit` restores the whole scene
   * (scenes without a camera — or without a meaningful fit — leave it out and
   * the cluster disables itself).
   */
  attachCamera(camera: Camera | null, fit?: (() => void) | null): void;
  /**
   * Build the zoom cluster for a scene dock. The shell keeps driving the most
   * recently created cluster until the next one replaces it.
   */
  createZoomCluster(): HTMLElement;
  dispose(): void;
};

const SCENES: SceneInfo[] = [
  { href: '#/board', label: 'Board' },
  { href: '#/flow', label: 'Flow' },
  { href: '#/map', label: 'Map' },
  { href: '#/palette', label: 'Palette' },
];

/** Multiplicative zoom applied per cluster click, like the wheel's per-notch step. */
const ZOOM_STEP = 1.25;

export function createShell(): Shell {
  const root = document.createElement('header');
  root.className = 'studio-shell';
  root.dataset.testid = 'shell';

  const tabs = SCENES.map(
    (scene) =>
      `<ore-navbar-item href="${scene.href}" data-scene="${scene.href.slice(2)}">${scene.label}</ore-navbar-item>`,
  ).join('');

  const zoomTips = {
    fit: 'Fit to view',
    in: `Zoom in (${formatShortcut('mod+=')})`,
    out: `Zoom out (${formatShortcut('mod+-')})`,
    reset: `Reset zoom (${formatShortcut('mod+0')})`,
  };

  root.innerHTML = `
    <ore-navbar floating variant="flat" rounded="full" label="Studio" class="shell-navbar">
      <div slot="logo" class="shell-brand">
        <ore-icon name="frame" size="18" label="Vielzeug Studio"></ore-icon>
        <span class="shell-brand-name">Vielzeug Studio</span>
      </div>
      <div slot="start" class="shell-tabs" data-testid="shell-tabs">${tabs}</div>
      <div slot="persistent" class="shell-theme">
        <ore-tooltip content="Theme" placement="bottom">
          <ore-button icon-only label="Theme" data-action="theme" data-testid="shell-theme"><ore-icon name="monitor"></ore-icon></ore-button>
        </ore-tooltip>
      </div>
    </ore-navbar>
  `;

  const navbar = root.querySelector('ore-navbar');
  const themeButton = root.querySelector<HTMLElement>('[data-testid="shell-theme"]');

  // The cluster lives in the scene's dock (tooltips open upward there); the
  // shell drives whichever cluster was created most recently.
  const zoomClusterMarkup = `
    <ore-button-group attached rounded="full" size="sm" label="Zoom" class="zoom-group" data-testid="shell-zoom">
      <ore-tooltip content="${zoomTips.out}" placement="top"><ore-button icon-only label="Zoom out" data-zoom="out"><ore-icon name="minus"></ore-icon></ore-button></ore-tooltip>
      <ore-tooltip content="${zoomTips.reset}" placement="top"><ore-button data-zoom="reset" data-testid="shell-zoom-label">100%</ore-button></ore-tooltip>
      <ore-tooltip content="${zoomTips.in}" placement="top"><ore-button icon-only label="Zoom in" data-zoom="in"><ore-icon name="plus"></ore-icon></ore-button></ore-tooltip>
      <ore-tooltip content="${zoomTips.fit}" placement="top"><ore-button icon-only label="Fit to view" data-zoom="fit"><ore-icon name="maximize"></ore-icon></ore-button></ore-tooltip>
    </ore-button-group>`;
  let zoomGroup: HTMLElement | null = null;
  let zoomLabel: HTMLElement | null = null;

  let camera: Camera | null = null;
  let sceneFit: (() => void) | null = null;
  let unsubscribeCamera: (() => void) | null = null;

  function updateZoomLabel(): void {
    if (zoomLabel) zoomLabel.textContent = camera ? `${Math.round(camera.state.zoom * 100)}%` : '100%';
  }

  function updateZoomEnabled(): void {
    // The cluster is meaningless without a camera (the palette page), so it
    // steps aside rather than showing dead buttons.
    if (zoomGroup) zoomGroup.hidden = camera === null;
  }

  /** Zoom about the middle of the visible canvas (below the floating bar). */
  function zoomBy(factor: number): void {
    if (!camera) return;
    const rect = root.parentElement?.getBoundingClientRect();
    const barHeight = navbar?.getBoundingClientRect().height ?? 0;
    const center = {
      x: (rect?.width ?? window.innerWidth) / 2,
      y: barHeight + ((rect?.height ?? window.innerHeight) - barHeight) / 2,
    };
    camera.zoomAt(center, factor);
  }

  function resetZoom(): void {
    // The camera state is the world centre, so a zoom-only animation keeps
    // the view centred where the user is looking.
    camera?.animateTo({ zoom: 1 }, { duration: 180 });
  }

  function fitScene(): void {
    if (sceneFit) sceneFit();
    else if (camera) resetZoom();
  }

  function onZoomClick(event: Event): void {
    const button = (event.target as HTMLElement | null)?.closest?.('[data-zoom]');
    const kind = button?.getAttribute('data-zoom');
    if (!kind) return;
    if (kind === 'in') zoomBy(ZOOM_STEP);
    else if (kind === 'out') zoomBy(1 / ZOOM_STEP);
    else if (kind === 'fit') fitScene();
    else resetZoom();
  }

  function onKeyDown(event: KeyboardEvent): void {
    // Without a camera attached (the palette page), the browser's own zoom
    // shortcuts must keep working — do not preventDefault them.
    if (!camera) return;
    if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
    if (event.key === '=' || event.key === '+') {
      event.preventDefault();
      zoomBy(ZOOM_STEP);
    } else if (event.key === '-') {
      event.preventDefault();
      zoomBy(1 / ZOOM_STEP);
    } else if (event.key === '0') {
      event.preventDefault();
      resetZoom();
    }
  }

  const theme = createThemeController();
  const themeStore = studioStore();
  // Restore the saved preference; a corrupt row is dropped rather than fatal.
  void themeStore
    .get('preferences', 'theme')
    .then((row) => {
      if (row) theme.setPreference(row.theme);
    })
    .catch(() => void themeStore.clear('preferences'));

  const THEME_ORDER: Record<ThemePreference, ThemePreference> = { dark: 'system', light: 'dark', system: 'light' };
  const THEME_ICON: Record<ThemePreference, string> = { dark: 'moon', light: 'sun', system: 'monitor' };
  const THEME_LABEL: Record<ThemePreference, string> = {
    dark: 'Theme: dark (switch to system)',
    light: 'Theme: light (switch to dark)',
    system: 'Theme: system (switch to light)',
  };

  function onThemeClick(): void {
    theme.setPreference(THEME_ORDER[theme.preference.value]);
  }

  const stopThemeUi = watch(theme.preference, (preference) => {
    if (!themeButton) return;
    themeButton.querySelector('ore-icon')?.setAttribute('name', THEME_ICON[preference]);
    themeButton.setAttribute('aria-label', THEME_LABEL[preference]);
    themeButton.setAttribute('title', THEME_LABEL[preference]);
  });
  const stopThemeSave = watch(theme.preference, (preference) => {
    void themeStore.put('preferences', { id: 'theme', theme: preference });
  });

  themeButton?.addEventListener('click', onThemeClick);
  window.addEventListener('keydown', onKeyDown);

  updateZoomEnabled();
  updateZoomLabel();

  return {
    attachCamera(nextCamera, nextFit) {
      unsubscribeCamera?.();
      camera = nextCamera;
      sceneFit = nextFit ?? null;
      unsubscribeCamera = camera ? camera.subscribe(updateZoomLabel) : null;
      updateZoomEnabled();
      updateZoomLabel();
    },
    createZoomCluster() {
      const template = document.createElement('template');
      template.innerHTML = zoomClusterMarkup.trim();
      const cluster = template.content.firstElementChild as HTMLElement;
      zoomGroup?.removeEventListener('click', onZoomClick);
      zoomGroup = cluster;
      zoomLabel = cluster.querySelector<HTMLElement>('[data-testid="shell-zoom-label"]');
      cluster.addEventListener('click', onZoomClick);
      updateZoomEnabled();
      updateZoomLabel();
      return cluster;
    },
    dispose() {
      unsubscribeCamera?.();
      stopThemeUi.dispose();
      stopThemeSave.dispose();
      themeButton?.removeEventListener('click', onThemeClick);
      theme.dispose();
      zoomGroup?.removeEventListener('click', onZoomClick);
      zoomGroup = null;
      zoomLabel = null;
      window.removeEventListener('keydown', onKeyDown);
      root.remove();
    },
    root,
    setScene(scene) {
      navbar?.setAttribute('active-url', scene.href);
      document.title = `${scene.label} · Vielzeug Studio`;
    },
  };
}
