import type { QrMatrix, QrSvgOptions } from './types';

/**
 * SVG rendering: pure string output, safe in any environment.
 * The optimized path merges each row's dark-module runs into `M x y hW v1 h-W z`
 * spans; `optimizePath: false` emits one subpath per module. `dotStyle` paints
 * non-finder modules as rounded squares or dots (finders stay square, per the
 * scanner-robust convention); `gradient` replaces the solid module paint;
 * `image` embeds a centered logo and skips the modules it covers.
 */

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Fresh-id counter for gradient `<defs>`; `gradient.id` overrides for stable output. */
let gradientSequence = 0;

/** Finder pattern (7×7) plus its separator row/column: 8 modules per corner. */
const inFinderZone = (x: number, y: number, size: number): boolean =>
  (x < 8 && y < 8) || (x >= size - 8 && y < 8) || (x < 8 && y >= size - 8);

export function toSvg(matrix: QrMatrix, options: QrSvgOptions = {}): string {
  const margin = options.margin ?? 4;
  const scale = options.scale ?? 1;
  const dotStyle = options.dotStyle ?? 'square';
  const gradient = options.gradient;
  const image = options.image;
  const paint = gradient
    ? `url(#${gradient.id ?? `sigil-qr-gradient-${++gradientSequence}`})`
    : (options.dark ?? 'currentColor');
  const light = options.light ?? 'transparent';
  const optimize = options.optimizePath ?? true;
  const dim = (matrix.size + margin * 2) * scale;

  // Logo geometry in user units.
  const logoSide = image ? matrix.size * scale * (image.size ?? 0.22) : 0;
  const carveHalf = image ? (logoSide + 2 * (image.spacing ?? 1) * scale) / 2 : 0;
  const center = (matrix.size / 2 + margin) * scale;
  const underImage = (x: number, y: number): boolean => {
    if (!image) return false;
    const x0 = (x + margin) * scale;
    const y0 = (y + margin) * scale;
    return (
      x0 + scale > center - carveHalf &&
      x0 < center + carveHalf &&
      y0 + scale > center - carveHalf &&
      y0 < center + carveHalf
    );
  };

  const parts: string[] = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" role="img"`];
  if (options.label !== undefined) {
    parts.push(` aria-label="${esc(options.label)}"`);
  }
  // crispEdges is a square-module affordance; it jaggeds curved dots.
  parts.push(dotStyle === 'square' ? ' shape-rendering="crispEdges">' : ' shape-rendering="auto">');
  if (options.label !== undefined) parts.push(`<title>${esc(options.label)}</title>`);
  if (gradient) {
    const id = gradient.id ?? `sigil-qr-gradient-${gradientSequence}`;
    parts.push(
      `<defs><linearGradient id="${esc(id)}" x1="0" y1="0" x2="0" y2="1" gradientTransform="rotate(${Number.isFinite(gradient.angle) ? gradient.angle : 0} .5 .5)">` +
        `<stop offset="0" stop-color="${esc(gradient.from)}"/><stop offset="1" stop-color="${esc(gradient.to)}"/>` +
        `</linearGradient></defs>`,
    );
  }
  if (light !== 'transparent') parts.push(`<rect width="${dim}" height="${dim}" fill="${esc(light)}"/>`);

  if (dotStyle === 'square') {
    const path: string[] = [];
    for (let y = 0; y < matrix.size; y++) {
      let x = 0;
      while (x < matrix.size) {
        if (!matrix.get(x, y) || underImage(x, y)) {
          x++;
          continue;
        }
        if (optimize) {
          let run = 1;
          while (x + run < matrix.size && matrix.get(x + run, y) && !underImage(x + run, y)) run++;
          path.push(`M${(x + margin) * scale} ${(y + margin) * scale}h${run * scale}v${scale}h${-run * scale}z`);
          x += run;
        } else {
          path.push(`M${(x + margin) * scale} ${(y + margin) * scale}h${scale}v${scale}h${-scale}z`);
          x++;
        }
      }
    }
    parts.push(`<path d="${path.join('')}" fill="${paint}"/>`);
  } else {
    // One shape per module; finder zones keep square modules for scanability.
    const shapes: string[] = [];
    const radius = dotStyle === 'rounded' ? scale * 0.34 : 0;
    for (let y = 0; y < matrix.size; y++)
      for (let x = 0; x < matrix.size; x++) {
        if (!matrix.get(x, y) || underImage(x, y)) continue;
        const x0 = (x + margin) * scale;
        const y0 = (y + margin) * scale;
        const square = inFinderZone(x, y, matrix.size);
        if (dotStyle === 'rounded') {
          shapes.push(
            `<rect x="${x0}" y="${y0}" width="${scale}" height="${scale}"${square ? '' : ` rx="${radius}"`}/>`,
          );
        } else if (square) {
          shapes.push(`<rect x="${x0}" y="${y0}" width="${scale}" height="${scale}"/>`);
        } else {
          shapes.push(`<circle cx="${x0 + scale / 2}" cy="${y0 + scale / 2}" r="${scale / 2}"/>`);
        }
      }
    parts.push(`<g fill="${paint}">${shapes.join('')}</g>`);
  }

  if (image) {
    const patch = (image.spacing ?? 1) * scale;
    const patchRadius = image.radius ?? 0;
    if (image.background) {
      parts.push(
        `<rect x="${center - logoSide / 2 - patch}" y="${center - logoSide / 2 - patch}"` +
          ` width="${logoSide + 2 * patch}" height="${logoSide + 2 * patch}"` +
          `${patchRadius > 0 ? ` rx="${patchRadius}"` : ''} fill="${esc(image.background)}"/>`,
      );
    }
    parts.push(
      `<image href="${esc(image.href)}" x="${center - logoSide / 2}" y="${center - logoSide / 2}"` +
        ` width="${logoSide}" height="${logoSide}" preserveAspectRatio="xMidYMid meet"/>`,
    );
  }

  parts.push('</svg>');
  return parts.join('');
}
