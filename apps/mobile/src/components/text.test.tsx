import { render, screen } from '@testing-library/react-native';

import { Text } from './text';

describe('Text', () => {
  it('renders children with the body variant by default', async () => {
    await render(<Text>Hello</Text>);
    expect(screen.getByText('Hello')).toBeOnTheScreen();
  });
});
