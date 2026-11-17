import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const modules = [await import('./dist/index.js'), require('./dist/index.cjs')];
const gridModules = [await import('./dist/grid/index.js'), require('./dist/grid/index.cjs')];

for (const atlas of modules) {
  for (const name of ['createCamera', 'createSpatialIndex', 'snapRect', 'alignRects', 'distributeRects']) {
    if (typeof atlas[name] !== 'function') {
      throw new Error(`${name} export missing`);
    }
  }
  for (const [ErrorType, name] of [
    [atlas.AtlasError, 'AtlasError'],
    [atlas.AtlasConfigError, 'AtlasConfigError'],
  ]) {
    const error = new ErrorType('artifact');
    if (error.name !== name || !(error instanceof atlas.AtlasError)) {
      throw new Error(`${name} artifact identity mismatch`);
    }
  }
}

for (const grid of gridModules) {
  for (const name of ['computeFov', 'createFog', 'visibleTileRange', 'iterateTileRange', 'tileToRect', 'tileKey']) {
    if (typeof grid[name] !== 'function') {
      throw new Error(`grid ${name} export missing`);
    }
  }
  if (typeof grid.AtlasError !== 'function' || typeof grid.AtlasConfigError !== 'function') {
    throw new Error('grid error exports missing');
  }
}
