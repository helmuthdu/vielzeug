import { type RandomSource, randomFloat } from './source';

export function randomIndex(exclusiveMax: number, source?: RandomSource): number {
  return Math.floor(randomFloat(source) * exclusiveMax);
}
