import { describe, expect, it } from 'vitest';

import { addToCompare, pushRecentlyViewed, removeFromCompare } from './collections';

describe('addToCompare', () => {
  it('adds up to four vehicles', () => {
    expect(addToCompare(['a', 'b'], 'c')).toEqual({ ids: ['a', 'b', 'c'], result: 'added' });
    expect(addToCompare(['a', 'b', 'c', 'd'], 'e')).toEqual({
      ids: ['a', 'b', 'c', 'd'],
      result: 'full',
    });
  });

  it('does not duplicate', () => {
    expect(addToCompare(['a'], 'a')).toEqual({ ids: ['a'], result: 'exists' });
  });
});

describe('removeFromCompare', () => {
  it('removes by id', () => {
    expect(removeFromCompare(['a', 'b'], 'a')).toEqual(['b']);
  });
});

describe('pushRecentlyViewed', () => {
  it('moves to the front, de-duplicates and caps', () => {
    expect(pushRecentlyViewed(['a', 'b', 'c'], 'b')).toEqual(['b', 'a', 'c']);
    expect(pushRecentlyViewed(['a', 'b'], 'c', 2)).toEqual(['c', 'a']);
  });
});
