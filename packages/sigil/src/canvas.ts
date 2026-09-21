import type { QrCanvasOptions, QrMatrix } from './types';

/**
 * Canvas rendering — the only DOM-touching output path.
 * Resizes the canvas to `(size + 2*margin) * scale` CSS pixels, backing-store
 * scaled by `devicePixelRatio`, and paints one `fillRect` per dark module.
 * Returns the CSS pixel size so callers can size wrappers.
 */
export function drawToCanvas(matrix: QrMatrix, canvas: HTMLCanvasElement, options: QrCanvasOptions = {}): number {
  const margin = options.margin ?? 4;
  const scale = options.scale ?? 1;
  const dark = options.dark ?? '#000000';
  const light = options.light ?? '#ffffff';
  const cssSize = (matrix.size + margin * 2) * scale;
  const dpr = globalThis.devicePixelRatio || 1;

  canvas.width = cssSize * dpr;
  canvas.height = cssSize * dpr;
  canvas.style.width = `${cssSize}px`;
  canvas.style.height = `${cssSize}px`;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.scale(dpr, dpr);
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, cssSize, cssSize);
  ctx.fillStyle = dark;
  for (let y = 0; y < matrix.size; y++)
    for (let x = 0; x < matrix.size; x++)
      if (matrix.get(x, y)) ctx.fillRect((x + margin) * scale, (y + margin) * scale, scale, scale);
  return cssSize;
}
