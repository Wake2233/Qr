import { act } from '@testing-library/react';

import { useCompareStore } from './compare';

describe('useCompareStore', () => {
  beforeEach(() => {
    localStorage.clear();
    act(() => useCompareStore.getState().clear());
  });

  it('adds up to four vehicles and reports why it refuses more', () => {
    const { add } = useCompareStore.getState();
    expect(['a', 'b', 'c', 'd'].map((id) => add(id))).toEqual(['added', 'added', 'added', 'added']);
    expect(add('e')).toBe('full');
    expect(add('a')).toBe('exists');
    expect(useCompareStore.getState().ids).toEqual(['a', 'b', 'c', 'd']);
  });

  it('persists ids to localStorage and rehydrates them', async () => {
    useCompareStore.getState().add('x');
    expect(JSON.parse(localStorage.getItem('cp-compare') ?? '{}').state).toEqual({ ids: ['x'] });

    localStorage.setItem('cp-compare', JSON.stringify({ state: { ids: ['y', 'z'] }, version: 1 }));
    await useCompareStore.persist.rehydrate();
    expect(useCompareStore.getState().ids).toEqual(['y', 'z']);

    useCompareStore.getState().remove('y');
    expect(useCompareStore.getState().ids).toEqual(['z']);
  });

  it('replaces the tray from a shared link, capped at four', () => {
    useCompareStore.getState().setIds(['a', 'b', 'c', 'd', 'e']);
    expect(useCompareStore.getState().ids).toEqual(['a', 'b', 'c', 'd']);
  });
});
