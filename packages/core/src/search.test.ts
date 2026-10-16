import { describe, expect, it } from 'vitest';

import { buildSearchQuery, MAX_SEARCH_WORDS, suggestCatalog } from './search';

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

describe('suggestCatalog', () => {
  const catalog = {
    makes: [
      { slug: 'chevrolet', name: 'Chevrolet' },
      { slug: 'ford', name: 'Ford' },
      { slug: 'mercedes-benz', name: 'Mercedes-Benz' },
      { slug: 'toyota', name: 'Toyota' },
    ],
    models: [
      { slug: 'silverado-1500', name: 'Silverado 1500', make: 'chevrolet' },
      { slug: 'f-150', name: 'F-150', make: 'ford' },
      { slug: 'camry', name: 'Camry', make: 'toyota' },
      { slug: 'c-class', name: 'C-Class', make: 'mercedes-benz' },
      { slug: 'corolla', name: 'Corolla', make: 'toyota' },
    ],
  };
  const labels = (text: string) => suggestCatalog(text, catalog).map((s) => s.label);

  it('finds makes by name and nickname', () => {
    expect(labels('chevy')).toEqual(['Chevrolet']);
    expect(labels('benz')).toEqual(['Mercedes-Benz']);
  });

  it('a make alone suggests the make, not every model', () => {
    expect(labels('toyota')).toEqual(['Toyota']);
  });

  it('combines make and model words', () => {
    expect(suggestCatalog('chevy sil', catalog)).toEqual([
      {
        kind: 'model',
        make: 'chevrolet',
        model: 'silverado-1500',
        label: 'Chevrolet Silverado 1500',
      },
    ]);
  });

  it('matches models without separators and by prefix', () => {
    expect(labels('f150')).toEqual(['Ford F-150']);
    expect(labels('c')).toEqual([
      'Chevrolet',
      'Toyota Camry',
      'Toyota Corolla',
      'Mercedes-Benz C-Class',
    ]);
  });

  it('returns nothing for empty or unknown text', () => {
    expect(labels('  ')).toEqual([]);
    expect(labels('zzz')).toEqual([]);
  });
});
