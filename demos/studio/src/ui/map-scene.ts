import { createCamera } from '@vielzeug/atlas';
import { createDragGesture, createPinchGesture, createWheelGesture } from '@vielzeug/gesture';
import { createStage, type Matrix } from '@vielzeug/stage';
import { createWorkerStage } from '@vielzeug/stage/worker';
import '@vielzeug/refine/button';
import { createMapModel, FOV_RADIUS, type MapModel, TILE_SIZE } from '../core/map.ts';
import { createMapLayers, MAP_LAYER_IDS, type MapSceneMessage } from '../core/map-layers.ts';
import MapWorker from '../worker/map.worker.ts?worker&inline';
import './map.css';

const ZOOM_STEP = 1.0015;

type RenderMode = 'main' | 'worker';

/** Common shape of a main-thread stage and a worker stage client. */
type Renderer = {
  dispose: () => void;
  invalidate: (layerId?: string) => void;
  /** Flush pending repaints synchronously (main-thread stages only). */
  render?: (() => unknown) | undefined;
  resize: (size: { height: number; width: number }, dpr: number) => void;
  sendScene?: ((scene: MapSceneMessage) => void) | undefined;
  setTransform: (matrix: Matrix) => void;
  toBlob: (options?: { type?: string }) => Promise<Blob>;
};

/**
 * Mounts the map scene: a tabletop-style tile canvas rendered by
 * @vielzeug/stage. Terrain, tokens, and fog live on separate stage layers;
 * atlas computes visibility (shadowcasting FOV) and hit-tests tokens, and
 * the toolbar exports the composited canvas as a PNG. A mode toggle switches
 * between main-thread rendering and worker rendering (`@vielzeug/stage/worker`
 * with a transferred OffscreenCanvas); switching disposes the current stage
 * and mounts a fresh canvas because the canvas transfer is one-shot.
 */
