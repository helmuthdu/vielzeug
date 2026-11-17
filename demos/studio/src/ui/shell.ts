import '@vielzeug/refine/avatar';
import '@vielzeug/refine/avatar-group';
import '@vielzeug/refine/breadcrumb';
import '@vielzeug/refine/button';
import '@vielzeug/refine/button-group';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/icons/lucide/all';
import '@vielzeug/refine/navbar';
import '@vielzeug/refine/tooltip';

import type { Camera } from '@vielzeug/atlas';

/**
 * The persistent app chrome, floating over the scene canvas like the mockup's
 * white bar: brand, scene tabs, breadcrumb, collaborators, share, and a zoom
 * cluster wired to whichever scene's camera is currently attached.
 */

/** What a scene hands back: cleanup, plus the camera the shell's zoom cluster drives. */
export type SceneHandle = {
  camera?: Camera | null;
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

  root.innerHTML = `
    <ore-navbar floating variant="frost" rounded="lg" elevation="lg" label="Studio" class="shell-navbar">
      <div slot="logo" class="shell-brand">
        <ore-icon name="frame" size="18" label="Vielzeug Studio"></ore-icon>
        <span class="shell-brand-name">Vielzeug Studio</span>
      </div>
      <div slot="start" class="shell-tabs" data-testid="shell-tabs">${tabs}</div>
      <ore-breadcrumb class="shell-crumb" label="Breadcrumb">
        <ore-breadcrumb-item href="#/board">Workspace</ore-breadcrumb-item>
        <ore-breadcrumb-item active data-testid="shell-scene">Board</ore-breadcrumb-item>
      </ore-breadcrumb>
      <div slot="end" class="shell-actions">
        <div class="shell-zoom" data-testid="shell-zoom">
          <ore-button-group attached rounded="full" size="sm" label="Zoom" class="zoom-group">
            <ore-button icon-only label="Zoom out" data-zoom="out"><ore-icon name="minus"></ore-icon></ore-button>
            <ore-button data-zoom="reset" data-testid="shell-zoom-label">100%</ore-button>
            <ore-button icon-only label="Zoom in" data-zoom="in"><ore-icon name="plus"></ore-icon></ore-button>
            <ore-button icon-only label="Fit to view" data-zoom="fit"><ore-icon name="maximize"></ore-icon></ore-button>
          </ore-button-group>
        </div>
        <span class="shell-divider" aria-hidden="true"></span>
        <ore-avatar-group max="3" label="Collaborators">
          <ore-avatar initials="SK" color="primary"></ore-avatar>
          <ore-avatar initials="HD"></ore-avatar>
          <ore-avatar initials="AI" color="success"></ore-avatar>
          <ore-avatar initials="JL" color="warning"></ore-avatar>
        </ore-avatar-group>
        <ore-button color="primary" data-testid="shell-share">
          <ore-icon name="share-2" slot="start"></ore-icon>
          Share
        </ore-button>
      </div>
    </ore-navbar>
  `;

  const navbar = root.querySelector('ore-navbar');
  const crumbScene = root.querySelector<HTMLElement>('[data-testid="shell-scene"]');
  const zoomGroup = root.querySelector<HTMLElement>('[data-testid="shell-zoom"]');
  const zoomLabel = root.querySelector<HTMLElement>('[data-testid="shell-zoom-label"]');
  const shareButton = root.querySelector<HTMLElement>('[data-testid="shell-share"]');

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
    if (!camera) return;
    const state = camera.state;
    camera.animateTo({ ...state, zoom: 1 }, { duration: 180 });
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

  function onShareClick(): void {
    // The demo has no backend: sharing means putting the link on the clipboard.
    void navigator.clipboard
      ?.writeText(window.location.href)
      .then(() => {
        if (!shareButton) return;
        shareButton.textContent = 'Copied';
        window.setTimeout(() => {
          if (shareButton.isConnected) shareButton.innerHTML = SHARE_LABEL;
        }, 1500);
      })
      .catch(() => {
        /* clipboard unavailable (permissions) — the button simply no-ops */
      });
  }

  const SHARE_LABEL = shareButton?.innerHTML ?? '';

  function onKeyDown(event: KeyboardEvent): void {
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

  zoomGroup?.addEventListener('click', onZoomClick);
  shareButton?.addEventListener('click', onShareClick);
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
    dispose() {
      unsubscribeCamera?.();
      zoomGroup?.removeEventListener('click', onZoomClick);
      shareButton?.removeEventListener('click', onShareClick);
      window.removeEventListener('keydown', onKeyDown);
      root.remove();
    },
    root,
    setScene(scene) {
      navbar?.setAttribute('active-url', scene.href);
      if (crumbScene) crumbScene.textContent = scene.label;
    },
  };
}
