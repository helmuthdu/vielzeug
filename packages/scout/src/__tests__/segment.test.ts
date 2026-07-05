import { segmentWords } from '../segment';

describe('segmentWords', () => {
  test('splits unsegmented CJK text into space-separated words', () => {
    expect(segmentWords('我喜欢学习中文')).toBe('我 喜欢 学习 中文');
  });

  test('splits Japanese text into space-separated words', () => {
    expect(segmentWords('日本語を勉強しています')).toBe('日本語 を 勉強 し てい ます');
  });

  test('leaves already space-delimited text effectively unchanged', () => {
    expect(segmentWords('Alice Johnson')).toBe('Alice Johnson');
  });

  test('drops punctuation-only segments', () => {
    expect(segmentWords('hello, world!')).toBe('hello world');
  });

  test('returns an empty string for empty input', () => {
    expect(segmentWords('')).toBe('');
  });
});
