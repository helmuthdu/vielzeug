import { createMeshGuest } from '../guest';
import { createMeshHost } from '../host';
import type { MeshGuestOptions, MeshHostOptions, MeshProtocol } from '../types';
import { createFakeRtc, type FakeRtc } from './_fixtures';

export type TestProtocol = MeshProtocol & {
  toHost: { ping: { n: number }; note: string };
  toGuest: { pong: { n: number }; snapshot: { rev: number } };
};

export interface Paired {
  fx: FakeRtc;
  guest: ReturnType<typeof createMeshGuest<TestProtocol>>;
  host: ReturnType<typeof createMeshHost<TestProtocol>>;
  peerId: string;
}

export async function pairNodes(
  hostOptions: MeshHostOptions = {},
  guestOptions: MeshGuestOptions = {},
  fx: FakeRtc = createFakeRtc(),
): Promise<Paired> {
  const host = createMeshHost<TestProtocol>({ rtc: fx.rtc, ...hostOptions });
  const guest = createMeshGuest<TestProtocol>({ rtc: fx.rtc, ...guestOptions });
  const invitation = await host.createInvitation();
  const answer = await guest.acceptInvitation(invitation);
  const peer = await host.acceptAnswer(answer);
  return { fx, guest, host, peerId: peer.id };
}
