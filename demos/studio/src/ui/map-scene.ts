import { createCamera, scaleOf } from '@vielzeug/atlas';
import { createDragGesture } from '@vielzeug/gesture';
import { createStage, type StageController } from '@vielzeug/stage';
import { createWorkerStage } from '@vielzeug/stage/worker';
import { trackDockHeight } from './dock-badge.ts';
import '@vielzeug/refine/badge';
import '@vielzeug/refine/button';
import '@vielzeug/refine/button-group';
import '@vielzeug/refine/dock';
import '@vielzeug/refine/separator';
import '@vielzeug/refine/tooltip';
import { createMapModel, type MapModel, TILE_SIZE } from '../core/map.ts';
import { createMapLayers, type MapSceneMessage } from '../core/map-layers.ts';
import MapWorker from '../worker/map.worker.ts?worker&inline';
import { createCameraGestures } from './camera-gestures.ts';
import type { SceneHandle } from './shell.ts';
import './map.css';

type RenderMode = 'main' | 'worker';

const MODE_LABEL: Record<RenderMode, string> = { main: 'Main thread', worker: 'Worker thread' };

/**
 * Mounts the map scene: a tabletop-style tile canvas rendered by
 * @vielzeug/stage. Terrain, tokens, and fog live on separate stage layers;
 * atlas computes visibility (shadowcasting FOV) and hit-tests tokens, and
 * the toolbar exports the composited canvas as a PNG. A segmented control
 * switches between main-thread rendering and worker rendering
 * (`@vielzeug/stage/worker` with a transferred OffscreenCanvas); switching
 * disposes the current stage and mounts a fresh canvas because the canvas
 * transfer is one-shot.
 */
