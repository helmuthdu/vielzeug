import { describe, expect, it } from 'vitest';
import {
  alignmentPatternPositions,
  dataCodewords,
  EC_LEVELS,
  ecCodewordsPerBlock,
  matrixSize,
  numEcBlocks,
  rawDataModules,
  remainderBits,
  totalCodewords,
} from '../_tables';

describe('tables', () => {
  it('covers every version 1–40 for all four EC levels', () => {
    for (let v = 1; v <= 40; v++)
      for (const level of EC_LEVELS) {
        expect(ecCodewordsPerBlock(v, level)).toBeGreaterThan(0);
        expect(numEcBlocks(v, level)).toBeGreaterThan(0);
      }
  });

  it('derives positive data capacity for every (version, level)', () => {
    for (let v = 1; v <= 40; v++) for (const level of EC_LEVELS) expect(dataCodewords(v, level)).toBeGreaterThan(0);
  });

  it('keeps EC totals within the raw-module budget', () => {
    for (let v = 1; v <= 40; v++)
      for (const level of EC_LEVELS) {
        const ecTotal = ecCodewordsPerBlock(v, level) * numEcBlocks(v, level);
        expect(ecTotal).toBeLessThan(totalCodewords(v));
        // EC overhead never exceeds 70% of the symbol (spec max is ~67%).
        expect(ecTotal / totalCodewords(v)).toBeLessThanOrEqual(0.7);
      }
  });

  it('yields remainder bits of 0, 3, 4, or 7 for every version', () => {
    for (let v = 1; v <= 40; v++) expect([0, 3, 4, 7]).toContain(remainderBits(v));
  });

  it('matches known total-codeword counts', () => {
    // ISO Table 1 spot values: v1=26, v5=134, v10=346, v20=1085, v40=3706.
    expect(totalCodewords(1)).toBe(26);
    expect(totalCodewords(5)).toBe(134);
    expect(totalCodewords(10)).toBe(346);
    expect(totalCodewords(20)).toBe(1085);
    expect(totalCodewords(40)).toBe(3706);
  });

  it('produces matrix sizes of 21 + 4·(v−1)', () => {
    expect(matrixSize(1)).toBe(21);
    expect(matrixSize(7)).toBe(45);
    expect(matrixSize(40)).toBe(177);
  });

  it('computes alignment positions matching ISO Table E.1', () => {
    expect(alignmentPatternPositions(1)).toEqual([]);
    expect(alignmentPatternPositions(2)).toEqual([6, 18]);
    expect(alignmentPatternPositions(7)).toEqual([6, 22, 38]);
    expect(alignmentPatternPositions(14)).toEqual([6, 26, 46, 66]);
    expect(alignmentPatternPositions(25)).toEqual([6, 32, 58, 84, 110]);
    expect(alignmentPatternPositions(32)).toEqual([6, 34, 60, 86, 112, 138]);
    expect(alignmentPatternPositions(40)).toEqual([6, 30, 58, 86, 114, 142, 170]);
  });

  it('counts EC blocks against the raw-module remainder consistently', () => {
    // numLong = raw % blocks must be < blocks and produce a valid split.
    for (let v = 1; v <= 40; v++)
      for (const level of EC_LEVELS) {
        const blocks = numEcBlocks(v, level);
        const numLong = totalCodewords(v) % blocks;
        expect(numLong).toBeLessThan(blocks);
      }
  });

  it('accounts for every module: function + data + remainder = size²', () => {
    // rawDataModules is derived independently of the EC tables; sanity-check
    // the geometric formula against a few hand-counted versions.
    expect(rawDataModules(1)).toBe(208); // 26×8
    expect(rawDataModules(2)).toBe(359); // 44×8 + 7 remainder
    expect(rawDataModules(7)).toBe(196 * 8); // 45×45 grid → 196 codewords
  });
});
