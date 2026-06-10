import type { PieSliceConfig } from '../../types';

export interface Arc {
  capEnd: boolean;
  capStart: boolean;
  centerX: number;
  centerY: number;
  color: string;
  cornerRadius: number;
  endAngle: number;
  index: number;
  innerRadius: number;
  outerRadius: number;
  padAngle: number;
  slice: PieSliceConfig;
  startAngle: number;
}

export function computeArcs(
  slices: PieSliceConfig[],
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number,
  padPixels: number,
  cornerRadius: number,
  defaultColors: (i: number) => string,
  capEnds = false,
): Arc[] {
  const total = slices.reduce((s, d) => s + Math.max(0, d.value), 0);

  if (total === 0) return [];

  const range = endAngle - startAngle;
  const halfGapAngle = outerRadius > 0 ? Math.asin(Math.min(1, padPixels / 2 / outerRadius)) : 0;

  let currentAngle = startAngle;
  const n = slices.length;

  return slices.map((slice, i) => {
    const fraction = Math.max(0, slice.value) / total;
    const sliceRange = fraction * range;
    const rawStart = currentAngle;
    const rawEnd = currentAngle + sliceRange;

    currentAngle += sliceRange;

    const padAngle = Math.min(halfGapAngle, sliceRange / 2);

    return {
      capEnd: capEnds && i === n - 1,
      capStart: capEnds && i === 0,
      centerX: cx,
      centerY: cy,
      color: slice.color ?? defaultColors(i),
      cornerRadius,
      endAngle: rawEnd,
      index: i,
      innerRadius,
      outerRadius,
      padAngle,
      slice,
      startAngle: rawStart,
    };
  });
}

// Polar to cartesian, returns x,y string for SVG path
function p(cx: number, cy: number, r: number, a: number): string {
  return `${cx + r * Math.sin(a)},${cy - r * Math.cos(a)}`;
}

// Cartesian x component
function px(cx: number, r: number, a: number): number {
  return cx + r * Math.sin(a);
}

// Cartesian y component
function py(cy: number, r: number, a: number): number {
  return cy - r * Math.cos(a);
}

