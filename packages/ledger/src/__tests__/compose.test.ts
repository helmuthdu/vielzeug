import { describe, expect, it, vi } from 'vitest';

import { compose, createLedger } from '../index';

describe('compose()', () => {
  it('applies commands in order and reverts them in reverse order', async () => {
    const ledger = createLedger();
    const order: string[] = [];

    await ledger.do(
      compose([
        { apply: () => void order.push('apply:first'), revert: () => void order.push('revert:first') },
        { apply: () => void order.push('apply:second'), revert: () => void order.push('revert:second') },
      ]),
    );
    await ledger.undo();

    expect(order).toEqual(['apply:first', 'apply:second', 'revert:second', 'revert:first']);
    ledger.dispose();
  });

  it('creates one history entry', async () => {
    const ledger = createLedger();

    await ledger.do(
      compose(
        [
          { apply: vi.fn(), revert: vi.fn() },
          { apply: vi.fn(), revert: vi.fn() },
        ],
        'multi-edit',
      ),
    );

    expect(ledger.state.value.undo).toEqual([{ label: 'multi-edit', meta: undefined }]);
    ledger.dispose();
  });

  it('snapshots composition inputs', async () => {
    const ledger = createLedger();
    const original = vi.fn();
    const replacement = vi.fn();
    const commands = [{ apply: original, revert: vi.fn() }];
    const command = compose(commands);

    commands[0]!.apply = replacement;

    await ledger.do(command);
    await ledger.undo();
    await ledger.redo();

    expect(original).toHaveBeenCalledTimes(2);
    expect(replacement).not.toHaveBeenCalled();
    ledger.dispose();
  });

  it('preserves apply and compensation failures', async () => {
    const ledger = createLedger();
    const applyFailure = new Error('apply failed');
    const compensationFailure = new Error('compensation failed');

    await expect(
      ledger.do(
        compose([
          {
            apply: vi.fn(),
            revert: () => {
              throw compensationFailure;
            },
          },
          {
            apply: () => {
              throw applyFailure;
            },
            revert: vi.fn(),
          },
        ]),
      ),
    ).rejects.toSatisfy((error: unknown) => {
      if (!(error instanceof Error) || !(error.cause instanceof AggregateError)) return false;

      return error.cause.errors.includes(applyFailure) && error.cause.errors.includes(compensationFailure);
    });
    expect(ledger.state.value.undo).toHaveLength(0);
    ledger.dispose();
  });

  it('continues reversion after one child fails', async () => {
    const ledger = createLedger();
    const firstRevert = vi.fn();
    const failure = new Error('revert failed');

    await ledger.do(
      compose([
        { apply: vi.fn(), revert: firstRevert },
        {
          apply: vi.fn(),
          revert: () => {
            throw failure;
          },
        },
      ]),
    );

    await expect(ledger.undo()).rejects.toMatchObject({ cause: expect.any(AggregateError) });
    expect(firstRevert).toHaveBeenCalledOnce();
    expect(ledger.state.value.undo).toHaveLength(1);
    ledger.dispose();
  });

  it('forwards one command context to every child', async () => {
    const ledger = createLedger();
    const contexts: AbortSignal[] = [];

    await ledger.do(
      compose([
        { apply: ({ signal }) => void contexts.push(signal), revert: ({ signal }) => void contexts.push(signal) },
        { apply: ({ signal }) => void contexts.push(signal), revert: ({ signal }) => void contexts.push(signal) },
      ]),
    );
    await ledger.undo();

    expect(contexts).toHaveLength(4);
    expect(new Set(contexts)).toHaveLength(1);
    ledger.dispose();
  });
});
