import { type ComputedRef, computed } from 'vue';
import { sessionState } from '../../app/events';
import { useReadable } from '../../app/vue-bridge';
import type { GameMode } from '../../domain/types';

/**
 * Whether this tab joined the given subject's shared session as a guest: the gate
 * for host-only actions. The subject views share this so the grammar cannot drift
 * between the modes.
 */
export function useSessionGuest(kind: GameMode, id: () => string | undefined): ComputedRef<boolean> {
  const session = useReadable(sessionState);
  return computed(() => {
    const state = session.value;
    return state.mode === 'guest' && state.subject.kind === kind && state.subject.id === id();
  });
}
