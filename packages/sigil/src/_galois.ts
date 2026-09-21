/**
 * GF(2⁸) arithmetic over the QR primitive polynomial x⁸+x⁴+x³+x²+1 (0x11D).
 * Tables are built once at module load: `EXP[i] = αⁱ` for generator α = 2.
 */

const PRIMITIVE = 0x11d;

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);

{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= PRIMITIVE;
  }
  // Duplicate the cycle so `EXP[log(a) + log(b)]` never needs a mod.
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
}

/** `a * b` in GF(256); `0` when either operand is 0. */
export function gfMultiply(a: number, b: number): number {
  return a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]];
}

/** `αⁱ` — the i-th power of the generator. `i` may exceed 254 (wraps). */
export function gfExp(i: number): number {
  return EXP[i % 255];
}

/** Polynomial evaluation in GF(256): Σ coeffᵢ·xⁱ with coeff[0] highest-degree. */
export function gfPolyEval(coeffs: readonly number[], x: number): number {
  let y = 0;
  for (const c of coeffs) y = gfMultiply(y, x) ^ c;
  return y;
}

/** Multiply two polynomials (coefficients highest-degree first). */
export function gfPolyMultiply(p: readonly number[], q: readonly number[]): number[] {
  const out = new Array<number>(p.length + q.length - 1).fill(0);
  for (let i = 0; i < p.length; i++) for (let j = 0; j < q.length; j++) out[i + j] ^= gfMultiply(p[i], q[j]);
  return out;
}
