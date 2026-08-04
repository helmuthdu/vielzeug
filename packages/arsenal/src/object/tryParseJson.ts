export type JsonParseResult = { ok: true; value: unknown } | { error: SyntaxError; ok: false };

export function tryParseJson(text: string): JsonParseResult {
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch (error) {
    return { error: error as SyntaxError, ok: false };
  }
}
