import { serveStage, type WorkerSelfScope } from '@vielzeug/stage/worker';
import { createMapModel } from '../core/map.ts';
import { createMapLayers, type MapSceneMessage } from '../core/map-layers.ts';

/**
 * Worker half of the map scene: owns a deterministic MapModel, registers the
 * shared painters with serveStage, and applies token moves forwarded from the
 * main thread as typed scene messages. The handler owns repaints.
 */
serveStage<MapSceneMessage>(self as unknown as WorkerSelfScope, () => {
  const model = createMapModel();
  return {
    layers: createMapLayers(model),
    onDispose: () => model.dispose(),
    onScene: (move, stage) => {
      if (move.type !== 'move') return;
      if (model.isWall({ col: move.col, row: move.row })) return;
      model.moveToken(move.id, { col: move.col, row: move.row });
      model.refreshFov();
      stage.invalidate('tokens');
      stage.invalidate('fog');
    },
  };
});
