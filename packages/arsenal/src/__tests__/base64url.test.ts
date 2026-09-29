import { describe, expect, it } from 'vitest';

import { base64UrlToBytes, base64UrlToText, bytesToBase64Url, textToBase64Url, utf8Bytes } from '../index';

describe('base64url', () => {
  it('round-trips text through the URL-safe alphabet', () => {
    const text = 'Primal: The Awakening — builds, quests & more!';

    expect(base64UrlToText(textToBase64Url(text))).toBe(text);
  });

  it('round-trips arbitrary bytes', () => {
    const bytes = Uint8Array.from([0, 1, 2, 250, 251, 252, 253, 254, 255]);

    expect(base64UrlToBytes(bytesToBase64Url(bytes))).toEqual(bytes);
  });

  it('never emits standard-alphabet specials or padding', () => {
    const code = textToBase64Url('{"d":"ffffffff","e":[null,"a/b+c="]}');

    expect(code).not.toMatch(/[+/=]/);
  });

  it('throws on characters outside the alphabet', () => {
    expect(() => base64UrlToBytes('a+b/c')).toThrow(/Invalid base64url character/);
  });

  it('measures UTF-8 byte length', () => {
    // 7 ASCII bytes plus three two-byte umlauts.
    expect(utf8Bytes('Hunter äöü')).toBe(13);
  });
});
