/**
 * /lingua/testing
 *
 * Previously exported `clearCaches()` for test isolation. As of the current version,
 * locale and plural-rules caches are per-instance — no module-level caches exist to clear.
 * This entry point is kept for backwards compatibility but no longer exports anything.
 */
