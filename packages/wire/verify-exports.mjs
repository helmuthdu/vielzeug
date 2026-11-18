import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const modules = [await import('./dist/index.js'), require('./dist/index.cjs')];

for (const wire of modules) {
  for (const name of [
    'arrowhead',
    'bezierRoute',
    'bezierToSvgPath',
    'findCyclicGroups',
    'floatingSide',
    'hitBezier',
    'hitPolyline',
    'orthogonalRoute',
    'pointOnBezier',
    'pointOnPolyline',
    'polylineToSvgPath',
    'portAnchor',
    'topologicalOrder',
  ]) {
    if (typeof wire[name] !== 'function') {
      throw new Error(`${name} export missing`);
    }
  }
  for (const [ErrorType, name] of [
    [wire.WireError, 'WireError'],
    [wire.WireGraphError, 'WireGraphError'],
    [wire.WireConfigError, 'WireConfigError'],
  ]) {
    const error = new ErrorType('artifact');
    if (error.name !== name || !(error instanceof wire.WireError)) {
      throw new Error(`${name} artifact identity mismatch`);
    }
  }
}
