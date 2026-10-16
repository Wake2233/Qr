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

/** Nicknames and common misspellings per make slug (mirrors `private.make_aliases`). */
export const MAKE_ALIASES: Readonly<Record<string, readonly string[]>> = {
  chevrolet: ['chevy'],
  volkswagen: ['vw'],
  'mercedes-benz': ['benz', 'merc', 'mb'],
  bmw: ['bimmer', 'beemer'],
  'land-rover': ['landrover'],
  cadillac: ['caddy'],
  hyundai: ['hundai'],
  porsche: ['porshe'],
  infiniti: ['infinity'],
};

export interface CatalogMake {
  slug: string;
  name: string;
}

export interface CatalogModel {
  slug: string;
  name: string;
  /** make slug */
  make: string;
}

export interface Catalog {
  makes: readonly CatalogMake[];
  models: readonly CatalogModel[];
}

export interface CatalogSuggestion {
  kind: 'make' | 'model';
  make: string;
  model?: string;
  /** "Toyota" or "Toyota Camry" */
  label: string;
}

const searchWords = (text: string) =>
  text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

/** Words a name can be found by: each word plus the name without separators ("f150"). */
function tokensOf(name: string): string[] {
  const words = searchWords(name);
  return words.length > 1 ? [...words, words.join('')] : words;
}

const matchesAll = (query: string[], tokens: string[]) =>
  query.every((word) => tokens.some((token) => token.startsWith(word)));

/**
 * Make/model suggestions for the search box, from the catalog (not from stock), so buyers
 * can pick "Chevrolet Silverado 1500" while typing "chevy sil". Makes rank before models.
 */
export function suggestCatalog(
  text: string | null | undefined,
  catalog: Catalog,
  limit = 8,
): CatalogSuggestion[] {
  const query = searchWords(text ?? '').slice(0, MAX_SEARCH_WORDS);
  if (query.length === 0) return [];

  const makeTokens = new Map(
    catalog.makes.map((make) => [
      make.slug,
      [...tokensOf(make.name), ...(MAKE_ALIASES[make.slug] ?? [])],
    ]),
  );
  const makeNames = new Map(catalog.makes.map((make) => [make.slug, make.name]));

  const makes: CatalogSuggestion[] = catalog.makes
    .filter((make) => matchesAll(query, makeTokens.get(make.slug) ?? []))
    .map((make) => ({ kind: 'make', make: make.slug, label: make.name }));

  const models: CatalogSuggestion[] = catalog.models.flatMap((model) => {
    const makeName = makeNames.get(model.make);
    if (!makeName) return [];
    const modelTokens = tokensOf(model.name);
    // At least one word has to hit the model itself; "toyota" alone lists the make, not 25 models.
    if (!query.some((word) => modelTokens.some((token) => token.startsWith(word)))) return [];
    if (!matchesAll(query, [...modelTokens, ...(makeTokens.get(model.make) ?? [])])) return [];
    return [
      { kind: 'model', make: model.make, model: model.slug, label: `${makeName} ${model.name}` },
    ];
  });

  const byLabel = (a: CatalogSuggestion, b: CatalogSuggestion) =>
    a.label.length - b.label.length || a.label.localeCompare(b.label);
  return [...makes.sort(byLabel), ...models.sort(byLabel)].slice(0, limit);
}
