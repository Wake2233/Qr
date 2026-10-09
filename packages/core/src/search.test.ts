import { describe, expect, it } from 'vitest';

import { buildSearchQuery, MAX_SEARCH_WORDS } from './search';

// Same cases as supabase/tests/storefront_search.test.sql (private.search_query).
describe('buildSearchQuery', () => {
  it.each([
    ['  Cam  RY!! ', 'cam:* & ry:*'],
    ['x5 / M-Sport', 'x5:* & m:* & sport:*'],
    ['2021 BMW', '2021:* & bmw:*'],
    ['Citroën', 'citroën:*'],
  ])('%j → %j', (input, expected) => {
    expect(buildSearchQuery(input)).toBe(expected);
  });

  it.each([['!!! ---'], [''], [null], [undefined]])('%j has no words → null', (input) => {
    expect(buildSearchQuery(input)).toBeNull();
  });

  it('uses at most 8 words', () => {
    expect(buildSearchQuery('a b c d e f g h i j')?.split(' & ')).toHaveLength(MAX_SEARCH_WORDS);
  });

  it('never emits tsquery operators from user input', () => {
    expect(buildSearchQuery("bmw & !audi | (x5) <-> 'm'")).toBe('bmw:* & audi:* & x5:* & m:*');
  });
});
