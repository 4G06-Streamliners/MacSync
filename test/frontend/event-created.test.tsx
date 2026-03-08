import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';

import EventCreatedScreen from '../../src/frontend/mobile/app/event-created';

describe('EventCreatedScreen', () => {
  const mockRouter = require('expo-router').__mockRouter;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the success icon', () => {
    render(<EventCreatedScreen />);
    expect(screen.getByText('✅')).toBeTruthy();
  });

  it('renders "Event Created!" heading', () => {
    render(<EventCreatedScreen />);
    expect(screen.getByText('Event Created!')).toBeTruthy();
  });

  it('renders success description text', () => {
    render(<EventCreatedScreen />);
    expect(
      screen.getByText(
        'Your event has been successfully created and is now visible to users.',
      ),
    ).toBeTruthy();
  });

  it('renders "Back to Events" button', () => {
    render(<EventCreatedScreen />);
    expect(screen.getByText('Back to Events')).toBeTruthy();
  });

  it('navigates to /(tabs) when "Back to Events" is pressed', () => {
    render(<EventCreatedScreen />);
    fireEvent.click(screen.getByText('Back to Events'));
    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
  });
});
