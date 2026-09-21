import type { QrMatrix, QrSvgOptions } from './types';

/**
 * SVG rendering — pure string output, safe in any environment.
 * The optimized path merges each row's dark-module runs into `M x y hW v1 h-W z`
 * spans; `optimizePath: false` emits one subpath per module.
 */

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function toSvg(matrix: QrMatrix, options: QrSvgOptions = {}): string {
  const margin = options.margin ?? 4;
  const scale = options.scale ?? 1;
  const dark = options.dark ?? 'currentColor';
  const light = options.light ?? 'transparent';
  const optimize = options.optimizePath ?? true;
  const dim = (matrix.size + margin * 2) * scale;

  const parts: string[] = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" role="img"`];
  if (options.label !== undefined) {
    parts.push(` aria-label="${esc(options.label)}"`);
  }
  parts.push(` shape-rendering="crispEdges">`);
  if (options.label !== undefined) parts.push(`<title>${esc(options.label)}</title>`);
  if (light !== 'transparent') parts.push(`<rect width="${dim}" height="${dim}" fill="${light}"/>`);

  const path: string[] = [];
  for (let y = 0; y < matrix.size; y++) {
    let x = 0;
    while (x < matrix.size) {
      if (!matrix.get(x, y)) {
        x++;
        continue;
      }
      if (optimize) {
        let run = 1;
        while (x + run < matrix.size && matrix.get(x + run, y)) run++;
        path.push(`M${(x + margin) * scale} ${(y + margin) * scale}h${run * scale}v${scale}h${-run * scale}z`);
        x += run;
      } else {
        path.push(`M${(x + margin) * scale} ${(y + margin) * scale}h${scale}v${scale}h${-scale}z`);
        x++;
      }
    }
  }
  parts.push(`<path d="${path.join('')}" fill="${dark}"/>`);
  parts.push('</svg>');
  return parts.join('');
}
