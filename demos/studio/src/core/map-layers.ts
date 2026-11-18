import { iterateTileRange, tileKey, tileToRect, visibleTileRange } from '@vielzeug/atlas/grid';
import type { StageLayerOptions } from '@vielzeug/stage';
import { GRID, type MapModel, TILE_SIZE } from './map.ts';

/**
 * Terrain, token, and fog painters for the map scene. Shared between the
 * main-thread stage and the worker-rendered stage so both modes draw the
 * exact same scene from a `MapModel`.
 */
export function createMapLayers(model: MapModel): readonly StageLayerOptions[] {
  return [
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
          const state = model.fog.state(tileKey(coord));
          if (state === 'visible') continue;
          const rect = tileToRect(coord, GRID);
          ctx.fillStyle = state === 'seen' ? 'rgba(11, 18, 32, 0.55)' : 'rgba(11, 18, 32, 0.94)';
          ctx.fillRect(rect.x, rect.y, TILE_SIZE, TILE_SIZE);
        }
      },
    },
  ];
}

/** Payload the main thread forwards to the worker-side map model. */
export type MapSceneMessage = Readonly<{ col: number; id: string; row: number; type: 'move' }>;
