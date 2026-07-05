/**
 * Check whether an exact `name@version` is already published to npm.
 *
 * Queries the registry directly over HTTPS instead of shelling out to `npm view` — faster
 * (no subprocess/npm-CLI startup cost) and trivially testable by injecting a fetch stub
 * instead of mocking a subprocess.
 */

const REGISTRY = 'https://registry.npmjs.org';

export async function versionExists(name, version, { fetchImpl = fetch } = {}) {
  const url = `${REGISTRY}/${encodeURIComponent(name)}/${encodeURIComponent(version)}`;
  const response = await fetchImpl(url, { method: 'GET' });

  if (response.status === 200) return true;
  if (response.status === 404) return false;
  throw new Error(`Unexpected registry response for ${name}@${version}: ${response.status}`);
}
