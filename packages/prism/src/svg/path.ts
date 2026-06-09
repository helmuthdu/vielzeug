export interface Point {
  x: number;
  y: number;
}

export function linePath(points: Point[]): string {
  if (points.length === 0) return '';

  let d = `M${points[0].x},${points[0].y}`;

  for (let i = 1; i < points.length; i++) {
    d += `L${points[i].x},${points[i].y}`;
  }

  return d;
}

export function monotonePath(points: Point[]): string {
  if (points.length < 2) return linePath(points);

  if (points.length === 2) return linePath(points);

  const n = points.length;
  const tangents: Point[] = [];

  for (let i = 0; i < n; i++) {
    if (i === 0) {
      tangents.push({ x: points[1].x - points[0].x, y: points[1].y - points[0].y });
    } else if (i === n - 1) {
      tangents.push({ x: points[n - 1].x - points[n - 2].x, y: points[n - 1].y - points[n - 2].y });
    } else {
      tangents.push({ x: (points[i + 1].x - points[i - 1].x) / 2, y: (points[i + 1].y - points[i - 1].y) / 2 });
    }
  }

  let d = `M${points[0].x},${points[0].y}`;

  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const t0 = tangents[i];
    const t1 = tangents[i + 1];
    const dx = (p1.x - p0.x) / 3;

    d += `C${p0.x + dx},${p0.y + t0.y / 3},${p1.x - dx},${p1.y - t1.y / 3},${p1.x},${p1.y}`;
  }

  return d;
}

export function stepPath(points: Point[]): string {
  if (points.length === 0) return '';

  let d = `M${points[0].x},${points[0].y}`;

  for (let i = 1; i < points.length; i++) {
    const midX = (points[i - 1].x + points[i].x) / 2;

    d += `H${midX}V${points[i].y}H${points[i].x}`;
  }

  return d;
}

export function areaPath(topPoints: Point[], bottomPoints: Point[]): string {
  if (topPoints.length === 0) return '';

  let d = linePath(topPoints);
  const reversed = [...bottomPoints].reverse();

  if (reversed.length > 0) {
    d += `L${reversed[0].x},${reversed[0].y}`;
    for (let i = 1; i < reversed.length; i++) {
      d += `L${reversed[i].x},${reversed[i].y}`;
    }
  }

  d += 'Z';

  return d;
}
