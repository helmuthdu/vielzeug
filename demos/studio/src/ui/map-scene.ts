import { createCamera } from '@vielzeug/atlas';
import { iterateTileRange, tileToRect, visibleTileRange } from '@vielzeug/atlas/grid';
import { createDragGesture, createPinchGesture, createWheelGesture } from '@vielzeug/gesture';
import { createStage } from '@vielzeug/stage';
import '@vielzeug/refine/button';
import { createMapModel, FOV_RADIUS, GRID, type MapModel, TILE_SIZE } from '../core/map.ts';
import './map.css';

const ZOOM_STEP = 1.0015;

/**
 * Mounts the map scene: a tabletop-style tile canvas rendered by
 * @vielzeug/stage. Terrain, tokens, and fog live on separate stage layers;
 * atlas computes visibility (shadowcasting FOV) and hit-tests tokens, and
 * the toolbar exports the composited canvas as a PNG.
 */
export function mountMapScene(container: HTMLElement): { dispose(): void } {
  container.innerHTML = '';

  const root = document.createElement('div');
  root.className = 'map-root';
  root.dataset.testid = 'map-root';
  container.append(root);

  const canvas = document.createElement('canvas');
  canvas.className = 'map-canvas';
  canvas.dataset.testid = 'map-canvas';
  root.append(canvas);

  const toolbar = document.createElement('div');
  toolbar.className = 'studio-toolbar map-toolbar';
  toolbar.dataset.testid = 'map-toolbar';
  toolbar.innerHTML = `
    <ore-button data-action="export" variant="secondary">Export PNG</ore-button>
    <span class="map-status" data-testid="map-status"></span>`;
  root.append(toolbar);

  const statusEl = toolbar.querySelector<HTMLElement>('[data-testid="map-status"]');
  if (!statusEl) throw new Error('map status missing');
  const status: HTMLElement = statusEl;

  const camera = createCamera({ initial: { x: -120, y: -120, zoom: 1 } });
  const model: MapModel = createMapModel();
  let draggedTokenId: string | null = null;

  function canvasSize(): { height: number; width: number } {
    return { height: canvas.clientHeight || 480, width: canvas.clientWidth || 800 };
  }

  const stage = createStage(canvas, {
    background: '#0b1220',
    dpr: window.devicePixelRatio || 1,
    ...canvasSize(),
    layers: [
      {
        id: 'terrain',
        paint: (ctx, { visibleRect }) => {
          const range = visibleTileRange(visibleRect, GRID);
          for (const coord of iterateTileRange(range)) {
            const rect = tileToRect(coord, GRID);
            ctx.fillStyle = model.terrainColor(coord);
            ctx.fillRect(rect.x, rect.y, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = 'rgba(8, 12, 20, 0.35)';
            ctx.lineWidth = 1;
            ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
          }
        },
      },
      {
        id: 'tokens',
        paint: (ctx) => {
          for (const token of model.tokens) {
            const rect = model.tokenRect(token);
            const cx = rect.x + TILE_SIZE / 2;
            const cy = rect.y + TILE_SIZE / 2;
            ctx.fillStyle = token.color;
            ctx.beginPath();
            ctx.arc(cx, cy, TILE_SIZE * 0.32, 0, Math.PI * 2);
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#0b1220';
            ctx.stroke();
            ctx.fillStyle = '#0b1220';
            ctx.font = `bold ${Math.round(TILE_SIZE * 0.36)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(token.label, cx, cy + 1);
          }
        },
      },
      {
        id: 'fog',
        paint: (ctx, { visibleRect }) => {
          const range = visibleTileRange(visibleRect, GRID);
          for (const coord of iterateTileRange(range)) {
            const state = model.fog.state(coord);
            if (state === 'visible') continue;
            const rect = tileToRect(coord, GRID);
            ctx.fillStyle = state === 'seen' ? 'rgba(11, 18, 32, 0.55)' : 'rgba(11, 18, 32, 0.94)';
            ctx.fillRect(rect.x, rect.y, TILE_SIZE, TILE_SIZE);
          }
        },
      },
    ],
  });

  function syncCamera(): void {
    stage.setTransform(camera.matrix);
  }

  function updateFog(): void {
    model.refreshFov();
    stage.invalidate('fog');
    updateStatus();
  }

  function updateStatus(): void {
    const visible = [...model.fog.visibleKeys].length;
    status.textContent = `FOV radius ${String(FOV_RADIUS)} · ${String(visible)} tiles visible`;
    status.dataset.visible = String(visible);
  }

  const unsubscribe = model.subscribe(() => stage.invalidate('tokens'));
  const unsubscribeCamera = camera.subscribe(() => syncCamera());
  syncCamera();
  updateStatus();

  // ── Pointer interaction ───────────────────────────────────────────────────
  function toWorld(clientX: number, clientY: number): { x: number; y: number } {
    const box = canvas.getBoundingClientRect();
    return camera.toWorld({ x: clientX - box.left, y: clientY - box.top });
  }

  const drag = createDragGesture(canvas, {
    activationDistance: 4,
    onEnd: (detail) => {
      if (!draggedTokenId) return;
      const world = toWorld(detail.current.x, detail.current.y);
      const coord = {
        col: Math.floor(world.x / TILE_SIZE),
        row: Math.floor(world.y / TILE_SIZE),
      };
      if (!model.isWall(coord)) model.moveToken(draggedTokenId, coord);
      draggedTokenId = null;
      updateFog();
    },
    onStart: (detail) => {
      const token = model.tokenAtWorld(toWorld(detail.start.x, detail.start.y));
      draggedTokenId = token?.id ?? null;
    },
  });

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
  let pinchScale = 0;

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

  // ── Toolbar ───────────────────────────────────────────────────────────────
  const exportButton = toolbar.querySelector<HTMLElement>('[data-action="export"]');
  exportButton?.addEventListener('click', () => {
    stage.render();
    void stage.toBlob({ type: 'image/png' }).then((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'vielzeug-map.png';
      link.dataset.testid = 'map-export-link';
      link.click();
      link.remove();
      // Let the download start before releasing the blob URL.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  });

  // ── Resize ────────────────────────────────────────────────────────────────
  const observer = new ResizeObserver(() => {
    stage.resize(canvasSize(), window.devicePixelRatio || 1);
  });
  observer.observe(canvas);

  function dispose(): void {
    observer.disconnect();
    wheel.dispose();
    pinch.dispose();
    drag.dispose();
    unsubscribe();
    unsubscribeCamera();
    model.dispose();
    camera.dispose();
    stage.dispose();
  }
  return { dispose };
}
