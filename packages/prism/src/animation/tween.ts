export function tweenNumber(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

export function tweenColor(from: string, to: string, t: number): string {
  const f = parseColor(from);
  const toC = parseColor(to);

  if (!f || !toC) return t < 0.5 ? from : to;

  const r = Math.round(tweenNumber(f.r, toC.r, t));
  const g = Math.round(tweenNumber(f.g, toC.g, t));
  const b = Math.round(tweenNumber(f.b, toC.b, t));

  return `rgb(${r},${g},${b})`;
}

interface RGB {
  b: number;
  g: number;
  r: number;
}

function parseColor(color: string): RGB | null {
  if (color.startsWith('#')) {
    const hex = color.slice(1);

    if (hex.length === 3) {
      return {
        b: parseInt(hex[2] + hex[2], 16),
        g: parseInt(hex[1] + hex[1], 16),
        r: parseInt(hex[0] + hex[0], 16),
      };
    }

    if (hex.length === 6) {
      return {
        b: parseInt(hex.slice(4, 6), 16),
        g: parseInt(hex.slice(2, 4), 16),
        r: parseInt(hex.slice(0, 2), 16),
      };
    }
  }

  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);

  if (rgbMatch) {
    return { b: +rgbMatch[3], g: +rgbMatch[2], r: +rgbMatch[1] };
  }

  return null;
}
