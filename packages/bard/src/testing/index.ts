/**
 * Deterministic Web Audio fakes for testing code that consumes `@vielzeug/bard`
 * (and bard's own suite). No audio is produced; the fake context exposes a
 * manual clock (`advance`) and records every graph mutation and param
 * automation so tests can assert on behavior instead of sound.
 */

/** Tiny listener registry so fakes avoid DOM event plumbing. */
export class FakeEventTarget {
  private readonly listeners = new Map<string, Set<() => void>>();

  addEventListener(type: string, listener: () => void): void {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
  }
  removeEventListener(type: string, listener: () => void): void {
    this.listeners.get(type)?.delete(listener);
  }
  dispatchEvent(type: string): void {
    for (const listener of [...(this.listeners.get(type) ?? [])]) listener();
  }
}

export interface AutomationCall {
  readonly method:
    | 'setValueAtTime'
    | 'linearRampToValueAtTime'
    | 'exponentialRampToValueAtTime'
    | 'cancelScheduledValues';
  readonly time: number;
  readonly value: number;
}

export class FakeAudioParam {
  value: number;

  constructor(initial = 0) {
    this.value = initial;
  }
  readonly calls: AutomationCall[] = [];

  setValueAtTime(value: number, time: number): this {
    this.calls.push({ method: 'setValueAtTime', time, value });
    this.value = value;
    return this;
  }
  linearRampToValueAtTime(value: number, time: number): this {
    this.calls.push({ method: 'linearRampToValueAtTime', time, value });
    this.value = value;
    return this;
  }
  exponentialRampToValueAtTime(value: number, time: number): this {
    if (value === 0) throw new RangeError('exponentialRampToValueAtTime target must not be 0.');
    this.calls.push({ method: 'exponentialRampToValueAtTime', time, value });
    this.value = value;
    return this;
  }
  cancelScheduledValues(time: number): this {
    this.calls.push({ method: 'cancelScheduledValues', time, value: this.value });
    return this;
  }
  /** True when any recorded call used `method`. */
  used(method: AutomationCall['method']): boolean {
    return this.calls.some((call) => call.method === method);
  }
}

export class FakeAudioNode extends FakeEventTarget {
  readonly connections: FakeAudioNode[] = [];
  disconnected = 0;
  readonly context: FakeAudioContext;

  constructor(context?: FakeAudioContext) {
    super();
    // A FakeAudioContext *is* the context for its own nodes.
    this.context = context ?? (this as unknown as FakeAudioContext);
  }

  connect(destination: FakeAudioNode): FakeAudioNode {
    this.connections.push(destination);
    return destination;
  }

  disconnect(): void {
    this.disconnected += 1;
    this.connections.length = 0;
  }
}

export class FakeGainNode extends FakeAudioNode {
  /** Real GainNodes default to unity gain. */
  readonly gain = new FakeAudioParam(1);
}

export class FakeStereoPannerNode extends FakeAudioNode {
  readonly pan = new FakeAudioParam();
}

export class FakeBiquadFilterNode extends FakeAudioNode {
  readonly frequency = new FakeAudioParam();
  readonly Q = new FakeAudioParam();
  type: BiquadFilterType = 'lowpass';
}

export interface StartCall {
  readonly duration?: number;
  readonly offset?: number;
  readonly when: number;
}

export class FakeScheduledSourceNode extends FakeAudioNode {
  readonly started: StartCall[] = [];
  readonly stops: number[] = [];
  onended: (() => void) | null = null;
  startedAt: number | null = null;
  stopAt: number | null = null;

  start(when = 0, offset?: number, duration?: number): void {
    if (this.startedAt !== null) throw new Error('start() called twice on the same source.');
    this.startedAt = when;
    this.started.push({ duration, offset, when });
  }

  stop(when = 0): void {
    if (this.startedAt === null) throw new Error('stop() called before start().');
    this.stops.push(when);
    this.stopAt = this.stopAt === null ? when : Math.min(this.stopAt, when);
  }

  /** Fires the `ended` path (listener and `onended`) once. */
  emitEnded(): void {
    this.onended?.();
    this.dispatchEvent('ended');
  }
}

export class FakeAudioBufferSourceNode extends FakeScheduledSourceNode {
  buffer: FakeAudioBuffer | null = null;
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  readonly playbackRate = new FakeAudioParam();
  readonly detune = new FakeAudioParam();
}

export class FakeOscillatorNode extends FakeScheduledSourceNode {
  type: OscillatorType = 'sine';
  readonly frequency = new FakeAudioParam();
  readonly detune = new FakeAudioParam();
}

