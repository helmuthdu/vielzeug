import { resolveWindow } from './_platform.ts';
import { createSentinel } from './core.ts';
import type { NetworkConnectionSnapshot, NetworkState, Sentinel, WindowSentinelOptions } from './types.ts';

interface NetworkInformationLike extends EventTarget {
  readonly downlink?: number;
  readonly effectiveType?: NetworkConnectionSnapshot['effectiveType'];
  readonly rtt?: number;
  readonly saveData?: boolean;
}

type NavigatorWithConnection = Navigator & {
  readonly connection?: NetworkInformationLike;
};

function normalizeConnection(connection?: NetworkInformationLike): NetworkConnectionSnapshot | null {
  if (!connection) return null;

  return {
    downlink: connection.downlink,
    effectiveType: connection.effectiveType,
    rtt: connection.rtt,
    saveData: connection.saveData,
  };
}

export function createNetwork(options?: WindowSentinelOptions): Sentinel<NetworkState> {
  const target = resolveWindow(options?.target);
  const navigator = target.navigator as NavigatorWithConnection;
  const read = (): NetworkState => ({
    connection: normalizeConnection(navigator.connection),
    online: navigator.onLine,
  });

  return createSentinel(
    {
      initialValue: read(),
      ...options,
    },
    (update) => {
      const onChange = () => update(read());
      const connection = navigator.connection;

      target.addEventListener('online', onChange);
      target.addEventListener('offline', onChange);
      connection?.addEventListener('change', onChange);

      return () => {
        target.removeEventListener('online', onChange);
        target.removeEventListener('offline', onChange);
        connection?.removeEventListener('change', onChange);
      };
    },
  );
}
