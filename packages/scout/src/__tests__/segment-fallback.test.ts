import { segmentWords } from '../segment';

// Isolated in its own file: `segmentWords()` lazily caches its `Intl.Segmenter` instance at
// module scope on first call, so this must be the first call in a fresh module instance —
// sharing a file with `segment.test.ts` would let an earlier test populate the cache with a
// real segmenter before this test deletes `Intl.Segmenter`, masking the fallback path.
test('falls back to returning text unchanged when Intl.Segmenter is unavailable', () => {
  const original = Intl.Segmenter;

  // @ts-expect-error — simulating an older runtime without Intl.Segmenter
  delete Intl.Segmenter;

  expect(segmentWords('我喜欢学习中文')).toBe('我喜欢学习中文');

  Intl.Segmenter = original;
});
