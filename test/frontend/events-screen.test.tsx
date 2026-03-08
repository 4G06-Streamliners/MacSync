import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';

const mockGetEvents = jest.fn();
const mockGetUserTickets = jest.fn();
const mockSignupForEvent = jest.fn();
const mockCancelSignup = jest.fn();

jest.mock('../../src/frontend/mobile/app/_lib/api', () => ({
  getEvents: mockGetEvents,
  getUserTickets: mockGetUserTickets,
  signupForEvent: mockSignupForEvent,
  cancelSignup: mockCancelSignup,
}));

const mockUseAuth = jest.fn();
jest.mock('../../src/frontend/mobile/app/_context/AuthContext', () => ({
  useAuth: (...args: any[]) => mockUseAuth(...args),
}));

import EventsScreen from '../../src/frontend/mobile/app/(tabs)/index';
import { Alert } from 'react-native';

const mockRouter = require('expo-router').__mockRouter;

const mockEvent = (overrides: Record<string, any> = {}) => ({
  id: 1,
  name: 'Test Event',
  description: 'A test event',
  date: '2027-06-15T18:00:00.000Z',
  location: 'Test Venue',
  capacity: 100,
  imageUrl: null,
  price: 0,
  stripePriceId: null,
  requiresTableSignup: false,
  requiresBusSignup: false,
  tableCount: null,
  seatsPerTable: null,
  busCount: null,
  busCapacity: null,
  registeredCount: 25,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('EventsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEvents.mockResolvedValue([]);
    mockGetUserTickets.mockResolvedValue([]);
    mockUseAuth.mockReturnValue({
      user: { id: 1, email: 'test@mcmaster.ca', name: 'Test User' },
      isAdmin: false,
      status: 'authenticated',
    });
  });

  it('shows loading spinner when auth status is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAdmin: false,
      status: 'loading',
    });

    const { container } = render(<EventsScreen />);
    expect(container.querySelector('[role="progressbar"]')).toBeTruthy();
  });

  it('renders "Upcoming Events" header after loading', async () => {
    render(<EventsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Upcoming Events')).toBeTruthy();
    });
  });

  it('shows search input', async () => {
    render(<EventsScreen />);
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('Search events by name...'),
      ).toBeTruthy();
    });
  });

  it('shows "No events found." when no events exist', async () => {
    mockGetEvents.mockResolvedValue([]);
    render(<EventsScreen />);

    await waitFor(() => {
      expect(screen.getByText('No events found.')).toBeTruthy();
    });
  });

  it('renders event cards after loading', async () => {
    mockGetEvents.mockResolvedValue([mockEvent()]);
    render(<EventsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Test Event')).toBeTruthy();
    });
  });

  it('displays event location', async () => {
    mockGetEvents.mockResolvedValue([mockEvent()]);
    render(<EventsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Test Venue')).toBeTruthy();
    });
  });

  it('shows "Open" badge for available future events', async () => {
    mockGetEvents.mockResolvedValue([
      mockEvent({ registeredCount: 10, capacity: 100 }),
    ]);
    render(<EventsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Open')).toBeTruthy();
    });
  });

  it('shows "Full" badge when event is at capacity', async () => {
    mockGetEvents.mockResolvedValue([
      mockEvent({ registeredCount: 100, capacity: 100 }),
    ]);
    render(<EventsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Full')).toBeTruthy();
    });
  });

  it('shows "Past" badge for past events', async () => {
    mockGetEvents.mockResolvedValue([
      mockEvent({ date: '2020-01-01T00:00:00Z' }),
    ]);
    render(<EventsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Past')).toBeTruthy();
    });
  });

  it('displays "Free" for events with price 0', async () => {
    mockGetEvents.mockResolvedValue([mockEvent({ price: 0 })]);
    render(<EventsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Free')).toBeTruthy();
    });
  });

  it('displays formatted price for paid events', async () => {
    mockGetEvents.mockResolvedValue([mockEvent({ price: 2500 })]);
    render(<EventsScreen />);

    await waitFor(() => {
      expect(screen.getByText('$25.00')).toBeTruthy();
    });
  });

  it('shows "Create Event" button for admin users', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, email: 'admin@test.com', name: 'Admin' },
      isAdmin: true,
      status: 'authenticated',
    });
    render(<EventsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Create Event')).toBeTruthy();
    });
  });

  it('hides "Create Event" button for non-admin users', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 2, email: 'user@test.com', name: 'User' },
      isAdmin: false,
      status: 'authenticated',
    });
    render(<EventsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Upcoming Events')).toBeTruthy();
    });
    expect(screen.queryByText('Create Event')).toBeNull();
  });

  it('filters events by search query', async () => {
    mockGetEvents.mockResolvedValue([
      mockEvent({ id: 1, name: 'Annual Gala' }),
      mockEvent({ id: 2, name: 'Sports Day' }),
    ]);
    render(<EventsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Annual Gala')).toBeTruthy();
    });

    fireEvent.change(
      screen.getByPlaceholderText('Search events by name...'),
      { target: { value: 'Gala' } },
    );

    await waitFor(() => {
      expect(screen.getByText('Annual Gala')).toBeTruthy();
      expect(screen.queryByText('Sports Day')).toBeNull();
    });
  });

  it('shows "No events match your search." for unmatched search', async () => {
    mockGetEvents.mockResolvedValue([mockEvent({ name: 'Annual Gala' })]);
    render(<EventsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Annual Gala')).toBeTruthy();
    });

    fireEvent.change(
      screen.getByPlaceholderText('Search events by name...'),
      { target: { value: 'nonexistent' } },
    );

    await waitFor(() => {
      expect(
        screen.getByText('No events match your search.'),
      ).toBeTruthy();
    });
  });

  it('navigates to create-event when admin clicks Create Event', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, email: 'admin@test.com', name: 'Admin' },
      isAdmin: true,
      status: 'authenticated',
    });
    render(<EventsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Create Event')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Create Event'));
    expect(mockRouter.push).toHaveBeenCalledWith('/create-event');
  });

  it('navigates to event-signup when Sign Up is clicked', async () => {
    mockGetEvents.mockResolvedValue([mockEvent()]);
    render(<EventsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Sign Up')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Sign Up'));
    expect(mockRouter.push).toHaveBeenCalledWith('/event-signup?eventId=1');
  });

  it('shows registered count on event card', async () => {
    mockGetEvents.mockResolvedValue([mockEvent({ registeredCount: 42 })]);
    render(<EventsScreen />);

    await waitFor(() => {
      expect(screen.getByText('42 registered')).toBeTruthy();
    });
  });

  it('shows cancel confirmation modal when canceling free event signup', async () => {
    mockGetEvents.mockResolvedValue([mockEvent({ id: 5 })]);
    mockGetUserTickets.mockResolvedValue([{ eventId: 5 }]);
    render(<EventsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Cancel Sign-Up')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Cancel Sign-Up'));

    await waitFor(() => {
      expect(screen.getByText('Cancel Ticket')).toBeTruthy();
      expect(
        screen.getByText(
          'Are you sure you want to cancel this ticket?',
        ),
      ).toBeTruthy();
    });
  });

  it('shows "Request Refund" for signed-up paid events', async () => {
    mockGetEvents.mockResolvedValue([mockEvent({ id: 3, price: 2500 })]);
    mockGetUserTickets.mockResolvedValue([{ eventId: 3 }]);
    render(<EventsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Request Refund')).toBeTruthy();
    });
  });

  it('disables Sign Up button for full events', async () => {
    mockGetEvents.mockResolvedValue([
      mockEvent({ registeredCount: 100, capacity: 100 }),
    ]);
    render(<EventsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Event Full')).toBeTruthy();
    });
  });

  it('shows "Event Ended" for past events', async () => {
    mockGetEvents.mockResolvedValue([
      mockEvent({ date: '2020-01-01T00:00:00Z', registeredCount: 10 }),
    ]);
    render(<EventsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Event Ended')).toBeTruthy();
    });
  });
});
