/**
 * Free-text inventory search. Mirrors `private.search_query` in Postgres so the grid
 * (PostgREST `fts(simple)` = `to_tsquery`) and the facet counts match exactly:
 * lower-case, split on anything that isn't a letter or digit, first 8 words, each a prefix.
 */
export const MAX_SEARCH_WORDS = 8;

/** "Cam ry!" → "cam:* & ry:*"; null when the text has no searchable words. */
export function buildSearchQuery(text: string | null | undefined): string | null {
  const words = (text ?? '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .slice(0, MAX_SEARCH_WORDS);
  return words.length > 0 ? words.map((word) => `${word}:*`).join(' & ') : null;
}