export function mountMapScene(container: HTMLElement): { dispose(): void } {
  container.innerHTML = '';

  const root = document.createElement('div');
  root.className = 'map-root';
  root.dataset.testid = 'map-root';
  container.append(root);

  const mount = document.createElement('div');
  mount.className = 'map-mount';
  mount.dataset.testid = 'map-mount';
  root.append(mount);

  const toolbar = document.createElement('div');
  toolbar.className = 'studio-toolbar map-toolbar';
  toolbar.dataset.testid = 'map-toolbar';
  toolbar.innerHTML = `
    <ore-button data-action="export" variant="secondary">Export PNG</ore-button>
    <ore-button data-action="mode" variant="secondary">Use worker</ore-button>
    <span class="map-status" data-testid="map-status"></span>`;
  root.append(toolbar);

  const statusEl = toolbar.querySelector<HTMLElement>('[data-testid="map-status"]');
  if (!statusEl) throw new Error('map status missing');
  const status: HTMLElement = statusEl;
  const modeButton = toolbar.querySelector<HTMLElement>('[data-action="mode"]');
  const exportButton = toolbar.querySelector<HTMLElement>('[data-action="export"]');

  // The main-thread model owns interaction (hit-testing, status). In worker
  // mode the worker owns a twin model and receives the same move messages,
  // so both renderers show the same scene.
  const model: MapModel = createMapModel();
  const camera = createCamera({ initial: { x: -120, y: -120, zoom: 1 } });
  let mode: RenderMode = 'main';
  let detached: (() => void) | null = null;
  let renderer: Renderer | null = null;

  function updateStatus(): void {
    const visible = [...model.fog.visibleKeys].length;
    status.textContent = `${mode} render · FOV radius ${String(FOV_RADIUS)} · ${String(visible)} tiles visible`;
    status.dataset.visible = String(visible);
    status.dataset.mode = mode;
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
    if (mode === 'main') {
      renderer = createStage(canvas, {
        background: '#0b1220',
        dpr,
        layers: createMapLayers(model),
        ...canvasSize(),
      });
    } else {
      const worker = new MapWorker() as Worker;
      const remote = createWorkerStage(canvas, worker, {
        background: '#0b1220',
        dpr,
        layers: MAP_LAYER_IDS.map((id) => ({ id })),
        ...canvasSize(),
      });
      renderer = {
        dispose: () => {
          remote.dispose();
          worker.terminate();
        },
        invalidate: (layerId) => remote.invalidate(layerId),
        resize: (size, nextDpr) => remote.resize(size, nextDpr),
        sendScene: (scene) => remote.sendScene(scene),
        setTransform: (matrix) => remote.setTransform(matrix),
        toBlob: (options) => remote.toBlob(options),
      };
    }
    const current: Renderer = renderer;
    current.setTransform(camera.matrix);

    const unsubscribeCamera = camera.subscribe(() => current.setTransform(camera.matrix));
    const unsubscribe = model.subscribe(() => current.invalidate('tokens'));

    function toWorld(clientX: number, clientY: number): { x: number; y: number } {
      const box = canvas.getBoundingClientRect();
      return camera.toWorld({ x: clientX - box.left, y: clientY - box.top });
    }

    let draggedTokenId: string | null = null;
    const drag = createDragGesture(canvas, {
      activationDistance: 4,
      onEnd: (detail) => {
        if (!draggedTokenId) return;
        const world = toWorld(detail.current.x, detail.current.y);
        const coord = { col: Math.floor(world.x / TILE_SIZE), row: Math.floor(world.y / TILE_SIZE) };
        if (!model.isWall(coord)) {
          model.moveToken(draggedTokenId, coord);
          current.sendScene?.({ col: coord.col, id: draggedTokenId, row: coord.row, type: 'move' });
        }
        draggedTokenId = null;
        model.refreshFov();
        current.invalidate('fog');
        updateStatus();
      },
      onStart: (detail) => {
        const token = model.tokenAtWorld(toWorld(detail.start.x, detail.start.y));
        draggedTokenId = token?.id ?? null;
      },
    });

    let pinchScale = 0;
    const pinch = createPinchGesture(canvas, {
      onMove: (detail) => {
        const box = canvas.getBoundingClientRect();
        const centroid = { x: detail.centroid.x - box.left, y: detail.centroid.y - box.top };
        const ratio = pinchScale === 0 ? 1 : detail.scale / pinchScale;
        pinchScale = detail.scale;
        if (ratio !== 1) camera.zoomAt(centroid, ratio);
        if (detail.deltaCentroid.x !== 0 || detail.deltaCentroid.y !== 0) {
          camera.panBy(detail.deltaCentroid.x, detail.deltaCentroid.y);
        }
      },
      onStart: (detail) => {
        drag.cancel();
        pinchScale = detail.scale;
      },
    });

    const wheel = createWheelGesture(canvas, {
      onWheel: (detail) => {
        const box = canvas.getBoundingClientRect();
        camera.zoomAt(
          { x: detail.event.clientX - box.left, y: detail.event.clientY - box.top },
          ZOOM_STEP ** -detail.deltaY,
        );
      },
      preventDefault: true,
    });

    const observer = new ResizeObserver(() => {
      current.resize(canvasSize(), window.devicePixelRatio || 1);
    });
    observer.observe(canvas);

    detached = () => {
      observer.disconnect();
      wheel.dispose();
      pinch.dispose();
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
    // Worker mode rasterizes on demand; main mode needs a sync flush first.
    renderer.render?.();
    void renderer
      .toBlob({ type: 'image/png' })
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

  modeButton?.addEventListener('click', () => {
    mode = mode === 'main' ? 'worker' : 'main';
    modeButton.textContent = mode === 'main' ? 'Use worker' : 'Use main thread';
    modeButton.dataset.mode = mode;
    detached?.();
    detached = null;
    updateStatus();
    attach();
  });

  updateStatus();
  attach();

  function dispose(): void {
    detached?.();
    detached = null;
    model.dispose();
    camera.dispose();
  }
  return { dispose };
}
