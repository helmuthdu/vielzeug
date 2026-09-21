import type {
  MeshRtcEvent,
  MeshRtcFactory,
  RTCDataChannelLike,
  RTCPeerConnectionLike,
  RTCSessionDescriptionLike,
} from '../types';

type Listener = (event: MeshRtcEvent) => void;

class ListenerBag {
  private readonly listeners = new Map<string, Set<Listener>>();

  add(type: string, listener: Listener): void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(listener);
  }

  remove(type: string, listener: Listener): void {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string, event: MeshRtcEvent = {}): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }

  // `never` accepts every listener shape declared by the `*Like` overloads.
  addEventListener(type: string, listener: (event: never) => void): void {
    this.add(type, listener as Listener);
  }

  removeEventListener(type: string, listener: (event: never) => void): void {
    this.remove(type, listener as Listener);
  }
}

export interface FakeRtc {
  /** Close both ends of the link created at `index` (0-based, pairing order). */
  closeChannel(index: number): void;
  /** Silently drop the next `n` channel sends. */
  dropNext(n: number): void;
  /** Make the next pairing fail at the ICE stage. */
  failIce(): void;
  /** Make the next completed link connect at ICE level but never open the channel. */
  hangOpen(): void;
  /** Delivery delay for messages and channel-open in milliseconds. Default: 0 (microtask). */
  latencyMs: number;
  /** Number of links initiated (one per created offer). */
  readonly linkCount: number;
  readonly rtc: MeshRtcFactory;
  /** Make the next `setLocalDescription` never finish ICE gathering. */
  stallIce(): void;
  /** Drain all latency-queued deliveries immediately. */
  tick(): void;
}

/**
 * In-memory WebRTC stand-in. Peer connections created from the same fixture
 * wire together through fake SDP tokens — no network, no real ICE.
 */
