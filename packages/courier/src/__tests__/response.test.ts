import { describe, expect, it } from 'vitest';

import { parseResponse } from '../response';

function makeResponse(body: BodyInit | null, contentType: string, status = 200): Response {
  return new Response(body, {
    headers: contentType ? { 'content-type': contentType } : {},
    status,
  });
}

describe('parseResponse', () => {
  it('returns undefined for 204 No Content', async () => {
    const res = new Response(null, { status: 204 });

    expect(await parseResponse(res)).toBeUndefined();
  });

  it('returns undefined for 205 Reset Content', async () => {
    const res = new Response(null, { status: 205 });

    expect(await parseResponse(res)).toBeUndefined();
  });

  it('returns undefined for 304 Not Modified', async () => {
    const res = new Response(null, { status: 304 });

    expect(await parseResponse(res)).toBeUndefined();
  });

  it("returns raw Response for responseType 'raw'", async () => {
    const res = makeResponse('hello', 'text/plain');
    const result = await parseResponse(res, 'raw');

    expect(result).toBe(res);
  });

  it("parses JSON for responseType 'json'", async () => {
    const res = makeResponse(JSON.stringify({ id: 1 }), 'text/plain');

    expect(await parseResponse(res, 'json')).toEqual({ id: 1 });
  });

  it("parses text for responseType 'text'", async () => {
    const res = makeResponse('hello world', 'application/json');

    expect(await parseResponse(res, 'text')).toBe('hello world');
  });

  it("parses blob for responseType 'blob'", async () => {
    const res = makeResponse('data', 'text/plain');
    const blob = await parseResponse(res, 'blob');

    expect(blob).toHaveProperty('size');
    expect(blob).toHaveProperty('type');
  });

  it("parses ArrayBuffer for responseType 'arrayBuffer'", async () => {
    const res = makeResponse('data', 'text/plain');

    expect(await parseResponse(res, 'arrayBuffer')).toBeInstanceOf(ArrayBuffer);
  });

  it("auto-detects JSON from 'application/json' content-type", async () => {
    const res = makeResponse(JSON.stringify({ id: 2 }), 'application/json');

    expect(await parseResponse(res)).toEqual({ id: 2 });
  });

  it("auto-detects JSON from '+json' suffix content-type", async () => {
    const res = makeResponse(JSON.stringify({ id: 3 }), 'application/ld+json');

    expect(await parseResponse(res)).toEqual({ id: 3 });
  });

  it("auto-detects text from 'text/' content-type", async () => {
    const res = makeResponse('plain text', 'text/plain');

    expect(await parseResponse(res)).toBe('plain text');
  });

  it("auto-detects blob from 'image/' content-type", async () => {
    const res = makeResponse('binary data', 'image/png');
    const blob = await parseResponse(res);

    expect(blob).toHaveProperty('size');
    expect(blob).toHaveProperty('type', 'image/png');
  });

  it("auto-detects blob from 'audio/' content-type", async () => {
    const res = makeResponse('binary data', 'audio/mp3');
    const blob = await parseResponse(res);

    expect(blob).toHaveProperty('size');
  });

  it("auto-detects blob from 'video/' content-type", async () => {
    const res = makeResponse('binary data', 'video/mp4');
    const blob = await parseResponse(res);

    expect(blob).toHaveProperty('size');
  });

  it('falls back to text for unknown content-type', async () => {
    const res = makeResponse('raw bytes', 'application/octet-stream');

    expect(await parseResponse(res)).toBe('raw bytes');
  });

  it('falls back to text when content-type is missing', async () => {
    const res = makeResponse('fallback', '');

    expect(await parseResponse(res)).toBe('fallback');
  });
});
