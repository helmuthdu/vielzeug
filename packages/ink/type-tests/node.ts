import {
  InkConfigError,
  InkError,
  type Point,
  type PolylineToSvgPathOptions,
  polylineToSvgPath,
  type SmoothStrokeOptions,
  type StabilizeStrokeOptions,
  type StrokePoint,
  type StrokeWidthOptions,
  simplifyStroke,
  smoothStroke,
  stabilizeStroke,
  strokeOutline,
  strokeWidths,
} from '@vielzeug/ink';

function expectString(value: string): void {
  if (typeof value !== 'string') throw new Error('expected string');
}

function expectPoints(points: readonly Point[]): void {
  const first = points[0];
  if (first) expectString(`${first.x}${first.y}`);
}

const stroke: StrokePoint[] = [
  { time: 0, x: 0, y: 0 },
  { pressure: 0.5, time: 16, x: 5, y: 2 },
  { time: 32, x: 10, y: 0 },
];

const smoothOptions: SmoothStrokeOptions = { steps: 4, tension: 0.5 };
expectPoints(smoothStroke(stroke, smoothOptions));
expectPoints(smoothStroke(stroke));

const stabilizeOptions: StabilizeStrokeOptions = { strength: 0.6 };
expectPoints(stabilizeStroke(stroke, stabilizeOptions));
expectPoints(stabilizeStroke(stroke));

const widthOptions: StrokeWidthOptions = { referenceSpeed: 0.5, thinning: 0.5, width: 4 };
const widths: number[] = strokeWidths(stroke, widthOptions);
if (widths.length !== stroke.length) throw new Error('expected one width per point');

const ring: Point[] = strokeOutline(stroke, widths);
expectPoints(ring);
expectPoints(strokeOutline(stroke, 4));

const simplified: StrokePoint[] = simplifyStroke(stroke, 0.5);
expectPoints(simplified);

const pathOptions: PolylineToSvgPathOptions = { close: true, precision: 3 };
expectString(polylineToSvgPath(ring, pathOptions));
expectString(polylineToSvgPath(stroke));

const error: InkError = new InkConfigError('config');
if (!(error instanceof InkError)) throw new Error('error hierarchy broken');
