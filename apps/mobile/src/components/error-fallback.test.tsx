import { fireEvent, render, screen } from '@testing-library/react-native';

import { ErrorFallback } from './error-fallback';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));

describe('ErrorFallback', () => {
  it('explains the failure and retries on press', async () => {
    const retry = jest.fn();
    await render(<ErrorFallback error={new Error('boom')} retry={retry} />);
    expect(screen.getByText('Something went wrong')).toBeOnTheScreen();
    expect(screen.getByText('boom')).toBeOnTheScreen(); // dev-only detail
    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
