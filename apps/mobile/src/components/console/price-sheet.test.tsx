import { fireEvent, render, screen } from '@testing-library/react-native';

import { PriceSheet } from './price-sheet';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));

const setup = async (onSave = jest.fn()) => {
  await render(
    <PriceSheet
      visible
      title="2021 Audi Q5"
      priceCents={3_349_000}
      saving={false}
      onSave={onSave}
      onClose={jest.fn()}
    />,
  );
  return onSave;
};

describe('PriceSheet', () => {
  it('prefills the current price and saves the new one in cents', async () => {
    const onSave = await setup();
    expect(screen.getByDisplayValue('33490')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('New price ($)'), '$31,990.50');
    await fireEvent.press(screen.getByRole('button', { name: 'Save price' }));
    expect(onSave).toHaveBeenCalledWith(3_199_050);
  });

  it('rejects typos instead of saving them', async () => {
    const onSave = await setup();
    const input = screen.getByLabelText('New price ($)');

    await fireEvent.changeText(input, 'abc');
    await fireEvent.press(screen.getByRole('button', { name: 'Save price' }));
    expect(screen.getByText(/expected number|Enter a price/i)).toBeOnTheScreen();

    await fireEvent.changeText(input, '2409023590');
    await fireEvent.press(screen.getByRole('button', { name: 'Save price' }));
    expect(
      screen.getByText('That price looks too high. Check for extra digits.'),
    ).toBeOnTheScreen();
    expect(onSave).not.toHaveBeenCalled();
  });
});
