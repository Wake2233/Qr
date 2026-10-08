import AsyncStorage from '@react-native-async-storage/async-storage';

import { useCompareStore } from './compare';

// AsyncStorage resolves to its official in-memory mock (package.json jest.moduleNameMapper).
describe('useCompareStore (mobile)', () => {
  beforeEach(() => useCompareStore.getState().clear());

  it('applies the shared ≤4 rule', () => {
    const { add } = useCompareStore.getState();
    expect(['a', 'b', 'c', 'd', 'e'].map((id) => add(id))).toEqual([
      'added',
      'added',
      'added',
      'added',
      'full',
    ]);
    useCompareStore.getState().remove('a');
    expect(useCompareStore.getState().ids).toEqual(['b', 'c', 'd']);
  });

  it('persists to AsyncStorage', async () => {
    useCompareStore.getState().add('x');
    await new Promise((resolve) => setTimeout(resolve, 0));
    const stored = await AsyncStorage.getItem('cp-compare');
    expect(JSON.parse(stored ?? '{}').state).toEqual({ ids: ['x'] });
  });
});
