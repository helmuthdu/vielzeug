import { _resetContextForTesting, configureStateit, effect, signal } from '../';

// ─── configureStateit ─────────────────────────────────────────────────────────

describe('configureStateit', () => {
  afterEach(() => configureStateit({ maxEffectIterations: 100 }));

  it('raising maxEffectIterations allows more reactive loops before throwing', () => {
    configureStateit({ maxEffectIterations: 10 });

    const n = signal(0);

    // loop runs 6 times (n: 0→1→2→3→4→5, then 5<5=false, no dirty) — under 10
    expect(() => {
      effect(() => {
        if (n.value < 5) n.value++;
      });
    }).not.toThrow();
  });

  it('lowering maxEffectIterations throws sooner', () => {
    configureStateit({ maxEffectIterations: 2 });

    const n = signal(0);

    expect(() => {
      effect(() => {
        n.value++;
      });
    }).toThrow(/infinite reactive loop/);
  });

  it('per-effect maxIterations is independent of the global setting', () => {
    configureStateit({ maxEffectIterations: 3 });

    const n = signal(0);

    // loop needs 6 iterations (0→1→2→3→4→5, then 5<5=false) — over global=3 but under override=10
    expect(() => {
      effect(
        () => {
          if (n.value < 5) n.value++;
        },
        { maxIterations: 10 },
      );
    }).not.toThrow();
  });
});

// ─── _resetContextForTesting ──────────────────────────────────────────────────

describe('_resetContextForTesting', () => {
  it('clears batchDepth so pending effects are not stuck', () => {
    const n = signal(0);
    const seen: number[] = [];

    effect(() => {
      seen.push(n.value);
    });
    _resetContextForTesting();
    // After reset, a normal signal write should immediately notify
    n.value = 99;
    expect(seen).toContain(99);
  });
});