export function mountMapScene(container: HTMLElement): SceneHandle {
  container.innerHTML = '';

  const root = document.createElement('div');
  root.className = 'map-root';
  root.dataset.testid = 'map-root';
  container.append(root);

  const mount = document.createElement('div');
  mount.className = 'map-mount';
  mount.dataset.testid = 'map-mount';
  root.append(mount);

  // Screen-space preview that follows the pointer during a token drag, so the
  // token feels dragged rather than jumping on release. Works in both render
  // modes because it never touches the stage.
  const ghost = document.createElement('div');
  ghost.className = 'map-token-ghost';
  ghost.dataset.testid = 'map-token-ghost';
  ghost.hidden = true;
  root.append(ghost);

  const toolbar = document.createElement('ore-dock');
  toolbar.setAttribute('floating', '');
  toolbar.setAttribute('label', 'Map actions');
  toolbar.className = 'studio-dock';
  toolbar.dataset.testid = 'map-toolbar';
  toolbar.innerHTML = `
    <ore-tooltip content="Export PNG" placement="top"><ore-button data-action="export" variant="ghost" icon-only label="Export PNG"><ore-icon name="image-down"></ore-icon></ore-button></ore-tooltip>
    <ore-separator orientation="vertical"></ore-separator>
    <ore-button-group label="Render thread" size="sm" value="main" data-testid="map-thread">
      <ore-tooltip content="Render on the main thread" placement="top"><ore-button value="main" variant="ghost">Main</ore-button></ore-tooltip>
      <ore-tooltip content="Render on a worker thread" placement="top"><ore-button value="worker" variant="ghost">Worker</ore-button></ore-tooltip>
    </ore-button-group>
    <ore-separator orientation="vertical"></ore-separator>`;
  root.append(toolbar);

  // Shared info pill above the dock (see .studio-badge in app.css).
  const statusEl = document.createElement('ore-badge');
  statusEl.setAttribute('variant', 'frost');
  statusEl.setAttribute('rounded', 'full');
  statusEl.className = 'studio-badge';
  statusEl.dataset.testid = 'map-status';
  root.append(statusEl);
  // The status pill sits above the dock; track the capsule's real height.
  const stopDockTrack = trackDockHeight(toolbar, root);
  const status: HTMLElement = statusEl;
  const threadGroup = toolbar.querySelector<HTMLElement>('[data-testid="map-thread"]');
  const exportButton = toolbar.querySelector<HTMLElement>('[data-action="export"]');

  // The main-thread model owns interaction (hit-testing, status). In worker
  // mode the worker owns a twin model and receives the same move messages,
  // so both renderers show the same scene.
  const model: MapModel = createMapModel();
  // Terrain paints every tile in the visible rect; without a floor, zooming
  // out far enough asks for millions of tiles and locks the main thread.
  // At 0.25 the worst case is ~10k tiles on a large display.
  // Framed so the island's hero token (world 24,168) sits clear of the
  // floating dock: the camera point is the world coordinate at the viewport
  // centre, so a smaller negative y lifts the scene on screen.
  const camera = createCamera({ initial: { x: -120, y: -48, zoom: 1 }, minZoom: 0.25 });
  let mode: RenderMode = 'main';
  let detached: (() => void) | null = null;
  let renderer: StageController | null = null;
  // A rejected drop (onto a wall) replaces the status line briefly.
  let statusTimer = 0;

  function updateStatus(): void {
    const visible = model.fog.visible.size;
    status.textContent = `${String(visible)} tiles visible · ${MODE_LABEL[mode]}`;
    status.dataset.visible = String(visible);
    status.dataset.mode = mode;
  }

  function flashStatus(message: string): void {
    status.textContent = message;
    window.clearTimeout(statusTimer);
    statusTimer = window.setTimeout(updateStatus, 1600);
  }

  function attach(): void {
    const canvas = document.createElement('canvas');
    canvas.className = 'map-canvas';
    canvas.dataset.testid = 'map-canvas';
    mount.append(canvas);

    function canvasSize(): { height: number; width: number } {
      return { height: canvas.clientHeight || 480, width: canvas.clientWidth || 800 };
    }

    const dpr = window.devicePixelRatio || 1;
    // Worker mode forwards model moves to the worker twin; main mode has none.
    let scene: ((message: MapSceneMessage) => void) | null = null;
    if (mode === 'main') {
      renderer = createStage(canvas, {
        background: '#0b1220',
        dpr,
        layers: createMapLayers(model),
        ...canvasSize(),
      });
    } else {
      const worker = new MapWorker() as Worker;
      const remote = createWorkerStage<MapSceneMessage>(canvas, worker, {
        background: '#0b1220',
        dpr,
        ...canvasSize(),
      });
      // The creator owns the worker: terminate it when the stage is disposed.
      remote.disposalSignal.addEventListener('abort', () => worker.terminate());
      renderer = remote;
      scene = (message) => remote.sendScene(message);
    }
    const current: StageController = renderer;
    current.setTransform(camera.matrix);

    const unsubscribeCamera = camera.subscribe(() => {
      current.setTransform(camera.matrix);
      // Expose the camera for e2e assertions; the scene is canvas-only.
      root.dataset.camera = `${camera.state.x.toFixed(1)},${camera.state.y.toFixed(1)}`;
    });
    const unsubscribe = model.subscribe(() => current.invalidate('tokens'));

    function toWorld(clientX: number, clientY: number): { x: number; y: number } {
      const box = canvas.getBoundingClientRect();
      return camera.toWorld({ x: clientX - box.left, y: clientY - box.top });
    }

    type MapDrag = { kind: 'pan' } | { kind: 'token'; id: string };
    let dragTarget: MapDrag | null = null;
    let panLast = { x: 0, y: 0 };
    const drag = createDragGesture(canvas, {
      activationDistance: 4,
      onEnd: () => {
        ghost.hidden = true;
        canvas.classList.remove('is-grabbing');
        if (!dragTarget || dragTarget.kind === 'pan') {
          dragTarget = null;
          return;
        }
        const world = toWorld(panLast.x, panLast.y);
        const coord = { col: Math.floor(world.x / TILE_SIZE), row: Math.floor(world.y / TILE_SIZE) };
        if (model.isWall(coord)) {
          flashStatus("Can't move onto a wall");
        } else {
          model.moveToken(dragTarget.id, coord);
          scene?.({ col: coord.col, id: dragTarget.id, row: coord.row, type: 'move' });
        }
        dragTarget = null;
        model.refreshFov();
        current.invalidate('fog');
        updateStatus();
      },
      onMove: (detail) => {
        if (!dragTarget) return;
        const previous = panLast;
        panLast = { x: detail.current.x, y: detail.current.y };
        if (dragTarget.kind === 'pan') {
          // gesture's delta is cumulative from the start; pan needs per-move.
          camera.panBy(detail.current.x - previous.x, detail.current.y - previous.y);
          return;
        }
        const box = root.getBoundingClientRect();
        ghost.style.transform = `translate(${String(detail.current.x - box.left)}px, ${String(detail.current.y - box.top)}px)`;
      },
      onStart: (detail) => {
        panLast = { x: detail.start.x, y: detail.start.y };
        const token = model.tokenAtWorld(toWorld(detail.start.x, detail.start.y));
        if (token) {
          dragTarget = { id: token.id, kind: 'token' };
          ghost.hidden = false;
          ghost.style.transform = `translate(${String(detail.start.x - root.getBoundingClientRect().left)}px, ${String(detail.start.y - root.getBoundingClientRect().top)}px)`;
          return;
        }
        // Empty-area drag pans the map, like the other scenes' canvases.
        dragTarget = { kind: 'pan' };
        canvas.classList.add('is-grabbing');
      },
    });

    const cameraGestures = createCameraGestures(canvas, camera, () => drag.cancel());

    const observer = new ResizeObserver(() => {
      current.resize(canvasSize(), window.devicePixelRatio || 1);
      camera.resize(canvasSize());
    });
    observer.observe(canvas);

    detached = () => {
      observer.disconnect();
      cameraGestures.dispose();
      drag.dispose();
      unsubscribe();
      unsubscribeCamera();
      current.dispose();
      canvas.remove();
      renderer = null;
    };
  }

  exportButton?.addEventListener('click', () => {
    if (!renderer) return;
    // toBlob flushes pending repaints on both modes before rasterizing.
    // Hi-res export: current viewport region at 2× the on-screen density.
    // A region/scale export re-paints world-space content axis-aligned, so a
    // rotated camera exports the composited canvas instead to keep the
    // "export what you see" intent (at screen density).
    const exportScale = scaleOf(camera.matrix) * (window.devicePixelRatio || 1) * 2;
    const rotated = camera.state.rotation !== 0;
    void renderer
      .toBlob(rotated ? { type: 'image/png' } : { region: camera.visibleRect, scale: exportScale, type: 'image/png' })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'vielzeug-map.png';
        link.dataset.testid = 'map-export-link';
        link.click();
        link.remove();
        // Let the download start before releasing the blob URL.
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      })
      .catch((error: unknown) => {
        status.textContent = `Export failed: ${String(error)}`;
      });
  });

  threadGroup?.addEventListener('change', (event) => {
    const value = (event as CustomEvent<{ values?: string[] }>).detail?.values?.[0];
    if (value !== 'main' && value !== 'worker') return;
    mode = value;
    detached?.();
    detached = null;
    updateStatus();
    attach();
  });

  updateStatus();
  attach();

  function dispose(): void {
    stopDockTrack();
    window.clearTimeout(statusTimer);
    detached?.();
    detached = null;
    model.dispose();
    camera.dispose();
  }
  return {
    camera,
    dispose,
    dock: toolbar,
    fit: () => camera.animateTo({ x: -120, y: -48, zoom: 1 }, { duration: 180 }),
  };
}
