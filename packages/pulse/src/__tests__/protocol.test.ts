import { ProtocolError } from '../errors';
import { decode, encode } from '../protocol';

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

  it('throws ProtocolError for non-string input', () => {
    expect(() => decode(42)).toThrow(ProtocolError);
  });

  it('throws ProtocolError for invalid JSON', () => {
    expect(() => decode('not json')).toThrow(ProtocolError);
  });

  it('throws ProtocolError when type field is missing', () => {
    expect(() => decode(JSON.stringify({ event: 'x' }))).toThrow(ProtocolError);
  });

  it('throws ProtocolError when type field is not a string', () => {
    expect(() => decode(JSON.stringify({ type: 123 }))).toThrow(ProtocolError);
  });

  it('thrown ProtocolError is instanceof ProtocolError', () => {
    try {
      decode('bad');
    } catch (err) {
      expect(err).toBeInstanceOf(ProtocolError);
    }
  });
});