export class FakeMediaElementSourceNode extends FakeAudioNode {
  readonly element: FakeMediaElement;

  constructor(context: FakeAudioContext, element: FakeMediaElement) {
    super(context);
    this.element = element;
  }
}

export class FakeAudioBuffer {
  readonly duration: number;
  readonly length: number;
  readonly sampleRate: number;
  readonly numberOfChannels: number;

  constructor(length: number, sampleRate: number, numberOfChannels: number) {
    this.length = length;
    this.sampleRate = sampleRate;
    this.numberOfChannels = numberOfChannels;
    this.duration = length / sampleRate;
  }

  getChannelData(): Float32Array {
    return new Float32Array(this.length);
  }
}

export class FakeAudioContext extends FakeAudioNode {
  readonly destination = new FakeAudioNode(this);
  readonly sampleRate = 44100;
  currentTime = 0;
  state: AudioContextState = 'suspended';
  closed = false;
  readonly nodes: FakeAudioNode[] = [];
  /** Every source created here, for clock-driven `ended` dispatch. */
  readonly sources: FakeScheduledSourceNode[] = [];
  decodeCalls = 0;

  createGain(): FakeGainNode {
    return this.track(new FakeGainNode(this));
  }
  createStereoPanner(): FakeStereoPannerNode {
    return this.track(new FakeStereoPannerNode(this));
  }
  createBiquadFilter(): FakeBiquadFilterNode {
    return this.track(new FakeBiquadFilterNode(this));
  }
  createBufferSource(): FakeAudioBufferSourceNode {
    return this.trackSource(new FakeAudioBufferSourceNode(this));
  }
  createOscillator(): FakeOscillatorNode {
    return this.trackSource(new FakeOscillatorNode(this));
  }
  createBuffer(channels: number, length: number, sampleRate: number): FakeAudioBuffer {
    return new FakeAudioBuffer(length, sampleRate, channels);
  }
  createMediaElementSource(element: FakeMediaElement): FakeMediaElementSourceNode {
    return this.track(new FakeMediaElementSourceNode(this, element));
  }

  async decodeAudioData(_data: ArrayBuffer): Promise<FakeAudioBuffer> {
    this.decodeCalls += 1;
    return new FakeAudioBuffer(44100, this.sampleRate, 1);
  }

  async resume(): Promise<void> {
    this.setState('running');
  }
  async suspend(): Promise<void> {
    this.setState('suspended');
  }
  async close(): Promise<void> {
    this.closed = true;
    this.setState('closed');
  }

  setState(state: AudioContextState): void {
    this.state = state;
    this.dispatchEvent('statechange');
  }

  /** Moves the clock and fires `ended` for sources whose stop time passed. */
  advance(seconds: number): void {
    this.currentTime += seconds;
    for (const source of [...this.sources]) {
      if (source.stopAt !== null && source.stopAt <= this.currentTime) {
        source.stopAt = null;
        source.emitEnded();
      }
    }
  }

  private track<T extends FakeAudioNode>(node: T): T {
    this.nodes.push(node);
    return node;
  }
  private trackSource<T extends FakeScheduledSourceNode>(node: T): T {
    this.nodes.push(node);
    this.sources.push(node);
    return node;
  }
}

/** Minimal `HTMLAudioElement` stand-in: playback flags, clock, and events. */
export class FakeMediaElement extends FakeAudioNode {
  src = '';
  crossOrigin = '';
  preload = '';
  loop = false;
  playing = false;
  currentTime = 0;
  duration = 10;

  constructor(context?: FakeAudioContext) {
    super(context as FakeAudioContext);
  }

  play(): Promise<void> {
    this.playing = true;
    return Promise.resolve();
  }
  pause(): void {
    this.playing = false;
  }
  removeAttribute(name: string): void {
    if (name === 'src') this.src = '';
  }

  /** Fires `canplay` so pending stream-ready promises settle. */
  emitCanPlay(): void {
    this.dispatchEvent('canplay');
  }
  emitError(): void {
    this.dispatchEvent('error');
  }
  emitEnded(): void {
    this.playing = false;
    this.dispatchEvent('ended');
  }
  tick(seconds: number): void {
    this.currentTime += seconds;
    this.dispatchEvent('timeupdate');
  }
}

/** Records Media Session claims so tests can assert single ownership. */
export class FakeMediaSession {
  metadata: unknown = null;
  playbackState: MediaSessionPlaybackState = 'none';
  readonly handlers = new Map<string, (() => void) | null>();

  setActionHandler(action: string, handler: (() => void) | null): void {
    this.handlers.set(action, handler);
  }
}

/** Lets queued microtasks and zero-delay timers settle. */
export function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
