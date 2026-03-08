import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';

const mockCreateEvent = jest.fn();
jest.mock('../../src/frontend/mobile/app/_lib/api', () => ({
  createEvent: mockCreateEvent,
}));

import CreateEventScreen from '../../src/frontend/mobile/app/create-event';
import { Alert } from 'react-native';

describe('CreateEventScreen', () => {
  const mockRouter = require('expo-router').__mockRouter;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the header with "Create New Event" title', () => {
    render(<CreateEventScreen />);
    expect(screen.getByText('Create New Event')).toBeTruthy();
  });

  it('renders Cancel and Save buttons', () => {
    render(<CreateEventScreen />);
    expect(screen.getByText('Cancel')).toBeTruthy();
    expect(screen.getByText('Save')).toBeTruthy();
  });

  it('renders all required form fields', () => {
    render(<CreateEventScreen />);
    expect(screen.getByPlaceholderText('e.g. Annual Gala 2026')).toBeTruthy();
    expect(screen.getByPlaceholderText('YYYY-MM-DD')).toBeTruthy();
    expect(screen.getByPlaceholderText('HH:MM')).toBeTruthy();
    expect(screen.getByPlaceholderText('e.g. 100')).toBeTruthy();
  });

  it('renders optional form fields', () => {
    render(<CreateEventScreen />);
    expect(screen.getByPlaceholderText('Describe your event...')).toBeTruthy();
    expect(screen.getByPlaceholderText('e.g. Grand Ballroom')).toBeTruthy();
    expect(
      screen.getByPlaceholderText('0 (leave empty for free)'),
    ).toBeTruthy();
    expect(
      screen.getByPlaceholderText('https://example.com/image.jpg'),
    ).toBeTruthy();
  });

  it('renders table and bus signup toggles', () => {
    render(<CreateEventScreen />);
    expect(screen.getByText('Requires Table Signup')).toBeTruthy();
    expect(screen.getByText('Requires Bus Signup')).toBeTruthy();
  });

  it('navigates back when Cancel is pressed', () => {
    render(<CreateEventScreen />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('shows validation error when required fields are empty', async () => {
    render(<CreateEventScreen />);
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Name, date, time, and capacity are required.',
      );
    });
  });

  it('does not call createEvent when validation fails', async () => {
    render(<CreateEventScreen />);
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });
    expect(mockCreateEvent).not.toHaveBeenCalled();
  });

  it('submits with correct payload including price in cents', async () => {
    mockCreateEvent.mockResolvedValueOnce({ id: 1 });

    render(<CreateEventScreen />);

    fireEvent.change(screen.getByPlaceholderText('e.g. Annual Gala 2026'), {
      target: { value: 'Test Gala' },
    });
    fireEvent.change(screen.getByPlaceholderText('YYYY-MM-DD'), {
      target: { value: '2026-06-15' },
    });
    fireEvent.change(screen.getByPlaceholderText('HH:MM'), {
      target: { value: '18:00' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. 100'), {
      target: { value: '200' },
    });
    fireEvent.change(
      screen.getByPlaceholderText('0 (leave empty for free)'),
      { target: { value: '25.50' } },
    );

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockCreateEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Gala',
          capacity: 200,
          price: 2550,
        }),
      );
    });
  });

  it('navigates to /event-created on successful submission', async () => {
    mockCreateEvent.mockResolvedValueOnce({ id: 1 });

    render(<CreateEventScreen />);

    fireEvent.change(screen.getByPlaceholderText('e.g. Annual Gala 2026'), {
      target: { value: 'Test Event' },
    });
    fireEvent.change(screen.getByPlaceholderText('YYYY-MM-DD'), {
      target: { value: '2026-06-15' },
    });
    fireEvent.change(screen.getByPlaceholderText('HH:MM'), {
      target: { value: '18:00' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. 100'), {
      target: { value: '50' },
    });

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/event-created');
    });
  });

  it('shows error alert on API failure', async () => {
    mockCreateEvent.mockRejectedValueOnce(new Error('Network error'));

    render(<CreateEventScreen />);

    fireEvent.change(screen.getByPlaceholderText('e.g. Annual Gala 2026'), {
      target: { value: 'Test Event' },
    });
    fireEvent.change(screen.getByPlaceholderText('YYYY-MM-DD'), {
      target: { value: '2026-06-15' },
    });
    fireEvent.change(screen.getByPlaceholderText('HH:MM'), {
      target: { value: '18:00' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. 100'), {
      target: { value: '50' },
    });

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Network error');
    });
  });

  it('sends price as 0 when price field is empty (free event)', async () => {
    mockCreateEvent.mockResolvedValueOnce({ id: 1 });

    render(<CreateEventScreen />);

    fireEvent.change(screen.getByPlaceholderText('e.g. Annual Gala 2026'), {
      target: { value: 'Free Event' },
    });
    fireEvent.change(screen.getByPlaceholderText('YYYY-MM-DD'), {
      target: { value: '2026-06-15' },
    });
    fireEvent.change(screen.getByPlaceholderText('HH:MM'), {
      target: { value: '10:00' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. 100'), {
      target: { value: '100' },
    });

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockCreateEvent).toHaveBeenCalledWith(
        expect.objectContaining({ price: 0 }),
      );
    });
  });

  it('includes optional fields in payload when filled', async () => {
    mockCreateEvent.mockResolvedValueOnce({ id: 1 });

    render(<CreateEventScreen />);

    fireEvent.change(screen.getByPlaceholderText('e.g. Annual Gala 2026'), {
      target: { value: 'Full Event' },
    });
    fireEvent.change(
      screen.getByPlaceholderText('Describe your event...'),
      { target: { value: 'A great event' } },
    );
    fireEvent.change(screen.getByPlaceholderText('YYYY-MM-DD'), {
      target: { value: '2026-12-25' },
    });
    fireEvent.change(screen.getByPlaceholderText('HH:MM'), {
      target: { value: '20:00' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. Grand Ballroom'), {
      target: { value: 'Main Hall' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. 100'), {
      target: { value: '300' },
    });
    fireEvent.change(
      screen.getByPlaceholderText('https://example.com/image.jpg'),
      { target: { value: 'https://img.com/event.jpg' } },
    );

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockCreateEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Full Event',
          description: 'A great event',
          location: 'Main Hall',
          capacity: 300,
          imageUrl: 'https://img.com/event.jpg',
        }),
      );
    });
  });
});