export function arcPath(arc: Arc): string {
  const {
    capEnd,
    capStart,
    centerX: cx,
    centerY: cy,
    cornerRadius: cr,
    endAngle,
    innerRadius,
    outerRadius,
    padAngle,
    startAngle,
  } = arc;

  const sweep = endAngle - startAngle;

  if (sweep <= 0) return '';

  // ── Full circle ─────────────────────────────────────────────────────────────
  if (sweep >= 2 * Math.PI - 1e-6) {
    const mid = startAngle + Math.PI;

    if (innerRadius <= 0) {
      return `M${p(cx, cy, outerRadius, startAngle)}A${outerRadius},${outerRadius},0,1,1,${p(cx, cy, outerRadius, mid)}A${outerRadius},${outerRadius},0,1,1,${p(cx, cy, outerRadius, startAngle)}Z`;
    }

    return [
      `M${p(cx, cy, outerRadius, startAngle)}`,
      `A${outerRadius},${outerRadius},0,1,1,${p(cx, cy, outerRadius, mid)}`,
      `A${outerRadius},${outerRadius},0,1,1,${p(cx, cy, outerRadius, startAngle)}`,
      `M${p(cx, cy, innerRadius, startAngle)}`,
      `A${innerRadius},${innerRadius},0,1,0,${p(cx, cy, innerRadius, mid)}`,
      `A${innerRadius},${innerRadius},0,1,0,${p(cx, cy, innerRadius, startAngle)}`,
      'Z',
    ].join('');
  }

  // Cap ends don't get a padAngle inset (no adjacent slice on that side)
  const sa = capStart ? startAngle : startAngle + padAngle;
  const ea = capEnd ? endAngle : endAngle - padAngle;

  if (ea <= sa) return '';

  const paddedSweep = ea - sa;

  // ── No rounding ─────────────────────────────────────────────────────────────
  if (cr <= 0) {
    const large = paddedSweep > Math.PI ? 1 : 0;

    if (innerRadius <= 0) {
      return `M${cx},${cy}L${p(cx, cy, outerRadius, sa)}A${outerRadius},${outerRadius},0,${large},1,${p(cx, cy, outerRadius, ea)}Z`;
    }

    return [
      `M${p(cx, cy, outerRadius, sa)}`,
      `A${outerRadius},${outerRadius},0,${large},1,${p(cx, cy, outerRadius, ea)}`,
      `L${p(cx, cy, innerRadius, ea)}`,
      `A${innerRadius},${innerRadius},0,${large},0,${p(cx, cy, innerRadius, sa)}`,
      'Z',
    ].join('');
  }

  // ── Rounded corners (or semicircle caps at open ends) ────────────────────────
  // Corner bezier pull amounts
  const outerPull = Math.min(cr / outerRadius, paddedSweep / 2);
  const innerPull = Math.min(cr / innerRadius, paddedSweep / 2);
  const radialPull = Math.min(cr, (outerRadius - innerRadius) / 2);
  const capR = (outerRadius - innerRadius) / 2; // semicircle cap radius

  // Shortened arc angles (for corners)
  const oS = sa + (capStart ? 0 : outerPull);
  const oE = ea - (capEnd ? 0 : outerPull);
  const iS = sa + (capStart ? 0 : innerPull);
  const iE = ea - (capEnd ? 0 : innerPull);

  const largeO = oE - oS > Math.PI ? 1 : 0;
  const largeI = iE - iS > Math.PI ? 1 : 0;

  // Unrounded corner cartesian positions (at full sa/ea, not shortened)
  const cxOs = px(cx, outerRadius, sa);
  const cyOs = py(cy, outerRadius, sa);
  const cxOe = px(cx, outerRadius, ea);
  const cyOe = py(cy, outerRadius, ea);
  const cxIs = px(cx, innerRadius, sa);
  const cyIs = py(cy, innerRadius, sa);
  const cxIe = px(cx, innerRadius, ea);
  const cyIe = py(cy, innerRadius, ea);

  const frac = radialPull / (outerRadius - innerRadius);
  const pOsRad = `${cxOs + (cxIs - cxOs) * frac},${cyOs + (cyIs - cyOs) * frac}`;
  const pOeRad = `${cxOe + (cxIe - cxOe) * frac},${cyOe + (cyIe - cyOe) * frac}`;
  const pIsRad = `${cxIs + (cxOs - cxIs) * frac},${cyIs + (cyOs - cyIs) * frac}`;
  const pIeRad = `${cxIe + (cxOe - cxIe) * frac},${cyIe + (cyOe - cyIe) * frac}`;

  const segs: string[] = [];

  // Start edge
  if (capStart) {
    segs.push(`M${p(cx, cy, outerRadius, sa)}`);
  } else {
    segs.push(`M${pOsRad}`);
    segs.push(`Q${cxOs},${cyOs},${p(cx, cy, outerRadius, oS)}`);
  }

  // Outer arc
  segs.push(`A${outerRadius},${outerRadius},0,${largeO},1,${p(cx, cy, outerRadius, oE)}`);

  // End edge
  if (capEnd) {
    // Semicircle cap from outer-end → inner-end, bulging away from center (CW)
    segs.push(`A${capR},${capR},0,0,1,${p(cx, cy, innerRadius, ea)}`);
  } else {
    segs.push(`Q${cxOe},${cyOe},${pOeRad}`);
    segs.push(`L${pIeRad}`);
    segs.push(`Q${cxIe},${cyIe},${p(cx, cy, innerRadius, iE)}`);
  }

  // Inner arc (reversed, CCW)
  segs.push(`A${innerRadius},${innerRadius},0,${largeI},0,${p(cx, cy, innerRadius, iS)}`);

  // Start edge close
  if (capStart) {
    // Semicircle cap from inner-start → outer-start, bulging away from center (CCW)
    segs.push(`A${capR},${capR},0,0,0,${p(cx, cy, outerRadius, sa)}`);
  } else {
    segs.push(`Q${cxIs},${cyIs},${pIsRad}`);
  }

  segs.push('Z');

  return segs.join('');
}

export function arcCentroid(arc: Arc): { x: number; y: number } {
  const mid = (arc.startAngle + arc.endAngle) / 2;
  const r = (arc.outerRadius + arc.innerRadius) / 2;

  return {
    x: arc.centerX + r * Math.sin(mid),
    y: arc.centerY - r * Math.cos(mid),
  };
}
