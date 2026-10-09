import { act } from '@testing-library/react';

import { useLocalFavoritesStore } from './favorites';

describe('useLocalFavoritesStore', () => {
  beforeEach(() => {
    localStorage.clear();
    act(() => useLocalFavoritesStore.getState().clear());
  });

  it('toggles vehicles, newest first', () => {
    const { toggle } = useLocalFavoritesStore.getState();
    toggle('a');
    toggle('b');
    expect(useLocalFavoritesStore.getState().ids).toEqual(['b', 'a']);
    toggle('a');
    expect(useLocalFavoritesStore.getState().ids).toEqual(['b']);
  });

  it('persists to localStorage for signed-out visitors', async () => {
    useLocalFavoritesStore.getState().toggle('x');
    expect(JSON.parse(localStorage.getItem('cp-favorites') ?? '{}').state).toEqual({ ids: ['x'] });
    localStorage.setItem('cp-favorites', JSON.stringify({ state: { ids: ['y'] }, version: 1 }));
    await useLocalFavoritesStore.persist.rehydrate();
    expect(useLocalFavoritesStore.getState().ids).toEqual(['y']);
  });
});
