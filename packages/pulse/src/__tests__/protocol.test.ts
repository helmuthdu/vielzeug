import { PulseProtocolError } from '../errors';
import { decode, decodeValidated, encode } from '../protocol';

describe('encode', () => {
  it('serialises a message frame to JSON', () => {
    const out = encode({ event: 'chat', payload: { text: 'hi' }, type: 'message' });

    expect(JSON.parse(out)).toEqual({ event: 'chat', payload: { text: 'hi' }, type: 'message' });
  });

  it('includes channel when present', () => {
    const out = encode({ channel: 'room', event: 'msg', payload: null, type: 'message' });
    const parsed = JSON.parse(out) as { channel: string };

    expect(parsed.channel).toBe('room');
  });

  it('serialises a ping frame', () => {
    const out = encode({ ts: 1000, type: 'ping' });

    expect(JSON.parse(out)).toEqual({ ts: 1000, type: 'ping' });
  });
});

describe('decode', () => {
  it('parses a valid message frame', () => {
    const frame = decode(JSON.stringify({ event: 'greet', payload: 'hi', type: 'message' }));

    expect(frame.type).toBe('message');
  });

  it('parses a pong frame', () => {
    const frame = decode(JSON.stringify({ ts: 42, type: 'pong' }));

    expect(frame.type).toBe('pong');
  });

  it('throws PulseProtocolError for non-string input', () => {
    expect(() => decode(42)).toThrow(PulseProtocolError);
  });

  it('throws PulseProtocolError for invalid JSON', () => {
    expect(() => decode('not json')).toThrow(PulseProtocolError);
  });

  it('throws PulseProtocolError when type field is missing', () => {
    expect(() => decode(JSON.stringify({ event: 'x' }))).toThrow(PulseProtocolError);
  });

  it('throws PulseProtocolError when type field is not a string', () => {
    expect(() => decode(JSON.stringify({ type: 123 }))).toThrow(PulseProtocolError);
  });

  it('thrown PulseProtocolError is instanceof PulseProtocolError', () => {
    try {
      decode('bad');
    } catch (err) {
      expect(err).toBeInstanceOf(PulseProtocolError);
    }
  });
});

describe('decodeValidated', () => {
  it('accepts a valid known frame shape', () => {
    const decoded = decodeValidated(JSON.stringify({ event: 'greet', payload: 'hi', type: 'message' }));

    expect(decoded.kind).toBe('known');
    expect(decoded.kind === 'known' ? decoded.frame.type : '').toBe('message');
  });

  it('throws PulseProtocolError for malformed known frame shape', () => {
    expect(() => decodeValidated(JSON.stringify({ room: 'lobby', type: 'presence_state' }))).toThrow(
      PulseProtocolError,
    );
  });

  it('passes through unknown frame types for caller-level handling', () => {
    const decoded = decodeValidated(JSON.stringify({ foo: 1, type: 'future_frame' }));

    expect(decoded).toEqual({ kind: 'unknown', type: 'future_frame' });
  });
});
