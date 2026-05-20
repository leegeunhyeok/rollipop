import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { App } from '../App';

test('pressing "Get Started" navigates to the GetStarted screen', async () => {
  render(<App />);

  // Home screen is shown initially with the "Get Started" button.
  expect(screen.getByText('Get Started')).toBeTruthy();

  fireEvent.press(screen.getByText('Get Started'));

  // After navigation, the GetStarted screen renders its title.
  expect(await screen.findByText('Hello, world!')).toBeTruthy();
});
