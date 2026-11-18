import {
  type BezierRouteOptions,
  bezierRoute,
  bezierToSvgPath,
  type CubicBezier,
  type Edge,
  findCyclicGroups,
  type OrthogonalRouteOptions,
  orthogonalRoute,
  type Point,
  type PortAnchor,
  type PortSide,
  polylineToSvgPath,
  portAnchor,
  type Rect,
  topologicalOrder,
  WireConfigError,
  WireError,
  WireGraphError,
} from '@vielzeug/wire';

function expectString(value: string): void {
  if (typeof value !== 'string') throw new Error('expected string');
}

function expectPoints(points: readonly Point[]): void {
  const first = points[0];
  if (first) expectString(`${first.x}${first.y}`);
}

const rect: Rect = { height: 64, width: 160, x: 0, y: 0 };
const side: PortSide = 'bottom';
const from: PortAnchor = portAnchor(rect, side, 0.5);
const to: PortAnchor = portAnchor(rect, 'right', 0.5);
expectPoints([from, to]);
const anchorSide: 'top' | 'right' | 'bottom' | 'left' = from.side;
if (anchorSide !== side) throw new Error('anchor side lost');

const bezierOptions: BezierRouteOptions = { handleLength: 20 };
const curve: CubicBezier = bezierRoute(from, to, bezierOptions);
expectString(`${curve.from.x}${curve.c1.y}${curve.c2.x}${curve.to.y}`);
expectString(bezierToSvgPath(curve));

const orthoOptions: OrthogonalRouteOptions = { bendPenalty: 12, obstacles: [rect], padding: 8, stub: 0 };
const route = orthogonalRoute(from, to, orthoOptions);
if (route) expectPoints(route);

expectString(
  polylineToSvgPath([
    { x: 0, y: 0 },
    { x: 1, y: 1 },
  ]),
);

const edges: Edge[] = [{ from: 'a', to: 'b' }];
const order: string[] = topologicalOrder(['a', 'b'], edges);
if (order[0] !== 'a') throw new Error('unexpected order');
const groups: string[][] = findCyclicGroups(['a', 'b'], edges);
if (groups.length !== 0) throw new Error('unexpected cyclic group');

const error: WireError = new WireGraphError('graph');
const configError: WireError = new WireConfigError('config');
if (!(error instanceof WireError) || !(configError instanceof WireError)) throw new Error('error hierarchy broken');
