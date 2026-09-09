export type GestureHandle = {
  readonly active: boolean;
  [Symbol.dispose](): void;
  cancel(): boolean;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
};

export type GestureEndReason = 'cancel' | 'release';