export function createFakeRtc(options: { latencyMs?: number } = {}): FakeRtc {
  interface FakeLink {
    completed: boolean;
    guestChannel: FakeDataChannel | null;
    guestPc: FakePeerConnection | null;
    hostChannel: FakeDataChannel | null;
    hostPc: FakePeerConnection;
    readonly hostToken: string;
  }

  const pendingDeliveries: Array<() => void> = [];
  const links = new Map<string, FakeLink>();
  let pcCounter = 0;
  let dropCount = 0;
  let failNextIce = false;
  let stallNextGathering = false;
  let hangNextOpen = false;

  const fixture: FakeRtc = {
    closeChannel(index) {
      const link = [...links.values()][index];
      link?.hostChannel?.close();
      link?.guestChannel?.close();
      if (link) {
        link.hostPc.iceConnectionState = 'disconnected';
        link.hostPc.emit('iceconnectionstatechange');
        if (link.guestPc) {
          link.guestPc.iceConnectionState = 'disconnected';
          link.guestPc.emit('iceconnectionstatechange');
        }
      }
    },
    dropNext(n) {
      dropCount += n;
    },
    failIce() {
      failNextIce = true;
    },
    hangOpen() {
      hangNextOpen = true;
    },
    latencyMs: options.latencyMs ?? 0,
    get linkCount() {
      return links.size;
    },
    rtc: {
      createPeerConnection: () => new FakePeerConnection(`pc${++pcCounter}`),
    },
    stallIce() {
      stallNextGathering = true;
    },
    tick() {
      while (pendingDeliveries.length) pendingDeliveries.shift()?.();
    },
  };

  function schedule(delivery: () => void): void {
    if (fixture.latencyMs > 0) {
      pendingDeliveries.push(delivery);
      setTimeout(fixture.tick, fixture.latencyMs);
    } else {
      queueMicrotask(delivery);
    }
  }

  class FakeDataChannel extends ListenerBag implements RTCDataChannelLike {
    readyState = 'connecting';
    remote: FakeDataChannel | null = null;

    send(data: string): void {
      if (this.readyState !== 'open') throw new Error(`Channel is ${this.readyState}`);
      if (dropCount > 0) {
        dropCount--;
        return;
      }
      const remote = this.remote;
      if (!remote || remote.readyState !== 'open') return;
      schedule(() => remote.emit('message', { data }));
    }

    open(): void {
      if (this.readyState !== 'connecting') return;
      this.readyState = 'open';
      this.emit('open');
    }

    close(): void {
      if (this.readyState === 'closed') return;
      this.readyState = 'closed';
      this.emit('close');
      const remote = this.remote;
      if (remote && remote.readyState !== 'closed') {
        remote.readyState = 'closed';
        remote.emit('close');
      }
    }
  }

  class FakePeerConnection extends ListenerBag implements RTCPeerConnectionLike {
    connectionState = 'new';
    iceConnectionState = 'new';
    iceGatheringState = 'new';
    localDescription: RTCSessionDescriptionLike | null = null;
    pendingChannel: FakeDataChannel | null = null;
    closed = false;

    readonly token: string;

    constructor(token: string) {
      super();
      this.token = token;
    }

    createDataChannel(): RTCDataChannelLike {
      this.pendingChannel = new FakeDataChannel();
      return this.pendingChannel;
    }

    createOffer(): Promise<RTCSessionDescriptionLike> {
      links.set(this.token, {
        completed: false,
        guestChannel: null,
        guestPc: null,
        hostChannel: null,
        hostPc: this,
        hostToken: this.token,
      });
      return Promise.resolve({ sdp: `fake-offer:${this.token}`, type: 'offer' });
    }

    createAnswer(): Promise<RTCSessionDescriptionLike> {
      const link = this.linkFor();
      return Promise.resolve({
        sdp: `fake-answer:${link?.hostToken ?? 'none'}:guest:${this.token}`,
        type: 'answer',
      });
    }

    setLocalDescription(description: RTCSessionDescriptionLike): Promise<void> {
      this.localDescription = description;
      if (stallNextGathering) {
        stallNextGathering = false;
        this.iceGatheringState = 'gathering';
      } else {
        this.iceGatheringState = 'complete';
      }
      this.emit('icegatheringstatechange');
      return Promise.resolve();
    }

    setRemoteDescription(description: RTCSessionDescriptionLike): Promise<void> {
      if (description.type === 'offer') {
        const hostToken = /fake-offer:(\w+)/.exec(description.sdp ?? '')?.[1];
        const link = hostToken ? links.get(hostToken) : undefined;
        if (!link) return Promise.reject(new Error('Unknown offer'));
        link.guestPc = this;
        return Promise.resolve();
      }

      const match = /fake-answer:(\w+):guest:(\w+)/.exec(description.sdp ?? '');
      const link = match?.[1] ? links.get(match[1]) : undefined;
      if (!link || link.guestPc?.token !== match?.[2]) {
        return Promise.reject(new Error('Unknown answer'));
      }
      this.completeLink(link);
      return Promise.resolve();
    }

    close(): void {
      if (this.closed) return;
      this.closed = true;
      this.connectionState = 'closed';
      this.iceConnectionState = 'closed';
      this.emit('iceconnectionstatechange');
      this.emit('connectionstatechange');
      this.pendingChannel?.close();
      const link = this.linkFor();
      if (link) {
        link.guestChannel?.close();
        link.hostChannel?.close();
        const remote = link.guestPc === this ? link.hostPc : link.guestPc;
        if (remote && !remote.closed) {
          remote.iceConnectionState = 'disconnected';
          remote.emit('iceconnectionstatechange');
        }
      }
    }

    private linkFor(): FakeLink | undefined {
      return [...links.values()].find((link) => link.hostPc === this || link.guestPc === this);
    }

    private completeLink(link: FakeLink): void {
      if (link.completed) return;
      link.completed = true;

      if (failNextIce) {
        failNextIce = false;
        for (const pc of [link.hostPc, link.guestPc]) {
          if (!pc) continue;
          pc.iceConnectionState = 'failed';
          pc.emit('iceconnectionstatechange');
        }
        return;
      }

      const hostChannel = link.hostPc.pendingChannel ?? new FakeDataChannel();
      const guestChannel = new FakeDataChannel();
      hostChannel.remote = guestChannel;
      guestChannel.remote = hostChannel;
      link.hostChannel = hostChannel;
      link.guestChannel = guestChannel;
      link.guestPc?.emit('datachannel', { channel: guestChannel });

      schedule(() => {
        for (const pc of [link.hostPc, link.guestPc]) {
          if (!pc || pc.closed) continue;
          pc.iceConnectionState = 'connected';
          pc.connectionState = 'connected';
          pc.emit('iceconnectionstatechange');
          pc.emit('connectionstatechange');
        }
        if (hangNextOpen) {
          hangNextOpen = false;
          return;
        }
        hostChannel.open();
        guestChannel.open();
      });
    }
  }

  return fixture;
}
