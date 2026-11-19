import { serveStage, type WorkerSelfScope } from '@vielzeug/stage/worker';
import { createEncounterModel } from '../core/encounter.ts';
import { createMapLayers, type MapLayerOptions, type MapPalette, type MapSceneMessage } from '../core/map-layers.ts';

/**
 * Worker half of the map scene: owns a twin encounter model, registers the
 * shared painters, and repaints from full state snapshots forwarded by the
 * main thread. A snapshot (not a per-action delta) keeps the two models from
 * drifting, and the worker owns its repaints.
 */
serveStage<MapSceneMessage>(self as unknown as WorkerSelfScope, () => {
  const model = createEncounterModel();
  const overlay: {
    current: MapLayerOptions;
  } = {
    current: { palette: PALETTE_PLACEHOLDER },
  };
  return {
    layers: createMapLayers(model, overlay),
    onDispose: () => model.dispose(),
    onScene: (message, stage) => {
      if (message.type !== 'state') return;
      model.importFog(message.fog);
      model.replace(message.state);
      overlay.current = {
        cursor: message.overlay.cursor,
        fallen: message.overlay.fallen,
        ghosts: message.overlay.ghosts,
        highlight: message.overlay.highlight,
        hover: message.overlay.hover,
        palette: message.overlay.palette,
        reachable: new Map(message.overlay.reachable.map((key) => [key, 0])),
        routes: message.overlay.routes,
        selectedId: message.overlay.selectedId,
      };
      stage.invalidate('terrain');
      stage.invalidate('reachable');
      stage.invalidate('routes');
      stage.invalidate('ghosts');
      stage.invalidate('units');
      stage.invalidate('fallen');
      stage.invalidate('hover');
      stage.invalidate('cursor');
      stage.invalidate('fog');
    },
  };
});

// The worker cannot read the page's CSS, so the first snapshot's palette is
// used; before it arrives nothing is painted, and an empty palette is safe.
const PALETTE_PLACEHOLDER: MapPalette = {
  background: 'transparent',
  blocked: 'transparent',
  classLightness: '58%',
  fallen: 'transparent',
  fogSeen: 'transparent',
  fogUnseen: 'transparent',
  ghost: 'transparent',
  grid: 'transparent',
  hover: 'transparent',
  labelFont: 'sans-serif',
  reachable: 'transparent',
  route: 'transparent',
  selected: 'transparent',
  terrain: {
    grass: 'transparent',
    'grass-alt': 'transparent',
    sand: 'transparent',
    wall: 'transparent',
    water: 'transparent',
  },
  unitEnemy: 'transparent',
  unitHero: 'transparent',
  unitText: 'transparent',
};
