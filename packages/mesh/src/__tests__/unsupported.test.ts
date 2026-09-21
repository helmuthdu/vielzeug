import { describe, expect, it } from 'vitest';
import { MeshUnsupportedError } from '../errors';
import { createMeshGuest } from '../guest';
import { createMeshHost } from '../host';
import type { TestProtocol } from './_pair';

describe('unsupported environments', () => {
  it('does not throw at import or factory-call time without WebRTC', () => {
    expect(() => createMeshHost<TestProtocol>()).not.toThrow();
    expect(() => createMeshGuest<TestProtocol>()).not.toThrow();
  });

  it('throws MeshUnsupportedError at first use when WebRTC and no factory exist', async () => {
    const host = createMeshHost<TestProtocol>();
    await expect(host.createInvitation()).rejects.toBeInstanceOf(MeshUnsupportedError);

    const guest = createMeshGuest<TestProtocol>();
    await expect(
      guest.acceptInvitation({ expiresAt: Date.now() + 1000, sdp: 'x', secret: 's', sessionId: 'y', v: 1 }),
    ).rejects.toBeInstanceOf(MeshUnsupportedError);
  });
});
