import { describe, expect, it } from 'vitest';
import { createMeshHost } from '../host';
import type { MeshEvent } from '../types';
import { createFakeRtc } from './_fixtures';
import type { TestProtocol } from './_pair';
import { pairNodes } from './_pair';

describe('tap', () => {
  it('emits runtime events to subscribed handlers', async () => {
    const fx = createFakeRtc();
    const host = createMeshHost<TestProtocol>({ rtc: fx.rtc });
    const events: MeshEvent[] = [];
    host.tap((e) => events.push(e));

    await host.createInvitation();
    expect(events.some((e) => e.type === 'invitation-created')).toBe(true);
  });

  it('swallows handler errors and keeps emitting', async () => {
    const fx = createFakeRtc();
    const host = createMeshHost<TestProtocol>({ rtc: fx.rtc });
    const events: MeshEvent[] = [];
    host.tap(() => {
      throw new Error('tapper blew up');
    });
    host.tap((e) => events.push(e));

    await expect(host.createInvitation()).resolves.toBeDefined();
    expect(events.some((e) => e.type === 'invitation-created')).toBe(true);
  });

  it('unsubscribes via the returned function', async () => {
    const fx = createFakeRtc();
    const host = createMeshHost<TestProtocol>({ rtc: fx.rtc });
    const events: MeshEvent[] = [];
    const off = host.tap((e) => events.push(e));

    off();
    await host.createInvitation();
    expect(events).toHaveLength(0);
  });

  it('detaches when the signal option aborts', async () => {
    const fx = createFakeRtc();
    const host = createMeshHost<TestProtocol>({ rtc: fx.rtc });
    const events: MeshEvent[] = [];
    const controller = new AbortController();
    host.tap((e) => events.push(e), { signal: controller.signal });

    controller.abort();
    await host.createInvitation();
    expect(events).toHaveLength(0);
  });

  it('returns a no-op unsubscribe after dispose', async () => {
    const { host } = await pairNodes();
    host.dispose();
    const off = host.tap(() => {});
    expect(() => off()).not.toThrow();
  });

  it('does not deliver events emitted before subscription', async () => {
    const { host } = await pairNodes();
    const events: MeshEvent[] = [];
    host.tap((e) => events.push(e));

    expect(events.some((e) => e.type === 'invitation-created')).toBe(false);
    await host.createInvitation();
    expect(events.some((e) => e.type === 'invitation-created')).toBe(true);
  });
});
