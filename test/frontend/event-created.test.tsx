import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';

import EventCreatedScreen from '../../src/frontend/mobile/app/event-created';

describe('EventCreatedScreen', () => {
  const mockRouter = require('expo-router').__mockRouter;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders success content and navigates back on button press', () => {
    render(<EventCreatedScreen />);
    expect(screen.getByText('✅')).toBeTruthy();
    expect(screen.getByText('Event Created!')).toBeTruthy();
    expect(
      screen.getByText('Your event has been successfully created and is now visible to users.'),
    ).toBeTruthy();

    fireEvent.click(screen.getByText('Back to Events'));
    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
  });
});
