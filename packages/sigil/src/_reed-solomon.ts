import { gfExp, gfMultiply, gfPolyMultiply } from './_galois';

/**
 * Reed–Solomon error-correction codewords over GF(256).
 * The generator polynomial for `degree` EC codewords is ∏ᵢ₌₀..degree₋₁ (x − αⁱ);
 * results are cached per degree (max 30 per ISO Table 9).
 */

const generatorCache = new Map<number, readonly number[]>();

/** Generator polynomial coefficients (highest-degree first, leading 1 kept). */
function generatorPoly(degree: number): readonly number[] {
  const poly = generatorCache.get(degree);
  if (poly) return poly;
  let g = [1];
  for (let i = 0; i < degree; i++) g = gfPolyMultiply(g, [1, gfExp(i)]);
  generatorCache.set(degree, g);
  return g;
}

/** EC codewords for one data block: remainder of data·x^degree ÷ generator. */
export function ecCodewords(data: readonly number[], degree: number): number[] {
  const gen = generatorPoly(degree); // gen[0] === 1
  const rem = new Array<number>(degree).fill(0);
  for (const b of data) {
    const factor = b ^ rem[0];
    rem.copyWithin(0, 1);
    rem[degree - 1] = 0;
    if (factor !== 0) for (let j = 0; j < degree; j++) rem[j] ^= gfMultiply(gen[j + 1], factor);
  }
  return rem;
}
